# Spec: config/Core/07-modal.sys2

## Purpose
Captures modal, deontic, and epistemic operators (Possible, Necessary, Must, Knows, etc.) and their DSL macros as defined in DS07e-Temporal-Modal.

## Key Constructs
- Property/state markers: Possible, Necessary, Impossible, Permitted, Forbidden, Obligatory, Known, Believed, Unknown.
- Macros such as `possible(proposition)`, `knows(agent, proposition)`, `must(agent, action)` that wrap propositions into role bundles.

## Runtime Integration
- Query/Proof engines treat modal results as facts with structured roles; `tests/unit/reasoning/query.test.mjs` hits `knows` and `believes` scenarios in ambiguity cases.
- `evals/fastEval/suite08_modal` ensures the macros generate expected vectors across long sessions.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` validates loading.
- `tests/integration/deep-reasoning.test.mjs` exercises modal macros when verifying reasoning statistics.

## Design Rationale
Modeling modality as first-class relations allows the same HDC operations to be reused—no special-case booleans—and integrates with default reasoning and explanation generation.

## Status
Implemented.  Action item: codify modal entailment rules in `src/reasoning/prove.mjs` (currently treated as inert facts).
