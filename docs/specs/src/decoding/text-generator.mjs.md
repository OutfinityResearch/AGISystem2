# Module: src/output/text-generator.mjs

**Purpose:** Generate human-readable text from operators/args and proof results.

## Exports

```javascript
export class TextGenerator {
  constructor()
  generate(operator: string, args: Array<string | { value: string }>): string
  elaborate(proof: ProveResult): ElaborationResult
}

interface ElaborationResult {
  text: string;
  proofChain?: string[];
  fullProof?: string;
}
```

## Dependencies

- (none)

## Notes

- Implementation lives at `src/output/text-generator.mjs`.
- There is no `explainQuery` method; query/proof NL is handled by `ResponseTranslator`.

## Test Cases

- Generate produces readable text
- Elaborate describes proof steps
