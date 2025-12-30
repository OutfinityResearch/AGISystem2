# AGISystem2 - System Specifications
#
# DS38: UTE — Experiment Planning — Research
#
# **Document Version:** 0.1
# **Status:** Research (proposed; not implemented)
# **Audience:** Researchers, planning/CSP developers
#
# Focus: experiments as information actions (reduce uncertainty) under constraints.

---

## 1. Executive Summary

UTE requires a closed loop:

1) represent a theory and its uncertainty,
2) identify what is unknown or ambiguous,
3) plan experiments/measurements/interventions to reduce uncertainty,
4) ingest results as evidence,
5) revise the model and re-plan.

This DS frames “experiment planning” as a specialization of planning where the goal is information gain, not only achieving a world state.

---

## 2. Experiments as First-Class Actions

An experiment is modeled as an action with:

- preconditions (feasibility, safety, ethics),
- costs (time, money, risk),
- effects (new evidence objects, updated beliefs),
- expected information gain (ties into DS36 uncertainty semantics).

---

## 3. Information Gain Objectives

UTE planning needs objective functions:

- reduce uncertainty over key variables,
- distinguish between competing mechanisms,
- maximize expected utility under constraints.

These objectives depend on probabilistic semantics (DS36) and evidence/revision (DS34).

---

## 4. Integration Notes

This DS builds on:

- DS16 for planning/CSP foundations,
- DS34 for evidence and revision,
- DS36 for uncertainty semantics,
- DS35/DS37 for mechanism/numeric model evaluation.

---

*End of DS38*

