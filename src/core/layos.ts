import { Token } from '../token/types'
import { Observer } from './observer'
import { Runtime } from './runtime'

export interface LayosConfig {
	root: ParentNode
	tokens: Token[]
}


export function layos(config: LayosConfig) {
	const runtime = new Runtime(config.tokens)
	const observer = new Observer(runtime)

	runtime.scan(config.root)

	if (config.root instanceof Document) {
		observer.observe(config.root.documentElement)
	} else {
		observer.observe(config.root)
	}

	// if it ever needs to disconnect or access internals
	return { runtime, observer }
}
