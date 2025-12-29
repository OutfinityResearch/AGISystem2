# Module: `src/reasoning/csp/solver.mjs`

**Purpose:** Core symbolic CSP solver (backtracking) used by AGISystem2 for constraint satisfaction problems.

The CSP solver can be used directly (symbolic priority) or with holographic heuristics for ordering/pruning (holographic priority).

## Responsibilities

- Represent variables, domains, and constraints.
- Perform backtracking search with pruning.
- Return one or more solutions (depending on the caller).

## Integration

- Exposed via `src/reasoning/index.mjs` factory functions.
- Used by DSL `solve` statements routed through the Session executor.

## Related specs

- `docs/specs/DS/DS16-CSP-Solver.md`
- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`

