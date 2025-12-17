#!/usr/bin/env node
/**
 * EvalSuite Runner
 *
 * Run evaluation suites to test NL->DSL transformation and reasoning.
 *
 * Usage:
 *   node evalSuite/run.js                           # Run all suites with 2 strategies (default)
 *   node evalSuite/run.js suite01                   # Run specific suite with both strategies
 *   node evalSuite/run.js --verbose                 # Show failure details
 *   node evalSuite/run.js --strategy=dense-binary   # Run with specific strategy only
 *   node evalSuite/run.js --compare                 # Run with both strategies and compare (default)
 *   node evalSuite/run.js --all-modes               # Run with all 4 configurations (2 strategies × 2 reasoning priorities)
 *   node evalSuite/run.js --priority=holographicPriority  # Run with specific reasoning priority
 *   node evalSuite/run.js --dense-dim=1024          # Set dense-binary vector dimension (default: 2048)
 *   node evalSuite/run.js --sparse-k=6              # Set sparse-polynomial exponent count (default: 4)
 *
 * Geometry Parameters:
 *   --dense-dim=N   Dense binary vector dimension (128, 256, 512, 1024, 2048, 4096)
 *   --sparse-k=N    Sparse polynomial exponent count (2, 3, 4, 5, 6, 8)
 *
 * Configurations:
 *   HDC Strategies: dense-binary, sparse-polynomial
 *   Reasoning Priorities: symbolicPriority (default), holographicPriority
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
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const allModes = args.includes('--all-modes') || args.includes('--4way');
const compareMode = args.includes('--compare') || !args.some(a => a.startsWith('--strategy='));

// Extract specific strategy if provided
const strategyArg = args.find(a => a.startsWith('--strategy='));
const singleStrategy = strategyArg ? strategyArg.split('=')[1] : null;

// Extract specific reasoning priority if provided
const priorityArg = args.find(a => a.startsWith('--priority='));
const singlePriority = priorityArg ? priorityArg.split('=')[1] : null;

// Extract geometry parameters
const denseDimArg = args.find(a => a.startsWith('--dense-dim='));
const denseDim = denseDimArg ? parseInt(denseDimArg.split('=')[1], 10) : 2048;

const sparseKArg = args.find(a => a.startsWith('--sparse-k='));
const sparseK = sparseKArg ? parseInt(sparseKArg.split('=')[1], 10) : 4;

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
    } else {
      strategiesToRun = availableStrategies;
    }

    // Determine which reasoning priorities to run
    const availablePriorities = [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];
    let prioritiesToRun;

    if (singlePriority) {
      if (!availablePriorities.includes(singlePriority)) {
        console.error(`\x1b[31mUnknown priority: ${singlePriority}. Available: ${availablePriorities.join(', ')}\x1b[0m`);
        process.exit(1);
      }
      prioritiesToRun = [singlePriority];
    } else {
      // Default: run ALL 4 configurations (2 strategies × 2 priorities)
      // Be bold - show the full picture!
      prioritiesToRun = availablePriorities;
    }

    // Build configuration list with geometry
    const configurations = [];
    for (const strategy of strategiesToRun) {
      for (const priority of prioritiesToRun) {
        // Use appropriate geometry for each strategy
        const geometry = strategy === 'sparse-polynomial' ? sparseK : denseDim;
        configurations.push({ strategy, priority, geometry });
      }
    }

    const configNames = configurations.map(c => `${c.strategy}/${c.priority.replace('Priority', '')}`);
    console.log(`Running with ${configurations.length} configuration(s): ${configNames.join(', ')}`);
    if (denseDimArg || sparseKArg) {
      console.log(`Geometry: dense-dim=${denseDim}, sparse-k=${sparseK}`);
    }

    // Results by configuration (key = "strategy/priority")
    const resultsByConfig = {};

    // Run all suites for each configuration
    for (const config of configurations) {
      if (interrupted) break;

      const configKey = `${config.strategy}/${config.priority}`;

      console.log();
      console.log(`\x1b[1m\x1b[35m${'━'.repeat(80)}\x1b[0m`);
      console.log(`\x1b[1m\x1b[35mConfiguration: ${config.strategy} + ${config.priority}\x1b[0m`);
      console.log(`\x1b[35m${'━'.repeat(80)}\x1b[0m`);

      resultsByConfig[configKey] = [];

      for (const suiteName of suites) {
        if (interrupted) break;

        try {
          // Load suite data
          const suite = await loadSuite(suiteName);

          // Report header (shows Core theory stack)
          reportSuiteHeader(suite);

          // Run tests with specific configuration (strategy + priority + geometry)
          const { results, summary } = await runSuite(suite, {
            strategy: config.strategy,
            reasoningPriority: config.priority,
            geometry: config.geometry
          });

          // Report results
          reportCaseResults(suite.cases, results);
          reportSuiteSummary(summary, suite.cases);

          // Show failure details if verbose
          if (verbose) {
            for (let i = 0; i < results.length; i++) {
              reportFailureDetails(i, results[i]);
            }
          }

          resultsByConfig[configKey].push({
            name: suite.name,
            suiteName,
            results,
            summary,
            cases: suite.cases,
            strategyId: config.strategy,
            reasoningPriority: config.priority
          });

        } catch (err) {
          console.error(`\x1b[31mError running suite ${suiteName}: ${err.message}\x1b[0m`);
          if (verbose) {
            console.error(err.stack);
          }
        }
      }

      // Show summary for this configuration
      if (!interrupted && resultsByConfig[configKey].length > 0) {
        console.log();
        console.log(`\x1b[1m\x1b[35mConfiguration: ${configKey} - Summary\x1b[0m`);
        reportGlobalSummary(resultsByConfig[configKey]);
      }
    }

    // Multi-config comparison (if running multiple configs)
    if (!interrupted && configurations.length > 1) {
      // Convert to reportMultiStrategyComparison format (uses strategyId as key)
      reportMultiStrategyComparison(resultsByConfig);
    }

    // Exit code based on results
    const allPassed = Object.values(resultsByConfig).every(configResults =>
      configResults.every(s => s.summary.failed === 0)
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
