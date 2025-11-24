# Design Spec: src/support/config.js

Class `Config`
- **Role**: Centralized configuration loader/validator for geometric thinking: dimension count (>=512), recursion horizon, ontology/axiology partitions, perf knobs (loop block size), LSH settings, and temporal rotation seeds. Enforces deterministic defaults and environment overrides.
- **Pattern**: Singleton-ish instance; immutable view once loaded. SOLID: single responsibility (config), open for extension via schema, not by code change.
- **Key Collaborators**: `VectorSpace` (dimensions, dtype), `RelationPermuter` (seeded permutations), `Parser` (recursion limit), `TemporalMemory` (rotation), `ValidationEngine` (run modes), `AuditLog` (config snapshot).

## Configuration Surface (examples)
- `dimensions`: int in {512, 1024, 2048, 4096}; default 1024; used by all buffers/masks.
- `recursionHorizon`: int >=1, default 3; parser/encoder guard.
- `dtype`: string `"int8"`; reserved for future types.
- `blockSize`: small int for loop unrolling (e.g., 8/16).
- `ontologyPartition`, `axiologyPartition`: fixed ranges across profiles; ontology is always first 256 dims (0–255), axiology next 128 dims (256–383); remaining dims are empirical.
- `indexStrategy`: enum (`"lsh_pstable"`, `"simhash"`, `"grid"`); default `"lsh_pstable"`.
- `lshHashes`, `lshBands`, `lshBucketWidth`: numeric; used when strategy is `lsh_pstable`.
- `gridAxes`: optional list of dims for grid hashing (if chosen).
- `persistenceStrategy`: enum (`"file_binary"`, `"memory"`, `"custom"`); default `"file_binary"`.
- `storageRoot`: path for file persistence; required when `file_binary`.
- `rotationSeed`, `relationSeed`, `lshSeed`: numeric seeds for reproducible permutations/hashes.
- `auditEnabled`: boolean; toggles logging verbosity.
- `profile`: enum (`"auto_test"`, `"manual_test"`, `"prod"`); sets bundled defaults below.

### Profile Defaults (suggested)
- `auto_test` (fast CI): dimensions=512; recursionHorizon=2; blockSize=8; ontologyPartition=0–255; axiologyPartition=256–383; indexStrategy=`simhash` (hashBits=64); persistence=`memory`; storageRoot ignored.
- `manual_test` (dev): dimensions=1024; recursionHorizon=3; blockSize=8 or 16; ontologyPartition=0–255; axiologyPartition=256–383; indexStrategy=`lsh_pstable` (lshHashes=32, lshBands=8, lshBucketWidth=8, lshSeed from config); persistence=`file_binary`; storageRoot=`./.data_dev`.
- `prod` (CPU-efficient): dimensions=2048 (can raise to 4096 if capacity required); recursionHorizon=3; blockSize=16; ontologyPartition=0–255; axiologyPartition=256–383; indexStrategy=`lsh_pstable` (lshHashes=64, lshBands=16, lshBucketWidth=6, lshSeed from config); persistence=`file_binary`; storageRoot configurable (e.g., `./data`).

## Public API (essential only)
- `load(rawConfig)`: parse and merge env/defaults; validate schema; freeze result.
- `get(key)`: read-only accessor for scalar settings.
- `getPartition(name)`: returns tuple/range for ontology/axiology/etc.
- `getIndexStrategy()`: returns active index strategy and parameters.
- `getPersistenceStrategy()`: returns persistence choice and parameters.
- `snapshot()`: immutable JSON-safe view for audit/logging.

## Pseudocode (comments-only outline)
```js
class Config {
  constructor(defaults) {
    // store defaults, empty current config
  }

  load(raw) {
    // merge defaults + raw
    // validate: dimensions in allowed set {512, 1024, 2048, 4096}, recursionHorizon between 1 and 5 inclusive,
    //           partitions within bounds/non-overlapping and matching fixed ontology/axiology scheme
    // validate strategy enums; ensure required params (storageRoot for file_binary, bands/buckets for lsh_pstable)
    // apply profile defaults if provided (auto_test/manual_test/prod) before overrides
    // compute derived: mask lengths, block alignment
    // freeze internal object
  }

  get(key) { /* return frozenConfig[key] */ }

  getPartition(name) {
    // switch(name): return {start, end} for ontology/axiology/custom
  }

  getIndexStrategy() {
    // return {strategy, params} from frozen config
  }

  getPersistenceStrategy() {
    // return {strategy, params} from frozen config
  }

  snapshot() { /* return deep-cloned plain object for audit */ }
}
```

## Notes/Constraints
- Must be deterministic: same inputs yield identical config; seeds captured.
- Error hard on invalid config to avoid silent divergence of geometric space.
- Keep YAGNI: do not expose setters; extend via new config keys only when needed.***
