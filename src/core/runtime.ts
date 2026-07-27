import { TokenParser } from '../token/parser'
import type { Token, TokenContext, TokenNode } from '../token/types'

export class Runtime {
	private tokenParser = new TokenParser()
	private tokenRegistry = new Map<string, Token>()
	private controllers = new WeakMap<HTMLElement, AbortController>()

	constructor(tokens: Token[]) {
		for (const token of tokens) {
			this.register(token)
		}
	}

	private register(token: Token): void {
		if (this.tokenRegistry.has(token.key)) {
			return
		}

		this.tokenRegistry.set(token.key, token)

		if (token.scopes === undefined) {
			return
		}

		for (const scopedTokenDefinition of token.scopes) {
			this.register(scopedTokenDefinition)
		}
	}

	private dispatch(element: HTMLElement, tokenNodes: TokenNode[], signal: AbortSignal): void {
		for (const tokenNode of tokenNodes) {
			const tokenDef = this.tokenRegistry.get(tokenNode.key)

			if (tokenDef === undefined) {
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

			tokenDef.run(tokenContext)
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
		const tokenNodes = this.tokenParser.parse(layValue)
		this.dispatch(element, tokenNodes, controller.signal)
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
