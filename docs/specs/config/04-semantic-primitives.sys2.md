# Spec: config/Core/04-semantic-primitives.sys2

## Purpose
Introduces L2 Conceptual Dependency primitives (_ptrans, _atrans, _mtrans, etc.) representing physical, abstract, and mental actions.  These provide reusable templates for L3 verbs (DS07c + DS07g).

## Key Constructs
- Physical actions: `_ptrans`, `_propel`, `_grasp`, `_ingest`, `_expel`.
- Abstract/mental actions: `_atrans`, `_mtrans`, `_mbuild`, `_attend`, `_speak`, `_conc`.
- Each macro produces a bundled event with `__Event` id plus semantic roles (Agent, Theme, Source, etc.).

## Runtime Integration
- Higher-level macros in `11-bootstrap-verbs.sys2` compose these primitives; for example `@GiveMacro` calls `_atrans` twice.
- Decoder and reasoning modules rely on the consistent role layout when generating explanations or natural-language phrasing.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` loads the file.
- `evals/fastEval/suite04_deep_chains` and `evals/fastEval/suite05_negation` use `_atrans`, `_mtrans`, etc., verifying stability in full conversations.

## Design Rationale
Encoding primitives as macros keeps the event geometry stable and makes it easier to extend the action set.  Roles are assigned declaratively to support graph-based reasoning (e.g., verifying Agent vs Theme positions).

## Status
Implemented.  Future action item: add coverage in `tests/unit/hdc` to measure similarity budgets between primitives to detect accidental overlaps.
