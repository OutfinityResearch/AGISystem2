# AGISystem2 - System Specifications
#
# DS55: Constraint Programming (CP) Backend — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
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
  - internal normalized CSP artifact (JSON/TEXT, format TBD)
- **Evidence**:
  - `Witness` / `Model` (assignment)
  - `UnsatCore` / `Derivation` (when infeasible)
  - `Trace` (propagation explanation)

---

## 3. Notes

- This replaces “puzzle-specific CSP packs” with a universal CSP contract.
- HDC/EXACT can be used as heuristics/pruning, but must be explainable via evidence hooks.

