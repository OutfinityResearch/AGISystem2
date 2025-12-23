#!/usr/bin/env node
/**
 * RuleTaker Evaluation Runner
 *
 * Evaluates AGISystem2 reasoning capabilities using the RuleTaker benchmark
 * from Allen AI (https://github.com/allenai/ruletaker).
 *
 * Usage:
 *   node evals/runRuleTakerEval.mjs                    # Full test set
 *   node evals/runRuleTakerEval.mjs --fast             # Quick sample (100 examples)
 *   node evals/runRuleTakerEval.mjs --sample=1000      # Custom sample size
 *   node evals/runRuleTakerEval.mjs --depth=3          # Filter to depth-3 only
 *   node evals/runRuleTakerEval.mjs --strategy=sparse  # Single HDC strategy sweep
 *   node evals/runRuleTakerEval.mjs --split=dev        # Use dev split
 *   node evals/runRuleTakerEval.mjs --devel            # Development mode (stops at first error)
 *   node evals/runRuleTakerEval.mjs -v                 # Verbose: show NL question/answer per example
 *   node evals/runRuleTakerEval.mjs -p --jobs=4        # Parallel: run with 4 workers
 *
 * Geometry Parameters:
 *   --dense-dim=N   Dense binary vector dimension (default: 256)
 *   --sparse-k=N    Sparse polynomial exponent count (default: 2)
 *   --metric-dim=N  Metric affine byte channels (default: 16)
 *
 * Parallel Execution:
 *   -p, --parallel  Run evaluation with multiple worker processes
 *   --jobs=N        Number of parallel workers (default: min(4, cpus))
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';

import { loadExamples, extractDepth } from './ruletaker/lib/dataset-loader.mjs';
import { translateExample, resetRefCounter } from './ruletaker/lib/translator.mjs';
import {
  formatDuration,
  configLabel,
  reportHeader,
  reportDatasetInfo,
  reportConfiguration,
  reportProgress,
  reportExampleResult,
  reportExampleNL,
  reportSummary,
  reportDepthBreakdown,
  reportFailureDiagnostics,
  reportMultiStrategyComparison,
  reportFinalStatus
} from './ruletaker/lib/reporter.mjs';

import { Session } from '../src/runtime/session.mjs';
import { listStrategies } from '../src/hdc/facade.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');

// Strategy geometry configurations for sweep mode
const STRATEGY_GEOMETRIES = {
  'dense': [128, 256, 512, 1024, 2048, 4096],
  'sparse': [1, 2, 3, 4, 5, 6],
  'metric': [8, 16, 32, 64, 128, 256]
};

const STRATEGY_FULL_NAMES = {
  'dense': 'dense-binary',
  'sparse': 'sparse-polynomial',
  'metric': 'metric-affine'
};

// Default geometries for each strategy
const DEFAULT_GEOMETRIES = {
  'dense-binary': 256,
  'sparse-polynomial': 2,
  'metric-affine': 16
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`${name}=`));
    return arg ? arg.split('=')[1] : null;
  };

  const getIntArg = (name, defaultVal) => {
    const val = getArg(name);
    return val ? parseInt(val, 10) : defaultVal;
  };

  return {
    // Dataset options
    split: getArg('--split') || 'test',
    sample: args.includes('--fast') ? 100 : getIntArg('--sample', null),
    depth: getIntArg('--depth', undefined),
    seed: getIntArg('--seed', 42),

    // Strategy options
    strategy: getArg('--strategy'),
    priority: getArg('--priority'),

    // Geometry overrides
    denseDim: getIntArg('--dense-dim', 256),
    sparseK: getIntArg('--sparse-k', 2),
    metricDim: getIntArg('--metric-dim', 16),

    // Mode flags
    fast: args.includes('--fast'),
    devel: args.includes('--devel'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    full: args.includes('--full'),

    // Parallel execution
    jobs: getIntArg('--jobs', Math.max(1, Math.min(4, os.cpus().length))),
    parallel: args.includes('--parallel') || args.includes('-p'),

    // Worker mode (internal)
    isWorker: args.includes('--worker'),
    workerConfig: getArg('--config'),
    workerOut: getArg('--out')
  };
}

/**
 * Build configuration list based on arguments
 */
