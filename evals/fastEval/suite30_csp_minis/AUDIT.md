# Suite Audit: suite30_csp_minis

## Intent

Exercise the generic CP/CSP solve mechanism (`solve csp`) on small, diverse problems:

- graph-coloring style constraints (binary `noConflict`)
- UNSAT handling with a minimal counterexample (triangle with 2 colors)

## URC mapping (DS49/DS52)

- Fragment: `Frag_CP`
- GoalKinds (future URC form): `Find` (enumeration), `Verify` (UNSAT sanity)
- Evidence (future URC form): `Model` (witness assignments), `UnsatCore` / `Derivation` (when infeasible)

## Vocabulary / semantics

- Uses baseline relation `conflictsWith` for binary incompatibility edges.
- Uses suite-local types (`Node`, `Color`, etc.) created via `isA` facts.

## Notes

- This suite intentionally avoids scenario-named solve types (no `WeddingSeating`).
- Expected outputs are deterministic because variable/domain insertion order is deterministic in the DSL.

