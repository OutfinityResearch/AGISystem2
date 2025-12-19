# Spec: config/Core/05-logic.sys2

## Purpose
Declares logical relations (`Implies`, `And`, `Or`, `Not`, quantifiers) and macros for building logic graphs entirely inside the DSL (DS07d-Logic).  Eliminates earlier JS shims that constructed implication bundles manually.

## Key Constructs
- Base relation atoms for each logical connective.
- Macros to generate canonical graph structures: `implies(a,b)`, `and(a,b)`, `forall(variable, predicate)`, etc.

## Runtime Integration
- `src/runtime/session.mjs#trackRules` looks for `Implies` statements to register rules; these macros ensure the AST contains standardized role bindings.
- `src/reasoning/prove.mjs` inspects bundles produced by `ImpliesMacro` when matching antecedents/consequents.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs:70` loads this file separately to ensure no eager execution occurs.
- `tests/unit/reasoning/prover.test.mjs` sets up `Implies` statements and confirms the proof engine derives conclusions.
- `tests/integration/deep-reasoning.test.mjs` builds chains of `Implies` macros as part of the pipeline.

## Design Rationale
Having macros express logic ensures the KB stores ordinary vectors; the reasoning engine only needs to understand `Implies` semantics rather than bespoke JS metadata.  Quantifiers are encoded as `__Bundle` of `ForAll`/`Exists` role + scope to maintain clarity.

## Status
Implemented according to spec.  Known gap: quantifiers are not yet enforced during execution—Prover treats them as structured annotations.  Documented in DS07d backlog.
