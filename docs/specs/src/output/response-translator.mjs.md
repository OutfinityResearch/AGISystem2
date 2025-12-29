# Module: `src/output/response-translator.mjs`

**Purpose:** Convert internal reasoning results into user-oriented response objects and text.

This layer owns:

- selecting phrasing styles (concise vs elaborate)
- attaching proof summaries when available
- formatting bindings/solutions into readable output

## Integration

- Constructed by `Session` as `session.responseTranslator`.
- Uses `src/output/response-translator/*` submodules for specific actions (`learn`, `query`, `prove`, etc.).

## Related specs

- `docs/specs/DS/DS11-Decoding-Phrasing-Engine.md`
- `docs/specs/DS/DS14-EvalSuite.md`

