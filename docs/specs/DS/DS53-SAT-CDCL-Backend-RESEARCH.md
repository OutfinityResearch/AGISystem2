# AGISystem2 - System Specifications
#
# DS53: SAT (CDCL) Backend — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** SAT/CDCL integration as an URC backend and evidence producer  

---

## 1. Goal

Specify a future SAT backend that solves boolean fragments using CDCL-style search and produces auditable evidence (model, unsat core, proof log).

---

## 2. URC mapping

- **Fragment**: `Frag_Bool`
- **GoalKinds**: `Prove`, `Find`, `Count` (via #SAT), `Verify` (for bounded checks)
- **Artifacts**:
  - CNF in `DIMACS`
  - proof logs (format TBD) for UNSAT
- **Evidence**:
  - `Model` (SAT witness assignment)
  - `UnsatCore` (subset of clauses)
  - `ProofLog` (checkable trace if supported)

---

## 3. Contracts (high-level)

- Compilation produces `Artifact(format=DIMACS, hash=...)`.
- Solver adapter consumes DIMACS and returns:
  - SAT: model assignment → `Evidence(kind=Model)`
  - UNSAT: unsat core and/or proof log → `Evidence(kind=UnsatCore|ProofLog)`
  - UNKNOWN: `Evidence(status=Unknown)`

---

## 4. Notes

- The initial implementation can be internal (no external dependencies).
- Long-term: support incremental SAT for CEGAR and IC3/PDR.

