# Design Spec: src/plugins/math.js

ID: DS(/plugins/math.js)

Class `MathPlugin`
- **Role**: Compute plugin that handles arithmetic operations and numeric comparisons. Implements the plugin interface for relations like LESS_THAN, GREATER_THAN, PLUS, MINUS, TIMES, DIVIDED_BY, and HAS_VALUE.
- **Pattern**: Strategy. SOLID: single responsibility for mathematical computation; stateless evaluation.
- **Key Collaborators**: `PluginRegistry` (registration), numeric concept labels.

## Public API

- `name`: String identifier `'math'`
- `relations`: Array of handled relations
- `evaluate(relation, subject, object)`: Compute result for given relation
- `canCompute(relation, subject, object)`: Check if values can be extracted for computation

## Supported Relations

| Relation | Description | Example |
|----------|-------------|---------|
| `LESS_THAN` | Numeric comparison a < b | `celsius_20 LESS_THAN celsius_50` → TRUE_CERTAIN |
| `GREATER_THAN` | Numeric comparison a > b | `100 GREATER_THAN 50` → TRUE_CERTAIN |
| `EQUALS_VALUE` | Equality with epsilon | `3.14 EQUALS_VALUE 3.14` → TRUE_CERTAIN |
| `PLUS` | Addition a + b | `10 PLUS 20` → { value: 30 } |
| `MINUS` | Subtraction a - b | `100 MINUS 25` → { value: 75 } |
| `TIMES` | Multiplication a * b | `7 TIMES 6` → { value: 42 } |
| `DIVIDED_BY` | Division a / b | `100 DIVIDED_BY 4` → { value: 25 } |
| `HAS_VALUE` | Extract numeric value | `celsius_20 HAS_VALUE ?` → { value: 20 } |

## Pseudocode

```js
class MathPlugin {
  constructor() {
    this.name = 'math';
    this.relations = [
      'LESS_THAN', 'GREATER_THAN', 'EQUALS_VALUE',
      'PLUS', 'MINUS', 'TIMES', 'DIVIDED_BY', 'HAS_VALUE'
    ];
  }

  evaluate(relation, subject, object) {
    const a = this._extractValue(subject);
    const b = this._extractValue(object);

    if (a === null) {
      return { truth: 'UNKNOWN', confidence: 0, reason: 'Cannot extract numeric value from subject' };
    }

    if (relation === 'HAS_VALUE') {
      return { truth: 'TRUE_CERTAIN', confidence: 1.0, value: a };
    }

    if (b === null) {
      return { truth: 'UNKNOWN', confidence: 0, reason: 'Cannot extract numeric value from object' };
    }

    switch (relation) {
      case 'LESS_THAN':
        return { truth: a < b ? 'TRUE_CERTAIN' : 'FALSE', confidence: 1.0, computed: `${a} < ${b}` };
      case 'GREATER_THAN':
        return { truth: a > b ? 'TRUE_CERTAIN' : 'FALSE', confidence: 1.0, computed: `${a} > ${b}` };
      case 'EQUALS_VALUE':
        const equal = Math.abs(a - b) < 1e-9;
        return { truth: equal ? 'TRUE_CERTAIN' : 'FALSE', confidence: 1.0, computed: `${a} == ${b}` };
      case 'PLUS':
        return { truth: 'TRUE_CERTAIN', confidence: 1.0, value: a + b, computed: `${a} + ${b} = ${a + b}` };
      case 'MINUS':
        return { truth: 'TRUE_CERTAIN', confidence: 1.0, value: a - b, computed: `${a} - ${b} = ${a - b}` };
      case 'TIMES':
        return { truth: 'TRUE_CERTAIN', confidence: 1.0, value: a * b, computed: `${a} * ${b} = ${a * b}` };
      case 'DIVIDED_BY':
        if (b === 0) {
          return { truth: 'FALSE', confidence: 1.0, reason: 'Division by zero', error: 'DIVISION_BY_ZERO' };
        }
        return { truth: 'TRUE_CERTAIN', confidence: 1.0, value: a / b, computed: `${a} / ${b} = ${a / b}` };
      default:
        return { truth: 'UNKNOWN', confidence: 0, reason: `Unknown math relation: ${relation}` };
    }
  }

  _extractValue(input) {
    // Already a number
    if (typeof input === 'number') return input;

    // Object with value property
    if (typeof input === 'object' && input !== null) {
      if (typeof input.value === 'number') return input.value;
      if (input.raw) return this._extractValue(input.raw);
      if (input.label) return this._extractValue(input.label);
    }

    // String parsing
    if (typeof input === 'string') {
      // Direct numeric: "42", "-3.14"
      if (/^-?\d+\.?\d*$/.test(input)) return parseFloat(input);

      // Suffix: "celsius_20", "meters_100"
      const suffixMatch = input.match(/_(-?\d+\.?\d*)$/);
      if (suffixMatch) return parseFloat(suffixMatch[1]);

      // Prefix: "20_celsius"
      const prefixMatch = input.match(/^(-?\d+\.?\d*)_/);
      if (prefixMatch) return parseFloat(prefixMatch[1]);

      // Embedded: "temp20", "v100"
      const embeddedMatch = input.match(/(-?\d+\.?\d*)/);
      if (embeddedMatch) return parseFloat(embeddedMatch[1]);
    }

    return null;
  }

  canCompute(relation, subject, object) {
    const a = this._extractValue(subject);
    const b = relation === 'HAS_VALUE' ? 0 : this._extractValue(object);
    return a !== null && b !== null;
  }
}
```

## Value Extraction Patterns

The `_extractValue` method supports multiple naming conventions:

| Pattern | Example | Extracted Value |
|---------|---------|-----------------|
| Direct number | `"42"`, `"-3.14"` | 42, -3.14 |
| Suffix convention | `"celsius_20"`, `"meters_100"` | 20, 100 |
| Prefix convention | `"20_celsius"`, `"100_meters"` | 20, 100 |
| Embedded number | `"temp20"`, `"v100"` | 20, 100 |
| Object with value | `{ value: 42 }` | 42 |
| Object with raw | `{ raw: "celsius_20" }` | 20 |

## Notes/Constraints
- All computations are stateless and deterministic.
- Floating point equality uses epsilon comparison (1e-9) to handle precision issues.
- Division by zero returns FALSE with error indicator rather than throwing.
- Unknown relations return UNKNOWN rather than throwing.
- Value extraction is greedy - embedded numbers in any string will be extracted.
