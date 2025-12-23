#!/usr/bin/env node
/**
 * Complete Evaluation Runner
 *
 * Runs all 3 evaluation types and consolidates results:
 * 1. Fast Eval (NL->DSL transformation suites)
 * 2. Stress Check (theory loading validation)
 * 3. Query Eval (cross-domain semantic reasoning)
 *
 * Usage:
 *   node evals/runAllEvals.mjs                  # Run all evals with default configs (6 sessions each)
 *   node evals/runAllEvals.mjs --fast           # Quick run with single config
 *   node evals/runAllEvals.mjs --verbose        # Show detailed output
 *   node evals/runAllEvals.mjs --strategy=dense # Run single strategy with all geometries
 *
 * Strategy Mode (runs single strategy with multiple geometries):
 *   --strategy=dense    Dense: 128, 256, 512, 1024, 2048, 4096 bits
 *   --strategy=sparse   Sparse: k=1, 2, 3, 5, 8, 13
 *   --strategy=metric   Metric: 8, 16, 32, 64, 128, 256 bytes
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgMagenta: '\x1b[45m'
};

// Strategy configuration
const STRATEGY_CONFIGS = {
  'dense': {
    name: 'dense-binary',
    geometries: [128, 256, 512, 1024, 2048, 4096],
    unit: 'bits'
  },
  'sparse': {
    name: 'sparse-polynomial',
    geometries: [1, 2, 3, 4, 5, 6],
    unit: 'k'
  },
  'metric': {
    name: 'metric-affine',
    geometries: [8, 16, 32, 64, 128, 256],
    unit: 'bytes'
  }
};

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Run a command and capture output
 */
function runCommand(command, args, label) {
  return new Promise((resolve) => {
    console.log();
    console.log(`${COLORS.bright}${COLORS.cyan}${'━'.repeat(80)}${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}${label}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${'━'.repeat(80)}${COLORS.reset}`);
    console.log();

    const startTime = performance.now();
    const proc = spawn(command, args, {
      stdio: 'inherit',
      cwd: ROOT
    });

    proc.on('exit', (code) => {
      const duration = performance.now() - startTime;
      if (code === 0) {
        console.log();
        console.log(`${COLORS.green}${COLORS.bright}${label} completed in ${formatDuration(duration)}${COLORS.reset}`);
        resolve({ success: true, code, duration, label });
      } else {
        console.log();
        console.log(`${COLORS.red}${COLORS.bright}${label} failed with exit code ${code} after ${formatDuration(duration)}${COLORS.reset}`);
        resolve({ success: false, code, duration, label, failed: true });
      }
    });

    proc.on('error', (err) => {
      const duration = performance.now() - startTime;
      console.error(`${COLORS.red}Failed to start ${label}: ${err.message}${COLORS.reset}`);
      resolve({ success: false, code: -1, duration, label, failed: true, error: err.message });
    });
  });
}

/**
 * Print consolidated summary
 */
