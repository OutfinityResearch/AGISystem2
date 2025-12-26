# Semantic Unification (DS19) — Implementation Plan

**Status:** draft, working plan (non-normative)  
**Links:** `docs/specs/DS/DS19-Semantic-Unification.md`  
**Goal:** reach canonicalization + “proof-real” outputs for both engines (symbolicPriority and holographicPriority)

---

## 1) Target outcome (definition of “done”)

1. Any DSL input (learn/prove/query) goes through a **single deterministic canonicalization** step.
2. **Semantically equivalent facts** (encoded through different DSL forms) end up in the same canonical representation:
   - identical canonical metadata (normalized operator/args),
   - identical HDC vectors, or equivalently explainable via an explicit canonical step (e.g., alias-map).
3. `Session.prove(...)` returns a **verifiable proof object** (offline-validatable) for:
   - symbolic reasoning,
   - holographic reasoning (HDC-first) with an explicit symbolic validation step.
4. Relation properties (transitive/symmetric/reflexive/…) are **theory-driven** (derived from loaded `config/Core/*.sys2`), not from hardcoded JS lists or opaque fallbacks.
5. DS19 tests exist to prevent regressions (canonical equivalence, proof validation, dual-engine consistency).

---

## 2) Current code check (short status)

| Area | Observation | Why it matters for DS19 |
|---|---|---|
| `src/runtime/executor.mjs` | Builds vectors + metadata, but lacks an explicit canonicalization stage for AST/metadata before committing facts. | Equivalent facts can end up with different vectors/metadata → breaks “semantic unification”. |
| `src/reasoning/prove.mjs` + `src/reasoning/holographic/prove-hdc-first.mjs` | Returns results with `steps`, `confidence`, `method`, but no unified proof schema + robust validator. | DS19 requires “proof real” with the same schema across engines. |
| `src/reasoning/transitive.mjs` | Loads some relation properties from `config/Core/00-relations.sys2`, but also uses hardcoded defaults. | DS19 requires theory-driven properties without semantic-changing hardcoding. |
| `config/Core/*.sys2` | Contains relations/roles/properties and macros (graphs). | We can extract theory metadata for canonicalization (alias, properties, templates). |

---

## 3) Target architecture (new components / refactor)

### 3.1 Proposed modules

| Module | Role | Integration |
|---|---|---|
| `src/runtime/canonicalize.mjs` | Canonicalizes AST + metadata: alias/synonym, Not normalization, typed atoms, macro normalization. | Called in `Session.learn`, `Session.query`, `Session.prove` before execution/proving. |
| `src/runtime/semantic-index.mjs` | Deterministic index derived from theories: operator properties, alias-map, templates, semantic classes. | Built while loading core theories; used by canonicalizer + reasoners. |
| `src/runtime/builtins.mjs` | Executable L0 `___*` implementations (NewVector/Bind/Bundle/Similarity/MostSimilar/…). | Used by executor (learn-time) and macro-expansion if theories use builtins. |
| `src/reasoning/proof-schema.mjs` | Defines the unified proof-object schema + builder helpers. | Used by both engines + the validator. |
| `src/reasoning/proof-validator.mjs` | Validates proof objects: fact/rule references, transitive steps, synonyms, defaults, negation. | Used in debug/CI/tests; optionally in runtime (flag). |

### 3.2 Target flows

1. **Learn**
   - parse DSL → AST
   - canonicalize AST (via semantic index) → canonical AST + canonical metadata
   - executor evaluates L0 builtins (if present) and persists facts with stable canonical metadata
2. **Prove/Query**
   - parse goal → canonicalize goal (same rules as Learn)
   - rule engine operates on canonical metadata (and alias-map when needed)
   - returns a proof object conforming to `proof-schema`
   - validator can re-check the proof without rerunning the search (replayable)

---

## 4) Workstreams (parallelizable)

### WS-A — Meta-model in theory (config/Core)

**Objective:** express (and extract from) `*.sys2` the metadata needed for canonicalization.

Deliverables:
- minimal convention for:
  - `__TransitiveRelation`, `__SymmetricRelation`, `__ReflexiveRelation`, `__InheritableProperty` (already exist),
  - `synonym` (already exists as macro/role) + defining a *canonical representative* (e.g., `@canonicalName`),
  - typed atoms (e.g., `__Person`, `__Place`, …) and canonical constructors (e.g., `__Named`),
  - canonical macro templates per semantic class (e.g., Communication).

### WS-B — Canonicalizer + SemanticIndex (runtime)

**Objective:** a single place that decides “what canonical looks like”.

Deliverables:
- `SemanticIndex` populated deterministically from loaded core theories (no hardcoded heuristics).
- Canonicalizer care:
  - normalizes `Not`,
  - applies alias/synonym mapping,
  - applies canonical macro templates (or rejects in `enforceCanonical`),
  - normalizes atom names + types (atom discipline).

### WS-C — Executable L0 builtins `___*` (runtime/executor)

**Objective:** if a theory uses `___*`, runtime must execute it or fail deterministically.

Deliverables:
- map `builtinName -> function` cu:
  - consistent truthy parsing for flags (e.g., debug / strict modes),
  - determinism for `___NewVector(name, theoryId)` (seeded).

### WS-D — Proof schema unificat + validator (reasoning)

**Objective:** a shared “proof-real” format across engines.

Deliverables:
- schema + `ProofBuilder`
- `ProofValidator` (offline, no search) that verifies:
  - `fact` steps reference KB entries (via `id` or canonical metadata),
  - `rule` steps reference existing `Implies` rules,
  - `transitive` chains are justified by a property from the semantic index,
  - `synonym` steps are justified by synonym/alias mapping,
  - a `validation` step is present in holographic mode.

