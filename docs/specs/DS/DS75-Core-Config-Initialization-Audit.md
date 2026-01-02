# AGISystem2 - System Specifications
#
# DS75: Core/Config Initialization Audit (Semantic + Pragmatic)
#
**Document Version:** 0.1  
**Status:** Audit Snapshot (research project; subject to refactor)  
**Audience:** Core maintainers, DS authors  
**Related DS:** DS49 (URC), DS51 (Config Taxonomy), DS73 (Migration Plan)  

---

## 1. Purpose

This DS explains what is defined in:

- **runtime code** (the executable, domain-agnostic core mechanics), versus
- **config packs** (Sys2DSL semantic libraries),

and how a session is initialized in the current repository layout.

This document is descriptive (what exists today), not a long-term prescription. The long-term direction is URC-first (DS49/DS73).

---

## 2. Current config layout (what exists on disk)

The repo uses a pack-based layout (DS51):

- `config/Packs/*` — Sys2DSL libraries (“semantic packs”).
- `config/runtime/reserved-atoms.json` — runtime-reserved atoms that must exist across sessions/strategies.

Legacy note:

- Directories like `config/Core` and `config/Constraints` are not used in the current layout.
- Evaluation-only helpers live under `evals/`.

---

## 3. What is “runtime core” (code-owned)

Runtime code provides the general execution substrate:

- **Parsing/execution:** Sys2DSL lexer/parser, graph execution, scope handling.
- **Session model:** session isolation boundaries, in-memory KB store, scope/transaction handling.
- **Vector substrate:** HDC strategies (Dense / EXACT / Sparse / EMA variants) and vector operations.
- **Reasoning backends:** symbolic query/prove/findAll, holographic candidate retrieval, CP/CSP and planning modules.
- **Strict semantic enforcement hooks:** canonicalization and “declarations must be persistent” behavior (DS19 direction).

Runtime core is intended to remain **small, general, and domain-agnostic**.

---

## 4. What is “semantic core” (pack-owned)

Semantic behavior that depends on vocabulary or declarative properties is hosted in packs under `config/Packs/`.

Examples of what packs provide:

- structural operators and typed constructors (Bootstrap)
- relation/operator properties (Relations/Properties)
- logic and quantifiers (Logic)
- temporal/modal vocab (Temporal, Modal)
- defaults and macro helpers (Defaults, Reasoning)
- canonicalization and contradiction primitives (Canonicalization, Consistency)
- URC contract surfaces (URC): pragmatics/content/goals/evidence/provenance/policy/artifacts/type/unit/verifier

In URC direction (DS49), packs are the canonical place for:

- domain vocabulary,
- solver preferences/capabilities (as inspectable facts),
- and any semantics that should be auditable in the KB/KBExplorer.

---

## 5. Reserved atoms (cross-session invariants)

`config/runtime/reserved-atoms.json` defines atoms that must exist consistently:

- positional atoms (e.g., `Pos1..Pos20`)
- ceilings/sentinels:
  - `BOTTOM_IMPOSSIBLE`
  - `TOP_INEFFABLE`
- structural runtime markers:
  - `__EMPTY_BUNDLE__`
  - `__CANONICAL_REWRITE__`

These are runtime-owned invariants and are not intended to be redefined by domain packs.

---

## 6. “Kernel” vs explicit packs

`config/Packs/Kernel/index.sys2` is a legacy aggregate manifest that loads a broad standard library set.

Direction (DS51/DS73):

- Treat “Kernel” as compatibility glue, not as a hard-coded core.
- Prefer explicit pack loading by tools/evals/apps.

---

## 7. “Constraints” and CP/CSP helpers (where they live)

Constraint programming is implemented in runtime (`src/reasoning/csp/*`), but modeling conveniences and puzzle-specific vocabulary belong in packs.

Current repo split:

- evaluation-only CSP modeling helpers: `evals/domains/CSP/*`
- evaluation scenarios: `evals/fastEval/suite11_wedding_seating`, `evals/fastEval/suite30_csp_minis`, `evals/fastEval/suite31_csp_alldifferent`

This avoids “eval-driven vocabulary creep” into baseline packs.

---

## 8. Session initialization patterns

### 8.1 Library usage

1) Create a `Session`.  
2) Load packs explicitly (`loadPack`) or use `loadCore` as a compatibility shortcut.  
3) Execute `learn/query/prove/...`.

### 8.2 KBExplorer

KBExplorer creates a new session per page load and loads a baseline set of packs.

URC alignment features:

- `Session.executeNL()` provides a single entrypoint for NL→DSL execution plus provenance capture.
- KBExplorer exposes derived audit views (e.g., `/api/policy/view`) and URC inspection (`/api/urc/*`).

See DS48 for the UI/HTTP contract and DS73 for the migration plan.

---

## 9. URC alignment checkpoint

Already present:

- URC pack under `config/Packs/URC/*` (DS49 anchor)
- pack taxonomy under `config/Packs/*` (DS51)
- eval policy trend toward suite-local vocabularies (DS73/DS74)

Still incomplete for end-to-end URC:

- policy ranking/materialization as persisted `Current`/`Supersedes` facts (default remains derived view)
- deterministic compilation integrated into orchestrated runs for multiple targets beyond SMT-LIB2 (DS50 roadmap)
- verifier hooks that upgrade evidence trust (DS49/VerifierCore)

