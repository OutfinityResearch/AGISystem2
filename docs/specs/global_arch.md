# Global Geometric Architecture and Reasoning Model

ID: DS(/global_arch)

This design specification captures the cross-cutting geometric model, reasoning typologies, data rules, and key flows that apply to the entire AGISystem2 engine. It complements the functional requirements in `FS.md` (FS-01…FS-16) and the module-level DS files, and should be considered global context rather than a single-module spec.

## Scope

- Describe the shared geometric representation (bounded diamonds, masks, partitions) and the families of reasoning modes (deductive, inductive, abductive, etc.).
- Define global data and structural rules that all modules (`VectorSpace`, `BoundedDiamond`, `ConceptStore`, `Reasoner`, `ValidationEngine`, `TheoryDSLEngine`, etc.) must respect.
- Summarise the key end-to-end flows (Ingest, Answer, Conflict Handling, Validation) that FS-01…FS-16 rely on.
- This DS is exercised indirectly by the entire test suite (`geometry`, `ingestion`, `reasoning`, `Sys2DSL`, `validation`, `bias`, `temporal`, `persistence`) rather than by a dedicated module.

## Reasoning Typologies (Geometric Operations)

AGISystem2 exposes a family of reasoning modes, all grounded in the same geometric conceptual space:

- **Deductive:** point/volume inclusion within diamonds (strict/fuzzy). A deductive answer corresponds to checking whether a query vector lies inside a concept’s bounded region under the active masks and theory layers.
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
  - Property-like tokens `key=value` under `HAS_PROPERTY` are treated as single concept labels and, where configured (e.g., `boiling_point=100`), map deterministically into specific ontology dimensions (Temperature axis) as described in `DS[/ingest/encoder.js]`.

Any module that deviates from these rules must call out the deviation explicitly in its own DS and justify it relative to URS/NFS.

## Key Flows

These flows summarise how the engine behaves end-to-end; they are refined in the module-level DS docs but kept here as a single global picture.

- **Ingest**
  - Parse text (or Sys2DSL fact) → canonical subject–relation–object triple → vector encoding via `Encoder` → superposition update in `ConceptStore` → clustering check via `ClusterManager` → update bounded diamonds → persist and index → record audit entry.
- **Answer**
  - Receive query + optional context (Sys2DSL `ASK`/`ASK_MASKED`/`CF`) → select theory stack (or multiple stacks for comparison) → synthesise runtime concept definition from base + overlays → perform adversarial check (optimist/sceptic radii) via `Reasoner` → use `Retriever` if needed → produce boolean/graded answer (`truth`, `band`) plus provenance (active theories, masks, distances).
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
