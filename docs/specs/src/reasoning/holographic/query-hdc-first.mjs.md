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
  - `hdcComparedOps`
  - `kbScans`, `similarityChecks`

## Strategy hooks

When available, the engine prefers strategy-aware decoding:

- `strategy.decodeUnboundCandidates(unboundVec, options)`

This is critical for non-XOR strategies (e.g., EXACT) where UNBIND yields residual structure that must be projected back to entity candidates.

## High-level algorithm (per query)

1) Parse query, identify holes and operator.
2) If operator is classified as **symbolic-only** (meta operators, quantifiers, transitive relations, CSP tuple helper `cspTuple`, graph-wrapped facts), delegate to the symbolic `QueryEngine`.
3) If query fits the “direct index” fast-path (single-hole fact query), use it (exact index via `ComponentKB`).
3) Else, attempt HDC-first:
   - build partial key vector from known args (Pos markers)
   - `unbound = UNBIND(KB, partial)`
   - for each hole: `holeVec = UNBIND(unbound, PosN)`
   - decode candidates via `decodeUnboundCandidates(...)` or similarity ranking
4) Validate candidates with symbolic proof.
5) Fallback policy (holographicPriority):
   - if **no** HDC candidates validate: run the symbolic engine for completeness
   - if **≥1** HDC candidate validates: return the validated HDC result(s) without symbolic supplementation (performance-first)
5) Report:
   - “HDC Tried”: did step (3) run?
   - “HDC Valid”: did HDC produce any acceptable candidates?
   - “HDC Match”: when compared, did HDC answer set match symbolic answer set?
   - “HDC Final”: was the final returned method HDC-based?

## Related specs

- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`
- `docs/specs/DS/DS14-EvalSuite.md` (reporting metrics)
- `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md` (decoder/cleanup for EXACT)
