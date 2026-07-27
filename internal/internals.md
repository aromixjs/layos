# Layos Internals

This document explains how Layos works under the hood — the internal mechanics,
data flow, and lifecycle management.

## Architecture Overview

```
layos() function
    │
    ▼
┌─────────┐     ┌──────────────┐     ┌────────────┐
│  Layos  │ ─── │  Orchestrator│ ─── │TokenParser │
│ (class) │     │   (class)    │     │  (class)   │
└─────────┘     └──────────────┘     └────────────┘
    │                  │
    │                  ▼
    │         ┌────────────────┐
    │         │  TokenRegistry │
    │         │  (Map<string,  │
    │         │   TokenDef>)   │
    │         └────────────────┘
    │
    ▼
┌──────────────────┐
│ MutationObserver │
│  (watches DOM)   │
└──────────────────┘
```

## Components

### 1. TokenRegistry

A flat `Map<string, TokenDef>` that maps token keys to their handler functions.

```
"flex"   → TokenDef { key: "flex", run: fn }
"bg"     → TokenDef { key: "bg", run: fn }
"hover"  → TokenDef { key: "hover", run: fn }
```

**Registration flow:**

```
constructor([flex, bg, hover])
    │
    ▼
for each token:
    register(token)
        │
        ├── if key exists → skip
        │
        ├── store in registry: key → tokenDef
        │
        └── if token has scopes → recurse into each scope
```

Key points:

- Flat registry — all tokens (including scoped ones) are stored at the same
  level
- No nesting in the registry — `hover` and `hover > bg` are both top-level
  entries
- First registration wins — duplicate keys are ignored

### 2. Orchestrator

The core engine that parses lay values, looks up tokens, and executes them.

**Data structures:**

```
parser: TokenParser          — parses lay strings into TokenNode[]
tokenRegistry: Map           — key → TokenDef lookup
controllers: WeakMap         — element → AbortController mapping
```

**Key methods:**

| Method                             | Purpose                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `scan(root)`                       | Find all `[lay]` elements under root, call `run()` on each |
| `run(element, layValue)`           | Clean up element, parse lay value, dispatch tokens         |
| `cleanup(element)`                 | Abort controller, remove element's inline styles           |
| `dispatch(element, nodes, signal)` | Look up each token in registry, execute its handler        |

### 3. TokenParser

Converts a lay attribute string into a `TokenNode[]` array. See
[token-parser.md](./token-parser.md) for detailed parsing logic.

### 4. AbortController (per element)

Each element gets its own `AbortController` stored in a
`WeakMap<HTMLElement, AbortController>`.

**Why:** Tokens like `hover`, `click`, `focus` add event listeners. These
listeners need to be cleaned up when:

- The element is re-run (lay attribute changes)
- The element is removed from the DOM

**How it works:**

```
run(element, layValue)
    │
    ├── cleanup(element)           ← abort old controller (removes old listeners)
    │
    ├── controller = new AbortController()
    │
    ├── controllers.set(element, controller)
    │
    └── dispatch(element, nodes, controller.signal)
            │
            └── for each token:
                    ctx.signal = controller.signal
                    token.run(ctx)
                        │
                        └── element.addEventListener('click', handler, { signal })
                                                      ↑
                                              tied to this signal
```

When `cleanup()` is called:

```
cleanup(element)
    │
    ├── controller.abort()    ← all listeners with this signal are removed
    │
    ├── controllers.delete(element)
    │
    └── element.removeAttribute('style')
```

**WeakMap benefits:**

- No manual cleanup needed when element is GC'd
- Prevents memory leaks in long-running apps

### 5. MutationObserver

Watches the DOM for changes and triggers appropriate orchestrator methods.

**Observation config:**

```typescript
observer.observe(target, {
  attributes: true, // watch for attribute changes
  attributeFilter: ["lay"], // only watch 'lay' attribute
  childList: true, // watch for added/removed nodes
  subtree: true, // watch entire subtree
});
```

**Mutation handling:**

```
MutationObserver callback
    │
    ├── for each mutation:
    │
    │   ├── type === 'attributes'
    │   │       │
    │   │       └── handleAttributeChange(element)
    │   │               │
    │   │               ├── lay removed → cleanup(element)
    │   │               │
    │   │               └── lay changed → run(element, newValue)
    │   │
    │   └── type === 'childList'
    │           │
    │           ├── addedNodes
    │           │       │
    │           │       └── for each HTMLElement:
    │           │               │
    │           │               ├── if has lay → run(element, layValue)
    │           │               │
    │           │               └── scan(element) ← find nested [lay] elements
    │           │
    │           └── removedNodes
    │                   │
    │                   └── for each HTMLElement:
    │                           │
    │                           ├── cleanup(element)
    │                           │
    │                           └── cleanup all nested [lay] descendants
```

