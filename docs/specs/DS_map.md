# AGISystem2 Design Specification Map (DS_map)
**ID:** DS-MAP-001

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
- `data/init/theories/base/ontology_base.sys2dsl` → `.specs/init/ontology_base.md` — **Base ontology facts (93)**: fundamental categories (entity, living_thing, object), taxonomy (animals, plants, artifacts), geography, professions.
- `data/init/theories/base/axiology_base.sys2dsl` → `.specs/init/axiology_base.md` — **Base axiology facts (63)**: moral values, deontic modalities (PERMITTED, PROHIBITED, OBLIGATORY), rights, fairness principles, ethical domains.
- `relations (data spec)` → `.specs/knowledge/default_relations.md` — Default relation set (OWL-inspired) with permutation characteristics and test guidance.
- `dimensions (data spec)` → `.specs/knowledge/dimensions.md` — Ontology/axiology axis catalog (fixed partitions).
- `(memory spec)` → `.specs/knowledge/usage_tracking.md` — **Usage tracking and prioritization**: counters, frequency-based ranking, priority calculation.
- `(memory spec)` → `.specs/knowledge/forgetting.md` — **Forgetting mechanisms**: threshold-based removal, decay models, protection, recovery.
- `data/init/dimensions.json` → `.specs/init/dimensions.json.md` — JSON layout for dimension catalog instances.
- `data/init/relations.json` → `.specs/init/relations.json.md` — JSON layout for default relation instances.
- `data/init/config_profile.json` → `.specs/init/config_profile.json.md` — JSON layout for profile selection and seeds.

## Ingestion and Learning
- `src/ingest/parser.js` → `.specs/ingest/parser.js.md` — Class `NLParser`: parse text into subject–relation–object trees; configurable recursion horizon.
- `src/ingest/encoder.js` → `.specs/ingest/encoder.js.md` — Class `Encoder`: apply permutations, assemble vectors, perform saturated addition, update concept prototypes.
- `src/ingest/clustering.js` → `.specs/ingest/clustering.js.md` — Class `ClusterManager`: detect divergence, split/merge bounded diamonds, manage cluster labels.

## Reasoning and Retrieval
- `src/reason/reasoner.js` → `.specs/reason/reasoner.js.md` — Class `Reasoner`: assemble runtime concepts, run optimist/sceptic validation, handle conflict prompts. **Delegates computable relations to plugins**.
- `src/reason/retrieval.js` → `.specs/reason/retrieval.js.md` — Class `Retriever`: blind decoding using relation hints, probing, LSH/nearest-neighbor lookup.
- `src/reason/bias_control.js` → `.specs/reason/bias_control.js.md` — Class `BiasController`: apply ontological/axiological masks, audit mode toggles.
- `src/reason/validation.js` → `.specs/reason/validation.js.md` — Class `ValidationEngine`: symbolic/abstract interpretation over theory stacks and conceptual space to prove inclusion/exclusion, reachability, and consistency without mutating state.
- `src/reason/temporal_memory.js` → `.specs/reason/temporal_memory.js.md` — Class `TemporalMemory`: rotational working memory and causal permutations for time reasoning.

## Compute Plugins (External Computation)
- `src/plugins/registry.js` → `.specs/plugins/registry.js.md` — Class `PluginRegistry`: manages compute plugins (math, physics, logic, datetime); provides uniform interface for plugin registration, relation mapping, and evaluation delegation. Uses computable dimensions (16-31) for numeric encoding.
- `src/plugins/math.js` → `.specs/plugins/math.js.md` — Class `MathPlugin`: arithmetic operations (PLUS, MINUS, TIMES, DIVIDED_BY) and numeric comparisons (LESS_THAN, GREATER_THAN, EQUALS_VALUE). Extracts numeric values from concept labels (e.g., "celsius_20" → 20).
- `(planned)` `src/plugins/physics.js` — Unit conversions (CONVERTS_TO, HAS_UNIT).
- `(planned)` `src/plugins/logic.js` — Propositional logic (IMPLIES, AND, OR, NOT).
- `(planned)` `src/plugins/datetime.js` — Calendar/time operations (BEFORE, AFTER, DURING, DURATION_OF).

