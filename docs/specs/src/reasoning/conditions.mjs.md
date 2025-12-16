# conditions.mjs - Compound Conditions Module

## Purpose

Handles complex condition evaluation including And/Or/Not compound conditions with backtracking support for variable binding.

## Key Classes

### ConditionProver

Main class for proving compound conditions during backward chaining.

```javascript
class ConditionProver {
  constructor(proofEngine)  // Creates prover with engine reference

  // Main proving methods
  proveCondition(rule, depth)                       // Prove rule condition (And/Or)
  proveInstantiatedCondition(rule, bindings, depth) // Prove with variable bindings

  // Compound condition handlers
  proveInstantiatedAnd(parts, bindings, depth)      // All parts must be true
  proveInstantiatedOr(parts, bindings, depth)       // At least one part true
  proveInstantiatedNot(inner, bindings, depth)      // Negation as failure

  // Single condition proving
  proveSingleCondition(condStr, bindings, depth)    // Prove single fact
  proveWithUnboundVars(condStr, bindings, depth)    // Pattern match with holes
}
```

## Strategy-Dependent Thresholds

The module uses centralized thresholds from `src/core/constants.mjs`:

| Threshold | Dense-Binary | Sparse-Polynomial | Description |
|-----------|--------------|-------------------|-------------|
| `CONCLUSION_MATCH` | 0.7 | 0.05 | Similarity threshold for rule conclusions |
| `CONDITION_CONFIDENCE` | 0.9 | 0.9 | Confidence for matched conditions |
| `CONFIDENCE_DECAY` | 0.95 | 0.95 | Decay factor for derived results |

## Key Algorithms

### And Condition with Backtracking

```
proveAndWithBacktracking(parts, index, bindings, steps, depth):
  if index >= parts.length:
    return valid with accumulated steps

  matches = findAllMatches(parts[index], bindings, depth)
  for each match in matches:
    newBindings = merge(bindings, match.newBindings)
    result = proveAndWithBacktracking(parts, index+1, newBindings, steps + match.steps, depth)
    if result.valid:
      return result

  return invalid (backtracking exhausted)
```

### Negation as Failure (Closed-World Assumption)

```
proveInstantiatedNot(inner, bindings, depth):
  innerResult = prove(inner, bindings, depth)
  if innerResult.valid:
    return invalid  // Inner is provable, so Not fails
  else:
    return valid    // Inner cannot be proved, so Not succeeds
```

## Integration Points

- **ProofEngine**: Parent orchestrator that creates the ConditionProver
- **KBMatcher**: Used for finding fact matches in KB
- **TransitiveReasoner**: Used for transitive chain proofs
- **UnificationEngine**: Used for instantiating AST with bindings

## Example Usage

```javascript
// Within ProofEngine backward chaining:
const result = conditions.proveInstantiatedCondition(rule, bindings, depth);
if (result.valid) {
  // Rule condition satisfied, apply conclusion
}
```

## Confidence Propagation

Confidence is propagated through compound conditions:

- **And**: Minimum confidence of all parts, with decay factor
- **Or**: Confidence of first successful branch, with decay factor
- **Not**: Fixed confidence when inner fails (CONDITION_CONFIDENCE)
- **Chain**: Each chaining step applies CONFIDENCE_DECAY

## Error Handling

- Returns `{ valid: false, reason: '...' }` for proof failures
- Depth limit prevents infinite recursion
- Cycle detection via visited set in ProofEngine
