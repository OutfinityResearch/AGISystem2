# AGISystem2 Functional Specification (FS)

## Scope
Defines functional behavior of the neuro-symbolic engine that ingests Sys2DSL commands, encodes knowledge into a geometric conceptual space, reasons with layered theories, and returns deterministic answers with explanations. Implementation targets Node.js class-based modules.

## Functional Requirements

### Concept Representation and Geometry
- <a id="FS-01"></a>**FS-01 Concept Representation:** Represent every concept, fact, and query as fixed-width int arrays (Vector space with bounded diamonds: hyper-rectangle + L1 ball + relevance mask). Concepts are unions of one or more learned diamonds (clusters) sculpted through ingestion/learning. Dimension count is configurable (minimum 512; higher sizes for production) and drives ontology/axiology partitions and relation permutations.

### Theory Management
- <a id="FS-02"></a>**FS-02 Theory Layering and What-If:** Maintain a stack of theories (base + contextual overrides). Each layer can override dimension bounds/radius/masks and is addressable by name/context hints. The active stack is selected per query, enabling meta-rational handling of contradictory theories. Support creation of temporary theory layers and parallel evaluation branches; return comparative outcomes and deltas between branches when requested.

### Ingestion and Learning
- <a id="FS-03"></a>**FS-03 Ingestion Pipeline:** Parse Sys2DSL commands into subject-relation-object structures, enforce configurable recursion limits, and encode nodes into vectors using permutations and saturated addition. Confirm ingestion with summaries of applied rules.
- <a id="FS-04"></a>**FS-04 Learning & Updates:** Accumulate empirical observations via algebraic superposition; expand or split concept diamonds when polysemy or contradiction appears (dynamic clustering). Deterministic inscription for ontological/axiological axes.

### Reasoning Engine
- <a id="FS-05"></a>**FS-05 Reasoning Engine:** Assemble runtime concept definitions by flattening active theory layers; perform adversarial validation (optimist/sceptic radii) to return True/Plausible/False. Explicitly flag empty intersections as conflicts requiring user direction.
- <a id="FS-06"></a>**FS-06 Retrieval & Decoding:** Provide blind decoding by inspecting relation-hint masks; probe with inverse permutations; perform LSH or equivalent nearest-neighbor lookup to retrieve candidate concepts and associated theories.

### Explainability and Provenance
- <a id="FS-07"></a>**FS-07 Provenance & Explainability:** For every answer, return: active theories, contributing dimensions (per relevance mask), acceptance band used, and any overrides applied. Provide a concise natural-language justification.

### Session and Interaction
- <a id="FS-08"></a>**FS-08 Session-Based Interaction:** Provide a top-level entry class `AgentSystem2` that creates session-scoped `System2Session` objects. All ingestion of facts, queries, and theory updates from external callers must flow through `System2Session` APIs via Sys2DSL command lines. Direct access to internal modules (`ConceptStore`, `Reasoner`, `TheoryStack`, etc.) is not permitted for user code. Each session manages its own active theory, with explicit commands to persist or merge it.
- <a id="FS-09"></a>**FS-09 Language Handling:** Core engine operates in English semantics; non-English inputs are routed through an external translation/LLM bridge with clear attribution in provenance. The bridge translates natural language to Sys2DSL before submission to the engine.

### Persistence and Administration
- <a id="FS-10"></a>**FS-10 Persistence & Versioning:** Store theories separately from runtime memory; enable versioned snapshots and reload. Maintain audit logs of theory changes and ingested facts.
  - **Pluggable Storage**: Theory storage uses a pluggable adapter interface (`TheoryStorage`). Default implementation uses file system with `.sys2dsl` (DSL text) and `.theory.json` (structured facts) formats. Custom adapters can be provided for database, cloud, or in-memory storage.
  - DSL commands (`LOAD_THEORY`, `SAVE_THEORY`, etc.) work directly with storage, enabling use as a library without CLI.
- <a id="FS-11"></a>**FS-11 Administrative Operations:** Provide commands to list theories, inspect concept bounds, view conflicts, and trigger re-clustering events without modifying raw data.

### Safety and Validation
- <a id="FS-12"></a>**FS-12 Safety & Bias Controls:** Separate ontological and axiological dimensions; allow activation of masks (e.g., bias audits, veil-of-ignorance mode) that zero selected dimensions during reasoning.
- <a id="FS-13"></a>**FS-13 Validation & Abstract Interpretation:** Support symbolic/abstract runs over the conceptual space to validate theory consistency, rule/program correctness, and mask effects without mutating state; surface counterexamples or contradictions geometrically.

### Sys2DSL
- <a id="FS-14"></a>**FS-14 Sys2DSL Theory Programs:** Expose a small, deterministic line-oriented DSL (Sys2DSL) that lets users and domain authors define reusable reasoning programmes in text theory files. Sys2DSL composes core primitives (ask, abduct, counterfactual queries, fact search, requirement coverage checks, mask control) into higher-level checks without embedding domain-specific logic inside the engine code.

