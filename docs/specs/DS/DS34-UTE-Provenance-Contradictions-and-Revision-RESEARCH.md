# AGISystem2 - System Specifications
#
# DS34: UTE — Provenance, Contradictions & Revision — Research
#
# **Document Version:** 0.1
# **Status:** Research (proposed; not implemented)
# **Audience:** Reasoning developers, proof/evidence designers
#
# Focus: evidence objects, contradiction reporting, and revision policies.

---

## 1. Executive Summary

UTE requires the system to survive changing evidence and conflicting sources.

This DS proposes that AGISystem2 evolves from “answers + optional proofs” to **beliefs with evidence**:

- provenance is a first-class object (what theory fragments, what engines, what assumptions),
- contradictions produce actionable reports (minimal conflicting subsets and candidate repairs),
- revision is explicit (policies that retract/override/repair while preserving history).

---

## 2. Evidence Model (Research Direction)

UTE evidence must unify several kinds of support:

- symbolic proof objects,
- holographic witnesses and retrieval traces,
- measurements and observational datasets,
- source metadata (origin, trust, timestamp, domain).

The key requirement is that evidence is attachable to beliefs and is serializable for audits and regression tests.

---

## 3. Contradiction Reporting

UTE needs contradictions to be explainable and actionable, not just detected.

A contradiction report should include:

- the conflicting beliefs (or rule outcomes),
- a minimal inconsistent subset (when feasible),
- alternative repairs (retract, override, revise assumptions),
- a trace of why each repair would restore consistency.

---

## 4. Revision Policies

Revision should be domain-aware, not only “delete facts until consistent”.

Proposed policy dimensions:

- trust ranking of sources,
- recency/expiry policies,
- mechanism priority (causal priors),
- safety/ethics constraints (some assertions cannot be accepted even if consistent),
- revision history and reproducibility expectations.

---

## 5. Integration Notes

This DS is designed to align with:

- DS19 “proof-real” direction (proof objects become one evidence type),
- Session-level isolation (DS26) so revisions are scoped per Session,
- future persistence work (explicitly separate milestone).

---

*End of DS34*

