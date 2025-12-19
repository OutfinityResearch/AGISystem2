/**
 * Performance Suite - Results Reporter
 * @module performance/lib/reporter
 *
 * Formats and displays performance results with detailed comparisons.
 * Inspired by evalSuite reporter but for larger theory evaluation.
 */

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
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m'
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
 * Format number with K/M suffix
 */
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/**
 * Short config name for display
 */
function shortConfig(config) {
  return config
    .replace('dense-binary', 'dense')
    .replace('sparse-polynomial', 'sparse')
    .replace('metric-affine', 'metric')
    .replace('/symbolicPriority', '/sym')
    .replace('/holographicPriority', '/holo');
}

/**
 * Report header for a theory
 */
export function reportTheoryHeader(theory) {
  console.log();
  console.log(`  ${C.cyan}▶${C.reset} ${C.bold}${theory.name}${C.reset} ${C.dim}(${theory.factCount} DSL, ${theory.cases?.length || 0} cases)${C.reset}`);
}

/**
 * Report final results for a single theory run (compact - progress already shown by runner)
 */
export function reportTheoryResults(metrics) {
  // Runner already shows detailed progress, just show final summary line
  const { summary, totalEvalTimeMs, kbSize, symbolCount, loadErrors } = metrics;
  const rs = summary.reasoningStats || {};

  console.log(`      ${C.dim}─────────────────────────────────────────${C.reset}`);
  console.log(`      ${C.bold}Result:${C.reset} ${summary.passed}/${summary.total} passed ${C.dim}|${C.reset} KB:${kbSize} Sym:${symbolCount} ${C.dim}|${C.reset} KBSc:${formatNum(rs.kbScans||0)} Sim:${formatNum(rs.similarityChecks||0)} ${C.dim}|${C.reset} ${formatTime(totalEvalTimeMs)}`);
}

/**
 * Report comparison across configurations (detailed table like evalSuite)
 */
