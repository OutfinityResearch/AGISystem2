# Spec: `config/Packs/Bootstrap/03-structural.sys2`

## Purpose
Supplies fundamental macros for composing argument structures: semantic roles, tuples, bundles, and type guards.  This corresponds to DS07b structural section and keeps low-level manipulation out of JS.

## Key Constructs
- `__Role`, `__Pair`, `__Triple`, `__Bundle`, `__Sequence` macros used everywhere to build higher-order events.
- `IsTypeMacro` helper for runtime validation (e.g., verifying atoms retrieved from KB still match expected type markers).

## Runtime Integration
- `src/runtime/executor.mjs` invokes these macros when compiling DSL statements into vectors.
- Reasoning modules (e.g., `src/reasoning/prove.mjs`) depend on consistent role binding to unpack antecedents/consequents.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` ensures macros load.
- `tests/unit/runtime/executor.test.mjs` exercises `__Pair`/`__Bundle` indirectly while building statement vectors.
- `tests/unit/reasoning/prover.test.mjs` assumes events encoded with these macros; failures there usually trace back to structural definitions.

## Design Rationale
Expressing structure inside DSL macros means future strategies (sparse polynomial HDC, etc.) can stay agnostic of JS implementations.  It also mirrors the documentation in DS07b where each structural primitive is part of the theory stack.

## Status
Implemented; `IsTypeMacro` still logs warnings instead of throwing on mismatches—see DS07b backlog item if stricter enforcement is needed.