## Sys2DSL Engine
- `src/theory/dsl_engine.js` → `.specs/theory/dsl_engine.js.md` — Class `TheoryDSLEngine` (Sys2DSL interpreter): interpret Sys2DSL command lines from theory files and sessions, bind variables, and invoke core reasoning primitives (ask, abduct, counterfactual, fact search, mask control) without embedding domain-specific logic in engine code.
- `src/theory/dsl_commands_theory.js` → `.specs/theory/dsl_commands_theory.js.md` — Class `DSLCommandsTheory`: theory management DSL commands (LIST_THEORIES, LOAD_THEORY, SAVE_THEORY, MERGE_THEORY, DELETE_THEORY, THEORY_PUSH, THEORY_POP, RESET_SESSION). Uses pluggable storage interface.
- `src/theory/theory_storage.js` → `.specs/theory/theory_storage.js.md` — Class `TheoryStorage`: pluggable storage interface for theories with adapters (FileStorageAdapter, MemoryStorageAdapter). Supports both `.sys2dsl` (DSL) and `.theory.json` (JSON) formats.
- `src/theory/meta_theory_registry.js` → `.specs/theory/meta_theory_registry.js.md` — Class `MetaTheoryRegistry`: registry of available theories with metadata (domain, version, dependencies, applicability rules). Tracks usage statistics (load counts, query success rates) and suggests applicable theories. Implements FS-17.
- `src/theory/theory_preloader.js` → `.specs/theory/theory_preloader.js.md` — Class `TheoryPreloader`: fast loading of base ontology and axiology theories with JSON caching for ~10x speedup. Loaded automatically at session creation unless skipPreload=true.
- `(language spec)` → `.specs/theory/Sys2DSL_syntax.md` — **Complete Sys2DSL language specification**: syntax, token types, case conventions, grammar (EBNF), evaluation model, session lifecycle.
- `(command reference)` → `.specs/theory/Sys2DSL_commands.md` — **Full command reference**: all commands organized by category (query, assertion, concept, relation, theory, reasoning, mask, utility, memory, output).
- `(data mapping)` → `.specs/theory/Sys2DSL_arch.md` — Sys2DSL data mapping: how scripts map to internal structures, value types, mask application.
- `(eval spec)` → `.specs/theory/topological_eval.md` — Topological evaluation and dependency resolution.

## Interaction and Orchestration
- `src/interface/translator_bridge.js` → `.specs/interface/translator_bridge.js.md` — Class `TranslatorBridge`: contract with external LLM/translation layer; deterministic structured calls.
- `src/interface/api.js` → `.specs/interface/api.js.md` — Class `EngineAPI`: internal engine façade; orchestrates parser/encoder/reasoner/theory stack and is used by sessions, but is not exposed directly to external callers.
- `src/interface/agent_system2.js` → `.specs/interface/agent_system2.js.md` — Class `AgentSystem2`: top-level entry point that owns shared configuration and creates `System2Session` instances.
- `src/interface/system2_session.js` → `.specs/interface/system2_session.js.md` — Class `System2Session`: session-scoped API that accepts Sys2DSL command lines, manages a per-session theory, and mediates all fact ingestion and reasoning operations.
- `src/support/audit_log.js` → `.specs/support/audit_log.js.md` — Class `AuditLog`: append-only logs for theory changes, ingestions, clustering events, translator calls.
- `src/support/storage.js` → `.specs/support/storage.js.md` — Class `StorageAdapter`: pluggable persistence backends (default binary-on-disk hierarchy) for concepts and theories.

## Use Case Specifications
- `(use case)` → `.specs/interface/usecase_define_theory.md` — **Defining Theories**: how to create, load, save, and merge theories.
- `(use case)` → `.specs/interface/usecase_validate.md` — **Validating Consistency**: how to check for contradictions and conflicts.
- `(use case)` → `.specs/interface/usecase_hypothesize.md` — **Generating Hypotheses**: abductive reasoning from observations to causes.
- `(use case)` → `.specs/interface/usecase_prove.md` — **Proving Theorems**: deductive reasoning and proof construction.

## Testing Harness
- `tests/runTests.js` → `.specs/tests/runTests.js.md` — CLI harness for suite discovery and execution across test profiles (auto/manual/prod-like).
- `tests/fixtures` → `.specs/tests/fixtures.md` — Shared test inputs/expected outcomes for suites.

## Open DS Questions
- Dimension configuration (minimum 512, optionally higher for production) affects masks, permutations, storage formats, and test fixtures; each DS must state supported configs and defaults.
- LSH implementation choice (custom vs. library) and storage backend for concepts/theories remain to be specified.
- Translator determinism strategy (model pinning, caching, or deterministic prompts) needs definition before interface solidifies.
