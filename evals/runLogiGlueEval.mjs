#!/usr/bin/env node
/**
 * Multi-Source Reasoning Evaluation Runner (LogiGLUE)
 *
 * Evaluates AGISystem2 reasoning using multiple benchmarks:
 * - FOLIO (First-Order Logic)
 * - LogiQA (Civil Service Exam)
 * - LogicNLI (Natural Language Inference)
 * - ProntoQA (Proof chains)
 * - RuleTaker (Rule-based reasoning)
 * - CLUTRR (Relational reasoning)
 * - ReClor (Reading comprehension)
 * - And more from logi_glue
 *
 * Usage:
 *   node evals/runLogiGlueEval.mjs                     # Full test (random from all sources)
 *   node evals/runLogiGlueEval.mjs --fast              # Quick sample (100 examples)
 *   node evals/runLogiGlueEval.mjs --sample=500        # Custom sample size
 *   node evals/runLogiGlueEval.mjs --sources=folio,logiqa  # Specific sources only
 *   node evals/runLogiGlueEval.mjs --strategy=sparse   # Single HDC strategy sweep
 *   node evals/runLogiGlueEval.mjs --list-sources      # Show available sources
 *   node evals/runLogiGlueEval.mjs --verbose           # Show per-example details
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';

import { loadExamples, listAvailableSubsets, getCacheStatus, DATASET_SOURCES } from './logiglue/lib/dataset-loader.mjs';
import { translateExample, resetRefCounter } from './logiglue/lib/translator.mjs';

import { Session } from '../src/runtime/session.mjs';
import { listStrategies } from '../src/hdc/facade.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m'
};

// Strategy geometry configurations
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

const DEFAULT_GEOMETRIES = {
  'dense-binary': 256,
  'sparse-polynomial': 2,
  'metric-affine': 16
};

/**
 * Seeded shuffle for parallel workers
 */
function seededShuffle(arr, seed) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

function configLabel(strategy, geometry, priority) {
  const s = strategy.replace('-binary', '').replace('-polynomial', '').replace('-affine', '');
  const p = priority.replace('symbolicPriority', 'symb').replace('holographicPriority', 'holo').replace('Priority', '');
  return `${s}(${geometry})+${p}`;
}

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

  const getListArg = (name) => {
    const val = getArg(name);
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : null;
  };

  return {
    // Dataset options
    sources: getListArg('--sources'),
    sample: args.includes('--fast') ? 100 : getIntArg('--sample', 500),
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
    verbose: args.includes('--verbose') || args.includes('-v'),
    listSources: args.includes('--list-sources'),
    cacheStatus: args.includes('--cache-status'),
    help: args.includes('--help') || args.includes('-h'),

    // Parallel execution - default 10 workers
    workers: getIntArg('--workers', 10),
    parallel: args.includes('--parallel') || args.includes('-p')
  };
}

/**
 * Build configuration list
 */
function buildConfigurations(args) {
  const configurations = [];

  const priorities = args.priority
    ? [args.priority.includes('holo') ? REASONING_PRIORITY.HOLOGRAPHIC : REASONING_PRIORITY.SYMBOLIC]
    : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

  if (args.fast && !args.strategy) {
    configurations.push({
      strategy: 'dense-binary',
      priority: REASONING_PRIORITY.HOLOGRAPHIC,
      geometry: 256
    });
  } else if (args.strategy) {
    const shortName = args.strategy.toLowerCase();
    const fullName = STRATEGY_FULL_NAMES[shortName] || args.strategy;
    const geometries = STRATEGY_GEOMETRIES[shortName];

    if (!geometries) {
      console.error(`Unknown strategy: ${args.strategy}. Available: dense, sparse, metric`);
      process.exit(1);
    }

    if (args.fast) {
      const defaultGeometry = geometries[Math.floor(geometries.length / 2)];
      configurations.push({
        strategy: fullName,
        priority: REASONING_PRIORITY.HOLOGRAPHIC,
        geometry: defaultGeometry
      });
    } else {
      for (const geometry of geometries) {
        for (const priority of priorities) {
          configurations.push({ strategy: fullName, priority, geometry });
        }
      }
    }
  } else {
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
 * Load Core theories
 */
function loadCoreTheories(session) {
  const corePath = join(CONFIG_ROOT, 'Core');
  if (!fs.existsSync(corePath)) return 0;

  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  let loaded = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(join(corePath, file), 'utf8');
      const res = session.learn(content);
      if (res.success !== false) loaded++;
    } catch (err) { /* skip */ }
  }
  return loaded;
}

