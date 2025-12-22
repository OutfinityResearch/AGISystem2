/**
 * Cross-Domain Query Evaluation Runner
 * Executes advanced semantic reasoning queries across all loaded theories
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session } from '../src/runtime/session.mjs';
import { initHDC } from '../src/hdc/facade.mjs';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');
const STRESS_ROOT = join(ROOT, 'evals', 'stress');

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
  return `${(ms / 1000).toFixed(2)}s`;
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
    } else if (step.action === 'solve') {
      result = session.learn(step.input_dsl.trim());
      success = result && result.success;
      resultCount = result?.facts || 0;
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
 * Run a single session with all queries
 */
async function runSession(sessionId, cases, hdcStrategy = 'dense-binary', geometry = 2048, verbose = false) {
  const startTime = performance.now();
  const sessionLabel = `Session${sessionId}`;

  // Initialize HDC and session
  initHDC(hdcStrategy);
  const session = new Session({ geometry, hdcStrategy });

  // Load theories
  const coreCount = loadCoreTheories(session);
  const { loaded: stressCount, factsLoaded } = loadStressTheories(session);

  if (verbose) {
    console.log(`${COLORS.cyan}[${sessionLabel}]${COLORS.reset} Loaded ${coreCount} Core + ${stressCount} Stress (${factsLoaded} facts)`);
  }

  // Execute queries
  const results = [];
  for (let i = 0; i < cases.length; i++) {
    const queryStart = performance.now();
    const result = await executeQuery(session, cases[i], i + 1, cases.length, sessionId);
    results.push(result);

    if (verbose) {
      const statusIcon = result.success ? `${COLORS.green}✓${COLORS.reset}` :
                         result.error ? `${COLORS.red}✗${COLORS.reset}` : `${COLORS.yellow}○${COLORS.reset}`;
      const actionLabel = result.action === 'query' ? 'Q' : result.action === 'prove' ? 'P' : 'S';
      const resultInfo = result.success ? `${result.resultCount} results` :
                         result.error ? `error` : 'no results';
      console.log(`${COLORS.cyan}[${sessionLabel}]${COLORS.reset} ${statusIcon} ${actionLabel}${i + 1}/${cases.length} ${COLORS.dim}${resultInfo} ${formatDuration(result.duration)}${COLORS.reset}`);
    }
  }

  session.close();

  const totalDuration = performance.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    sessionId,
    hdcStrategy,
    geometry,
    results,
    successful,
    failed,
    totalDuration,
    factsLoaded
  };
}

/**
 * Run multiple sessions in parallel
 */
