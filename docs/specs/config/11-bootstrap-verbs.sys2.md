# Spec: config/Core/11-bootstrap-verbs.sys2

## Purpose
Defines L3 verbs (tell, ask, give, go, see, want, etc.) composed from L2 semantic primitives.  Captures DS07g requirements and ensures high-level DSL remains concise while staying grounded in CD structures.

## Key Constructs
- Communication verbs: tell, ask, say.
- Transfer/transaction verbs: give, take, buy, sell.
- Motion verbs: go, move.
- Perception verbs: see, hear.
- Mental state verbs: want, like, fear, think.
- Consumption verbs: eat, drink.

## Runtime Integration
- DSL programs reference these macros directly; they expand into primitives defined in `04-semantic-primitives.sys2` and roles from `09-roles.sys2`.
- Reasoning/tracing uses the resulting bundles to explain actions (e.g., `ResponseTranslator` uses role labels to craft NL output).

## Tests & Coverage
- `evalSuite/suite04_deep_chains` and `suite09_composition` rely on these macros extensively, providing integration coverage.
- `tests/integration/deep-reasoning.test.mjs` uses `tell`, `give`, and `want` macros when verifying pipeline behavior.

## Design Rationale
By formalizing the macros inside Core the system can guarantee that even without additional theories, everyday verbs expand consistently, enabling both reasoning and decoding layers.

## Status
Implemented.  Enhancement backlog: extend verbs to cover multi-clause requests (tracked in DS07g).
