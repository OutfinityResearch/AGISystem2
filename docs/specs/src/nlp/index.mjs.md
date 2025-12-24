# Module: src/nlp/index.mjs

**Document Version:** 1.0
**Status:** Implemented
**Traces To:** DS13-BasicNLP, URS-14

---

## 1. Purpose

Natural Language Processing module for AGISystem2. Provides NL→DSL transformation with multiple translation strategies for different input formats.

---

## 2. Exports

```javascript
// Main transformer
export { NLTransformer } from './transformer.mjs';

// Tokenization
export { EnglishTokenizer, tokenize } from './tokenizer.mjs';

// Text normalization
export {
  normalizeText,
  expandContractions,
  removeFillers,
  singularize,
  pluralize,
  normalizeVerb,
  capitalize,
  capitalizeWord,
  toSentenceCase
} from './normalizer.mjs';

// Pattern matching
export { PATTERNS, matchPattern } from './patterns.mjs';

// Advanced NL→DSL (grammar-based)
export { translateNL2DSL } from './nl2dsl.mjs';
```

---

## 3. Module Overview

### 3.1 NLTransformer (transformer.mjs)

Main class for English→DSL transformation.

```javascript
class NLTransformer {
  constructor(options?: { customPatterns?: Pattern[], strict?: boolean })

  // Transform English text to DSL
  transform(text: string): TransformResult

  // Transform single sentence
  transformSentence(sentence: string): TransformResult
}

interface TransformResult {
  success: boolean;
  dsl: string;
  parsed: object;
  errors: string[];
}
```

**Supported Patterns:**
- `isA` - Classification: "X is Y" → `isA X Y`
- `binary` - Relations: "X verb Y" → `verb X Y`
- `ternary` - 3-arg: "X verb Y to Z" → `verb X Y Z`
- `negative` - Negation: "X doesn't verb Y" → `Not (verb X Y)`
- `conditional` - Rules: "If X then Y" → `Implies X Y`

### 3.2 EnglishTokenizer (tokenizer.mjs)

Text tokenization for English.

```javascript
class EnglishTokenizer {
  tokenize(text: string): Token[]
}

interface Token {
  word: string;
  type: 'word' | 'punctuation' | 'number';
  index: number;
}
```

### 3.3 Normalizer (normalizer.mjs)

Text preprocessing utilities.

```javascript
// Core normalization
normalizeText(text: string): string        // Lowercase, punctuation cleanup
expandContractions(text: string): string   // Can't → cannot
removeFillers(text: string): string        // Remove "um", "uh", etc.

// Morphological
singularize(word: string): string          // dogs → dog
pluralize(word: string): string            // dog → dogs
normalizeVerb(verb: string): string        // Verb normalization

// Capitalization
capitalize(text: string): string           // Capitalize first letter
capitalizeWord(word: string): string       // Capitalize word
toSentenceCase(text: string): string       // First letter only
```

### 3.4 translateNL2DSL (nl2dsl.mjs)

Advanced grammar-based NL→DSL for evaluation datasets.

```javascript
function translateNL2DSL(text: string, options?: TranslateOptions): TranslateResult

interface TranslateOptions {
  source?: 'prontoqa' | 'folio' | 'ruletaker' | 'generic';
  isQuestion?: boolean;  // Question vs. context
}

interface TranslateResult {
  dsl: string;
  errors: string[];
  success: boolean;
  source: string;
  type: string;
  autoDeclaredOperators: string[];
}
```

**Dataset Support:**
- **ProntoQA** - Ontology reasoning with inheritance
- **FOLIO** - First-order logic with quantifiers
- **RuleTaker** - Facts and rules with variables
- **Generic** - Fallback patterns

---

## 4. Submodules (nl2dsl/)

### 4.1 grammar.mjs
Grammar-based translation entry point.

### 4.2 grammar/parse.mjs
Main parsing coordinator.

### 4.3 grammar/parse/copula.mjs
"is/are" pattern handlers.

### 4.4 grammar/parse/fact.mjs
Fact statement patterns.

### 4.5 grammar/parse/rule.mjs
Rule (If-then) patterns.

### 4.6 grammar/parse/relation.mjs
Relation extraction patterns.

### 4.7 grammar/parse/shared.mjs
Shared parsing utilities.

### 4.8 grammar/text.mjs
Text preprocessing for grammar.

### 4.9 grammar/emit.mjs
DSL code generation.

### 4.10 utils.mjs
Helper utilities.

---

## 5. Dependencies

- No external dependencies (pure JavaScript)
- Internal: Uses regex patterns for matching

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| NLP-01 | "John is a person" | `isA John Person` |
| NLP-02 | "John loves Mary" | `loves John Mary` |
| NLP-03 | "Sky is blue" | `hasProperty Sky Blue` |
| NLP-04 | "John doesn't love Mary" | `Not (loves John Mary)` |
| NLP-05 | "If X human then X mortal" | `Implies (isA ?x Human) (isA ?x Mortal)` |
| NLP-06 | ProntoQA input | Valid DSL with inheritance |
| NLP-07 | FOLIO input | Valid DSL with quantifiers |
| NLP-08 | RuleTaker input | Valid DSL with rules |
| NLP-09 | Unknown pattern | Graceful fallback |
| NLP-10 | Contraction expansion | "can't" → "cannot" |

---

*End of Module Specification*
