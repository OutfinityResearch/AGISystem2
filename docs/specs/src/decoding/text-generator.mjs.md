# Module: src/decoding/text-generator.mjs

**Purpose:** Generate human-readable summaries by decoding vectors into DSL structures and phrasing them; also provides helpers for proof/query explanations.

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
- This module is still useful for vector-centric inspection (`summarize`) and standalone explainers (`explainQuery`).

## Test Cases

- Summarize returns readable text for decodable vectors
- Elaborate formats proof result (valid/invalid)
- explainQuery formats bindings and confidence
