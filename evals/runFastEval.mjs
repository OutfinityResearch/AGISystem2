#!/usr/bin/env node
/**
 * Fast Evaluation Suite Runner
 *
 * Run evaluation suites to test NL->DSL transformation and reasoning.
 *
 * Usage:
 *   node evals/runFastEval.mjs                           # Run all suites with 6 configs (summary only)
 *   node evals/runFastEval.mjs suite01                   # Run specific suite
 *   node evals/runFastEval.mjs --details                 # Show per-case results
 *   node evals/runFastEval.mjs --verbose                 # Show failure details
 *   node evals/runFastEval.mjs --full                    # Run with 16 configurations (4 strategies × 2 priorities × 2 geometries)
 *   node evals/runFastEval.mjs --priority=holographicPriority  # Run with specific reasoning priority
 *
 * Strategy Mode (runs single strategy with multiple geometries):
 *   node evals/runFastEval.mjs --strategy=dense          # Dense: 128, 256, 512, 1024, 2048, 4096 bits
 *   node evals/runFastEval.mjs --strategy=sparse         # Sparse: k=1, 2, 3, 5, 8, 13
 *   node evals/runFastEval.mjs --strategy=metric         # Metric: 8, 16, 32, 64, 128, 256 bytes
 *   node evals/runFastEval.mjs --strategy=ema            # EMA: 8, 16, 32, 64, 128, 256 bytes
 *   node evals/runFastEval.mjs --strategy=exact          # EXACT: 256 (placeholder; geometry ignored)
 *   node evals/runFastEval.mjs --small                   # Use 8-byte equivalents for all strategies
 *   node evals/runFastEval.mjs --big                     # Use 32-byte equivalents for all strategies
 *   node evals/runFastEval.mjs --huge                    # Use 128-byte equivalents for all strategies
 *
 * Geometry Parameters (for default mode):
 *   --dense-dim=N   Dense binary vector dimension (default: 256)
 *   --sparse-k=N    Sparse polynomial exponent count (default: 2)
 *   --metric-dim=N  Metric affine byte channels (default: 16)
 *
 * Configurations:
 *   HDC Strategies: dense-binary, sparse-polynomial, metric-affine, metric-affine-elastic
 *   Reasoning Priorities: symbolicPriority, holographicPriority
 */

import { discoverSuites, loadSuite } from './fastEval/lib/loader.mjs';
import { runSuite } from './fastEval/lib/runner.mjs';
import {
  reportSuiteHeader,
  reportCaseResults,
  reportSuiteSummary,
  reportFailureDetails,
  reportFailureComparisons,
  reportGlobalSummary,
  reportMultiStrategyComparison
} from './fastEval/lib/reporter.mjs';
import { listStrategies } from '../src/hdc/facade.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

// Strategy geometry configurations
const STRATEGY_GEOMETRIES = {
  'dense': [128, 256, 512, 1024, 2048, 4096],       // bits
  'sparse': [1, 2, 3, 4, 5, 6],                      // k exponents
  'metric': [8, 16, 32, 64, 128, 256],               // bytes
  'ema': [8, 16, 32, 64, 128, 256],                  // bytes
  'exact': [256]                                     // placeholder (geometry ignored by EXACT)
};

const STRATEGY_FULL_NAMES = {
  'dense': 'dense-binary',
  'sparse': 'sparse-polynomial',
  'metric': 'metric-affine',
  'ema': 'metric-affine-elastic',
  'exact': 'exact'
};

// Short display names for compact output
function shortStrategy(s) {
  return s.replace('-binary', '').replace('-polynomial', '').replace('-affine', '');
}

function shortPriority(p) {
  if (!p) return '';
  return p.replace('symbolicPriority', 'symb').replace('holographicPriority', 'holo').replace('Priority', '');
}

function configLabel(strategy, geometry, priority, exactUnbindMode = null) {
  const s = shortStrategy(strategy);
  if (strategy === 'exact') {
    const mode = String(exactUnbindMode || process.env.SYS2_EXACT_UNBIND_MODE || 'A').trim().toUpperCase();
    return `${s}(${mode})+${shortPriority(priority)}`;
  }
  if (strategy === 'dense-binary') {
    const bytes = Number.isFinite(geometry) ? Math.ceil(geometry / 8) : geometry;
    return `${s}(${bytes}B)+${shortPriority(priority)}`;
  }
  if (strategy === 'sparse-polynomial') return `${s}(k${geometry})+${shortPriority(priority)}`;
  // metric-affine + metric-affine-elastic geometries are byte channels
  if (strategy === 'metric-affine' || strategy === 'metric-affine-elastic') {
    return `${s}(${geometry}B)+${shortPriority(priority)}`;
  }
  return `${s}(${geometry})+${shortPriority(priority)}`;
}

