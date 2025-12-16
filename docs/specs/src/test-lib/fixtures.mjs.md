# Module: src/test-lib/fixtures.mjs

**Purpose:** Common test data and scenarios for testing.

## Exports

```javascript
export const basicFacts: {
  family: { dsl: string; expected: ExpectedFact[]; queries: QueryTest[]; };
  commerce: { dsl: string; queries: QueryTest[]; };
  classification: { dsl: string; queries: QueryTest[]; };
};

export const reasoningChains: {
  mortality: { setup: string; proofs: ProofTest[]; };
  transitivity: { setup: string; proofs: ProofTest[]; };
  modus_ponens: { setup: string; proofs: ProofTest[]; };
};

export const decodingScenarios: {
  simple_fact: { dsl: string; expectedText: string; };
  commerce_fact: { dsl: string; expectedText: string; };
  classification_fact: { dsl: string; expectedText: string; };
};

export const errorCases: {
  syntaxError: { dsl: string; shouldFail: boolean; };
  undefinedReference: { dsl: string; shouldFail: boolean; };
  tooManyHoles: { dsl: string; shouldFail: boolean; reason: string; };
};
```

## Dependencies

None.

## Test Cases

- Fixtures can be loaded without error
- Each fixture has required properties
