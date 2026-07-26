import { createEngine, Engine } from "./engine"
import { TokenDef } from "./token"

/**
 * layos([...tokens]) — that's it. Builds the registry from the given
 * tokens and, if `window`/`document` are present, immediately scans the
 * page and keeps watching for new or changed `lay=""` attributes. No
 * separate mount() call, no config object.
 *
 * In a non-DOM environment (SSR, tests, tooling) it just returns the
 * engine without touching anything, so importing this module is always
 * safe.
 */
export function layos(tokens: TokenDef[]): Engine {
	const engine = createEngine(tokens)

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
					if (layValue) engine.run(el, layValue)
					continue
				}

				for (const added of mutation.addedNodes) {
					if (!(added instanceof HTMLElement)) continue
					const layValue = added.getAttribute('lay')
					if (layValue) engine.run(added, layValue)
					engine.scan(added)
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

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, { once: true })
	} else {
		start()
	}

	return engine
}