### Ontology Introspection
- <a id="FS-15"></a>**FS-15 Ontology Discovery Commands:** Provide DSL commands that enable introspection of the knowledge base to support ontology auto-discovery:
  - `EXPLAIN_CONCEPT <concept>`: Returns structured information about what the system knows about a concept, including IS_A types, properties, relations, and all facts where it appears.
  - `MISSING "<statement>"`: Analyzes a statement or script and returns a list of concepts that are not defined in the knowledge base, with type suggestions and questions to help define them.
  - `WHAT_IS <concept>`: Returns a simple natural-language description of a concept based on its IS_A relations and properties.

  These commands enable LLM-assisted ontology population by identifying knowledge gaps before executing queries.

### Base Theories and Initialization
- <a id="FS-16"></a>**FS-16 Base Theory Preloading:** System automatically loads foundational theories at session initialization:
  - **Ontology Base** (`data/init/theories/base/ontology_base.sys2dsl`): Fundamental facts about categories (entity, physical_entity, abstract_entity), living things (mammal, bird, animal), spatial relations (continent, country, city), temporal relations (BEFORE, AFTER), causal relations, human roles, and artifacts.
  - **Axiology Base** (`data/init/theories/base/axiology_base.sys2dsl`): Foundational value facts about ethics (good, bad, harm, benefit), deontic modalities (obligation, permission, prohibition), rights and duties, professional ethics, fairness principles, and bias masking rules.
  - **Caching Mechanism**: Theories are compiled to JSON cache on first load; subsequent loads use cache for ~10x faster initialization. Cache is automatically invalidated when source files change.
  - Sessions can opt out of preloading via `skipPreload: true` for testing isolation.

### Meta-Theory Registry
- <a id="FS-17"></a>**FS-17 Theory Meta-Information:** Maintain a registry of available theories with metadata:
  - Theory name, description, domain, and version
  - Priority and applicability rules
  - Dependencies on other theories
  - Reasoning mode preferences (which inference methods work best)
  - Usage statistics (success rates of different reasoning strategies)
  This enables intelligent theory selection and reasoning strategy optimization.

## Requirement Cross-Reference

| New ID | Original IDs | Consolidation Notes |
|--------|--------------|---------------------|
| FS-01 | FS-01 | Unchanged |
| FS-02 | FS-02, FS-08 | Merged theory layering + what-if/parallel reasoning |
| FS-03 | FS-03 | Updated: NL → Sys2DSL |
| FS-04 | FS-04 | Unchanged |
| FS-05 | FS-05 | Unchanged |
| FS-06 | FS-06 | Unchanged |
| FS-07 | FS-07 | Unchanged |
| FS-08 | FS-09, FS-16 | Merged session-based interaction (were duplicates) |
| FS-09 | FS-10 | Renumbered, clarified NL→Sys2DSL translation |
| FS-10 | FS-11 | Renumbered |
| FS-11 | FS-13 | Renumbered |
| FS-12 | FS-12 | Unchanged |
| FS-13 | FS-14 | Renumbered |
| FS-14 | FS-15 | Renumbered |
| FS-15 | NEW | Ontology discovery commands |
| FS-16 | NEW | Base theory preloading |
| FS-17 | NEW | Theory meta-information registry |
| - | FS-08 | Consolidated into FS-02 |
| - | FS-16 | Consolidated into FS-08 |

## Global Architecture Reference

The functional requirements above rely on a shared geometric reasoning model, data rules, and key flows that are specified in the global design spec:

- **DS[/global_arch]** – Global geometric architecture and reasoning model:
  - reasoning typologies (deductive, inductive, abductive, analogical, counterfactual, temporal/causal, deontic, sparsity, validation/abstract);
  - data and structural rules (vector ranges, partitions, relation permutations, theory overlays, property tokens);
  - key flows (Ingest, Answer, Conflict Handling, Validation).

All module-level DS documents (`core`, `knowledge`, `ingest`, `reason`, `theory`, `interface`, `support`) must be interpreted in the context of DS[/global_arch]. FS-01...FS-14 are considered satisfied only when both the per-module behaviour and the global architecture constraints are met.

## Open Issues / Design Risks
- Configurable dimension counts (512 minimum, higher for production) require masks, permutations, and test suites to validate behavior across settings; supported values are restricted to {512, 1024, 2048, 4096} to simplify layout and testing.
- Relation-hint structures must be sized so that false positives remain below 1% for typical workloads; the default is a 256-bit hint mask per vector with up to four hash functions, and must be validated empirically.
- Clustering thresholds and polysemy detection criteria must be tuned per domain; the initial rule is to split when the masked L1 distance of a new point to the nearest diamond exceeds 1.5x that diamond's radius on ontology axes, and to consider merges when centroids are within 0.5x radius, but these factors may need adjustment.
- Translation/LLM bridge behavior must remain deterministic; the initial strategy is to pin model ID, prompt, and decoding parameters (temperature=0, top_p=0) and to reject inputs when the bridge cannot produce valid Sys2DSL structures.
