/**
 * Performance Suite - Results Reporter
 * @module performance/lib/reporter
 *
 * Formats and displays performance results.
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Format time in ms with appropriate units
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Report header for a theory
 */
export function reportTheoryHeader(theory) {
  console.log();
  console.log(`${COLORS.bold}${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}Theory: ${theory.name}${COLORS.reset}`);
  console.log(`${COLORS.dim}${theory.description || 'No description'}${COLORS.reset}`);
  console.log(`${COLORS.dim}Facts: ${theory.factCount} | Cases: ${theory.cases?.length || 0}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'─'.repeat(80)}${COLORS.reset}`);
}

/**
 * Report results for a single theory run
 */
export function reportTheoryResults(metrics) {
  const { summary, theoryName, strategy, priority, geometry } = metrics;

  // Config line
  console.log(`${COLORS.dim}Config: ${strategy}/${priority} (geometry: ${geometry})${COLORS.reset}`);

  // Timing line
  console.log(`${COLORS.dim}Load: Core ${formatTime(metrics.coreLoadTimeMs)} (${metrics.coreFactCount} facts) | Theory ${formatTime(metrics.theoryLoadTimeMs)} (${metrics.theoryFactCount} facts)${COLORS.reset}`);
  console.log(`${COLORS.dim}Eval: ${formatTime(metrics.totalEvalTimeMs)} total${COLORS.reset}`);

  // Results
  const passColor = summary.failed === 0 ? COLORS.green : COLORS.yellow;
  console.log(`${passColor}Results: ${summary.passed}/${summary.total} passed (${summary.passRate}%)${COLORS.reset}`);

  // Show failures if any
  if (summary.failed > 0) {
    console.log(`${COLORS.red}Failures:${COLORS.reset}`);
    metrics.evalResults
      .filter(r => !r.passed)
      .slice(0, 5)  // Show first 5 failures
      .forEach((r, i) => {
        console.log(`  ${COLORS.red}✗${COLORS.reset} ${r.description?.substring(0, 60)}`);
        if (r.error) console.log(`    ${COLORS.dim}${r.error}${COLORS.reset}`);
      });
    if (summary.failed > 5) {
      console.log(`  ${COLORS.dim}... and ${summary.failed - 5} more${COLORS.reset}`);
    }
  }
}

/**
 * Report comparison across configurations
 */
export function reportComparison(results) {
  console.log();
  console.log(`${COLORS.bold}${COLORS.magenta}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.magenta}Configuration Comparison${COLORS.reset}`);
  console.log(`${COLORS.magenta}${'═'.repeat(80)}${COLORS.reset}`);

  // Header row
  const configs = Object.keys(results);
  const theories = results[configs[0]].map(r => r.theoryName);

  // Print header
  console.log();
  console.log(`${'Theory'.padEnd(20)}${configs.map(c => c.padStart(20)).join('')}`);
  console.log(`${'─'.repeat(20)}${configs.map(() => '─'.repeat(20)).join('')}`);

  // Print each theory's results across configs
  for (const theory of theories) {
    let row = theory.padEnd(20);
    for (const config of configs) {
      const theoryResult = results[config].find(r => r.theoryName === theory);
      if (theoryResult) {
        const { summary, totalEvalTimeMs } = theoryResult;
        const passRate = `${summary.passRate}%`;
        const time = formatTime(totalEvalTimeMs);
        const cell = `${passRate} (${time})`;
        row += cell.padStart(20);
      } else {
        row += 'N/A'.padStart(20);
      }
    }
    console.log(row);
  }

  // Summary row
  console.log(`${'─'.repeat(20)}${configs.map(() => '─'.repeat(20)).join('')}`);

  let summaryRow = 'TOTAL'.padEnd(20);
  for (const config of configs) {
    const configResults = results[config];
    const totalPassed = configResults.reduce((sum, r) => sum + r.summary.passed, 0);
    const totalCases = configResults.reduce((sum, r) => sum + r.summary.total, 0);
    const totalTime = configResults.reduce((sum, r) => sum + r.totalEvalTimeMs, 0);
    const passRate = totalCases > 0 ? (totalPassed / totalCases * 100).toFixed(1) : 0;
    const cell = `${passRate}% (${formatTime(totalTime)})`;
    summaryRow += cell.padStart(20);
  }
  console.log(summaryRow);
}

/**
 * Report global summary
 */
export function reportGlobalSummary(results) {
  console.log();
  console.log(`${COLORS.bold}${COLORS.blue}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}Performance Summary${COLORS.reset}`);
  console.log(`${COLORS.blue}${'═'.repeat(80)}${COLORS.reset}`);

  let totalFacts = 0;
  let totalCases = 0;
  let totalPassed = 0;
  let totalTime = 0;

  for (const [config, theoryResults] of Object.entries(results)) {
    console.log();
    console.log(`${COLORS.bold}${config}${COLORS.reset}`);

    for (const r of theoryResults) {
      totalFacts += r.theoryFactCount;
      totalCases += r.summary.total;
      totalPassed += r.summary.passed;
      totalTime += r.totalEvalTimeMs + r.theoryLoadTimeMs;

      const status = r.summary.failed === 0 ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.yellow}⚠${COLORS.reset}`;
      console.log(`  ${status} ${r.theoryName}: ${r.summary.passed}/${r.summary.total} (${formatTime(r.totalEvalTimeMs)})`);
    }
  }

  console.log();
  console.log(`${COLORS.bold}Totals:${COLORS.reset}`);
  console.log(`  Facts: ${totalFacts.toLocaleString()}`);
  console.log(`  Cases: ${totalCases.toLocaleString()} (${totalPassed} passed, ${totalCases - totalPassed} failed)`);
  console.log(`  Time: ${formatTime(totalTime)}`);

  const overallPassRate = totalCases > 0 ? (totalPassed / totalCases * 100).toFixed(1) : 0;
  const passColor = overallPassRate === '100.0' ? COLORS.green : COLORS.yellow;
  console.log(`  ${passColor}Pass Rate: ${overallPassRate}%${COLORS.reset}`);
}

export default {
  reportTheoryHeader,
  reportTheoryResults,
  reportComparison,
  reportGlobalSummary
};
