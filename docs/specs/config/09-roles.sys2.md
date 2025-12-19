# Spec: config/Core/09-roles.sys2

## Purpose
Defines the semantic role relations that annotate events (Agent, Theme, Source, Goal, etc.), linking DS07f (Roles & Properties) with structural macros.  By declaring these roles, macros like `_ptrans` can reference them without recreating vectors.

## Key Constructs
- 26 role relations grouped by purpose (agent, patient/theme, experiencer, transfer, circumstantial, causal, content, additional roles such as Attribute, Value, State, Action).

## Runtime Integration
- All event-related macros in `04-semantic-primitives.sys2` and `11-bootstrap-verbs.sys2` rely on these relations.
- `src/runtime/vocabulary.mjs` caches role vectors, ensuring repeated references share the same symbol.
- Reasoning/tracing modules read `Role` assignments to explain answers (see `src/reasoning/prove-search-trace.mjs`).

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` ensures loading.
- `tests/unit/reasoning/prover.test.mjs` indirectly checks roles because bundling mismatches would cause proofs to fail or produce wrong similarities.
- `tests/integration/e2e-pipeline.test.mjs` uses macros that attach many of these roles.

## Design Rationale
Centralizing role declarations prevents inconsistent naming (e.g., `Recipient` vs `Receiver`) and allows cross-module reasoning about argument semantics.

## Status
Implemented.  Would benefit from automated linting to detect unused roles across the DSL corpus.
