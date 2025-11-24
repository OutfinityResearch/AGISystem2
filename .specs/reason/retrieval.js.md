# Design Spec: src/reason/retrieval.js

Class `Retriever`
- **Role**: Provide nearest-neighbor lookup over stored vectors/diamonds using configurable strategies (default L1 p-stable LSH; alternatives: SimHash, grid hashing); support blind decoding via relation hints and inverse permutations.
- **Pattern**: Service wrapping index structure. SOLID: single responsibility for retrieval.
- **Key Collaborators**: `ConceptStore` (source vectors/fingerprints), `RelationPermuter`, `MathEngine`, `Config`, `AuditLog`.

## Public API
- `constructor({config, math, permuter, store})`
- `setStrategy(strategyConfig)`: switch between `lsh_pstable`, `simhash`, `grid` using config seeds/params.
- `indexConcept(concept)`: register/update fingerprints for diamonds.
- `nearest(vector, options)`: returns candidate concept/cluster with distance; options include mask, relation hint filtering.
- `probe(vector, relationHints)`: apply inverse permutations to test likely relations and search.
- `refreshAll()`: rebuild index (for bulk changes).

## Pseudocode (comments)
```js
class Retriever {
  constructor(deps) { /* init LSH params from config */ }

  setStrategy(strategyConfig) {
    // configure hash functions/buckets based on strategy enum and seeds
  }

  indexConcept(concept) {
    // for each diamond: compute fingerprint; store in buckets
  }

  nearest(vec, {mask, k=1} = {}) {
    // lookup buckets; refine with distanceMaskedL1; return top k
  }

  probe(vec, hints) {
    // for each hint relation: inv = permuter.inverse(hint); candidate = math.inversePermute(vec, inv); search nearest(candidate)
  }

  refreshAll() {
    // rebuild index from ConceptStore
  }
}
```

## Notes/Constraints
- Strategy configurable via `Config`; default `lsh_pstable` for L1, alternatives `simhash` or `grid` for experiments/tests.
- Determinism required (seeded hashing); log index strategy/version for reproducibility.
- Keep blind decoding minimal; avoid heavy NLP (YAGNI).***
