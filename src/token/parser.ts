const CharCodes = {
	Colon: 58,
	OpenBracket: 91,
	CloseBracket: 93,
	Space: 32,
	Tab: 9,
	LineFeed: 10,
	Carriage: 13,
} as const;


export function TokenParser(source: string) {
	const nodes: any[] = []
	let cursor = 0
	const length = source.length


	while (cursor < length) {
		// Skip leading whitespace
		if (
			TokenParser.IsWhiteSpace(source.charCodeAt(cursor)) &&
			cursor < length
		) {
			cursor++;
			continue;
		}

		// Scan for the key
		const keyStart = cursor
		while (cursor < length) {
			const code = source.charCodeAt(cursor)
			if (
				TokenParser.IsWhiteSpace(code) ||
				code === CharCodes.Colon ||
				code === CharCodes.OpenBracket
			) {
				break;
			}
			cursor++
		}
		const key = source.slice(keyStart, cursor)

		// Handles standalone flags without values or scopes
		if (
			cursor >= length ||
			TokenParser.IsWhiteSpace(source.charCodeAt(cursor))
		) {
			nodes.push({ key })
			continue;
		}


		// Skip the assignment colon
		if (source.charCodeAt(cursor) === CharCodes.Colon) {
			cursor++
		}


		// Handle nested scope/block when an opening bracket is found
		if (source.charCodeAt(cursor) === CharCodes.OpenBracket) {
			const end = TokenParser.ScopeEnd(source, cursor)
			if (end === -1) break

			// Recursively parse the inner contents of the brackets
			nodes.push({
				key,
				scopes: TokenParser(source.slice(cursor + 1, end)),
			})

			cursor = end + 1

			continue
		}

		// Handle scalar/primitive values assigned via colon
		const valueStart = cursor
		while (cursor < length && !TokenParser.IsWhiteSpace(source.charCodeAt(cursor))) {
			cursor++
		}

		nodes.push({
			key,
			value: source.slice(valueStart, cursor),
		})
	}

	return nodes
}



TokenParser.IsWhiteSpace = (code: number): boolean => {
	return code === CharCodes.Space ||
		code === CharCodes.Tab ||
		code === CharCodes.LineFeed ||
		code === CharCodes.Carriage
}

TokenParser.ScopeEnd = (source: string, start: number): number => {
	let depth = 0


	// Track bracket nesting depth to find the exact closing bracket for nested blocks
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