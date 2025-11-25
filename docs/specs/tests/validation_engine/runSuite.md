# Suite: validation_engine

ID: DS(/tests/validation_engine/runSuite)

Scope: ValidationEngine consistency checks and counterexamples.

Fixtures: DISJOINT_WITH examples (inline) or `fixtures/deontic/law_minimal.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Define two concepts with DISJOINT_WITH; prove empty intersection triggers conflict.
- Prove inclusion of valid point in concept with masks; report proof steps.
- Find counterexample when conflicting layers applied; report first violating point deterministically (seeded search).

Sample:
- Concepts A/B with DISJOINT_WITH → validation reports conflict on overlap attempt.
- Counterexample: Layer A permits value, Layer B forbids same dim → first violating point returned with dim index.***
