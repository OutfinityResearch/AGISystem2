# AGISystem2 - System Specifications
#
# DS73: URC Migration Plan — Packs, Storage Semantics, Orchestrator, Backends, Evals
#
**Document Version:** 0.1  
**Status:** Draft / Proposed  
**Audience:** Core maintainers, reasoning developers, eval-suite maintainers  
**Scope:** Implementation plan toward DS49 URC as the primary architecture  

---

## 1. Purpose

This DS is the execution plan for moving decisively toward:

- DS49 (Universal Reasoning Core / URC),
- DS51 (Pack taxonomy),
- DS50 (SMT-LIB2 compilation core),
- DS52 (reasoning backends roadmap).

The plan is documentation-first and aims to avoid “eval-driven semantics”: evaluation suites must ship their own domain vocabularies and constraints.

## 1.1 Current implementation delta (as of 2026-01-02)

Already aligned:
- URC pack skeleton exists under `config/Packs/URC/*` (Pragmatics/Content/Goal/Capability/Evidence/Metric/Orchestrator).
- Eval policy direction is enforced in practice for CSP modeling helpers: `evals/domains/CSP/*` is eval-only.
- Suite 11 CP generalization is implemented (`solve csp`), and `suite30_csp_minis` / `suite31_csp_alldifferent` exist.
- DS19 strict-mode “declaration must be persistent” is now respected by baseline operator property tags.
- Inheritance semantics are now pack-driven (no JS fallback lists): baseline tags `can/has/knows` as inheritable; eval-only vocab (e.g., `likes`, `equal`) is declared under `evals/domains/*`.
- Runtime wiring exists in v0 form for URC audit surfaces:
  - `Session.executeNL()` helper for consistent NL→DSL execution + provenance recording.
  - In-memory URC stores for artifacts/evidence (hashing, formats).
  - Derived policy view materialization (`/api/policy/view` in KBExplorer).
  - KBExplorer endpoints for URC inspection (`/api/urc/*`).
  - KBExplorer UI tree includes “Reasoning (URC)” categories (Artifacts/Evidence/Provenance) and a policy view node.
  - CSP solve blocks emit CSP URC audit records (`CSP_JSON_V0` + per-solution evidence/artifacts).
  - Orchestrator supports `FallbackTo` chains and records backend-selection decisions as provenance entries.

Still missing / incomplete relative to DS49:
- URC runtime wiring is still partial: policy ranking, verified evidence hooks, and end-to-end determinism across all backends (including solver output parsing) are not yet implemented.
- Runtime services are MVP-level: policy is derived (not injected as persisted KB facts by default), and evidence/provenance materialization is best-effort and backend-dependent.
- Baseline “Kernel pack” is still treated as the default library load; long-term it should become compatibility glue only (explicit pack loading becomes the norm).
- Orchestrator selection is still v0: it consults `PreferBackend` facts when present but does not yet score or chain fallbacks (`FallbackTo`) beyond simple selection.
  - Note: `FallbackTo` is now supported as a shallow chain, but full scoring and evidence-driven selection remain future work.

---

## 2. Guiding rules

1. **URC is a contract, not a single engine.** Existing engines remain as backends/strategies (EXACT/HDC/CSP), but must emit URC-shaped artifacts/evidence.
2. **Truth vs. index split is strict.** Persisted slot facts are truth-candidates; bundles/superpositions/postings are derived indices (rebuildable).
3. **Auditability is mandatory.** Results must be anchored in evidence/artifacts/provenance; no invented explanations.
4. **Baseline packs stay minimal.** Domain-specific relations, inverses, and convenience macros live in domain/eval packs.
5. **No-delete KB growth.** Revision uses `negates` links plus a derived policy view (`currentFactIds`, `supersedes`) rather than destructive edits.

---

## 3. Phase 0 — Spec + pack anchoring (completed)

Deliverables:

- URC Sys2DSL pack: `config/Packs/URC/index.sys2` (DS49 anchor)
- Pack taxonomy split: `config/Packs/*` (DS51 alignment)
- Research roadmap backends: DS52–DS72
- Eval runner moves away from hard-coded Kernel file lists and uses explicit pack loading

---

## 4. Phase 1 — Storage semantics (truth store + indices)

Goal: implement DS49 “dual-store semantics” concretely.

### 4.1 Persisted facts surface

- Define the canonical persisted “fact record” in runtime:
  - operator + args (typed, deterministic)
  - source/provenance link
  - session-local id (or canonical id if enabled)
- Clarify what is a persisted fact vs. a derived record vector.

### 4.2 Derived indices as rebuildable

- Enforce rebuildability for:
  - KB superposition bundles
  - EXACT postings / bit indices
  - compiled artifacts cache
- Establish an index rebuild entrypoint (per session) and a policy for invalidation.

---

## 5. Phase 2 — Policy + provenance + evidence (audit surface)

### 5.1 PolicyCore (Current view)

- Implement policy materialization as first-class runtime service:
  - derived `currentFactIds`
  - derived `supersedes` edges (`new -> old`)
