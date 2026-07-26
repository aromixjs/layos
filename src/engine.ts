
import { parseTokens } from './parser'
import { applyCss } from './css'
import { TokenContext, TokenDef, TokenNode } from './token'

export interface Engine {
	dispatch(element: HTMLElement, nodes: TokenNode[], suffix?: string): void
	run(element: HTMLElement, layValue: string): void
	scan(root: ParentNode): void
}

export function createEngine(tokens: TokenDef[]): Engine {
	const registry = new Map<string, TokenDef>()

	// A token's own `scope` list documents which nested keys are allowed
	// under it — it's also where those nested definitions actually live, so
	// registering recursively means an author never has to separately list
	// a token twice (once at the top level, once as an allowed child).
	function register(defs: TokenDef[]) {
		for (const def of defs) {
			if (!registry.has(def.key)) registry.set(def.key, def)
			if (def.scope) register(def.scope)
		}
	}
	register(tokens)

	function dispatch(element: HTMLElement, nodes: TokenNode[], suffix = ''): void {
		for (const node of nodes) {
			const def = registry.get(node.key)
			if (!def) continue // unknown token — skip silently, never throw

			const ctx: TokenContext = {
				element,
				value: node.value,
				scope: node.scope,
				dispatch,
				css(properties) {
					applyCss(element, suffix, properties)
				},
			}

			def.run(ctx)
		}
	}

	function run(element: HTMLElement, layValue: string): void {
		dispatch(element, parseTokens(layValue))
	}

	function scan(root: ParentNode): void {
		const els = root.querySelectorAll<HTMLElement>('[lay]')
		for (const el of els) {
			const layValue = el.getAttribute('lay')
			if (layValue) run(el, layValue)
		}
	}

	return { dispatch, run, scan }
}