### 6. Layos Class

The entry point that wires everything together.

```
constructor(tokens)
    │
    └── orchestrator = new Orchestrator(tokens)

start(root)
    │
    ├── orchestrator.scan(root)    ← process all existing [lay] elements
    │
    └── observer.observe(target)   ← start watching for DOM changes

stop()
    │
    └── observer.disconnect()      ← stop watching
```

## Complete Flow

### Initial page load

```
1. layos({ tokens: [...], target: document })
        │
        ▼
2. new Layos(tokens)
        │
        ├── new Orchestrator(tokens)
        │       │
        │       └── register each token into registry
        │
        └── new MutationObserver(callback)
        │
        ▼
3. layosInstance.start(document)
        │
        ├── orchestrator.scan(document)
        │       │
        │       ├── querySelectorAll('[lay]')
        │       │
        │       └── for each element:
        │               run(element, layValue)
        │                   │
        │                   ├── cleanup(element)
        │                   ├── new AbortController()
        │                   ├── parser.parse(layValue) → TokenNode[]
        │                   └── dispatch(element, nodes, signal)
        │                           │
        │                           └── for each node:
        │                                   registry.get(key) → tokenDef
        │                                   tokenDef.run(ctx)
        │
        └── observer.observe(document.documentElement, { ... })
```

### Dynamic content (htmx, React, innerHTML)

```
1. New element added to DOM with lay="bg:red"
        │
        ▼
2. MutationObserver fires with addedNodes
        │
        ▼
3. handleElementAdded(element)
        │
        ├── element.getAttribute('lay') → "bg:red"
        │
        ├── orchestrator.run(element, "bg:red")
        │       │
        │       ├── cleanup(element)  ← clear old state
        │       ├── new AbortController()
        │       ├── parser.parse("bg:red") → [{ key: "bg", value: "red" }]
        │       └── dispatch(element, nodes, signal)
        │               │
        │               └── registry.get("bg") → tokenDef
        │                   tokenDef.run({ element, value: "red", signal, ... })
        │
        └── orchestrator.scan(element)  ← process any nested [lay] elements
```

### Element re-run (lay attribute changes)

```
1. Element's lay attribute changes: "bg:red" → "bg:blue"
        │
        ▼
2. MutationObserver fires with attributeChange
        │
        ▼
3. handleAttributeChange(element)
        │
        ├── element.getAttribute('lay') → "bg:blue"
        │
        └── orchestrator.run(element, "bg:blue")
                │
                ├── cleanup(element)  ← abort old controller, remove old styles
                ├── new AbortController()  ← fresh controller
                ├── parser.parse("bg:blue") → [{ key: "bg", value: "blue" }]
                └── dispatch(element, nodes, signal)
                        │
                        └── registry.get("bg") → tokenDef
                            tokenDef.run({ element, value: "blue", signal, ... })
```

### Element removal

```
1. Element removed from DOM
        │
        ▼
2. MutationObserver fires with removedNodes
        │
        ▼
3. handleElementRemoved(element)
        │
        ├── orchestrator.cleanup(element)
        │       │
        │       ├── controller.abort()  ← remove all event listeners
        │       ├── controllers.delete(element)
        │       └── element.removeAttribute('style')
        │
        └── for each descendant with [lay]:
                orchestrator.cleanup(descendant)
```

## TokenContext

When a token's `run()` is called, it receives a `TokenContext`:

```typescript
{
    element: HTMLElement,        // the element being processed
    value?: string,              // value after the colon (e.g., "red" in bg:red)
    scopes?: TokenNode[],        // child tokens if scoped (e.g., hover:[ ... ])
    signal: AbortSignal,         // tied to this element's AbortController
    dispatch: (element, nodes) => void,  // re-dispatch tokens on another element
}
```

**Key details:**

- `element`: The DOM element with the `lay` attribute
- `value`: Only present for key-value tokens (`bg:red` → value is `"red"`)
- `scopes`: Only present for scoped tokens (`hover:[ bg:red ]` → scopes is
  `[{ key: "bg", value: "red" }]`)
- `signal`: Use this when adding event listeners — they'll auto-cleanup on
  re-run or removal
- `dispatch`: Allows tokens to re-dispatch tokens on other elements (e.g.,
  toggling classes)

## Performance Characteristics

| Operation        | Complexity | Notes                        |
| ---------------- | ---------- | ---------------------------- |
| Token lookup     | O(1)       | Map.get() by key             |
| Parse lay value  | O(n)       | n = length of lay string     |
| Scan root        | O(m)       | m = number of [lay] elements |
| Cleanup element  | O(1)       | AbortController.abort()      |
| MutationObserver | O(1)       | Browser-native, efficient    |
