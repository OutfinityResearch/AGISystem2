# AGISystem2 - System Specifications
#
# DS51: Config Taxonomy — Core vs Domain Packs (and deprecating eval-only theories)
#
**Document Version:** 0.1  
**Status:** Draft / Proposed  
**Audience:** Core maintainers, DS authors, evaluation maintainers  
**Scope:** `config/` structure, load semantics, long-term Core composition  

---

## 1. Purpose

AGISystem2 currently mixes:

- long-lived universal semantics (Core),
- evaluation convenience layers (constraints puzzles, stress corpora helpers),
- and experimental/roadmap semantics.

This DS proposes a stable taxonomy for configuration modules so the system can evolve toward a serious URC core (DS49) without breaking:

- determinism,
- tests/evals,
- or user mental models.

---

## 2. Current repository state (observed)

Config directories:

- `config/Packs/Bootstrap/*.sys2` — canonical location of foundational typed constructors + structural operators
- `config/Packs/Kernel/index.sys2` — legacy aggregate manifest (compatibility; prefer explicit packs)
- `config/Packs/Relations/*.sys2` — relation property declarations (transitive/symmetric/etc)
- `config/Packs/Logic/*.sys2` — logic connectives and quantifiers
- `config/Packs/Temporal/*.sys2` — temporal relations
- `config/Packs/Modal/*.sys2` — modal operators
- `config/Packs/Defaults/*.sys2` — default reasoning
- `config/Packs/Properties/*.sys2` — property/state macros
- `config/Packs/Numeric/*.sys2` — numeric helpers
- `config/Packs/Semantics/*.sys2` — semantic primitives (L2)
- `config/Packs/Lexicon/*.sys2` — convenience verbs (L3)
- `config/Packs/Reasoning/*.sys2` — reasoning macros (L3)
- `config/Packs/Canonicalization/*.sys2` — canonical/alias infrastructure (DS19)
- `config/Packs/Consistency/*.sys2` — contradiction primitives (DS19)
- `config/Packs/URC/*.sys2` — canonical location of the URC semantic contract primitives (DS49)
- `evals/domains/CSP/*.sys2` — evaluation-only CSP/constraints helpers
- `config/runtime/*` — non-DSL runtime configuration (e.g., reserved atoms)

Legacy note:
- `config/Core` and `config/Constraints` are not used; semantic theories live under `config/Packs/*`, and evaluation-only helpers live under `evals/`.

Observed intent mismatches (still relevant for future split into smaller packs):

- stress corpora require compatibility helpers, but those must live under `evals/` (not packs).
- test/eval convenience vocabulary must not be promoted into packs (avoid “eval-driven vocabulary creep”).
- `evals/domains/CSP/*` contains domain-alias graphs and value vocabulary for constraint puzzles.

These are valuable for eval coverage, but they are not necessarily “universal Core” for the long horizon.

---

## 3. Proposed taxonomy (v1)

### 3.1 Runtime Core (minimal, universal, stable)

Runtime Core should contain only constructs that are:

- required for parsing/executing Sys2DSL in a general way (runtime builtins),
- required for session isolation, storage semantics, and orchestration (URC),
- independent of any particular domain vocabulary or evaluation suite.

Runtime Core examples (code-owned):

- session universe / IoC (DS26),
- HDC strategies + facade,
- reasoning engines as backends (symbolic / holographic / CSP),
- URC storage semantics (DS49) and trace hooks (DS34/DS42).

**DS19 strictness note (important):**
- “Operator property tags” (e.g. `__TransitiveRelation`, `__SymmetricRelation`, `__InheritableProperty`) are treated as **declarations**.
- Under `enforceCanonical` mode, such declarations must be **persisted into KB** (e.g. `@:isA_transitive __TransitiveRelation isA`), otherwise they are rejected.
- This is intentional: non-persistent declarations have no durable effect on session semantics and lead to confusing “it works only in some suites” behavior.

### 3.2 Domain Packs (optional, explicit load)

