/**
 * TestLoader - Loads and parses test cases
 *
 * Handles both v2.x and v3.0 test formats.
 */

const fs = require('fs');
const path = require('path');

class TestLoader {
  constructor(suiteDir) {
    this.suiteDir = suiteDir;
  }

  /**
   * Load a test case from a suite directory
   * @param {string} suiteName - Name of the suite (e.g., "suite_01_ontology")
   * Supports both case.js (preferred, with template literals) and case.json
   */
  loadCase(suiteName) {
    const jsPath = path.join(this.suiteDir, suiteName, 'case.js');
    const jsonPath = path.join(this.suiteDir, suiteName, 'case.json');

    // Prefer .js files (allow template literal multi-line DSL)
    if (fs.existsSync(jsPath)) {
      try {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(jsPath)];
        const testCase = require(jsPath);
        return this.normalizeCase(testCase);
      } catch (err) {
        return { error: `Failed to load ${jsPath}: ${err.message}` };
      }
    }

    // Fall back to .json
    if (fs.existsSync(jsonPath)) {
      try {
        const content = fs.readFileSync(jsonPath, 'utf8');
        const testCase = JSON.parse(content);
        return this.normalizeCase(testCase);
      } catch (err) {
        return { error: `Failed to parse ${jsonPath}: ${err.message}` };
      }
    }

    return { error: `Case file not found: ${jsPath} or ${jsonPath}` };
  }

  /**
   * Normalize test case to v3.0 format
   */
  normalizeCase(testCase) {
    // Already v3.0
    if (testCase.version === '3.0') {
      return testCase;
    }

    // Convert queries from v2.x to v3.0
    if (testCase.queries) {
      testCase.queries = testCase.queries.map(q => this.normalizeQuery(q));
    }

    testCase.version = '3.0';
    return testCase;
  }

  /**
   * Normalize a single query to v3.0
   */
  normalizeQuery(query) {
    if (!query.expected_dsl) return query;

    let dsl = query.expected_dsl;

    // Remove ASK command (implicit in v3.0)
    dsl = dsl.replace(/^(@\w+)\s+ASK\s+/gm, '$1 ');

    // Remove ASSERT command (implicit in v3.0)
    dsl = dsl.replace(/^(@\w+)\s+ASSERT\s+/gm, '@_ ');

    // BOOL_AND $a $b → $a AND $b
    dsl = dsl.replace(/^(@\w+)\s+BOOL_AND\s+(\$\w+)\s+(\$\w+)/gm, '$1 $2 AND $3');

    // BOOL_OR $a $b → $a OR $b
    dsl = dsl.replace(/^(@\w+)\s+BOOL_OR\s+(\$\w+)\s+(\$\w+)/gm, '$1 $2 OR $3');

    // BOOL_NOT $a → $a NOT any
    dsl = dsl.replace(/^(@\w+)\s+BOOL_NOT\s+(\$\w+)/gm, '$1 $2 NOT any');

    // THEORY_PUSH name → name PUSH any
    dsl = dsl.replace(/^(@\w+)\s+THEORY_PUSH\s+(\w+)/gm, '$1 $2 PUSH any');

    // THEORY_POP → any POP any
    dsl = dsl.replace(/^(@\w+)\s+THEORY_POP\s*/gm, '$1 any POP any');

    query.expected_dsl = dsl;
    return query;
  }

  /**
   * List all available suites
   */
  listSuites() {
    if (!fs.existsSync(this.suiteDir)) {
      return [];
    }

    return fs.readdirSync(this.suiteDir)
      .filter(f => f.startsWith('suite_'))
      .filter(f => fs.statSync(path.join(this.suiteDir, f)).isDirectory())
      .sort();
  }

  /**
   * Load all test cases
   */
  loadAll() {
    const suites = this.listSuites();
    const cases = [];

    for (const suite of suites) {
      const testCase = this.loadCase(suite);
      if (!testCase.error) {
        cases.push({ suite, ...testCase });
      }
    }

    return cases;
  }
}

module.exports = TestLoader;
