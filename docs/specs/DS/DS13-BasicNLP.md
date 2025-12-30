# AGISystem2 - System Specifications

# Chapter 13: Basic NLP Module - Natural Language to DSL Transformation

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Focus:** Heuristic-based English to SYS2 DSL Transformation

---

## 13.1 Purpose

This specification defines a **Basic NLP Module** that provides heuristic-based transformation of natural language English sentences into AGISystem2 DSL statements. The module enables:

1. **Simple Sentence Parsing** - Extract subject, verb, object from English sentences
2. **Relation Extraction** - Identify binary and ternary relations
3. **IS-A Detection** - Recognize taxonomic statements
4. **Rule Detection** - Identify conditional statements (if...then)
5. **Negation Handling** - Detect and encode negative statements

**Note:** This module uses heuristics and pattern matching, NOT machine learning. For more sophisticated NLP, integrate with external LLMs.

---

## 13.2 Module Map

```
src/
├── nlp/                           # Basic NLP Module
│   ├── index.mjs                  # Main exports
│   ├── tokenizer.mjs              # English sentence tokenizer
│   ├── patterns.mjs               # Pattern definitions
│   ├── transformer.mjs            # NL → DSL transformation
│   └── normalizer.mjs             # Text normalization utilities
│
tests/
├── unit/
│   └── nlp/
│       ├── tokenizer.test.mjs     # Tokenizer tests
│       ├── patterns.test.mjs      # Pattern matching tests
│       └── transformer.test.mjs   # Transformation tests
```

---

## 13.3 Supported Sentence Patterns

### 13.3.1 IS-A Statements (Taxonomic)

| English Pattern | DSL Output |
|-----------------|------------|
| "A dog is an animal" | `isA Dog Animal` |
| "Dogs are animals" | `isA Dog Animal` |
| "Socrates is a human" | `isA Socrates Human` |
| "John is a programmer" | `isA John Programmer` |
| "Paris is a city" | `isA Paris City` |

### 13.3.2 Binary Relations (SVO)

| English Pattern | DSL Output |
|-----------------|------------|
| "John loves Mary" | `loves John Mary` |
| "Alice knows Bob" | `knows Alice Bob` |
| "The cat chased the mouse" | `chased Cat Mouse` |
| "Dogs chase cats" | `chase Dog Cat` |

### 13.3.3 Ternary Relations

| English Pattern | DSL Output |
|-----------------|------------|
| "Alice gave Bob a book" | `gave Alice Bob Book` |
| "John sells cars to Mary" | `sells John Car Mary` |
| "The teacher taught math to students" | `taught Teacher Math Student` |

### 13.3.4 Property Statements

| English Pattern | DSL Output |
|-----------------|------------|
| "The sky is blue" | `hasProperty Sky Blue` |
| "Roses are red" | `hasProperty Rose Red` |
| "The car is fast" | `hasProperty Car Fast` |

### 13.3.5 Conditional Statements (Rules)

| English Pattern | DSL Output |
|-----------------|------------|
| "If X is human then X is mortal" | `Implies (isA ?x Human) (isA ?x Mortal)` |
| "All humans are mortal" | `Implies (isA ?x Human) (isA ?x Mortal)` |
| "Every dog is an animal" | `Implies (isA ?x Dog) (isA ?x Animal)` |

### 13.3.6 Negation

| English Pattern | DSL Output |
|-----------------|------------|
| "John does not love Mary" | `Not (loves John Mary)` |
| "Dogs don't fly" | `Not (fly Dog)` |
| "It is not true that cats bark" | `Not (bark Cat)` |

---

## 13.4 Tokenizer API

### 13.4.1 EnglishTokenizer Class

