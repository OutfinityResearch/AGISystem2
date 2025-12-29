# Module: `src/nlp/normalizer.mjs`

**Purpose:** Normalize surface text into forms suitable for deterministic NL2DSL parsing.

Normalization is intentionally conservative: it aims to reduce spelling/format variance without introducing ambiguity.

## Typical responsibilities

- Unicode normalization (where required)
- Whitespace normalization
- Lowercasing / casing heuristics (where required)
- Light punctuation normalization (quotes/dashes)

## Integration

- Used by `src/nlp/nl2dsl.mjs` and/or `src/nlp/transformer.mjs`.
- Covered by unit tests in `tests/unit/nlp/*`.

## Related specs

- `docs/specs/DS/DS21-NL2DSL.md`
- `docs/specs/DS/DS13-BasicNLP.md`

