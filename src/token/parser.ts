import { CharCodes } from './charcode'
import type { TokenNode } from './types'

// docs for this parser are in here: internal/token-parser.md
export class TokenParser {
	private isWhiteSpace(code: number) {
		return code === CharCodes.Space || code === CharCodes.Tab || code === CharCodes.LineFeed || code === CharCodes.Carriage
	}

	private findScopeEnd(source: string, start: number) {
		let depth = 0

		for (let cursor = start; cursor < source.length; cursor++) {
			const code = source.charCodeAt(cursor)
			if (code === CharCodes.OpenBracket) {
				depth++
				continue
			}

			if (code === CharCodes.CloseBracket) {
				depth--
				if (depth === 0) {
					return cursor
				}
			}
		}
		return -1
	}

	parse(source: string) {
		const nodes: TokenNode[] = []
		let cursor = 0
		const length = source.length

		while (cursor < length) {
			while (cursor < length && this.isWhiteSpace(source.charCodeAt(cursor))) {
				cursor++
			}
			if (cursor >= length) {
				break
			}

			const keyStart = cursor
			while (cursor < length) {
				const code = source.charCodeAt(cursor)
				if (this.isWhiteSpace(code) || code === CharCodes.Colon || code === CharCodes.OpenBracket) {
					break
				}
				cursor++
			}

			const key = source.slice(keyStart, cursor)

			if (cursor >= length || this.isWhiteSpace(source.charCodeAt(cursor))) {
				nodes.push({ key })
				continue
			}

			if (source.charCodeAt(cursor) === CharCodes.Colon) {
				cursor++
			} else {
				if (key) nodes.push({ key })

				if (source.charCodeAt(cursor) === CharCodes.OpenBracket) {
					const end = this.findScopeEnd(source, cursor)
					if (end === -1) break

					cursor = end + 1
				} else {
					cursor++
				}

				continue
			}

			if (source.charCodeAt(cursor) === CharCodes.OpenBracket) {
				const end = this.findScopeEnd(source, cursor)
				if (end === -1) break

				nodes.push({
					key,
					scopes: this.parse(source.slice(cursor + 1, end)),
				})
				cursor = end + 1

				continue
			}

			const valueStart = cursor
			while (cursor < length && !this.isWhiteSpace(source.charCodeAt(cursor))) {
				cursor++
			}

			nodes.push({
				key,
				value: source.slice(valueStart, cursor),
			})
		}

		return nodes
	}
}
