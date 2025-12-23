/**
 * Cross-Domain Query Evaluation Runner
 * Executes advanced semantic reasoning queries across all loaded theories
 */

import os from 'node:os';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { Session } from '../src/runtime/session.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');
const STRESS_QUERIES_ROOT = join(ROOT, 'evals', 'stress_queries');
const STRESS_ROOT = join(ROOT, 'evals', 'stress');

const STRESS_QUERY_SUITE_FILES = ['suite1.mjs', 'suite2.mjs'];

/**
 * Load selected suite files from stress_queries/ directory.
 * Each suite file should export a 'steps' array.
 */
async function loadSuites() {
  const suites = [];
  const foundFiles = new Set();

  try {
    const files = readdirSync(STRESS_QUERIES_ROOT)
      .filter(f => f.endsWith('.mjs'))
      .sort();
    for (const file of files) foundFiles.add(file);
  } catch (err) {
    console.error(`Warning: Failed to read stress_queries directory: ${err.message}`);
    return { suites, suiteInfo: [] };
  }

  for (const file of STRESS_QUERY_SUITE_FILES) {
    if (!foundFiles.has(file)) {
      console.error(`Warning: Expected suite file missing: ${file}`);
      continue;
    }
    try {
      const modulePath = `./stress_queries/${file}`;
      const suiteModule = await import(modulePath);
      const steps = suiteModule.steps || [];
      const name = suiteModule.name || file.replace('.mjs', '');
      const sessionOptions = suiteModule.sessionOptions || {};
      const theories = suiteModule.theories || [];

      if (steps.length > 0) {
        suites.push({ name, file, steps, sessionOptions, theories });
      }
    } catch (err) {
      console.error(`Warning: Failed to load suite ${file}: ${err.message}`);
    }
  }

  const suiteInfo = suites.map(s => ({ name: s.name, file: s.file, count: s.steps.length }));
  return { suites, suiteInfo };
}

// Terminal colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const remS = s - m * 60;
  if (m < 60) return `${m}m${remS.toFixed(1)}s`;
  const h = Math.floor(m / 60);
  const remM = m - h * 60;
  return `${h}h${remM}m`;
}

function formatSummaryTable(rows, headers) {
  const widths = headers.map(h => h.length);
  for (const row of rows) {
    row.forEach((cell, idx) => {
      if (cell.length > widths[idx]) widths[idx] = cell.length;
    });
  }
  const pad = (text, width) => text.padEnd(width);
  const lines = [];
  lines.push(headers.map((h, i) => pad(h, widths[i])).join(' | '));
  lines.push(headers.map((_, i) => '-'.repeat(widths[i])).join('-|-'));
  for (const row of rows) {
    lines.push(row.map((cell, i) => pad(cell, widths[i])).join(' | '));
  }
  return lines.join('\n');
}

/**
 * Load Core theories from config/Core
 */
function loadCoreTheories(session) {
  const corePath = join(CONFIG_ROOT, 'Core');
  if (!fs.existsSync(corePath)) {
    console.error(`${COLORS.red}Core theories not found at ${corePath}${COLORS.reset}`);
    return 0;
  }

  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  let loaded = 0;
  for (const file of files) {
    const content = fs.readFileSync(join(corePath, file), 'utf8');
    const res = session.learn(content);
    if (res.success) {
      loaded++;
    }
  }
  return loaded;
}

/**
 * Load stress domain theories (with relaxed validation)
 */
function loadStressTheories(session) {
  if (!fs.existsSync(STRESS_ROOT)) {
    return 0;
  }

  const files = fs.readdirSync(STRESS_ROOT)
    .filter(f => f.endsWith('.sys2'))
    .sort();

  let loaded = 0;
  let factsLoaded = 0;

  for (const file of files) {
    const content = fs.readFileSync(join(STRESS_ROOT, file), 'utf8');
    try {
      const res = session.learn(content);
      if (res.success || res.facts > 0) {
        loaded++;
        factsLoaded += res.facts || 0;
      }
    } catch (e) {
      loaded++;
    }
  }

  return { loaded, factsLoaded };
}

