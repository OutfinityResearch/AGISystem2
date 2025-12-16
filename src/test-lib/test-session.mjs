/**
 * AGISystem2 - Test Session
 * @module test-lib/test-session
 *
 * Enhanced session for testing with verification methods.
 */

import { Session } from '../runtime/session.mjs';

export class TestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TestError';
  }
}

export class TestSession extends Session {
  /**
   * Create test session
   * @param {Object} options - Session options
   */
  constructor(options = {}) {
    super({
      geometry: options.geometry || 1024, // Smaller for faster tests
      ...options
    });
    this.testLog = [];
    this.assertions = [];
  }

  /**
   * Learn with verification
   * @param {string} dsl - DSL to learn
   * @param {Array} expectedFacts - Expected facts to verify
   * @returns {Object} Learn result
   */
  learnAndVerify(dsl, expectedFacts = []) {
    const result = this.learn(dsl);

    if (!result.success) {
      throw new TestError(`Learn failed: ${result.errors.join(', ')}`);
    }

    // Verify expected facts were encoded
    for (const expected of expectedFacts) {
      const vec = this.scope.get(expected.name);
      if (!vec) {
        this.assertions.push({
          type: 'learn',
          expected,
          actual: null,
          passed: false,
          reason: `Vector '${expected.name}' not found`
        });
        continue;
      }

      const decoded = this.decode(vec);
      const passed = this.matchesExpected(decoded, expected);

      this.assertions.push({
        type: 'learn',
        expected,
        actual: decoded,
        passed
      });
    }

    this.testLog.push({ operation: 'learn', dsl, result });
    return result;
  }

  /**
   * Query with verification
   * @param {string} dsl - Query DSL
   * @param {Object} expectedBindings - Expected bindings
   * @returns {Object} Query result
   */
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

  /**
   * Prove with verification
   * @param {string} goal - Goal DSL
   * @param {boolean} expectedValid - Expected validity
   * @param {number} expectedSteps - Expected minimum steps
   * @returns {Object} Prove result
   */
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

    if (expectedSteps !== null && result.steps) {
      assertion.passed = assertion.passed && result.steps.length >= expectedSteps;
    }

    this.assertions.push(assertion);
    this.testLog.push({ operation: 'prove', goal, result });

    return result;
  }

  /**
   * Decode and verify
   * @param {string} vectorName - Name of vector to decode
   * @param {string} expectedText - Expected text pattern
   * @returns {Object} Decode result
   */
  decodeAndVerify(vectorName, expectedText) {
    const vector = this.scope.get(vectorName);
    if (!vector) {
      throw new TestError(`Vector '${vectorName}' not found`);
    }

    const decoded = this.decode(vector);
    const summary = this.summarize(vector);

    const assertion = {
      type: 'decode',
      vectorName,
      expectedText,
      actualText: summary.text,
      structure: decoded,
      passed: this.textMatches(summary.text, expectedText)
    };

    this.assertions.push(assertion);
    this.testLog.push({ operation: 'decode', vectorName, decoded, summary });

    return { decoded, text: summary };
  }

  /**
   * Match decoded structure to expected
   */
  matchesExpected(decoded, expected) {
    if (!decoded.success) return false;

    const struct = decoded.structure;
    if (expected.operator && struct.operator !== expected.operator) {
      return false;
    }

    if (expected.args) {
      for (let i = 0; i < expected.args.length; i++) {
        const expectedArg = expected.args[i];
        const actualArg = struct.arguments.find(a => a.position === i + 1);
        if (!actualArg || actualArg.value !== expectedArg) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Match query bindings
   */
  bindingsMatch(actual, expected) {
    if (!actual || actual.size === 0) {
      return Object.keys(expected).length === 0;
    }

    for (const [hole, expectedValue] of Object.entries(expected)) {
      const binding = actual.get ? actual.get(hole) : actual[hole];
      if (!binding || binding.answer !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Flexible text matching
   */
  textMatches(actual, expected) {
    if (!actual || !expected) return false;

    const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const normActual = normalize(actual);
    const normExpected = normalize(expected);

    return normActual.includes(normExpected) ||
           normExpected.includes(normActual);
  }

  /**
   * Get test report
   * @returns {Object} Test report
   */
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

  /**
   * Reset test state
   */
  resetTest() {
    this.testLog = [];
    this.assertions = [];
  }
}

export default TestSession;