Domain Packs are loadable theory modules that provide:

- the standard library packs (Bootstrap/Relations/Logic/Temporal/Modal/Defaults/Properties/Numeric/Semantics/Lexicon/Reasoning),
- domain vocabulary and aliases,
- domain rules and procedures,
- evaluation/corpus-specific helpers,
- compilation adapters and solver preferences (as facts).

Domain Packs must be loaded explicitly (by user, orchestrator, or eval harness).

### 3.3 Runtime config (non-DSL)

Non-DSL runtime config stays separate:

- reserved atoms (`PosN`, `BOTTOM_IMPOSSIBLE`, `TOP_INEFFABLE`)
- safety toggles / feature flags

This prevents “mandatory internals” from becoming semantic claims.

---

## 4. Proposed directory layout (compatible migration)

Current stable layout (URC direction):

```
config/
  Packs/
    Bootstrap/          # typed constructors + structural ops (minimal, universal)
    Kernel/             # legacy aggregate pack (classic stack; prefer explicit packs)
    Relations/          # relation property declarations (transitive/symmetric/etc)
    Logic/              # logic connectives and quantifiers
    Temporal/           # temporal relations
    Modal/              # modal operators
    Defaults/           # default reasoning
    Properties/         # property/state macros
    Numeric/            # numeric helpers
    Semantics/          # semantic primitives (L2)
    Lexicon/            # convenience verbs (L3)
    Reasoning/          # reasoning macros (L3)
    Canonicalization/   # canonical/alias infrastructure (DS19)
    Consistency/        # contradiction primitives (DS19)
    URC/                # URC primitives (pragmatics/content/goals/evidence/orchestration)
  runtime/
    reserved-atoms.json
```

Compatibility strategy:

Research-first: remove legacy paths early; fix eval suites as needed.

---

## 5. Kernel aggregate refactor (make Runtime Core truly minimal)

Target direction: **all semantic `.sys2` theory content moves into packs**. Runtime Core remains intelligible and audit-friendly.

### 5.0 Current standard library packs (current state)

`config/Packs/Kernel` is now a legacy **aggregate manifest**. The actual semantic content is split into explicit packs:

| Pack | Canonical path | Notes |
|---|---|---|
| Bootstrap | `config/Packs/Bootstrap` | Required by most other packs |
| Relations | `config/Packs/Relations` | Relation property declarations |
| Logic | `config/Packs/Logic` | Logic primitives |
| Temporal | `config/Packs/Temporal` | Temporal primitives |
| Modal | `config/Packs/Modal` | Modal primitives |
| Defaults | `config/Packs/Defaults` | Non-monotonic defaults |
| Properties | `config/Packs/Properties` | Property/state macros |
| Numeric | `config/Packs/Numeric` | Numeric helpers |
| Semantics | `config/Packs/Semantics` | L2 semantic primitives |
| Lexicon | `config/Packs/Lexicon` | L3 convenience verbs |
| Reasoning | `config/Packs/Reasoning` | Reasoning macros |
| Canonicalization | `config/Packs/Canonicalization` | Aliases/canonicalization (DS19) |
| Consistency | `config/Packs/Consistency` | Contradiction primitives (DS19) |
| URC | `config/Packs/URC` | Storage/evidence/orchestration contract (DS49) |

Evaluation-only helpers:

| Module | Canonical path | Classification |
|---|---|---|
| Stress compat | `evals/stress/theories/stress-compat.sys2` | Eval-only theory |

### 5.1 Stress corpus helpers

- historical: `config/Packs/Kernel/15-stress-compat.sys2` → `evals/stress/theories/stress-compat.sys2`

Rationale:
- explicitly tied to corpora rather than universal semantics.

### 5.2 Evaluation convenience relations

The following are plausible “CommonLexicon” (pack) rather than Core:

- family/social convenience (`parent`, `child`, `loves`, `hates`, `owns`, `trusts`)
- alias-only helpers that exist mainly for tests/evals

