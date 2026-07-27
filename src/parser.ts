import { TokenNode } from './token'

const CharCodes = {
	Space: 32,
	Tab: 9,
	LineFeed: 10,
	Carriage: 13,
	Colon: 58,
	OpenBracket: 91,
	CloseBracket: 93,
}

export class TokenParser {
	private isWhiteSpace(code: number) {
		return code === CharCodes.Space || code === CharCodes.Tab || code === CharCodes.LineFeed || code === CharCodes.Carriage
	}

	findScopeEnd(source: string, start: number) {
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

	// Parses a string into TokenNodes.
	parse(source: string) {
		const nodes: TokenNode[] = []
		let cursor = 0
		let length = source.length

		while (cursor < length) {
			// Skip White Spaces
			while (cursor < length && this.isWhiteSpace(source.charCodeAt(cursor))) {
				cursor++
			}
			if (cursor >= length) {
				break
			}

			const keyStart = cursor
			// Scan Forward Until It Finds : or [
			while (cursor < length) {
				const code = source.charCodeAt(cursor)
				if (this.isWhiteSpace(code) || code === CharCodes.Colon || code === CharCodes.OpenBracket) {
					break
				}
				cursor++
			}

			// Extract The Key
			const key = source.slice(keyStart, cursor)

			// If the key is followed by whitespace or the end, this is a standalone token.
			if (cursor >= length || this.isWhiteSpace(source.charCodeAt(cursor))) {
				nodes.push({ key })
				continue
			}

			// A Colon Means The token has a value or scope
			if (source.charCodeAt(cursor) === CharCodes.Colon) {
				cursor++
			} else {
				// Token Was followed By an Unexpected character

				if (source.charCodeAt(cursor) === CharCodes.OpenBracket) {
					const end = this.findScopeEnd(source, cursor)
					if (end === -1) break

					cursor = end + 1
				} else {
					cursor++
				}

				continue
			}

			// After ':' immediately seeing '[' means a nested scope.
			if (source.charCodeAt(cursor) === CharCodes.OpenBracket) {
				const end = this.findScopeEnd(source, cursor)
				if (end === -1) break

				nodes.push({
					key,
					scope: this.parse(source.slice(cursor + 1, end)),
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
