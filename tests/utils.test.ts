import { describe, it, expect } from 'vitest'
import { formatDate, generateId } from '../src'

describe('utils', () => {
	it('formatDate should return ISO string', () => {
		const date = new Date('2026-01-01T00:00:00.000Z')
		expect(formatDate(date)).toBe('2026-01-01T00:00:00.000Z')
	})

	it('generateId should return a valid UUID', () => {
		const id = generateId()
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		)
	})
})
