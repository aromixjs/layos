export function createCore(config?: CoreConfig): Core {
	const options = { ...defaults, ...config }
	return {
		name: options.name,
		version: options.version,
		config: options,
	}
}

export interface CoreConfig {
	name?: string
	version?: string
	debug?: boolean
}

export interface Core {
	name: string
	version: string
	config: Required<CoreConfig>
}

const defaults: Required<CoreConfig> = {
	name: 'layos',
	version: '0.1.0',
	debug: false,
}
