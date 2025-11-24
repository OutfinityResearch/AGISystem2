# Design Spec: src/ingest/clustering.js

Class `ClusterManager`
- **Role**: Manage polysemy by splitting/merging `BoundedDiamond` clusters for a concept based on new observations; detect divergence thresholds.
- **Pattern**: Strategy component. SOLID: single responsibility for clustering decisions.
- **Key Collaborators**: `BoundedDiamond`, `ConceptStore`, `Config`, `MathEngine`, `ValidationEngine` (for post-checks).

## Public API
- `constructor({config, math, vspace})`
- `updateClusters(concept, newVector)`: returns updated list of diamonds; may split or merge; provides rationale.
- `shouldSplit(diamond, vector)`: heuristic/distance check; configurable thresholds.
- `mergeCandidates(concept)`: optional consolidation.

## Pseudocode (comments)
```js
class ClusterManager {
  constructor({config, math, vspace}) {
    // thresholds from config (e.g., maxRadius, splitDistance)
  }

  updateClusters(concept, vec) {
    // find nearest diamond via distance
    // if distance within tolerance -> widen diamond (merge) and recompute center/radius
    // else -> create new diamond for new sense; return union
    // emit rationale (distance, masks) for audit
  }

  shouldSplit(diamond, vec) {
    // check distance vs radius * factor; check ontological divergence via masks
  }

  mergeCandidates(concept) {
    // optional: merge overlapping diamonds if distance small
  }
}
```

## Notes/Constraints
- Thresholds configurable; must be logged to explain split/merge decisions.
- Avoid over-fragmentation; balance YAGNI by starting with simple heuristics.***
