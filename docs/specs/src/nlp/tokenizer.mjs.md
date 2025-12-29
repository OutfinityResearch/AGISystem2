# Module: `src/nlp/tokenizer.mjs`

**Purpose:** Tokenize natural language input into a normalized token stream used by the NL→DSL pipeline.

This is not a general-purpose NLP tokenizer; it is tuned for the controlled language patterns that AGISystem2’s NL2DSL supports.

## Responsibilities

- Split input text into tokens (words, punctuation, quoted strings).
- Preserve information needed for downstream matching (case, punctuation classes).
- Provide stable behavior for evaluation runs (deterministic output).

## Integration

- Used by `src/nlp/nl2dsl.mjs` and/or `src/nlp/transformer.mjs`.
- Covered by unit tests in `tests/unit/nlp/*`.

## Related specs

- `docs/specs/DS/DS21-NL2DSL.md`
- `docs/specs/DS/DS13-BasicNLP.md`