/**
 * Create session with configuration
 */
function createSession(config) {
  const session = new Session({
    hdcStrategy: config.strategy,
    geometry: config.geometry,
    reasoningPriority: config.priority,
    reasoningProfile: 'theoryDriven',
    closedWorldAssumption: true,
    rejectContradictions: false
  });

  loadCoreTheories(session);
  return session;
}

/**
 * Run single example
 */
function runExample(session, example) {
  const startTime = performance.now();

  resetRefCounter();
  const translated = translateExample(example);

  if (!translated.contextDsl || !translated.questionDsl) {
    return {
      correct: false,
      proved: false,
      error: 'Translation failed',
      durationMs: performance.now() - startTime,
      source: example.source,
      translated
    };
  }

  try {
    session.learn(translated.contextDsl);
    const proveResult = session.prove(translated.questionDsl, { timeout: 2000 });
    const proved = proveResult?.valid === true;
    const correct = (proved === translated.expectProved);

    return {
      correct,
      proved,
      expectProved: translated.expectProved,
      proof: proveResult?.proof,
      durationMs: performance.now() - startTime,
      source: example.source,
      translated
    };
  } catch (err) {
    return {
      correct: false,
      proved: false,
      error: err.message,
      durationMs: performance.now() - startTime,
      source: example.source,
      translated
    };
  }
}

/**
 * Run evaluation for a configuration
 */
