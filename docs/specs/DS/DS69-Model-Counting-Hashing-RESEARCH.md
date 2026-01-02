# AGISystem2 - System Specifications
#
# DS69: Hashing & Model Counting (#SAT/#SMT/#CSP) — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Approximate counting backends using hashing + solver oracles  

---

## 1. Goal

Define counting as a backend that:

- estimates solution counts,
- produces confidence intervals,
- and logs oracle calls as artifacts/evidence.

---

## 2. URC mapping

- **Fragment**: `Frag_HashCount` (new)
- **GoalKinds**: `Count`
- **Evidence**:
  - `HashCount`, `Confidence`, `Samples`

