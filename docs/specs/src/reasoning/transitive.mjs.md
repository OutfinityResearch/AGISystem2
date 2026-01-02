# transitive.mjs - Transitive Reasoning Module

## Purpose

Handles transitive chain proofs for relations like `isA`, `locatedIn`, `partOf`. Supports deep reasoning chains (up to 50 steps) with configurable decay factors.

## Key Classes

### TransitiveReasoner

Main class for transitive chain reasoning.

```javascript
class TransitiveReasoner {
  constructor(proofEngine)  // Creates reasoner with engine reference

  // Chain proving
  tryTransitiveChain(goal, depth)                  // Main entry point
  proveTransitiveStep(operatorName, from, to, depth)  // Single step

  // Target discovery
  findIntermediates(operatorName, subjectName)     // Direct targets
  findAllTransitiveTargets(operatorName, subject)  // All reachable targets

  // Condition support
  tryTransitiveForCondition(condStr)               // For condition proving
}
```

## Strategy-Dependent Thresholds

The module uses centralized thresholds from `src/core/constants.mjs`:

| Threshold | Dense-Binary | Sparse-Polynomial | Description |
|-----------|--------------|-------------------|-------------|
| `TRANSITIVE_BASE` | 0.9 | 0.9 | Confidence for direct transitive match |
| `TRANSITIVE_DECAY` | 0.98 | 0.98 | Decay factor per chain step |
| `RULE_CONFIDENCE` | 0.85 | 0.85 | Confidence for found targets |

## Transitive Relations

Loaded from `config/Packs/Kernel/00-relations.sys2`:

```
isA, locatedIn, partOf, subclassOf, containedIn,
before, after, causes, appealsTo, leadsTo, enables
```

## Key Algorithms

### Chain Proving

```
tryTransitiveChain(goal, depth):
  operatorName = extractOperator(goal)
  if not isTransitive(operatorName): return invalid

  subject, object = extractArgs(goal)
  intermediates = findIntermediates(operatorName, subject)

  for intermediate in intermediates:
    if intermediate == object:
      return valid (direct match, confidence: TRANSITIVE_BASE)

    chainResult = proveTransitiveStep(operatorName, intermediate, object, depth+1)
    if chainResult.valid:
      return valid (chain, confidence: chainResult.confidence * TRANSITIVE_DECAY)

  return invalid
```

### Target Discovery

```
findAllTransitiveTargets(operatorName, subject, visited={}):
  if subject in visited: return []
  visited.add(subject)

  targets = []
  directTargets = findIntermediates(operatorName, subject)

  for target in directTargets:
    targets.add({value: target, steps: [direct_step]})

    furtherTargets = findAllTransitiveTargets(operatorName, target, visited)
    for further in furtherTargets:
      targets.add({value: further.value, steps: [direct_step, ...further.steps]})

  return targets
```

## Example Usage

```javascript
// Given KB:
// isA Poodle Dog
// isA Dog Mammal
// isA Mammal Animal

// Proving: isA Poodle Animal
const result = transitive.tryTransitiveChain({
  operator: { name: 'isA' },
  args: [{ name: 'Poodle' }, { name: 'Animal' }]
}, 0);

// Result:
// {
//   valid: true,
//   method: 'transitive_chain',
//   confidence: 0.86 (0.9 * 0.98 * 0.98),
//   steps: [
//     { operation: 'transitive_step', fact: 'isA Poodle Dog' },
//     { operation: 'transitive_step', fact: 'isA Dog Mammal' },
//     { operation: 'transitive_found', fact: 'isA Mammal Animal' }
//   ]
// }
```

## Confidence Calculation

Confidence decreases with chain length:

| Chain Length | Formula | Dense-Binary |
|--------------|---------|--------------|
| 1 step | BASE | 0.90 |
| 2 steps | BASE × DECAY | 0.88 |
| 3 steps | BASE × DECAY² | 0.86 |
| 5 steps | BASE × DECAY⁴ | 0.83 |
| 10 steps | BASE × DECAY⁹ | 0.75 |

## Integration Points

- **ProofEngine**: Parent orchestrator that calls transitive reasoning
- **KBMatcher**: Uses findAllTransitiveTargets for pattern matching
- **ConditionProver**: Uses tryTransitiveForCondition for condition proofs

## Cycle Detection

Prevents infinite loops via:
- `visited` set tracking explored (operator:from:to) tuples
- Depth limit from ProofEngine options
- Step limit from MAX_REASONING_STEPS

## Error Handling

- Returns `{ valid: false }` for non-transitive relations
- Throws on timeout (caught by ProofEngine)
- Statistics tracked via `session.reasoningStats.transitiveSteps`
