# Design Spec: src/ingest/encoder.js

ID: DS(/ingest/encoder.js)

Class `Encoder`
- **Role**: Convert parsed assertion/question nodes into vectors via permutation binding and saturated addition; enforce recursion limits; update concept prototypes through `ConceptStore`. In particular, it provides a stable treatment for property-like object tokens such as `boiling_point=100` so that they map into the appropriate ontology dimensions (for example, Temperature).
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
    // base: fetch vector for tokens from store or translator bridge (future)
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
- No direct clustering logic; delegate to `ClusterManager` through store.

### Property-like Tokens (`key=value`)

- For object tokens of the form `key=value` that appear under `HAS_PROPERTY` (or a symmetric property relation), the encoder must:
  - treat the whole token as a single concept label for backwards compatibility;
  - additionally, when `key` matches a known physical property (for example, `boiling_point`) and `value` can be parsed as a number, project that information into the relevant ontology dimensions:
    - `boiling_point` → Temperature axis in the ontology block (see `DS[/knowledge/dimensions]`, dimension 4);
    - other keys may be mapped to specific axes as the catalog grows.
  - use a deterministic mapping from numeric values to bounded coordinates on those axes (for example, via a clamped, affine transform from domain units to the [-127, 127] internal range).
- The intent is that a fact such as `Water HAS_PROPERTY boiling_point=100`:
  - reinforces the `Water` concept along the Temperature axis around the encoded value for “100 degrees”;
  - remains compatible with existing tests and fixtures that treat `boiling_point=100` as an object token.
- Where no property mapping is configured for a given `key`:
  - the encoder falls back to treating `key=value` as an opaque object token;
  - no special geometric projection is required until the dimensions catalog and tests are extended for that property.
- Property handling must remain deterministic and CPU-only to respect NFS constraints; any future enrichment (e.g., unit conversion) must be specified explicitly here before implementation.***
