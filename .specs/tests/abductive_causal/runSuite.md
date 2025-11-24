# Suite: abductive_causal

Scope: CAUSES/CAUSED_BY relations; Reasoner abductive mode.

Fixtures: `fixtures/causal/fire_smoke.txt`.

Profile: `auto_test`.

Steps/Assertions:
- Ingest causal fixtures.
- Observation vector for "Smoke" with relation hint CAUSES.
- Abductive inverse returns nearest concept `Fire` within PLAUSIBLE or TRUE band.
- Provenance cites relation permutation used and distance.

Sample:
- Observation: "Smoke"; hint: CAUSES; Result: `Fire`, band=PLAUSIBLE, distance < threshold.***
