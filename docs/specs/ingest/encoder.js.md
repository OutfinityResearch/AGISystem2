# Design Spec: src/ingest/encoder.js

ID: DS(/ingest/encoder.js)

Class `Encoder`
- **Role**: Convert parsed assertion/question nodes into vectors via permutation binding and saturated addition; enforce recursion limits; update concept prototypes through `ConceptStore`. In particular, it provides a stable treatment for property-value pairs (using DIM_PAIR pattern) so that they map into the appropriate ontology dimensions (for example, Temperature).
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

### Property and Value Handling (v3 Syntax)

- In Sys2DSL v3, properties and values are represented as separate concepts using the DIM_PAIR pattern:
  ```sys2dsl
  @p property DIM_PAIR value
  @_ subject SET_DIM $p
  ```

- For physical properties with numeric values, the encoder must:
  - encode the property concept (e.g., `boiling_point`) into a specific dimension
  - encode the value concept (e.g., `Celsius100`) as a coordinate along that dimension
  - project this information into the relevant ontology dimensions:
    - `boiling_point` → Temperature axis in the ontology block (see `DS[/knowledge/dimensions]`, dimension 4)
    - other properties may be mapped to specific axes as the catalog grows
  - use a deterministic mapping from numeric values to bounded coordinates on those axes (via a clamped, affine transform from domain units to the [-127, 127] internal range)

- Example of how a physical property is encoded:
  ```sys2dsl
  @p boiling_point DIM_PAIR Celsius100
  @_ Water SET_DIM $p
  ```
  This reinforces the `Water` concept along the Temperature axis around the encoded value for "100 degrees".

- Where no property mapping is configured for a given property:
  - the encoder treats the property-value pair as separate concept tokens
  - no special geometric projection is required until the dimensions catalog and tests are extended for that property

- Property handling must remain deterministic and CPU-only to respect NFS constraints; any future enrichment (e.g., unit conversion) must be specified explicitly here before implementation.***
