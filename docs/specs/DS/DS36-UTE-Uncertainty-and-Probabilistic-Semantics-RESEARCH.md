# AGISystem2 - System Specifications
#
# DS36: UTE — Uncertainty & Probabilistic Semantics — Research
#
# **Document Version:** 0.1
# **Author:** Sînică Alboaie
# **Status:** Research (proposed; not implemented)
# **Audience:** Researchers, evaluation authors
#
# Focus: probabilistic meaning for uncertainty (priors/likelihood/posteriors) + calibration.

---

## 1. Executive Summary

UTE requires uncertainty with semantics.

AGISystem2 currently reports confidence-like signals (e.g., similarity, traces), but UTE needs:

- a vocabulary for priors and likelihood,
- inference that produces posterior beliefs (exact or approximate),
- evidence-aware explanations (inference traces),
- calibration expectations and tests.

---

## 2. Probabilistic Assertions (Research Direction)

Probabilistic assertions are beliefs with numeric uncertainty content:

- distributions (discrete/continuous where feasible),
- bounded intervals,
- qualitative uncertainty that maps to quantitative assumptions.

These assertions must integrate with DS34 evidence objects and revision policies.

---

## 3. Inference Traces

Probabilistic inference is not a proof in the classical sense, but it should still be explainable:

- which priors were used,
- which evidence/likelihood functions were applied,
- what approximations were made,
- what outputs were produced.

These traces should be machine-checkable to the extent feasible (e.g., replayable computations).

---

## 4. Evaluation and Calibration

UTE requires that probability outputs are meaningful.

This implies eval suites and metrics for:

- calibration (do probabilities match observed frequencies),
- robustness to missing evidence,
- revision stability (how much beliefs move under new evidence).

---

## 5. URC linkage (DS49/DS51/DS52)

URC provides the minimum implementation contract required for uncertainty to stay audit-friendly:

- **Evidence-first semantics (DS49):** probabilistic beliefs must be linked to evidence objects (datasets, measurements, assumptions) and recorded approximations.
- **Artifacts (DS49):** inference runs should emit replayable artifacts (configuration + trace) rather than only “confidence numbers”.
- **Policy and revision (DS49):** belief updates are no-delete; the “current view” is policy materialization, not destructive overwrites.
- **Capability routing (DS52):** probabilistic inference may route to specialized backends (model counting, BP, sampling, SMT/ILP hybrids) when available.
- **Pack taxonomy (DS51):** uncertainty vocab and priors should be pack-scoped; eval suites should not leak domain priors into baseline Core.

---

*End of DS36*
