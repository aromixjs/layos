# Token Parser

The parser converts a `lay=""` attribute string into a structured `TokenNode[]` array.

## Input Examples

```
"flex"
"bg:primary"
"hover:[ bg:red pad:lg ]"
"theme:[ dark:[ bg:black hover:[ bg:gray ] ] light:[ bg:white ] ]"
```

## Output Structure

```typescript
interface TokenNode {
  key: string
  value?: string
  scopes?: TokenNode[]
}
```

## Grammar

```
token     = key ( ':' value | ':' '[' tokens ']' )?
key       = [^\s:\[]+
value     = [^\s]+
tokens    = token ( whitespace token )*
```

## Parsing Steps

The parser walks the input string character by character using a single `while` loop.

### Step 1: Skip Whitespace
Jump past any spaces, tabs, or newlines before the next token.

### Step 2: Read the Key
Scan forward until hitting whitespace, `:`, or `[`. Everything before that is the key.

### Step 3: Standalone Key
If we hit whitespace or end-of-string after the key, push it as a standalone flag.

### Step 4: Check for Colon
- **Colon found** token has a value or scope, continue to Step 5
- **No colon** unexpected character (e.g. `hover[...]`), push key as standalone, skip the bracket group

### Step 5: Check for Scope
If `[` follows `:`:
1. Find matching `]` using depth tracking
2. Extract the inner string between `[` and `]`
3. Recursively parse it into child `TokenNode[]`
4. Push as `{ key, scopes: [...children] }`

### Step 6: Read the Value
If no `[` after `:`, read until whitespace. Colons inside values are allowed (e.g. `bg:primary:hover` → value is `primary:hover`).

## Bracket Matching

`findScopeEnd(source, start)` walks forward from `start`, tracking depth:
- `[` increments depth
- `]` decrements depth
- When depth hits 0, we found the matching bracket
- Returns `-1` if unbalanced (no matching bracket)

## Examples

| Input | Output |
|-------|--------|
| `flex` | `[{ key: "flex" }]` |
| `bg:red` | `[{ key: "bg", value: "red" }]` |
| `hover:[ bg:red ]` | `[{ key: "hover", scopes: [{ key: "bg", value: "red" }] }]` |
| `a:[ b:[ c:deep ] ]` | `[{ key: "a", scopes: [{ key: "b", scopes: [{ key: "c", value: "deep" }] }] }]` |
| `hover[ bg:red ]` | `[{ key: "hover" }]` (bracket without colon is skipped) |
| `[ invalid ] flex` | `[{ key: "flex" }]` (standalone brackets are skipped) |
| `hover:[ bg:red ` | `[]` (unbalanced brackets return empty) |