// Parse command line arguments
const args = process.argv.slice(2);

// Help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Fast Evaluation Suite Runner

Usage:
  node evals/runFastEval.mjs [suite] [options]

Options:
  --help, -h              Show this help message
  --details, -d           Show per-case results
  --verbose, -v           Show failure details
  --fast                  Quick run with single config
  --full                  Run with 16 configurations (4 strategies × 2 priorities × 2 geometries)
  --small                 Use 8-byte equivalents for all strategies (dense=64b, sparse=k1, metric=8B, ema=8B)
  --big                   Use 32-byte equivalents for all strategies (dense=256b, sparse=k4, metric=32B, ema=32B)
  --huge                  Use 128-byte equivalents for all strategies (dense=1024b, sparse=k16, metric=128B, ema=128B)
  --strategy=NAME         Run single strategy with multiple geometries
                          NAME: dense, sparse, metric, ema, exact
  --priority=NAME         Run with specific reasoning priority
                          NAME: symbolicPriority, holographicPriority

Geometry Parameters:
  --dense-dim=N           Dense binary vector dimension (default: 256)
  --sparse-k=N            Sparse polynomial exponent count (default: 2)
  --metric-dim=N          Metric affine byte channels (default: 16)

Examples:
  node evals/runFastEval.mjs                     # Run all suites with 6 configs
  node evals/runFastEval.mjs suite01             # Run specific suite
  node evals/runFastEval.mjs --strategy=dense    # Dense: 128, 256, 512, 1024, 2048, 4096 bits
  node evals/runFastEval.mjs --strategy=exact    # EXACT (placeholder geometry)
  node evals/runFastEval.mjs --small             # 8-byte equivalents across strategies
  node evals/runFastEval.mjs --big               # 32-byte equivalents across strategies
  node evals/runFastEval.mjs --huge              # 128-byte equivalents across strategies
  node evals/runFastEval.mjs --details           # Show per-case results
  node evals/runFastEval.mjs --verbose           # Show failure details
