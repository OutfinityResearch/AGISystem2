# Design Spec: src/core/bounded_diamond.js

ID: DS(/core/bounded_diamond.js)

Class `BoundedDiamond`
- **Role**: Geometric container for a concept cluster in the conceptual space: hyper-rectangle (min/max), L1 ball (center + radius), relevance mask. Concepts may be unions of diamonds managed by higher layers.
- **Pattern**: Data class with methods for membership/merge/split; no external IO. SOLID: single responsibility for geometry of one cluster.
- **Key Collaborators**: `VectorSpace` (buffer alloc), `MathEngine` (distance/membership), `ClusterManager`, `Reasoner`.

## State
- `uuid`, `label` (ids).
- `min`, `max`: Int8Array length = dimensions.
- `center`: Int8Array; can be derived but stored for speed.
- `l1Radius`: number (uint16).
- `relevanceMask`: Uint8Array ceil(dim/8).
- Optional `lshFingerprint`: BigInt or numeric for fast retrieval.

## Public API
- `constructor(vspace, {uuid, label})`: allocate buffers sized from `vspace`.
- `resetBounds()`: zero/neutral init for incremental building.
- `updateFromExamples(vectors)`: compute min/max/center/radius (inductive envelope).
- `contains(point, maskOverride?)`: boolean or graded membership using relevance mask; supports optional stricter/looser radius factors.
- `merge(other)`: expand bounds to include another diamond (same concept).
- `distance(point)`: L1 distance with masking via `MathEngine`.

## Pseudocode (comments)
```js
class BoundedDiamond {
  constructor(vspace, {uuid, label}) {
    // this.min = vspace.allocVector(); this.max = vspace.allocVector();
    // this.center = vspace.allocVector(); this.relevanceMask = vspace.allocMask();
    // this.l1Radius = 0;
  }

  updateFromExamples(vectors) {
    // for each dim: min = min(...); max = max(...); center = (min+max)/2; radius = max L1 distance center->example
  }

  contains(point, {radiusScale=1.0, mask=relevanceMask} = {}) {
    // fast box check with mask, then L1 <= l1Radius*radiusScale
  }

  merge(other) { /* widen min/max, recompute center/radius */ }

  distance(point) { /* delegate to MathEngine.distanceMaskedL1 */ }
}
```

## Notes/Constraints
- Must respect configured dimensions and masks; no hard-coded 4096.
- Keep center stored to avoid recompute; clamping handled upstream.
- Avoid coupling to storage/logging; concept unions handled by `ConceptStore`.***
