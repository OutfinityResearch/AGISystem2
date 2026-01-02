# AGISystem2 - System Specifications
#
# DS52: Reasoning Paradigms Roadmap (URC Backends) — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers, DS authors  
**Scope:** Roadmap for integrating major reasoning paradigms as URC backends and orchestration tactics  

---

## 1. Purpose

This document enumerates a long-horizon set of reasoning paradigms we want AGISystem2 to support as **URC backends** (or orchestration tactics), even if they are not implemented today.

The objective is to keep the architecture consistent and extensible:

- **URC (DS49)** defines the universal contract: `Content`, `Goal`, `Evidence`, `Provenance`, `Policy`, `Orchestrator`.
- Each paradigm is modeled as:
  - a **Fragment** (classifier tag),
  - one or more **Backends** (capability registry),
  - canonical **Artifact** formats,
  - canonical **Evidence** shapes,
  - and (optionally) orchestration tactics (CEGAR, IC3/PDR, etc.).

This DS is intentionally **research-only**: it sets targets and interfaces, not implementations.

---

## 2. Terminology (URC framing)

- **Fragment**: a class of problems with shared solver semantics (e.g., `Frag_Bool`, `Frag_SMT_LRA`, `Frag_CP`, `Frag_TS`).
- **Backend**: an adapter/engine that can solve a fragment (internal or external).
- **Artifact**: stable input/output object (text/blob) with hash and format.
- **Evidence**: auditable proof/model/certificate/trace/metrics supporting a claim.
- **Orchestrator**: chooses backends, decomposes tasks, and produces a plan.

Canonical anchor points:

- Fragment atoms and capability surfaces: `config/Packs/URC/03-capability-registry.sys2`
- Evidence shapes: `config/Packs/URC/04-evidence-core.sys2`
- Plan/step surfaces: `config/Packs/URC/06-orchestrator-core.sys2`

---

## 3. Paradigms → DS mapping (targets)

| # | Paradigm | URC Role | DS |
|---:|---|---|---|
| 1 | SAT with clause learning (CDCL) | Backend (`Frag_Bool`) | DS53 |
| 2 | SMT (DPLL(T)) | Backend (`Frag_SMT_*`) | DS54 |
| 3 | CP + propagation | Backend (`Frag_CP`) | DS55 |
| 4 | Model checking (automata + fixpoint) | Backend (`Frag_TS`) | DS56 |
| 5 | IC3/PDR | Backend/tactic (`Frag_TS`) | DS57 |
| 6 | CEGAR | Orchestrator tactic | DS58 |
| 7 | Abstract interpretation | Backend/tactic (`Frag_AI`) | DS59 |
| 8 | Proof assistants (kernel verification) | Verifier backend | DS60 |
| 9 | ATP by saturation (resolution/superposition) | Backend (`Frag_FOL_Eq`) | DS61 |
| 10 | Term rewriting + completion (Knuth–Bendix) | Backend/tactic (`Frag_Eq`) | DS62 |
| 11 | Gröbner bases | Backend (`Frag_Poly`) | DS63 |
| 12 | Quantifier elimination (CAD) | Backend (`Frag_NonlinearReal`) | DS64 |
| 13 | ILP/MIP (branch-and-cut) | Backend (`Frag_MIP`) | DS65 |
| 14 | SDP + Sum-of-Squares | Backend (`Frag_SDP`) | DS66 |
| 15 | Structural decompositions (treewidth/DP) | Orchestrator tactic | DS67 |
| 16 | Tensor/factor graphs, belief propagation | Backend (`Frag_Tensor`/`Frag_Prob`) | DS68 |
| 17 | Hashing + approximate model counting | Backend (`Frag_HashCount`) | DS69 |
| 18 | Symbolic execution + solving | Backend/tactic (`Frag_SMT_*`) | DS70 |
| 19 | Synthesis (SyGuS / invariant synthesis) | Backend (`GoalKind=Synthesize`) | DS71 |
| 20 | ML-guided proof search / premise selection | Orchestrator heuristic | DS72 |

---

## 4. Non-goals

- This DS does not mandate external dependencies or networked solvers.
- This DS does not define concrete algorithms; it defines integration contracts.

---

## 5. Implementation stance

All DS documents referenced above are created as **Research / Not Implemented** placeholders to stabilize the roadmap and to avoid ad-hoc one-off integrations that bypass URC.
