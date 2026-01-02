# AGISystem2 - System Specifications
#
# DS38: UTE — Experiment Planning — Research
#
# **Document Version:** 0.1
# **Author:** Sînică Alboaie
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

## 5. URC linkage (DS49/DS51/DS52)

Experiment planning is a URC-driven loop in implementation terms:

- **Experiment proposals are Goals (DS49):** an experiment plan is a Goal with budgets (cost/risk/time) and an information gain objective (DS36).
- **Execution results are Evidence (DS49):** experiment outcomes are ingested as evidence objects with provenance (dataset/measurement metadata).
- **Revision is policy materialization (DS49):** new evidence updates the “current view” without deleting old claims; contradictions become explicit objects.
- **Planning backends (DS52):** planning may route to CSP/CP backends (DS16/DS55 direction) under orchestrator control.
- **Packs (DS51):** domain experiments, safety constraints, and costs live in explicit packs (not in Core defaults).

---

*End of DS38*