```javascript
/**
 * Tokenize English sentences for pattern matching
 */
export class EnglishTokenizer {
  /**
   * Tokenize a sentence into words and metadata
   * @param {string} sentence - English sentence
   * @returns {Token[]} Array of tokens
   */
  tokenize(sentence) {
    const normalized = this.normalize(sentence);
    const words = normalized.split(/\s+/);

    return words.map((word, index) => ({
      text: word,
      lower: word.toLowerCase(),
      position: index,
      type: this.classifyWord(word)
    }));
  }

  /**
   * Normalize sentence for processing
   * @param {string} sentence
   * @returns {string}
   */
  normalize(sentence) {
    return sentence
      .replace(/[.,!?;:]+$/g, '')      // Remove trailing punctuation
      .replace(/['"]/g, '')            // Remove quotes
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();
  }

  /**
   * Classify word type (heuristic)
   * @param {string} word
   * @returns {string} - 'noun', 'verb', 'article', 'preposition', 'other'
   */
  classifyWord(word) {
    const lower = word.toLowerCase();

    // Articles
    if (['a', 'an', 'the'].includes(lower)) {
      return 'article';
    }

    // Common prepositions
    if (['to', 'from', 'in', 'on', 'at', 'by', 'for', 'with'].includes(lower)) {
      return 'preposition';
    }

    // Linking verbs
    if (['is', 'are', 'was', 'were', 'be', 'been', 'being'].includes(lower)) {
      return 'linking-verb';
    }

    // Negation
    if (['not', 'never', 'no', "don't", "doesn't", "didn't"].includes(lower)) {
      return 'negation';
    }

    // Conditionals
    if (['if', 'when', 'whenever'].includes(lower)) {
      return 'conditional';
    }

    // Quantifiers
    if (['all', 'every', 'each', 'any', 'some'].includes(lower)) {
      return 'quantifier';
    }

    // Capitalized words are likely proper nouns
    if (/^[A-Z]/.test(word) && word.length > 1) {
      return 'proper-noun';
    }

    // Words ending in common verb suffixes
    if (/(?:s|ed|ing)$/.test(lower) && lower.length > 3) {
      return 'verb-candidate';
    }

    return 'other';
  }
}
```

---

## 13.5 Pattern Definitions

### 13.5.1 Pattern Registry

