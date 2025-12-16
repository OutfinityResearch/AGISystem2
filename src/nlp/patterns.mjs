/**
 * AGISystem2 - NLP Pattern Definitions
 * @module nlp/patterns
 *
 * Pattern definitions for NL → DSL transformation.
 */

import { capitalizeWord, singularize, normalizeVerb } from './normalizer.mjs';

/**
 * IS-A patterns: "X is a Y", "Xs are Ys"
 */
export const isAPatterns = [
  {
    // "A dog is an animal", "The dog is an animal"
    regex: /^(?:a|an|the)?\s*(\w+)\s+(?:is|are)\s+(?:a|an)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'isA',
      subject: capitalizeWord(singularize(match[1])),
      object: capitalizeWord(singularize(match[2]))
    })
  },
  {
    // "Dogs are animals"
    regex: /^(\w+)s\s+are\s+(\w+)s$/i,
    extract: (match) => ({
      type: 'isA',
      subject: capitalizeWord(singularize(match[1])),
      object: capitalizeWord(singularize(match[2]))
    })
  },
  {
    // "Socrates is human" (no article)
    regex: /^(\w+)\s+is\s+(\w+)$/i,
    validate: (match) => {
      // Second word should look like a category (lowercase or adjective-like)
      const obj = match[2];
      return /^[a-z]/.test(obj) || /^[A-Z][a-z]+$/.test(obj);
    },
    extract: (match) => ({
      type: 'isA',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  }
];

/**
 * Binary relation patterns: "Subject Verb Object"
 */
export const svoPatterns = [
  {
    // "John loves Mary", "The cat chased the mouse"
    regex: /^(?:the\s+)?(\w+)\s+(\w+(?:s|ed|es|d)?)\s+(?:the\s+)?(\w+)$/i,
    validate: (match) => {
      // Ensure middle word looks like a verb (not is/are)
      const verb = match[2].toLowerCase();
      return !['is', 'are', 'was', 'were', 'a', 'an', 'the'].includes(verb);
    },
    extract: (match) => ({
      type: 'binary',
      operator: normalizeVerb(match[2]),
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[3])
    })
  }
];

/**
 * Ternary relation patterns
 */
export const svioPatterns = [
  {
    // "Alice gave Bob a book", "John told Mary a story"
    regex: /^(?:the\s+)?(\w+)\s+(gave|sent|told|showed|taught|offered|brought|handed|passed|threw)\s+(\w+)\s+(?:a\s+)?(?:the\s+)?(\w+)$/i,
    extract: (match) => ({
      type: 'ternary',
      operator: normalizeVerb(match[2]),
      args: [
        capitalizeWord(match[1]),
        capitalizeWord(match[3]),
        capitalizeWord(match[4])
      ]
    })
  },
  {
    // "John sells cars to Mary", "Alice gave a book to Bob"
    regex: /^(?:the\s+)?(\w+)\s+(\w+(?:s|ed)?)\s+(?:a\s+)?(?:the\s+)?(\w+)\s+to\s+(\w+)$/i,
    extract: (match) => ({
      type: 'ternary',
      operator: normalizeVerb(match[2]),
      args: [
        capitalizeWord(match[1]),
        capitalizeWord(match[3]),
        capitalizeWord(match[4])
      ]
    })
  },
  {
    // "Alice bought a book from Bob"
    regex: /^(?:the\s+)?(\w+)\s+(bought|received|got|obtained)\s+(?:a\s+)?(?:the\s+)?(\w+)\s+from\s+(\w+)$/i,
    extract: (match) => ({
      type: 'ternary',
      operator: normalizeVerb(match[2]),
      args: [
        capitalizeWord(match[1]),
        capitalizeWord(match[3]),
        capitalizeWord(match[4])
      ]
    })
  }
];

/**
 * Property patterns: "X is Adjective"
 */
export const propertyPatterns = [
  {
    // "The sky is blue", "Roses are red"
    regex: /^(?:the\s+)?(\w+)s?\s+(?:is|are)\s+(red|blue|green|yellow|black|white|big|small|tall|short|fast|slow|hot|cold|old|new|good|bad|happy|sad|young|beautiful|ugly|rich|poor|smart|stupid|strong|weak)$/i,
    extract: (match) => ({
      type: 'property',
      subject: capitalizeWord(singularize(match[1])),
      property: match[2].toLowerCase()
    })
  }
];

/**
 * Universal quantification: "All X are Y", "Every X is a Y"
 */
