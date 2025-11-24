# Design Spec: src/support/storage.js

Class `StorageAdapter`
- **Role**: Pluggable persistence for concepts and theories. Default strategy stores binaries on disk in a hierarchical layout; alternative strategies may keep data in memory or delegate to custom backends.
- **Pattern**: Strategy adapter. SOLID: single responsibility for persistence; interface stable while implementations vary.
- **Key Collaborators**: `Config` (persistenceStrategy, storageRoot), `ConceptStore`, `TheoryLayer/Stack`, `AuditLog`.

## Supported Strategies (config-driven)
- `file_binary` (default): write/read per-concept and per-theory binaries under `storageRoot/{concepts|theories}/...`; supports hierarchical overrides (sub-theory files supersede base dimensions).
- `memory`: in-memory maps (useful for tests).
- `custom`: hook for external injectors.

## Public API
- `constructor({config, audit})`: choose strategy based on config; prepare root paths or maps.
- `saveConcept(id, payload)`: persist union of diamonds for concept.
- `loadConcept(id)`: retrieve concept payload or null.
- `saveTheory(layer)`: persist theory overlay.
- `loadTheory(id)`: retrieve theory overlay.
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

  saveTheory(layer) {
    // serialize overrides; path may reflect hierarchy (e.g., base/child directories)
  }

  loadTheory(id) { /* read/deserialize */ }

  listConcepts() { /* directory listing or map keys */ }
  listTheories() { /* same */ }

  flush() { /* fsync or noop */ }
}
```

## Notes/Constraints
- Binary formats must respect the configured dimension count (no hard-coded 4096). For concepts the planned layout is: header magic and version, dimensions, number of diamonds, then per diamond: min vector, max vector, center vector, radius, relevance mask, and optional fingerprint. For theory overlays the canonical layout is the one produced by `scripts/build_theories.js`: magic `'AGTL'`, version byte `1`, three reserved zero bytes, a 32‑bit little‑endian `dimensions` field, a 32‑bit little‑endian `idLength` followed by the UTF‑8 id, then a definition mask of `ceil(dimensions/8)` bytes, an `overrideMin` vector of `dimensions` bytes (int8), an `overrideMax` vector of `dimensions` bytes (int8), and a 16‑bit little‑endian `overrideRadius` (currently zero).
- Hierarchical override: for `file_binary`, store base theories and overlays in separate files under `storageRoot/theories/...`; the loader composes them in a deterministic path order (for example, `theories/base/root.bin` before `theories/law/minimal.bin` before `theories/law/war.bin`) so that child overrides can supersede parent values without mutating parent files.
- Serialization must be deterministic and use fixed endianness (little‑endian) and fixed‑width integers. Future concept files should include a config hash or version field in their headers so that readers can detect incompatibilities between writers and the current configuration; theory files already carry the `dimensions` field and layer id and rely on the `Config` profile for compatibility checks.
- Keep implementation minimal (YAGNI) while allowing later backend swap via config.***