```javascript
/**
 * Pattern definitions for NL → DSL transformation
 */
export const patterns = {
  /**
   * IS-A patterns: "X is a Y", "Xs are Ys"
   */
  isA: [
    {
      regex: /^(\w+)\s+(?:is|are)\s+(?:a|an)\s+(\w+)$/i,
      extract: (match) => ({
        type: 'isA',
        subject: capitalize(match[1]),
        object: capitalize(match[2])
      })
    },
    {
      regex: /^(\w+)s?\s+(?:is|are)\s+(\w+)s$/i,
      extract: (match) => ({
        type: 'isA',
        subject: capitalize(singularize(match[1])),
        object: capitalize(singularize(match[2]))
      })
    }
  ],

  /**
   * Binary relation: "Subject Verb Object"
   */
  svo: [
    {
      regex: /^(?:the\s+)?(\w+)\s+(\w+(?:s|ed|es)?)\s+(?:the\s+)?(\w+)$/i,
      validate: (match, tokens) => {
        // Ensure middle word looks like a verb
        const verb = match[2].toLowerCase();
        return !['is', 'are', 'was', 'were'].includes(verb);
      },
      extract: (match) => ({
        type: 'binary',
        operator: normalizeVerb(match[2]),
        subject: capitalize(match[1]),
        object: capitalize(match[3])
      })
    }
  ],

  /**
   * Ternary relation: "Subject Verb IndirectObject DirectObject"
   */
  svio: [
    {
      // "Alice gave Bob a book"
      regex: /^(?:the\s+)?(\w+)\s+(\w+)\s+(\w+)\s+(?:a\s+)?(\w+)$/i,
      validate: (match) => {
        const verb = match[2].toLowerCase();
        return ['gave', 'sent', 'told', 'showed', 'taught'].includes(verb);
      },
      extract: (match) => ({
        type: 'ternary',
        operator: normalizeVerb(match[2]),
        args: [capitalize(match[1]), capitalize(match[3]), capitalize(match[4])]
      })
    },
    {
      // "John sells X to Y"
      regex: /^(?:the\s+)?(\w+)\s+(\w+)\s+(\w+)\s+to\s+(\w+)$/i,
      extract: (match) => ({
        type: 'ternary',
        operator: normalizeVerb(match[2]),
        args: [capitalize(match[1]), capitalize(match[3]), capitalize(match[4])]
      })
    }
  ],

  /**
   * Property: "X is Adjective"
   */
  property: [
    {
      regex: /^(?:the\s+)?(\w+)\s+(?:is|are)\s+(\w+)$/i,
      validate: (match) => {
        // Object should look like adjective (not capitalized, not ending in common noun suffixes)
        const obj = match[2];
        return !/^[A-Z]/.test(obj) && !/(tion|ness|ment|ity)$/.test(obj);
      },
      extract: (match) => ({
        type: 'property',
        subject: capitalize(match[1]),
        property: match[2].toLowerCase()
      })
    }
  ],

  /**
   * Universal quantification: "All X are Y", "Every X is a Y"
   */
  universal: [
    {
      regex: /^(?:all|every|each)\s+(\w+)s?\s+(?:is|are)\s+(?:a\s+)?(\w+)s?$/i,
      extract: (match) => ({
        type: 'rule',
        ruleType: 'universal',
        variable: '?x',
        antecedent: { type: 'isA', subject: '?x', object: capitalize(singularize(match[1])) },
        consequent: { type: 'isA', subject: '?x', object: capitalize(singularize(match[2])) }
      })
    }
  ],

  /**
   * Conditional: "If X then Y"
   */
  conditional: [
    {
      regex: /^if\s+(.+?)\s+then\s+(.+)$/i,
      extract: (match, transformer) => ({
        type: 'rule',
        ruleType: 'conditional',
        antecedent: transformer.parseClause(match[1]),
        consequent: transformer.parseClause(match[2])
      })
    }
  ],

  /**
   * Negation: "X does not Y", "X doesn't Y"
   */
  negation: [
    {
      regex: /^(\w+)\s+(?:does\s+not|doesn't|don't|did\s+not|didn't)\s+(\w+)\s+(\w+)?$/i,
      extract: (match) => ({
        type: 'negation',
        negated: {
          type: match[3] ? 'binary' : 'unary',
          operator: normalizeVerb(match[2]),
          subject: capitalize(match[1]),
          object: match[3] ? capitalize(match[3]) : null
        }
      })
    },
    {
      regex: /^it\s+is\s+not\s+(?:true\s+)?(?:that\s+)?(.+)$/i,
      extract: (match, transformer) => ({
        type: 'negation',
        negated: transformer.parseClause(match[1])
      })
    }
  ]
};

/**
 * Helper functions
 */
function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function singularize(word) {
  // Very simple singularization
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function normalizeVerb(verb) {
  // Convert to base form (very simple)
  const lower = verb.toLowerCase();
  if (lower.endsWith('ed')) return lower.slice(0, -2);
  if (lower.endsWith('ing')) return lower.slice(0, -3);
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('es')) return lower.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1);
  return lower;
}
```

---

## 13.6 Transformer API

### 13.6.1 NLTransformer Class

