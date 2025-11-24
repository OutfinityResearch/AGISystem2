# Design Spec: data/init/config_profile.json

This file selects a configuration profile and provides initial seeds and storage roots for bootstrap. It is consumed by `Config` at startup.

## Structure
- Top-level: object with fields:
  - `profile`: string, one of `"auto_test"`, `"manual_test"`, `"prod"`.
  - `dimensions`: integer in {512, 1024, 2048, 4096}.
  - `recursionHorizon`: integer between 1 and 5.
  - `indexStrategy`: string, one of `"lsh_pstable"`, `"simhash"`, `"grid"`.
  - `lshHashes`, `lshBands`, `lshBucketWidth`: integers (only relevant when `indexStrategy` is `"lsh_pstable"`).
  - `persistenceStrategy`: string, one of `"file_binary"`, `"memory"`, `"custom"`.
  - `storageRoot`: string path (required when `persistenceStrategy` is `"file_binary"`).
  - `rotationSeed`, `relationSeed`, `lshSeed`: integers for reproducible permutations/hashes.

## Constraints
- `profile` must match one of the supported profiles and should agree with `dimensions` and other defaults unless deliberately overridden.
- When `profile` is `auto_test`, `dimensions` SHOULD be 512, `indexStrategy` SHOULD be `"simhash"`, and `persistenceStrategy` SHOULD be `"memory"`.
- When `profile` is `manual_test`, `dimensions` SHOULD be 1024, `indexStrategy` SHOULD be `"lsh_pstable"` with `lshHashes=32`, `lshBands=8`, `lshBucketWidth=8`, and `persistenceStrategy` SHOULD be `"file_binary"` with `storageRoot="./.data_dev"`.
- When `profile` is `prod`, `dimensions` SHOULD be 2048 (or 4096 for high-capacity), `indexStrategy` SHOULD be `"lsh_pstable"` with `lshHashes=64`, `lshBands=16`, `lshBucketWidth=6`, and `persistenceStrategy` SHOULD be `"file_binary"` with a custom `storageRoot`.

## Example
```json
{
  "profile": "manual_test",
  "dimensions": 1024,
  "recursionHorizon": 3,
  "indexStrategy": "lsh_pstable",
  "lshHashes": 32,
  "lshBands": 8,
  "lshBucketWidth": 8,
  "persistenceStrategy": "file_binary",
  "storageRoot": "./.data_dev",
  "rotationSeed": 12345,
  "relationSeed": 67890,
  "lshSeed": 54321
}
```

## Notes
- This file captures the intended runtime profile for a deployment or test run. Deviations from the “SHOULD” defaults are allowed but should be documented and versioned.
- `Config` merges these settings with built-in defaults and environment overrides, then freezes the result for the lifetime of the process.***
