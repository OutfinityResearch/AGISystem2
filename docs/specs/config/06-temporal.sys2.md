# Spec: config/Core/06-temporal.sys2

## Purpose
Adds temporal and causal relations (`Before`, `During`, `Causes`, etc.) with macros capturing common reasoning patterns, per DS07e-Temporal-Modal.  Provides canonical bundling so proofs can align events chronologically.

## Key Constructs
- Temporal relation atoms: Before, After, During, Starts, Ends, Overlaps, Meets.
- Causal atoms: Causes, Enables, Prevents.
- Macros bundling event pairs or combining temporal + causal evidence (e.g., `causes` adds both a `before` relation and a `Causes` role).

## Runtime Integration
- `src/reasoning/query-transitive.mjs` (imported via `query.mjs`) inspects temporal relations when chaining events.
- `evalSuite/suite07_temporal` loads DSL cases that rely on these macros, ensuring runtime behavior matches spec.

## Tests & Coverage
- `tests/unit/runtime/core-theories.test.mjs` ensures this theory loads.
- `tests/integration/deep-reasoning.test.mjs` and `evalSuite/suite07_temporal` verify end-to-end usage by asserting expected answers for temporal questions.

## Design Rationale
Explicit macros avoid copy/paste DSL, keep event bundling uniform, and let session loaders detect missing prerequisites early.  The `CausesMacro` producing both `before` and `Causes` ensures downstream components can apply either structural or semantic cues.

## Status
Implemented.  Gap: there is no dedicated unit test ensuring each macro attaches the intended roles; adding fine-grained tests under `tests/unit/runtime` would catch regressions faster.
