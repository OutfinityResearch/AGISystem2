# Module: src/output/text-generator.mjs

**Purpose:** Generate human-readable text from vectors and proof results.

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

## Test Cases

- Generate produces readable text
- Elaborate describes proof steps
