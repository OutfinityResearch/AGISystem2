# AGISystem2 - System Specifications
#
# DS35: UTE — Causal / Mechanistic Reasoning — Research
#
# **Document Version:** 0.1
# **Author:** Sînică Alboaie
# **Status:** Research (proposed; not implemented)
# **Audience:** Reasoning researchers, DSL designers
#
# Focus: mechanisms, interventions, and counterfactuals as theory-level objects.

---

## 1. Executive Summary

UTE requires causal semantics:

- represent mechanisms (processes) with explicit inputs/outputs,
- answer intervention queries (“what if we do X?”),
- answer counterfactual queries (“what if X had been different?”),
- connect causal structure to executable rules and constraints.

This DS proposes a causal layer that remains compatible with AGISystem2’s proof and evidence model.

---

## 2. Mechanisms as First-Class Theory Units

Instead of only rules “A implies B”, UTE needs mechanism objects:

- a stable identity (module ID),
- required inputs and produced outputs,
- invariants and preconditions,
- evidence bindings (“this measurement supports this mechanism”).

Mechanisms may be symbolic (rules) or numeric (simulations), but must expose a consistent interface and evidence outputs.

---

## 3. Interventions and Counterfactuals

Interventions are special updates that override normal inference:

- intervene on a variable/value,
- propagate changes through mechanisms under constraints,
- preserve provenance and revision history.

Counterfactual reasoning requires separating:

- model structure (mechanisms),
- evidence/observations,
- intervention scenario.

---

## 4. Integration Notes

This DS depends on:

- DS34 (evidence + revision policies),
- DS37 (numeric modeling hooks) for mechanistic models that require simulation,
- DS16 (planning/CSP) for constraint-aware propagation.

---

*End of DS35*
