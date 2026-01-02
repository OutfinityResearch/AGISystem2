# AGISystem2 - System Specifications
#
# DS55: Constraint Programming (CP) Backend — RESEARCH
#
**Document Version:** 0.2  
**Status:** Research / Partially Implemented (v0)  
**Audience:** Core maintainers  
**Scope:** Universal CP backend integration under URC  

---

## 1. Goal

Define CP as a first-class URC backend with:

- a universal constraint IR (variables/domains/constraints),
- propagation primitives,
- auditable witness evidence,
- and optional explanations (nogoods/propagation trace).

---

## 2. URC mapping

- **Fragment**: `Frag_CP`
- **GoalKinds**: `Find`, `OptimizeMin`, `OptimizeMax`, `Count` (#CSP future)
- **Artifacts**:
  - normalized CSP artifact (JSON-as-text, `format=CSP_JSON_V0`)
  - per-solution assignment artifact (JSON-as-text, `format=CSP_SOLUTION_JSON_V0`)
- **Evidence**:
  - `Model` (assignment witness)
  - `Trace` (infeasible marker; propagation trace is future work)

---

## 3. Current v0 implementation (runtime)

This repo currently provides a **generic CSP solve mechanism** via Sys2DSL `solve` blocks:

- The problem type token is treated as **metadata only** (no scenario-specific runtime modes).
- The solve semantics come from **declarations** like `variablesFrom`, `domainFrom`, `noConflict`, `allDifferent`.

Example shape:

```sys2dsl
@seating solve csp [
  variablesFrom Guest
  domainFrom Table
  noConflict conflictsWith
  allDifferent guests
  maxSolutions 50
  timeoutMs 5000
]
```

Outputs (v0):
- Persists solution facts as regular KB facts (e.g. `seating Alice T1`) and a `cspTuple ...` helper fact for multi-hole extraction.
- Emits URC audit records into the session in-memory URC store:
  - `Artifact(format=CSP_JSON_V0, ...)` for the normalized CSP instance.
  - `Artifact(format=CSP_SOLUTION_JSON_V0, ...)` for each solution.
  - `Evidence(kind=Model, method=CP, status=Sat, ...)` per solution.
  - `Evidence(kind=Trace, method=CP, status=Infeasible, ...)` when no solutions are found.

Limitations (v0):
- No formal UNSAT core or propagation trace (nogoods) is produced yet.
- Optimization goals are not integrated into `solve csp` yet (search remains “find solutions”).

Eval coverage (v0):
- `evals/fastEval/suite30_csp_minis` (graph-coloring style constraints + UNSAT sanity)
- `evals/fastEval/suite31_csp_alldifferent` (permutation/allDifferent + UNSAT sanity)

---

## 4. Notes
- This replaces “puzzle-specific CSP packs” with a universal CSP contract.
- HDC/EXACT can be used as heuristics/pruning, but must be explainable via evidence hooks.

---

## Appendix A — Wedding seating (modeling example, not a runtime mode)

This is a **modeling case** for the generic CSP mechanism. It must not imply a dedicated runtime mode.

```sys2dsl
# Vocabulary
isA Alice Guest
isA Bob Guest
isA Carol Guest

isA T1 Table
isA T2 Table
isA T3 Table

# Conflicts (binary relation)
conflictsWith Alice Bob
conflictsWith Bob Carol

# Solve
@seating solve csp [
  variablesFrom Guest
  domainFrom Table
  noConflict conflictsWith
  allDifferent guests
  maxSolutions 10
]

# Query example (pick an assignment)
seating Alice ?t
```

When a solution is found:
- `seating Alice <Table>` facts are persisted in the KB (for inspection/query).
- URC artifacts/evidence are recorded for audit/debug (KBExplorer: Reasoning → URC).
