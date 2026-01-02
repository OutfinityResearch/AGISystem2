# AGISystem2 - System Specifications
#
# DS72: ML-Guided Proof Search / Premise Selection — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Orchestrator heuristics for guiding search using learned priors  

---

## 1. Goal

Define ML-guided tactics as:

- an orchestrator heuristic layer that ranks:
  - candidate lemmas,
  - solver choices,
  - search branches,
  - and proof tactics,
- without changing the semantics (evidence remains mandatory).

---

## 2. URC mapping

- **Orchestrator**: adds scoring/ranking to plan selection
- **Provenance**: record decisions and confidence scores
- **Non-goal**: no external ML dependencies are required for initial scaffolding

