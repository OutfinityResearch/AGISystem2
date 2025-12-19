#!/usr/bin/env node
/**
 * AGISystem2 Performance Suite Runner
 *
 * Stress tests the system with large domain theories across
 * multiple HDC strategy configurations.
 *
 * Usage:
 *   node performance/run.js                          # Run all theories, all configs
 *   node performance/run.js math                     # Run specific theory
 *   node performance/run.js --strategy=dense-binary  # Specific strategy only
 *   node performance/run.js --priority=holographicPriority  # Specific priority
 *   node performance/run.js --verbose                # Show case details
 *   node performance/run.js --compare                # Compare all configs (default)
 *   node performance/run.js --quick                  # Run with 1 config only
 *
 * Configurations tested by default:
 *   - dense-binary/symbolicPriority
 *   - dense-binary/holographicPriority
 *   - sparse-polynomial/symbolicPriority
 *   - sparse-polynomial/holographicPriority
 *   - metric-affine/symbolicPriority
 *   - metric-affine/holographicPriority
 */

import { discoverTheories, loadTheory } from './lib/loader.mjs';
import { runTheory, runAllTheories } from './lib/runner.mjs';
import {
  reportTheoryHeader,
  reportTheoryResults,
  reportComparison,
  reportGlobalSummary
} from './lib/reporter.mjs';
import { listStrategies } from '../src/hdc/facade.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const quickMode = args.includes('--quick');

// Extract specific options
const strategyArg = args.find(a => a.startsWith('--strategy='));
const singleStrategy = strategyArg ? strategyArg.split('=')[1] : null;

const priorityArg = args.find(a => a.startsWith('--priority='));
const singlePriority = priorityArg ? priorityArg.split('=')[1] : null;

const specificTheories = args.filter(a => !a.startsWith('-') && !a.startsWith('--'));

// Track results for interrupt handler
let collectedResults = {};
let interrupted = false;

process.on('SIGINT', () => {
  interrupted = true;
  console.log('\n\n\x1b[33m⚠ Interrupted by user (Ctrl+C)\x1b[0m\n');

  if (Object.keys(collectedResults).length > 0) {
    reportGlobalSummary(collectedResults);
  }

  process.exit(130);
});

async function main() {
  console.log();
  console.log('\x1b[1m\x1b[34mAGISystem2 - Performance Suite\x1b[0m');
  console.log('\x1b[2mStress testing with large domain theories\x1b[0m');
  console.log();

  try {
    // Discover available theories
    let theories = await discoverTheories();

    if (theories.length === 0) {
      console.error('\x1b[31mNo theories found in performance/theories/\x1b[0m');
      console.log('\x1b[2mCreate theory folders with theory.dsl.txt and eval.mjs files.\x1b[0m');
      process.exit(1);
    }

    // Filter to specific theories if requested
    if (specificTheories.length > 0) {
      theories = theories.filter(t => specificTheories.some(arg => t.includes(arg)));

      if (theories.length === 0) {
        console.error(`\x1b[31mNo matching theories found for: ${specificTheories.join(', ')}\x1b[0m`);
        console.log(`\x1b[2mAvailable: ${(await discoverTheories()).join(', ')}\x1b[0m`);
        process.exit(1);
      }
    }

    console.log(`Found ${theories.length} theory domain(s): ${theories.join(', ')}`);

    // Load all theories
    const loadedTheories = [];
    for (const theoryName of theories) {
      if (interrupted) break;

      try {
        const theory = await loadTheory(theoryName);
        loadedTheories.push(theory);
        console.log(`  Loaded ${theoryName}: ${theory.factCount} facts, ${theory.cases.length} cases`);
      } catch (err) {
        console.error(`  \x1b[31mFailed to load ${theoryName}: ${err.message}\x1b[0m`);
      }
    }

    if (loadedTheories.length === 0) {
      console.error('\x1b[31mNo theories could be loaded!\x1b[0m');
      process.exit(1);
    }

    // Determine configurations to run
    const availableStrategies = listStrategies();
    const availablePriorities = [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

    let strategiesToRun, prioritiesToRun;

    if (singleStrategy) {
      if (!availableStrategies.includes(singleStrategy)) {
        console.error(`\x1b[31mUnknown strategy: ${singleStrategy}. Available: ${availableStrategies.join(', ')}\x1b[0m`);
        process.exit(1);
      }
      strategiesToRun = [singleStrategy];
    } else if (quickMode) {
      strategiesToRun = ['dense-binary'];
    } else {
      strategiesToRun = availableStrategies;
    }

    if (singlePriority) {
      if (!availablePriorities.includes(singlePriority)) {
        console.error(`\x1b[31mUnknown priority: ${singlePriority}. Available: ${availablePriorities.join(', ')}\x1b[0m`);
        process.exit(1);
      }
      prioritiesToRun = [singlePriority];
    } else if (quickMode) {
      prioritiesToRun = ['symbolicPriority'];
    } else {
      prioritiesToRun = availablePriorities;
    }

    // Build configurations
    const configurations = [];
    for (const strategy of strategiesToRun) {
      for (const priority of prioritiesToRun) {
        configurations.push({ strategy, priority });
      }
    }

    console.log(`Running ${configurations.length} configuration(s): ${configurations.map(c => `${c.strategy}/${c.priority.replace('Priority', '')}`).join(', ')}`);

    // Run all theories for each configuration
    for (const config of configurations) {
      if (interrupted) break;

      const configKey = `${config.strategy}/${config.priority}`;
      collectedResults[configKey] = [];

      console.log();
      console.log(`\x1b[1m\x1b[35m${'━'.repeat(80)}\x1b[0m`);
      console.log(`\x1b[1m\x1b[35mConfiguration: ${configKey}\x1b[0m`);
      console.log(`\x1b[35m${'━'.repeat(80)}\x1b[0m`);

      for (const theory of loadedTheories) {
        if (interrupted) break;

        reportTheoryHeader(theory);

        const result = await runTheory(theory, config);
        collectedResults[configKey].push(result);

        reportTheoryResults(result);
      }
    }

    // Final comparison and summary
    if (!interrupted && configurations.length > 1) {
      reportComparison(collectedResults);
    }

    reportGlobalSummary(collectedResults);

    // Exit code based on results
    const allPassed = Object.values(collectedResults).every(configResults =>
      configResults.every(r => r.summary.failed === 0)
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
