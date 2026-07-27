import { TokenDef } from './token'
import { LayosEngine } from './engine'

export { token } from './token'
export type { TokenDef, TokenContext, TokenNode } from './token'
export { LayosEngine } from './engine'

export function layos(tokens: TokenDef[]): LayosEngine {
	const engine = new LayosEngine(tokens)

	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return engine
	}

	const start = () => {
		engine.scan(document)

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'attributes' && mutation.attributeName === 'lay') {
					const el = mutation.target as HTMLElement
					const layValue = el.getAttribute('lay')
					if (layValue) {
						engine.run(el, layValue)
					} else {
						engine.cleanup(el)
					}
					continue
				}

				for (const added of mutation.addedNodes) {
					if (!(added instanceof HTMLElement)) continue
					const layValue = added.getAttribute('lay')
					if (layValue) engine.run(added, layValue)
					engine.scan(added)
				}

				for (const removed of mutation.removedNodes) {
					if (!(removed instanceof HTMLElement)) continue
					cleanupTree(removed)
				}
			}
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['lay'],
			childList: true,
			subtree: true,
		})
	}

	function cleanupTree(el: HTMLElement) {
		if (el.hasAttribute('lay')) engine.cleanup(el)
		const nested = el.querySelectorAll<HTMLElement>('[lay]')
		for (const child of nested) engine.cleanup(child)
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, { once: true })
	} else {
		start()
	}

	return engine
}
