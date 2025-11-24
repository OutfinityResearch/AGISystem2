# Design Spec: src/ingest/encoder.js

Class `Encoder`
- **Role**: Convert parsed AST nodes into vectors via permutation binding and saturated addition; enforce recursion limits; update concept prototypes through `ConceptStore`.
- **Pattern**: Stateless per-call except for references to stores; SOLID: single responsibility for encoding.
- **Key Collaborators**: `VectorSpace`, `MathEngine`, `RelationPermuter`, `ConceptStore`, `Config`, `ClusterManager`.

## Public API
- `constructor({config, vspace, math, permuter, store, cluster})`
- `encodeNode(node, depth=0)`: returns Int8Array representing subtree; respects recursion horizon.
- `ingestFact(node, conceptId)`: encodes node and forwards to `ConceptStore.addObservation`.

## Pseudocode (comments)
```js
class Encoder {
  constructor(deps) {
    // keep references; horizon = config.get('recursionHorizon');
  }

  encodeNode(node, depth=0) {
    // if depth > horizon -> return zero vector
    // base: fetch vector for token from store or translator bridge (future)
    // for each child: childVec = encodeNode(child, depth+1); permuted = math.permute(childVec, permuter.get(child.relation)); math.addSaturated(acc, permuted);
    // return acc vector
  }

  ingestFact(node, conceptId) {
    // vec = encodeNode(node)
    // store.addObservation(conceptId, vec)
    // return vec (for confirmation/audit)
  }
}
```

## Notes/Constraints
- Must clamp via `MathEngine`; avoid JS arrays.
- Deterministic binding based on registered relations; missing relations should trigger permuter registration (with audit).
- No direct clustering logic; delegate to `ClusterManager` through store.***