`);
  process.exit(0);
}

const details = args.includes('--details') || args.includes('-d');
const verbose = args.includes('--verbose') || args.includes('-v');
const showDetails = details || verbose;
const fullModes = args.includes('--full');
const fastMode = args.includes('--fast');
const smallMode = args.includes('--small');
const bigMode = args.includes('--big');
const hugeMode = args.includes('--huge');

const knownFlags = new Set([
  '--details', '-d',
  '--verbose', '-v',
  '--fast',
  '--full',
  '--small',
  '--big',
  '--huge',
  '--help', '-h'
]);
const knownPrefixes = [
  '--strategy=',
  '--priority=',
  '--dense-dim=',
  '--sparse-k=',
  '--metric-dim='
];

for (const arg of args) {
  if (!arg.startsWith('-')) continue;
  if (knownFlags.has(arg)) continue;
  if (knownPrefixes.some(prefix => arg.startsWith(prefix))) continue;
  console.error(`\x1b[31mUnknown option: ${arg}\x1b[0m`);
  process.exit(1);
}

if ((smallMode && bigMode) || (smallMode && hugeMode) || (bigMode && hugeMode)) {
  console.error('\x1b[31mCannot combine --small, --big, or --huge.\x1b[0m');
  process.exit(1);
}

// Extract specific strategy if provided (for geometry sweep mode)
const strategyArg = args.find(a => a.startsWith('--strategy='));
const singleStrategy = strategyArg ? strategyArg.split('=')[1] : null;

// Extract specific reasoning priority if provided
const priorityArg = args.find(a => a.startsWith('--priority='));
const singlePriority = priorityArg ? priorityArg.split('=')[1] : null;

// Extract geometry parameters (for default mode)
const denseDimArg = args.find(a => a.startsWith('--dense-dim='));
const sparseKArg = args.find(a => a.startsWith('--sparse-k='));
const metricDimArg = args.find(a => a.startsWith('--metric-dim='));

let denseDim = 256;
let sparseK = 2;
let metricDim = 16;
let elasticDim = metricDim;

if (smallMode) {
  denseDim = 64;   // 8 bytes
  sparseK = 1;     // 8 bytes (1 BigInt)
  metricDim = 8;   // 8 bytes
}
if (bigMode) {
  denseDim = 256;  // 32 bytes
  sparseK = 4;     // 32 bytes (4 BigInt)
  metricDim = 32;  // 32 bytes
}
if (hugeMode) {
  denseDim = 1024; // 128 bytes
  sparseK = 16;    // 128 bytes (16 BigInt)
  metricDim = 128; // 128 bytes
}

if (denseDimArg) denseDim = parseInt(denseDimArg.split('=')[1], 10);
if (sparseKArg) sparseK = parseInt(sparseKArg.split('=')[1], 10);
if (metricDimArg) metricDim = parseInt(metricDimArg.split('=')[1], 10);
elasticDim = metricDim;

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
  const startTime = performance.now();

  console.log();
  console.log('\x1b[1m\x1b[34mAGISystem2 - Fast Evaluation Suite\x1b[0m');
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

    // Build configurations based on mode
    const configurations = [];

    // --fast alone: single quick test
    if (fastMode && !singleStrategy) {
      configurations.push({
        strategy: 'dense-binary',
        priority: REASONING_PRIORITY.HOLOGRAPHIC,
        geometry: 256
      });
      console.log('Fast mode: single config (dense/256/holo)');
    } else if (singleStrategy) {
      // --strategy=X: single strategy with ALL geometries (sweep mode)
      const shortName = singleStrategy.toLowerCase();
      const fullName = STRATEGY_FULL_NAMES[shortName] || singleStrategy;
      const allGeometries = STRATEGY_GEOMETRIES[shortName];

      if (!allGeometries) {
        console.error(`\x1b[31mUnknown strategy: ${singleStrategy}. Available: dense, sparse, metric, ema, exact\x1b[0m`);
        process.exit(1);
      }

      // --strategy=X --fast: single geometry for quick test of that strategy
      if (fastMode) {
        // Prefer starting-point geometry (especially for EMA/metric-elastic: 8 bytes = 64 bits).
        const defaultGeometry = fullName === 'metric-affine-elastic'
          ? allGeometries[0]
          : allGeometries[Math.floor(allGeometries.length / 2)]; // middle geometry
        if (fullName === 'exact') {
          configurations.push({ strategy: fullName, priority: REASONING_PRIORITY.HOLOGRAPHIC, geometry: defaultGeometry, exactUnbindMode: 'A' });
          configurations.push({ strategy: fullName, priority: REASONING_PRIORITY.HOLOGRAPHIC, geometry: defaultGeometry, exactUnbindMode: 'B' });
          console.log(`Fast mode: configs (${fullName}/A/holographic), (${fullName}/B/holographic)`);
        } else {
          configurations.push({
            strategy: fullName,
            priority: REASONING_PRIORITY.HOLOGRAPHIC,
            geometry: defaultGeometry
          });
          console.log(`Fast mode: single config (${fullName}/${defaultGeometry}/holographic)`);
        }
      } else {
        // --strategy=X: all geometries for that strategy
        const priorities = singlePriority
          ? [singlePriority]
          : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

        for (const geometry of allGeometries) {
          for (const priority of priorities) {
            if (fullName === 'exact') {
              configurations.push({ strategy: fullName, priority, geometry, exactUnbindMode: 'A' });
              configurations.push({ strategy: fullName, priority, geometry, exactUnbindMode: 'B' });
            } else {
              configurations.push({ strategy: fullName, priority, geometry });
            }
          }
        }
        console.log(`Strategy sweep mode: ${fullName} with geometries ${allGeometries.join(', ')}`);
      }
    } else {
      // Default mode: all strategies with configured geometries
      const availableStrategies = listStrategies();
      const priorities = singlePriority
        ? [singlePriority]
        : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

      for (const strategy of availableStrategies) {
        for (const priority of priorities) {
          const geometries = [];
          if (strategy === 'sparse-polynomial') {
            geometries.push(sparseK);
            if (fullModes) geometries.push(sparseK * 2);
          } else if (strategy === 'exact') {
            // EXACT geometry is a placeholder; still run both UNBIND modes (A/B) for comparison.
            geometries.push(denseDim);
          } else if (strategy === 'metric-affine') {
            geometries.push(metricDim);
            if (fullModes) geometries.push(metricDim * 2);
          } else if (strategy === 'metric-affine-elastic') {
            // metric-elastic geometry is BYTES; start at base elastic geometry
            geometries.push(elasticDim);
            if (fullModes) geometries.push(elasticDim * 2);
          } else {
            geometries.push(denseDim);
            if (fullModes) geometries.push(denseDim * 2);
          }
          for (const geometry of geometries) {
            if (strategy === 'exact') {
              configurations.push({ strategy, priority, geometry, exactUnbindMode: 'A' });
              configurations.push({ strategy, priority, geometry, exactUnbindMode: 'B' });
            } else {
              configurations.push({ strategy, priority, geometry });
            }
          }
        }
      }
    }

    // Sort configurations
    const strategyOrder = ['dense-binary', 'sparse-polynomial', 'metric-affine', 'metric-affine-elastic', 'exact'];
    const priorityOrder = [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];
    const modeOrder = ['A', 'B'];
    configurations.sort((a, b) => {
      const aIdx = strategyOrder.includes(a.strategy) ? strategyOrder.indexOf(a.strategy) : strategyOrder.length;
      const bIdx = strategyOrder.includes(b.strategy) ? strategyOrder.indexOf(b.strategy) : strategyOrder.length;
      const strategyDiff = aIdx - bIdx;
      if (strategyDiff !== 0) return strategyDiff;
      if (a.strategy === 'exact' && b.strategy === 'exact') {
        const am = String(a.exactUnbindMode || 'A').toUpperCase();
        const bm = String(b.exactUnbindMode || 'A').toUpperCase();
        const md = modeOrder.indexOf(am) - modeOrder.indexOf(bm);
        if (md !== 0) return md;
      }
      const geometryDiff = a.geometry - b.geometry;
      if (geometryDiff !== 0) return geometryDiff;
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });

    const configNames = configurations.map(c => configLabel(c.strategy, c.geometry, c.priority, c.exactUnbindMode));
    console.log(`Running ${configurations.length} config(s): ${configNames.join(', ')}`);

    // Results by configuration (key = "strategy/geometry/priority")
    const resultsByConfig = {};

    // Run all suites for each configuration
    for (const config of configurations) {
      if (interrupted) break;

      const configKey = config.strategy === 'exact'
        ? `${config.strategy}/${String(config.exactUnbindMode || 'A').toUpperCase()}/${config.priority}`
        : `${config.strategy}/${config.geometry}/${config.priority}`;

      console.log();
      console.log(`\x1b[1m\x1b[35m${'━'.repeat(80)}\x1b[0m`);
      console.log(`\x1b[1m\x1b[35mConfiguration: ${configLabel(config.strategy, config.geometry, config.priority, config.exactUnbindMode)}\x1b[0m`);
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
            geometry: config.geometry,
            ...(config.strategy === 'exact' && config.exactUnbindMode ? { exactUnbindMode: config.exactUnbindMode } : null)
          });

          // Report results
          if (showDetails) {
            reportCaseResults(suite.cases, results);
          }
          reportSuiteSummary(summary, suite.cases);
          if (showDetails && summary.failed > 0) {
            reportFailureComparisons(suite.cases, results, {
              suiteName,
              strategyId: config.strategy,
              reasoningPriority: config.priority
            });
          }

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
            reasoningPriority: config.priority,
            geometry: config.geometry
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
        console.log(`\x1b[1m\x1b[35m${configLabel(config.strategy, config.geometry, config.priority, config.exactUnbindMode)} - Summary\x1b[0m`);
        reportGlobalSummary(resultsByConfig[configKey]);
      }
    }

    // Multi-config comparison (if running multiple configs)
    if (!interrupted && configurations.length > 1) {
      reportMultiStrategyComparison(resultsByConfig);
    }

    // Performance summary
    const totalDuration = performance.now() - startTime;
    console.log();
    console.log(`\x1b[1m\x1b[36mTotal execution time: ${(totalDuration / 1000).toFixed(2)}s\x1b[0m`);

    // Exit code based on results
    const allPassed = Object.values(resultsByConfig).every(configResults =>
      configResults.every(s => s.summary.failed === 0)
    );

    return { success: allPassed, resultsByConfig, durationMs: totalDuration };

  } catch (err) {
    console.error(`\x1b[31mFatal error: ${err.message}\x1b[0m`);
    if (verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// Export for use by runAllEvals.mjs
export { main as runFastEval };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}
