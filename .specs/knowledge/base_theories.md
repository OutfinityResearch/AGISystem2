# Base and Test Theories Specification

Purpose: define sensible default dimension partitions, baseline constraints for the root theory, and minimal test layers for validation. These are conceptual; concrete dimension indices reference configured partitions (ontology/axiology) without assuming a full ontology list.

## Dimension Partition Defaults (fixed across profiles)
- Ontology: 0–255
- Axiology: 256–383
- Empirical: remaining dims (start at 384)

## Root Theory (Base)
Scope: essential invariants; should always be loaded. Constraints are expressed in terms of the dimension catalog. The ontology existence/validity dimension (ontology index 0) must be strictly positive for any stored concept or fact. Physicality and causality flags (for example, ontology indices used for physical presence and causal relevance) must lie in [0, 127]; negative values are disallowed. A time direction flag (the ontology axis that indicates forward time) is fixed for forward reasoning; temporal overrides should only occur via `TemporalMemory` rotations, not by directly changing this axis in layers. Axiology starts neutral: by default the axiology partition is centered at 0 with a small radius to avoid implicit, undeclared bias. All value ranges are globally clamped to [-127, 127] by the math engine. The base theory specifies no overrides; it acts as the ground floor for theory stacks and must be compatible with all domain layers built on top.

## Minimal Test Theories (Layer Examples)
Law_Minimal adjusts the axiology dimensions used for legality and permissibility (for example, moral valence and legal compliance axes) to be strongly negative for “forbidden” acts and positive for “explicitly permitted” acts. Its definition mask covers those axes and it constrains obligation and permission dimensions to tight radii so deontic checks become crisp and reproducible. Physics_Test defines the temperature axis in the empirical range for relevant concepts, with min/max aligned to physically reasonable values, and sets a specific boiling point for water. This layer is used to test counterfactual overrides, such as changing the boiling point.

Ethics_Test configures the moral valence axis to a baseline negative value for “harm” and a neutral or positive value for “repair.” This layer is useful for verifying that bias control masks (veil-of-ignorance modes) can zero moral axes and yield different or stable decisions as expected. Conflict_Demo introduces two incompatible layers: one layer sets a given permission axis to -127 (forbidden), while another sets it to +50 (allowed). This pair is used to test meta-rational stack selection, conflict detection, and precedence resolution.

Health_Compliance adjusts legality and permission axes for handling protected health information and ties them to ontology axes that signal whether consent has been given and an audit trail is present. It introduces dimensions for jurisdiction tags that distinguish GDPR and HIPAA contexts, enabling tests where export operations are legal in one context and illegal in another. SciFi_TechMagic overrides world rules to permit technology-based “magic” in specific locations by relaxing DISJOINT_WITH relationships for selected city concepts; it is used to test narrative consistency and controlled departures from base physics.

## Usage in Tests
- Auto tests: use `auto_test` profile with `Law_Minimal` and `Physics_Test` to validate inclusion, abductive, and counterfactual paths quickly.
- Manual tests: extend with `Ethics_Test` and `Conflict_Demo`; run validation engine to ensure contradictions are flagged and explained.
- Prod: base theory plus domain-specific layers; ensure partitions align with configured dimensions; adjust indices but keep separation between ontology and axiology.

## Notes
Dimension indices mentioned here follow the ontology and axiology catalogs; implementations must use those catalogs rather than ad-hoc numbering. Theory files should be stored via `StorageAdapter` (file_binary default) in hierarchical paths (for example, `theories/base/root.bin`, `theories/law/minimal.bin`, `theories/law/conflictA.bin`). Child layers never mutate parent files; overrides are applied by `TheoryStack` at runtime in a deterministic order.***
