# AGISystem2 - System Specifications
#
# DS32: Universal Theory Engine (UTE) — Research
#
# **Document Version:** 0.1
# **Status:** Research (proposed; not implemented)
# **Audience:** Researchers, architects, reasoning/DSL developers
#
# UTE is a long-horizon research theme: a unified capability stack for executable, revisable theories.

---

## 1. Executive Summary

This DS defines **Universal Theory Engine (UTE)** as a research direction for AGISystem2.

UTE is not one feature. It is the integrated combination of:

- compositional representation of theories (relations, events, conditions),
- query/retrieval with generalization (not only lookup),
- provenance + evidence objects + contradiction handling,
- causal / mechanistic reasoning,
- uncertainty / probabilistic semantics,
- numeric modeling (units, equations, kinetics/dynamics),
- model revision (belief updates under new evidence),
- experiment planning (choose measurements/interventions to reduce uncertainty).

The purpose of this DS is to:

1) define a coherent target (what “UTE” means in practice),  
2) identify what AGISystem2 already provides vs what is missing,  
3) partition the missing work into focused research DS documents (DS33–DS38).

---

## 2. Design Principle: One Query Surface, Many Semantics

UTE is achieved when a user can express a question once (Sys2DSL / query DSL), and the system can:

- retrieve relevant theory fragments efficiently (possibly holographically),
- validate and explain answers symbolically (proofs / traces),
- attach evidence and provenance,
- handle contradictions and revisions without losing history,
- incorporate numeric and probabilistic meaning in a principled way.

This implies a “multi-semantics” architecture:

- **symbolic semantics** for crisp proofs, unification, and constraint solving,
- **holographic semantics** for fast retrieval, approximate decoding, and capacity experiments,
- **numeric semantics** for executing models and constraints over quantities,
- **probabilistic semantics** for uncertainty propagation and decision making.

UTE does not require a single monolithic engine; it requires a stable integration contract between these semantics.

---

## 3. Current Coverage (High-level)

AGISystem2 already covers:

- compositional DSL (DS02) and core semantic atoms/roles (DS07*),
- symbolic reasoning and meta-query operators (DS05, DS17 meta-ops),
- CSP solving and planning foundations (DS16),
- session isolation and strategy-pluggability (DS26),
- multiple HDC strategies, including elastic and lossless representations (DS15, DS18, DS23, DS25).

AGISystem2 is missing UTE-level integration for:

- first-class evidence objects that unify proofs + measurements + source metadata,
- contradiction reports that produce actionable minimal conflicting subsets,
- explicit model revision policies (beyond detecting inconsistency),
- causal graph + intervention semantics that are proof/evidence compatible,
- probabilistic semantics (priors/likelihood/posteriors) with calibration expectations,
- numeric modeling layer (units, dimensional analysis, model execution + estimation traces),
- experiment planning as “information gain” under constraints.

---

## 4. Research Partition (DS33–DS38)

UTE is intentionally split into focused DS documents:

- **DS33 — UTE: Representation & Query**  
  Compositional structures and generalization-aware retrieval; indexing contracts; query compilation.

- **DS34 — UTE: Provenance, Contradictions & Revision**  
  Evidence schema, contradiction subset reporting, and revision policy language.

- **DS35 — UTE: Causal / Mechanistic Reasoning**  
  Mechanisms, interventions, counterfactuals, causal graphs integrated with rules.

- **DS36 — UTE: Uncertainty / Probabilistic Semantics**  
  Priors/likelihood, inference traces, calibration tests, decision-oriented uncertainty.

- **DS37 — UTE: Numeric Modeling & Units**  
  Quantities, unit algebra, model execution, solver adapters, estimation traces.

- **DS38 — UTE: Experiment Planning**  
  Experiments as information actions; plan under constraints; closed-loop revision and re-planning.

This partition is designed so each DS can be studied independently, while still aligning with a single UTE goal.

---

## 5. Status Notes

UTE is currently a research roadmap, not a committed implementation plan. Individual parts may become implementable earlier (e.g. evidence schema)
and be promoted from “research” to “planned/implemented” with:

- loadable theories in `config/` (where applicable),
- unit tests and eval coverage,
- clear interoperability rules with existing engines.

---

*End of DS32*