```javascript
import { EnglishTokenizer } from './tokenizer.mjs';
import { patterns } from './patterns.mjs';

/**
 * Transform natural language to DSL
 */
export class NLTransformer {
  constructor(options = {}) {
    this.tokenizer = new EnglishTokenizer();
    this.patterns = { ...patterns, ...(options.customPatterns || {}) };
    this.strict = options.strict ?? false;
  }

  /**
   * Transform English sentence(s) to DSL
   * @param {string} text - English text (one or more sentences)
   * @returns {TransformResult}
   */
  transform(text) {
    const sentences = this.splitSentences(text);
    const results = [];
    const errors = [];

    for (const sentence of sentences) {
      try {
        const result = this.transformSentence(sentence);
        if (result) {
          results.push(result);
        }
      } catch (err) {
        errors.push({
          sentence,
          error: err.message
        });
      }
    }

    return {
      success: errors.length === 0,
      dsl: this.toDSL(results),
      parsed: results,
      errors
    };
  }

  /**
   * Transform single sentence
   * @param {string} sentence
   * @returns {ParsedStatement|null}
   */
  transformSentence(sentence) {
    const normalized = this.tokenizer.normalize(sentence);
    if (!normalized) return null;

    const tokens = this.tokenizer.tokenize(sentence);

    // Try patterns in priority order
    const patternOrder = [
      'negation',      // Check negation first
      'conditional',   // Then conditionals
      'universal',     // Then universals
      'isA',           // IS-A before SVO (more specific)
      'svio',          // Ternary before binary
      'svo',           // Binary relations
      'property'       // Properties last
    ];

    for (const patternType of patternOrder) {
      const patternList = this.patterns[patternType];
      if (!patternList) continue;

      for (const pattern of patternList) {
        const match = normalized.match(pattern.regex);
        if (match) {
          // Validate if validator exists
          if (pattern.validate && !pattern.validate(match, tokens)) {
            continue;
          }

          const extracted = pattern.extract(match, this);
          if (extracted) {
            return {
              ...extracted,
              source: sentence,
              pattern: patternType
            };
          }
        }
      }
    }

    // No pattern matched
    if (this.strict) {
      throw new Error(`No pattern matched: "${sentence}"`);
    }

    // Fallback: try to extract SVO heuristically
    return this.fallbackSVO(tokens, sentence);
  }

  /**
   * Fallback SVO extraction using token classification
   */
  fallbackSVO(tokens, source) {
    // Filter out articles
    const content = tokens.filter(t => t.type !== 'article');

    if (content.length < 2) return null;

    // Find verb candidate
    const verbIndex = content.findIndex(t =>
      t.type === 'verb-candidate' || t.type === 'linking-verb'
    );

    if (verbIndex === -1 || verbIndex === 0) {
      // No clear verb, assume first word is subject, rest is predicate
      return {
        type: 'unknown',
        tokens: content.map(t => t.text),
        source,
        pattern: 'fallback'
      };
    }

    const subject = content.slice(0, verbIndex).map(t => t.text).join(' ');
    const verb = content[verbIndex].text;
    const object = content.slice(verbIndex + 1).map(t => t.text).join(' ');

    if (!subject || !object) return null;

    return {
      type: 'binary',
      operator: this.normalizeVerb(verb),
      subject: this.capitalize(subject),
      object: this.capitalize(object),
      source,
      pattern: 'fallback-svo'
    };
  }

  /**
   * Parse a clause (for conditionals)
   */
  parseClause(clause) {
    // Recursive call to transform
    const result = this.transformSentence(clause.trim());
    return result || { type: 'raw', text: clause.trim() };
  }

  /**
   * Convert parsed results to DSL string
   * @param {ParsedStatement[]} results
   * @returns {string}
   */
  toDSL(results) {
    return results
      .map((r, i) => this.statementToDSL(r, `f${i + 1}`))
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Convert single parsed statement to DSL
   */
  statementToDSL(parsed, name) {
    switch (parsed.type) {
      case 'isA':
        return `@${name} isA ${parsed.subject} ${parsed.object}`;

      case 'binary':
        return `@${name} ${parsed.operator} ${parsed.subject} ${parsed.object}`;

      case 'ternary':
        return `@${name} ${parsed.operator} ${parsed.args.join(' ')}`;

      case 'property':
        return `@${name} hasProperty ${parsed.subject} ${parsed.property}`;

      case 'negation':
        const inner = this.statementToDSL(parsed.negated, 'inner');
        // Remove @inner prefix and wrap in Not
        const innerContent = inner.replace(/^@\w+\s+/, '');
        return `@${name} Not (${innerContent})`;

      case 'rule':
        const ant = this.clauseToDSL(parsed.antecedent);
        const cons = this.clauseToDSL(parsed.consequent);
        return `@${name} Implies (${ant}) (${cons})`;

      case 'unknown':
        // Best effort
        return `# Could not parse: ${parsed.source}`;

      default:
        return null;
    }
  }

  /**
   * Convert clause to DSL (without @name)
   */
  clauseToDSL(clause) {
    if (clause.type === 'isA') {
      return `isA ${clause.subject} ${clause.object}`;
    }
    if (clause.type === 'binary') {
      return `${clause.operator} ${clause.subject} ${clause.object}`;
    }
    if (clause.type === 'raw') {
      return clause.text;
    }
    // Fallback
    return JSON.stringify(clause);
  }

  /**
   * Split text into sentences
   */
  splitSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Helper methods
  capitalize(word) {
    if (!word) return word;
    const first = word.charAt(0).toUpperCase();
    return first + word.slice(1).toLowerCase();
  }

  normalizeVerb(verb) {
    const lower = verb.toLowerCase();
    if (lower.endsWith('ed') && lower.length > 3) return lower.slice(0, -2);
    if (lower.endsWith('ing') && lower.length > 4) return lower.slice(0, -3);
    if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
    if (lower.endsWith('es') && lower.length > 3) return lower.slice(0, -2);
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
      return lower.slice(0, -1);
    }
    return lower;
  }
}
```

---

## 13.7 Text Normalizer

### 13.7.1 Normalizer Utilities

```javascript
/**
 * Text normalization utilities
 */
