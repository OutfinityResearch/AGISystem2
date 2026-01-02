# Spec: `config/Packs/Relations/00-relations.sys2`

## Purpose
Defines relation metadata (transitive, symmetric, reflexive, inheritable, assignment) so that reasoning layers can apply declarative shortcuts (e.g. transitive closure) without hard-coded operator lists.

Policy: this pack is intentionally **domain-agnostic**; it should not contain “story” relations (e.g. `loves`, `owns`, `parent`). Evaluation suites and tests must ship their own domain vocabularies.

## Key Constructs
- Relation property tags bound to operators:
  - `__TransitiveRelation` (e.g. `isA`, `partOf`)
  - `__SymmetricRelation` (e.g. `conflictsWith`)
  - `__ReflexiveRelation` (e.g. `equals`)
  - `__InheritableProperty` (e.g. `hasProperty`, `hasState`)
  - `__AssignmentRelation` (phrasing hint for NL output)

## Runtime Integration
- Loaded through `Session.learn` when the baseline Kernel stack (DS51) is imported.
- Relation tags are consumed inside reasoning engines (e.g. `src/reasoning/transitive.mjs`, `src/reasoning/query.mjs`) when exploring inference chains.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` ensures the file loads and contributes tagged relations.
- Query/binding tests should define their own domain relations in test-local fixtures rather than relying on baseline packs.

## Design Rationale
Marking relation properties declaratively keeps the proof/search layers pure—no special cases in JS. Domain vocabularies are intentionally pushed out to evaluation suites and domain packs to avoid test-driven vocabulary creep in baseline config.

## Status
Implementation fully matches the spec; follow-up work is to add validation so unknown relations cannot be referenced (tracked in DS07f open items).
