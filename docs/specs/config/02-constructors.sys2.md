# Spec: config/Core/02-constructors.sys2

## Purpose
Defines macros like `@__Person` and `@__Number` that manufacture typed vectors.  These macros encapsulate the repeated `___Bind` sequences required to attach base type markers, as described in DS07b-Type-System.

## Key Constructs
- Entity constructors: `__Entity`, `__Person`, `__Object`, etc., each binding a fresh vector with both `EntityType` and a subtype marker.
- Abstract constructors: property, state, category, relation, action.
- Temporal/quantity constructors (`__TimePoint`, `__Number`, `__Measure`) that embed literal values inside the vector via `graph value` arguments.

## Runtime Integration
- `src/runtime/executor.mjs` registers macros discovered while loading the file so user programs can call e.g. `@p __Person` at DSL level.
- `src/runtime/session.mjs` uses `Vocabulary` + macros when normalizing input DSL/fixtures.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` ensures macros load without errors.
- `tests/unit/runtime/executor.test.mjs` drives macro execution through `Executor.executeProgram`, validating registration and binding behavior.
- Integration suites (`evalSuite/suite01_foundations`, `suite02_hierarchies`) rely on these macros to instantiate persons, categories, and numbers.

## Design Rationale
Encapsulating `___Bind` sequences avoids duplicated JS helpers and keeps DSL programs concise.  Graph-based constructors (e.g., `__Number graph value`) allow typed literal encoding while preserving referential transparency.

## Status
Fully implemented.  Pending improvement: add docstrings for each macro so tooling can surface hints inside editors.