/**
 * Execute a single query step
 */
async function executeQuery(session, step, index, total, sessionId) {
  const startTime = performance.now();

  let result;
  let success = false;
  let error = null;
  let resultCount = 0;

  try {
    if (step.action === 'query') {
      result = session.query(step.input_dsl.trim());
      success = result && (result.success || result.bindings || result.facts);
      resultCount = result?.bindings?.length || result?.facts?.length || 0;
    } else if (step.action === 'prove') {
      result = session.prove(step.input_dsl.trim());
      success = result && result.valid !== undefined;
      resultCount = result?.steps?.length || 0;
    } else if (step.action === 'learn' || step.action === 'solve') {
      result = session.learn(step.input_dsl.trim());
      success = result && (result.learned > 0 || result.success);
      resultCount = result?.learned || result?.facts || 0;
    }
  } catch (e) {
    error = e.message;
    success = false;
  }

  const duration = performance.now() - startTime;

  return {
    index,
    sessionId,
    query: step.input_nl,
    action: step.action,
    success,
    error,
    result,
    resultCount,
    duration
  };
}

/**
 * Run a single suite in a fresh session
 */
async function runSuiteSession(suite, sessionId, hdcStrategy = 'dense-binary', geometry = 256, reasoningPriority = REASONING_PRIORITY.SYMBOLIC, verbose = false, loadStress = false) {
  const startTime = performance.now();
  const sessionLabel = `Session${sessionId}`;

  const session = new Session({
    geometry,
    hdcStrategy,
    reasoningPriority,
    ...(suite?.sessionOptions || {})
  });

  // Load theories
  const coreCount = loadCoreTheories(session);
  const { loaded: stressCount, factsLoaded } = loadStress ? loadStressTheories(session) : { loaded: 0, factsLoaded: 0 };

  if (verbose) {
    console.log(`${COLORS.cyan}[${sessionLabel}]${COLORS.reset} Loaded ${coreCount} Core + ${stressCount} Stress (${factsLoaded} facts)`);
  }

  // Execute queries
  const results = [];
  const cases = suite.steps || [];
  for (let i = 0; i < cases.length; i++) {
    const step = cases[i];
    const queryStart = performance.now();
    const result = await executeQuery(session, step, i + 1, cases.length, sessionId);
    results.push(result);

    // Determine actual result details
    let actualResult = 'N/A';
    let passed = result.success;
    if (step.action === 'prove') {
      const valid = result.result?.valid;
      actualResult = valid === true ? 'PROVED' : valid === false ? 'NOT PROVED' : 'ERROR';
      // Check if result matches expected (if expected_nl mentions "Should NOT prove" or "Cannot prove")
      const expectNotProve = (step.expected_nl || '').toLowerCase().includes('should not prove') ||
                            (step.expected_nl || '').toLowerCase().includes('cannot prove');
      const expectProve = (step.expected_nl || '').toLowerCase().includes('should prove') ||
                         (step.expected_nl || '').toLowerCase().includes('true:');
      if (expectNotProve) {
        passed = valid === false || valid === undefined;
      } else if (expectProve) {
        passed = valid === true;
      }
    } else if (step.action === 'query') {
      const count = result.resultCount || 0;
      actualResult = count > 0 ? `${count} results` : 'no results';
      // Query should return results to be considered successful
      passed = count > 0;
    } else if (step.action === 'learn' || step.action === 'solve') {
      // Learn is successful if no error
      actualResult = result.error ? 'ERROR' : `learned ${result.resultCount || 0}`;
      passed = !result.error;
    }
    result.passed = passed;

    if (verbose) {
      const statusIcon = passed ? `${COLORS.green}✓${COLORS.reset}` :
                         result.error ? `${COLORS.red}✗${COLORS.reset}` : `${COLORS.yellow}○${COLORS.reset}`;
      const actionLabel = result.action === 'query' ? 'Q' : result.action === 'prove' ? 'P' : 'S';
      const resultInfo = passed ? `${actualResult}` :
                         result.error ? `error: ${result.error}` : actualResult;
      console.log(`${COLORS.cyan}[${sessionLabel}]${COLORS.reset} ${statusIcon} ${actionLabel}${i + 1}/${cases.length} ${COLORS.dim}${resultInfo} ${formatDuration(result.duration)}${COLORS.reset}`);
    }
  }

  session.close();

  const totalDuration = performance.now() - startTime;
  const successful = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    sessionId,
    suiteName: suite.name,
    suiteFile: suite.file,
    hdcStrategy,
    geometry,
    reasoningPriority: session.reasoningPriority,
    results,
    successful,
    failed,
    totalDuration,
    factsLoaded,
    cases // Include cases for detailed reporting
  };
}

