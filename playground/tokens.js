import { token } from '../dist/index.js'

// ─── Pure CSS tokens ───────────────────────────────────────────
// These apply styles via ctx.css(). No JS behavior.

export const flex = token({
	key: 'flex',
	run({ css }) {
		css({ display: 'flex' })
	},
})

export const block = token({
	key: 'block',
	run({ css }) {
		css({ display: 'block' })
	},
})

export const grid = token({
	key: 'grid',
	run({ css }) {
		css({ display: 'grid' })
	},
})

export const bg = token({
	key: 'bg',
	values: ['primary', 'secondary', 'danger', 'success', 'dark', 'muted'],
	run({ css, value }) {
		const colors = {
			primary: '#3b82f6',
			secondary: '#6b7280',
			danger: '#ef4444',
			success: '#22c55e',
			dark: '#1e293b',
			muted: '#374151',
		}
		if (value && colors[value]) {
			css({ 'background-color': colors[value] })
		}
	},
})

export const color = token({
	key: 'color',
	values: ['white', 'muted', 'danger', 'success'],
	run({ css, value }) {
		const colors = {
			white: '#ffffff',
			muted: '#9ca3af',
			danger: '#fca5a5',
			success: '#86efac',
		}
		if (value && colors[value]) {
			css({ color: colors[value] })
		}
	},
})

export const pad = token({
	key: 'pad',
	values: ['xs', 'sm', 'md', 'lg', 'xl'],
	run({ css, value }) {
		const sizes = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }
		if (value && sizes[value]) {
			css({ padding: sizes[value] })
		}
	},
})

export const gap = token({
	key: 'gap',
	values: ['sm', 'md', 'lg'],
	run({ css, value }) {
		const sizes = { sm: '8px', md: '16px', lg: '24px' }
		if (value && sizes[value]) {
			css({ gap: sizes[value] })
		}
	},
})

export const rounded = token({
	key: 'rounded',
	values: ['sm', 'md', 'lg', 'full'],
	run({ css, value }) {
		const radii = { sm: '4px', md: '8px', lg: '12px', full: '9999px' }
		if (value && radii[value]) {
			css({ 'border-radius': radii[value] })
		}
	},
})

export const w = token({
	key: 'w',
	values: ['full', 'auto', 'fit'],
	run({ css, value }) {
		const widths = { full: '100%', auto: 'auto', fit: 'fit-content' }
		if (value && widths[value]) {
			css({ width: widths[value] })
		}
	},
})

export const cursor = token({
	key: 'cursor',
	values: ['pointer', 'default', 'grab'],
	run({ css, value }) {
		if (value) {
			css({ cursor: value })
		}
	},
})

// ─── Behavior tokens ───────────────────────────────────────────
// These attach event listeners. CSS is applied via suffix.

export const hover = token({
	key: 'hover',
	run({ element, scope, dispatch, signal }) {
		if (!scope) return
		element.addEventListener(
			'mouseenter',
			() => {
				dispatch(element, scope, ':hover')
			},
			{ signal },
		)
	},
})

export const focus = token({
	key: 'focus',
	run({ element, scope, dispatch, signal }) {
		if (!scope) return
		element.addEventListener(
			'focus',
			() => {
				dispatch(element, scope, ':focus')
			},
			{ signal },
		)
		element.addEventListener(
			'blur',
			() => {
				dispatch(element, scope, ':focus')
			},
			{ signal },
		)
	},
})

// ─── Compound behavior tokens ──────────────────────────────────
// CSS + JS merged: event listeners that apply scoped styles.

export const click = token({
	key: 'click',
	run({ element, scope, dispatch, signal }) {
		if (!scope) return
		let active = false
		element.addEventListener(
			'click',
			() => {
				active = !active
				if (active) {
					element.setAttribute('data-l-active', '')
					dispatch(element, scope, '[data-l-active]')
				} else {
					element.removeAttribute('data-l-active')
				}
			},
			{ signal },
		)
	},
})

export const toggle = token({
	key: 'toggle',
	run({ element, signal }) {
		element.addEventListener(
			'click',
			() => {
				element.toggleAttribute('data-l-hidden')
			},
			{ signal },
		)
	},
})

export const show = token({
	key: 'show',
	run({ element }) {
		element.removeAttribute('data-l-hidden')
	},
})

export const hide = token({
	key: 'hide',
	run({ element }) {
		element.setAttribute('data-l-hidden', '')
	},
})

export const disabled = token({
	key: 'disabled',
	run({ element, css }) {
		element.setAttribute('aria-disabled', 'true')
		element.style.pointerEvents = 'none'
		css({ opacity: '0.5', cursor: 'not-allowed' })
	},
})

// ─── Token arrays ──────────────────────────────────────────────

export const layout = [flex, block, grid]
export const visual = [bg, color, pad, gap, rounded, w, cursor]
export const behavior = [hover, focus, click, toggle, show, hide, disabled]
export const defaultPlugin = [...layout, ...visual, ...behavior]
