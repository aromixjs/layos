import { describe, it, expect } from 'vitest'
import { createCore } from '../src'

describe('createCore', () => {
	it('should create a core instance with defaults', () => {
		const core = createCore()
		expect(core.name).toBe('layos')
		expect(core.version).toBe('0.1.0')
		expect(core.config.debug).toBe(false)
	})

	it('should accept custom config', () => {
		const core = createCore({ name: 'custom', debug: true })
		expect(core.name).toBe('custom')
		expect(core.config.debug).toBe(true)
	})
})
