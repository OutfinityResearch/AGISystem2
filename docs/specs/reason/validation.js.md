# Design Spec: src/reason/validation.js

ID: DS(/reason/validation.js)

Class `ValidationEngine`
- **Role**: Run symbolic/abstract interpretation over theory stacks, masks, and conceptual space to prove/deny inclusion, reachability, and consistency without mutating state; provide counterexamples for rule/program correctness.
- **Pattern**: Analyzer. SOLID: single responsibility for validation runs.
- **Key Collaborators**: `TheoryStack`, `ConceptStore`, `BoundedDiamond`, `MathEngine`, `BiasController`, `Config`, `AuditLog`.

## Public API
- `constructor(deps)`
- `checkConsistency(conceptId, stack)`: detect empty intersections/contradictions across layers.
- `proveInclusion(point, conceptId, stack)`: symbolic membership with masks; returns proof steps.
- `abstractQuery(querySpec)`: run abstract scenario (e.g., counterfactual layer) and report outcomes without persisting.
- `findCounterexample(ruleSpec)`: search for points violating given constraints within bounds.

## Pseudocode (comments)
```js
class ValidationEngine {
  constructor({stack, store, math, bias, config, audit}) { /* deps */ }

  checkConsistency(conceptId, stack) {
    // compose concept; verify min<=max per dim; check non-empty radius; report conflicts
  }

  proveInclusion(point, conceptId, stack) {
    // evaluate contains with mask/bias; record distances and active layers
  }

  abstractQuery(spec) {
    // clone stack; apply temporary layers/masks; run reasoning without touching store; return result + provenance
  }

  findCounterexample(ruleSpec) {
    // explore boundary points (min/max) or randomized but seeded search within bounds; stop at first violation; deterministic seeds
  }
}
```

## Notes/Constraints
- Runs must be side-effect free; always log config/stack used.
- Deterministic search (seeded) to keep reproducibility.
- Keep scope bounded to avoid heavy SAT/SMT; start with boundary checks (YAGNI).***
