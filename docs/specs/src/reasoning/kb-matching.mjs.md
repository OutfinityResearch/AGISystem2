# kb-matching.mjs - KB Matching Module

## Purpose

Provides direct KB fact matching and pattern search capabilities. Handles rule chaining for conditions and finding all possible matches for backtracking.

## Key Classes

### KBMatcher

Main class for KB pattern matching operations.

```javascript
class KBMatcher {
  constructor(proofEngine)  // Creates matcher with engine reference

  // Direct matching
  tryDirectMatch(goalVec, goalStr)       // Vector similarity match
  findMatchingFact(factStr)              // Exact string match

  // Pattern matching (backtracking support)
  findAllFactMatches(condStr, bindings)  // All matches for pattern

  // Rule chaining
  tryRuleChainForCondition(condStr, depth)  // Backward chaining
  tryRuleMatch(goal, rule, depth)           // Single rule match
}
```

## Strategy-Dependent Thresholds

The module uses centralized thresholds from `src/core/constants.mjs`:

| Threshold | Dense-Binary | Sparse-Polynomial | Description |
|-----------|--------------|-------------------|-------------|
| `SIMILARITY` | 0.5 | 0.05 | Minimum similarity for direct match |
| `DIRECT_MATCH` | 0.95 | 0.95 | Confidence for exact matches |
| `CONDITION_CONFIDENCE` | 0.9 | 0.9 | Confidence for pattern matches |
| `RULE_CONFIDENCE` | 0.85 | 0.85 | Confidence for rule-derived matches |
| `CONCLUSION_MATCH` | 0.7 | 0.05 | Threshold for rule conclusion matching |
| `CONFIDENCE_DECAY` | 0.95 | 0.95 | Decay for chained results |

## Key Methods

### tryDirectMatch

Uses HDC similarity to find matching facts in KB:

```javascript
tryDirectMatch(goalVec, goalStr) {
  let bestSim = 0;
  for (const fact of session.kbFacts) {
    const sim = similarity(goalVec, fact.vector);
    if (sim > bestSim) bestSim = sim;
  }
  if (bestSim > thresholds.SIMILARITY) {
    return { valid: true, method: 'direct', confidence: bestSim };
  }
  return { valid: false };
}
```

### findMatchingFact

Exact metadata match (faster than similarity):

```javascript
findMatchingFact(factStr) {
  const [op, ...args] = factStr.split(/\s+/);
  for (const fact of session.kbFacts) {
    if (fact.metadata?.operator === op &&
        arraysEqual(fact.metadata.args, args)) {
      return { found: true, confidence: thresholds.DIRECT_MATCH };
    }
  }
  return { found: false };
}
```

### findAllFactMatches

Returns ALL matching facts for backtracking:

```javascript
findAllFactMatches(condStr, bindings) {
  const matches = [];

  // 1. Direct KB matches
  for (const fact of kbFacts) {
    if (matchesPattern(fact, condStr, bindings)) {
      matches.push({ newBindings, steps, confidence });
    }
  }

  // 2. Transitive matches (for isA, locatedIn, etc.)
  if (isTransitiveRelation(op) && hasHoles(args)) {
    const targets = transitive.findAllTransitiveTargets(op, subject);
    for (const target of targets) {
      matches.push({ newBindings: {varName: target.value}, steps: target.steps });
    }
  }

  // 3. Rule chaining (for fully instantiated conditions)
  if (matches.length === 0 && !hasHoles(condStr)) {
    const ruleResult = tryRuleChainForCondition(condStr, depth);
    if (ruleResult.valid) matches.push(ruleResult);
  }

  return matches;
}
```

## Pattern Matching

Supports patterns with variable holes (`?varName`):

```
"isA ?x Animal"  → matches all (x, Animal) pairs
"locatedIn ?city France" → matches all cities in France
"has Alice ?prop" → matches all properties of Alice
```

## Integration with Transitive Reasoning

For transitive relations, automatically extends matches:

```
KB: isA Poodle Dog, isA Dog Mammal, isA Mammal Animal
Query: isA Poodle ?type

Returns:
  - {type: Dog, steps: [direct]}
  - {type: Mammal, steps: [transitive: Poodle→Dog, Dog→Mammal]}
  - {type: Animal, steps: [transitive: Poodle→Dog, Dog→Mammal, Mammal→Animal]}
```

## Rule Chaining

Backward chaining through rules:

```javascript
tryRuleChainForCondition(condStr, depth) {
  for (const rule of rules) {
    // Unify goal with rule conclusion
    const bindings = unify(condStr, rule.conclusion);
    if (!bindings) continue;

    // Prove rule condition with bindings
    const condResult = conditions.proveInstantiatedCondition(rule, bindings, depth);
    if (condResult.valid) {
      return { valid: true, method: 'rule_chain', confidence: ... };
    }
  }
  return { valid: false };
}
```

## Error Handling

- Returns `{ valid: false }` or `{ found: false }` for no matches
- Statistics tracked via `session.reasoningStats.kbScans`
- Rule attempts tracked via `session.reasoningStats.ruleAttempts`
