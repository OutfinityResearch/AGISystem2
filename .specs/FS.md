# AGISystem2 Functional Specification (FS)

## Scope
Defines functional behavior of the neuro-symbolic engine that ingests natural language, encodes knowledge into a geometric conceptual space, reasons with layered theories, and returns deterministic answers with explanations. Implementation targets Node.js class-based modules.

## Functional Requirements
- **FS-01 Concept Representation:** Represent every concept, fact, and query as fixed-width int arrays (Vector space with bounded diamonds: hyper-rectangle + L1 ball + relevance mask). Concepts are unions of one or more learned diamonds (clusters) sculpted through ingestion/learning. Dimension count is configurable (minimum 512; higher sizes for production) and drives ontology/axiology partitions and relation permutations.
- **FS-02 Theory Layering:** Maintain a stack of theories (base + contextual overrides). Each layer can override dimension bounds/radius/masks and is addressable by name/context hints. The active stack is selected per query, enabling meta-rational handling of contradictory theories (coexistence plus context-driven selection/justification).
- **FS-03 Ingestion Pipeline:** Parse natural language into subject–relation–object trees, enforce configurable recursion limits, and encode nodes into vectors using permutations and saturated addition. Confirm ingestion with summaries of applied rules.
- **FS-04 Learning & Updates:** Accumulate empirical observations via algebraic superposition; expand or split concept diamonds when polysemy or contradiction appears (dynamic clustering). Deterministic inscription for ontological/axiological axes.
- **FS-05 Reasoning Engine:** Assemble runtime concept definitions by flattening active theory layers; perform adversarial validation (optimist/sceptic radii) to return True/Plausible/False. Explicitly flag empty intersections as conflicts requiring user direction.
- **FS-06 Retrieval & Decoding:** Provide blind decoding by inspecting relation-hint masks; probe with inverse permutations; perform LSH or equivalent nearest-neighbor lookup to retrieve candidate concepts and associated theories.
- **FS-07 Provenance & Explainability:** For every answer, return: active theories, contributing dimensions (per relevance mask), acceptance band used, and any overrides applied. Provide a concise natural-language justification.
- **FS-08 Parallel/What-if Reasoning:** Allow creation of temporary theory layers and parallel evaluation branches; return comparative outcomes and deltas between branches when requested, exposing meta-rational comparisons across conflicting theory sets.
- **FS-09 Interaction Layer:** Expose a deterministic API to the LLM translator and to external callers. Natural-language interface is mediated by a lightweight translator; the core engine receives structured calls only.
- **FS-10 Language Handling:** Core engine operates in English semantics; non-English inputs are routed through an external translation/LLM bridge with clear attribution in provenance.
- **FS-11 Persistence & Versioning:** Store theories separately from runtime memory; enable versioned snapshots and reload. Maintain audit logs of theory changes and ingested facts.
- **FS-12 Safety & Bias Controls:** Separate ontological and axiological dimensions; allow activation of masks (e.g., bias audits, veil-of-ignorance mode) that zero selected dimensions during reasoning.
- **FS-13 Administrative Operations:** Provide commands to list theories, inspect concept bounds, view conflicts, and trigger re-clustering events without modifying raw data.
- **FS-14 Validation & Abstract Interpretation:** Support symbolic/abstract runs over the conceptual space to validate theory consistency, rule/program correctness, and mask effects without mutating state; surface counterexamples or contradictions geometrically.

## Reasoning Typologies (Geometric Operations)
- Deductive: point/volume inclusion within diamonds (strict/fuzzy).
- Inductive: envelope construction (min/max, centroid, L1 radius) to form new diamonds from examples.
- Abductive: inverse permutation probing plus nearest-neighbor lookup for best-explanation hypotheses.
- Analogical: vector translation (delta application) to map relations across domains.
- Counterfactual/Non-monotonic: theory-layer overrides and temporary layers to simulate alternative realities.
- Temporal/Causal: rotational encoding for time steps; inverse rotations for recall; causal permutations.
- Deontic/Normative: forbidden/obligation volumes with strict radii and context-dependent layers.
- Sparsity/Attention: relevance mask activation to focus comparisons on specific subspaces.
- Validation/Abstract: symbolic execution over theory stacks and dimensions to check consistency and expected outcomes without relying on empirical data.

## Data and Structural Rules
- Vectors are int-based with clamped arithmetic; relevance masks and relation hints use bitwise ops.
- Relation permutations are deterministic shuffles; new relations are generated orthogonally when missing.
- Theory overrides must not mutate stored base concepts; runtime synthesis combines overlays on demand.

## Key Flows
- **Ingest:** Parse text → tree → vector encoding → superposition update → clustering check → persist → confirm.
- **Answer:** Receive query + optional context → select theory stack (or multiple stacks for comparison) → synthesize runtime concept → validate (optimist/sceptic) → retrieve nearest matches → produce boolean/graded answer + explanation.
- **Conflict Handling:** Detect empty intersections or high collinearity between ontological and axiological axes; prompt user for precedence or masking; surface meta-rational options (compare stacks, request priority).
- **Validate (Symbolic/Abstract):** Run abstract interpretation/symbolic execution over theory stacks, masks, and relations to prove/deny reachability or inclusion properties without consuming new data; report counterexamples.

## Open Issues / Design Risks
- Configurable dimension counts (512 minimum, higher for production) require masks, permutations, and test suites to validate behavior across settings; supported values are restricted to {512, 1024, 2048, 4096} to simplify layout and testing.
- Relation-hint structures must be sized so that false positives remain below 1% for typical workloads; the default is a 256-bit hint mask per vector with up to four hash functions, and must be validated empirically.
- Clustering thresholds and polysemy detection criteria must be tuned per domain; the initial rule is to split when the masked L1 distance of a new point to the nearest diamond exceeds 1.5× that diamond’s radius on ontology axes, and to consider merges when centroids are within 0.5× radius, but these factors may need adjustment.
- Translation/LLM bridge behavior must remain deterministic; the initial strategy is to pin model ID, prompt, and decoding parameters (temperature=0, top_p=0) and to reject inputs when the bridge cannot produce valid S-R-O structures, but further hardening and caching policies may be required in production.***