async function runConfiguration(examples, config, args) {
  const label = configLabel(config.strategy, config.geometry, config.priority);

  console.log(`\n${C.bold}${C.magenta}━━━ Configuration: ${label} ━━━${C.reset}`);

  const results = [];
  const startTime = performance.now();
  let correctCount = 0;
  const sourceStats = {};

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const session = createSession(config);
    const result = runExample(session, example);
    result.index = i;

    results.push(result);
    if (result.correct) correctCount++;

    // Track per-source stats
    const src = example.source || 'unknown';
    if (!sourceStats[src]) sourceStats[src] = { total: 0, correct: 0 };
    sourceStats[src].total++;
    if (result.correct) sourceStats[src].correct++;

    // Progress
    if (args.verbose) {
      const icon = result.correct ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
      const srcTag = `${C.cyan}[${src}]${C.reset}`;
      const expected = result.expectProved ? 'PROVE' : 'NOT PROVE';
      const actual = result.proved ? 'PROVED' : 'NOT PROVED';
      console.log(`${icon} ${String(i + 1).padStart(4)}/${examples.length} ${srcTag} expect:${expected} got:${actual} ${C.dim}${formatDuration(result.durationMs)}${C.reset}`);
    } else if ((i + 1) % 50 === 0 || i === examples.length - 1) {
      const pct = ((correctCount / (i + 1)) * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${i + 1}/${examples.length} (${pct}% correct)`);
    }
  }

  if (!args.verbose) console.log(); // Clear progress line

  const totalDuration = performance.now() - startTime;

  // Summary
  const accuracy = ((correctCount / examples.length) * 100).toFixed(1);
  console.log(`\n${C.bold}Results: ${C.green}${correctCount}${C.reset}/${examples.length} correct (${accuracy}%) in ${formatDuration(totalDuration)}`);

  // Per-source breakdown
  console.log(`\n${C.bold}Accuracy by Source:${C.reset}`);
  console.log(`${'─'.repeat(50)}`);
  const sortedSources = Object.entries(sourceStats).sort((a, b) => b[1].total - a[1].total);
  for (const [src, stats] of sortedSources) {
    const srcAcc = ((stats.correct / stats.total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(stats.correct / stats.total * 20));
    const color = stats.correct / stats.total >= 0.7 ? C.green : stats.correct / stats.total >= 0.5 ? C.yellow : C.red;
    console.log(`  ${src.padEnd(15)} ${color}${bar.padEnd(20)}${C.reset} ${stats.correct}/${stats.total} (${srcAcc}%)`);
  }

  return { results, sourceStats, correctCount, totalDuration };
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
${C.bold}LogiGLUE Multi-Source Reasoning Evaluation${C.reset}

Evaluates AGISystem2 using multiple reasoning benchmarks combined.

${C.bold}Usage:${C.reset}
  node evals/runLogiGlueEval.mjs [options]

${C.bold}Options:${C.reset}
  --help, -h              Show this help message
  --fast                  Quick sample (100 examples, single config)
  --sample=N              Custom sample size (default: 500)
  --sources=LIST          Comma-separated list of sources to use
  --seed=N                Random seed for sampling (default: 42)
  --verbose, -v           Show per-example results
  --list-sources          Show available sources and exit
  --cache-status          Show download cache status

${C.bold}Parallel Execution:${C.reset}
  -p, --parallel          Run in parallel mode (default: 10 workers)
  --workers=N             Number of parallel workers (default: 10)

${C.bold}Strategy Options:${C.reset}
  --strategy=NAME         Run single strategy with all geometries
                          NAME: dense, sparse, metric
  --priority=NAME         Run with specific reasoning priority
                          NAME: symbolicPriority, holographicPriority

${C.bold}Available Sources:${C.reset}
  folio          First-Order Logic (1.2k examples)
  logiqa         Civil Service Exam MCQ (1k examples)
  logiqa2        LogiQA 2.0 NLI (3.2k examples)
  logicnli       Natural Language Inference (3k examples)
  prontoqa       Proof chains (200 examples)
  clutrr         Relational reasoning (3k examples)
  reclor         Reading comprehension (500 examples)
  rulebert       Soft rules (5k examples)
  babi15/16      Basic deduction/induction (5k each)
  abduction      Abductive reasoning (5k examples)
  ruletaker      Rule-based reasoning (5k examples)

${C.bold}Examples:${C.reset}
  node evals/runLogiGlueEval.mjs                          # 500 random from all sources
  node evals/runLogiGlueEval.mjs --fast                   # 100 quick test
  node evals/runLogiGlueEval.mjs --sources=folio,prontoqa # Specific sources
  node evals/runLogiGlueEval.mjs --strategy=sparse        # Strategy sweep
  node evals/runLogiGlueEval.mjs --sample=1000 --verbose  # 1000 with details
`);
}

/**
 * Main
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.listSources) {
    console.log(`\n${C.bold}Available Sources:${C.reset}\n`);
    const subsets = listAvailableSubsets();
    for (const subset of subsets) {
      console.log(`  ${C.cyan}${subset.key.padEnd(15)}${C.reset} ${C.dim}~${subset.approxSize} examples${C.reset} [${subset.category}]`);
    }
    console.log();
    process.exit(0);
  }

  if (args.cacheStatus) {
    console.log(`\n${C.bold}Cache Status:${C.reset}\n`);
    const status = getCacheStatus();
    for (const [key, info] of Object.entries(status)) {
      if (info.exists) {
        const freshIcon = info.fresh ? `${C.green}✓${C.reset}` : `${C.yellow}⚠${C.reset}`;
        console.log(`  ${freshIcon} ${key.padEnd(15)} ${info.rows} rows, ${(info.size / 1024).toFixed(1)}KB`);
      } else {
        console.log(`  ${C.dim}○ ${key.padEnd(15)} not cached${C.reset}`);
      }
    }
    console.log();
    process.exit(0);
  }

  // Header
  console.log(`\n${C.bold}${C.bgBlue} LogiGLUE - Multi-Source Reasoning Evaluation ${C.reset}`);
  console.log(`${C.dim}Testing across FOLIO, LogiQA, ProntoQA, CLUTRR, and more${C.reset}\n`);

  // Progress callback for downloads
  const progressCallback = ({ phase, source, downloaded, total }) => {
    if (phase === 'loading') {
      process.stdout.write(`\r  Loading ${source}...`);
    } else if (phase === 'start') {
      console.log(`  Downloading ${source} (${total} examples)...`);
    } else if (phase === 'progress') {
      process.stdout.write(`\r    ${downloaded}/${total}`);
    } else if (phase === 'done') {
      console.log(`\r    ${total} examples cached    `);
    }
  };

  // Load examples
  let data;
  try {
    console.log(`${C.cyan}Loading datasets...${C.reset}`);
    data = await loadExamples({
      sources: args.sources,
      limit: args.sample,
      randomSeed: args.seed,
      progressCallback
    });
  } catch (err) {
    console.error(`${C.red}Failed to load datasets: ${err.message}${C.reset}`);
    if (args.verbose) console.error(err.stack);
    process.exit(1);
  }

  const { examples, totalLoaded, subsetCounts, sampledCounts, subsetsLoaded } = data;

  console.log(`\n${C.bold}Dataset Info:${C.reset}`);
  console.log(`  Total available: ${totalLoaded} examples from ${subsetsLoaded.length} sources`);
  console.log(`  Using sample:    ${examples.length} examples (${C.cyan}uniform distribution${C.reset})`);

  // Show detailed source breakdown
  console.log(`\n${C.bold}Source Distribution:${C.reset}`);
  console.log(`${'─'.repeat(50)}`);
  for (const source of subsetsLoaded) {
    const total = subsetCounts[source] || 0;
    const sampled = sampledCounts?.[source] || 0;
    const pct = examples.length > 0 ? ((sampled / examples.length) * 100).toFixed(0) : 0;
    console.log(`  ${C.cyan}${source.padEnd(15)}${C.reset} ${String(sampled).padStart(4)} / ${total} total (${pct}% of sample)`);
  }
  console.log(`${'─'.repeat(50)}`);

  // Build configurations
  const configurations = buildConfigurations(args);
  const configNames = configurations.map(c => configLabel(c.strategy, c.geometry, c.priority));
  console.log(`\n${C.cyan}Running ${configurations.length} configuration(s): ${configNames.join(', ')}${C.reset}`);

  // Run evaluations
  const allResults = {};
  const overallStart = performance.now();

  // Parallel mode: run multiple workers with different seeds
  if (args.parallel) {
    console.log(`\n${C.bold}${C.bgMagenta} Parallel Mode: ${args.workers} workers ${C.reset}`);
    console.log(`${C.dim}Each worker processes ${examples.length} examples with different random seed${C.reset}\n`);

    // ANSI cursor control helpers
    const ANSI = {
      save: '\x1b[s',
      restore: '\x1b[u',
      clearLine: '\x1b[K',
      moveUp: (n) => `\x1b[${n}A`,
      moveDown: (n) => `\x1b[${n}B`,
      moveToLine: (line) => `\x1b[${line};1H`,
      hideCursor: '\x1b[?25l',
      showCursor: '\x1b[?25h'
    };

    // Worker state for display
    const workerState = Array(args.workers).fill(null).map((_, i) => ({
      id: i + 1,
      progress: 0,
      total: examples.length,
      correct: 0,
      source: '...',
      status: 'starting',
      question: '',
      done: false,
      accuracy: 0
    }));

    // Reserve lines for workers
    process.stdout.write(ANSI.hideCursor);
    for (let i = 0; i < args.workers; i++) {
      console.log(`[W${String(i + 1).padStart(2)}] Starting...`);
    }
    console.log(''); // Extra line for spacing

    // Function to update a specific worker's line
    const updateWorkerLine = (workerIndex) => {
      const state = workerState[workerIndex];
      const lineUp = args.workers - workerIndex + 1; // +1 for the extra spacing line

      let line;
      if (state.done) {
        // Final line when done
        const bar = '█'.repeat(Math.ceil(state.accuracy / 5));
        line = `${C.bold}[W${String(state.id).padStart(2)}]${C.reset} ${C.green}DONE${C.reset} ${bar.padEnd(20)} ${state.correct}/${state.total} (${state.accuracy.toFixed(1)}%)`;
      } else {
        // Progress line
        const icon = state.status === 'correct' ? `${C.green}✓${C.reset}` : state.status === 'wrong' ? `${C.red}✗${C.reset}` : '○';
        const pct = state.total > 0 ? ((state.progress / state.total) * 100).toFixed(0) : 0;
        const accStr = state.progress > 0 ? `${((state.correct / state.progress) * 100).toFixed(0)}%` : '--';
        const srcTag = `${C.cyan}[${state.source.padEnd(12)}]${C.reset}`;
        const question = (state.question || '').slice(0, 35).padEnd(35);
        line = `[W${String(state.id).padStart(2)}] ${icon} ${String(state.progress).padStart(3)}/${state.total} ${srcTag} ${C.dim}${question}${C.reset} ${C.bold}${accStr}${C.reset}`;
      }

      // Move cursor up, clear line, write, move back down
      process.stdout.write(`${ANSI.moveUp(lineUp)}${ANSI.clearLine}${line}\n${ANSI.moveDown(lineUp - 1)}`);
    };

    const workerPromises = [];
    for (let w = 0; w < args.workers; w++) {
      const workerSeed = args.seed + w;
      const workerExamples = seededShuffle([...examples], workerSeed);

      workerPromises.push((async () => {
        const config = configurations[0]; // Use first config for parallel
        const results = [];
        let correctCount = 0;
        const startTime = performance.now();
        const suiteStats = {}; // Per-suite statistics

        for (let i = 0; i < workerExamples.length; i++) {
          const example = workerExamples[i];
          const session = createSession(config);
          const result = runExample(session, example);

          results.push(result);
          if (result.correct) correctCount++;

          // Track per-suite statistics
          const src = example.source || 'unknown';
          if (!suiteStats[src]) suiteStats[src] = { pass: 0, fail: 0 };
          if (result.correct) {
            suiteStats[src].pass++;
          } else {
            suiteStats[src].fail++;
          }

          // Update worker state
          workerState[w].progress = i + 1;
          workerState[w].correct = correctCount;
          workerState[w].source = src;
          workerState[w].status = result.correct ? 'correct' : 'wrong';
          workerState[w].question = example.question || '';

          // Update display line
          updateWorkerLine(w);
        }

        const totalDuration = performance.now() - startTime;
        const accuracy = (correctCount / workerExamples.length) * 100;

        // Mark as done and update display
        workerState[w].done = true;
        workerState[w].accuracy = accuracy;
        updateWorkerLine(w);

        return { worker: w + 1, correctCount, total: workerExamples.length, accuracy, totalDuration, suiteStats };
      })());
    }

    const workerResults = await Promise.all(workerPromises);

    // Show cursor again
    process.stdout.write(ANSI.showCursor);

    // Summary per worker
    console.log(`\n${C.bold}${C.bgMagenta} Parallel Results Summary ${C.reset}`);
    console.log(`${'═'.repeat(60)}`);
    for (const wr of workerResults.sort((a, b) => b.accuracy - a.accuracy)) {
      const bar = '█'.repeat(Math.ceil(wr.accuracy / 5));
      console.log(`  Worker ${String(wr.worker).padStart(2)}: ${C.green}${bar.padEnd(20)}${C.reset} ${wr.accuracy.toFixed(1)}% (${wr.correctCount}/${wr.total}) ${C.dim}${formatDuration(wr.totalDuration)}${C.reset}`);
    }

    const avgAccuracy = workerResults.reduce((sum, r) => sum + r.accuracy, 0) / workerResults.length;
    console.log(`\n${C.bold}Average accuracy across ${args.workers} workers: ${avgAccuracy.toFixed(1)}%${C.reset}`);

    // Aggregate per-suite statistics from all workers
    const aggregatedSuites = {};
    for (const wr of workerResults) {
      for (const [suite, stats] of Object.entries(wr.suiteStats || {})) {
        if (!aggregatedSuites[suite]) aggregatedSuites[suite] = { pass: 0, fail: 0 };
        aggregatedSuites[suite].pass += stats.pass;
        aggregatedSuites[suite].fail += stats.fail;
      }
    }

    // Show per-suite summary
    console.log(`\n${C.bold}${C.bgBlue} Per-Suite Statistics (aggregated from all workers) ${C.reset}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  ${'Suite'.padEnd(15)} ${'Pass'.padStart(6)} ${'Fail'.padStart(6)} ${'Total'.padStart(6)} ${'Accuracy'.padStart(10)}  ${'Bar'}`);
    console.log(`${'─'.repeat(70)}`);

    const sortedSuites = Object.entries(aggregatedSuites).sort((a, b) => {
      const accA = a[1].pass / (a[1].pass + a[1].fail);
      const accB = b[1].pass / (b[1].pass + b[1].fail);
      return accB - accA;
    });

    for (const [suite, stats] of sortedSuites) {
      const total = stats.pass + stats.fail;
      const acc = total > 0 ? (stats.pass / total) * 100 : 0;
      const barLen = Math.ceil(acc / 5);
      const color = acc >= 70 ? C.green : acc >= 50 ? C.yellow : C.red;
      const bar = '█'.repeat(barLen);
      console.log(`  ${C.cyan}${suite.padEnd(15)}${C.reset} ${String(stats.pass).padStart(6)} ${String(stats.fail).padStart(6)} ${String(total).padStart(6)} ${color}${acc.toFixed(1).padStart(9)}%${C.reset}  ${color}${bar}${C.reset}`);
    }
    console.log(`${'─'.repeat(70)}`);

  } else {
    // Sequential mode
    for (const config of configurations) {
      const { results, sourceStats, correctCount, totalDuration } = await runConfiguration(examples, config, args);
      const label = configLabel(config.strategy, config.geometry, config.priority);
      allResults[label] = { results, sourceStats, correctCount, totalDuration };
    }
  }

  // Multi-config comparison
  if (configurations.length > 1) {
    console.log(`\n${C.bold}${C.bgMagenta} Configuration Comparison ${C.reset}`);
    console.log(`${'═'.repeat(60)}`);

    const rows = Object.entries(allResults)
      .map(([label, data]) => {
        const acc = ((data.correctCount / examples.length) * 100).toFixed(1);
        return { label, correct: data.correctCount, acc, duration: data.totalDuration };
      })
      .sort((a, b) => b.correct - a.correct);

    for (const row of rows) {
      const bar = '█'.repeat(Math.floor(row.correct / examples.length * 30));
      console.log(`  ${row.label.padEnd(25)} ${C.green}${bar.padEnd(30)}${C.reset} ${row.acc}% (${formatDuration(row.duration)})`);
    }
  }

  // Final summary
  const overallDuration = performance.now() - overallStart;
  const firstResult = Object.values(allResults)[0];
  const totalCorrect = firstResult?.correctCount || 0;
  const accuracy = ((totalCorrect / examples.length) * 100).toFixed(1);

  console.log(`\n${C.bold}${C.cyan}═══════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}Overall: ${totalCorrect}/${examples.length} correct (${accuracy}%)${C.reset}`);
  console.log(`${C.bold}Total time: ${formatDuration(overallDuration)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════${C.reset}\n`);

  process.exit(totalCorrect === examples.length ? 0 : 1);
}

// Export for runAllEvals
export { main as runLogiGlueEval };

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});
