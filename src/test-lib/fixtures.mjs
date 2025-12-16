/**
 * AGISystem2 - Test Fixtures
 * @module test-lib/fixtures
 *
 * Common test data and scenarios.
 */

export const basicFacts = {
  family: {
    dsl: `
      @john isA John Person
      @mary isA Mary Person
      @loves loves John Mary
      @parent parent John Alice
    `,
    expected: [
      { name: 'loves', operator: 'loves', args: ['John', 'Mary'] }
    ],
    queries: [
      { dsl: '@q loves ?who Mary', expected: { who: 'John' } },
      { dsl: '@q parent John ?child', expected: { child: 'Alice' } }
    ]
  },

  commerce: {
    dsl: `
      @sale1 sells Alice Book Bob
      @sale2 sells Carol Car David
    `,
    queries: [
      { dsl: '@q sells ?seller Book ?buyer', expected: { seller: 'Alice', buyer: 'Bob' } }
    ]
  },

  classification: {
    dsl: `
      @dog isA Dog Animal
      @cat isA Cat Animal
      @rover isA Rover Dog
    `,
    queries: [
      { dsl: '@q isA Rover ?type', expected: { type: 'Dog' } }
    ]
  }
};

export const reasoningChains = {
  mortality: {
    setup: `
      @r1 Implies (isA ?x Human) (isA ?x Mortal)
      @f1 isA Socrates Human
    `,
    proofs: [
      { goal: '@g isA Socrates Mortal', valid: true, minSteps: 1 }
    ]
  },

  transitivity: {
    setup: `
      @r1 Implies (And (greaterThan ?a ?b) (greaterThan ?b ?c)) (greaterThan ?a ?c)
      @f1 greaterThan A B
      @f2 greaterThan B C
    `,
    proofs: [
      { goal: '@g greaterThan A C', valid: true }
    ]
  },

  modus_ponens: {
    setup: `
      @rule Implies (rain Today) (wet Ground)
      @fact rain Today
    `,
    proofs: [
      { goal: '@g wet Ground', valid: true }
    ]
  }
};

export const decodingScenarios = {
  simple_fact: {
    dsl: '@f loves Romeo Juliet',
    expectedText: 'Romeo loves Juliet'
  },

  commerce_fact: {
    dsl: '@f sells Alice Book Bob',
    expectedText: 'Alice sells Book to Bob'
  },

  classification_fact: {
    dsl: '@f isA Dog Animal',
    expectedText: 'Dog is a Animal'
  }
};

export const errorCases = {
  syntaxError: {
    dsl: '@f loves John',  // Missing second argument
    shouldFail: false  // Actually valid - single arg statement
  },

  undefinedReference: {
    dsl: '@q loves @undefined Mary',
    shouldFail: true
  },

  tooManyHoles: {
    dsl: '@q sells ?a ?b ?c ?d ?e',
    shouldFail: true,
    reason: 'Too many holes'
  }
};

export default {
  basicFacts,
  reasoningChains,
  decodingScenarios,
  errorCases
};
