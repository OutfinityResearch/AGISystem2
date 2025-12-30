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
    regex: /^(?:(?:a|an|the)\s+)?([$@?]?\w+)\s+(?:is|are)\s+(?:a|an)\s+([$@?]?\w+)$/i,
    extract: (match) => ({
      type: 'isA',
      subject: capitalizeWord(singularize(match[1])),
      object: capitalizeWord(singularize(match[2]))
    })
  },
  {
    // "Dogs are animals"
    regex: /^([$@?]?\w+)s\s+are\s+([$@?]?\w+)s$/i,
    extract: (match) => ({
      type: 'isA',
      subject: capitalizeWord(singularize(match[1])),
      object: capitalizeWord(singularize(match[2]))
    })
  },
  {
    // "Socrates is human" (no article)
    regex: /^([$@?]?\w+)\s+is\s+([$@?]?\w+)$/i,
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

const EXACT_SVO_OPERATOR_ALLOWLIST = new Set([
  'causes',
  'prevents',
  'before',
  'after',
  'requires',
  'threatens',
  'affects',
  'likes',
  'knows',
  'seating',
  'orbits',
  'analogy',
  'difference',
  'bundle',
  'induce',
  'deduce',
  'abduce',
  'whatif',
  'explain',
  'implies',
  'assigned'
]);

/**
 * Binary relation patterns: "Subject Verb Object"
 */
export const exactSvoPatterns = [
  {
    // DSL-friendly: preserve operator spelling/casing, avoid verb normalization.
    // Intentionally excluded: ordinary English verbs like "loves" (handled by `svoPatterns`).
    regex: /^(?:the\s+)?([$@?]?\w+)\s+([A-Za-z][A-Za-z0-9_]*)\s+(?:the\s+)?([$@?]?\w+)$/i,
    validate: (match) => {
      const verb = match[2];
      const lower = verb.toLowerCase();
      if (['is', 'are', 'was', 'were', 'a', 'an', 'the'].includes(lower)) return false;
      return /[A-Z]/.test(verb) || EXACT_SVO_OPERATOR_ALLOWLIST.has(lower);
    },
    extract: (match) => ({
      type: 'binary',
      operator: match[2],
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[3])
    })
  }
];

