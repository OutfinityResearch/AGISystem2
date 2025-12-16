#!/usr/bin/env node
/**
 * EvalSuite Runner
 *
 * Run evaluation suites to test NL->DSL transformation and reasoning.
 *
 * Usage:
 *   node evalSuite/run.js                           # Run all suites with both strategies
 *   node evalSuite/run.js suite01                   # Run specific suite with both strategies
 *   node evalSuite/run.js --verbose                 # Show failure details
 *   node evalSuite/run.js --strategy=dense-binary   # Run with specific strategy only
 *   node evalSuite/run.js --compare                 # Run with both strategies and compare (default)
 */

import { discoverSuites, loadSuite } from './lib/loader.mjs';
import { runSuite } from './lib/runner.mjs';
import {
  reportSuiteHeader,
  reportCaseResults,
  reportSuiteSummary,
  reportFailureDetails,
  reportGlobalSummary,
  reportMultiStrategyComparison
} from './lib/reporter.mjs';
import { listStrategies } from '../src/hdc/facade.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const compareMode = args.includes('--compare') || !args.some(a => a.startsWith('--strategy='));

// Extract specific strategy if provided
const strategyArg = args.find(a => a.startsWith('--strategy='));
const singleStrategy = strategyArg ? strategyArg.split('=')[1] : null;

const specificSuites = args.filter(a => !a.startsWith('-') && !a.startsWith('--'));

// Track results globally for interrupt handler
let collectedResults = [];
let interrupted = false;

// Handle Ctrl+C - show summary before exit
process.on('SIGINT', () => {
  interrupted = true;
  console.log('\n\n\x1b[33m⚠ Interrupted by user (Ctrl+C)\x1b[0m\n');

  if (collectedResults.length > 0) {
    reportGlobalSummary(collectedResults);
  } else {
    console.log('\x1b[2mNo results collected yet.\x1b[0m');
  }

  process.exit(130); // Standard exit code for SIGINT
});

async function main() {
  console.log();
  console.log('\x1b[1m\x1b[34mAGISystem2 - Evaluation Suite Runner\x1b[0m');
  console.log('\x1b[2mTesting NL\u2192DSL transformation with Core Theory stack\x1b[0m');
  console.log();

  try {
    // Discover available suites
    let suites = await discoverSuites();

    if (suites.length === 0) {
      console.error('\x1b[31mNo evaluation suites found!\x1b[0m');
      process.exit(1);
    }

    // Filter to specific suites if requested
    if (specificSuites.length > 0) {
      suites = suites.filter(s =>
        specificSuites.some(arg => s.includes(arg))
      );

      if (suites.length === 0) {
        console.error(`\x1b[31mNo matching suites found for: ${specificSuites.join(', ')}\x1b[0m`);
        process.exit(1);
      }
    }

    console.log(`Found ${suites.length} suite(s): ${suites.join(', ')}`);

    // Determine which strategies to run
    const availableStrategies = listStrategies();
    let strategiesToRun;

    if (singleStrategy) {
      if (!availableStrategies.includes(singleStrategy)) {
        console.error(`\x1b[31mUnknown strategy: ${singleStrategy}. Available: ${availableStrategies.join(', ')}\x1b[0m`);
        process.exit(1);
      }
      strategiesToRun = [singleStrategy];
      console.log(`Running with strategy: ${singleStrategy}`);
    } else {
      strategiesToRun = availableStrategies;
      console.log(`Running with ${strategiesToRun.length} strategies: ${strategiesToRun.join(', ')}`);
    }

    // Results by strategy
    const resultsByStrategy = {};

    // Run all suites for each strategy
    for (const strategyId of strategiesToRun) {
      if (interrupted) break;

      console.log();
      console.log(`\x1b[1m\x1b[35m${'━'.repeat(80)}\x1b[0m`);
      console.log(`\x1b[1m\x1b[35mHDC Strategy: ${strategyId}\x1b[0m`);
      console.log(`\x1b[35m${'━'.repeat(80)}\x1b[0m`);

      resultsByStrategy[strategyId] = [];

      for (const suiteName of suites) {
        if (interrupted) break;

        try {
          // Load suite data
          const suite = await loadSuite(suiteName);

          // Report header (shows Core theory stack)
          reportSuiteHeader(suite);

          // Run tests with specific strategy
          const { results, summary } = await runSuite(suite, { strategy: strategyId });

          // Report results
          reportCaseResults(suite.cases, results);
          reportSuiteSummary(summary, suite.cases);

          // Show failure details if verbose
          if (verbose) {
            for (let i = 0; i < results.length; i++) {
              reportFailureDetails(i, results[i]);
            }
          }

          resultsByStrategy[strategyId].push({
            name: suite.name,
            suiteName,
            results,
            summary,
            cases: suite.cases,
            strategyId
          });

        } catch (err) {
          console.error(`\x1b[31mError running suite ${suiteName}: ${err.message}\x1b[0m`);
          if (verbose) {
            console.error(err.stack);
          }
        }
      }

      // Show summary for this strategy
      if (!interrupted && resultsByStrategy[strategyId].length > 0) {
        console.log();
        console.log(`\x1b[1m\x1b[35mStrategy: ${strategyId} - Summary\x1b[0m`);
        reportGlobalSummary(resultsByStrategy[strategyId]);
      }
    }

    // Multi-strategy comparison (if running multiple strategies)
    if (!interrupted && strategiesToRun.length > 1) {
      reportMultiStrategyComparison(resultsByStrategy);
    }

    // Exit code based on results
    const allPassed = Object.values(resultsByStrategy).every(strategyResults =>
      strategyResults.every(s => s.summary.failed === 0)
    );
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.error(`\x1b[31mFatal error: ${err.message}\x1b[0m`);
    if (verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
