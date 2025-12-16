# Module: src/decoding/phrasing.mjs

**Purpose:** Convert decoded structures to natural language using templates.

## Exports

```javascript
export class PhrasingEngine {
  constructor()
  registerTemplate(operator: string, pattern: string): void
  getTemplate(operator: string): Template | null
  generateText(structure: DecodedStructure): string
  listOperators(): string[]
}

interface Template {
  pattern: string;      // e.g., "{Pos1} loves {Pos2}."
  positions: number[];  // [1, 2]
}
```

## Built-in Templates

| Operator | Pattern |
|----------|---------|
| loves | `{Pos1} loves {Pos2}.` |
| isA | `{Pos1} is a {Pos2}.` |
| sells | `{Pos1} sells {Pos2} to {Pos3}.` |
| Implies | `If {Pos1} then {Pos2}.` |

## Dependencies

None.

## Test Cases

- Known operators use correct templates
- Unknown operators use generic phrasing
- Custom templates can be registered
