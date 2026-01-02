# AGISystem2 - System Specifications
#
# DS62: Term Rewriting & Knuth–Bendix Completion — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Equational reasoning via normalization and completion  

---

## 1. Goal

Specify how to integrate rewriting-based equality reasoning as:

- a backend for equational fragments,
- or a pre-solver normalization pass for other backends.

---

## 2. URC mapping

- **Fragment**: `Frag_Eq` (new)
- **Evidence**:
  - `Derivation` (rewrite steps)
  - optional `ProofLog` (completion steps)

