import { describe, expect, it } from 'vitest'
import { TokenParser } from '../src/token/parser'

const parser = (input: string) => new TokenParser().parse(input)

describe('TokenParser', () => {
	it('parses a single key', () => {
		expect(parser('flex')).toEqual([{ key: 'flex' }])
	})

	it('parses key-value', () => {
		expect(parser('bg:primary')).toEqual([{ key: 'bg', value: 'primary' }])
	})

	it('parses multiple tokens', () => {
		expect(parser('flex bg:primary pad:md')).toEqual([
			{ key: 'flex' },
			{
				key: 'bg',
				value: 'primary',
			},
			{ key: 'pad', value: 'md' },
		])
	})

	it('parses scopesd tokens', () => {
		expect(parser('hover:[ bg:red ]')).toEqual([
			{
				key: 'hover',
				scopes: [{ key: 'bg', value: 'red' }],
			},
		])
	})

	it('parses scopes with multiple tokens', () => {
		expect(parser('hover:[ bg:red pad:lg ]')).toEqual([
			{
				key: 'hover',
				scopes: [
					{ key: 'bg', value: 'red' },
					{ key: 'pad', value: 'lg' },
				],
			},
		])
	})

	it('parses scopes with standalone and key-value tokens', () => {
		expect(parser('toggle:[ bold bg:blue ]')).toEqual([
			{
				key: 'toggle',
				scopes: [{ key: 'bold' }, { key: 'bg', value: 'blue' }],
			},
		])
	})

	it('parses nested scopess', () => {
		expect(parser('a:[ b:[ c:deep ] ]')).toEqual([
			{
				key: 'a',
				scopes: [{ key: 'b', scopes: [{ key: 'c', value: 'deep' }] }],
			},
		])
	})

	it('parses triple nesting', () => {
		expect(parser('x:[ y:[ z:[ w:deep ] ] ]')).toEqual([
			{
				key: 'x',
				scopes: [
					{
						key: 'y',
						scopes: [{ key: 'z', scopes: [{ key: 'w', value: 'deep' }] }],
					},
				],
			},
		])
	})

	it('parses mixed nesting depths in one input', () => {
		expect(parser('a:[ b:val ] c:[ d:[ e:val2 ] ]')).toEqual([
			{ key: 'a', scopes: [{ key: 'b', value: 'val' }] },
			{
				key: 'c',
				scopes: [{ key: 'd', scopes: [{ key: 'e', value: 'val2' }] }],
			},
		])
	})

	it('parses nested scopes with multiple sibling tokens', () => {
		expect(parser('hover:[ bg:red focus:[ outline:2px ] pad:lg ]')).toEqual([
			{
				key: 'hover',
				scopes: [
					{ key: 'bg', value: 'red' },
					{ key: 'focus', scopes: [{ key: 'outline', value: '2px' }] },
					{ key: 'pad', value: 'lg' },
				],
			},
		])
	})

	it('parses nested scopes with standalone keys', () => {
		expect(parser('a:[ b c:[ d ] e ]')).toEqual([
			{
				key: 'a',
				scopes: [
					{ key: 'b' },
					{ key: 'c', scopes: [{ key: 'd' }] },
					{
						key: 'e',
					},
				],
			},
		])
	})

	it('parses deeply nested with mixed key-value and standalone', () => {
		expect(parser('root:[ a:1 b:[ c:2 d ] e:[ f:[ g:3 ] ] ]')).toEqual([
			{
				key: 'root',
				scopes: [
					{ key: 'a', value: '1' },
					{ key: 'b', scopes: [{ key: 'c', value: '2' }, { key: 'd' }] },
					{
						key: 'e',
						scopes: [{ key: 'f', scopes: [{ key: 'g', value: '3' }] }],
					},
				],
			},
		])
	})

	it('handles empty input', () => {
		expect(parser('')).toEqual([])
	})

	it('handles whitespace-only input', () => {
		expect(parser('   ')).toEqual([])
	})

	it('handles leading and trailing whitespace', () => {
		expect(parser('  flex  ')).toEqual([{ key: 'flex' }])
	})

	it('handles multiple whitespace between tokens', () => {
		expect(parser('flex   bg:red')).toEqual([
			{ key: 'flex' },
			{
				key: 'bg',
				value: 'red',
			},
		])
	})

	it('handles tabs and newlines', () => {
		expect(parser('flex\tbg:red\npad:md')).toEqual([
			{ key: 'flex' },
			{
				key: 'bg',
				value: 'red',
			},
			{ key: 'pad', value: 'md' },
		])
	})

	it('handles whitespace inside scopesd tokens', () => {
		expect(parser('hover:[  bg:red   pad:lg  ]')).toEqual([
			{
				key: 'hover',
				scopes: [
					{ key: 'bg', value: 'red' },
					{ key: 'pad', value: 'lg' },
				],
			},
		])
	})

	it('handles value with colons inside', () => {
		expect(parser('bg:primary:hover')).toEqual([
			{
				key: 'bg',
				value: 'primary:hover',
			},
		])
	})

	it('skips standalone brackets without preceding colon', () => {
		expect(parser('[ invalid ] flex')).toEqual([{ key: 'flex' }])
	})

	it('handles unbalanced brackets gracefully', () => {
		expect(parser('hover:[ bg:red ')).toEqual([])
	})

	it('handles key followed by opening bracket without colon', () => {
		expect(parser('hover[ bg:red ]')).toEqual([{ key: 'hover' }])
	})

	it('handles complex mixed input', () => {
		expect(parser('flex bg:primary hover:[ bg:red pad:lg ] cursor:pointer')).toEqual([
			{ key: 'flex' },
			{ key: 'bg', value: 'primary' },
			{
				key: 'hover',
				scopes: [
					{ key: 'bg', value: 'red' },
					{ key: 'pad', value: 'lg' },
				],
			},
			{ key: 'cursor', value: 'pointer' },
		])
	})

	it('handles realistic token string with multiple scopess', () => {
		expect(parser('flex gap:4 hover:[ bg:blue-500 text:white ] focus:[ ring:2 ring:blue-300 ] disabled:[ opacity:50 cursor:not-allowed ]')).toEqual([
			{ key: 'flex' },
			{ key: 'gap', value: '4' },
			{
				key: 'hover',
				scopes: [
					{ key: 'bg', value: 'blue-500' },
					{ key: 'text', value: 'white' },
				],
			},
			{
				key: 'focus',
				scopes: [
					{ key: 'ring', value: '2' },
					{ key: 'ring', value: 'blue-300' },
				],
			},
			{
				key: 'disabled',
				scopes: [
					{ key: 'opacity', value: '50' },
					{ key: 'cursor', value: 'not-allowed' },
				],
			},
		])
	})

	it('handles deeply nested realistic pattern', () => {
		expect(parser('theme:[ dark:[ bg:black text:white hover:[ bg:gray-800 ] ] light:[ bg:white text:black ] ]')).toEqual([
			{
				key: 'theme',
				scopes: [
					{
						key: 'dark',
						scopes: [
							{ key: 'bg', value: 'black' },
							{ key: 'text', value: 'white' },
							{ key: 'hover', scopes: [{ key: 'bg', value: 'gray-800' }] },
						],
					},
					{
						key: 'light',
						scopes: [
							{ key: 'bg', value: 'white' },
							{ key: 'text', value: 'black' },
						],
					},
				],
			},
		])
	})
})
