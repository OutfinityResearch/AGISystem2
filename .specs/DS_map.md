# AGISystem2 Design Specification Map (DS_map)

Each code file in `src/**` must have a matching DS markdown under `.specs/**` with the same relative path and `.md` suffix (e.g., `src/core/vector_space.js` → `.specs/core/vector_space.js.md`). DS docs describe class interfaces, responsibilities (SOLID), pseudocode comments, configuration hooks (dimensions ≥512, recursion limits), and geometric rationale (conceptual space, diamonds).

## Core Geometry and Math
- `src/support/config.js` → `.specs/support/config.js.md` — Class `Config`: load/validate dimension count, partitions, recursion limits, perf knobs.
- `src/core/vector_space.js` → `.specs/core/vector_space.js.md` — Class `VectorSpace`: buffer allocation, clamped arithmetic, loop unrolling helpers.
- `src/core/bounded_diamond.js` → `.specs/core/bounded_diamond.js.md` — Class `BoundedDiamond`: hyper-rectangle + L1 ball + relevance mask; membership, merge/split.
- `src/core/relation_permuter.js` → `.specs/core/relation_permuter.js.md` — Class `RelationPermuter`: deterministic shuffle generation, forward/inverse apply, registry of relation roles.
- `src/core/math_engine.js` → `.specs/core/math_engine.js.md` — Module `MathEngine`: stateless vector ops (distance, saturated add, permutations, rotations).

## Knowledge and Theories
- `src/knowledge/concept_store.js` → `.specs/knowledge/concept_store.js.md` — Class `ConceptStore`: persistence of concepts/facts, cluster management for polysemy, versioned snapshots.
- `src/knowledge/theory_layer.js` → `.specs/knowledge/theory_layer.js.md` — Class `TheoryLayer`: overlays for min/max/radius/masks; provenance metadata.
- `src/knowledge/theory_stack.js` → `.specs/knowledge/theory_stack.js.md` — Class `TheoryStack`: selection, stacking, runtime synthesis of active theories; conflict detection; meta-rational comparisons.
- `theories (data spec)` → `.specs/knowledge/base_theories.md` — Base and test theory defaults (partitions, root constraints, sample layers for testing).
- `relations (data spec)` → `.specs/knowledge/default_relations.md` — Default relation set (OWL-inspired) with permutation characteristics and test guidance.
- `dimensions (data spec)` → `.specs/knowledge/dimensions.md` — Ontology/axiology axis catalog (fixed partitions).
 - `data/init/dimensions.json` → `.specs/init/dimensions.json.md` — JSON layout for dimension catalog instances.
 - `data/init/relations.json` → `.specs/init/relations.json.md` — JSON layout for default relation instances.
 - `data/init/config_profile.json` → `.specs/init/config_profile.json.md` — JSON layout for profile selection and seeds.

## Ingestion and Learning
- `src/ingest/parser.js` → `.specs/ingest/parser.js.md` — Class `NLParser`: parse text into subject–relation–object trees; configurable recursion horizon.
- `src/ingest/encoder.js` → `.specs/ingest/encoder.js.md` — Class `Encoder`: apply permutations, assemble vectors, perform saturated addition, update concept prototypes.
- `src/ingest/clustering.js` → `.specs/ingest/clustering.js.md` — Class `ClusterManager`: detect divergence, split/merge bounded diamonds, manage cluster labels.

## Reasoning and Retrieval
- `src/reason/reasoner.js` → `.specs/reason/reasoner.js.md` — Class `Reasoner`: assemble runtime concepts, run optimist/sceptic validation, handle conflict prompts.
- `src/reason/retrieval.js` → `.specs/reason/retrieval.js.md` — Class `Retriever`: blind decoding using relation hints, probing, LSH/nearest-neighbor lookup.
- `src/reason/bias_control.js` → `.specs/reason/bias_control.js.md` — Class `BiasController`: apply ontological/axiological masks, audit mode toggles.
- `src/reason/validation.js` → `.specs/reason/validation.js.md` — Class `ValidationEngine`: symbolic/abstract interpretation over theory stacks and conceptual space to prove inclusion/exclusion, reachability, and consistency without mutating state.
- `src/reason/temporal_memory.js` → `.specs/reason/temporal_memory.js.md` — Class `TemporalMemory`: rotational working memory and causal permutations for time reasoning.

## Theory DSL and Macros
- `src/theory/dsl_engine.js` → `.specs/theory/dsl_engine.js.md` — Class `TheoryDSLEngine`: interpret theory-level macro scripts, bind variables, and invoke core reasoning primitives (ask, abduct, counterfactual, fact search) without embedding domain-specific logic in engine code.

## Interaction and Orchestration
- `src/interface/translator_bridge.js` → `.specs/interface/translator_bridge.js.md` — Class `TranslatorBridge`: contract with external LLM/translation layer; deterministic structured calls.
- `src/interface/api.js` → `.specs/interface/api.js.md` — Class `EngineAPI`: stable interface for external callers; structured commands for ingest/query/admin operations.
- `src/support/audit_log.js` → `.specs/support/audit_log.js.md` — Class `AuditLog`: append-only logs for theory changes, ingestions, clustering events, translator calls.
- `src/support/storage.js` → `.specs/support/storage.js.md` — Class `StorageAdapter`: pluggable persistence backends (default binary-on-disk hierarchy) for concepts and theories.

## Testing Harness
- `tests/runTests.js` → `.specs/tests/runTests.js.md` — CLI harness for suite discovery and execution across test profiles (auto/manual/prod-like).
- `tests/fixtures` → `.specs/tests/fixtures.md` — Shared test inputs/expected outcomes for suites.

## Open DS Questions
- Dimension configuration (minimum 512, optionally higher for production) affects masks, permutations, storage formats, and test fixtures; each DS must state supported configs and defaults.
- LSH implementation choice (custom vs. library) and storage backend for concepts/theories remain to be specified.
- Translator determinism strategy (model pinning, caching, or deterministic prompts) needs definition before interface solidifies.
