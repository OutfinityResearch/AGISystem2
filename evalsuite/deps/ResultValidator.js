/**
 * ResultValidator - Validates DSL execution results
 *
 * Compares actual results against expected answers.
 */

class ResultValidator {
  constructor(options = {}) {
    this.strict = options.strict || false;
  }

  /**
   * Validate a single query result
   * @param {Object} actual - Result from DSLExecutor
   * @param {Object} expected - Expected answer from test case
   * @returns {Object} Validation result
   */
  validate(actual, expected) {
    const result = {
      passed: false,
      checks: [],
      errors: []
    };

    // Check 1: Truth value
    if (expected.truth) {
      const truthMatch = this.matchTruth(actual.truth, expected.truth);
      result.checks.push({
        name: 'truth',
        expected: expected.truth,
        actual: actual.truth,
        passed: truthMatch
      });
      if (!truthMatch) {
        result.errors.push(`Truth mismatch: expected ${expected.truth}, got ${actual.truth}`);
      }
    }

    // Check 2: Kind (if specified)
    if (expected.kind) {
      const kindMatch = actual.kind === expected.kind;
      result.checks.push({
        name: 'kind',
        expected: expected.kind,
        actual: actual.kind,
        passed: kindMatch
      });
      if (!kindMatch) {
        result.errors.push(`Kind mismatch: expected ${expected.kind}, got ${actual.kind}`);
      }
    }

    // Check 3: Error state
    if (actual.error && !expected.truth?.includes('ERROR') && !expected.truth?.includes('CONFLICT')) {
      result.errors.push(`Unexpected error: ${actual.error}`);
    }

    // Overall pass/fail
    result.passed = result.errors.length === 0;

    return result;
  }

  /**
   * Match truth values with some flexibility
   */
  matchTruth(actual, expected) {
    if (!actual || !expected) return false;

    const actualNorm = actual.toUpperCase();
    const expectedNorm = expected.toUpperCase();

    // Exact match
    if (actualNorm === expectedNorm) return true;

    // Flexible matching for TRUE variants
    const trueValues = ['TRUE', 'TRUE_CERTAIN', 'TRUE_DEFAULT'];
    const falseValues = ['FALSE', 'FALSE_CERTAIN', 'FALSE_DEFAULT'];

    if (trueValues.includes(actualNorm) && trueValues.includes(expectedNorm)) {
      return !this.strict; // Flexible mode accepts any TRUE
    }

    if (falseValues.includes(actualNorm) && falseValues.includes(expectedNorm)) {
      return !this.strict;
    }

    return false;
  }

  /**
   * Validate a batch of results
   * @param {Array} results - Array of {actual, expected} pairs
   */
  validateBatch(results) {
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      details: []
    };

    for (const { id, actual, expected } of results) {
      const validation = this.validate(actual, expected);
      summary.details.push({ id, ...validation });

      if (validation.passed) {
        summary.passed++;
      } else {
        summary.failed++;
      }
    }

    return summary;
  }
}

module.exports = ResultValidator;
