# Suite Audit: suite11_wedding_seating

## Intent

Validate the generic CP/CSP solve block on an allocation-style modeling case (seating/assignment):

- enumerate solutions for small constraint instances,
- ensure solution extraction works via queries against the solve destination relation,
- validate UNSAT behavior.

## URC mapping (DS49/DS52)

- Fragment: `Frag_CP`
- GoalKinds (future URC form): `Find`, `Count` (bounded enumeration)
- Evidence (future URC form): `Model` (witness assignments), `UnsatCore` / `Derivation` (infeasible)

## No runtime special-cases

This suite must not rely on a scenario-named solve type. It uses:

- `@<dest> solve csp ... end`

The word “wedding seating” is treated only as a modeling case and naming convention.

