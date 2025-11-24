# Suite: bias_audit

Scope: BiasController masks, Reasoner determinism under masking.

Fixtures: `fixtures/bias/skills_only.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Ingest fixtures (skills + age).
- Query "Should we hire Candidate?" baseline.
- Apply veil-of-ignorance mask (zero protected dims including age).
- Query again; result should be unchanged if skills dominate; provenance shows masked dims.

Sample:
- Result before mask: TRUE_CERTAIN; after mask: TRUE_CERTAIN; provenance notes age dim zeroed.***
