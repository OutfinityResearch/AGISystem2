# Design Spec: src/knowledge/concept_store.js

Class `ConceptStore`
- **Role**: Persist and manage concepts/facts as unions of `BoundedDiamond` clusters; handle polysemy via clustering; provide retrieval hooks to `Retriever` and updates from `Encoder`.
- **Pattern**: Repository. SOLID: single responsibility for concept storage and cluster lifecycle.
- **Key Collaborators**: `BoundedDiamond`, `ClusterManager`, `AuditLog`, `Retriever` (LSH index integration), `Config` (dimensions, persistence strategy), `StorageAdapter`, `ValidationEngine`.

## Public API
- `constructor({config, vspace, storage, audit})`: inject dependencies (storage strategy from config).
- `getConcept(id)`: fetch concept metadata and clusters.
- `upsertConcept(id, label, diamonds)`: create/update concept union.
- `addObservation(conceptId, vector)`: delegate to `ClusterManager` for merge/split, update diamonds, refresh LSH fingerprints.
- `listConcepts()`: enumerate ids/labels.
- `snapshot(conceptId)`: immutable view for audit/export.

## Pseudocode (comments)
```js
class ConceptStore {
  constructor({config, vspace, storage, audit}) {
    // this.concepts = Map<id, {label, diamonds: BoundedDiamond[]}>
    // this.storage = storage; // persistence adapter (file_binary/memory/custom)
  }

  getConcept(id) { /* return concept or null */ }

  upsertConcept(id, label, diamonds) {
    // set/replace union; log to audit
    // persist via storage.saveConcept
  }

  addObservation(id, vector) {
    // fetch concept; delegate to ClusterManager.detect/update
    // replace diamond set; log changes; update LSH fingerprints
  }

  listConcepts() { /* return iterator */ }

  snapshot(id) {
    // deep copy for validation/export; include storage version info
  }
}
```

## Notes/Constraints
- Avoid direct LSH implementation here; expose fingerprints/vectors to `Retriever`.
- Ensure deterministic updates; record clustering decisions for reproducibility.
- Keep schema minimal (YAGNI); do not mix theory overlays here.
- Persistence strategy configurable (file_binary default with hierarchical storage, or memory for tests); ConceptStore should defer all IO to `StorageAdapter`.***
