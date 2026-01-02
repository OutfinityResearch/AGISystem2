# AGISystem2 - System Specifications
#
# DS59: Abstract Interpretation — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Abstract interpretation as URC backend (fixpoint + widening/narrowing)  

---

## 1. Goal

Define abstract interpretation as:

- a fixpoint backend producing sound over-approximations,
- optionally combined with SMT/CEGAR for refinement.

---

## 2. URC mapping

- **Fragment**: `Frag_AI` (new)
- **GoalKinds**: `Verify`, `Infer`, `Explain`
- **Evidence**:
  - `Invariant` (abstract invariant)
  - `Derivation` (fixpoint iterations / widenings)

