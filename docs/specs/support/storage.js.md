# Design Spec: src/support/storage.js

ID: DS(/support/storage.js)

Class `StorageAdapter`
- **Role**: Pluggable persistence for concepts and theories. For theories, the canonical form is a Sys2DSL text file; binary forms act only as caches. For concepts, compact binary formats remain preferred. Default strategy uses the filesystem; alternative strategies may keep data in memory or delegate to custom backends.
- **Pattern**: Strategy adapter. SOLID: single responsibility for persistence; interface stable while implementations vary.
- **Key Collaborators**: `Config` (persistenceStrategy, storageRoot), `ConceptStore`, `TheoryLayer/Stack`, `AuditLog`.

## Supported Strategies (config-driven)
- `file_binary` (default): write/read per-concept binaries and Sys2DSL theory text files under `storageRoot/{concepts|theories}/...`; may also maintain optional binary caches for theories.
- `memory`: in-memory maps (useful for tests).
- `custom`: hook for external injectors.

## Public API
- `constructor({config, audit})`: choose strategy based on config; prepare root paths or maps.
- `saveConcept(id, payload)`: persist union of diamonds for a concept (binary payload).
- `loadConcept(id)`: retrieve concept payload or null.
- `saveTheoryText(id, sys2dslText)`: persist a theory as Sys2DSL text (canonical form).
- `loadTheoryText(id)`: retrieve Sys2DSL text for a theory or null.
- `saveTheoryCache(id, payload)`: optional binary cache for faster loading of theories.
- `loadTheoryCache(id)`: retrieve binary cache or null.
- `listConcepts()`, `listTheories()`: enumerate known ids.
- `flush()`: ensure data is durable (no-op for memory).
- `setStrategy(strategyConfig)`: switch persistence strategy at runtime (for tests), within config-allowed values.

## Pseudocode (comments)
```js
class StorageAdapter {
  constructor({config, audit}) {
    // switch on config.getPersistenceStrategy()
    // if file_binary: ensure storageRoot exists; set paths
  }

  setStrategy(strategyConfig) {
    // change active strategy within allowed set (memory/file_binary/custom); re-init paths/maps
  }

  saveConcept(id, payload) {
    // serialize payload (binary) and write to disk or memory map
    // log via audit
  }

  loadConcept(id) { /* read/deserialize */ }

  saveTheoryText(id, sys2dslText) {
    // write Sys2DSL text to disk or memory map; path may reflect hierarchy (e.g., base/child directories)
  }

  loadTheoryText(id) { /* read Sys2DSL text */ }

  saveTheoryCache(id, payload) {
    // optional: serialize binary cache for faster initialisation
  }

  loadTheoryCache(id) { /* read/deserialize binary cache if present */ }

  listConcepts() { /* directory listing or map keys */ }
  listTheories() { /* same */ }

  flush() { /* fsync or noop */ }
}
```

## Notes/Constraints
- Concept binaries must respect the configured dimension count (no hard-coded 4096). The planned layout is: header magic and version, dimensions, number of diamonds, then per diamond: min vector, max vector, center vector, radius, relevance mask, and optional fingerprint.
- For theories, the **canonical** representation is the Sys2DSL text; any binary cache formats (for example, the layout produced by `scripts/build_theories.js`) are optimisations only and may be regenerated from text when needed.
- Hierarchical override: for `file_binary`, store base theories and overlays as separate Sys2DSL files under `storageRoot/theories/...`; the loader composes them in a deterministic path order (for example, `theories/base/root.sys2dsl` before `theories/law/minimal.sys2dsl` before `theories/law/war.sys2dsl`) so that child overrides can supersede parent values without mutating parent files.
- Serialization of binaries must be deterministic and use fixed endianness (little‑endian) and fixed‑width integers. Future concept files should include a config hash or version field in their headers so that readers can detect incompatibilities between writers and the current configuration.
- Keep implementation minimal (YAGNI) while allowing later backend swap via config.***
