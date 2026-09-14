# Layos

Compose web elements from layers of appearance and behavior.

Layos is a lightweight, zero-dependency DOM styling library that uses a custom
attribute (`lay`) and a token-based system to apply styles, behaviors, and
interactivity to HTML elements. It works by parsing a concise DSL in the `lay`
attribute and dispatching to registered token handlers.

## Install

```bash
npm install layos
```

## Quick Start

```html
<div lay="flex bg:primary pad:md rounded:md color:white">
  Hello World
</div>

<script type="module">
  import { layos } from "layos"
  import { flex, bg, pad, rounded, color, hover } from "./tokens.js"

  layos({
    tokens: [flex, bg, pad, rounded, color, hover],
    target: document.body,
  })
</script>
```

## How It Works

1. You call `layos()` with a target element and a list of tokens
2. Layos scans the target for all elements with a `lay` attribute
3. The `lay` value is parsed into a structured token tree
4. Each token is looked up in the registry and its `run()` function is executed
5. A `MutationObserver` watches for DOM changes — new elements, attribute
   changes, and removals are handled automatically

## Token Syntax

Tokens are written in the `lay` attribute as space-separated key-value pairs.

### Basic tokens

```
lay="flex bg:primary pad:md"
```

- `flex` — standalone key (no value)
- `bg:primary` — key with value
- `pad:md` — key with value

### Scoped tokens

Use square brackets to group child tokens under a parent:

```
lay="hover:[ bg:danger color:white ]"
```

The `hover` token receives `scopes` containing the child tokens, allowing it to
apply styles on hover.

### Nested scopes

Scopes can nest to arbitrary depth:

```
lay="theme:[ dark:[ bg:black hover:[ bg:gray-800 ] ] light:[ bg:white ] ]"
```

### Parser grammar

```
token     = key ( ':' value | ':' '[' tokens ']' )?
key       = [^\s:\[]+
value     = [^\s]+
tokens    = token ( whitespace token )*
```

## API

### `layos(config)`

Entry point. Returns `{ runtime, observer }`.

```typescript
interface LayosConfig {
  target: ParentNode   // document, document.body, or any container element
  tokens: Token[]      // array of token definitions
}
```

### `token(def)`

Helper to create a token definition:

```typescript
import { token } from "layos"

const bg = token({
  key: "bg",
  values: ["primary", "danger"],
  run({ element, value }) {
    if (value === "primary") element.style.backgroundColor = "#3b82f6"
    if (value === "danger") element.style.backgroundColor = "#ef4444"
  },
})
```

### `TokenContext`

The context object passed to every token's `run()` function:

```typescript
interface TokenContext {
  element: HTMLElement                    // the DOM element
  value?: string                          // value after the colon
  scopes?: TokenNode[]                    // child tokens (scoped tokens only)
  signal: AbortSignal                     // tied to this element's lifecycle
  dispatch(element: HTMLElement, nodes: TokenNode[]): void  // re-dispatch on another element
}
```

### `TokenParser`

Parses a `lay` attribute string into a `TokenNode[]` array. You typically
don't need to use this directly.

```typescript
import { TokenParser } from "layos"

const parser = new TokenParser()
parser.parse("hover:[ bg:red pad:lg ]")
// → [{ key: "hover", scopes: [{ key: "bg", value: "red" }, { key: "pad", value: "lg" }] }]
```

## Writing Tokens

A token is an object with a `key` and a `run` function:

```typescript
const myToken = {
  key: "myToken",
  run({ element, value, scopes, signal }) {
    // Apply styles, add event listeners, etc.
    // Use `signal` for event listeners so they auto-cleanup
    element.addEventListener("click", handler, { signal })
  },
}
```

### Standalone tokens (flags)

No value, no scopes — just apply something immediately:

```typescript
const flex = {
  key: "flex",
  run({ element }) {
    element.style.display = "flex"
  },
}
```

### Value tokens

Receive a value after the colon:

```typescript
const bg = {
  key: "bg",
  run({ element, value }) {
    const colors = { primary: "#3b82f6", danger: "#ef4444" }
    if (value && colors[value]) {
      element.style.backgroundColor = colors[value]
    }
  },
}
```

### Scoped tokens

Receive child tokens via `scopes`. Use this for interactive behaviors:

```typescript
const hover = {
  key: "hover",
  run({ element, scopes, signal }) {
    if (!scopes) return

    // Read child tokens to determine what to apply on hover
    const hoverStyles = new Map()
    for (const node of scopes) {
      if (node.key === "bg" && node.value) {
        hoverStyles.set("backgroundColor", node.value)
      }
    }

    const apply = () => {
      for (const [prop, val] of hoverStyles) {
        element.style[prop] = val
      }
    }
    const remove = () => {
      for (const prop of hoverStyles.keys()) {
        element.style[prop] = ""
      }
    }

    element.addEventListener("mouseenter", apply, { signal })
    element.addEventListener("mouseleave", remove, { signal })
  },
}
```

### AbortSignal cleanup

Always use the provided `signal` when adding event listeners. Layos
automatically aborts listeners when:

- An element's `lay` attribute changes
- An element is removed from the DOM

```typescript
element.addEventListener("click", handler, { signal })  // auto-cleaned up
```

## Dynamic DOM

Layos watches the DOM with a `MutationObserver`. These work automatically:

- **Adding elements** — new elements with `lay` are processed immediately
- **Changing `lay`** — old state is cleaned up, new tokens are applied
- **Removing elements** — listeners are aborted, styles are removed

```javascript
// Add a styled element
const div = document.createElement("div")
div.setAttribute("lay", "flex bg:primary pad:md color:white")
div.textContent = "Dynamic!"
container.appendChild(div)  // Layos picks it up automatically

// Change tokens on an existing element
element.setAttribute("lay", "flex bg:danger pad:lg color:white")

// Remove — cleanup is automatic
element.remove()
```

## Included Tokens

The playground ships with a `defaultPlugin` containing these tokens:

### Layout

| Token    | Description        |
| -------- | ------------------ |
| `flex`   | `display: flex`    |
| `block`  | `display: block`   |
| `grid`   | `display: grid`    |

### Visual

| Token      | Values                                |
| ---------- | ------------------------------------- |
| `bg`       | `primary`, `secondary`, `danger`, `success`, `dark`, `muted` |
| `color`    | `white`, `muted`, `danger`, `success` |
| `pad`      | `xs`, `sm`, `md`, `lg`, `xl`          |
| `gap`      | `sm`, `md`, `lg`                      |
| `rounded`  | `sm`, `md`, `lg`, `full`              |
| `w`        | `full`, `auto`, `fit`                 |
| `cursor`   | `pointer`, `default`, `grab`          |
| `fontSize` | `sm`, `md`, `lg`                      |

### Behavior

| Token      | Description                                    |
| ---------- | ---------------------------------------------- |
| `hover`    | Apply scoped tokens on hover                   |
| `focus`    | Apply scoped tokens on focus                   |
| `click`    | Toggle scoped tokens on click                  |
| `toggle`   | Toggle element visibility on click             |
| `show`     | Show element                                   |
| `hide`     | Hide element                                   |
| `disabled` | Disable element (pointer events + opacity)     |

## Example

```html
<button
  lay="flex bg:primary pad:md rounded:md color:white cursor:pointer hover:[ bg:danger ]"
>
  Click me
</button>
```

This button will:
- Display as flexbox with primary background, padding, rounded corners, white
  text, and pointer cursor
- Switch to danger background on hover
- Automatically clean up hover listeners if the `lay` attribute changes or the
  button is removed

## License

MIT
