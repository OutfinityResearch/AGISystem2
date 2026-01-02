# AGISystem2 - System Specifications
#
# DS49: Universal Reasoning Core (URC) — Storage Semantics, Evidence, and Backend Orchestration
#
**Document Version:** 0.1  
**Status:** Draft / Proposed (aligned with UTE/URK roadmap)  
**Audience:** Core + reasoning + DSL developers  
**Scope:** Cross-cutting (DSL, runtime, reasoning engines, config taxonomy)  

---

## 1. Purpose

URC (Universal Reasoning Core) defines a coherent, non-arbitrary “core contract” for AGISystem2 that supports:

- pragmatic meaning as **context update** (events that update a session view),
- a compositional **Content IR** that can be routed to multiple solvers/backends,
- explicit **Goals** with budgets/tolerances/evidence requirements,
- first-class **Evidence / Artifacts / Provenance** (auditability and reproducibility),
- **no-delete** knowledge growth with revision via policy (not destructive edits),
- compatibility with multiple substrates (Dense / EMA / EXACT), including growth-friendly representations.

URC is not a single new engine. It is a **unified storage + orchestration semantics** that allows existing engines to remain useful as backends.

### 1.1 Design observations (overview)

- URC aligns naturally with the existing UTE/URK/STAR direction: current engines remain as **backends/strategies**, while URC adds a **storage + evidence + orchestration** contract.
- The “bundle-only” weakness is resolved by a strict rule: **persisted slot facts are truth-candidates**, while `__Bundle` and KB bundles are **derived indices** (rebuildable acceleration), not “knowledge”.

Related roadmap documents:

- DS32–DS38 (UTE research partition)
- DS41–DS43 (URK IR + backend mapping)
- DS39–DS40 (budgeted closure tactics: STAR/UNSTAR)
- DS26 (Session universe / IoC / runtime-reserved atoms)

---

## 2. Core principle: dual-store semantics (truth vs. index)

URC separates:

1) **Persisted declarative facts** (“truth candidates” that engines can query/prove), from  
2) **Derived indices** (“acceleration structures” used by HDC/EXACT retrieval and closure).

### 2.1 Persisted facts (authoritative store)

Persisted facts are normal Sys2DSL statements with structured metadata:

- slot facts (object → attribute/slot),
- graph-free relations that are intended to be provable/queryable,
- revision links (`negates`, `supports`, `dependsOn`, `refersTo`),
- policy view facts (`Current`, `Supersedes`) materialized by runtime,
- provenance and evidence links (audit surface).

This is the content of `session.kbFacts` and is the only store that the symbolic engines treat as “knowledge”.

### 2.2 Derived indices (non-authoritative)

Derived indices are computed from persisted facts and may be rebuilt at any time:

- KB superposition vectors (global or per-operator bundles),
- object “record vectors” (bundles used for retrieval/decoding),
- EXACT postings / bit indices for subset/intersection candidate retrieval,
- caches of compiled solver artifacts.

Indices must never be treated as “ground truth”; they are performance hints.

---

## 3. Object model: entities with canonical identity

URC uses “objects” (Event, Goal, Evidence, Artifact, Content) that are represented as:

- a stable **object id atom** (e.g. `Evt_...`, `Goal_...`),
- a set of persisted slot facts about that id,
- optional derived record vectors for HDC/EXACT acceleration.

### 3.1 Canonical object ids

To avoid vocabulary blow-up (especially under EXACT), object ids should be canonical:

- computed as a deterministic hash of a normalized slot-fact set,
- stable across sessions given the same normalized input,
- identical objects dedup to the same id.

This makes:

- storage smaller,
- EXACT indices more stable,
- evidence provenance reproducible.

---

## 4. Revision semantics: no delete, but a policy-driven “current view”

URC follows “no delete” knowledge growth:

- facts are never removed from `kbFacts`,
- contradictions/revisions are represented as links plus policy.

### 4.1 Revision links

- `negates(new, old)` indicates that `new` contradicts or supersedes `old`.
- `supports(x, y)` indicates supporting relationship (evidence → claim, claim → claim).
- `dependsOn(x, y)` expresses derivational dependency.

### 4.2 Current view

