# AGISystem2 Non-Functional Specification (NFS)
**Document ID:** NFS

## Performance and Capacity
- <a id="NFS-001"></a>**NFS-001:** Operate on modern CPUs only (Node.js), no GPU/native/wasm dependencies for the core engine (MLP targets functional completeness over micro-optimizations).
- <a id="NFS-002"></a>**NFS-002:** Target interactive latency for single-query reasoning (<500 ms on commodity CPU) with millions of stored concepts/facts.
- <a id="NFS-003"></a>**NFS-003:** Support vector arithmetic using byte-level operations and loop unrolling to enable JIT/SIMD optimization.
- <a id="NFS-004"></a>**NFS-004:** Handle millions of concepts and facts in memory/persistent store without degrading retrieval beyond acceptable bounds (LSH or equivalent must stay O(1) expected).
- <a id="NFS-005"></a>**NFS-005:** Ensure geometric reasoning across the conceptual space (inclusion, permutation probing, translations, rotations) remains performant at configured dimension counts.

## Reliability and Determinism
- <a id="NFS-006"></a>**NFS-006:** Deterministic execution: identical inputs, theory stacks, and memory state yield identical outputs.
- <a id="NFS-007"></a>**NFS-007:** Meta-rational handling of contradictions: conflicting theories may coexist, but selection/justification of active layers must be deterministic and logged.
- <a id="NFS-008"></a>**NFS-008:** Fail closed on contradictions (empty intersections) with explicit user prompts rather than silent degradation.
- <a id="NFS-009"></a>**NFS-009:** Provide versioned snapshots and recovery for theories and knowledge bases.
- <a id="NFS-010"></a>**NFS-010:** Symbolic/abstract validation runs must be side-effect free and reproducible; logs must capture the theory stack and masks used.

## Explainability and Auditability
- <a id="NFS-011"></a>**NFS-011:** Every output must include provenance (active theories, contributing dimensions, override details, acceptance band).
- <a id="NFS-012"></a>**NFS-012:** Maintain append-only audit logs for theory changes, ingestions, clustering events, and translation steps.
- <a id="NFS-013"></a>**NFS-013:** Support bias/audit modes that can be toggled and traced in logs.

## Security and Data Governance
- <a id="NFS-014"></a>**NFS-014:** Isolate theory storage from runtime memory; enforce integrity checks on persisted overlays.
- <a id="NFS-015"></a>**NFS-015:** Protect audit logs and theory definitions from tampering; include basic access controls (role-scoped operations) in future revisions.

## Maintainability and Extensibility
- <a id="NFS-016"></a>**NFS-016:** Use modular Node.js classes with clear interfaces; avoid engine-specific optimizations that block extension.
- <a id="NFS-017"></a>**NFS-017:** Generate new relations/permutations deterministically to keep compatibility across instances.
- <a id="NFS-018"></a>**NFS-018:** Externalize and document configuration (dimension partitions, recursion limits, clustering thresholds).

## Minimum Lovable Product (MLP)
- <a id="NFS-019"></a>**NFS-019:** Deliver a Minimum Lovable Product, not a minimal prototype: all core functional capabilities from URS/FS (concept geometry, theory layering, ingestion, reasoning typologies, Sys2DSL programmes, bias controls, temporal memory, validation hooks, persistence and auditability) must be present and demonstrably usable end-to-end.
- <a id="NFS-020"></a>**NFS-020:** Prioritize correctness, determinism, explainability and meta-rational behaviour over low-level performance tuning; SIMD/native/wasm optimizations are explicitly out of scope but the design must allow them later without breaking contracts.
- <a id="NFS-021"></a>**NFS-021:** Partial or stubbed implementations that violate advertised behaviour are not acceptable at MLP stage; any unsupported feature or mode must fail fast and be clearly marked as not yet available in logs and documentation.
- <a id="NFS-022"></a>**NFS-022:** Test coverage at MLP stage must include end-to-end suites for each major capability (geometry, ingestion, retrieval, theory layering, Sys2DSL-based reasoning, validation, bias/temporal reasoning) with deterministic profiles and reproducible fixtures.

## Compatibility and Localization
- <a id="NFS-023"></a>**NFS-023:** Core semantics in English; translation/LLM bridge is a dependency boundary with explicit contracts and versioning.
- <a id="NFS-024"></a>**NFS-024:** APIs must be stable and schema-validated to support embedding in larger systems.

## Constraints and Limits
- <a id="NFS-025"></a>**NFS-025:** Vector dimensions: configurable but restricted to {512, 1024, 2048, 4096}; auto_test uses 512, manual_test 1024, and prod defaults to 2048 (4096 for high-capacity deployments). Masks, permutations, and storage layouts must adapt to the configured size.
- <a id="NFS-026"></a>**NFS-026:** Value ranges: int values in [-127, 127]; zero indicates irrelevance; clamping is mandatory on all arithmetic.
- <a id="NFS-027"></a>**NFS-027:** Recursion horizon for parsing must prevent saturation; the limit is configurable (default target 3).
- <a id="NFS-028"></a>**NFS-028:** Reasoning and temporal operations must be bounded in work: a `maxReasonerIterations` limit caps the number of reasoning steps per query, and `maxTemporalRewindSteps` caps how many inverse rotations can be applied in one rewind call. These limits are configurable but require safe defaults for test and prod profiles.

## Risks and Open Issues
- Multiple supported dimension configurations may vary in performance and expressivity; benchmarking and guidance are needed to pick defaults per environment.
- LSH/nearest-neighbor strategy may need tuning to balance accuracy vs. CPU budget.
- Translation dependency can introduce nondeterminism; need a pinning/caching strategy for repeatability.
- Storage format/versioning for theories and masks must be defined to avoid drift between instances.
