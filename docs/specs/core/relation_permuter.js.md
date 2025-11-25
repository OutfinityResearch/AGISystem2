# Design Spec: src/core/relation_permuter.js

ID: DS(/core/relation_permuter.js)

Class `RelationPermuter`
- **Role**: Deterministically generate and apply permutations for relation roles (subject, object, cause, time tick, location, etc.) in the conceptual space. Provides forward/inverse mappings.
- **Pattern**: Stateless-ish registry with seeded generation; SOLID: single responsibility for permutations.
- **Key Collaborators**: `Config` (seed, dimensions), `MathEngine` (permute), `Encoder` (binding), `Reasoner`/`Retriever` (inverse binding), `TemporalMemory` (tick rotation).

## Public API
- `constructor(config)`: derive dimensions, seed(s).
- `register(name, seedOverride?)`: create/store permutation for relation role; ensure orthogonality/low collision; idempotent given same seeds.
- `get(name)`: retrieve permutation table.
- `inverse(name)`: retrieve inverse permutation.
- `list()`: expose registered names for audit/testing.
- `bootstrapDefaults(relationsSpec)`: register default relation set (from `.specs/knowledge/default_relations.md`) with correct symmetric/inverse reuse.

## Pseudocode (comments)
```js
class RelationPermuter {
  constructor(config) {
    // this.dim = config.get('dimensions');
    // this.baseSeed = config.get('relationSeed');
    // this.tables = new Map();
  }

  register(name, seedOverride) {
    // if exists -> return
    // generate permutation array [0..dim-1] using seeded RNG
    // compute inverse array
    // store {perm, inverse}
  }

  bootstrapDefaults(relationsSpec) {
    // iterate spec entries; for symmetric use same perm; for inverse use distinct perm paired by name
  }

  get(name) { /* return tables.get(name).perm */ }
  inverse(name) { /* return tables.get(name).inverse */ }
  list() { /* return [...tables.keys()] */ }
}
```

## Notes/Constraints
- Deterministic given seeds; must be reproducible across runs/nodes.
- Avoid expensive generation at runtime; precompute on load.
- Relation set kept minimal (YAGNI); add new roles only when needed and record in config/audit.***