### WS-E — Teste + EvalSuite hooks

**Objective:** prevent divergence and measure progress.

Deliverables:
- unit tests (DS19) for:
  - canonical equivalence,
  - proof validation,
  - dual-engine consistency.
- later: EvalSuite scenarios that validate canonical/proof invariants at larger scale.

---

## 5) Phased roadmap (dependencies & exit criteria)

### Phase 0 — Stabilize interfaces (1–2 days)

| Task | Depinde de | Output |
|---|---|---|
| Define minimal `proof-schema` (structure + types) | none | `src/reasoning/proof-schema.mjs` |
| Define the `SemanticIndex` API (exposed properties) | none | `src/runtime/semantic-index.mjs` (skeleton) |
| Add DS19 tests as `todo` (do not block CI yet) | none | new files under `tests/unit/semantic-unification/` |

Exit:
- DS19 tests exist and run (todo), with no import errors.

### Phase 1 — Real SemanticIndex (2–4 days)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Load/scan core theories for meta (relations/synonyms/templates) | Phase 0 | `src/runtime/semantic-index.mjs`, `src/runtime/session.mjs` |
| Remove the hardcoded fallback for relation properties (or make it explicitly “dev-only”) | working cache | `src/reasoning/transitive.mjs`, `src/reasoning/*` |

Exit:
- `TRANSITIVE_RELATIONS` and similar come from a cache derived from loaded theories.

### Phase 2 — Canonicalizer (3–6 days)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Canonicalize `Not` (ref vs inline) into a single representation | Phase 1 | `src/runtime/canonicalize.mjs`, `src/runtime/executor.mjs` |
| Canonicalize alias/synonym (metadata + proof steps) | Phase 1 | `src/runtime/canonicalize.mjs`, `src/reasoning/*` |
| Canonicalize typed atoms (`__*`/`___*` discipline) | Phase 1 | `config/Core/00-types.sys2`, `config/Core/02-constructors.sys2`, canonicalizer |

Exit:
- two equivalent DSL formulations produce identical canonical metadata (DS19 test becomes active).

### Phase 3 — Executable L0 builtins (2–5 days)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Introduce executor builtins map for `___*` | Phase 2 | `src/runtime/builtins.mjs`, `src/runtime/executor.mjs` |
| Fail-fast on unknown builtin | Phase 2 | `src/runtime/executor.mjs` |
| Determinism for `___NewVector` (seeded) | Phase 2 | `src/runtime/builtins.mjs` |

Exit:
- core theories can use `___*` without silently producing garbage vectors.

### Phase 4 — Unified proof + Validator (4–8 days)

| Task | Depinde de | Modificări probabile |
|---|---|---|
| Unify outputs between `ProofEngine` and `HolographicProofEngine` | Phase 0/2 | `src/reasoning/prove.mjs`, `src/reasoning/holographic/prove-hdc-first.mjs` |
| Implement `ProofValidator` (replayable) | schema stabilă | `src/reasoning/proof-validator.mjs` |
| Introduce a mandatory `validation` step in holographic mode | unification | `src/reasoning/holographic/prove-hdc-first.mjs` |

Exit:
- `validate(proof, sessionSnapshot)` returns true for valid results; DS19 tests become active.

### Phase 5 — Gradual enablement + EvalSuite (ongoing)

| Task | Depinde de | Output |
|---|---|---|
| Feature flags `SYS2_CANONICAL=1` + `SYS2_PROOF_VALIDATE=1` | Phases 2/4 | runtime changes |
| Incremental migration of theory files to the new conventions | Phase 2/3 | `config/Core/*.sys2` |
| FastEval scenarios for canonical/proof invariants | Phases 2/4 | `evals/fastEval/*` |

Exit:
- canonical/proof validation ON by default in CI.

---

## 6) Concrete proposed changes in `config/Core/*` (minimum for DS19)

| File | Proposed change | DS19 rationale |
|---|---|---|
| `config/Core/00-relations.sys2` | Add meta for relation properties (e.g., `__TransitiveRelation` already exists) + optionally a stable “registry” format consumable by a cache. | Reasoner must read properties from theory, not JS. |
| `config/Core/10-properties.sys2` | Clarify/standardize `synonym` (canonical vs alias) + proof-step rules for alias expansion. | Synonyms must become explicit proof steps. |
| `config/Core/02-constructors.sys2` | Introduce/standardize typed atom constructors (e.g., `__Named`, `__TypedAtom`). | Avoid arbitrary high-level atoms; enforce discipline. |
| `config/Core/05-logic.sys2` | Standardize `Not` representation (and what negation-as-failure means in Core). | Canonical, validatable negation. |
| `config/Core/12-reasoning.sys2` | Canonical templates for reasoning macros (and semantic classes), used by the canonicalizer. | “Same meaning → same canonical form”. |

---

## 7) Turning DS19 tests from `todo` into “active”

1. Phase 0: tests are `todo` (they define the requirement).
2. After Phase 2: enable canonicalization tests (unskip).
3. After Phase 4: enable proof validation + dual-engine consistency tests.

---

## 8) Risks (and how we control them)

| Risk | Symptom | Mitigation |
|---|---|---|
| Canonicalizer changes behavior significantly | existing tests break | feature flag + compat layer: accept old forms, rewrite to canonical; log warnings. |
| ProofValidator too strict / incomplete | false negatives | start minimal (fact/rule/transitive), extend incrementally; preserve enough `detail` in proof. |
| Alias/synonym ambiguity | two canonical candidates | require a “canonical representative” in theory or a deterministic tie-break rule. |
