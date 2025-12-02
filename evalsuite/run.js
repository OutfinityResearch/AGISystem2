#!/usr/bin/env node
/**
 * Evaluation Suite Runner - v3.0
 *
 * Usage:
 *   node run.js                    # Run all suites
 *   node run.js suite_01_ontology  # Run specific suite
 *   node run.js ontology causation # Run multiple (partial match)
 *   node run.js --verbose          # Verbose output
 *   node run.js --strict           # Strict truth matching
 *   node run.js --list             # List available suites
 */

const TestRunner = require('./deps/TestRunner');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const verbose = args.includes('--verbose') || args.includes('-v');
  const strict = args.includes('--strict') || args.includes('-s');
  const listOnly = args.includes('--list') || args.includes('-l');

  // Remove flags from args
  const suites = args.filter(a => !a.startsWith('-'));

  const runner = new TestRunner({
    suiteDir: __dirname,
    verbose,
    strict
  });

  // List mode
  if (listOnly) {
    const available = runner.loader.listSuites();
    console.log('Available test suites:\n');
    for (const suite of available) {
      console.log(`  ${suite}`);
    }
    console.log(`\nTotal: ${available.length} suites`);
    return;
  }

  // Initialize
  const initOk = await runner.init();
  if (!initOk) {
    console.error('Failed to initialize test runner');
    console.error('Make sure the DSL engine is properly built');
    process.exit(1);
  }

  // Run tests
  let results;
  if (suites.length === 0) {
    results = await runner.runAll();
  } else {
    const suiteResults = await runner.runSelected(suites);

    // Print results
    for (const result of suiteResults) {
      if (result.status === 'passed') {
        console.log(`\x1b[32m✓\x1b[0m ${result.suite}: ${result.passed}/${result.total} passed`);
      } else {
        console.log(`\x1b[31m✗\x1b[0m ${result.suite}: ${result.passed}/${result.total} passed`);
        if (verbose) {
          for (const r of result.results.filter(r => !r.passed)) {
            console.log(`    ${r.id}: ${r.errors.join(', ')}`);
          }
        }
      }
    }

    const passed = suiteResults.filter(r => r.status === 'passed').length;
    results = { summary: { passed, failed: suiteResults.length - passed, total: suiteResults.length } };
  }

  // Exit code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
