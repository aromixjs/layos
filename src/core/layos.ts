import { Observer } from './observer'
import { Runtime } from './runtime'
import { LayosConfig } from './types'

export function layos(config: LayosConfig) {
	const runtime = new Runtime(config.tokens)
	const observer = new Observer(runtime)

	runtime.scan(config.target)

	if (config.target instanceof Document) {
		observer.observe(config.target.documentElement)
	} else {
		observer.observe(config.target)
	}

	// if it ever needs to disconnect or access internals
	return { runtime, observer }
}
