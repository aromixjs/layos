# Layos Internals

This document explains how Layos works under the hood — the internal mechanics,
data flow, and lifecycle management.

## Architecture Overview

```
layos() function
    │
    ▼
┌──────────┐     ┌──────────┐     ┌────────────┐
│ Runtime  │ ─── │ Observer │     │TokenParser │
│ (class)  │     │ (class)  │     │  (class)   │
└──────────┘     └──────────┘     └────────────┘
    │                  │
    │                  ▼
    │         ┌────────────────┐
    │         │  TokenRegistry │
    │         │  (Map<string,  │
    │         │   Token>)      │
    │         └────────────────┘
    │
    ▼
┌──────────────────┐
│ MutationObserver │
│  (watches DOM)   │
└──────────────────┘
```

**File structure:**

```
src/
├── core/
│   ├── layos.ts       — layos() factory function
│   ├── observer.ts    — Observer class (MutationObserver wrapper)
│   ├── runtime.ts     — Runtime class (token registry + dispatch)
│   └── types.ts       — LayosConfig interface
└── token/
    ├── parser.ts      — TokenParser class
    ├── types.ts       — Token, TokenContext, TokenNode interfaces
    └── charcode.ts    — character code constants
```

## Components

### 1. TokenRegistry

A flat `Map<string, Token>` that maps token keys to their handler functions.

```
"flex"   → Token { key: "flex", run: fn }
"bg"     → Token { key: "bg", run: fn }
"hover"  → Token { key: "hover", run: fn }
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
        ├── store in registry: key → token
        │
        └── if token has scopes → recurse into each scope
```

Key points:

- Flat registry — all tokens (including scoped ones) are stored at the same
  level
- No nesting in the registry — `hover` and `hover > bg` are both top-level
  entries
- First registration wins — duplicate keys are ignored

### 2. Runtime

The core engine that parses lay values, looks up tokens, and executes them.

**Data structures:**

```
tokenParser: TokenParser       — parses lay strings into TokenNode[]
tokenRegistry: Map             — key → Token lookup
controllers: WeakMap           — element → AbortController mapping
```

**Key methods:**

| Method                             | Purpose                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `scan(root)`                       | Find all `[lay]` elements under root, call `run()` on each |
| `run(element, layValue)`           | Clean up element, parse lay value, dispatch tokens         |
| `cleanup(element)`                 | Abort controller, remove element's inline styles           |
| `dispatch(element, nodes, signal)` | Look up each token in registry, execute its handler        |

### 3. Observer

Wraps the native `MutationObserver` and routes DOM changes to the Runtime.

**Data structures:**

```
runtime: Runtime   — reference to the runtime for dispatching
observer: MutationObserver — native browser observer
```

**Key methods:**

| Method                | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `observe(target)`     | Start watching DOM for changes on target          |
| `disconnect()`        | Stop watching                                     |

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
    │   │               ├── lay removed → runtime.cleanup(element)
    │   │               │
    │   │               └── lay changed → runtime.run(element, newValue)
    │   │
    │   └── type === 'childList'
    │           │
    │           ├── addedNodes
    │           │       │
    │           │       └── for each HTMLElement:
    │           │               │
    │           │               ├── if has lay → runtime.run(element, layValue)
    │           │               │
    │           │               └── runtime.scan(element) ← find nested [lay] elements
    │           │
    │           └── removedNodes
    │                   │
    │                   └── for each HTMLElement:
    │                           │
    │                           ├── runtime.cleanup(element)
    │                           │
    │                           └── cleanup all nested [lay] descendants
```

### 4. TokenParser

Converts a lay attribute string into a `TokenNode[]` array. See
[token-parser.md](./token-parser.md) for detailed parsing logic.

### 5. AbortController (per element)

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

### 6. layos() Factory

The entry point that wires everything together.

```typescript
layos({ tokens: [...], target: document })
```

```
layos(config)
    │
    ├── runtime = new Runtime(config.tokens)
    │       │
    │       └── register each token into registry
    │
    ├── observer = new Observer(runtime)
    │
    ├── runtime.scan(config.target)    ← process all existing [lay] elements
    │
    └── observer.observe(target)       ← start watching for DOM changes
```

Returns `{ runtime, observer }` for external access if needed.

## Complete Flow

### Initial page load

```
1. layos({ tokens: [...], target: document })
        │
        ▼
2. new Runtime(tokens)
        │
        └── register each token into registry
        │
        ▼
3. new Observer(runtime)
        │
        ▼
4. runtime.scan(document)
        │
        ├── querySelectorAll('[lay]')
        │
        └── for each element:
                runtime.run(element, layValue)
                    │
                    ├── cleanup(element)
                    ├── new AbortController()
                    ├── tokenParser.parse(layValue) → TokenNode[]
                    └── dispatch(element, nodes, signal)
                            │
                            └── for each node:
                                    registry.get(key) → token
                                    token.run(ctx)
        │
        ▼
5. observer.observe(document.documentElement)
        │
        └── MutationObserver starts watching
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
        ├── runtime.run(element, "bg:red")
        │       │
        │       ├── cleanup(element)  ← clear old state
        │       ├── new AbortController()
        │       ├── tokenParser.parse("bg:red") → [{ key: "bg", value: "red" }]
        │       └── dispatch(element, nodes, signal)
        │               │
        │               └── registry.get("bg") → token
        │                   token.run({ element, value: "red", signal, ... })
        │
        └── runtime.scan(element)  ← process any nested [lay] elements
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
        └── runtime.run(element, "bg:blue")
                │
                ├── cleanup(element)  ← abort old controller, remove old styles
                ├── new AbortController()  ← fresh controller
                ├── tokenParser.parse("bg:blue") → [{ key: "bg", value: "blue" }]
                └── dispatch(element, nodes, signal)
                        │
                        └── registry.get("bg") → token
                            token.run({ element, value: "blue", signal, ... })
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
        ├── runtime.cleanup(element)
        │       │
        │       ├── controller.abort()  ← remove all event listeners
        │       ├── controllers.delete(element)
        │       └── element.removeAttribute('style')
        │
        └── for each descendant with [lay]:
                runtime.cleanup(descendant)
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
