let sheet: CSSStyleSheet | undefined
let counter = 0

const rulesByElement = new WeakMap<HTMLElement, Map<string, CSSStyleRule>>()

function ensureSheet(): CSSStyleSheet {
	if (!sheet) {
		sheet = new CSSStyleSheet()
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
	}
	return sheet
}

/**
 * Applies CSS properties to `element`, scoped by `suffix` (e.g. `:hover`,
 * `[data-l-selected]`, or `''` for the element's own base rule). Never
 * writes to `element.style` — every write mutates a CSSOM rule inside one
 * shared, invisibly adopted stylesheet, addressed by a single generated
 * `data-l` attribute. `lay=""` itself is never touched.
 */
export function applyCss(
	element: HTMLElement,
	suffix: string,
	properties: Record<string, string>,
): void {
	const s = ensureSheet()

	let bySuffix = rulesByElement.get(element)
	if (!bySuffix) {
		bySuffix = new Map()
		rulesByElement.set(element, bySuffix)
	}

	let rule = bySuffix.get(suffix)
	if (!rule) {
		let marker = element.getAttribute('data-l')
		if (!marker) {
			marker = 'l' + (counter++).toString(36)
			element.setAttribute('data-l', marker)
		}
		const idx = s.insertRule(`[data-l="${marker}"]${suffix} {}`, s.cssRules.length)
		rule = s.cssRules[idx] as CSSStyleRule
		bySuffix.set(suffix, rule)
	}

	for (const prop in properties) {
		rule.style.setProperty(prop, properties[prop])
	}
}