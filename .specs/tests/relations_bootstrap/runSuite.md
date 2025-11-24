# Suite: relations_bootstrap

Scope: relations init + permuter.

Fixtures: `data/init/relations.json`.

Profile: `auto_test`.

Assertions:
- Default relation set loads; inverses and characteristics preserved.
- Audit log captures relationSeed and relation list hash.
- Relation permutations registered for all names; inverse lookup correct.

Sample:
- After bootstrap, `get('IS_A')` exists, `inverse('IS_A')` undefined; `get('CAUSES')` and `inverse('CAUSES')` distinct; audit entry includes seed value.***
