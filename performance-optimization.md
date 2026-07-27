# Layos Performance Optimization Tricks

This document explains the performance techniques used in Layos, why each was chosen, and what tradeoffs were made. Refer back to this when rewriting or modifying the engine.

---

## 1. Single Adopted Stylesheet (not inline styles)

**Where:** `src/css.ts` — `ensureSheet()`

**What:** All CSS rules for all tokens live in one shared `CSSStyleSheet` attached via `document.adoptedStyleSheets`. Tokens never write to `element.style`.

**Why:**
- Each `element.style.setProperty()` call triggers a browser repaint for that element. With 1000 elements, that's 1000 repaints.
- A single `adoptedStyleSheets` mutation batches all rule changes into one repaint cycle.
- DOM stays clean — no `style="..."` attributes, making it easier to debug and reason about.
- CSSOM rules are addressable by `[data-l="l42"]` selector, which is uniform across all elements.

**Tradeoff:** Rules are global (shared sheet), so a bug in one token could theoretically affect others. Mitigated by the `data-l` marker scoping — each element's rules are isolated by their unique marker.

---

## 2. Rule-Per-Suffix Caching

**Where:** `src/css.ts` — `applyCss()`, the `rulesByElement` WeakMap

**What:** Each element gets at most one CSS rule per suffix (base `''`, `:hover`, `[data-l-selected]`, etc.). Repeated `applyCss()` calls for the same element+suffix update the existing rule via `setProperty()` instead of inserting new rules.

**Why:**
- Without caching, re-running a token on an element would insert duplicate rules, bloating the stylesheet.
- `setProperty()` on an existing rule is O(1) and triggers one repaint. Inserting a new rule is O(n) for the CSSOM (shifting indices).

**Tradeoff:** Requires a WeakMap lookup per `applyCss()` call. WeakMap lookups are O(1) amortized, so this is negligible.

---

## 3. Reverse-Order Rule Deletion

**Where:** `src/css.ts` — `cleanupCss()`

**What:** When removing rules for an element, collect all rule indices, sort descending, delete from highest to lowest.

**Why:**
- CSSOM `deleteRule(idx)` shifts all rules after `idx` by -1.
- If you delete from index 0 upward, every subsequent deletion needs its index recomputed (O(n) per delete).
- Deleting from the end backward means each deletion doesn't affect earlier indices.
- Total cost: O(n) scan + O(k) deletions = O(n + k), instead of O(k × n) with forward deletion.

**Example:**
```
Rules: [A@0, B@1, C@2, D@3, E@4]  — want to delete B and D
Forward:  delete(1) → [A@0, C@1, D@2, E@3], delete(2) → [A@0, C@1, E@2]  — 2 scans
Backward: delete(3) → [A@0, B@1, C@2, E@3], delete(1) → [A@0, C@1, E@2]  — 1 scan
```

**Alternative considered:** Maintaining a `Map<CSSStyleRule, number>` reverse index. Rejected because every `deleteRule()` shifts O(n) indices, requiring O(n) updates to the map — same cost as the scan approach.

---

## 4. WeakMap for Element→Rules Mapping

**Where:** `src/css.ts` — `rulesByElement` WeakMap

**What:** Maps each element to its `Map<suffix, CSSStyleRule>`. Uses `WeakMap` (not `Map`) so entries are garbage-collected when the element is removed from the DOM.

**Why:**
- No manual cleanup needed when elements are GC'd — the WeakMap entry is automatically eligible for collection.
- Prevents memory leaks in single-page apps where elements are created/destroyed frequently.
- WeakMap lookups are O(1) and don't prevent key GC.

**Tradeoff:** WeakMap keys must be objects (elements). If you need to track rules for non-element keys, you'd need a Map instead.

---

## 5. AbortController per Element (not per page)

**Where:** `src/engine.ts` — `controllers` WeakMap