export function reportComparison(results) {
  console.log();
  console.log(`${C.bold}${C.magenta}${'═'.repeat(140)}${C.reset}`);
  console.log(`${C.bold}${C.magenta}CONFIGURATION COMPARISON${C.reset}`);
  console.log(`${C.magenta}${'═'.repeat(140)}${C.reset}`);
  console.log();

  const configs = Object.keys(results);
  if (configs.length === 0) return;

  const theories = results[configs[0]].map(r => r.theoryName);

  // Legend
  console.log(`${C.dim}┌─ Format: Pass% (time) KB / Sym  |  KBSc = KB scans  Sim = similarity checks${C.reset}`);
  console.log(`${C.dim}└─ KB = facts in knowledge base   Sym = vocabulary symbols${C.reset}`);
  console.log();

  // Calculate column widths
  const theoryColW = 14;
  const dataColW = 24;

  // Header row
  let headerRow = `${C.bold}${'Theory'.padEnd(theoryColW)}${C.reset}`;
  for (const config of configs) {
    headerRow += ` ${C.gray}│${C.reset} ${shortConfig(config).padEnd(dataColW)}`;
  }
  console.log(headerRow);
  console.log(`${C.dim}${'─'.repeat(theoryColW + (dataColW + 3) * configs.length)}${C.reset}`);

  // Track stats for totals
  const configStats = {};
  for (const config of configs) {
    configStats[config] = {
      totalPassed: 0,
      totalCases: 0,
      totalTime: 0,
      totalKB: 0,
      totalSymbols: 0,
      totalKBScans: 0,
      totalSimChecks: 0
    };
  }

  // Track best times per theory
  const bestTimes = {};
  for (const theory of theories) {
    let minTime = Infinity;
    for (const config of configs) {
      const r = results[config].find(r => r.theoryName === theory);
      if (r && r.totalEvalTimeMs < minTime) {
        minTime = r.totalEvalTimeMs;
      }
    }
    bestTimes[theory] = minTime;
  }

  // Theory rows
  for (const theory of theories) {
    const shortName = theory.length > theoryColW - 2 ? theory.substring(0, theoryColW - 4) + '..' : theory;
    let row = shortName.padEnd(theoryColW);

    for (const config of configs) {
      const r = results[config].find(r => r.theoryName === theory);
      if (r) {
        const { summary, totalEvalTimeMs, kbSize, symbolCount } = r;
        const rate = parseFloat(summary.passRate);
        const time = formatTime(totalEvalTimeMs);
        const isBest = totalEvalTimeMs === bestTimes[theory] && configs.length > 1;

        const rs = summary.reasoningStats || {};
        configStats[config].totalPassed += summary.passed;
        configStats[config].totalCases += summary.total;
        configStats[config].totalTime += totalEvalTimeMs;
        configStats[config].totalKB += kbSize;
        configStats[config].totalSymbols += symbolCount;
        configStats[config].totalKBScans += rs.kbScans || 0;
        configStats[config].totalSimChecks += rs.similarityChecks || 0;

        const rateColor = rate === 100 ? C.green : rate >= 50 ? C.yellow : C.red;
        const timeColor = isBest ? C.cyan : C.dim;

        // Format: "100% (25ms) 1.2K/500"
        const kbInfo = `${formatNum(kbSize)}/${formatNum(symbolCount)}`;
        const cell = `${rateColor}${rate.toFixed(0)}%${C.reset} ${timeColor}(${time})${C.reset} ${C.dim}${kbInfo}${C.reset}`;
        row += ` ${C.gray}│${C.reset} ${cell}`;
      } else {
        row += ` ${C.gray}│${C.reset} ${C.dim}N/A${C.reset}`.padEnd(dataColW + 12);
      }
    }
    console.log(row);
  }

  // Separator
  console.log(`${C.dim}${'─'.repeat(theoryColW + (dataColW + 3) * configs.length)}${C.reset}`);

  // Totals row
  let totalsRow = `${C.bold}TOTAL${C.reset}`.padEnd(theoryColW + 9);
  for (const config of configs) {
    const stats = configStats[config];
    const rate = stats.totalCases > 0 ? (stats.totalPassed / stats.totalCases * 100).toFixed(0) : 0;
    const rateColor = rate == 100 ? C.green : rate >= 50 ? C.yellow : C.red;
    const avgKB = theories.length > 0 ? Math.round(stats.totalKB / theories.length) : 0;
    const avgSym = theories.length > 0 ? Math.round(stats.totalSymbols / theories.length) : 0;
    const cell = `${rateColor}${rate}%${C.reset} ${C.dim}(${formatTime(stats.totalTime)}) ${formatNum(avgKB)}/${formatNum(avgSym)}${C.reset}`;
    totalsRow += ` ${C.gray}│${C.reset} ${cell}`;
  }
  console.log(totalsRow);

  console.log();

  // Configuration Totals table (like evalSuite)
  console.log(`${C.bold}${C.cyan}Configuration Totals:${C.reset}`);
  console.log();

  const metricColW = 14;
  const valColW = 22;

  // Header
  let metricHeader = `${'Metric'.padEnd(metricColW)}`;
  for (const config of configs) {
    metricHeader += ` ${C.gray}│${C.reset} ${shortConfig(config).padEnd(valColW)}`;
  }
  console.log(`${C.bold}${metricHeader}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(metricColW + (valColW + 3) * configs.length)}${C.reset}`);

  // Pass Rate row
  let passRow = `${'Pass Rate'.padEnd(metricColW)}`;
  for (const config of configs) {
    const stats = configStats[config];
    const rate = stats.totalCases > 0 ? (stats.totalPassed / stats.totalCases * 100).toFixed(1) : 0;
    const rateColor = rate == 100 ? C.green : rate >= 50 ? C.yellow : C.red;
    const cell = `${rate}% (${stats.totalPassed}/${stats.totalCases})`;
    passRow += ` ${C.gray}│${C.reset} ${rateColor}${cell.padEnd(valColW)}${C.reset}`;
  }
  console.log(passRow);

  // KB Size row (average per theory)
  let kbRow = `${'KB Facts'.padEnd(metricColW)}`;
  for (const config of configs) {
    const stats = configStats[config];
    const avgKB = theories.length > 0 ? Math.round(stats.totalKB / theories.length) : 0;
    const cell = `${formatNum(avgKB)} avg`;
    kbRow += ` ${C.gray}│${C.reset} ${cell.padEnd(valColW)}`;
  }
  console.log(kbRow);

  // Symbols row
  let symRow = `${'Symbols'.padEnd(metricColW)}`;
  for (const config of configs) {
    const stats = configStats[config];
    const avgSym = theories.length > 0 ? Math.round(stats.totalSymbols / theories.length) : 0;
    const cell = `${formatNum(avgSym)} avg`;
    symRow += ` ${C.gray}│${C.reset} ${cell.padEnd(valColW)}`;
  }
  console.log(symRow);

  // KB Scans row
  let scanRow = `${'KB Scans'.padEnd(metricColW)}`;
  for (const config of configs) {
    const stats = configStats[config];
    const cell = formatNum(stats.totalKBScans);
    scanRow += ` ${C.gray}│${C.reset} ${cell.padEnd(valColW)}`;
  }
  console.log(scanRow);

  // Sim Checks row
  let simRow = `${'Sim Checks'.padEnd(metricColW)}`;
  for (const config of configs) {
    const stats = configStats[config];
    const cell = formatNum(stats.totalSimChecks);
    simRow += ` ${C.gray}│${C.reset} ${cell.padEnd(valColW)}`;
  }
  console.log(simRow);

  // Time row
  let timeRow = `${'Time'.padEnd(metricColW)}`;
  for (const config of configs) {
    const stats = configStats[config];
    const cell = formatTime(stats.totalTime);
    timeRow += ` ${C.gray}│${C.reset} ${C.cyan}${cell.padEnd(valColW)}${C.reset}`;
  }
  console.log(timeRow);

  console.log(`${C.dim}${'─'.repeat(metricColW + (valColW + 3) * configs.length)}${C.reset}`);
  console.log();

  // Winners
  if (configs.length > 1) {
    // Best quality (highest pass rate)
    let bestQuality = configs[0];
    let bestQualityRate = configStats[configs[0]].totalCases > 0
      ? configStats[configs[0]].totalPassed / configStats[configs[0]].totalCases * 100
      : 0;

    // Best speed (lowest time)
    let bestSpeed = configs[0];
    let bestSpeedTime = configStats[configs[0]].totalTime;

    for (const config of configs) {
      const stats = configStats[config];
      const rate = stats.totalCases > 0 ? stats.totalPassed / stats.totalCases * 100 : 0;
      if (rate > bestQualityRate) {
        bestQualityRate = rate;
        bestQuality = config;
      }
      if (stats.totalTime < bestSpeedTime) {
        bestSpeedTime = stats.totalTime;
        bestSpeed = config;
      }
    }

    const worstTime = Math.max(...configs.map(c => configStats[c].totalTime));
    const speedup = worstTime > 0 && bestSpeedTime > 0 ? (worstTime / bestSpeedTime).toFixed(1) : 1;

    console.log(`${C.green}★ BEST QUALITY:${C.reset} ${C.bold}${shortConfig(bestQuality)}${C.reset} ${C.dim}(${bestQualityRate.toFixed(1)}% pass rate)${C.reset}`);
    console.log(`${C.cyan}⚡ BEST SPEED:${C.reset}  ${C.bold}${shortConfig(bestSpeed)}${C.reset} ${C.dim}(${formatTime(bestSpeedTime)}, ${speedup}x faster)${C.reset}`);

    if (bestQuality === bestSpeed) {
      console.log();
      console.log(`${C.green}${C.bold}🏆 OVERALL WINNER: ${shortConfig(bestQuality)}${C.reset}`);
    }
  }
}

