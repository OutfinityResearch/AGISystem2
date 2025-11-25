# Suite: counterfactual_layering

ID: DS(/tests/counterfactual_layering/runSuite)

Scope: TheoryStack counterfactuals, Reasoner, ValidationEngine, driven via Sys2DSL in a `System2Session`.

Fixtures: `fixtures/concepts/basic.txt`, `fixtures/counterfactual/boil50.txt`, Sys2DSL theory `physics_test.sys2dsl` (optional binary cache `physics_test.bin`).

Profile: `auto_test`.

Steps/Assertions:
- Ingest basics through a `System2Session` using Sys2DSL `ASSERT` commands; base query `"Is water boiling at 50?"` via `ASK` → FALSE.
- Apply a counterfactual layer by loading and appending the `physics_test.sys2dsl` theory (or equivalent overrides from `boil50.txt`) to the session’s theory; query again → TRUE_CERTAIN.
- Ensure the base theory stack (without the counterfactual lines) remains unaffected for other sessions.
- ValidationEngine reports override provenance (layer name, relevant temperature dimension).

Sample:
- Base answer: FALSE; Counterfactual answer: TRUE_CERTAIN with provenance `{layer: physics_test, dim: TemperatureAxis}`.***
