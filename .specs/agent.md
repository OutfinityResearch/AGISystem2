# AGISystem2 Specification Playbook

This file captures working conventions for maintaining the AGISystem2 specifications in GAMP style (URS, FS, NFS, DS). Keep all specs in English, Markdown, and ASCII.

## Working Rules
- Treat `.specs` as the single source of truth for requirements; update URS/FS/NFS together when scope shifts.
- DS docs are referenced via `DS_map.md`; add new DS entries there before writing module-level DS files.
- Call out design gaps or contradictions explicitly (e.g., configurable dimension count with 512+ minimum vs. higher prod targets, ontology/axiology partitions) rather than silently choosing one.
- Keep the implementation model anchored in Node.js with class-based modules; list exported class names, constructor inputs, and main methods in DS docs.
- Preserve determinism and explainability as first-class goals; every functional addition should note how it supports traceability, layered-theory behavior, and meta-rational handling of contradictions.
- Emphasize the conceptual space/diamond geometry as the core abstraction; keep reasoning typologies (deductive, inductive, abductive, analogical, counterfactual, temporal/causal, deontic, sparsity, validation/abstract) visible in specs.
- Record assumptions, open issues, and risks in each doc section; do not let ambiguities persist across sessions.
- Avoid code in specs; when needed, describe interfaces and file names, not implementations.
