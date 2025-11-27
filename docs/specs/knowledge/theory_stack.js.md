# Design Spec: src/knowledge/theory_stack.js

ID: DS(/knowledge/theory_stack.js)

Class `TheoryStack`
- **Role**: Manage ordered layers (base → overrides) for meta-rational context selection; synthesize runtime concepts by applying relevant layers; detect conflicts.
- **Pattern**: Orchestrator with deterministic ordering; SOLID: single responsibility for stack composition.
- **Key Collaborators**: `TheoryLayer`, `Reasoner`, `ValidationEngine`, `Config`, `AuditLog`.

## Visual: TheoryStack Concept

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TheoryStack Structure                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   TheoryStack = "Ordered list of TheoryLayers, applied bottom-to-top"       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │  TOP OF STACK (highest priority, applied last)                      │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │  Layer 3: Session_Counterfactual (priority: 30)              │   │   │
│   │  │  "What if water boiled at 50°C?"                             │   │   │
│   │  │  overrides: dim[4] = [45, 55]                                │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   │                           ↑ push()                                  │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │  Layer 2: Ethics_Layer (priority: 20)                        │   │   │
│   │  │  Moral constraints                                           │   │   │
│   │  │  overrides: dims[256..270] (axiology)                        │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   │                           ↑ push()                                  │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │  Layer 1: Physics_Base (priority: 10)                        │   │   │
│   │  │  Physical world rules                                        │   │   │
│   │  │  overrides: dims[0..100] (ontology)                          │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   │  BOTTOM OF STACK (lowest priority, applied first)                   │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   COMPOSE() OPERATION:                                                      │
│   ════════════════════                                                      │
│                                                                             │
│   Input: Base Diamond (from ConceptStore)                                   │
│   ┌──────────────────┐                                                      │
│   │ BoundedDiamond   │                                                      │
│   │ "water" concept  │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼ Layer 1.applyTo()                                              │
│   ┌──────────────────┐                                                      │
│   │ water + physics  │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼ Layer 2.applyTo()                                              │
│   ┌──────────────────┐                                                      │
│   │ water + physics  │                                                      │
│   │ + ethics         │                                                      │
│   └────────┬─────────┘                                                      │
│            │                                                                │
│            ▼ Layer 3.applyTo()                                              │
│   ┌──────────────────┐                                                      │
│   │ COMPOSED DIAMOND │  ← Used for reasoning (runtime view)                 │
│   │ water + physics  │                                                      │
│   │ + ethics         │                                                      │
│   │ + "boils at 50"  │                                                      │
│   └──────────────────┘                                                      │
│                                                                             │
│   CONFLICT DETECTION:                                                       │
│   ═══════════════════                                                       │
│                                                                             │
│   ┌───────────────┐    ┌───────────────┐                                    │
│   │ Layer A       │    │ Layer B       │                                    │
│   │ dim[256]:     │    │ dim[256]:     │                                    │
│   │ [-127, -50]   │    │ [10, 100]     │   ← CONFLICT!                      │
│   │ (forbidden)   │    │ (permitted)   │                                    │
│   └───────────────┘    └───────────────┘                                    │
│                                                                             │
│   conflicts() returns: {hasConflicts: true, dims: [256], layers: [A, B]}    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
