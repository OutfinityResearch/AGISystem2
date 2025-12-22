/**
 * Complete Evaluation Runner
 * Runs both stress checking and cross-domain query evaluation
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  magenta: '\x1b[35m'
};

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(1)}s`;
}

/**
 * Run a command and return result
 */
function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n${COLORS.bright}${COLORS.cyan}╔${'═'.repeat(60)}╗${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}║  ${label.padEnd(56)}  ║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}╚${'═'.repeat(60)}╝${COLORS.reset}\n`);

    const startTime = performance.now();
    const proc = spawn(command, args, {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });

    proc.on('exit', (code) => {
      const duration = performance.now() - startTime;
      if (code === 0) {
        console.log(`\n${COLORS.green}✓ ${label} completed in ${formatDuration(duration)}${COLORS.reset}\n`);
        resolve({ code, duration, label });
      } else {
        console.log(`\n${COLORS.red}✗ ${label} failed with exit code ${code} after ${formatDuration(duration)}${COLORS.reset}\n`);
        resolve({ code, duration, label, failed: true });
      }
    });

    proc.on('error', (err) => {
      console.error(`${COLORS.red}Failed to start ${label}: ${err.message}${COLORS.reset}`);
      reject(err);
    });
  });
}

/**
 * Main runner
 */
async function main() {
  console.log(`${COLORS.bright}\n╔${'═'.repeat(70)}╗${COLORS.reset}`);
  console.log(`${COLORS.bright}║${' '.repeat(20)}COMPLETE EVALUATION SUITE${' '.repeat(25)}║${COLORS.reset}`);
  console.log(`${COLORS.bright}╚${'═'.repeat(70)}╝${COLORS.reset}\n`);

  const overallStart = performance.now();
  const results = [];

  try {
    // Parse command line args
    const args = process.argv.slice(2);
    const fast = args.includes('--fast');
    const verbose = args.includes('--verbose') || args.includes('-v');

    // Phase 1: Stress Check (theory loading validation)
    const stressArgs = fast ? ['--fast'] : [];
    const stressResult = await runCommand(
      'node',
      [join(__dirname, 'runStressCheck.js'), ...stressArgs],
      'Phase 1: Stress Check (Theory Loading & Validation)'
    );
    results.push(stressResult);

    // Phase 2: Query Evaluation (advanced semantic reasoning)
    const queryArgs = verbose ? ['--verbose'] : [];
    const queryResult = await runCommand(
      'node',
      [join(__dirname, 'runQueryEval.mjs'), ...queryArgs],
      'Phase 2: Cross-Domain Query Evaluation'
    );
    results.push(queryResult);

    // Final Summary
    const overallDuration = performance.now() - overallStart;

    console.log(`${COLORS.bright}${COLORS.magenta}╔${'═'.repeat(70)}╗${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.magenta}║${' '.repeat(25)}FINAL SUMMARY${' '.repeat(32)}║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.magenta}╚${'═'.repeat(70)}╝${COLORS.reset}\n`);

    for (const result of results) {
      const status = result.failed
        ? `${COLORS.red}✗ FAILED${COLORS.reset}`
        : `${COLORS.green}✓ PASSED${COLORS.reset}`;
      console.log(`  ${status} ${result.label}`);
      console.log(`  ${COLORS.dim}Duration: ${formatDuration(result.duration)}${COLORS.reset}\n`);
    }

    const allPassed = results.every(r => !r.failed);
    const totalDuration = formatDuration(overallDuration);

    console.log(`${COLORS.bright}Total execution time:${COLORS.reset} ${COLORS.cyan}${totalDuration}${COLORS.reset}`);

    if (allPassed) {
      console.log(`\n${COLORS.green}${COLORS.bright}✓ All evaluation phases completed successfully!${COLORS.reset}\n`);
      process.exit(0);
    } else {
      const failedCount = results.filter(r => r.failed).length;
      console.log(`\n${COLORS.red}${COLORS.bright}✗ ${failedCount} phase(s) failed${COLORS.reset}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
