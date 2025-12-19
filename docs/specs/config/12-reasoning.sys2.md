# Spec: config/Core/12-reasoning.sys2

## Purpose
Captures meta-level reasoning verbs (abduce, induce, deduce, whatif, analogy, similar, explain) so the DSL can call higher-order reasoning flows declaratively (DS07h + DS17-Meta-Query-Operators).

## Key Constructs
- Action markers: Abduction, Induction, Deduction, Analogy.
- Macros returning bundles that tag the action plus its inputs (observation, examples, premises, world, etc.).
- Helper macros `similar` and `explain` bridging to HDC similarity and explanation workflows.

## Runtime Integration
- `src/reasoning/abduction.mjs`, `induction.mjs`, `query.mjs`, etc., inspect these macros to know which engines to invoke.
- `evalSuite/suite14_meta_queries` drives the macros via conversation steps (e.g., `similar` queries).

## Tests & Coverage
- `tests/unit/reasoning/abduction.test.mjs`, `induction.test.mjs`, and `whatif.test.mjs` cover the corresponding DSL verbs.
- `tests/unit/runtime/core-theories.test.mjs` ensures macros load.

## Design Rationale
Having macros produce typed bundles ensures reasoning engines can reference consistent HDC structures regardless of the data source.  This also sets the stage for serializing reasoning traces for debugging.

## Status
Implemented.  Next improvement: attach metadata (confidence, provenance) inside the bundles so explanation trees stay in DSL form.