/**
 * Worker entrypoint: run one configuration in an isolated process and emit JSON.
 */
async function workerMain() {
  const args = process.argv.slice(2);
  const configB64 = getArgValue(args, '--config');
  const outPath = getArgValue(args, '--out');
  if (!configB64) {
    console.error('Missing --config for worker mode');
    process.exit(2);
  }
  if (!outPath) {
    console.error('Missing --out for worker mode');
    process.exit(2);
  }

  try {
    const configJson = Buffer.from(configB64, 'base64url').toString('utf8');
    const config = JSON.parse(configJson);

    // Load selected suite files from stress_queries/
    const { suites } = await loadSuites();
    if (!suites || suites.length === 0) {
      throw new Error('No query cases found in stress_queries/');
    }

    const suiteResults = [];
    for (let i = 0; i < suites.length; i++) {
      const suite = suites[i];
      const suiteResult = await runSuiteSession(
        suite,
        i + 1,
        config.hdcStrategy,
        config.geometry,
        config.reasoningPriority,
        Boolean(config.verbose),
        Boolean(config.loadStress)
      );
      suiteResults.push(suiteResult);
    }

    const totalCases = suiteResults.reduce((acc, s) => acc + (s.cases?.length || 0), 0);
    const successful = suiteResults.reduce((acc, s) => acc + (s.successful || 0), 0);
    const failed = suiteResults.reduce((acc, s) => acc + (s.failed || 0), 0);
    const totalDuration = suiteResults.reduce((acc, s) => acc + (s.totalDuration || 0), 0);

    fs.writeFileSync(
      outPath,
      JSON.stringify({ ok: true, sessionResult: { totalCases, successful, failed, totalDuration, suiteResults } }),
      'utf8'
    );
  } catch (error) {
    fs.writeFileSync(outPath, JSON.stringify({ ok: false, error: error?.message || String(error) }), 'utf8');
    process.exit(1);
  }
}

function configLabel({ hdcStrategy, geometry, reasoningPriority }) {
  const strategyShort = (hdcStrategy || '')
    .replace('dense-binary', 'dense')
    .replace('sparse-polynomial', 'sparse')
    .replace('metric-affine', 'metric');
  const priorityShort = (reasoningPriority || '')
    .replace('symbolicPriority', 'symb')
    .replace('holographicPriority', 'holo');
  return `${strategyShort}(${geometry})+${priorityShort}`;
}

function normalizePriority(value) {
  if (!value) return value;
  const v = value.toLowerCase();
  if (v === 'symbolic' || v === 'symbolicpriority') return REASONING_PRIORITY.SYMBOLIC;
  if (v === 'holographic' || v === 'holographicpriority') return REASONING_PRIORITY.HOLOGRAPHIC;
  return value;
}

