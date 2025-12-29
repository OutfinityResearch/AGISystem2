# Module: `src/output/result-formatter.mjs`

**Purpose:** Format query/proof results into stable text output suitable for tests and user-facing responses.

## Responsibilities

- Normalize result objects into a consistent shape (query vs prove vs explain).
- Produce stable strings for evaluation comparisons (fastEval uses substring/containment checks).

## Integration

- Used by `Session.formatResult(...)` and response translators.
- Covered indirectly by integration tests and output unit tests.

## Related specs

- `docs/specs/DS/DS11-Decoding-Phrasing-Engine.md`
- `docs/specs/DS/DS14-EvalSuite.md`

