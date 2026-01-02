# AGISystem2 - System Specifications
#
# DS66: SDP / Sum-of-Squares (SoS) — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Convex relaxations and SoS proof/certificate integration  

---

## 1. Goal

Define SDP/SoS backends as:

- approximate or bounding engines for polynomial constraints,
- producing certificates/bounds.

---

## 2. URC mapping

- **Fragment**: `Frag_SDP`
- **Evidence**:
  - `DualCert` (bounds)
  - `Bounds`, `Residual`, `Converged/Diverged`