async function runParallelSessions(cases, configurations, verbose = false) {
  console.log(`${COLORS.bright}\n╔═══════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bright}║  Cross-Domain Query Evaluation Runner    ║${COLORS.reset}`);
  console.log(`${COLORS.bright}╚═══════════════════════════════════════════╝${COLORS.reset}`);
  console.log(`\nRunning ${COLORS.cyan}${configurations.length}${COLORS.reset} sessions in parallel with ${COLORS.cyan}${cases.length}${COLORS.reset} queries each\n`);

  const promises = configurations.map((config, idx) =>
    runSession(idx + 1, cases, config.hdcStrategy, config.geometry, verbose)
  );

  const sessionResults = await Promise.all(promises);

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log(`\n${COLORS.bright}╔═══════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bright}║          SESSION RESULTS                  ║${COLORS.reset}`);
  console.log(`${COLORS.bright}╚═══════════════════════════════════════════╝${COLORS.reset}\n`);

  // Find fastest session
  const fastest = sessionResults.reduce((min, s) => s.totalDuration < min.totalDuration ? s : min);

  for (const session of sessionResults) {
    const isFastest = session.sessionId === fastest.sessionId;
    const speedMark = isFastest ? `${COLORS.green}⚡ FASTEST${COLORS.reset}` : '';
    const successRate = ((session.successful / cases.length) * 100).toFixed(0);

    console.log(`${COLORS.cyan}Session ${session.sessionId}${COLORS.reset} (${COLORS.dim}${session.hdcStrategy}/${session.geometry}${COLORS.reset}): ${COLORS.green}${session.successful}✓${COLORS.reset} ${COLORS.red}${session.failed}✗${COLORS.reset} ${COLORS.dim}[${formatDuration(session.totalDuration)}] ${successRate}% success${COLORS.reset} ${speedMark}`);
  }

  // ========================================================================
  // SPEED COMPARISON
  // ========================================================================
  console.log(`\n${COLORS.bright}Speed Comparison:${COLORS.reset}`);
  const sorted = [...sessionResults].sort((a, b) => a.totalDuration - b.totalDuration);
  for (const session of sorted) {
    const speedup = (fastest.totalDuration / session.totalDuration * 100).toFixed(0);
    const bar = '█'.repeat(Math.max(1, Math.floor(session.totalDuration / fastest.totalDuration * 20)));
    console.log(`  ${session.hdcStrategy.padEnd(20)} ${COLORS.dim}${session.geometry}${COLORS.reset} ${COLORS.cyan}${bar}${COLORS.reset} ${formatDuration(session.totalDuration)} ${COLORS.dim}(${speedup}%)${COLORS.reset}`);
  }

  // ========================================================================
  // QUERY-LEVEL ANALYSIS
  // ========================================================================
  console.log(`\n${COLORS.bright}Query Success Rate:${COLORS.reset}`);

  const problemQueries = [];

  for (let i = 0; i < cases.length; i++) {
    const queryResults = sessionResults.map(s => s.results[i]);
    const successCount = queryResults.filter(r => r.success).length;
    const avgTime = queryResults.reduce((sum, r) => sum + r.duration, 0) / queryResults.length;

    const status = successCount === sessionResults.length
      ? `${COLORS.green}✓${COLORS.reset}`
      : successCount === 0
        ? `${COLORS.red}✗${COLORS.reset}`
        : `${COLORS.yellow}⊘${COLORS.reset}`;

    const queryLabel = cases[i].action === 'query' ? 'Query' : cases[i].action === 'prove' ? 'Proof' : 'Solve';

    console.log(`  ${status} ${queryLabel} ${i + 1}: ${successCount}/${sessionResults.length} ${COLORS.dim}[avg ${formatDuration(avgTime)}]${COLORS.reset}`);

    if (successCount < sessionResults.length) {
      problemQueries.push({
        index: i + 1,
        label: queryLabel,
        successCount,
        errors: queryResults.filter(r => !r.success).map(r => r.error || 'unknown')
      });
    }
  }

  // ========================================================================
  // PROBLEM SUMMARY
  // ========================================================================
  if (problemQueries.length > 0) {
    console.log(`\n${COLORS.bright}${COLORS.yellow}╔═══════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.yellow}║          PROBLEM QUERIES                  ║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.yellow}╚═══════════════════════════════════════════╝${COLORS.reset}\n`);

    // Group errors by type
    const errorTypes = {};
    for (const pq of problemQueries) {
      for (const err of pq.errors) {
        const key = err.substring(0, 100); // First 100 chars
        if (!errorTypes[key]) errorTypes[key] = { count: 0, queries: [] };
        errorTypes[key].count++;
        if (!errorTypes[key].queries.includes(pq.index)) {
          errorTypes[key].queries.push(pq.index);
        }
      }
    }

    console.log(`${COLORS.yellow}Total queries with issues: ${problemQueries.length}/${cases.length}${COLORS.reset}\n`);

    console.log(`${COLORS.bright}Common error patterns:${COLORS.reset}`);
    const sortedErrors = Object.entries(errorTypes).sort(([, a], [, b]) => b.count - a.count);
    for (const [errMsg, info] of sortedErrors.slice(0, 10)) {
      console.log(`  ${COLORS.red}•${COLORS.reset} ${COLORS.dim}${errMsg}${COLORS.reset}`);
      console.log(`    ${COLORS.dim}Affects queries: ${info.queries.join(', ')} (${info.count} failures)${COLORS.reset}`);
    }

    console.log(`\n${COLORS.yellow}These queries require:${COLORS.reset}`);
    console.log(`  • Missing operator definitions (abduce, induce, analogy, similar, explain, etc.)`);
    console.log(`  • Extended stress theory knowledge (domain facts for abduction/induction)`);
    console.log(`  • Advanced reasoning implementations (counterfactual, explanation generation)`);
  } else {
    console.log(`\n${COLORS.green}✓ All queries passed across all sessions!${COLORS.reset}`);
  }

  // ========================================================================
  // DATA STATISTICS
  // ========================================================================
  console.log(`\n${COLORS.bright}Knowledge Base Statistics:${COLORS.reset}`);
  const avgFacts = sessionResults.reduce((sum, s) => sum + s.factsLoaded, 0) / sessionResults.length;
  console.log(`  Facts loaded per session: ${COLORS.cyan}${avgFacts.toFixed(0)}${COLORS.reset} facts from stress theories`);
  console.log(`  Total queries executed: ${COLORS.cyan}${cases.length * sessionResults.length}${COLORS.reset} (${cases.length} queries × ${sessionResults.length} sessions)`);
  console.log(`  Total execution time: ${COLORS.cyan}${formatDuration(sessionResults.reduce((sum, s) => sum + s.totalDuration, 0))}${COLORS.reset}`);

  return sessionResults;
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Parse command line args
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');

    // Load cases
    const casesModule = await import('./stress_queries/cases.mjs');
    const cases = casesModule.steps;

    if (!cases || cases.length === 0) {
      console.error(`${COLORS.red}No query cases found!${COLORS.reset}`);
      process.exit(1);
    }

    // Define 6 parallel configurations (different HDC strategies and geometries)
    const configurations = [
      { hdcStrategy: 'dense-binary', geometry: 2048 },
      { hdcStrategy: 'dense-binary', geometry: 4096 },
      { hdcStrategy: 'sparse-polynomial', geometry: 4 },
      { hdcStrategy: 'sparse-polynomial', geometry: 8 },
      { hdcStrategy: 'metric-affine', geometry: 32 },
      { hdcStrategy: 'metric-affine', geometry: 64 }
    ];

    await runParallelSessions(cases, configurations, verbose);

  } catch (error) {
    console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
