# Suite: counterfactual_layering

Scope: TheoryStack counterfactuals, Reasoner, ValidationEngine.

Fixtures: `fixtures/concepts/basic.txt`, `fixtures/counterfactual/boil50.txt`, layer `physics_test.bin`.

Profile: `auto_test`.

Steps/Assertions:
- Ingest basics; base query "Is water boiling at 50?" → FALSE.
- Apply counterfactual layer (`physics_test` or `boil50` override); query → TRUE_CERTAIN.
- Ensure base stack unaffected after counterfactual run.
- ValidationEngine reports override provenance (layer name, dim E0).

Sample:
- Base answer: FALSE; Counterfactual answer: TRUE_CERTAIN with provenance `{layer: physics_test, dim: E0 (Temperature)}`.***
