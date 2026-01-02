# AGISystem2 - System Specifications
#
# DS58: CEGAR (Counterexample-Guided Abstraction Refinement) — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** CEGAR as an URC orchestrator tactic with provenance and evidence  

---

## 1. Goal

Define CEGAR as an orchestration loop that:

- starts from an abstraction,
- produces candidate counterexamples,
- validates counterexamples against the concrete model,
- refines abstraction when counterexamples are spurious.

---

## 2. URC mapping

- **Orchestrator tactic**: multi-step plan generation/refinement
- **Evidence**:
  - `Trace` (candidate / validated)
  - `Derivation` (refinement steps)
- **Provenance**:
  - record abstraction versions, refinement decisions, and reasons.

