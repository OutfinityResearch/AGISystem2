# Design Spec: src/ingest/parser.js

Class `NLParser`
- **Role**: Parse natural-language text into structured subject–relation–object trees with depth limited by configurable recursion horizon; attach relation hints for downstream encoding.
- **Pattern**: Deterministic parser pipeline; external LLM/translator interaction goes through `TranslatorBridge`. SOLID: single responsibility for syntax-to-structure.
- **Key Collaborators**: `Config` (recursion limit), `TranslatorBridge` (NL → structured hints), `Encoder`.

## Public API
- `constructor({config, translator})`
- `parse(text)`: returns AST with nodes {token, relation, children[], hints}; enforces recursion horizon; yields provenance about translator version if used; expects constrained grammar (simple English S-R-O) unless translator normalizes.
- `normalize(node)`: optional cleanup (lowercasing, lemmatization) with deterministic rules.
- `setRecursionHorizon(limit)`: override horizon for specific runs (tests) without changing config defaults.

## Pseudocode (comments)
```js
class NLParser {
  constructor({config, translator}) {
    // store recursionHorizon = config.get('recursionHorizon');
  }

  parse(text) {
    // if translator provided: structured = translator.toStructure(text)
    // build AST; enforce recursion depth: if depth > horizon -> truncate/mark null node
    // attach relation hints (e.g., CAUSES, LOC) for encoder
    // return {root, metadata:{translatorVersion}}
  }

  normalize(node) {
    // deterministic token cleanup; no stochastic LLM calls here
  }
}
```

## Notes/Constraints
- Must be deterministic given same translator version/config; record translator metadata for audit.
- Do not perform encoding; keep YAGNI—minimal NLP beyond tree shaping.***
