# Global Geometric Architecture and Reasoning Model

ID: DS(/global_arch)

This design specification captures the cross-cutting geometric model, reasoning typologies, data rules, and key flows that apply to the entire AGISystem2 engine. It complements the functional requirements in `FS.md` (FS-01…FS-16) and the module-level DS files, and should be considered global context rather than a single-module spec.

## Scope

- Describe the shared geometric representation (bounded diamonds, masks, partitions) and the families of reasoning modes (deductive, inductive, abductive, etc.).
- Define global data and structural rules that all modules (`VectorSpace`, `BoundedDiamond`, `ConceptStore`, `Reasoner`, `ValidationEngine`, `TheoryDSLEngine`, etc.) must respect.
- Summarise the key end-to-end flows (Ingest, Answer, Conflict Handling, Validation) that FS-01…FS-16 rely on.
- This DS is exercised indirectly by the entire test suite (`geometry`, `ingestion`, `reasoning`, `Sys2DSL`, `validation`, `bias`, `temporal`, `persistence`) rather than by a dedicated module.

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           AGISystem2 Architecture                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐     ┌─────────────────────────────────────────────────┐   │
│   │   CLI /     │     │              Interface Layer                    │   │
│   │   Agent     │────►│  System2Session  │  TheoryDSLEngine (Sys2DSL)   │   │
│   │   API       │     └─────────────────────────────────────────────────┘   │
│   └─────────────┘                          │                                │
│                                            ▼                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Reasoning Layer                              │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │   │
│   │  │   Reasoner   │  │  Retriever   │  │   ValidationEngine         │ │   │
│   │  │  (queries/   │  │  (LSH/Brute) │  │  (consistency/proofs)      │ │   │
│   │  │   proofs)    │  │              │  │                            │ │   │
│   │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                            │                                │
│                                            ▼                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        Knowledge Layer                               │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │   │
│   │  │ ConceptStore │  │ TheoryStack  │  │   TheoryLayer              │ │   │
│   │  │  (diamonds)  │  │  (overlays)  │  │  (overrides/masks)         │ │   │
│   │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                            │                                │
│                                            ▼                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           Core Layer                                 │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │   │
│   │  │ VectorSpace  │  │BoundedDiamond│  │   MathEngine               │ │   │
│   │  │ (Int8Array)  │  │ (regions)    │  │  (saturated ops, L1 dist)  │ │   │
│   │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │   │
│   │  ┌──────────────┐  ┌──────────────┐                                 │   │
│   │  │RelationPerm- │  │ClusterManager│                                 │   │
│   │  │uter (shuffle)│  │ (polysemy)   │                                 │   │
│   │  └──────────────┘  └──────────────┘                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                            │                                │
│                                            ▼                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        Ingest Layer                                  │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │   │
│   │  │   Parser     │  │   Encoder    │  │   Persistence              │ │   │
│   │  │  (Sys2DSL)   │  │ (vec bind)   │  │  (SQLite/JSON)             │ │   │
│   │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Reasoning Typologies (Geometric Operations)

