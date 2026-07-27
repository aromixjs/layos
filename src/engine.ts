import { parseTokens } from './parser'
import { TokenContext, TokenDef, TokenNode } from './token'

export class LayosEngine {
	private registry = new Map<string, TokenDef>()
	private controllers = new WeakMap<HTMLElement, AbortController>()

	constructor(tokens: TokenDef[]) {
		for (const t of tokens) this.register(t)
	}

	private dispatch(element: HTMLElement, nodes: TokenNode[]): void {
		for (const node of nodes) {
			const def = this.registry.get(node.key)
			if (!def) continue

			let ctrl = this.controllers.get(element)
			if (!ctrl) {
				ctrl = new AbortController()
				this.controllers.set(element, ctrl)
			}

			const ctx: TokenContext = {
				element,
				value: node.value,
				scope: node.scope,
				signal: ctrl.signal,
				dispatch: this.dispatch.bind(this),
				css: (props) => {
					for (const prop in props) {
						element.style.setProperty(prop, props[prop])
					}
				},
			}

			def.run(ctx)
		}
	}

	run(element: HTMLElement, layValue: string): void {
		const ctrl = this.controllers.get(element)
		if (ctrl) ctrl.abort()
		this.controllers.set(element, new AbortController())
		this.dispatch(element, parseTokens(layValue))
	}

	scan(root: ParentNode): void {
		for (const el of root.querySelectorAll<HTMLElement>('[lay]')) {
			const v = el.getAttribute('lay')
			if (v) this.run(el, v)
		}
	}

	cleanup(element: HTMLElement): void {
		const ctrl = this.controllers.get(element)
		if (ctrl) {
			ctrl.abort()
			this.controllers.delete(element)
		}
		element.removeAttribute('style')
	}

	register(def: TokenDef) {
		if (!this.registry.has(def.key)) this.registry.set(def.key, def)
		if (def.scope) for (const s of def.scope) this.register(s)
	}
}
