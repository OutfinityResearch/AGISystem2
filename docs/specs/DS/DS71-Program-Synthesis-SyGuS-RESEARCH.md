# AGISystem2 - System Specifications
#
# DS71: Program Synthesis (SyGuS / Invariant Synthesis) — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Synthesis as a GoalKind with solver backends and auditable artifacts  

---

## 1. Goal

Define synthesis as:

- a goal that produces an artifact (program/expression/invariant),
- validated by verification backends,
- and anchored with provenance and evidence.

---

## 2. URC mapping

- **GoalKind**: `Synthesize` (new)
- **Evidence**:
  - `Artifact` (synthesized object)
  - `Verification` evidence from a verifier backend