AGISystem2 exposes a family of reasoning modes, all grounded in the same geometric conceptual space:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       REASONING TYPOLOGIES DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   DEDUCTIVE                    INDUCTIVE                   ABDUCTIVE            │
│   ═════════                    ═════════                   ═════════            │
│   Point in region?             Build region from points    Find causes          │
│                                                                                 │
│   ┌───────────┐               ┌───────────┐               ┌───────────┐        │
│   │  concept  │               │    • •    │               │  effect   │        │
│   │    •?     │ → TRUE/FALSE  │   •   •   │ → new region  │     ↑     │        │
│   │   query   │               │    • •    │               │  cause?   │        │
│   └───────────┘               └───────────┘               └───────────┘        │
│                                                                                 │
│   ANALOGICAL                   COUNTERFACTUAL              DEONTIC              │
│   ══════════                   ══════════════              ═══════              │
│   Transfer relations           What-if reasoning           Norms/permissions    │
│                                                                                 │
│   A ─rel─► B                   Base + Overlay              ┌─────────┐          │
│   C ─???─► ?                   ═══════════════             │PERMITTED│          │
│                                ┌───────────┐               │ region  │          │
│   ? ≈ C + (B - A)              │  "if X"   │ temporary     ├─────────┤          │
│                                │ override  │ layer         │FORBIDDEN│          │
│                                └───────────┘               │ region  │          │
│                                                            └─────────┘          │
│                                                                                 │
│   TEMPORAL/CAUSAL              SPARSITY/ATTENTION          VALIDATION           │
│   ═══════════════              ══════════════════          ══════════           │
│   Time-ordered chains          Focus on subspaces          Check consistency    │
│                                                                                 │
│   t₀ ─rot─► t₁ ─rot─► t₂      Mask: [1,1,0,0,1...]        Theory₁ ∩ Theory₂    │
│   (rotational encoding)        (only active dims)          = conflicts?         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Deductive:** point/volume inclusion within diamonds (strict/fuzzy). A deductive answer corresponds to checking whether a query vector lies inside a concept's bounded region under the active masks and theory layers.
- **Inductive:** envelope construction (min/max, centroid, L1 radius) to form new diamonds from examples. Concepts are learned as unions of diamonds that summarise observed points.
- **Abductive:** inverse permutation probing plus nearest-neighbour lookup for best-explanation hypotheses. Given an observation, the system applies inverse relation permutations and retrieval to generate plausible causes.
- **Analogical:** vector translation (delta application) to map relations across domains. The system reuses relation deltas (`B − A`) to predict analogues (`D ≈ C + (B − A)`), then retrieves nearby concepts.
- **Counterfactual / Non-monotonic:** theory-layer overrides and temporary layers to simulate alternative realities. Counterfactual queries and non-monotonic updates work by stacking overlays rather than mutating base theories.
- **Temporal / Causal:** rotational encoding for time steps; inverse rotations for recall; causal permutations. Temporal memory and causal permutations let the system reason over sequences and cause–effect chains.
- **Deontic / Normative:** forbidden/obligation volumes with strict radii and context-dependent layers. Normative statements (e.g., `PROHIBITED_BY`, `PERMITTED_BY`) occupy geometric regions that can be queried and overlaid.
- **Sparsity / Attention:** relevance mask activation to focus comparisons on specific subspaces (ontology vs. axiology, or named dimensions). Masks control which axes participate in distance and inclusion checks.
- **Validation / Abstract:** symbolic/abstract runs over theory stacks and dimensions to check consistency and expected outcomes without relying on new empirical data. Validation runs treat theories and masks as objects of analysis.

These typologies must remain visible in module-level DS docs (for example, `DS[/reason/reasoner.js]`, `DS[/reason/validation.js]`, `DS[/theory/dsl_engine.js]`) and traceable back to URS/FS/NFS through the specification matrix.

## Data and Structural Rules

The following rules apply everywhere in the engine:

- **Vector arithmetic**
  - Vectors are `Int8Array`-based with clamped arithmetic; all additions are saturated into the range `[-127, 127]`.
  - Relevance masks and relation hints use bitwise operations over `Uint8Array` buffers.
- **Partitions and dimensions**
  - Ontology and axiology partitions are fixed (0–255, 256–383), as defined in `DS[/knowledge/dimensions]` and validated by `Config`.
  - Empirical/latent dimensions (≥384) remain zero until explicitly populated by domain extensions.
- **Relation permutations**
  - Relation permutations are deterministic shuffles seeded via `Config.relationSeed`; registering a relation name must always yield the same table for a given configuration.
  - New relations are generated orthogonally when missing and recorded in the permutation registry; inverse permutations exist for every registered relation.
- **Theory overlays**
  - Theory overrides must not mutate stored base concepts. Base concepts remain stable; runtime synthesis combines overlays on demand via `TheoryStack` and `TheoryLayer`.
  - Temporary layers (counterfactuals, non-monotonic scenarios) are applied to cloned stacks or context arrays and discarded after use.
- **Property tokens**
  - Property-value pairs using the DIM_PAIR pattern (e.g., `@p boiling_point DIM_PAIR Celsius100`) map deterministically into specific ontology dimensions (Temperature axis) as described in `DS[/ingest/encoder.js]`.

Any module that deviates from these rules must call out the deviation explicitly in its own DS and justify it relative to URS/NFS.

## Key Flows

These flows summarise how the engine behaves end-to-end; they are refined in the module-level DS docs but kept here as a single global picture.

