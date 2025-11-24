# AGISystem2 Non-Functional Specification (NFS)

## Performance and Capacity
- Operate on modern CPUs only (Node.js), no GPU/native/wasm dependencies for MVP.
- Target interactive latency for single-query reasoning (<500 ms on commodity CPU) with millions of stored concepts/facts.
- Support vector arithmetic using byte-level operations and loop unrolling to enable JIT/SIMD optimization.
- Handle millions of concepts and facts in memory/persistent store without degrading retrieval beyond acceptable bounds (LSH or equivalent must stay O(1) expected).
- Geometric reasoning across the conceptual space (inclusion, permutation probing, translations, rotations) must remain performant at configured dimension counts.

## Reliability and Determinism
- Deterministic execution: identical inputs, theory stacks, and memory state yield identical outputs.
- Meta-rational handling of contradictions: conflicting theories may coexist, but selection/justification of active layers must be deterministic and logged.
- Fail closed on contradictions (empty intersections) with explicit user prompts rather than silent degradation.
- Provide versioned snapshots and recovery for theories and knowledge bases.
- Symbolic/abstract validation runs must be side-effect free and reproducible; logs must capture the theory stack and masks used.

## Explainability and Auditability
- Every output must include provenance (active theories, contributing dimensions, override details, acceptance band).
- Maintain append-only audit logs for theory changes, ingestions, clustering events, and translation steps.
- Support bias/audit modes that can be toggled and traced in logs.

## Security and Data Governance
- Isolate theory storage from runtime memory; enforce integrity checks on persisted overlays.
- Protect audit logs and theory definitions from tampering; include basic access controls (role-scoped operations) in future revisions.

## Maintainability and Extensibility
- Modular Node.js classes with clear interfaces; avoid engine-specific optimizations that block extension.
- New relations/permutations must be generated deterministically to keep compatibility across instances.
- Configuration (dimension partitions, recursion limits, clustering thresholds) must be externalized and documented.

## Compatibility and Localization
- Core semantics in English; translation/LLM bridge is a dependency boundary with explicit contracts and versioning.
- APIs must be stable and schema-validated to support embedding in larger systems.

## Constraints and Limits
- Vector dimensions: configurable but restricted to {512, 1024, 2048, 4096}; auto_test uses 512, manual_test 1024, and prod defaults to 2048 (4096 for high-capacity deployments). Masks, permutations, and storage layouts must adapt to the configured size.
- Value ranges: int values in [-127, 127]; zero indicates irrelevance; clamping is mandatory on all arithmetic.
- Recursion horizon for parsing must prevent saturation; the limit is configurable (default target 3).

## Risks and Open Issues
- Multiple supported dimension configurations may vary in performance and expressivity; benchmarking and guidance are needed to pick defaults per environment.
- LSH/nearest-neighbor strategy may need tuning to balance accuracy vs. CPU budget.
- Translation dependency can introduce nondeterminism; need a pinning/caching strategy for repeatability.
- Storage format/versioning for theories and masks must be defined to avoid drift between instances.