export const normalizer = {
  /**
   * Normalize whitespace and punctuation
   */
  normalizeText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();
  },

  /**
   * Remove common filler words
   */
  removeFillers(text) {
    const fillers = ['basically', 'actually', 'really', 'very', 'quite', 'just'];
    let result = text;
    for (const filler of fillers) {
      result = result.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
    }
    return result.replace(/\s+/g, ' ').trim();
  },

  /**
   * Expand contractions
   */
  expandContractions(text) {
    const contractions = {
      "don't": "do not",
      "doesn't": "does not",
      "didn't": "did not",
      "won't": "will not",
      "can't": "cannot",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "hasn't": "has not",
      "haven't": "have not",
      "it's": "it is",
      "that's": "that is",
      "there's": "there is",
      "he's": "he is",
      "she's": "she is"
    };

    let result = text;
    for (const [contraction, expansion] of Object.entries(contractions)) {
      result = result.replace(new RegExp(contraction, 'gi'), expansion);
    }
    return result;
  },

  /**
   * Convert to sentence case
   */
  toSentenceCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
};
```

---

## 13.8 Usage Examples

### 13.8.1 Basic Usage

```javascript
import { NLTransformer } from './nlp/index.mjs';
import { Session } from './runtime/session.mjs';

// Create transformer
const transformer = new NLTransformer();

// Transform natural language
const result = transformer.transform(`
  A dog is an animal.
  John loves Mary.
  Alice gave Bob a book.
  All humans are mortal.
`);

console.log(result.dsl);
// Output:
// @f1 isA Dog Animal
// @f2 loves John Mary
// @f3 gave Alice Bob Book
// @f4 Implies (isA ?x Human) (isA ?x Mortal)

// Use with Session
const session = new Session();
if (result.success) {
  session.learn(result.dsl);
}
```

### 13.8.2 Error Handling

```javascript
const transformer = new NLTransformer({ strict: true });

try {
  const result = transformer.transform("This is a very complex sentence that won't parse.");
} catch (error) {
  console.error('Parsing failed:', error.message);
}

// Non-strict mode (default) returns errors array
const transformer2 = new NLTransformer({ strict: false });
const result = transformer2.transform("Parse this. And this gibberish xyz abc.");

console.log(result.errors);
// [{ sentence: "And this gibberish xyz abc", error: "..." }]
```

### 13.8.3 Custom Patterns

```javascript
const transformer = new NLTransformer({
  customPatterns: {
    location: [
      {
        regex: /^(\w+)\s+is\s+located\s+in\s+(\w+)$/i,
        extract: (match) => ({
          type: 'binary',
          operator: 'locatedIn',
          subject: match[1],
          object: match[2]
        })
      }
    ]
  }
});

