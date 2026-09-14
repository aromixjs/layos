# Layos

Compose web elements from layers of appearance and behavior.

Layos lets you style and add interactivity to HTML elements using a single `lay` attribute — no build step, no framework.

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
  import { defaultPlugin } from "layos/tokens"

  layos({
    tokens: defaultPlugin,
    target: document.body,
  })
</script>
```

## Token Syntax

Write tokens in the `lay` attribute as space-separated keys.

### Standalone tokens

```
lay="flex"
```

Just a key — applies immediately (e.g. `display: flex`).

### Key-value tokens

```
lay="bg:primary pad:md"
```

A key and value separated by a colon.

### Scoped tokens

Group child tokens inside square brackets:

```
lay="hover:[ bg:danger color:white ]"
```

The parent token (`hover`) receives the children and decides what to do with them.

### Nested scopes

Scopes can nest to any depth:

```
lay="theme:[ dark:[ bg:black hover:[ bg:gray ] ] light:[ bg:white ] ]"
```

## Writing Tokens

Create a token with a `key` and a `run` function:

```js
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

### Scoped tokens (interactive behaviors)

Scoped tokens receive child tokens via `scopes`. Use this for hover, focus, click, etc.:

```js
const hover = {
  key: "hover",
  run({ element, scopes, signal }) {
    if (!scopes) return

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

Use the `signal` from the context when adding event listeners — they clean up automatically when the element's tokens change or the element is removed.

## Dynamic Elements

Layos watches the DOM automatically. These just work:

- **Add elements** — append new elements with `lay`, they get styled immediately
- **Change tokens** — update the `lay` attribute, old state is cleaned up
- **Remove elements** — listeners and styles are cleaned up

```js
// Add a styled element
const div = document.createElement("div")
div.setAttribute("lay", "flex bg:primary pad:md color:white")
div.textContent = "Dynamic!"
container.appendChild(div)

// Change tokens
element.setAttribute("lay", "flex bg:danger pad:lg color:white")

// Remove — cleanup is automatic
element.remove()
```

## Included Tokens

### Layout

| Token    | Description      |
| -------- | ---------------- |
| `flex`   | `display: flex`  |
| `block`  | `display: block` |
| `grid`   | `display: grid`  |

### Visual

| Token      | Values                                 |
| ---------- | -------------------------------------- |
| `bg`       | `primary`, `secondary`, `danger`, `success`, `dark`, `muted` |
| `color`    | `white`, `muted`, `danger`, `success`  |
| `pad`      | `xs`, `sm`, `md`, `lg`, `xl`           |
| `gap`      | `sm`, `md`, `lg`                       |
| `rounded`  | `sm`, `md`, `lg`, `full`               |
| `w`        | `full`, `auto`, `fit`                  |
| `cursor`   | `pointer`, `default`, `grab`           |
| `fontSize` | `sm`, `md`, `lg`                       |

### Behavior

| Token      | Description                                |
| ---------- | ------------------------------------------ |
| `hover`    | Apply scoped tokens on hover               |
| `focus`    | Apply scoped tokens on focus               |
| `click`    | Toggle scoped tokens on click              |
| `toggle`   | Toggle visibility on click                 |
| `show`     | Show element                               |
| `hide`     | Hide element                               |
| `disabled` | Disable (no pointer events, 50% opacity)   |

## Example

```html
<button
  lay="flex bg:primary pad:md rounded:md color:white cursor:pointer hover:[ bg:danger ]"
>
  Click me
</button>
```

## License

MIT
