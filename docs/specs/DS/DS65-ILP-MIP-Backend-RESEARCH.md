# AGISystem2 - System Specifications
#
# DS65: ILP/MIP (Branch-and-Cut) Backend — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Integer/linear optimization backend with dual certificates  

---

## 1. Goal

Define ILP/MIP backends as:

- optimization engines for linear constraints (with integrality),
- producing dual certificates for infeasibility/optimality when possible.

---

## 2. URC mapping

- **Fragment**: `Frag_MIP`
- **GoalKinds**: `OptimizeMin`, `OptimizeMax`, `Find`
- **Evidence**:
  - `Model` (solution)
  - `DualCert` (optimality/infeasibility)
  - `Bounds` (tightening trace)