- Start with a deterministic default policy (DS49).

### 5.2 ProvenanceCore

- Record NL→DSL interpretation as provenance:
  - source id + spans
  - candidate parses + confidence
  - normalizations applied (canonicalization, units)
- Store provenance in-memory by default (inspectable in KBExplorer via `/api/urc/*`).
  - Derived audit-line materialization is optional (`@_ Set urcMaterializeFacts True`) and must not be injected into the KB truth store.

### 5.3 EvidenceCore + artifacts

- Normalize all engine outputs into `Evidence` + `Artifact` shapes (URC pack):
  - `Model`, `UnsatCore`, `ProofLog`, `Trace`, `Invariant`, `DualCert`, `Bounds`, `Residual`, `Confidence`, `Samples`, `HashCount`
- Ensure user-facing answers reference evidence, not ad-hoc strings.

---

## 6. Phase 3 — Orchestrator (fragment classifier + backend selection)

### 6.1 Fragment classification

- Introduce a classifier that tags content with fragment atoms:
  - baseline: `Frag_Bool`, `Frag_SMT_LIA/LRA`, `Frag_CP`, `Frag_TS`
  - research placeholders: `Frag_Eq`, `Frag_AI`, `Frag_HashCount`, etc.
- Persist `FragmentTag(content, frag)` as an auditable fact.

### 6.2 Capability registry

- Represent backend capabilities as facts:
  - `supportsGoal`, `supportsFragment`, `producesEvidence`, `isExact`, `isApprox`, `hasCostModel`
- Add preference mapping facts (`PreferBackend`) and keep selection inspectable.

### 6.3 Plan objects (steps)

- Standardize planning surfaces (`Plan`, `Step`, `stepInput`, `stepOutput`, `stepStatus`).
- Every orchestrated run must be reproducible from stored artifacts (hashes).

---

## 7. Phase 4 — Deterministic compilation targets

### 7.1 SMT-LIB2 (first target)

- Implement DS50 as a deterministic compiler producing an `Artifact(format=SMTLIB2, hash=...)`.
- Attach compilation provenance:
  - alpha-renaming
  - canonical ordering
  - unit normalization (when implemented)
  - canonical rewrites (when enabled)

### 7.2 Future targets (research)

Roadmap targets (DS52):
- DIMACS (SAT)
- TPTP (ATP)
- MPS/LP/SDPA (optimization)

---

## 8. Phase 5 — Backends as adapters (existing engines retained)

### 8.1 EXACT/HDC query/prove as URC backends

- Wrap existing query/proof APIs as backends:
  - input: Goal + Content + policy view selection
  - output: Evidence + (optional) Artifacts

### 8.2 CP/CSP backend

- Promote the current solver (DS16) into a URC-aligned CP backend (DS55):
  - structured CSP artifact (variables/domains/constraints)
  - witness evidence for solutions
  - infeasible evidence via nogoods/trace (future)

### 8.3 STAR/UNSTAR closure ceilings

- Integrate `TOP_INEFFABLE` / `BOTTOM_IMPOSSIBLE` (DS39/DS49):
  - budget-driven collapse of overly-dense derived monomials to `TOP_INEFFABLE`
  - contradiction collapse to `BOTTOM_IMPOSSIBLE`
- Treat `TOP_INEFFABLE` as an auditable boundary, not a proof.

---

## 9. Phase 6 — Evaluation suites migration (no more config creep)

### 9.1 Strict suite packaging

- Each eval suite must declare its own:
  - domain relations/atoms
  - inverses/constraints (if needed)
  - convenience macros
- Baseline packs are loaded uniformly, then suite-local packs are applied.

### 9.2 Runner invariants

- No unscoped “config file” paths in suites (use `Packs/<packName>/...` or suite-local theories).
- Any externalized theory used only for evals lives under `evals/<suite>/theories/*`.

### 9.3 Suite-by-suite audit protocol (realism, coherence, no shortcuts)

For each suite in `evals/fastEval/suite*`:

1) **State the intent**
   - What capability is being tested (NL→DSL, query/prove, defaults, canonicalization, CP, planning)?
   - Which URC fragment/backends does it correspond to (DS49/DS52)?

2) **Make the vocabulary explicit**
   - Move any domain-only relations/atoms out of baseline packs into suite-local `.sys2` files.
   - Avoid relying on “incidental” operators present in baseline packs.

3) **Make expected behavior realistic**
   - Avoid overfitting to a specific phrasing or a single “magic” proof path.
   - Prefer acceptance criteria that check semantics:
     - answer set correctness (bindings)
     - evidence/proof presence and minimal anchoring facts
     - deterministic normalization invariants (when enabled)

4) **Eliminate suite-specific hardcoding**
   - No “special problem type” parsing in runtime for a single suite.
   - If a feature is needed, define the general mechanism (URC contract), then rewrite the suite to use it.

5) **Record the audit outcome**
   - Each suite gets a short audit note documenting:
     - its local theory file(s)
     - its URC fragment classification
     - known limitations / TODOs

