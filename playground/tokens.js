export const flex = {
	key: 'flex',
	run({ element }) {
		element.style.display = 'flex'
	},
}

export const block = {
	key: 'block',
	run({ element }) {
		element.style.display = 'block'
	},
}

export const grid = {
	key: 'grid',
	run({ element }) {
		element.style.display = 'grid'
	},
}

export const bg = {
	key: 'bg',
	values: ['primary', 'secondary', 'danger', 'success', 'dark', 'muted'],
	run({ element, value }) {
		const colors = {
			primary: '#3b82f6',
			secondary: '#6b7280',
			danger: '#ef4444',
			success: '#22c55e',
			dark: '#1e293b',
			muted: '#374151',
		}
		if (value && colors[value]) {
			element.style.backgroundColor = colors[value]
		}
	},
}

export const color = {
	key: 'color',
	values: ['white', 'muted', 'danger', 'success'],
	run({ element, value }) {
		const colors = {
			white: '#ffffff',
			muted: '#9ca3af',
			danger: '#fca5a5',
			success: '#86efac',
		}
		if (value && colors[value]) {
			element.style.color = colors[value]
		}
	},
}

export const pad = {
	key: 'pad',
	values: ['xs', 'sm', 'md', 'lg', 'xl'],
	run({ element, value }) {
		const sizes = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }
		if (value && sizes[value]) {
			element.style.padding = sizes[value]
		}
	},
}

export const gap = {
	key: 'gap',
	values: ['sm', 'md', 'lg'],
	run({ element, value }) {
		const sizes = { sm: '8px', md: '16px', lg: '24px' }
		if (value && sizes[value]) {
			element.style.gap = sizes[value]
		}
	},
}

export const rounded = {
	key: 'rounded',
	values: ['sm', 'md', 'lg', 'full'],
	run({ element, value }) {
		const radii = { sm: '4px', md: '8px', lg: '12px', full: '9999px' }
		if (value && radii[value]) {
			element.style.borderRadius = radii[value]
		}
	},
}

export const w = {
	key: 'w',
	values: ['full', 'auto', 'fit'],
	run({ element, value }) {
		const widths = { full: '100%', auto: 'auto', fit: 'fit-content' }
		if (value && widths[value]) {
			element.style.width = widths[value]
		}
	},
}

export const cursor = {
	key: 'cursor',
	values: ['pointer', 'default', 'grab'],
	run({ element, value }) {
		if (value) {
			element.style.cursor = value
		}
	},
}

export const fontSize = {
	key: 'fontSize',
	values: ['sm', 'md', 'lg'],
	run({ element, value }) {
		const sizes = { sm: '0.8rem', md: '1rem', lg: '1.25rem' }
		if (value && sizes[value]) {
			element.style.fontSize = sizes[value]
		}
	},
}

export const hover = {
	key: 'hover',
	run({ element, scopes, dispatch, signal }) {
		if (!scopes) return
		const normalStyles = new Map()
		const hoverStyles = new Map()

		for (const node of scopes) {
			const key = node.key
			const val = node.value
			if (key === 'bg') {
				const colors = {
					primary: '#3b82f6',
					secondary: '#6b7280',
					danger: '#ef4444',
					success: '#22c55e',
					dark: '#1e293b',
					muted: '#374151',
				}
				const normal = colors[val] || colors.primary
				const current = element.style.backgroundColor || normal
				normalStyles.set('backgroundColor', current)
				hoverStyles.set('backgroundColor', normal)
			}
		}

		const applyHover = () => {
			for (const [prop, val] of hoverStyles) {
				element.style[prop] = val
			}
		}
		const removeHover = () => {
			for (const [prop, val] of normalStyles) {
				element.style[prop] = val
			}
		}

		element.addEventListener('mouseenter', applyHover, { signal })
		element.addEventListener('mouseleave', removeHover, { signal })
	},
}

export const focus = {
	key: 'focus',
	run({ element, scopes, signal }) {
		if (!scopes) return
		const focusStyles = new Map()

		for (const node of scopes) {
			const key = node.key
			const val = node.value
			if (key === 'bg') {
				const colors = {
					primary: '#3b82f6',
					danger: '#ef4444',
					success: '#22c55e',
				}
				if (val && colors[val]) focusStyles.set('backgroundColor', colors[val])
			}
		}

		const applyFocus = () => {
			for (const [prop, val] of focusStyles) {
				element.style[prop] = val
			}
			element.style.outline = '2px solid currentColor'
		}
		const removeFocus = () => {
			element.style.backgroundColor = ''
			element.style.outline = ''
		}

		element.addEventListener('focus', applyFocus, { signal })
		element.addEventListener('blur', removeFocus, { signal })
	},
}

export const click = {
	key: 'click',
	run({ element, scopes, signal }) {
		if (!scopes) return
		let active = false

		const clickStyles = new Map()
		for (const node of scopes) {
			if (node.key === 'bg') {
				const colors = {
					primary: '#3b82f6',
					danger: '#ef4444',
					success: '#22c55e',
				}
				if (node.value && colors[node.value]) {
					clickStyles.set('backgroundColor', colors[node.value])
				}
			}
			if (node.key === 'color') {
				const colors = { white: '#ffffff', muted: '#9ca3af' }
				if (node.value && colors[node.value]) {
					clickStyles.set('color', colors[node.value])
				}
			}
			if (node.key === 'pad') {
				const sizes = { md: '16px', lg: '24px' }
				if (node.value && sizes[node.value]) {
					clickStyles.set('padding', sizes[node.value])
				}
			}
		}

		const normalBg = element.style.backgroundColor
		const normalColor = element.style.color
		const normalPad = element.style.padding

		element.addEventListener(
			'click',
			() => {
				active = !active
				if (active) {
					for (const [prop, val] of clickStyles) {
						element.style[prop] = val
					}
				} else {
					element.style.backgroundColor = normalBg
					element.style.color = normalColor
					element.style.padding = normalPad
				}
			},
			{ signal },
		)
	},
}

export const toggle = {
	key: 'toggle',
	run({ element, signal }) {
		element.addEventListener(
			'click',
			() => {
				const hidden = element.style.display === 'none'
				element.style.display = hidden ? '' : 'none'
			},
			{ signal },
		)
	},
}

export const show = {
	key: 'show',
	run({ element }) {
		element.style.display = ''
	},
}

export const hide = {
	key: 'hide',
	run({ element }) {
		element.style.display = 'none'
	},
}

export const disabled = {
	key: 'disabled',
	run({ element }) {
		element.setAttribute('aria-disabled', 'true')
		element.style.pointerEvents = 'none'
		element.style.opacity = '0.5'
		element.style.cursor = 'not-allowed'
	},
}

export const layout = [flex, block, grid]
export const visual = [bg, color, pad, gap, rounded, w, cursor, fontSize]
export const behavior = [hover, focus, click, toggle, show, hide, disabled]
export const defaultPlugin = [...layout, ...visual, ...behavior]