async function runWorkerProcess(config) {
  const tmpDir = join(ROOT, 'evals', '.tmp-query-eval');
  fs.mkdirSync(tmpDir, { recursive: true });
  const outPath = join(
    tmpDir,
    `result.${Date.now()}.${Math.random().toString(16).slice(2)}.json`
  );

  const payload = Buffer.from(JSON.stringify(config), 'utf8').toString('base64url');
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', `--config=${payload}`, `--out=${outPath}`], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'ignore']
  });

  const exitCode = await new Promise(resolve => child.on('close', resolve));
  let parsed;
  try {
    const raw = fs.readFileSync(outPath, 'utf8');
    parsed = JSON.parse(raw);
  } catch (error) {
    parsed = { ok: false, error: `Worker did not produce a readable result file (${error.message})` };
  } finally {
    try { fs.rmSync(outPath); } catch {}
  }

  if (!parsed.ok && exitCode === 0) {
    return { ...parsed, error: parsed.error || 'Worker failed', config };
  }
  if (exitCode !== 0) {
    return { ...parsed, ok: false, error: parsed.error || `Worker exited with code ${exitCode}`, config };
  }
  return { ...parsed, config };
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      results[current] = await fn(items[current], current);
    }
  }

  const concurrency = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

/**
 * Parent entrypoint: spawn isolated workers for each configuration and summarize.
 */
async function parentMain() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Cross-Domain Query Evaluation Runner

Executes advanced semantic reasoning queries across all loaded theories.

Usage:
  node evals/runQueryEval.mjs [options]

