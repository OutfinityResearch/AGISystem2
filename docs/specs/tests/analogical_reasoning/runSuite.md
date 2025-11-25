# Suite: analogical_reasoning

ID: DS(/tests/analogical_reasoning/runSuite)

Scope: analogical delta reasoning.

Fixtures: `fixtures/analogical/legal_penalty.txt`.

Profile: `manual_test` (needs LSH p-stable for better neighborhood).

Steps/Assertions:
- Ingest fixtures.
- Compute delta Jail-Theft+Fraud → predicted vector.
- Retrieval returns concept in penalty region (Jail/Fine) with PLAUSIBLE+ band.
- Provenance shows delta computation and nearest neighbor distance.

Sample:
- Query delta result: expected `Jail` (or `Fine`) with band PLAUSIBLE; distance reported.***