Concrete audit guidelines are maintained by DS74.

### 9.4 CSP suite generalization (Suite 11)

**Status:** Implemented

`suite11_wedding_seating` has been refactored so it does not depend on a one-off solve type:

- Replaced `solve WeddingSeating` with a general CP solve mechanism (`solve csp`):
  - a normalized CSP artifact (variables/domains/constraints)
  - a generic CP backend adapter (DS55)
  - URC evidence surfaces (`Model`/`UnsatCore`/`Trace`) instead of ad-hoc strings
- Keep “wedding seating” only as a modeling case (Appendix / scenario), not as a runtime-special case.

Implementation notes:
- Runtime no longer treats `WeddingSeating` as a special problem type; it is treated as an alias/label only.
- Suite-local modeling helpers live under `evals/domains/CSP/*`, not under baseline packs.

### 9.5 Add a second CP/CSP suite (generic mini-problems)

**Status:** Implemented

Added `suite30_csp_minis` after the generic CP solve mechanism exists:

- small problems with diverse constraint shapes (not wedding-specific), e.g.:
  - map coloring (binary not-equal constraints)
  - small allDifferent/permutation variants (`suite31_csp_alldifferent`)
- focus on:
  - witness extraction correctness
  - UNSAT/infeasible evidence surfaces
  - stability under multiple strategies (EXACT/HDC) without suite-specific hacks

---

## 10. Phase 7 — Deprecate legacy Kernel and hard-coded behavior

Goal: make the old “Kernel is special” code paths obsolete.

- Treat `config/Packs/Kernel/index.sys2` as compatibility glue only.
- Move any remaining “eval-specific” theory out of `config/Packs/*`.
- Reduce runtime assumptions about the presence of specific domain relations.

---

## 11. Success criteria

- New features add semantics only via packs, not via hard-coded JS lists.
- Every result can be traced to evidence/artifacts/provenance.
- Eval suites are self-contained and do not require mutating baseline config to pass.

---

## 12. Near-term execution roadmap (v0.2)

This section turns the phase plan into concrete, incremental deliverables that can be implemented without “big bang” rewrites.

### 12.1 Pack semantics hardening (remove hidden assumptions)
Deliverables:
- Remove remaining hard-coded operator/verb lists in runtime reasoning paths; drive behavior via `SemanticIndex` and pack-declared tags only.
- Keep baseline packs minimal and structural; move domain semantics (e.g. law/geography-specific transitive relations) into explicit domain packs.
- Ensure any operator-property declaration is persisted (DS19) and therefore inspectable in KBExplorer.

### 12.2 URC pack completion (contract surface)
Deliverables:
- Add missing URC packs (as `.sys2`) with minimal atoms/relations + constructors:
  - `PolicyCore_v1` (`Current`, `Supersedes`, ranks)
  - `ProvenanceCore_v1` (source spans, alternatives, normalizations, decisions)
  - `SolverArtifactCore_v1` (artifact formats, hashing)
  - `BackendPreferenceRegistry_v1` (`PreferBackend`, `FallbackTo`, `PreferEvidence`)
  - `TypeCore_v1` (signatures + `typeof`)
  - `UnitCore_v1` (units/dimensions; runtime checks emit evidence)
  - `VerifierCore_v1` (verification objects for solver certificates)
- Update `config/Packs/URC/index.sys2` to load the new modules.

### 12.3 Runtime services (make URC “real”, not only DSL)
Deliverables:
- Implement a session-level “URC services” layer:
  - policy materializer (computes `Current` view)
  - provenance recorder (NL→DSL + canonicalization hooks)
  - artifact store (hash + format; in-memory first)
  - evidence builder utilities used by all backends
- Add a deterministic “rebuild indices” entrypoint:
  - rebuild derived indices (EXACT/Holo postings, semantic index snapshots) from persisted facts.

### 12.4 Orchestrator MVP (inspectable backend selection)
Deliverables:
- Fragment classifier emits `FragmentTag(content, frag)` facts (auditable).
- Capability registry + preference facts drive backend selection (inspectable).
- Orchestrator emits `Plan`/`Step` facts + links to artifacts/evidence.

### 12.5 Compilation MVP (DS50 alignment)
Deliverables:
- Implement a deterministic compilation pipeline for at least one fragment:
  - `Frag_SMT_LIA/LRA` → SMT-LIB2 artifact
  - parser for solver outputs into URC Evidence shapes (`Model`/`UnsatCore` initially)
- Record compilation provenance (`normalizedFrom`, `normalization`).

### 12.6 Evaluation suites migration (DS74 protocol)
Deliverables:
- Continue suite-by-suite audit and move any domain vocabulary out of baseline packs into suite/domain packs.
- Add at least 2 additional CSP mini-problems beyond map coloring (e.g., tiny allDifferent, small scheduling) using the generic `solve csp` mechanism.
- Upgrade eval assertions to check URC evidence presence (not only surface strings) as URC services land.