Rationale:
- universal Core should not expand indefinitely to satisfy eval suite vocabulary.

### 5.3 Optional modeling helpers

- `evals/domains/CSP/*` is an eval-only set of optional CSP/puzzle modeling helpers.

---

## 6. DS alignment work (what documents must change)

If the taxonomy is adopted, the following DS documents need updates:

- DS07 (Core Theory Index): redefine what “Core” means long-term and what is an optional pack.
- DS49 (URC): reference packs as the primary source of domain vocabulary and solver preferences.
- DS48 (KBExplorer): browsing categories should reflect Core vs Packs explicitly.
- DS34 (Provenance/Revision): reference pack provenance as a first-class source dimension.
- DS50 (Compilation SMT): backends and compilation preferences should be pack-defined, not hard-coded.

---

## 7. Evaluation policy

Evals should be treated as:

- consumers of Core + selected packs,
- not as the driver of expanding Core semantics.

Therefore:

- when an eval requires a relation/alias, it should load a pack,
- Core should remain small and principled to avoid semantic drift.

---

## 8. Migration plan (phased, non-breaking)

### Phase 0: Documentation + classification

- Keep repo behavior unchanged.
- Publish the Keep/Pack/Review table (Section 5.0).
- Update DS indices to reference this taxonomy (DS07, DS49).

### Phase 1: Introduce packs (**implemented**)

- `config/Packs/Kernel` created as the canonical location of the default theory library.
- `evals/domains/CSP` created as the evaluation-only location of CSP helper theories.
- Evals/tests updated to load packs explicitly (fix-ups are acceptable during research).

### Phase 2: Remove semantic `.sys2` auto-load from Runtime Core

Target behavior:

- Runtime Core bootstraps only runtime-reserved atoms and code-owned builtins.
- Semantic libraries are loaded explicitly as packs (Kernel + domain packs).

### Naming note: “Constraints” ambiguity

In this codebase, “constraints” appears in two different senses:

- `config/Packs/Consistency/14-constraints.sys2`: generic contradiction primitives (semantic mechanism; not runtime-core).
- `evals/domains/CSP/*`: evaluation-only constraint/puzzle modeling aliases and value vocabulary.

In a long-term taxonomy, these should not share the same label. Recommended rename (pack-level only):

- `evals/domains/CSP` for the evaluation-only puzzle/domain helpers,
- keep “constraints” as a generic term for contradiction/consistency mechanisms (hosted in `config/Packs/Consistency`, not runtime core).

### Phase 3: Move all non-core modules to packs

Once packs exist and evals load them explicitly:

- remove stress-corpus helpers and convenience verbs from Core index,
- keep those modules as packs only,
- keep the runtime default core small and stable.

### Phase 4: Remove legacy paths (**implemented early**)

- `config/Core` and `config/Constraints` legacy theory paths are removed; only `config/Packs/*` remains.

---

## 9. Runtime Core candidate policy (initial, concrete)

The following guidance is intended to stop “eval-driven vocabulary creep” while preserving universal reasoning capability.

### 9.1 Relations that likely belong to Runtime Core

- structural / meta: `isA`, `hasProperty`, `hasState`, `partOf`, `locatedIn`, `before`, `after`
- generic causality/modality hooks: `causes`, `enables`, `prevents`, `requires`
- generic contradiction/index relations used by runtime: `mutuallyExclusive`, `inverseRelation`, `contradictsSameArgs`

### 9.2 Relations that likely belong to packs (examples)

- social/family conveniences: `parent`, `child`, `loves`, `hates`, `trusts`, `owns`
- puzzle-specific aliases: `safe`, `unsafe`, `boatCapacity`, `mustBe`, etc.
- corpora-specific operators: `StressCompat` graphs and context tagging (keep under `evals/`, not packs)

The long-term rule is:

- Runtime Core defines mechanisms, not an ever-growing open-domain lexicon.
- Domain Packs define vocabulary and policies for their domains.

---

*End of DS51*
