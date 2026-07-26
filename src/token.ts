export interface TokenNode {
	key: string
	value?: string
	scope?: TokenNode[]
}


export interface TokenContext {
	element: HTMLElement
	value?: string
	scope?: TokenNode[]

	dispatch(element: HTMLElement, nodes: TokenNode[],suffix?:string): void
	css(properties: Record<string, string>): void
}

export interface TokenDef {
	key: string
	values?: string[]
	scope?: TokenDef[]
	run(ctx: TokenContext): void
}

export function token(def: TokenDef) {
	return def
}
