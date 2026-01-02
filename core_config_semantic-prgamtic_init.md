# AGISystem2 Core/Config Initialization (Semantic + Pragmatic) — Report
**Status:** Snapshot (research project; subject to refactor)  
**Audience:** Core maintainers, DS authors  
**Related DS:** DS49 (URC), DS51 (Config Taxonomy), DS73 (Migration Plan)

## 1. Purpose
This report explains what is defined in:
- **runtime code** (the executable core mechanics), versus
- **config packs** (Sys2DSL semantic libraries),
and how a session is initialized in the current repository layout.

This file is intentionally descriptive (what exists today), not a long-term prescription. The long-term direction is URC-first (DS49/DS73).

## 2. Current config layout (what exists on disk)
The repo uses a pack-based layout:

- `config/Packs/*` — Sys2DSL libraries (“semantic packs”).
- `config/runtime/reserved-atoms.json` — runtime-reserved atoms that must exist across sessions/strategies.

Legacy note:
- Directories like `config/Core` and `config/Constraints` are not used in the current layout. Evaluation-only helpers live under `evals/`.

## 3. What is “runtime core” (code-owned)
Runtime code provides the general execution substrate:
- **Parsing / execution:** Sys2DSL lexer/parser, graph execution, scope handling.
- **Session model:** session universe, isolation boundaries, in-memory KB store, scope/transaction handling.
- **Vector substrate:** HDC strategies (Dense / EXACT / Sparse / EMA variants) and vector operations.
- **Reasoning backends:** symbolic query/prove/findAll, holographic candidate retrieval, CSP/planning modules.
- **Strict semantic enforcement hooks:** canonicalization and “declarations must be persistent” behavior (DS19 direction).

Runtime core is meant to remain **small, general, and domain-agnostic**.

## 4. What is “semantic core” (pack-owned)
Semantic behavior that depends on vocabulary or declarative properties is hosted in packs under `config/Packs/`.

Examples of what packs provide:
- **typed constructors / structural operators** (Bootstrap)
- **relation properties** (e.g., transitive/symmetric/inheritable tags; Relations)
- **logic and quantifiers** (Logic)
- **temporal/modal vocab** (Temporal, Modal)
- **defaults and macro helpers** (Defaults, Properties, Reasoning)
- **canonicalization and contradiction primitives** (Canonicalization, Consistency)
- **URC contract surfaces** (URC): pragmatics/content/goals/evidence/provenance/policy/artifacts/type/unit/verifier

In URC direction, packs are the canonical place for:
- domain vocabulary,
- solver preferences/capabilities (as facts),
- and any semantics that should be inspectable/auditable in the KB.

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

## 6. “Kernel” vs explicit packs
`config/Packs/Kernel/index.sys2` is a legacy aggregate manifest that loads a broad standard library set.

Direction (DS51/DS73):
- Treat “Kernel” as compatibility glue, not as a special hard-coded core.
- Prefer explicit pack loading by tools/evals/apps.

## 7. “Constraints” and CSP helpers (where they live)
Constraint programming is implemented in runtime (`src/reasoning/csp/*`), but:
- modeling conveniences and puzzle-specific vocabulary belong in **packs**.

Current repo split:
- evaluation-only CSP modeling helpers: `evals/domains/CSP/*`
- evaluation scenarios: `evals/fastEval/suite11_wedding_seating`, `evals/fastEval/suite30_csp_minis`

This avoids “eval-driven vocabulary creep” into baseline packs.

## 8. Session initialization patterns
Typical patterns:

### 8.1 Library usage
1) Create a `Session`.
2) Load packs explicitly (`loadPack` / `loadCore` as a compatibility shortcut).
3) Execute `learn/query/prove/...`.

### 8.2 KBExplorer
KBExplorer creates a new session per page load and loads a baseline set of packs.
The user can change the loaded pack set via UI (`Packs…`), and the session restarts.

See DS48 for the UI/HTTP contract and DS51 for the taxonomy rationale.

## 9. URC alignment checkpoint
The current codebase already contains:
- a URC pack under `config/Packs/URC/*` (DS49 anchor),
- a pack taxonomy under `config/Packs/*` (DS51),
- an eval policy trend toward suite-local vocabularies (DS73/DS74).

Still incomplete for end-to-end URC:
- policy materialization (`Current`/`Supersedes`) as a first-class runtime service,
- provenance capture for NL→DSL stored as facts,
- deterministic compilation artifacts (DS50) integrated into orchestrated runs,
- verifier hooks that can upgrade evidence trust.

