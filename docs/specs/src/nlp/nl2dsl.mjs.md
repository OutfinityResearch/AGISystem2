# Module: `src/nlp/nl2dsl.mjs`

**Purpose:** Public NL→DSL pipeline entry point for AGISystem2.

This module orchestrates:

- normalization (`src/nlp/normalizer.mjs`)
- tokenization (`src/nlp/tokenizer.mjs`)
- transformation/pattern matching (`src/nlp/transformer.mjs`)

It returns one or more DSL candidates and is used by evaluation suites and interactive workflows.

## Related specs

- `docs/specs/DS/DS21-NL2DSL.md`
- `docs/specs/DS/DS13-BasicNLP.md`

