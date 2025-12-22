# Module: src/output/text-generator.mjs

**Purpose:** Generate lightweight natural-language text from operators/args and proof results for runtime responses.

## Exports

```javascript
export class TextGenerator {
  constructor()
  generate(operator: string, args: Array<string | { value: string }>): string
  elaborate(proof: ProveResult): { text: string, proofChain?: string[], fullProof?: string }
}

export const textGenerator: TextGenerator  // singleton used by runtime
```

## Dependencies

- (none)

## Notes

- Used by `src/runtime/session.mjs` for `session.generateText(...)` and `session.elaborate(...)`.
- Full response formatting for eval/output is handled by `src/output/response-translator.mjs`, which calls into this generator as needed.

## Test Cases

- Generate produces readable text from common operators
- Elaborate formats `valid=false` and `valid=true` proofs

