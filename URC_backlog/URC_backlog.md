# URC Backlog (DS73 execution dump)

This folder is the working backlog for migrating AGISystem2 toward the **Universal Reasoning Core (URC)** direction (DS49) using the DS73 plan.

Constraints / goals:
- **No external dependencies.**
- **Truth vs index split is strict**: `session.kbFacts` holds truth-candidates only; indices/audit are rebuildable surfaces.
- **Auditability is mandatory**: every backend should emit URC-shaped **Artifacts/Evidence/Provenance** (in-memory by default).
- Existing engines remain as **backends/strategies** (EXACT/HDC/CSP/planning/etc).

---

## 0) Current snapshot (implemented)

### 0.1 Storage semantics
- Persisted truth store: `session.kbFacts` (authoritative).
- Derived KB index: `session.getKBBundle()` bundles fact vectors and is rebuildable.
- `session.rebuildIndices()` exists to rebuild indexes from `kbFacts`.

### 0.2 EXACT ceilings (DS25 / DS39 alignment)
- Reserved atoms: `BOTTOM_IMPOSSIBLE`, `TOP_INEFFABLE`.
- Strategy-level normalization in `src/hdc/strategies/exact.mjs`:
  - `BOTTOM_IMPOSSIBLE` absorbs first.
  - `TOP_INEFFABLE` absorbs second.
  - Optional density/term ceilings collapse to `TOP_INEFFABLE`.
- Default thresholds are generous:
  - `monomBitLimit = 1000`
  - `polyTermLimit = 200000`
- Thresholds can be adjusted from DSL:
  - `@_ Set exactIneffableMonomBitLimit 1000`
  - `@_ Set exactIneffablePolyTermLimit 200000`

### 0.3 URC audit stores (v0)
- In-memory URC stores in `session.urc`:
  - `session.urc.artifacts: Map<id, artifact>`
  - `session.urc.evidence: Map<id, evidence>`
- Provenance log: `session.provenanceLog: Array<entry>`
- Optional “materializeFacts” flag produces **derived DSL lines** (`materializedFactLines`) for debugging/tooling, but **does not inject them into `kbFacts`**.

### 0.4 Policy view (v0)
- `session.materializePolicyView()` computes a derived view:
  - `policy` config extracted from KB facts: `policyNewerWins`, `policyEvidenceRank`, `policyRoleRank`, `policySourceRank`
  - `supersedes` edges from `negates(new, old)` links
  - `currentFactIds` set
  - optional `materializedFactLines` (derived audit DSL lines)
- Policy view is exposed to KBExplorer via `/api/policy/view`.

### 0.5 Orchestrator (v0)
- `session.orchestrate({ goalKind, dsl })`:
  - classifies fragment
  - consults `PreferBackend` and `FallbackTo` facts
  - returns a plan (`Plan/Step` shape) and records a provenance decision entry
  - emits:
    - `SYS2DSL` input artifact
    - `URC_PLAN_JSON_V0` plan artifact (always)
    - `SMTLIB2` artifact when compilation backend is selected

### 0.6 CP/CSP backend audit (v0)
- `solve csp` emits:
  - CSP instance artifact: `CSP_JSON_V0`
  - per-solution artifact: `CSP_SOLUTION_JSON_V0`
  - per-solution evidence: `Model` / `CP` / `Sat`
  - infeasible evidence: `Trace` / `CP` / `Infeasible`

### 0.7 KBExplorer (research UI)
- Multi-session HTTP server (new tab/refresh => new session).
- Packs can be selected via UI (stored in localStorage); changing packs resets session.
- URC inspection endpoints:
  - `/api/urc/artifacts`, `/api/urc/evidence`, `/api/urc/provenance`, `/api/policy/view`
- “Reasoning (URC)” category in the KB tree.

### 0.8 fastEval performance & invariants
- `materializeFacts` is opt-in per case (default false) to avoid performance regressions.
- fastEval currently passes (includes policy/provenance suites).

---

## 1) Backlog principles (non-negotiable)

1) **Truth vs index split**
   - `kbFacts` is the only truth-candidate store.
   - Anything derived (bundles, postings, cache, policy view, URC audit DSL) must be rebuildable and must not mutate `kbFacts`.

2) **No eval-driven semantics**
   - Evals ship their own domain vocabularies and constraints under `evals/...`.
   - Packs under `config/Packs/*` remain general and minimal.

3) **Auditability first**
   - Every backend output must be anchored in `Evidence` and/or `Artifact`.
   - Orchestrator decisions must be inspectable via `Provenance`.

---

## 2) Remaining DS73 phases (detailed backlog)

### Phase A — URC storage contracts (hardening)