function printConsolidatedSummary(results, overallDuration, strategyArg, isFast) {
  console.log();
  console.log(`${COLORS.bright}${COLORS.bgMagenta} CONSOLIDATED EVALUATION SUMMARY ${COLORS.reset}`);
  console.log(`${COLORS.magenta}${'═'.repeat(80)}${COLORS.reset}`);
  console.log();

  // Calculate configuration counts
  let configsPerEval, strategiesRun, geometriesPerStrategy, priorities;

  if (isFast) {
    configsPerEval = 1;
    strategiesRun = ['dense-binary'];
    geometriesPerStrategy = 1;
    priorities = 1;
  } else if (strategyArg) {
    const config = STRATEGY_CONFIGS[strategyArg.toLowerCase()];
    if (config) {
      configsPerEval = config.geometries.length * 2; // geometries × 2 priorities
      strategiesRun = [config.name];
      geometriesPerStrategy = config.geometries.length;
      priorities = 2;
    } else {
      configsPerEval = 6;
      strategiesRun = ['dense-binary', 'sparse-polynomial', 'metric-affine'];
      geometriesPerStrategy = 2;
      priorities = 2;
    }
  } else {
    // Default: 3 strategies × 2 geometries × 2 priorities = 12, but we run 6 (no --full)
    configsPerEval = 6;  // 3 strategies × 2 priorities × 1 geometry each
    strategiesRun = ['dense-binary', 'sparse-polynomial', 'metric-affine'];
    geometriesPerStrategy = 1;
    priorities = 2;
  }

  const totalRuns = configsPerEval * results.length;
  const evalTypes = results.length;

  // Configuration overview
  console.log(`${COLORS.bright}${COLORS.cyan}Configuration:${COLORS.reset}`);
  console.log(`${'─'.repeat(60)}`);
  if (strategyArg) {
    const config = STRATEGY_CONFIGS[strategyArg.toLowerCase()];
    if (config) {
      console.log(`  Strategy:    ${COLORS.yellow}${config.name}${COLORS.reset} (sweep mode)`);
      console.log(`  Geometries:  ${config.geometries.join(', ')} ${config.unit}`);
      console.log(`  Priorities:  symbolicPriority, holographicPriority`);
      console.log(`  Per eval:    ${geometriesPerStrategy} geometries × ${priorities} priorities = ${COLORS.bright}${configsPerEval} configs${COLORS.reset}`);
    }
  } else {
    console.log(`  Strategies:  ${COLORS.yellow}${strategiesRun.join(', ')}${COLORS.reset}`);
    console.log(`  Geometries:  ${geometriesPerStrategy} per strategy (default)`);
    console.log(`  Priorities:  symbolicPriority, holographicPriority`);
    console.log(`  Per eval:    ${strategiesRun.length} strategies × ${priorities} priorities = ${COLORS.bright}${configsPerEval} configs${COLORS.reset}`);
  }
  console.log(`${'─'.repeat(60)}`);
  console.log();

  // Results table
  console.log(`${COLORS.bright}${COLORS.cyan}Eval Phase Results:${COLORS.reset}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  ${'Phase'.padEnd(45)} ${'Status'.padEnd(10)} ${'Duration'.padStart(12)}`);
  console.log(`${'─'.repeat(70)}`);

  for (const result of results) {
    const status = result.failed
      ? `${COLORS.red}FAILED${COLORS.reset}`
      : `${COLORS.green}PASSED${COLORS.reset}`;
    const duration = formatDuration(result.duration);
    const shortLabel = result.label.replace('Phase ', '').replace(/[()]/g, '');
    console.log(`  ${shortLabel.padEnd(45)} ${status.padEnd(19)} ${COLORS.dim}${duration.padStart(12)}${COLORS.reset}`);
  }

  console.log(`${'─'.repeat(70)}`);
  console.log();

  // Timing breakdown with visual bars
  console.log(`${COLORS.bright}${COLORS.cyan}Time Distribution:${COLORS.reset}`);
  const maxBarLen = 40;
  const maxDuration = Math.max(...results.map(r => r.duration));

  for (const result of results) {
    const pct = ((result.duration / overallDuration) * 100).toFixed(1);
    const barLen = Math.max(1, Math.floor((result.duration / maxDuration) * maxBarLen));
    const bar = '█'.repeat(barLen);
    const shortLabel = result.label.split(':')[0].replace('Phase ', '');
    console.log(`  ${shortLabel.padEnd(10)} ${COLORS.cyan}${bar}${COLORS.reset} ${formatDuration(result.duration)} (${pct}%)`);
  }
  console.log();

  // Total runs breakdown
  console.log(`${COLORS.bright}${COLORS.cyan}Total Execution:${COLORS.reset}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Eval types:        ${evalTypes} (FastEval, StressCheck, QueryEval)`);
  console.log(`  Configs per eval:  ${configsPerEval}`);
  console.log(`  ${COLORS.bright}Total runs:        ${totalRuns}${COLORS.reset} (${configsPerEval} × ${evalTypes})`);
  console.log(`${'─'.repeat(60)}`);
  console.log();

  // Per-strategy time estimate (if running all strategies)
  if (!strategyArg && strategiesRun.length === 3) {
    const avgTimePerConfig = overallDuration / totalRuns;
    console.log(`${COLORS.bright}${COLORS.cyan}Estimated Time per Strategy:${COLORS.reset}`);
    console.log(`  (Assuming equal distribution across ${strategiesRun.length} strategies)`);
    const timePerStrategy = overallDuration / strategiesRun.length;
    for (const strategy of strategiesRun) {
      const shortName = strategy.replace('-binary', '').replace('-polynomial', '').replace('-affine', '');
      console.log(`  ${shortName.padEnd(12)} ~${formatDuration(timePerStrategy)}`);
    }
    console.log();
  }

  // Overall stats
  const passed = results.filter(r => !r.failed).length;
  const failed = results.filter(r => r.failed).length;

  console.log(`${COLORS.bright}${COLORS.cyan}Summary:${COLORS.reset}`);
  console.log(`  Phases: ${COLORS.green}${passed} passed${COLORS.reset}, ${failed > 0 ? COLORS.red : COLORS.dim}${failed} failed${COLORS.reset} / ${evalTypes} total`);
  console.log(`  Runs:   ${COLORS.bright}${totalRuns}${COLORS.reset} total configurations executed`);
  console.log(`  Time:   ${COLORS.bright}${formatDuration(overallDuration)}${COLORS.reset} total`);
  console.log(`  Avg:    ${formatDuration(overallDuration / totalRuns)} per configuration`);
  console.log();

  // Final verdict
  if (failed === 0) {
    console.log(`${COLORS.green}${COLORS.bright}All ${totalRuns} evaluation runs completed successfully!${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}${COLORS.bright}${failed} phase(s) failed - see details above${COLORS.reset}`);
  }
  console.log();

  return failed === 0;
}

