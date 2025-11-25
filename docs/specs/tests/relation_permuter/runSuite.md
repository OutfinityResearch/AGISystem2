# Suite: relation_permuter

ID: DS(/tests/relation_permuter/runSuite)

Scope: `RelationPermuter` and default relations.

Fixtures: uses `data/init/relations.json` (default relations).

Profile: `auto_test`.

Assertions:
- `bootstrapDefaults` registers all defaults; count matches spec.
- Symmetric relations reuse permutation (EQUIVALENT_TO, DISJOINT_WITH, RELATED_TO).
- Inverse pairs have distinct perms and correct inverse mapping.
- Determinism: same seed → same tables across runs.

Sample:
- Register `CAUSES` then `CAUSED_BY`; check `perm` differs, `inverse` mapping consistent; re-run bootstrap → identical tables.***
