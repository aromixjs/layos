export interface TokenNode {
	key: string
	value?: string
	scopes?: TokenNode[]
}

export interface TokenDef {
	key: string
	values?: string[]
	scopes?: TokenDef[]
	run(ctx: TokenContext): void
}

export interface TokenContext {
	element: HTMLElement
	value?: string
	scopes?: TokenNode[]
	signal: AbortSignal
	dispatch(element: HTMLElement, nodes: TokenNode[]): void
}

export function token(def: TokenDef) {
	return def
}
