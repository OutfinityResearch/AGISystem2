# AGISystem2 - System Specifications
#
# DS61: Automated Theorem Proving (Saturation) — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Resolution/superposition ATP integration under URC  

---

## 1. Goal

Define ATP saturation as a backend for first-order logic (with equality), producing proof objects or saturation reports.

---

## 2. URC mapping

- **Fragment**: `Frag_FOL_Eq`
- **Artifacts**: TPTP (future), internal clause sets
- **Evidence**:
  - `Derivation` / `ProofLog` (refutation)
  - `Unknown` (saturation without contradiction)