function buildConfigurations(args) {
  const configurations = [];

  // Single priority or both
  const priorities = args.priority
    ? [args.priority.includes('holo') ? REASONING_PRIORITY.HOLOGRAPHIC : REASONING_PRIORITY.SYMBOLIC]
    : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

  if (args.fast && !args.strategy) {
    // --fast alone: single quick config
    configurations.push({
      strategy: 'dense-binary',
      priority: REASONING_PRIORITY.HOLOGRAPHIC,
      geometry: 256
    });
  } else if (args.strategy) {
    // --strategy=X: sweep all geometries for that strategy
    const shortName = args.strategy.toLowerCase();
    const fullName = STRATEGY_FULL_NAMES[shortName] || args.strategy;
    const geometries = STRATEGY_GEOMETRIES[shortName];

    if (!geometries) {
      console.error(`Unknown strategy: ${args.strategy}. Available: dense, sparse, metric`);
      process.exit(1);
    }

    if (args.fast) {
      // --strategy=X --fast: single geometry
      const defaultGeometry = geometries[Math.floor(geometries.length / 2)];
      configurations.push({
        strategy: fullName,
        priority: REASONING_PRIORITY.HOLOGRAPHIC,
        geometry: defaultGeometry
      });
    } else {
      // --strategy=X: all geometries × priorities
      for (const geometry of geometries) {
        for (const priority of priorities) {
          configurations.push({ strategy: fullName, priority, geometry });
        }
      }
    }
  } else {
    // Default: all strategies with default geometries
    const strategies = listStrategies();
    for (const strategy of strategies) {
      for (const priority of priorities) {
        const geometry = DEFAULT_GEOMETRIES[strategy] ||
          (strategy === 'sparse-polynomial' ? args.sparseK :
           strategy === 'metric-affine' ? args.metricDim : args.denseDim);
        configurations.push({ strategy, priority, geometry });
      }
    }
  }

  return configurations;
}

/**
 * Load Core theories into session
 */
function loadCoreTheories(session) {
  const corePath = join(CONFIG_ROOT, 'Core');
  if (!fs.existsSync(corePath)) {
    return 0;
  }

  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  let loaded = 0;
  for (const file of files) {
    const content = fs.readFileSync(join(corePath, file), 'utf8');
    try {
      const res = session.learn(content);
      if (res.success !== false) loaded++;
    } catch (err) {
      // Skip failed loads
    }
  }
  return loaded;
}

/**
 * Load RuleTaker-specific theory (operators and types)
 */
function loadRuleTakerTheory(session) {
  const theoryPath = join(__dirname, 'ruletaker', 'ruletaker-theory.sys2');
  if (!fs.existsSync(theoryPath)) {
    console.warn('RuleTaker theory not found:', theoryPath);
    return false;
  }

  try {
    const content = fs.readFileSync(theoryPath, 'utf8');
    const res = session.learn(content);
    return res.success !== false;
  } catch (err) {
    console.warn('Failed to load RuleTaker theory:', err.message);
    return false;
  }
}

/**
 * Create fresh session with configuration
 */
function createSession(config) {
  const session = new Session({
    hdcStrategy: config.strategy,
    geometry: config.geometry,
    reasoningPriority: config.priority,
    reasoningProfile: 'theoryDriven',
    closedWorldAssumption: true,
    rejectContradictions: false // Be lenient for external dataset
  });

  // Load Core theories
  loadCoreTheories(session);

  // Load RuleTaker-specific operators and types
  loadRuleTakerTheory(session);

  return session;
}

/**
 * Run a single example
 */
