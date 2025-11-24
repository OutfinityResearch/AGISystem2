# Design Spec: src/knowledge/theory_stack.js

Class `TheoryStack`
- **Role**: Manage ordered layers (base → overrides) for meta-rational context selection; synthesize runtime concepts by applying relevant layers; detect conflicts.
- **Pattern**: Orchestrator with deterministic ordering; SOLID: single responsibility for stack composition.
- **Key Collaborators**: `TheoryLayer`, `Reasoner`, `ValidationEngine`, `Config`, `AuditLog`.

## Public API
- `constructor({config, audit})`
- `push(layer)`: add layer to top; log.
- `pop()`: remove top layer; log.
- `setActive(layers)`: replace stack with ordered set (for saved contexts).
- `compose(baseDiamond)`: apply layers top-down to produce runtime diamond; return synthesized instance.
- `compareStacks(stackA, stackB, baseDiamond)`: meta-rational comparison helper for conflicts/what-if.
- `conflicts(baseDiamond)`: detect empty intersections or incompatible overrides; return report.
- `snapshot()`: view of active stack for provenance.

## Pseudocode (comments)
```js
class TheoryStack {
  constructor({config, audit}) { /* init stack=[] */ }

  push(layer) { /* validate dims; stack.push(layer); audit */ }
  pop() { /* remove last; audit */ }
  setActive(layers) { /* replace; audit */ }

  compose(baseDiamond) {
    // clone base; for layer in stack: base = layer.applyTo(base);
    // return composed diamond
  }

  compareStacks(stackA, stackB, baseDiamond) {
    // compose with each; run validation overlap; return deltas
  }

  conflicts(baseDiamond) {
    // detect override contradictions (min>max) or empty intersection across layers
  }

  snapshot() { /* return list of layer ids/metadata */ }
}
```

## Notes/Constraints
- Ordering deterministic; priority resolution documented.
- Do not mutate input diamonds; return synthesized copies.
- Ensure dimension compatibility across all layers.***
