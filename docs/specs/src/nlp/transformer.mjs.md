# Module: `src/nlp/transformer.mjs`

**Purpose:** Transform a tokenized/normalized NL input into candidate DSL statements.

This module is the “rules engine” of the NL2DSL pipeline: it applies pattern templates and heuristics to produce:

- DSL candidates (possibly multiple)
- confidence/trace metadata (where available)
- failure reasons when no pattern matches

## Integration

- Entry points are used by `src/nlp/nl2dsl.mjs`.
- Must remain deterministic under evaluation runs.

## Related specs

- `docs/specs/DS/DS21-NL2DSL.md`
- `docs/specs/DS/DS13-BasicNLP.md`