The runtime maintains a **materialized view**:

- `Current(objOrFact, True/False)`
- `Supersedes(new, old)` (derived)

Policy ranks sources / roles / evidence kinds to decide which competing claims are “current”.

Symbolic reasoning can be run over:

- full KB (history-sensitive), or
- Current view (default for user-facing answers and compilation).

---

## 5. Engines remain: URC treats them as backends

URC introduces an Orchestrator that routes goals to backends based on fragment classification and capability declarations.

Existing AGISystem2 engines remain valid backends:

- symbolic (query/prove/findAll),
- holographic (HDC-first candidate generation),
- CSP/planning solve,
- URK closure (DS41/DS42) with STAR/UNSTAR tactics (DS39/DS40).

URC requires that each backend:

- consumes an explicit Goal + Content fragment,
- emits Evidence (and optional Artifacts),
- declares its capability (fragment types supported, evidence shapes produced).

---

## 6. EXACT-aware closure ceilings: `BOTTOM_IMPOSSIBLE` and `TOP_INEFFABLE`

URC reserves two atoms with engine-level semantics (see DS26):

- `BOTTOM_IMPOSSIBLE`: absorbing contradiction / dead-end.
- `TOP_INEFFABLE`: absorbing “resource boundary” / unknown (the system refuses deeper expansion).

These enable a unified policy for controlling closure explosion:

- if a derived state becomes too large/dense, normalize it to `TOP_INEFFABLE` (budget ceiling),
- if a derived state is inconsistent, normalize it to `BOTTOM_IMPOSSIBLE`,
- engines treat `TOP_INEFFABLE` as a boundary (reportable with Evidence), not a proof.

Integration details are specified by DS39 (closure engine) and DS25 (EXACT representation).

---

## 7. Domain Packs and config taxonomy (preview)

URC distinguishes:

- **Runtime Core**: minimal stable universal mechanisms required for the system to run (code + reserved atoms),
- **Theory Packs**: all semantic libraries, including the default “Kernel” pack and optional domain packs.

This implies a config restructure plan (detailed in DS51):

- keep Runtime Core minimal and principled,
- move all semantic `.sys2` theories to packs (Kernel + domains),
- keep deterministic load semantics and audit-friendly provenance.

---

## 8. Implementation milestones (documentation-first)

URC is intended to be implemented incrementally:

1) Freeze storage semantics and Current-view policy surfaces (facts + indices + view).
2) Standardize Evidence/Artifact shapes and provenance links.
3) Add fragment classification and backend capability registry.
4) Add deterministic compilation targets (SMT-LIB2 first) as artifacts.
5) Add EXACT ceilings (`TOP_INEFFABLE`) integrated with STAR/URK normalization and budgets.

Concrete migration plan and phase sequencing:

- DS73 (URC Migration Plan)

---

## 9. Canonical URC pack (current repo anchor)

URC is specified in DS terms, but it also needs a concrete, inspectable Sys2DSL anchor.

Canonical URC pack location:

- `config/Packs/URC/index.sys2`

Bootstrap dependency (required for typed constructors used by URC pack files):

- `config/Packs/Bootstrap/index.sys2`

Pack modules (v0, subject to iteration):

- `config/Packs/URC/00-pragmatics-core.sys2`
- `config/Packs/URC/01-content-core.sys2`
- `config/Packs/URC/02-goal-core.sys2`
- `config/Packs/URC/03-capability-registry.sys2`
- `config/Packs/URC/04-evidence-core.sys2`
- `config/Packs/URC/05-metric-core.sys2`
- `config/Packs/URC/06-orchestrator-core.sys2`
- `config/Packs/URC/07-policy-core.sys2`
- `config/Packs/URC/08-provenance-core.sys2`
- `config/Packs/URC/09-solver-artifact-core.sys2`
- `config/Packs/URC/10-backend-preference-registry.sys2`
- `config/Packs/URC/11-type-core.sys2`
- `config/Packs/URC/12-unit-core.sys2`
- `config/Packs/URC/13-verifier-core.sys2`

Load policy:

- URC packs are **not auto-loaded** by runtime.
- Evals and tooling must explicitly load packs (URC direction; see DS51).

*End of DS49*
