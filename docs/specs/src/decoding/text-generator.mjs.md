# Module: src/decoding/text-generator.mjs

**Purpose:** Generate human-readable summaries by decoding vectors into DSL structures and phrasing them.

**Status/usage:** This module exists mainly for vector-centric inspection and debugging. Runtime responses (including Eval output) use `src/output/response-translator.mjs` + `src/output/text-generator.mjs`.

## Exports

```javascript
export class TextGenerator {
  constructor(session: Session)
  summarize(vector: Vector): { success: boolean, text: string, structure?: object, confidence?: number, reason?: string }
  elaborate(proof: ProveResult): { success: boolean, text: string }
  explainQuery(result: QueryResult, originalQuery: string): { success: boolean, text: string }
  registerTemplate(operator: string, pattern: string): void
}
```

## Dependencies

- `src/decoding/structural-decoder.mjs`
- `src/decoding/phrasing.mjs`

## Notes

- Runtime NL responses are produced by `session.describeResult(...)` via `src/output/response-translator.mjs` and `src/output/text-generator.mjs`.
- `explainQuery(...)` is a helper for formatting query results; it is not the `explain` action/operator (which is reserved and not executed by current eval runners).

## Test Cases

- Summarize returns readable text for decodable vectors
- Elaborate formats proof result (valid/invalid)
- explainQuery formats bindings and confidence
