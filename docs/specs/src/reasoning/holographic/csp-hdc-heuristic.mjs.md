# Module: `src/reasoning/holographic/csp-hdc-heuristic.mjs`

**Purpose:** HDC-enhanced heuristics for CSP solving under holographic priority.

The CSP core solver is symbolic/backtracking. This module adds:

- domain ordering based on HDC similarity (“try candidates that look right first”)
- bundle-based scoring heuristics for constraint satisfaction

## Integration

- used by `createCSPSolver(session)` (`src/reasoning/index.mjs`)
- contributes to `session.reasoningStats` counters:
  - `holographicCSP`, `cspHdcPruned`, `cspNodesExplored`, etc.

## Related specs

- `docs/specs/DS/DS16-CSP-Solver.md`
- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`

