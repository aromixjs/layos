export interface TokenNode {
	key: string
	value?: string
	scopes?: TokenNode[]
}

export interface Token {
	key: string
	values?: string[]
	scopes?: Token[]
	run(ctx: TokenContext): void
}

export interface TokenContext {
	element: HTMLElement
	value?: string
	scopes?: TokenNode[]
	signal: AbortSignal
	dispatch(element: HTMLElement, nodes: TokenNode[]): void
}
