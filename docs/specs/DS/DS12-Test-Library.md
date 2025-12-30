# AGISystem2 - System Specifications

# Chapter 12: Test Library and End-to-End Testing Framework

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Focus:** Integration Testing Library for Learn → Reason → Decode Pipeline

---

## 12.1 Purpose

This specification defines a **Test Library** that provides end-to-end testing capabilities for AGISystem2. The library enables:

1. **Theory Definition Testing** - Load and validate domain theories
2. **Learning Verification** - Confirm facts are encoded correctly
3. **Query Testing** - Verify query results match expected answers
4. **Reasoning Validation** - Test proof construction and rule application
5. **Decoding Verification** - Ensure vectors decode to readable natural language

---

## 12.2 Module Map

```
src/
├── test-lib/                    # Test Library
│   ├── index.js                 # Main exports
│   ├── test-session.js          # Enhanced session for testing
│   ├── assertions.js            # Test assertions
│   ├── fixtures.js              # Common test data
│   └── reporter.js              # Test result reporting
│
tests/
├── unit/                        # Unit tests
│   ├── core/
│   │   ├── vector.test.js
│   │   ├── operations.test.js
│   │   └── position.test.js
│   ├── parser/
│   │   ├── lexer.test.js
│   │   └── parser.test.js
│   ├── runtime/
│   │   └── session.test.js
│   ├── reasoning/
│   │   ├── query.test.js
│   │   └── prove.test.js
│   └── decoding/
│       └── decoder.test.js
│
├── integration/                 # Integration tests
│   ├── e2e-pipeline.test.js     # Full Learn→Query→Decode
│   ├── theory-loading.test.js   # Theory management
│   └── reasoning-chain.test.js  # Multi-step proofs
│
└── fixtures/                    # Test data
    ├── theories/
    │   ├── Family.sys2
    │   └── Commerce.sys2
    └── scenarios/
        ├── basic-facts.json
        └── reasoning-chains.json
```

---

## 12.3 Test Session API

### 12.3.1 TestSession Class

```javascript
class TestSession extends Session {
  constructor(options = {}) {
    super({
      geometry: options.geometry || 1024,  // Smaller for faster tests
      ...options
    });
    this.testLog = [];
    this.assertions = [];
  }

  // Enhanced learn with verification
  learnAndVerify(dsl, expectedFacts = []) {
    const result = this.learn(dsl);

    if (!result.success) {
      throw new TestError(`Learn failed: ${result.errors.join(', ')}`);
    }

    // Verify expected facts were encoded
    for (const expected of expectedFacts) {
      const decoded = this.decode(this.scope.get(expected.name));
      this.assertions.push({
        type: 'learn',
        expected,
        actual: decoded,
        passed: this.matchesExpected(decoded, expected)
      });
    }

    return result;
  }

  // Query with expected answer verification
  queryAndVerify(dsl, expectedBindings) {
    const result = this.query(dsl);

    const assertion = {
      type: 'query',
      dsl,
      expected: expectedBindings,
      actual: result.bindings,
      confidence: result.confidence,
      passed: this.bindingsMatch(result.bindings, expectedBindings)
    };

    this.assertions.push(assertion);
    this.testLog.push({ operation: 'query', dsl, result });

    return result;
  }

  // Prove with expected validity
  proveAndVerify(goal, expectedValid, expectedSteps = null) {
    const result = this.prove(goal);

    const assertion = {
      type: 'prove',
      goal,
      expectedValid,
      actualValid: result.valid,
      steps: result.steps?.length || 0,
      passed: result.valid === expectedValid
    };

    this.assertions.push(assertion);
    return result;
  }

  // Decode and verify natural language output
  decodeAndVerify(vectorName, expectedText) {
    const vector = this.scope.get(vectorName);
    const decoded = this.decode(vector);
    const text = this.summarize(vector);

    const assertion = {
      type: 'decode',
      vectorName,
      expectedText,
      actualText: text.text,
      structure: decoded,
      passed: this.textMatches(text.text, expectedText)
    };

    this.assertions.push(assertion);
    return { decoded, text };
  }

  // Get test report
  getReport() {
    const passed = this.assertions.filter(a => a.passed).length;
    const failed = this.assertions.filter(a => !a.passed).length;

    return {
      total: this.assertions.length,
      passed,
      failed,
      passRate: passed / (passed + failed) || 0,
      assertions: this.assertions,
      log: this.testLog
    };
  }
}
```

### 12.3.2 Helper Methods

