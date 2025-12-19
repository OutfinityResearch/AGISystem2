# Spec: config/Core/01-positions.sys2

## Purpose
Declares 20 deterministic position vectors (`Pos1`-`Pos20`) replacing permutation-based ordering in HDC bindings, per DS07a-HDC-Primitives.  Guarantees every geometry and HDC strategy can tag argument positions consistently.

## Key Constructs
- Uses `___NewVector "__PosN__" "Core"` to seed each position with a reproducible hash.
- Covers 20 slots to align with parser and executor limits (same bounds enforced in `src/core/position.mjs`).

## Runtime Integration
- `src/core/position.mjs` calls `createFromName("__POS_${n}__")`; these DSL declarations keep names stable across sessions and tests.
- Reasoning modules that bundle arguments (e.g., `src/reasoning/prove.mjs`) rely on positional binding/unbinding for pattern matching.

## Tests & Coverage
- `tests/unit/core/position.test.mjs` (run `rg --files tests | rg position`) verifies initialization, caching, and round-trip binding.
- `tests/unit/runtime/core-theories.test.mjs` loads the file to ensure macros referencing `PosN` do not throw.

## Design Rationale
Permutations break when extending a vector from 16K to 32K dimensions.  Position vectors remain stable because cloning a base vector duplicates both the value and the deterministic position markers.

## Status
Implemented as specified.  Tracking item: add runtime validation that any new macro referencing `Pos21+` fails fast.