const result = transformer.transform("Paris is located in France");
// @f1 locatedIn Paris France
```

---

## 13.9 Limitations

### 13.9.1 Known Limitations

| Limitation | Description | Workaround |
|------------|-------------|------------|
| **No Coreference** | Cannot resolve "he", "she", "it", "they" | Use explicit nouns |
| **No Complex Sentences** | Cannot parse deeply nested clauses | Split into simple sentences |
| **Limited Verb Forms** | Simple morphology only | Use base verb forms |
| **No Disambiguation** | Cannot handle true ambiguity | Use unambiguous phrasing |
| **English Only** | Patterns are English-specific | Write patterns for other languages |
| **No Semantic Understanding** | Pure pattern matching | Use LLM for complex cases |

### 13.9.2 When to Use External NLP

Use external LLM for:
- Complex multi-clause sentences
- Coreference resolution
- Semantic disambiguation
- Non-English languages
- Domain-specific terminology

---

## 13.10 Testing Strategy

### 13.10.1 Test Cases

```javascript
describe('NLTransformer', () => {
  let transformer;

  beforeEach(() => {
    transformer = new NLTransformer();
  });

  describe('IS-A statements', () => {
    test('should parse "X is a Y"', () => {
      const result = transformer.transform('A dog is an animal');
      expect(result.dsl).toContain('isA Dog Animal');
    });

    test('should parse "Xs are Ys"', () => {
      const result = transformer.transform('Dogs are animals');
      expect(result.dsl).toContain('isA Dog Animal');
    });
  });

  describe('Binary relations', () => {
    test('should parse SVO sentence', () => {
      const result = transformer.transform('John loves Mary');
      expect(result.dsl).toContain('love John Mary');
    });

    test('should handle articles', () => {
      const result = transformer.transform('The cat chased the mouse');
      expect(result.dsl).toContain('chase Cat Mouse');
    });
  });

  describe('Universal quantification', () => {
    test('should parse "All X are Y"', () => {
      const result = transformer.transform('All humans are mortal');
      expect(result.dsl).toContain('Implies');
      expect(result.dsl).toContain('isA ?x Human');
      expect(result.dsl).toContain('isA ?x Mortal');
    });
  });

  describe('Negation', () => {
    test('should parse "X does not Y"', () => {
      const result = transformer.transform('John does not love Mary');
      expect(result.dsl).toContain('Not');
    });
  });

  describe('Error handling', () => {
    test('should return errors for unparseable sentences', () => {
      const result = transformer.transform('xyz abc 123');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should not throw in non-strict mode', () => {
      expect(() => {
        transformer.transform('unparseable gibberish');
      }).not.toThrow();
    });
  });
});
```

---

## 13.11 URS Traceability

| URS | Requirement | Implementation |
|-----|-------------|----------------|
| **URS-11** | DSL for knowledge representation | NLTransformer outputs DSL |
| **URS-12** | Subject-Verb-Object triplets | patterns.svo, patterns.isA |
| **URS-14** | Natural language explanations | Bidirectional: NL → DSL |
| **URS-25** | LLM integration | Extensible for LLM preprocessing |
| **URS-39** | Clear error messages | TransformResult.errors with details |

---

## 13.12 Summary

The Basic NLP Module provides:

1. **EnglishTokenizer** - Tokenizes and classifies English words
2. **Pattern Registry** - Configurable patterns for sentence types
3. **NLTransformer** - Main transformation engine
4. **Normalizer** - Text preprocessing utilities

**Key Design Decisions:**
- Heuristic-based, no ML dependencies
- Extensible pattern system
- Graceful degradation for unparseable input
- Clear separation from core reasoning

**Future Extensions:**
- Additional languages (via pattern files)
- LLM preprocessing hook
- Interactive disambiguation

---

*End of Chapter 13 - Basic NLP Module*
