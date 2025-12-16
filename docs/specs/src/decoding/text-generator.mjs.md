# Module: src/decoding/text-generator.mjs

**Purpose:** Generate human-readable text from vectors and proof results.

## Exports

```javascript
export class TextGenerator {
  constructor(session: Session)
  summarize(vector: Vector): SummaryResult
  elaborate(proof: ProveResult): ElaborationResult
  explainQuery(result: QueryResult, query: string): ExplanationResult
  registerTemplate(operator: string, pattern: string): void
}

interface SummaryResult {
  success: boolean;
  text: string;
  structure?: DecodedStructure;
  confidence?: number;
}
```

## Dependencies

- `./structural-decoder.mjs`
- `./phrasing.mjs`

## Test Cases

- Summarize produces readable text
- Elaborate describes proof steps
- Query explanation shows bindings
