# AGISystem2 - System Specifications

# Chapter 21: Natural Language to DSL Translation (NL2DSL)

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Scope:** NLP module - Grammar-based translation for reasoning datasets

---

## 21.1 Goal

AGISystem2 SHALL provide robust Natural Language to DSL translation for:
1. Evaluation datasets (ProntoQA, FOLIO, RuleTaker)
2. General English sentences
3. First-order logic expressions in natural language

This enables automated reasoning evaluation without manual DSL authoring.

---

## 21.2 Scope

### In Scope
- Sentence-level NL→DSL translation
- Dataset-specific grammar rules
- Variable binding and quantifier handling
- Negation and conditional parsing
- Error reporting for unparseable input

### Out of Scope
- Discourse-level understanding
- Coreference resolution across sentences
- Ambiguity resolution via LLM
- Real-time conversation handling

---

## 21.3 Public API

### 21.3.1 Main Entry Point

```javascript
/**
 * Translate natural language text to Sys2DSL
 * @param {string} text - Input natural language
 * @param {TranslateOptions} options - Translation options
 * @returns {TranslateResult} Translation result
 */
function translateNL2DSL(text: string, options?: TranslateOptions): TranslateResult

interface TranslateOptions {
  source?: 'prontoqa' | 'folio' | 'ruletaker' | 'generic';
  isQuestion?: boolean;       // True for questions, false for context/facts
  strict?: boolean;           // Fail on unknown patterns
  autoDeclare?: boolean;      // Auto-declare new operators
}

interface TranslateResult {
  success: boolean;
  dsl: string;                // Generated DSL code
  errors: string[];           // Error messages if any
  source: string;             // Which grammar was used
  type: 'fact' | 'rule' | 'query' | 'unknown';
  autoDeclaredOperators: string[];  // Operators created during translation
}
```

### 21.3.2 Dataset-Specific Translators

```javascript
// ProntoQA: Ontology reasoning with inheritance
function translateProntoQA(text: string, isQuestion: boolean): TranslateResult

// FOLIO: First-order logic with quantifiers
function translateFOLIO(text: string, isQuestion: boolean): TranslateResult

// RuleTaker: Facts and rules with variables
function translateRuleTaker(text: string, isQuestion: boolean): TranslateResult

// Generic fallback
function translateGeneric(text: string, isQuestion: boolean): TranslateResult
```

---

## 21.4 Grammar Patterns

### 21.4.1 ProntoQA Patterns

ProntoQA uses simple ontological statements:

| Pattern | Example | DSL Output |
|---------|---------|------------|
| X is a Y | "Alex is a cat" | `isA Alex Cat` |
| Each X is a Y | "Each cat is a mammal" | `Implies (isA ?x Cat) (isA ?x Mammal)` |
| Every X is Y | "Every mammal is warm-blooded" | `Implies (isA ?x Mammal) (hasProperty ?x WarmBlooded)` |
| X is Y | "Alex is cute" | `hasProperty Alex Cute` |
| Is X Y? | "Is Alex a mammal?" | `isA Alex Mammal` (query) |

### 21.4.2 FOLIO Patterns

FOLIO uses first-order logic with quantifiers:

| Pattern | Example | DSL Output |
|---------|---------|------------|
| All X are Y | "All cats are mammals" | `Implies (isA ?x Cat) (isA ?x Mammal)` |
| Some X are Y | "Some cats are black" | `Exists ?x (And (isA ?x Cat) (hasProperty ?x Black))` |
| No X is Y | "No cat is a fish" | `Not (Exists ?x (And (isA ?x Cat) (isA ?x Fish)))` |
| If X then Y | "If it rains then roads are wet" | `Implies (rains) (hasProperty Roads Wet)` |
| X or Y | "John is tall or short" | `Or (hasProperty John Tall) (hasProperty John Short)` |
| X and Y | "John is tall and smart" | `And (hasProperty John Tall) (hasProperty John Smart)` |

### 21.4.3 RuleTaker Patterns

RuleTaker uses explicit rules and facts:

| Pattern | Example | DSL Output |
|---------|---------|------------|
| X verb Y | "Bob chases Anne" | `chases Bob Anne` |
| X is Y | "Bob is green" | `hasProperty Bob Green` |
| If X then Y | "If something chases cat then it is fast" | `Implies (chases ?x Cat) (hasProperty ?x Fast)` |
| All X verb Y | "All cats chase mice" | `Implies (isA ?x Cat) (chases ?x Mice)` |

### 21.4.4 Generic Patterns (Fallback)

| Pattern | Example | DSL Output |
|---------|---------|------------|
| Subject is Object | "John is a teacher" | `isA John Teacher` |
| Subject verb Object | "John loves Mary" | `loves John Mary` |
| Subject verb Object Prep Target | "John gives book to Mary" | `gives John Book Mary` |
| Subject doesn't verb Object | "John doesn't like rain" | `Not (likes John Rain)` |

---

## 21.5 Architecture

### 21.5.1 Module Structure