```javascript
// Match decoded structure to expected
matchesExpected(decoded, expected) {
  if (!decoded.success) return false;

  const struct = decoded.structure;
  if (expected.operator && struct.operator !== expected.operator) return false;

  if (expected.args) {
    for (let i = 0; i < expected.args.length; i++) {
      const expectedArg = expected.args[i];
      const actualArg = struct.arguments.find(a => a.position === i + 1);
      if (!actualArg || actualArg.value !== expectedArg) return false;
    }
  }

  return true;
}

// Match query bindings
bindingsMatch(actual, expected) {
  if (!actual) return Object.keys(expected).length === 0;

  for (const [hole, expectedValue] of Object.entries(expected)) {
    const binding = actual.get ? actual.get(hole) : actual[hole];
    if (!binding || binding.answer !== expectedValue) return false;
  }

  return true;
}

// Flexible text matching
textMatches(actual, expected) {
  // Normalize whitespace and case for comparison
  const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return normalize(actual).includes(normalize(expected)) ||
         normalize(expected).includes(normalize(actual));
}
```

---

## 12.4 Test Assertions Library

```javascript
// assertions.js

class Assertions {
  static similarityAbove(actual, threshold, message) {
    if (actual < threshold) {
      throw new AssertionError(
        message || `Expected similarity > ${threshold}, got ${actual}`
      );
    }
  }

  static similarityBelow(actual, threshold, message) {
    if (actual > threshold) {
      throw new AssertionError(
        message || `Expected similarity < ${threshold}, got ${actual}`
      );
    }
  }

  static confidenceStrong(result) {
    Assertions.similarityAbove(result.confidence, 0.65,
      `Expected strong confidence (>0.65), got ${result.confidence}`);
  }

  static querySucceeds(result) {
    if (!result.success) {
      throw new AssertionError(`Query failed: ${result.reason}`);
    }
  }

  static queryReturns(result, hole, expectedValue) {
    Assertions.querySucceeds(result);
    const binding = result.bindings.get ?
      result.bindings.get(hole) : result.bindings[hole];

    if (!binding || binding.answer !== expectedValue) {
      throw new AssertionError(
        `Expected ${hole}=${expectedValue}, got ${binding?.answer}`
      );
    }
  }

  static proofValid(result) {
    if (!result.valid) {
      throw new AssertionError(`Proof invalid: ${result.reason}`);
    }
  }

  static decodesTo(decoded, operator, args = []) {
    if (!decoded.success) {
      throw new AssertionError('Decoding failed');
    }
    if (decoded.structure.operator !== operator) {
      throw new AssertionError(
        `Expected operator ${operator}, got ${decoded.structure.operator}`
      );
    }
  }

  static vectorsOrthogonal(a, b, session) {
    const sim = session.similarity(a, b);
    if (sim > 0.55) {
      throw new AssertionError(
        `Vectors should be orthogonal (sim < 0.55), got ${sim}`
      );
    }
  }

  static vectorsEqual(a, b, session) {
    const sim = session.similarity(a, b);
    if (sim < 0.99) {
      throw new AssertionError(
        `Vectors should be equal (sim > 0.99), got ${sim}`
      );
    }
  }
}
```

---

## 12.5 Test Fixtures

### 12.5.1 Basic Facts Fixture

```javascript
// fixtures/basic-facts.js
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
  }
};
```

### 12.5.2 Reasoning Chains Fixture

```javascript
// fixtures/reasoning-chains.js
export const reasoningChains = {
  mortality: {
    setup: `
      @r1 Implies (isA ?x Human) (isA ?x Mortal)
      @f1 isA Socrates Human
    `,
    proofs: [
      { goal: '@g isA Socrates Mortal', valid: true, minSteps: 2 }
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
  }
};
```

---

## 12.6 End-to-End Pipeline Test

```javascript
// tests/integration/e2e-pipeline.test.js

describe('End-to-End Pipeline', () => {
  let session;

  beforeEach(() => {
    session = new TestSession({ geometry: 1024 });
  });

  afterEach(() => {
    session.close();
  });

  describe('Learn → Query → Decode', () => {
    it('should encode facts and retrieve them via query', () => {
      // 1. LEARN: Add facts to KB
      session.learnAndVerify(`
        @f1 loves John Mary
        @f2 loves Bob Alice
      `, [
        { name: 'f1', operator: 'loves', args: ['John', 'Mary'] }
      ]);

      // 2. QUERY: Find who loves Mary
      const queryResult = session.queryAndVerify(
        '@q loves ?who Mary',
        { who: 'John' }
      );

      Assertions.confidenceStrong(queryResult);

      // 3. DECODE: Convert result to natural language
      const { text } = session.decodeAndVerify('f1', 'John loves Mary');

      expect(text.text).toContain('John');
      expect(text.text).toContain('Mary');
    });

    it('should handle multi-argument relations', () => {
      session.learnAndVerify(`
        @sale sells Alice Book Bob 50
      `);

      const result = session.queryAndVerify(
        '@q sells ?seller Book ?buyer ?price',
        { seller: 'Alice', buyer: 'Bob' }
      );

      // Price might have lower confidence with many holes
      expect(result.success).toBe(true);
    });

    it('should produce readable natural language', () => {
      session.learn(`@fact loves Romeo Juliet`);

      const summary = session.summarize(session.scope.get('fact'));

      expect(summary.success).toBe(true);
      expect(summary.text.toLowerCase()).toMatch(/romeo.*juliet|juliet.*romeo/);
    });
  });

  describe('Learn → Prove → Decode', () => {
    it('should prove derived facts with rules', () => {
      // Learn rule and base fact
      session.learn(`
        @rule Implies (isA ?x Human) (isA ?x Mortal)
        @fact isA Socrates Human
      `);

      // Prove derived fact
      const proof = session.proveAndVerify(
        '@goal isA Socrates Mortal',
        true
      );

      expect(proof.valid).toBe(true);
      expect(proof.steps.length).toBeGreaterThan(0);

      // Decode the proof explanation
      const explanation = session.elaborate(proof);
      expect(explanation.text).toBeDefined();
    });
  });
});
```

