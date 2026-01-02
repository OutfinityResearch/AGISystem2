# AGISystem2 - System Specifications
#
# DS74: EvalSuite Audit Guidelines — Realism, Coherence, and URC Alignment
#
**Document Version:** 0.1  
**Status:** Draft / Proposed  
**Audience:** Eval-suite maintainers, reasoning developers  
**Scope:** Quality bar and audit checklist for `evals/fastEval` suites  

---

## 1. Purpose

This DS defines a concrete audit checklist for evaluation suites so that:

- suites test realistic capabilities rather than accidental quirks,
- semantics do not leak into baseline config (DS51),
- suites remain stable while URC backends evolve (DS49/DS52),
- and “one-off” mechanisms are replaced with general contracts (especially CP/CSP).

This DS complements:

- DS14 (EvalSuite Framework) — suite structure and runner behavior
- DS73 (URC Migration Plan) — phase sequencing and suite refactors

---

## 2. Audit checklist (per suite)

### 2.1 Intent and scope

- Identify the primary feature under test (one sentence).
- Identify the URC mapping:
  - fragment(s),
  - backend(s) or orchestrator tactic(s),
  - evidence shapes expected.

### 2.2 Vocabulary hygiene

- Every non-baseline domain symbol must be declared in suite-local `.sys2` files:
  - relations/verbs,
  - domain atoms,
  - inverses/constraints (if any).
- Baseline packs must remain domain-agnostic. If the suite needs new semantics, add them locally.

### 2.3 Correctness criteria

- Prefer checks that validate semantics rather than brittle formatting:
  - binding sets (for query),
  - boolean correctness (for prove),
  - presence of anchoring facts/evidence (minimal proof trace),
  - invariants (e.g. symmetry/transitivity behavior) when explicitly enabled.
- Avoid requiring:
  - a specific internal variable name,
  - a specific proof ordering,
  - or a specific paraphrase, unless the suite is explicitly about phrasing.

### 2.4 No shortcuts / no special cases

- Suites must not rely on runtime code branches that exist only to satisfy that suite.
- If a suite exposes a missing capability, the fix must be:
  - a generic mechanism, documented in DS terms,
  - then the suite updated to use that mechanism.

### 2.5 Evidence and auditability

- If the suite checks a “solver-like” capability, expected output must include:
  - a witness/model or a reason for failure,
  - and a minimal evidence anchor (URC evidence kind + provenance link) once URC is implemented.

---

## 3. CSP/CP-specific rules

### 3.1 General CP solve mechanism

Suites must use a general CP solve interface (DS55), not a scenario-named solve type:

- solve input: variables/domains/constraints
- solve output: witness assignments as `Model` evidence (and future `UnsatCore`/`Trace`)

### 3.2 Wedding seating is a modeling case, not a primitive

“Wedding seating” may remain as:

- an Appendix example in DS16,
- and a scenario inside a CP suite,

but must not be a special runtime solve mode.

---

## 4. Output: suite audit note

Each suite should ship a short `AUDIT.md` in its suite directory containing:

- intent + URC mapping,
- list of local theory files,
- assumptions/limitations,
- planned refactors (if any).