function runExample(session, example) {
  const startTime = performance.now();

  // Translate the example
  resetRefCounter();
  const translated = translateExample(example);

  // If translation failed
  if (!translated.contextDsl || !translated.questionDsl) {
    return {
      correct: false,
      proved: false,
      error: 'Translation failed',
      durationMs: performance.now() - startTime,
      depth: translated.depth,
      translated
    };
  }

  try {
    // Create a fresh session for each example (isolated KB)
    // Learn the context
    session.learn(translated.contextDsl);

    // Try to prove the question
    const proveResult = session.prove(translated.questionDsl, { timeout: 2000 });

    const proved = proveResult?.valid === true;
    const correct = (proved === translated.expectProved);

    return {
      correct,
      proved,
      proof: proveResult?.proof,
      durationMs: performance.now() - startTime,
      depth: translated.depth,
      translated
    };
  } catch (err) {
    return {
      correct: false,
      proved: false,
      error: err.message,
      durationMs: performance.now() - startTime,
      depth: translated.depth,
      translated
    };
  }
}

/**
 * Run evaluation for a single configuration
 */
async function runConfiguration(examples, config, args) {
  const label = configLabel(config.strategy, config.geometry, config.priority);
  reportConfiguration(label);

  const results = [];
  const startTime = performance.now();
  let correctCount = 0;

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];

    // Create fresh session for each example
    const session = createSession(config);

    const result = runExample(session, example);
    result.index = i;

    results.push(result);
    if (result.correct) correctCount++;

    // Progress reporting
    if (args.devel) {
      reportExampleResult(i, examples.length, result.correct, result.durationMs);

      // In devel mode, stop at first failure
      if (!result.correct) {
        reportFailureDiagnostics(result, result.translated);
        console.log(`${'\x1b[33m'}Stopping at first failure. Fix the issue and re-run.${'\x1b[0m'}`);
        console.log(`Total runtime: ${formatDuration(performance.now() - startTime)} (${i + 1} examples processed)`);
        break;
      }
    } else if (args.verbose) {
      // Verbose mode: show NL problem/answer for each example
      reportExampleNL(i, examples.length, example, result.proved, result.correct, result.durationMs);
    } else {
      // Normal progress
      if ((i + 1) % 10 === 0 || i === examples.length - 1) {
        reportProgress(i + 1, examples.length, correctCount, performance.now() - startTime);
      }
    }
  }

  if (!args.devel) {
    console.log(); // Clear progress line
  }

  const totalDuration = performance.now() - startTime;
  reportSummary(results, totalDuration);
  reportDepthBreakdown(results, examples);

  return results;
}

/**
 * Run as worker process (internal)
 */
async function workerMain(args) {
  const configJson = Buffer.from(args.workerConfig, 'base64url').toString('utf8');
  const config = JSON.parse(configJson);

  // Load examples
  const examples = await loadExamples(config.split, {
    limit: config.sample,
    depthFilter: config.depth,
    randomSeed: config.seed
  });

  // Partition examples for this worker
  const workerExamples = [];
  for (let i = config.startIdx; i < Math.min(config.endIdx, examples.length); i++) {
    workerExamples.push({ ...examples[i], originalIndex: i });
  }

  // Run evaluation
  const label = configLabel(config.strategy, config.geometry, config.priority);
  const results = [];
  let correctCount = 0;

  for (let i = 0; i < workerExamples.length; i++) {
    const example = workerExamples[i];
    const session = createSession({
      strategy: config.strategy,
      geometry: config.geometry,
      priority: config.priority
    });

    const result = runExample(session, example);
    result.index = example.originalIndex;
    results.push(result);
    if (result.correct) correctCount++;

    // Output progress to stderr for parent to display
    const statusIcon = result.correct ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const expectedStr = example.label === 'entailment' ? 'PROVE' : 'NOT PROVE';
    const actualStr = result.proved ? 'PROVED' : 'NOT PROVED';
    console.error(`${statusIcon} \x1b[2m#${String(example.originalIndex + 1).padStart(4)}\x1b[0m \x1b[36mQ:\x1b[0m "${example.question}" \x1b[2m| expect:${expectedStr} got:${actualStr} | ${formatDuration(result.durationMs)}\x1b[0m`);
  }

  // Write results to output file
  const payload = {
    label,
    results,
    correct: correctCount,
    total: workerExamples.length
  };
  fs.writeFileSync(args.workerOut, JSON.stringify(payload), 'utf8');
}

