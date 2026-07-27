import { TokenParser } from './parser'
import type { TokenContext, TokenDef, TokenNode } from './token'

export class Orchestrator {
	private parser = new TokenParser()
	private tokenRegistry = new Map<string, TokenDef>()
	private controllers = new WeakMap<HTMLElement, AbortController>()

	constructor(tokenDefinitions: TokenDef[]) {
		for (const tokenDefinition of tokenDefinitions) {
			this.register(tokenDefinition)
		}
	}

	private register(tokenDefinition: TokenDef): void {
		if (this.tokenRegistry.has(tokenDefinition.key)) {
			return
		}

		this.tokenRegistry.set(tokenDefinition.key, tokenDefinition)

		if (tokenDefinition.scopes === undefined) {
			return
		}

		for (const scopedTokenDefinition of tokenDefinition.scopes) {
			this.register(scopedTokenDefinition)
		}
	}

	scan(root: ParentNode): void {
		const elements = root.querySelectorAll<HTMLElement>('[lay]')

		for (const element of elements) {
			const layValue = element.getAttribute('lay')

			if (layValue === null) {
				continue
			}

			this.run(element, layValue)
		}
	}

	run(element: HTMLElement, layValue: string): void {
		this.cleanup(element)

		const controller = new AbortController()

		this.controllers.set(element, controller)

		const tokenNodes = this.parser.parse(layValue)

		this.dispatch(element, tokenNodes, controller.signal)
	}

	private dispatch(element: HTMLElement, tokenNodes: TokenNode[], signal: AbortSignal): void {
		for (const tokenNode of tokenNodes) {
			const tokenDefinition = this.tokenRegistry.get(tokenNode.key)

			if (tokenDefinition === undefined) {
				continue
			}

			const tokenContext: TokenContext = {
				element,
				value: tokenNode.value,
				scopes: tokenNode.scopes,
				signal,
				dispatch: (nestedElement: HTMLElement, nestedTokenNodes: TokenNode[]) => {
					this.dispatch(nestedElement, nestedTokenNodes, signal)
				},
			}

			tokenDefinition.run(tokenContext)
		}
	}

	cleanup(element: HTMLElement): void {
		const controller = this.controllers.get(element)

		if (controller !== undefined) {
			controller.abort()
			this.controllers.delete(element)
		}

		element.removeAttribute('style')
	}
}
