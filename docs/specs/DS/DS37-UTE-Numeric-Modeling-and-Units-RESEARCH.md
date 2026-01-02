# AGISystem2 - System Specifications
#
# DS37: UTE — Numeric Modeling & Units — Research
#
# **Document Version:** 0.1
# **Author:** Sînică Alboaie
# **Status:** Research (proposed; not implemented)
# **Audience:** Researchers, runtime and DSL developers
#
# Focus: quantities with units, model execution, solver adapters, and estimation traces.

---

## 1. Executive Summary

UTE requires numeric modeling as a first-class capability:

- quantities with units and dimensional checks,
- executable equations and models (kinetics/dynamics),
- solver adapters (optimization/ODE/CSP hybrids),
- parameter estimation workflows with evidence/provenance.

Numeric modeling is integrated with UTE through DS34 evidence objects and DS35 causal mechanisms.

Bridge alignment:

- DS50 (CompilationCore SMT-LIB2) defines a deterministic compilation target for typed numeric constraints (v0 fragment).

---

## 2. Quantity Type and Unit Algebra

UTE needs a quantity value that carries:

- a numeric value (or distribution),
- a unit (mg, mL, mol/L),
- derived dimensions (mass/volume/time),
- canonical normalization and conversion rules.

Dimensional analysis must be enforced to avoid silent errors and to make models portable.

---

## 3. Model Execution and Evidence

Numeric evaluation must remain explainable:

- inputs, parameters, and assumptions,
- solver settings (deterministic configurations),
- outputs and residuals,
- trace objects that can be attached as evidence.

This “numeric trace” becomes an evidence type within DS34.

---

## 4. Estimation and Constraint Inference

UTE needs to support:

- fitting parameters to measurements,
- constraining parameters under theory assumptions,
- propagating uncertainty (ties into DS36),
- revision when new datasets arrive (ties into DS34).

---

## 5. URC linkage (DS49/DS50/DS51/DS52)

Numeric modeling becomes implementable (and auditable) only when anchored in URC contracts:

- **Typed Content IR (DS49):** numeric constraints and equations should be represented in a normalized, typed Content form.
- **Deterministic compilation artifacts (DS50):** when a fragment is compilable, emit a stable SMT-LIB2 artifact and attach it as Evidence/Artifact.
- **Units (DS49 + DS37):** unit checks happen upstream of compilation; failures should become explicit artifacts (with provenance) rather than silent coercions.
- **Goals (DS49):** estimation/fit is a Goal with budgets, tolerances, and required evidence outputs (residuals, witness/model, or unsat reasons).
- **Backends (DS52):** route to SMT/ILP/CP/ODE solvers via capability registry; keep a uniform evidence interface regardless of backend.
- **Packs (DS51):** domain-specific numeric vocab (constants, unit systems, model libraries) must live in explicit packs.

---

*End of DS37*
