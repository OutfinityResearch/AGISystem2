# Spec: config/Core/10-properties.sys2

## Purpose
Supplies macros for attribute assignment (`hasProperty`, `inState`), membership (`isA`, `subclass`), part-whole relations, location/capability/possession, and synonyms—capturing DS07f requirements and the follow-ups from `hardcoded_theory_analysis.md`.

## Key Constructs
- Property/state macros bundling Theme/Attribute or Theme/State roles.
- Category macros (`isA`, `subclass`).
- Part/whole relations plus macros for `partOf`, `hasPart`, `madeOf`.
- Location macros (`at`, `in`, `on`, `near`).
- Capability & possession relations (`Can`, `Has`, `Synonym`).

## Runtime Integration
- Query/proof engines depend on these macros to encode membership facts that support inheritance.
- `src/runtime/session.mjs` uses `trackRules` to inspect `isA`/`subclass` facts for rule building and contradiction detection (see `MUTUALLY_EXCLUSIVE`).

## Tests & Coverage
- `tests/unit/reasoning/query.test.mjs` queries `isA`, `hasProperty`, `has`, etc.
- `tests/unit/reasoning/defaults.test.mjs` sets up `isA` hierarchies to validate default overrides.
- `evals/fastEval/suite02_hierarchies` heavily exercises the macros.

## Design Rationale
Bringing capability and possession into Core closes the gap where tests relied on implicit relations.  Synonym relations enable fuzzy matching while staying in DSL form so HDC similarity can reuse them.

## Status
Implemented with the new relations.  TODO: add runtime validation preventing inverse duplicates (e.g., `partOf` vs `hasPart`) from diverging in similarity.