export const universalPatterns = [
  {
    // "All humans are mortal"
    regex: /^all\s+(\w+)s?\s+are\s+(\w+)s?$/i,
    extract: (match) => ({
      type: 'rule',
      ruleType: 'universal',
      variable: '?x',
      antecedent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(singularize(match[1]))
      },
      consequent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(singularize(match[2]))
      }
    })
  },
  {
    // "Every dog is an animal"
    regex: /^every\s+(\w+)\s+is\s+(?:a|an)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'rule',
      ruleType: 'universal',
      variable: '?x',
      antecedent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(match[1])
      },
      consequent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(match[2])
      }
    })
  },
  {
    // "Each student has a teacher"
    regex: /^each\s+(\w+)\s+(\w+)s?\s+(?:a\s+)?(\w+)$/i,
    extract: (match) => ({
      type: 'rule',
      ruleType: 'universal',
      variable: '?x',
      antecedent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(match[1])
      },
      consequent: {
        type: 'binary',
        operator: normalizeVerb(match[2]),
        subject: '?x',
        object: capitalizeWord(match[3])
      }
    })
  }
];

/**
 * Conditional patterns: "If X then Y"
 */
export const conditionalPatterns = [
  {
    // "If X is Y then X is Z"
    regex: /^if\s+(\w+)\s+is\s+(?:a\s+)?(\w+)\s+then\s+\1\s+is\s+(?:a\s+)?(\w+)$/i,
    extract: (match) => ({
      type: 'rule',
      ruleType: 'conditional',
      variable: '?x',
      antecedent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(match[2])
      },
      consequent: {
        type: 'isA',
        subject: '?x',
        object: capitalizeWord(match[3])
      }
    })
  },
  {
    // Generic "if ... then ..." - returns raw for further processing
    regex: /^if\s+(.+?)\s+then\s+(.+)$/i,
    extract: (match) => ({
      type: 'rule',
      ruleType: 'conditional-raw',
      antecedentRaw: match[1].trim(),
      consequentRaw: match[2].trim()
    })
  }
];

/**
 * Negation patterns
 */
export const negationPatterns = [
  {
    // "John does not love Mary"
    regex: /^(\w+)\s+(?:does\s+not|doesn't)\s+(\w+)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'negation',
      negated: {
        type: 'binary',
        operator: normalizeVerb(match[2]),
        subject: capitalizeWord(match[1]),
        object: capitalizeWord(match[3])
      }
    })
  },
  {
    // "Dogs do not fly", "Cats don't bark"
    regex: /^(\w+)s?\s+(?:do\s+not|don't)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'negation',
      negated: {
        type: 'unary',
        operator: normalizeVerb(match[2]),
        subject: capitalizeWord(singularize(match[1]))
      }
    })
  },
  {
    // "It is not true that X"
    regex: /^it\s+is\s+not\s+(?:true\s+)?(?:that\s+)?(.+)$/i,
    extract: (match) => ({
      type: 'negation-clause',
      clauseRaw: match[1].trim()
    })
  },
  {
    // "X is not Y"
    regex: /^(\w+)\s+is\s+not\s+(?:a\s+)?(\w+)$/i,
    extract: (match) => ({
      type: 'negation',
      negated: {
        type: 'isA',
        subject: capitalizeWord(match[1]),
        object: capitalizeWord(match[2])
      }
    })
  }
];

/**
 * Location patterns
 */
export const locationPatterns = [
  {
    // "Paris is in France"
    regex: /^(\w+)\s+is\s+in\s+(\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'locatedIn',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  },
  {
    // "The store is located in Paris"
    regex: /^(?:the\s+)?(\w+)\s+is\s+located\s+in\s+(\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'locatedIn',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  }
];

/**
 * Ownership patterns
 */
export const ownershipPatterns = [
  {
    // "John has a car", "Alice has money"
    regex: /^(\w+)\s+has\s+(?:a\s+)?(?:an\s+)?(\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'has',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  },
  {
    // "John owns a car"
    regex: /^(\w+)\s+owns\s+(?:a\s+)?(?:an\s+)?(\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'owns',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  }
];

/**
 * All patterns organized by type
 */
export const patterns = {
  negation: negationPatterns,
  conditional: conditionalPatterns,
  universal: universalPatterns,
  isA: isAPatterns,
  svio: svioPatterns,
  location: locationPatterns,
  ownership: ownershipPatterns,
  svo: svoPatterns,
  property: propertyPatterns
};

/**
 * Priority order for pattern matching
 */
export const patternPriority = [
  'negation',
  'conditional',
  'universal',
  'isA',
  'svio',
  'location',
  'ownership',
  'svo',
  'property'
];

export default patterns;
