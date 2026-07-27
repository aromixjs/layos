# Layos — Spec (v4)

**Directive:** `lay=""` **Package:** `layos` **Status:** Pre-implementation, planning phase

## Naming

Layos comes from *laying* things on top of an element — each token in
`lay=""` is a layer stitched onto the element to build its final appearance
and behavior. That's also why configuration is written with `[ ]` rather than
`( )`: brackets read as "here's what's attached to this layer," not as a
function call being invoked. Nothing in the directive should ever look like
code running — it should read like layers being laid down.

---

## The Directive

```html
<div lay="flex col pad:4 gap:2 bg:surface">
<button lay="pad:2 bg:primary click:ripple margin:[top:md right:xl] canvas:drag[bounds:parent]">
<div lay="scroll:reveal[threshold:0.5]">
```

Every token is `namespace:action[config]` (config is optional — `flex`,
`pad:4`, `bg:primary` are all just a namespace and a value, no brackets
needed). `[ ]` is the one, uniform way anything ever attaches extra data to a
token — used identically for state blocks (`hover:[bg:primary-dark]`) and for
plugin config (`canvas:drag[bounds:parent]`). Inside the brackets is a
space-separated list of `key:value` pairs, or, for state blocks specifically,
more `lay` tokens — the owning plugin decides which of those two shapes it
expects for its own tokens, but the outer syntax the core parses is always
the same.

---

## Layout, Spacing, Sizing, Color, Typography, Visual, Interactions

The full static token vocabulary from the original spec (flex/grid layout,
spacing scale, sizing, theme-referenced color with opacity modifiers,
typography, radii/shadows/borders/position/z-index, composite shorthands,
responsive breakpoints, built-in interactions like `click:ripple`/
`hover:lift`) carries over as content, packaged as the plugin that ships in
the box by default — see [Plugins](#plugins). See Appendix A for the full
reference table.

---

## State Blocks

```
hover:[bg:primary-dark shadow:lg]
selected:[bg:primary fg:white]
```

Syntax: `name:[tokens]`. Built-in: `hover`, `focus`, `active`, `disabled`,
`checked`, `empty`, `first`, `last`, `odd`, `even`. A custom name (like
`selected` above) reads a locally-owned value from the per-element state
store — see [Local State](#local-state).

---

## Local State

```
toggle:selected(on:click)
set:x(on:pointermove, from:event.x)
```

`toggle:` declares a boolean on the element, flipped by the named event.
`set:` declares a value, read from a live event field. Both live entirely in
the per-element state store the core owns (see [Core](#core)) and are what a
custom state-block name (`selected:[...]`) reads from. These cover
hand-writable cases directly in `lay=""` — a couple of transitions on one
element. Anything more coordinated becomes its own plugin directive
(`canvas:drag[...]`) instead of a longer hand-written chain.

---

## Multi-Element State

Same value shown in more than one place, cheapest mechanism first:

1. **CSS custom properties** — set once at a scope root, read by any
   descendant via inheritance. No target list, no JS.
2. **`ElementInternals` custom state** — `:state(name)` selectable from any
   CSS on the page, for custom-element-backed elements.
3. **Scope broadcast** — a named scope declared on an ancestor
   (`scope:card`), resolved once and cached, fanning writes out to every
   descendant tagged against it (`scope:card:dragging[bg:primary]`).

---

## Core

The core is a small, fixed orchestration layer everything else is built on:

- **Parses** every `lay=""` value into `{ namespace, action, config }`
  tokens.
- **Dispatches** each token to whichever plugin registered that namespace.
- **Owns the per-element local-state store** — one shared record per
  element, so every plugin reads/writes through the same mechanism instead
  of each inventing its own.
- **Owns event delegation** — a single native listener per event type for
  the whole page; plugins declare interest, the core routes matched events
  to the right element/plugin pair.
- **Owns scope resolution** for multi-element broadcast.

```ts
layos([defaultTokens, canvas, dialog, scrollAnimation])
```

`layos()` takes a plain array of plugins — nothing more. Order can matter for
namespace conflicts (first registration for a given namespace wins), so the
array is also the resolution order.

---

## Plugins

A plugin is what actually does the work for a namespace: interprets its
tokens, wires up whatever the element needs, and drives the resulting
behavior. It's a real, standalone, ahead-of-time-authored piece of code —
free to use whatever internal JS it wants (closures, its own local state
machines, direct DOM/canvas API access), since it's authored once by whoever
writes it, the same way any small UI library is.

```ts
import { definePlugin } from 'layos'

export const canvas = definePlugin({
  name: 'canvas',
  directives: ['canvas'],

  setup(el, ctx) {
    // el: the DOM element this token was found on
    // ctx.action:  'drag' | 'draw' | ...  — the part after the namespace
    // ctx.config:  { bounds: 'parent' } — already parsed key:value pairs from [ ]
    // ctx.state:   { get(key), set(key, value) } — scoped view over the
    //              element's slot in the core's shared state store
    // ctx.on:      (eventName, handler) => void — registers interest with
    //              the core's delegated listener, scoped to this element
    // ctx.emit:    (name, detail) => void — dispatches a custom event other
    //              plugins or host code can listen for
    // ctx.scope:   resolve/read/write a named multi-element scope

    if (ctx.action === 'drag') {
      let dragging = false
      ctx.on('pointerdown', () => { dragging = true; ctx.state.set('dragging', true) })
      ctx.on('pointermove', (e) => {
        if (!dragging) return
        el.style.left = `${e.clientX}px`
        el.style.top = `${e.clientY}px`
      })
      ctx.on('pointerup', () => { dragging = false; ctx.state.set('dragging', false) })
    }
  },
})
```

`ctx` is the plugin's complete input surface — everything it needs to read
the directive, touch the element, and hook into the core's shared services
comes through it, so a plugin never has to reach outside its own `setup`
call to do real work.

The directive an end user writes stays flat and predictable no matter how
much the plugin does internally:

```
canvas:drag[bounds:parent]
canvas:draw[tool:pen color:red]
dialog:modal[closeOn:backdrop]
scroll:reveal[threshold:0.5]
```

`config` there is always plain data — strings, numbers, booleans — passed
into `setup`. That's the one part of a plugin's surface that stays a fixed
contract; everything behind it is the plugin author's own design.

---