/**
 * Run examples in parallel across multiple workers
 */
async function runParallel(examples, config, args) {
  const numWorkers = Math.min(args.jobs, examples.length);
  const label = configLabel(config.strategy, config.geometry, config.priority);

  console.log(`\n\x1b[1m\x1b[44m Parallel Execution: ${numWorkers} workers \x1b[0m\n`);
  reportConfiguration(label);

  const scriptPath = fileURLToPath(import.meta.url);
  const tmpDir = join(ROOT, 'evals', '.tmp-ruletaker-eval');
  fs.mkdirSync(tmpDir, { recursive: true });

  // Partition examples among workers
  const chunkSize = Math.ceil(examples.length / numWorkers);
  const workers = [];

  for (let w = 0; w < numWorkers; w++) {
    const startIdx = w * chunkSize;
    const endIdx = Math.min((w + 1) * chunkSize, examples.length);
    if (startIdx >= examples.length) break;

    const outPath = join(tmpDir, `result.${Date.now()}.${w}.json`);
    const workerConfig = {
      strategy: config.strategy,
      geometry: config.geometry,
      priority: config.priority,
      split: args.split,
      sample: args.sample,
      depth: args.depth,
      seed: args.seed,
      startIdx,
      endIdx
    };

    const configB64 = Buffer.from(JSON.stringify(workerConfig), 'utf8').toString('base64url');
    const child = spawn(process.execPath, [
      scriptPath,
      '--worker',
      `--config=${configB64}`,
      `--out=${outPath}`
    ], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Forward stderr (progress output) to parent's stderr
    child.stderr.pipe(process.stderr);

    workers.push(new Promise((resolve, reject) => {
      child.on('close', code => {
        try {
          const raw = fs.readFileSync(outPath, 'utf8');
          fs.rmSync(outPath, { force: true });
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Worker ${w} failed: ${err.message}`));
        }
      });
      child.on('error', reject);
    }));
  }

  // Wait for all workers
  const workerResults = await Promise.all(workers);

  // Merge results
  const allResults = [];
  let totalCorrect = 0;
  for (const wr of workerResults) {
    allResults.push(...wr.results);
    totalCorrect += wr.correct;
  }

  // Sort by original index
  allResults.sort((a, b) => a.index - b.index);

  return { results: allResults, correct: totalCorrect };
}

/**
 * Main entry point
 */
async function main() {
  const rawArgs = process.argv.slice(2);

  // Help
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    console.log(`
RuleTaker Evaluation Runner

Evaluates AGISystem2 reasoning capabilities using the RuleTaker benchmark
from Allen AI (https://github.com/allenai/ruletaker).

Usage:
  node evals/runRuleTakerEval.mjs [options]

Options:
  --help, -h              Show this help message
  --fast                  Quick sample (100 examples, single config)
  --sample=N              Custom sample size
  --depth=N               Filter to specific reasoning depth (0-5)
  --split=NAME            Dataset split: train, dev, test (default: test)
  --seed=N                Random seed for sampling (default: 42)
  --devel                 Development mode: stops at first error with diagnostics
  --verbose, -v           Show NL question/answer for each example
  --parallel, -p          Run with multiple worker processes
  --jobs=N                Number of parallel workers (default: min(4, cpus))

Strategy Options:
  --strategy=NAME         Run single strategy with all geometries
                          NAME: dense, sparse, metric
  --priority=NAME         Run with specific reasoning priority
                          NAME: symbolicPriority, holographicPriority

Geometry Parameters:
  --dense-dim=N           Dense binary vector dimension (default: 256)
  --sparse-k=N            Sparse polynomial exponent count (default: 2)
  --metric-dim=N          Metric affine byte channels (default: 16)

Strategy Mode (runs single strategy with multiple geometries):
  --strategy=dense        Dense: 128, 256, 512, 1024, 2048, 4096 bits
  --strategy=sparse       Sparse: k=1, 2, 3, 4, 5, 6
  --strategy=metric       Metric: 8, 16, 32, 64, 128, 256 bytes

Examples:
  node evals/runRuleTakerEval.mjs                    # Full test set
  node evals/runRuleTakerEval.mjs --fast             # Quick sample (100 examples)
  node evals/runRuleTakerEval.mjs --sample=1000      # Custom sample size
  node evals/runRuleTakerEval.mjs --depth=3          # Only depth-3 problems
  node evals/runRuleTakerEval.mjs --strategy=sparse  # Sparse strategy sweep
  node evals/runRuleTakerEval.mjs --devel            # Stop at first failure
  node evals/runRuleTakerEval.mjs -p --jobs=4        # Parallel with 4 workers
`);
    process.exit(0);
  }

  const args = parseArgs();

  // Worker mode
  if (args.isWorker) {
    await workerMain(args);
    return;
  }

  reportHeader(args.devel);

  // Download progress callback
  const progressCallback = ({ phase, downloaded, total, split }) => {
    if (phase === 'start') {
      console.log(`Downloading ${split} split (${total} examples)...`);
    } else if (phase === 'progress') {
      const pct = ((downloaded / total) * 100).toFixed(0);
      process.stdout.write(`\r  Downloaded: ${downloaded}/${total} (${pct}%)`);
    } else if (phase === 'done') {
      console.log(`\r  Downloaded: ${total}/${total} (100%) - done`);
    }
  };

  // Load examples
  let examples;
  try {
    examples = await loadExamples(args.split, {
      limit: args.sample,
      depthFilter: args.depth,
      randomSeed: args.seed,
      progressCallback
    });
  } catch (err) {
    console.error(`Failed to load dataset: ${err.message}`);
    if (args.verbose) console.error(err.stack);
    process.exit(1);
  }

  const totalInSplit = examples.length; // After filtering
  reportDatasetInfo(args.split, totalInSplit, examples.length, args.depth);

  // Build configurations
  const configurations = buildConfigurations(args);
  const configNames = configurations.map(c => configLabel(c.strategy, c.geometry, c.priority));
  console.log(`Running ${configurations.length} configuration(s): ${configNames.join(', ')}`);

  // Run evaluations
  const allResults = {};
  const overallStart = performance.now();

  for (const config of configurations) {
    const label = configLabel(config.strategy, config.geometry, config.priority);

    let results;
    if (args.parallel && !args.devel) {
      // Parallel execution mode
      const { results: parallelResults } = await runParallel(examples, config, args);
      results = parallelResults;

      // Display summary for parallel run
      const totalDuration = performance.now() - overallStart;
      reportSummary(results, totalDuration);
      reportDepthBreakdown(results, examples);
    } else {
      // Sequential execution
      results = await runConfiguration(examples, config, args);
    }
    allResults[label] = results;

    // In devel mode, stop after first config if there was a failure
    if (args.devel && results.some(r => !r.correct)) {
      break;
    }
  }

  // Multi-strategy comparison
  if (configurations.length > 1 && !args.devel) {
    reportMultiStrategyComparison(allResults);
  }

  // Final summary
  const overallDuration = performance.now() - overallStart;
  const firstResults = Object.values(allResults)[0] || [];
  const totalCorrect = firstResults.filter(r => r.correct).length;
  const totalExamples = firstResults.length;
  const accuracy = totalExamples > 0 ? ((totalCorrect / totalExamples) * 100).toFixed(1) : '0.0';

  reportFinalStatus(
    totalCorrect === totalExamples,
    `Overall: ${totalCorrect}/${totalExamples} correct (${accuracy}%) in ${formatDuration(overallDuration)}`
  );

  // Exit code
  const allPassed = Object.values(allResults).every(results =>
    results.every(r => r.correct)
  );
  process.exit(allPassed ? 0 : 1);
}

// Export for use by runAllEvals.mjs
export { main as runRuleTakerEval };

// Run if executed directly
main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
