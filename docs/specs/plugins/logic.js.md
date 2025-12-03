# Design Spec: src/plugins/logic.js

ID: DS(/plugins/logic.js)

Class `LogicPlugin`
- **Role**: Compute plugin that handles logical operations and boolean computations. Implements multi-valued logic (Kleene 3-valued logic extended to [-127, 127] range) for propositional reasoning.
- **Pattern**: Strategy. SOLID: single responsibility for logical computation; stateless evaluation.
- **Key Collaborators**: `PluginRegistry` (registration), truth values as numeric or string inputs.

## Public API

- `name`: String identifier `'logic'`
- `relations`: Array of handled relations
- `evaluate(relation, subject, object)`: Compute result for given relation
- `canCompute(relation, subject, object)`: Check if computation is possible
- `evaluateExpression(expression, bindings)`: Evaluate compound logical expressions

## Truth Value System

The plugin uses a multi-valued logic system extending Kleene 3-valued logic to a continuous range:

| Value | Name | Meaning |
|-------|------|---------|
| 127 | TRUE_CERTAIN | Absolutely true (certain) |
| 64 | TRUE_LIKELY | Likely true |
| 0 | UNKNOWN | Indeterminate |
| -64 | FALSE_LIKELY | Likely false |
| -127 | FALSE | Absolutely false |

## Supported Relations

| Relation | Description | Example |
|----------|-------------|---------|
| `AND_WITH` | Logical AND: min(a, b) | `127 AND_WITH 64` → 64 |
| `OR_WITH` | Logical OR: max(a, b) | `-64 OR_WITH 64` → 64 |
| `XOR_WITH` | Exclusive OR | `127 XOR_WITH -127` → 127 |
| `NOT_OF` | Logical negation: -a | `NOT_OF 127` → -127 |
| `IMPLIES` | Material implication: max(-a, b) | `-127 IMPLIES 64` → 127 |
| `IFF` | Biconditional: equivalence | `64 IFF 64` → 127 |
| `NAND_WITH` | NOT AND | `127 NAND_WITH 64` → -64 |
| `NOR_WITH` | NOT OR | `127 NOR_WITH -127` → -127 |
| `LOGICALLY_EQUIVALENT` | Check equivalence | `64 LOGICALLY_EQUIVALENT 64` → TRUE |
| `CONTRADICTS` | Check contradiction | `127 CONTRADICTS -127` → TRUE |
| `IS_SATISFIABLE` | Not always false | `IS_SATISFIABLE 0` → TRUE |
| `IS_TAUTOLOGY` | Always true | `IS_TAUTOLOGY 127` → TRUE |

## Logical Operations

### Conjunction (AND)
Pessimistic logic - takes the weakest value:
```
AND(a, b) = min(a, b)
AND(127, 64) = 64
AND(127, -64) = -64
AND(0, 127) = 0
```

### Disjunction (OR)
Optimistic logic - takes the strongest value:
```
OR(a, b) = max(a, b)
OR(-64, 64) = 64
OR(-127, -64) = -64
```

### Negation (NOT)
Simple sign flip:
```
NOT(a) = -a
NOT(127) = -127
NOT(-64) = 64
NOT(0) = 0
```

### Material Implication (IMPLIES)
P → Q ≡ ¬P ∨ Q:
```
IMPLIES(a, b) = max(-a, b)
IMPLIES(127, 64) = max(-127, 64) = 64
IMPLIES(-127, 64) = max(127, 64) = 127  // FALSE implies anything = TRUE
IMPLIES(127, -127) = max(-127, -127) = -127  // TRUE implies FALSE = FALSE
```

### Biconditional (IFF)
True when values are similar:
```
IFF(a, b) = 127 - |a - b|
IFF(127, 127) = 127 - 0 = 127
IFF(127, -127) = 127 - 254 = -127 (clamped)
IFF(64, 64) = 127 - 0 = 127
```

## Pseudocode

```js
class LogicPlugin {
  constructor() {
    this.name = 'logic';
    this.relations = [
      'AND_WITH', 'OR_WITH', 'XOR_WITH', 'NOT_OF', 'IMPLIES', 'IFF',
      'NAND_WITH', 'NOR_WITH', 'LOGICALLY_EQUIVALENT', 'CONTRADICTS',
      'IS_SATISFIABLE', 'IS_TAUTOLOGY'
    ];
    this.TRUTH = {
      TRUE_CERTAIN: 127, TRUE_LIKELY: 64, UNKNOWN: 0,
      FALSE_LIKELY: -64, FALSE: -127
    };
  }

  evaluate(relation, subject, object) {
    const a = this._extractTruth(subject);
    const b = this._extractTruth(object);

    switch (relation) {
      case 'AND_WITH': return this._evaluateAnd(a, b);
      case 'OR_WITH':  return this._evaluateOr(a, b);
      case 'NOT_OF':   return this._evaluateNot(a);
      case 'IMPLIES':  return this._evaluateImplies(a, b);
      // ... other cases
    }
  }

  _extractTruth(input) {
    // Handle: numbers, booleans, strings ('TRUE', 'FALSE', etc.)
    // Objects: { truth: ..., value: ..., existence: ... }
    // Returns: number in [-127, 127] range
  }

  evaluateExpression(expression, bindings = {}) {
    // Evaluate compound expressions in prefix notation:
    // ['AND', ['OR', 'P', 'Q'], 'R'] with { P: 127, Q: -64, R: 64 }
    // Returns evaluated truth value
  }
}
```

## Compound Expression Evaluation

The plugin supports evaluating compound logical expressions:

```js
// Expression: (P OR Q) AND R
const expr = ['AND', ['OR', 'P', 'Q'], 'R'];
const bindings = { P: 127, Q: -64, R: 64 };

logic.evaluateExpression(expr, bindings);
// Step 1: OR(127, -64) = 127
// Step 2: AND(127, 64) = 64
// Result: { value: 64, truth: 'TRUE_CERTAIN' }
```

## Truth Value Extraction

The `_extractTruth` method handles multiple input formats:

| Input Type | Example | Extracted Value |
|------------|---------|-----------------|
| Number | `127`, `-64` | 127, -64 |
| Boolean | `true`, `false` | 127, -127 |
| String | `'TRUE'`, `'FALSE'` | 127, -127 |
| String | `'TRUE_LIKELY'`, `'UNKNOWN'` | 64, 0 |
| Object | `{ truth: 'TRUE' }` | 127 |
| Object | `{ value: 64 }` | 64 |
| Object | `{ existence: 127 }` | 127 |

## Notes/Constraints
- All computations are stateless and deterministic.
- Values are clamped to [-127, 127] range.
- Unknown inputs default to 0 (UNKNOWN).
- Multi-valued logic enables reasoning under uncertainty.
- The truth value system aligns with the EXISTENCE dimension (FS v3.0).
