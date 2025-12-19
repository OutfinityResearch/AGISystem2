# Spec: config/Core/00-relations.sys2

## Purpose
Defines relation metadata (transitive, symmetric, reflexive) plus families of domain verbs (family, ownership, trust) so that the runtime knows whether reasoning shortcuts like transitive closure or symmetry should apply.  Mirrors DS07f (Roles & Properties) and removes hard-coded relation handling in code.

## Key Constructs
- `__TransitiveRelation`, `__SymmetricRelation`, `__ReflexiveRelation` tags bound to actual operators (e.g., `isA`, `locatedIn`, `siblingOf`).
- Plain `__Relation` declarations for commonly referenced verbs (family, affective, possession) to guarantee they exist in the vocabulary before tests run.

## Runtime Integration
- Loaded through `Session.learn` when Core theories are imported (see `tests/unit/runtime/core-theories.test.mjs:15`).
- Transitivity and symmetry flags are consumed inside reasoning engines (`src/reasoning/transitive.mjs`, `src/reasoning/query.mjs`) when exploring inference chains.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` ensures the file loads and contributes facts.
- `tests/unit/reasoning/query.test.mjs` uses `loves`, `owns`, `parent`, and other declared relations when checking matching/binding behavior.

## Design Rationale
Marking relations declaratively keeps the proof/search layers pure—no special cases in JS.  Adding family/social verbs here lets eval suites (e.g., `evalSuite/suite02_hierarchies`) and fixtures rely on consistent operator vectors without redefining them.

## Status
Implementation fully matches the spec; follow-up work is to add validation so unknown relations cannot be referenced (tracked in DS07f open items).