### Flow Diagrams

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            INGEST FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   "Dog IS_A Animal"                                                             │
│         │                                                                       │
│         ▼                                                                       │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐             │
│   │  Parser   │───►│  Encoder  │───►│ Concept   │───►│ Cluster   │             │
│   │ (Sys2DSL) │    │ (permute  │    │  Store    │    │ Manager   │             │
│   │           │    │  + bind)  │    │ (diamond) │    │ (polysemy)│             │
│   └───────────┘    └───────────┘    └───────────┘    └───────────┘             │
│         │                │                │                │                    │
│   subject,          Int8Array        Update bounds    Split if                  │
│   relation,         vector           min/max/center   divergent                 │
│   object                                   │                                    │
│                                            ▼                                    │
│                                     ┌───────────┐    ┌───────────┐             │
│                                     │Persistence│───►│ AuditLog  │             │
│                                     │ (SQLite)  │    │           │             │
│                                     └───────────┘    └───────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            QUERY FLOW                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   "@q Dog IS_A animal"                                                          │
│         │                                                                       │
│         ▼                                                                       │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐             │
│   │ DSL       │───►│ Theory    │───►│ Reasoner  │───►│ Retriever │             │
│   │ Engine    │    │  Stack    │    │ (optimist/│    │ (LSH or   │             │
│   │ (parse)   │    │ (compose) │    │  skeptic) │    │  brute)   │             │
│   └───────────┘    └───────────┘    └───────────┘    └───────────┘             │
│         │                │                │                │                    │
│   Parse query      Apply layers      Adversarial      Find nearest              │
│   + variables      to base diamond   inclusion test   if needed                 │
│                                            │                                    │
│                                            ▼                                    │
│                                     ┌───────────────────────────┐               │
│                                     │  Result:                  │               │
│                                     │  {truth: TRUE_CERTAIN,    │               │
│                                     │   confidence: 0.95,       │               │
│                                     │   provenance: [...]}      │               │
│                                     └───────────────────────────┘               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         THEORY STACK COMPOSITION                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   Base Concept (from ConceptStore)                                              │
│   ┌─────────────────────────────────────┐                                       │
│   │  BoundedDiamond                     │                                       │
│   │  min: [-10, -5, 0, ...]             │                                       │
│   │  max: [10, 15, 20, ...]             │                                       │
│   │  center: [0, 5, 10, ...]            │                                       │
│   └──────────────────┬──────────────────┘                                       │
│                      │                                                          │
│                      ▼  Layer 1: Law_Theory (priority: 10)                      │
│   ┌─────────────────────────────────────┐                                       │
│   │  Override dims [256..260]           │   ← Axiology dims                     │
│   │  (deontic constraints)              │                                       │
│   └──────────────────┬──────────────────┘                                       │
│                      │                                                          │
│                      ▼  Layer 2: Session_Override (priority: 20)                │
│   ┌─────────────────────────────────────┐                                       │
│   │  Override dims [4] (temperature)    │   ← Counterfactual: "if boiling=50"   │
│   │  min: 45, max: 55                   │                                       │
│   └──────────────────┬──────────────────┘                                       │
│                      │                                                          │
│                      ▼                                                          │
│   ┌─────────────────────────────────────┐                                       │
│   │  Composed Diamond (runtime)         │   ← Used for reasoning                │
│   │  Base + Layer1 + Layer2 applied     │                                       │
│   └─────────────────────────────────────┘                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Ingest**
  - Parse text (or Sys2DSL fact) → canonical subject–relation–object triple → vector encoding via `Encoder` → superposition update in `ConceptStore` → clustering check via `ClusterManager` → update bounded diamonds → persist and index → record audit entry.
- **Query Processing**
  - Receive query in v3 triple syntax (e.g., `@q Subject VERB Object`) + optional context → select theory stack (or multiple stacks for comparison) → synthesise runtime concept definition from base + overlays → perform adversarial check (optimist/sceptic radii) via `Reasoner` → use `Retriever` if needed → produce boolean/graded answer (`truth`, `band`) plus provenance (active theories, masks, distances).
- **Conflict Handling**
  - Detect empty intersections or high collinearity between ontological and axiological axes; identify contradictions between layers or masks.
  - Surface conflicts via `Reasoner`/`ValidationEngine` and prompt callers (through Sys2DSL programmes or session APIs) for precedence, masking strategies, or alternative stacks.
  - Support meta-rational comparisons by evaluating multiple theory stacks and reporting deltas.
- **Validate (Symbolic/Abstract)**
  - Run `ValidationEngine` over theory stacks, masks, and relations to prove/deny reachability or inclusion properties without consuming new data.
  - Use symbolic/abstract interpretations to find counterexamples and to check consistency, mask effects, and rule/program correctness; log runs with full configuration and stack provenance.

## Relationship to FS and Tests

- FS-01…FS-16 in `FS.md` describe <em>what</em> the engine must do from a functional perspective (representation, layering, ingestion, validation, interaction, Sys2DSL, etc.).
- DS[/global_arch] describes <em>how</em> those capabilities share a common geometric and architectural model.
- No extra dedicated tests are required for this DS; instead:
  - geometry tests (`vector_space`, `core_math`, `bounded_diamond`),
  - ingestion and clustering tests (`ingest`, `concept_store`),
  - reasoning and retrieval tests (`reason_smoke`, `reasoner_timeout`, `abductive_*`, `analogical_reasoning`, `counterfactual_layering`, `narrative_consistency`),
  - Sys2DSL tests (`sys2dsl_core`),
  - validation and bias tests (`validation_engine`, `bias_control`, `dimensions_catalog`),
  - and persistence/config tests
  collectively exercise the behaviours described here.

Any future change to the global reasoning model, data rules or key flows must be reflected both in this DS and in the relevant module-level DS docs and tests.***
