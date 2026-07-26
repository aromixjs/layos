import { TokenNode } from "./token"


const SPACE = 32

/**
 * Parses a `lay=""` value (or the contents of a `[...]` scope) into a tree
 * of TokenNode. One pass, no regex, no intermediate string splitting.
 *
 * Grammar:
 *   tokens := atom (whitespace atom)*
 *   atom    := key (':' (scalar | '[' tokens ']'))?
 *   key     := chars up to the next ':', '[', or whitespace
 *
 * Malformed input is never thrown on — a `[` appearing without a preceding
 * `:` is skipped (bracket contents discarded), and an unterminated `[` runs
 * to end-of-string and is dropped. Both cases leave every other token in
 * the string unaffected.
 */
export function parseTokens(input: string): TokenNode[] {
	const nodes: TokenNode[] = []
	const len = input.length
	let i = 0

	while (i < len) {
		// skip whitespace between tokens
		while (i < len && input.charCodeAt(i) <= SPACE) i++
		if (i >= len) break

		// read key: stop at whitespace, ':' or '['
		let key = ''
		while (i < len) {
			const code = input.charCodeAt(i)
			const ch = input[i]
			if (code <= SPACE || ch === ':' || ch === '[') break
			key += ch
			i++
		}

		if (i < len && input[i] === '[') {
			// invariant violation: '[' with no preceding ':' — skip the whole
			// bracket group, emit nothing for this malformed token.
			i = skipBracket(input, i, len)
			continue
		}

		if (i < len && input[i] === ':') {
			i++ // consume ':'

			if (i < len && input[i] === '[') {
				i++ // consume '['
				const start = i
				let depth = 1
				while (i < len && depth > 0) {
					if (input[i] === '[') depth++
					else if (input[i] === ']') {
						depth--
						if (depth === 0) break
					}
					i++
				}
				const payload = input.slice(start, i)
				if (i < len) i++ // consume ']'
				// unbalanced brackets just run to end-of-string; whatever was
				// captured still parses fine as best-effort content.
				if (key) nodes.push({ key, scope: parseTokens(payload) })
			} else {
				// scalar value: read to next whitespace (colons inside are
				// fine and left as-is, e.g. `bg:primary:hover`)
				let value = ''
				while (i < len && input.charCodeAt(i) > SPACE) {
					value += input[i]
					i++
				}
				if (key) nodes.push({ key, value })
			}
		} else if (key) {
			nodes.push({ key })
		}
	}

	return nodes
}

/** Skips a `[...]` group (with nesting) starting at an opening bracket. */
function skipBracket(input: string, i: number, len: number): number {
	let depth = 0
	while (i < len) {
		if (input[i] === '[') depth++
		else if (input[i] === ']') {
			depth--
			if (depth === 0) return i + 1
		}
		i++
	}
	return len
}