export const exactNaryPatterns = [
  {
    // DSL-friendly n-ary: "rooms cspTuple Guest1 ?r1 Guest2 ?r2 ..."
    regex: /^([$@?]?\w+)\s+([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/i,
    validate: (match) => {
      const op = match[2];
      const lower = op.toLowerCase();
      if (['is', 'are', 'was', 'were', 'a', 'an', 'the'].includes(lower)) return false;
      return /[A-Z]/.test(op) || EXACT_SVO_OPERATOR_ALLOWLIST.has(lower);
    },
    extract: (match) => {
      const rest = String(match[3] || '')
        .trim()
        .split(/\s+/)
        .map(t => t.replace(/^[,]+|[,]+$/g, ''))
        .filter(Boolean);
      return ({
        type: 'ternary',
        operator: match[2],
        args: [match[1], ...rest]
      });
    }
  }
];

export const exactPrefixNaryPatterns = [
  {
    // DSL-friendly operator-first: "implies ?X causes Infection ..."
    regex: /^([A-Za-z][A-Za-z0-9_]*)\s+(.+)$/i,
    validate: (match) => {
      const op = match[1];
      const lower = op.toLowerCase();
      // Avoid hijacking ordinary English.
      if (['if', 'what', 'who'].includes(lower)) return false;
      // Avoid duplicating boolean/connective parsing.
      if (['not', 'and', 'or', 'implies'].includes(lower) && !EXACT_SVO_OPERATOR_ALLOWLIST.has(lower)) return false;
      // Operator-first form is reserved for known DSL operators/macros.
      return EXACT_SVO_OPERATOR_ALLOWLIST.has(lower);
    },
    extract: (match) => {
      const rest = String(match[2] || '')
        .trim()
        .split(/\s+/)
        .map(t => t.replace(/^[,]+|[,]+$/g, ''))
        .filter(Boolean);
      return ({
        type: 'ternary',
        operator: match[1],
        args: rest
      });
    }
  }
];

const EXACT_UNARY_OPERATOR_ALLOWLIST = new Set([
  'observed'
]);

export const exactUnaryPatterns = [
  {
    // DSL-friendly unary: "X isSuspect" -> `isSuspect X`
    regex: /^([$@?]?\w+)\s+([A-Za-z][A-Za-z0-9_]*)$/i,
    validate: (match) => {
      const op = match[2];
      const lower = op.toLowerCase();
      if (['is', 'are', 'was', 'were'].includes(lower)) return false;
      return /[A-Z]/.test(op) || EXACT_UNARY_OPERATOR_ALLOWLIST.has(lower);
    },
    extract: (match) => ({
      type: 'unary',
      operator: match[2],
      subject: capitalizeWord(match[1])
    })
  }
];

export const svoPatterns = [
  {
    // "John loves Mary", "The cat chased the mouse"
    regex: /^(?:the\s+)?([$@?]?\w+)\s+(\w+(?:s|ed|es|d)?)\s+(?:the\s+)?([$@?]?\w+)$/i,
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
    regex: /^(?:the\s+)?([$@?]?\w+)\s+(gave|sent|told|showed|taught|offered|brought|handed|passed|threw)\s+([$@?]?\w+)\s+(?:a\s+)?(?:the\s+)?([$@?]?\w+)$/i,
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
    regex: /^(?:the\s+)?([$@?]?\w+)\s+(\w+(?:s|ed)?)\s+(?:a\s+)?(?:the\s+)?([$@?]?\w+)\s+to\s+([$@?]?\w+)$/i,
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
    regex: /^(?:the\s+)?([$@?]?\w+)\s+(bought|received|got|obtained)\s+(?:a\s+)?(?:the\s+)?([$@?]?\w+)\s+from\s+([$@?]?\w+)$/i,
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
    regex: /^(?:the\s+)?([$@?]?\w+)s?\s+(?:is|are)\s+(red|blue|green|yellow|black|white|big|small|tall|short|fast|slow|hot|cold|old|new|good|bad|happy|sad|young|beautiful|ugly|rich|poor|smart|stupid|strong|weak)$/i,
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
    regex: /^if\s+([$@?]?\w+)\s+is\s+(?:a\s+)?([$@?]?\w+)\s+then\s+\1\s+is\s+(?:a\s+)?([$@?]?\w+)$/i,
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
 * `implies` macro patterns (Core macro-like relation builder).
 *
 * These are intentionally DSL-ish so that suite-generated supported NL can roundtrip.
 */
export const impliesMacroPatterns = [
  {
    // "implies (A) AND (B) C"
    regex: /^implies\s+\((.+?)\)\s+(?:and|AND)\s+\((.+?)\)\s+(.+)$/i,
    extract: (match) => ({
      type: 'implies-macro',
      antecedentRaws: [match[1].trim(), match[2].trim()],
      consequentRaw: match[3].trim()
    })
  },
  {
    // "implies (A) B"
    regex: /^implies\s+\((.+?)\)\s+(.+)$/i,
    extract: (match) => ({
      type: 'implies-macro',
      antecedentRaws: [match[1].trim()],
      consequentRaw: match[2].trim()
    })
  }
];

/**
 * Compound clause patterns: "A and B", "A or B"
 * Used mainly inside conditional antecedents/consequents.
 */
export const compoundPatterns = [
  {
    // "A and B" / "(A) AND (B)"
    regex: /^\(?(.+?)\)?\s+(and|or)\s+\(?(.+?)\)?$/i,
    extract: (match) => ({
      type: 'compound-raw',
      operator: match[2].toLowerCase() === 'and' ? 'And' : 'Or',
      leftRaw: match[1].trim(),
      rightRaw: match[3].trim()
    })
  }
];

/**
 * Negation patterns
 */
export const negationPatterns = [
  {
    // "Opus cannot fly"
    regex: /^([$@?]?\w+)\s+cannot\s+(\w+)$/i,
    extract: (match) => ({
      type: 'negation',
      negated: {
        type: 'binary',
        operator: 'can',
        subject: capitalizeWord(match[1]),
        object: capitalizeWord(match[2])
      }
    })
  },
  {
    // "John does not love Mary"
    regex: /^([$@?]?\w+)\s+(?:does\s+not|doesn't)\s+(\w+)\s+([$@?]?\w+)$/i,
    extract: (match) => ({
      type: 'negation',
      negated: {
        type: 'binary',
        operator: /[A-Z]/.test(match[2]) ? match[2] : normalizeVerb(match[2]),
        subject: capitalizeWord(match[1]),
        object: capitalizeWord(match[3])
      }
    })
  },
  {
    // "Dogs do not fly", "Cats don't bark"
    regex: /^([$@?]?\w+)s?\s+(?:do\s+not|don't)\s+(\w+)$/i,
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
    regex: /^([$@?]?\w+)\s+is\s+not\s+(?:a\s+)?([$@?]?\w+)$/i,
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
 * Ability / modal patterns
 */
export const abilityPatterns = [
  {
    // "Tweety can fly"
    regex: /^([$@?]?\w+)\s+can\s+(\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'can',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  }
];

/**
 * Location patterns
 */
export const locationPatterns = [
  {
    // "Paris is in France"
    regex: /^([$@?]?\w+)\s+is\s+in\s+([$@?]?\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'locatedIn',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  },
  {
    // "The store is located in Paris"
    regex: /^(?:the\s+)?([$@?]?\w+)\s+is\s+located\s+in\s+([$@?]?\w+)$/i,
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
    regex: /^([$@?]?\w+)\s+has\s+(?:a\s+)?(?:an\s+)?([$@?]?\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'has',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  },
  {
    // "John owns a car"
    regex: /^([$@?]?\w+)\s+owns\s+(?:a\s+)?(?:an\s+)?([$@?]?\w+)$/i,
    extract: (match) => ({
      type: 'binary',
      operator: 'owns',
      subject: capitalizeWord(match[1]),
      object: capitalizeWord(match[2])
    })
  }
];

/**
 * Query patterns: "What is a Y?"
 * Produces a query-shaped clause (caller can wrap with @q).
 */
export const queryPatterns = [
  {
    // "What is a bird?"
    regex: /^what\s+(?:is|are)\s+(?:a|an)\s+(\w+)$/i,
    extract: (match) => ({
      type: 'isA',
      subject: '?x',
      object: capitalizeWord(singularize(match[1]))
    })
  },
  {
    // "What are birds?"
    regex: /^what\s+are\s+(\w+)s?$/i,
    extract: (match) => ({
      type: 'isA',
      subject: '?x',
      object: capitalizeWord(singularize(match[1]))
    })
  }
];

/**
 * All patterns organized by type
 */
export const patterns = {
  impliesMacro: impliesMacroPatterns,
  negation: negationPatterns,
  conditional: conditionalPatterns,
  universal: universalPatterns,
  compound: compoundPatterns,
  query: queryPatterns,
  isA: isAPatterns,
  ability: abilityPatterns,
  svio: svioPatterns,
  location: locationPatterns,
  ownership: ownershipPatterns,
  exactPrefixNary: exactPrefixNaryPatterns,
  exactNary: exactNaryPatterns,
  exactSvo: exactSvoPatterns,
  svo: svoPatterns,
  exactUnary: exactUnaryPatterns,
  property: propertyPatterns
};

/**
 * Priority order for pattern matching
 */
export const patternPriority = [
  'impliesMacro',
  'exactPrefixNary',
  'negation',
  'conditional',
  'universal',
  'compound',
  'query',
  'isA',
  'ability',
  'svio',
  'location',
  'ownership',
  'exactNary',
  'exactSvo',
  'svo',
  'exactUnary',
  'property'
];

export default patterns;