---

## 12.7 Test Coverage Requirements

### 12.7.1 Unit Test Coverage

| Module | Target Coverage | Critical Paths |
|--------|----------------|----------------|
| core/vector.js | 95% | bit ops, extend, serialize |
| core/operations.js | 95% | bind, bundle, similarity |
| core/position.js | 90% | withPosition, removePosition |
| parser/lexer.js | 90% | all token types |
| parser/parser.js | 85% | statements, expressions, errors |
| runtime/session.js | 85% | learn, query, prove, decode |
| reasoning/query.js | 90% | hole extraction, confidence |
| decoding/decoder.js | 85% | operator extraction, args |

### 12.7.2 Integration Test Scenarios

| Scenario | Description | Priority |
|----------|-------------|----------|
| E2E-01 | Simple fact learn and query | P0 |
| E2E-02 | Multi-argument query | P0 |
| E2E-03 | Rule-based proof | P1 |
| E2E-04 | Natural language decode | P0 |
| E2E-05 | Theory loading | P1 |
| E2E-06 | Multiple sessions isolation | P2 |
| E2E-07 | Error handling | P1 |
| E2E-08 | Capacity limits | P2 |

---

## 12.8 Test Runner Configuration

```javascript
// package.json scripts
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:unit": "npm test -- tests/unit",
    "test:integration": "npm test -- tests/integration",
    "test:coverage": "npm test -- --coverage",
    "test:watch": "npm test -- --watch"
  }
}

// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/test-lib/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

## 12.9 Natural Language Output Verification

### 12.9.1 Decode Quality Metrics

```javascript
class DecodeQualityChecker {
  // Check that decoded text contains all entities
  static entitiesPresent(decoded, originalDsl) {
    const entities = this.extractEntities(originalDsl);
    const text = decoded.text.toLowerCase();

    for (const entity of entities) {
      if (!text.includes(entity.toLowerCase())) {
        return { pass: false, missing: entity };
      }
    }
    return { pass: true };
  }

  // Check grammatical structure
  static isGrammatical(text) {
    // Basic checks
    const hasSubject = /^[A-Z][a-z]+/.test(text);
    const hasVerb = /\s(is|are|was|were|has|have|loves|sells|bought)\s/i.test(text);
    const endsProperly = /[.!?]$/.test(text.trim());

    return hasSubject && hasVerb && endsProperly;
  }

  // Extract entities from DSL
  static extractEntities(dsl) {
    const matches = dsl.match(/[A-Z][a-z]+/g) || [];
    return [...new Set(matches)];
  }
}
```

### 12.9.2 Phrasing Template Tests

```javascript
describe('Natural Language Generation', () => {
  it('should use correct template for "loves"', () => {
    session.learn('@f loves John Mary');
    const result = session.summarize(session.scope.get('f'));

    expect(result.text).toMatch(/John.*loves.*Mary/i);
  });

  it('should use correct template for "sells"', () => {
    session.learn('@f sells Alice Book Bob');
    const result = session.summarize(session.scope.get('f'));

    // Template: "{Pos1} sold {Pos3} to {Pos2}"
    expect(result.text).toMatch(/Alice.*Book.*Bob/i);
  });

  it('should handle unknown operators with generic phrase', () => {
    session.learn('@f customRelation X Y');
    const result = session.summarize(session.scope.get('f'));

    // Should still produce something readable
    expect(result.text).toContain('X');
    expect(result.text).toContain('Y');
  });
});
```

---

## 12.10 Summary

The Test Library provides:

1. **TestSession** - Enhanced session with verification methods
2. **Assertions** - Domain-specific test assertions
3. **Fixtures** - Reusable test data
4. **E2E Tests** - Full pipeline validation
5. **Coverage** - Minimum 80% code coverage
6. **Quality Checks** - Natural language output verification

**Key Testing Patterns:**
- Learn → Query → Decode for retrieval
- Learn → Prove → Decode for reasoning
- Fixtures for reproducible tests
- Assertions for domain concepts (similarity, confidence)

---

*End of Chapter 12 - Test Library and End-to-End Testing Framework*
