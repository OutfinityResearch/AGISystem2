# Module: `src/reasoning/holographic/query-hdc-first.mjs`

**Purpose:** HDC-first query engine used under `reasoningPriority: 'holographicPriority'`.

This engine attempts a “master-equation” style retrieval first (UNBIND + candidate decoding), then uses symbolic reasoning to validate and/or supplement results.

## Inputs / integration

- constructed via `createQueryEngine(session)` (`src/reasoning/index.mjs`)
- uses the session’s HDC context (`session.hdc`) and indices (`componentKB`, `factIndex`)
- updates counters in `session.reasoningStats`:
  - `hdcUnbindAttempts`, `hdcUnbindSuccesses`
  - `hdcValidationAttempts`, `hdcValidationSuccesses`
  - `hdcUsefulOps`, `hdcEquivalentOps`
  - `kbScans`, `similarityChecks`

## Strategy hooks

When available, the engine prefers strategy-aware decoding:

- `strategy.decodeUnboundCandidates(unboundVec, options)`

This is critical for non-XOR strategies (e.g., EXACT) where UNBIND yields residual structure that must be projected back to entity candidates.

## High-level algorithm (per query)

1) Parse query, identify holes and operator.
2) If query fits “direct index” fast-path, use it (exact/symbolic index).
3) Else, attempt HDC-first:
   - build partial key vector from known args (Pos markers)
   - `unbound = UNBIND(KB, partial)`
   - for each hole: `holeVec = UNBIND(unbound, PosN)`
   - decode candidates via `decodeUnboundCandidates(...)` or similarity ranking
4) Validate candidates with symbolic engine (and optionally supplement).
5) Report:
   - “HDC Tried”: did step (3) run?
   - “HDC Valid”: did HDC produce any acceptable candidates?
   - “HDC Eq”: did HDC candidate set match symbolic answer set?
   - “HDC Final”: was the final returned method HDC-based?

## Related specs

- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`
- `docs/specs/DS/DS14-EvalSuite.md` (reporting metrics)
- `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md` (decoder/cleanup for EXACT)

