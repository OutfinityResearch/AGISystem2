# Spec: `config/Packs/Bootstrap/00-types.sys2`

## Purpose
Provides deterministic type markers used by typed constructors and structural macros. Aligns with DS07b (Type System) and ensures the vocabulary already contains vectors like `EntityType`, `PersonType`, etc., before other packs bind to them.

## Key Constructs
- Declares 19 type atoms (EntityType, PersonType, ObjectType, ... RoleType) using `___NewVector`.
- Serves as the root for all type-based similarity comparisons by giving each class its own vector.

## Runtime Integration
- `src/runtime/vocabulary.mjs` requests or creates vectors for symbols; preloading types avoids random drift when multiple sessions load theories in different orders.
- `src/runtime/executor.mjs` relies on these markers when macros like `__Person` bind with `PersonType`.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs:60` loads the file in isolation and asserts facts exist.
- Typed constructor tests under `tests/unit/runtime` indirectly exercise these markers whenever macros are called.

## Design Rationale
Using dedicated DSL definitions keeps type semantics declarative: rather than constructing pseudo-types in JS, everything is expressible inside the theory, which matches the long-term goal of self-describing knowledge bases.

## Status
Fully implemented.  Future enhancements include documenting similarity thresholds for each type family (tracked in DS07b backlog).