```
src/nlp/nl2dsl/
├── index.mjs           # Main entry (translateNL2DSL)
├── grammar.mjs         # Grammar coordinator
├── utils.mjs           # Helper functions
└── grammar/
    ├── parse.mjs       # Main parser
    ├── parse/
    │   ├── copula.mjs  # "is/are" patterns
    │   ├── fact.mjs    # Fact patterns
    │   ├── rule.mjs    # Rule (if-then) patterns
    │   ├── relation.mjs # Relation patterns
    │   └── shared.mjs  # Shared utilities
    ├── text.mjs        # Text preprocessing
    └── emit.mjs        # DSL code generation
```

### 21.5.2 Processing Pipeline

```
Input Text
    ↓
1. Preprocessing (text.mjs)
   - Normalize whitespace
   - Expand contractions
   - Identify sentence boundaries
    ↓
2. Source Detection
   - Identify dataset patterns
   - Select appropriate grammar
    ↓
3. Parsing (parse.mjs)
   - Apply pattern matchers
   - Extract entities and relations
   - Bind variables
    ↓
4. Emission (emit.mjs)
   - Generate DSL statements
   - Handle quantifiers
   - Apply negation
    ↓
5. Validation
   - Check DSL syntax
   - Report errors
    ↓
Output: TranslateResult
```

---

## 21.6 Variable Handling

### 21.6.1 Variable Generation

Variables are generated for:
- Universal quantifiers (Every, All, Each) → `?x`, `?y`, `?z`
- Existential quantifiers (Some, A certain) → `?e1`, `?e2`
- Pronouns in rules (it, something, someone) → bound to nearest entity

### 21.6.2 Scope Management

```javascript
// Variable scope is managed per-sentence
// Example: "If something chases a cat then it is fast"
// "something" → ?x (subject)
// "it" → ?x (refers back to "something")

translateNL2DSL("If something chases a cat then it is fast")
// → Implies (chases ?x Cat) (hasProperty ?x Fast)
```

---

## 21.7 Error Handling

### 21.7.1 Error Types

| Error | Cause | Handling |
|-------|-------|----------|
| UnknownPattern | No grammar matches | Return with errors, dsl="" |
| AmbiguousInput | Multiple parses possible | Use first match, warn |
| InvalidQuantifier | Malformed quantifier | Skip, continue parsing |
| MissingSubject | No subject found | Use placeholder or error |

### 21.7.2 Error Reporting

```javascript
{
  success: false,
  dsl: "",
  errors: [
    "Line 1: Unknown pattern 'The quick brown fox'",
    "Line 2: Ambiguous quantifier 'most'"
  ],
  source: "generic",
  type: "unknown"
}
```

---

## 21.8 Integration with DS20-AutoDiscovery

NL2DSL is used by the AutoDiscovery module for:
1. Parsing evaluation dataset examples
2. Comparing NL input with expected DSL
3. Discovering translation errors and edge cases

```javascript
// From DS20-AutoDiscovery
import { translateNL2DSL } from '../src/nlp/nl2dsl.mjs';

const contextResult = translateNL2DSL(contextText, { source: 'prontoqa' });
const questionResult = translateNL2DSL(questionText, { source: 'prontoqa', isQuestion: true });
```

---

## 21.9 Test Requirements

### 21.9.1 Unit Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| NL2DSL-01 | ProntoQA "X is a Y" | Valid isA |
| NL2DSL-02 | ProntoQA "Each X is Y" | Valid Implies |
| NL2DSL-03 | FOLIO "All X are Y" | Valid Implies |
| NL2DSL-04 | FOLIO "Some X are Y" | Valid Exists |
| NL2DSL-05 | FOLIO negation | Valid Not |
| NL2DSL-06 | RuleTaker facts | Valid relations |
| NL2DSL-07 | RuleTaker rules | Valid Implies |
| NL2DSL-08 | Generic fallback | Best-effort DSL |
| NL2DSL-09 | Unknown pattern | Error reported |
| NL2DSL-10 | Variable binding | Correct scoping |

### 21.9.2 Dataset Coverage Tests

```javascript
describe('ProntoQA Coverage', () => {
  // Test all ProntoQA patterns
});

describe('FOLIO Coverage', () => {
  // Test all FOLIO patterns
});

describe('RuleTaker Coverage', () => {
  // Test all RuleTaker patterns
});
```

---

## 21.10 Performance Requirements

| Metric | Target |
|--------|--------|
| Single sentence | < 10ms |
| 100 sentences | < 500ms |
| Memory per sentence | < 1MB |

---

## 21.11 Future Extensions

1. **Coreference Resolution** - Handle pronouns across sentences
2. **Ambiguity Handling** - Multiple parse options with ranking
3. **LLM-Assisted Parsing** - Fallback to LLM for complex sentences
4. **Custom Dataset Support** - Pluggable grammar definitions
5. **Confidence Scores** - Per-translation confidence

---

## 21.12 Dependencies

- `src/nlp/tokenizer.mjs` - Text tokenization
- `src/nlp/normalizer.mjs` - Text normalization
- `src/parser/parser.mjs` - DSL validation (optional)

---

*End of DS21-NL2DSL Specification*