**A1. Canonical persisted fact record**
- Define a stable “fact record” shape for persisted statements:
  - operator + args + optional name
  - structured metadata normalization
  - optional canonical id (future)

**A2. Index rebuild contracts**
- Expand `session.rebuildIndices()` to explicitly handle:
  - EXACT postings (if/when implemented)
  - compilation artifact caches (if added)
  - policy view invalidation

Acceptance criteria:
- Rebuild produces identical query/prove results for the same `kbFacts` set.

---

### Phase B — PolicyCore ranking (beyond `negates`)

**B1. Evidence ranking integration**
- Implement ranking rules using:
  - `policyEvidenceRank(policyId, evidenceKind, rank)`
  - `policyRoleRank(policyId, role, rank)`
  - `policySourceRank(policyId, source, rank)`
- Define how evidence/role/source attaches to facts (linking model needed).

**B2. Current view as a filter**
- Add a runtime option to run reasoning over:
  - full KB
  - current view only (default for user-facing answers)

Acceptance criteria:
- Deterministic selection when two facts conflict, with explicit inspectable explanation (why A superseded B).

---

### Phase C — ProvenanceCore (NL→DSL) hardening

**C1. Stable provenance object ids**
- Replace ad-hoc ids with deterministic ids derived from:
  - (normalized) source + span + produced DSL

**C2. Alternative parses**
- Record candidate parses with confidence and selection rationale.

Acceptance criteria:
- For the same NL input and deterministic runtime settings, provenance ids are stable.

---

### Phase D — EvidenceCore (more shapes)

**D1. Expand evidence types**
- Add support for:
  - `UnsatCore`
  - `ProofLog`
  - `DualCert`
  - `Bounds`, `Residual`
  - `Samples`, `HashCount`

**D2. Verification hooks**
- Add a verifier surface (future): evidence can be marked verified.

Acceptance criteria:
- Evidence objects are uniformly shaped and linkable to artifacts; no backend returns an “answer string only”.

---

### Phase E — CompilationCore targets

**E1. SMT-LIB2 (already v0)**
- Harden compiler determinism and normalization reporting:
  - alpha-renaming
  - canonical ordering
  - unit normalization hooks (future)

**E2. Future targets (research)**
- DIMACS, TPTP, MPS/LP/SDPA

Acceptance criteria:
- Same DSL input => same output artifact hash.

---

### Phase F — Backends as adapters (systematic)

**F1. EXACT/HDC query/prove as URC backends**
- Wrap each engine call with:
  - input artifact
  - evidence shape (even for “No results”)
  - provenance entry (when relevant)

**F2. CP/planning backends**
- Expand CSP backend beyond Find:
  - Optimize / Count (future)
  - trace explanations (future)

Acceptance criteria:
- Every backend method emits URC surfaces consistently.

---

### Phase G — Eval suite audit + realism

For each suite:
1) State capability tested.
2) Ensure vocabulary is explicit and local when domain-specific.
3) Ensure expected outputs are semantic, not phrasing hacks.
4) Avoid runtime special cases “for one suite”.

Acceptance criteria:
- fastEval remains stable and reasonably fast; no suite depends on hidden config defaults.

---

## 3) Next execution tranches (rolling 10-step loops)

### Tranche 1 (next)
1) Introduce a **Plan registry** under URC (plan ids, plan artifacts, references).
2) Make `orchestrate` return a stable `planId` (hash-based).
3) Add plan browsing in KBExplorer (Reasoning → URC → Plans).
4) Implement `FragmentTag` persistence as derived audit lines only.
5) Add a minimal “Evidence selection explanation” surface (policy debug text).
6) Audit all runtime code paths for `session.learn()` usage for audit-only info.
7) Add a strict test ensuring URC audit does not mutate `kbFacts`.
8) Extend fastEval suite32 to validate plan artifacts.
9) Extend DS49/DS73 docs for plan artifacts.
10) Re-run fastEval + tests and confirm performance.

### Tranche 2 (after tranche 1)
1) Implement evidence ranking lookup for `policyEvidenceRank`.
2) Add minimal link model from facts to evidence (support edges).
3) Extend policy view computation to use evidence rank.
4) Add a deterministic tie-breaker policy.
5) Add KBExplorer policy explanation details (why chosen).
6) Add eval suite for evidence-based conflict resolution.
7) Add documentation: evidence ranking semantics.
8) Run fastEval + tests.
9) Profile and eliminate any regressions.
10) Draft tranche 3.

---

## 4) Open questions (tracked, not blockers for v0)

- What is the canonical linking model from **facts** to **evidence** in persisted storage?
- Should “policy view” ever become persisted facts, or always remain derived?
- How to represent “source” for facts in a way that is robust and not forgeable?
- How to unify “graph defs” with URC artifacts and procedures (ProcedureCore)?

