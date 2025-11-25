# Suite: bias_audit

ID: DS(/tests/bias_audit/runSuite)

Scope: BiasController masks, explicit Sys2DSL mask control, Reasoner determinism under masking.

Fixtures: `fixtures/bias/skills_only.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Ingest fixtures (skills + age) in a `System2Session` via Sys2DSL `ASSERT` commands.
- Baseline: query `"Should we hire Candidate?"` via `ASK` → obtain a truth band.
- Apply a veil-of-ignorance style mask by:
  - either activating a named bias mode in the session (e.g. via a dedicated command), or
  - constructing an explicit mask with `MASK_PARTITIONS ontology` or `MASK_DIMS ...` and using `ASK_MASKED`.
- Query again; result should be unchanged if skills dominate; provenance shows which dimensions were masked out (age-related axes zeroed).

Sample:
- Result before mask: TRUE_CERTAIN; after mask (via explicit Sys2DSL mask or bias mode): TRUE_CERTAIN; provenance notes age dimensions zeroed or excluded from the effective mask.***
