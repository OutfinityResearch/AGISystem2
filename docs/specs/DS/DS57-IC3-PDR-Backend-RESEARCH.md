# AGISystem2 - System Specifications
#
# DS57: IC3 / PDR — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** IC3/PDR as a safety-checking backend or orchestrator tactic  

---

## 1. Goal

Model IC3/PDR within URC as:

- a specialized backend/tactic for safety properties on `Frag_TS`,
- producing either an inductive invariant (proof) or a counterexample trace.

---

## 2. URC mapping

- **Fragment**: `Frag_TS`
- **GoalKinds**: `Verify`, `Prove`
- **Evidence**:
  - `Invariant` (inductive)
  - `Trace` (counterexample)
  - optional `ProofLog` (SAT-level)