/**
 * Report global summary (compact)
 */
export function reportGlobalSummary(results) {
  console.log();
  console.log(`${C.bold}${C.blue}${'═'.repeat(140)}${C.reset}`);
  console.log(`${C.bold}${C.blue}PERFORMANCE SUMMARY${C.reset}`);
  console.log(`${C.blue}${'═'.repeat(140)}${C.reset}`);
  console.log();

  let grandTotalKB = 0;
  let grandTotalSymbols = 0;
  let grandTotalCases = 0;
  let grandTotalPassed = 0;
  let grandTotalTime = 0;
  let grandTotalKBScans = 0;
  let grandTotalSimChecks = 0;
  const configCount = Object.keys(results).length;
  const theoryCount = Object.values(results)[0]?.length || 0;

  // Summary per config
  console.log(`${C.bold}Results per configuration:${C.reset}`);
  console.log();

  for (const [config, theoryResults] of Object.entries(results)) {
    let configPassed = 0, configTotal = 0, configTime = 0, configKB = 0, configSym = 0;
    let configKBScans = 0, configSimChecks = 0;

    for (const r of theoryResults) {
      configKB += r.kbSize || 0;
      configSym += r.symbolCount || 0;
      configTotal += r.summary.total;
      configPassed += r.summary.passed;
      configTime += r.totalEvalTimeMs;
      const rs = r.summary.reasoningStats || {};
      configKBScans += rs.kbScans || 0;
      configSimChecks += rs.similarityChecks || 0;
    }

    grandTotalKB += configKB;
    grandTotalSymbols += configSym;
    grandTotalCases += configTotal;
    grandTotalPassed += configPassed;
    grandTotalTime += configTime;
    grandTotalKBScans += configKBScans;
    grandTotalSimChecks += configSimChecks;

    const rate = configTotal > 0 ? (configPassed / configTotal * 100).toFixed(1) : 0;
    const icon = configPassed === configTotal ? `${C.green}✓${C.reset}` : `${C.yellow}⚠${C.reset}`;

    // Progress bar
    const barWidth = 20;
    const filledWidth = configTotal > 0 ? Math.round((configPassed / configTotal) * barWidth) : 0;
    const emptyWidth = barWidth - filledWidth;
    const progressBar = `${C.bgGreen}${' '.repeat(filledWidth)}${C.reset}${C.bgRed}${' '.repeat(emptyWidth)}${C.reset}`;

    const avgKB = theoryResults.length > 0 ? Math.round(configKB / theoryResults.length) : 0;
    console.log(`${icon} ${shortConfig(config).padEnd(16)} [${progressBar}] ${rate}% ${C.dim}(${configPassed}/${configTotal}, ${formatTime(configTime)}, KB:${formatNum(avgKB)} avg)${C.reset}`);
  }

  console.log();
  console.log(`${C.dim}${'─'.repeat(80)}${C.reset}`);
  console.log();

  const avgKB = configCount > 0 && theoryCount > 0 ? Math.round(grandTotalKB / configCount / theoryCount) : 0;
  const avgSymbols = configCount > 0 && theoryCount > 0 ? Math.round(grandTotalSymbols / configCount / theoryCount) : 0;
  const avgCases = configCount > 0 ? Math.round(grandTotalCases / configCount) : 0;
  const overallPassRate = grandTotalCases > 0 ? (grandTotalPassed / grandTotalCases * 100).toFixed(1) : 0;
  const passColor = overallPassRate == 100 ? C.green : C.yellow;

  console.log(`${C.bold}Totals:${C.reset}`);
  console.log(`  Theories tested:       ${C.cyan}${theoryCount}${C.reset}`);
  console.log(`  Configurations tested: ${C.cyan}${configCount}${C.reset}`);
  console.log(`  KB facts (avg):        ${C.cyan}${formatNum(avgKB)}${C.reset}`);
  console.log(`  Vocabulary (avg):      ${C.cyan}${formatNum(avgSymbols)}${C.reset} symbols`);
  console.log(`  Test cases (per cfg):  ${C.cyan}${formatNum(avgCases)}${C.reset}`);
  console.log(`  KB scans total:        ${C.cyan}${formatNum(grandTotalKBScans)}${C.reset}`);
  console.log(`  Similarity checks:     ${C.cyan}${formatNum(grandTotalSimChecks)}${C.reset}`);
  console.log(`  Total eval time:       ${C.cyan}${formatTime(grandTotalTime)}${C.reset}`);
  console.log();
  console.log(`  ${C.bold}Overall pass rate:${C.reset}   ${passColor}${overallPassRate}%${C.reset}`);
  console.log();
}

export default {
  reportTheoryHeader,
  reportTheoryResults,
  reportComparison,
  reportGlobalSummary
};