**What:** Each element gets its own `AbortController`. When a token's `run()` function adds event listeners with `{ signal: ctrl.signal }`, those listeners are automatically aborted when:
- The element is re-run (new AbortController replaces old one)
- The element is removed from the DOM (cleanup aborts the controller)

**Why:**
- Prevents listener accumulation — re-running a token 1000× doesn't create 1000 sets of listeners.
- No manual `removeEventListener()` needed — AbortController handles it.
- WeakMap ensures controllers are GC'd with their elements.

**Tradeoff:** Each element gets one AbortController, regardless of how many listeners it has. This is fine because AbortController is lightweight (~100 bytes).

---

## 6. Stable `data-l` Markers Across Re-runs

**Where:** `src/css.ts` — `applyCss()`, the marker assignment logic

**What:** Once an element gets a `data-l` marker (e.g., `l42`), it keeps that marker across re-runs. The same CSS rule is updated in place, not replaced.

**Why:**
- Re-running a token on an element should update styles, not create new rules.
- Stable markers mean the CSSOM rule's selector doesn't change — only its properties update.
- Avoids the cost of inserting/deleting rules on every re-run.

**Tradeoff:** Markers are never reused (counter only increments). Over the page lifetime, counter values grow. With `toString(36)`, this supports ~46,656 elements before hitting 4-character markers. Sufficient for most use cases.

---

## 7. Lazy Sheet Initialization

**Where:** `src/css.ts` — `ensureSheet()`

**What:** The CSSStyleSheet is created on the first `applyCss()` call, not at module load time.

**Why:**
- Some environments (SSR, test runners, Web Workers) may not have `document.adoptedStyleSheets`.
- Avoids creating a sheet if no tokens ever call `applyCss()`.
- The sheet persists for the page lifetime — no creation/teardown overhead.

---

## 8. Stale Sheet Recovery

**Where:** `src/css.ts` — `ensureSheet()`, `cleanupCss()`

**What:** If the shared sheet is removed from `adoptedStyleSheets` externally (e.g., test cleanup, framework re-initialization), Layos detects it and creates a fresh sheet.

**Why:**
- Prevents writes to a detached sheet that wouldn't apply to the DOM.
- Handles edge cases where frameworks or test harnesses reset `document.adoptedStyleSheets`.

---

## 9. MutationObserver for Dynamic Content

**Where:** `src/index.ts` — the `MutationObserver` in `layos()`

**What:** Observes the entire document for:
- `addedNodes`: auto-runs tokens on new elements (htmx partial swaps, React portal inserts)
- `removedNodes`: auto-cleans up rules and listeners
- `attributes` changes on `lay`: re-runs tokens when `lay` attribute changes

**Why:**
- No need for manual `layos.scan()` calls after dynamic content insertion.
- Handles htmx, React, Vue, Alpine.js, and vanilla `innerHTML` inserts.
- `attributeFilter: ['lay']` ensures only `lay` attribute changes trigger re-runs.

---

## Stress Test Results

Measured on Chromium headless (Playwright):

| Test | Duration | Notes |
|------|----------|-------|
| Mount 1000 elements | ~10ms | 1000 markers, 6 unique CSS rules (deduplicated) |
| Mount 5000 elements | ~38ms | 5000 markers initialized |
| Rapid re-run 1000× | ~8ms | No listener leak (AbortController cleans up) |
| Insert 500 elements | ~0.6ms | — |
| Remove 500 elements (innerHTML) | ~0.1ms | — |
| Hover 200 elements | ~1.8ms | 200 CSS rules (base + hover) |
| Memory leak (500 re-runs) | ~0ms | 1 rule total (same rule updated in place) |
| FOUC: pre-scan | 0ms | 0 elements styled before layos |
| FOUC: post-scan | ~1.3ms | 50/50 styled after layos |
| 2000 rules scan | ~20ms | 2000 rules in adoptedStyleSheets |
| 2000 rules: add after | ~0ms | Still O(1) after 2000 rules |
