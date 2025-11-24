# Suite: deontic_reasoning

Scope: deontic relations (PERMITS/PROHIBITS/OBLIGATES) and axiology.

Fixtures: `fixtures/deontic/law_minimal.txt`, optional War layer.

Profile: `manual_test`.

Steps/Assertions:
- Ingest law_minimal fixtures (base layer active).
- Query "Is killing permitted?" → FALSE.
- Activate War layer (permits killing) → query returns PLAUSIBLE/TRUE; conflict flagged if both layers active without precedence.
- BiasController can mask axiology dims to observe effect (optional).

Sample:
- Base: FALSE; With War layer: TRUE/PLAUSIBLE; Conflict report includes layer names and axiology dims.***
