# Suite Audit: suite31_csp_alldifferent

## Intent

Exercise the generic CP/CSP solve mechanism (`solve csp`) using the `allDifferent` constraint.

## URC alignment

- Fragment: `Frag_CP` (CP backend)
- Backend adapter: internal CP backend via `solve csp` (DS16 / DS55 direction)
- Evidence/artifacts: produced via `Session.solveURC()` when URC packs are loaded

## Vocabulary policy

This suite uses only baseline packs plus suite-local entities and relations:

- `isA`
- `allDifferent` as a solve-block declaration (not a KB operator)

## Notes

- The `allDifferent` constraint is treated as a generic global constraint across the solve block variables.
- This suite intentionally avoids scenario-specific solve types.