Options:
  --help, -h              Show this help message
  --verbose, -v           Show detailed output
  --fast                  Quick run with single config (dense/256/holo)
  --jobs=N                Number of parallel workers (default: min(6, cpus))
  --load-stress           Also load domain facts from evals/stress/*.sys2
  --strategy=NAME         Run single strategy with all geometries
                          NAME: dense, sparse, metric
  --priority=NAME         Run with specific reasoning priority
                          NAME: symbolicPriority, holographicPriority

Strategy Mode (runs single strategy with multiple geometries):
  --strategy=dense        Dense: 128, 256, 512, 1024, 2048, 4096 bits
  --strategy=sparse       Sparse: k=1, 2, 3, 4, 5, 6
  --strategy=metric       Metric: 8, 16, 32, 64, 128, 256 bytes

Default Mode (no --strategy):
  Runs 3 strategies × 2 geometries × 2 priorities = 12 configurations

Examples:
  node evals/runQueryEval.mjs                    # Run all 12 configs
  node evals/runQueryEval.mjs --fast             # Quick single config
  node evals/runQueryEval.mjs --strategy=sparse  # Sparse sweep (6 geometries × 2 priorities)
  node evals/runQueryEval.mjs --verbose          # Show query details
`);
    process.exit(0);
  }

  console.log(`${COLORS.bright}\n╔═══════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bright}║  Cross-Domain Query Evaluation Runner    ║${COLORS.reset}`);
  console.log(`${COLORS.bright}╚═══════════════════════════════════════════╝${COLORS.reset}`);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const fastMode = args.includes('--fast');
  const loadStress = args.includes('--load-stress');
  const jobsArg = getArgValue(args, '--jobs');
  const jobs = jobsArg ? Number.parseInt(jobsArg, 10) : Math.max(1, Math.min(6, os.cpus().length));
  const strategyArg = getArgValue(args, '--strategy');
  const priorityArg = normalizePriority(getArgValue(args, '--priority'));

  // Load selected suite files from stress_queries/
  const { suites, suiteInfo } = await loadSuites();
  if (!suites || suites.length === 0) {
    console.error(`${COLORS.red}No query cases found in stress_queries/!${COLORS.reset}`);
    process.exit(1);
  }
  const totalCases = suites.reduce((acc, s) => acc + (s.steps?.length || 0), 0);

  // Show loaded suites
  console.log(`${COLORS.cyan}Loaded suites:${COLORS.reset}`);
  for (const suite of suiteInfo) {
    console.log(`  ${COLORS.dim}•${COLORS.reset} ${suite.name} (${suite.file}): ${suite.count} queries`);
  }

  // Build configurations based on args
  const configurations = [];

  // --fast alone: single quick test
  if (fastMode && !strategyArg) {
    configurations.push({
      hdcStrategy: 'dense-binary',
      geometry: 256,
      reasoningPriority: REASONING_PRIORITY.HOLOGRAPHIC
    });
    console.log(`${COLORS.cyan}Fast mode: single config (${configLabel(configurations[0])})${COLORS.reset}`);
  } else if (strategyArg) {
    // --strategy=X: single strategy with ALL geometries (sweep mode)
    const resolvedStrategy = STRATEGY_ALIASES[strategyArg.toLowerCase()] || strategyArg;
    const geometries = GEOMETRY_SWEEP[resolvedStrategy];

    if (!geometries) {
      console.error(`${COLORS.red}Unknown strategy: ${strategyArg}. Available: dense, sparse, metric${COLORS.reset}`);
      process.exit(1);
    }

    // --strategy=X --fast: single geometry for quick test of that strategy
    if (fastMode) {
      const defaultGeometry = geometries[Math.floor(geometries.length / 2)];
      configurations.push({
        hdcStrategy: resolvedStrategy,
        geometry: defaultGeometry,
        reasoningPriority: REASONING_PRIORITY.HOLOGRAPHIC
      });
      console.log(`${COLORS.cyan}Fast mode: single config (${configLabel(configurations[0])})${COLORS.reset}`);
    } else {
      // --strategy=X: all geometries for that strategy
      const priorities = priorityArg
        ? [priorityArg]
        : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];

      for (const geometry of geometries) {
        for (const reasoningPriority of priorities) {
          configurations.push({ hdcStrategy: resolvedStrategy, geometry, reasoningPriority });
        }
      }
      console.log(`${COLORS.cyan}Strategy sweep mode: ${resolvedStrategy} with geometries ${geometries.join(', ')}${COLORS.reset}`);
    }
  } else {
    // Default mode: 12 configurations (3 strategies × 2 priorities × 2 geometries)
    const priorities = priorityArg
      ? [priorityArg]
      : [REASONING_PRIORITY.SYMBOLIC, REASONING_PRIORITY.HOLOGRAPHIC];
    const strategies = Object.keys(GEOMETRY_VARIANTS);

    for (const hdcStrategy of strategies) {
      for (const reasoningPriority of priorities) {
        for (const geometry of GEOMETRY_VARIANTS[hdcStrategy]) {
          configurations.push({ hdcStrategy, geometry, reasoningPriority });
        }
      }
    }
  }

  console.log(`\nRuns: ${COLORS.cyan}${configurations.length}${COLORS.reset} | Queries: ${COLORS.cyan}${totalCases}${COLORS.reset} | Workers: ${COLORS.cyan}${jobs}${COLORS.reset}\n`);

  const startAll = performance.now();

  const workerResults = await runWithConcurrency(
    configurations.map(c => ({ ...c, verbose: false, loadStress })),
    jobs,
    async (config, idx) => {
      const label = configLabel(config);
      const t0 = performance.now();
      const result = await runWorkerProcess(config);
      const dt = performance.now() - t0;
      const status = result.ok ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`;
      console.log(`${COLORS.dim}${String(idx + 1).padStart(2)}/${String(configurations.length)}${COLORS.reset} ${label.padEnd(42)} ${status} ${COLORS.dim}${formatDuration(dt)}${COLORS.reset}`);
      return result;
    }
  );

  const totalWall = performance.now() - startAll;

  const sessionResults = workerResults
    .filter(r => r && r.ok && r.sessionResult)
    .map(r => ({ ...r.sessionResult, config: r.config }));

  const failures = workerResults.filter(r => !r?.ok);

  // ========================================================================
  // SUMMARY (stable, non-interleaved)
  // ========================================================================
  console.log(`\n${COLORS.bright}=== Run Summary ===${COLORS.reset}`);

  const rows = sessionResults
    .map(s => {
      const label = configLabel(s.config);
      const successRate = ((s.successful / totalCases) * 100).toFixed(0);
      return [label, `${s.successful}/${totalCases} (${successRate}%)`, formatDuration(s.totalDuration)];
    })
    .sort((a, b) => {
      const aMs = sessionResults.find(s => configLabel(s.config) === a[0])?.totalDuration ?? 0;
      const bMs = sessionResults.find(s => configLabel(s.config) === b[0])?.totalDuration ?? 0;
      return aMs - bMs;
    });

  console.log(formatSummaryTable(rows, ['run', 'success', 'duration']));
  console.log(`\nTotal wall time: ${COLORS.cyan}${formatDuration(totalWall)}${COLORS.reset}`);

  if (failures.length > 0) {
    console.log(`\n${COLORS.yellow}Worker failures:${COLORS.reset}`);
    for (const f of failures) {
      console.log(`  ${COLORS.red}•${COLORS.reset} ${configLabel(f.config)}: ${f.error}`);
    }
  }

  // Show detailed query results from first successful session
  const firstSession = sessionResults[0];
  if (firstSession && firstSession.suiteResults) {
    console.log(`\n${COLORS.bright}=== Query Details ===${COLORS.reset}`);

    let globalIndex = 0;
    let passCount = 0;
    let failCount = 0;

    for (const suiteResult of firstSession.suiteResults) {
      console.log(`\n${COLORS.bright}${suiteResult.suiteName} (${suiteResult.suiteFile})${COLORS.reset}`);
      for (let i = 0; i < (suiteResult.results?.length || 0); i++) {
        globalIndex++;
        const r = suiteResult.results[i];
        const step = suiteResult.cases[i];
        const passed = r.passed;

        // Determine actual result
        let actualStr = 'N/A';
        if (step.action === 'prove') {
          const valid = r.result?.valid;
          actualStr = valid === true ? 'PROVED' : valid === false ? 'NOT PROVED' : 'ERROR';
        } else if (step.action === 'query') {
          actualStr = r.resultCount > 0 ? `${r.resultCount} results` : 'no results';
        }

        const icon = passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
        const actionTag = step.action === 'prove' ? `${COLORS.cyan}[PROVE]${COLORS.reset}` :
                          step.action === 'query' ? `${COLORS.magenta}[QUERY]${COLORS.reset}` :
                          `${COLORS.yellow}[SOLVE]${COLORS.reset}`;

        console.log(`${icon} ${String(globalIndex).padStart(2)}. ${actionTag} ${step.input_nl || 'unnamed'}`);
        console.log(`      ${COLORS.dim}Expected: ${step.expected_nl || 'N/A'}${COLORS.reset}`);
        console.log(`      ${COLORS.dim}Actual:   ${actualStr}${r.error ? ` (${r.error})` : ''}${COLORS.reset}`);

        if (!passed) {
          console.log(`      ${COLORS.yellow}DSL: ${step.input_dsl?.trim().split('\n')[0]}...${COLORS.reset}`);
        }

        if (passed) passCount++;
        else failCount++;
      }
    }

    console.log(`\n${COLORS.bright}Total: ${COLORS.green}${passCount} passed${COLORS.reset}, ${COLORS.red}${failCount} failed${COLORS.reset}`);
  }
}

// Default geometries (for normal runs)
const GEOMETRY_VARIANTS = {
  'dense-binary': [256, 512],
  'sparse-polynomial': [2, 4],
  'metric-affine': [16, 32]
};

// Extended geometries (for --strategy sweep mode)
const GEOMETRY_SWEEP = {
  'dense-binary': [128, 256, 512, 1024, 2048, 4096],       // bits
  'sparse-polynomial': [1, 2, 3, 4, 5, 6],                  // k exponents
  'metric-affine': [8, 16, 32, 64, 128, 256]                // bytes
};

const STRATEGY_ALIASES = {
  'dense': 'dense-binary',
  'sparse': 'sparse-polynomial',
  'metric': 'metric-affine'
};

function getArgValue(args, name) {
  const arg = args.find(a => a.startsWith(`${name}=`));
  return arg ? arg.split('=')[1] : null;
}

/**
 * Main entry point
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--worker')) {
      await workerMain();
      return;
    }
    await parentMain();

  } catch (error) {
    console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
