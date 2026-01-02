# Spec: `config/Packs/Defaults/08-defaults.sys2`

## Purpose
Provides macros for default reasoning (normally, except, unless, typical/atypical markers) described in DS07e and DS08.  Enables non-monotonic reasoning paths for inheritance problems.

## Key Constructs
- Relations: Default, Exception, Unless, Typical, Atypical.
- Macros: `normally(category, property)`, `except(subcategory, property)`, `unless(proposition, condition)` (implemented via implication), `typical(instance, category)`, `atypical(instance, category)`.

## Runtime Integration
- `src/reasoning/defaults.mjs` consumes these relations when evaluating whether an exception blocks a default rule.
- `tests/unit/reasoning/defaults.test.mjs` loads DSL scenarios referencing `normally`/`except` macros to assert conflict resolution logic.

## Tests & Coverage
- `tests/unit/reasoning/defaults.test.mjs` verifies interplay between defaults and exceptions.
- `tests/unit/reasoning/negation-exceptions.test.mjs` covers `unless` patterns.
- `evals/fastEval/suite06_compound_logic` extends coverage in conversational flows.

## Design Rationale
Encoding defaults declaratively ensures the `Session` can explain results by pointing back to DSL facts rather than opaque code heuristics.  The macros also encapsulate the `@var` scoping rules highlighted in DS14.

## Status
Implemented per spec.  Next step: add instrumentation so the proof engine reports when a default was overridden (feature request in DS08).
