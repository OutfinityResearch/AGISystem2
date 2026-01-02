# AGISystem2 - System Specifications
#
# DS54: SMT (DPLL(T)) Backend — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** SMT solving integration as URC backends, beyond compilation-only DS50  

---

## 1. Goal

Define an SMT backend contract (adapter + evidence) for fragments such as linear integer/real arithmetic, bit-vectors, and equality with uninterpreted functions.

---

## 2. Relationship to DS50

- DS50 specifies **deterministic SMT-LIB2 compilation**.
- This DS specifies **solver adapter I/O + evidence**:
  - model parsing,
  - unsat core parsing,
  - proof log / certificate handling.

---

## 3. URC mapping

- **Fragments**: `Frag_SMT_LIA`, `Frag_SMT_LRA`, `Frag_BitVec`, `Frag_FOL_Eq`
- **GoalKinds**: `Prove`, `Find`, `Verify`, `Optimize*` (future)
- **Artifacts**: `SMTLIB2` input, solver output logs, model JSON (adapter-defined)
- **Evidence**:
  - `Model`, `UnsatCore`, `ProofLog`, `Derivation`, `Bounds`, `Residual`

---

## 4. Notes

- External solver execution is optional; research targets include internal fragments where feasible.