/**
 * Main runner
 */
async function main() {
  // Parse command line args
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Complete Evaluation Runner

Runs all 4 evaluation types and consolidates results:
  1. Fast Eval (NL->DSL transformation suites)
  2. Stress Check (theory loading validation)
  3. Query Eval (cross-domain semantic reasoning)
  4. RuleTaker Eval (external reasoning benchmark)

Usage:
  node evals/runAllEvals.mjs [options]

Options:
  --help, -h              Show this help message
  --fast                  Quick run with single config
  --verbose, -v           Show detailed output
  --strategy=NAME         Run single strategy with all geometries
                          NAME: dense, sparse, metric
  --priority=NAME         Run with specific reasoning priority
                          NAME: symbolicPriority, holographicPriority

Strategy Mode (runs single strategy with multiple geometries):
  --strategy=dense        Dense: 128, 256, 512, 1024, 2048, 4096 bits
  --strategy=sparse       Sparse: k=1, 2, 3, 4, 5, 6
  --strategy=metric       Metric: 8, 16, 32, 64, 128, 256 bytes

Examples:
  node evals/runAllEvals.mjs                     # Run all evals with 6 configs each
  node evals/runAllEvals.mjs --fast              # Quick run with single config
  node evals/runAllEvals.mjs --strategy=dense    # Dense strategy sweep across all phases
  node evals/runAllEvals.mjs --verbose           # Show detailed output
`);
    process.exit(0);
  }

  console.log(`${COLORS.bright}${COLORS.bgBlue} AGISystem2 - Complete Evaluation Suite ${COLORS.reset}`);
  console.log(`${COLORS.blue}Running all evaluation types with consolidated reporting${COLORS.reset}`);
  console.log();

  const overallStart = performance.now();
  const results = [];
  const fast = args.includes('--fast');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Extract --strategy argument
  const strategyArg = args.find(a => a.startsWith('--strategy='));
  const strategy = strategyArg ? strategyArg.split('=')[1] : null;

  // Build common args
  const commonArgs = [];
  if (verbose) commonArgs.push('--verbose');
  if (fast) commonArgs.push('--fast');
  if (strategyArg) commonArgs.push(strategyArg);

  // Extract --priority argument if present
  const priorityArg = args.find(a => a.startsWith('--priority='));
  if (priorityArg) commonArgs.push(priorityArg);

  try {
    // Phase 1: Fast Eval (NL->DSL transformation)
    const fastEvalResult = await runCommand(
      'node',
      [join(__dirname, 'runFastEval.mjs'), ...commonArgs],
      'Phase 1: Fast Eval (NL->DSL Transformation)'
    );
    results.push(fastEvalResult);

    // Phase 2: Stress Check (theory loading validation)
    const stressArgs = [...commonArgs];
    // Remove --verbose for stress check (it has different verbosity)
    const stressArgsFiltered = stressArgs.filter(a => a !== '--verbose');
    const stressResult = await runCommand(
      'node',
      [join(__dirname, 'runStressCheck.js'), ...stressArgsFiltered],
      'Phase 2: Stress Check (Theory Loading & Validation)'
    );
    results.push(stressResult);

    // Phase 3: Query Eval (cross-domain reasoning)
    const queryArgs = [...commonArgs];
    const queryResult = await runCommand(
      'node',
      [join(__dirname, 'runQueryEval.mjs'), ...queryArgs],
      'Phase 3: Query Eval (Cross-Domain Reasoning)'
    );
    results.push(queryResult);

    // Phase 4: RuleTaker Eval (external reasoning benchmark)
    const ruleTakerArgs = [...commonArgs];
    // Use smaller sample for allEvals to keep runtime reasonable
    if (!fast && !ruleTakerArgs.some(a => a.startsWith('--sample='))) {
      ruleTakerArgs.push('--sample=500');
    }
    const ruleTakerResult = await runCommand(
      'node',
      [join(__dirname, 'runRuleTakerEval.mjs'), ...ruleTakerArgs],
      'Phase 4: RuleTaker Eval (External Reasoning Benchmark)'
    );
    results.push(ruleTakerResult);

    // Consolidated Summary
    const overallDuration = performance.now() - overallStart;
    const allPassed = printConsolidatedSummary(results, overallDuration, strategy, fast);

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
