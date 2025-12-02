/**
 * TestRunner - Main test execution orchestrator
 *
 * Runs test suites and validates Sys2DSL results.
 * No LLM dependencies - pure DSL validation.
 */

const DSLExecutor = require('./DSLExecutor');
const ResultValidator = require('./ResultValidator');
const TestLoader = require('./TestLoader');

class TestRunner {
  constructor(options = {}) {
    this.suiteDir = options.suiteDir || __dirname + '/..';
    this.verbose = options.verbose || false;
    this.strict = options.strict || false;

    this.executor = new DSLExecutor({ verbose: this.verbose });
    this.validator = new ResultValidator({ strict: this.strict });
    this.loader = new TestLoader(this.suiteDir);
  }

  /**
   * Initialize the runner
   */
  async init() {
    return await this.executor.init();
  }

  /**
   * Run a single test suite
   * @param {string} suiteName - Suite name (e.g., "suite_01_ontology")
   */
  async runSuite(suiteName) {
    const testCase = this.loader.loadCase(suiteName);

    if (testCase.error) {
      return {
        suite: suiteName,
        status: 'error',
        error: testCase.error,
        passed: 0,
        failed: 0,
        total: 0
      };
    }

    // Reset executor state
    this.executor.reset();

    // Load theory facts
    if (testCase.theory?.expected_facts) {
      this.executor.loadFacts(testCase.theory.expected_facts);
    }

    // Run queries
    const results = [];
    const queries = testCase.queries || [];

    for (const query of queries) {
      const result = await this.runQuery(query);
      results.push(result);

      if (this.verbose) {
        const status = result.passed ? '✓' : '✗';
        console.log(`  ${status} ${query.id}: ${result.passed ? 'PASS' : 'FAIL'}`);
        if (!result.passed && result.errors.length > 0) {
          console.log(`    ${result.errors[0]}`);
        }
      }
    }

    // Summarize
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    return {
      suite: suiteName,
      name: testCase.name,
      status: failed === 0 ? 'passed' : 'failed',
      passed,
      failed,
      total: results.length,
      results
    };
  }

  /**
   * Run a single query
   */
  async runQuery(query) {
    const dsl = query.expected_dsl;
    const expected = query.expected_answer;

    if (!dsl) {
      return {
        id: query.id,
        passed: false,
        errors: ['No expected_dsl defined'],
        actual: null,
        expected
      };
    }

    // Execute DSL
    const actual = this.executor.query(dsl);

    // Validate
    const validation = this.validator.validate(actual, expected);

    return {
      id: query.id,
      dsl,
      passed: validation.passed,
      errors: validation.errors,
      actual: {
        truth: actual.truth,
        kind: actual.kind,
        error: actual.error
      },
      expected: {
        truth: expected?.truth,
        kind: expected?.kind
      }
    };
  }

  /**
   * Run all test suites
   */
  async runAll() {
    const suites = this.loader.listSuites();
    const results = [];

    console.log(`Running ${suites.length} test suites...\n`);

    for (const suite of suites) {
      process.stdout.write(`${suite}... `);
      const result = await this.runSuite(suite);
      results.push(result);

      if (result.status === 'passed') {
        console.log(`\x1b[32mPASS\x1b[0m (${result.passed}/${result.total})`);
      } else if (result.status === 'error') {
        console.log(`\x1b[33mERROR\x1b[0m: ${result.error}`);
      } else {
        console.log(`\x1b[31mFAIL\x1b[0m (${result.passed}/${result.total})`);
      }
    }

    // Summary
    const totalPassed = results.filter(r => r.status === 'passed').length;
    const totalFailed = results.filter(r => r.status === 'failed').length;
    const totalError = results.filter(r => r.status === 'error').length;

    console.log('\n' + '─'.repeat(50));
    console.log('Summary:');
    console.log(`  \x1b[32mPassed:\x1b[0m  ${totalPassed}`);
    console.log(`  \x1b[31mFailed:\x1b[0m  ${totalFailed}`);
    if (totalError > 0) {
      console.log(`  \x1b[33mErrors:\x1b[0m  ${totalError}`);
    }
    console.log(`  Total:   ${results.length}`);
    console.log('─'.repeat(50));

    return {
      suites: results,
      summary: {
        passed: totalPassed,
        failed: totalFailed,
        error: totalError,
        total: results.length
      }
    };
  }

  /**
   * Run specific suites by name or pattern
   * @param {string[]} patterns - Suite names or patterns
   */
  async runSelected(patterns) {
    const allSuites = this.loader.listSuites();
    const selected = [];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Glob-like pattern
        const regex = new RegExp(pattern.replace('*', '.*'));
        selected.push(...allSuites.filter(s => regex.test(s)));
      } else if (allSuites.includes(pattern)) {
        selected.push(pattern);
      } else {
        // Try partial match
        const matches = allSuites.filter(s => s.includes(pattern));
        selected.push(...matches);
      }
    }

    const unique = [...new Set(selected)];
    const results = [];

    for (const suite of unique) {
      const result = await this.runSuite(suite);
      results.push(result);
    }

    return results;
  }
}

module.exports = TestRunner;
