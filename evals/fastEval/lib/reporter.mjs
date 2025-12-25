/**
 * EvalSuite - Console Reporter
 * @module evals/fastEval/lib/reporter
 *
 * Color-coded terminal output for evaluation results.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

/**
 * Phase result symbols
 */
const symbols = {
  pass: `${colors.green}\u2713${colors.reset}`,       // ✓
  fail: `${colors.red}\u2717${colors.reset}`,         // ✗
  skip: `${colors.gray}\u25CB${colors.reset}`,        // ○
  timeout: `${colors.yellow}\u29D6${colors.reset}`,   // ⧖
  partial: `${colors.yellow}\u25D1${colors.reset}`    // ◑
};

/**
 * Format a single phase result
 * @param {string} phase - Phase name
 * @param {Object} result - Phase result
 * @returns {string}
 */
function formatPhase(phase, result) {
  if (!result) return `${colors.gray}${phase}:- ${colors.reset}`;

  if (result.skipped) return `${symbols.skip}`;
  if (result.timeout) return `${symbols.timeout}`;
  if (result.passed) return `${symbols.pass}`;
  return `${symbols.fail}`;
}

/**
 * Format case status bar
 * @param {Object} result - Case result with phases
 * @returns {string}
 */
function formatStatusBar(result) {
  const phases = ['nlToDsl', 'reasoning', 'dslToNl'];
  return phases.map(p => formatPhase(p, result.phases?.[p])).join(' ');
}

/**
 * Format test case row
 * @param {number} index - Case index
 * @param {Object} testCase - Test case definition
 * @param {Object} result - Test result
 * @returns {string}
 */
function formatCaseRow(index, testCase, result) {
  const num = String(index + 1).padStart(2, ' ');
  const status = formatStatusBar(result);
  const description = testCase.input_nl?.substring(0, 40) || testCase.description || 'Case ' + (index + 1);
  const truncated = description.length >= 40 ? description + '...' : description;

  const overall = result.passed
    ? `${colors.green}PASS${colors.reset}`
    : `${colors.red}FAIL${colors.reset}`;

  return `  ${colors.dim}${num}${colors.reset} [${status}] ${overall} ${truncated}`;
}

/**
 * Extract suite number from suite directory name (e.g., "suite08_rule_chains" -> "08")
 * @param {string} suiteName - Suite directory name
 * @returns {string} Suite number or empty string
 */
function extractSuiteNumber(suiteName) {
  const match = suiteName?.match(/^suite(\d+)/);
  return match ? match[1] : '';
}

/**
 * Report suite header
 * @param {Object} suite - Suite data
 */
export function reportSuiteHeader(suite) {
  const suiteNum = extractSuiteNumber(suite.suiteName);
  const numDisplay = suiteNum ? ` #${suiteNum}` : '';

  console.log();
  console.log(`${colors.bold}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}Suite: ${suite.name}${numDisplay}${colors.reset}`);
  if (suite.description) {
    console.log(`${colors.dim}${suite.description}${colors.reset}`);
  }
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log();

  // Legend
  console.log(`${colors.dim}Legend: ${symbols.pass} Pass  ${symbols.fail} Fail  ${symbols.skip} Skip  ${symbols.timeout} Timeout${colors.reset}`);
  console.log(`${colors.dim}Phases: [NL\u2192DSL | Reasoning | DSL\u2192NL]${colors.reset}`);
  console.log();
}

/**
 * Report case results as table
 * @param {Array} cases - Test cases
 * @param {Array} results - Test results
 */
export function reportCaseResults(cases, results) {
  console.log(`${colors.bold}Results:${colors.reset}`);
  console.log();

  for (let i = 0; i < cases.length; i++) {
    console.log(formatCaseRow(i, cases[i], results[i] || { passed: false }));
  }

  console.log();
}

/**
 * Report suite summary
 * @param {Object} summary - Summary stats
 * @param {Array} cases - Test cases for additional statistics
 */
export function reportSuiteSummary(summary, cases = []) {
  const { total, passed, failed, partialPass } = summary;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const barWidth = 40;
  const filledWidth = Math.round((passed / total) * barWidth);
  const partialWidth = Math.round((partialPass / total) * barWidth);
  const emptyWidth = barWidth - filledWidth - partialWidth;

  const progressBar =
    `${colors.bgGreen}${' '.repeat(filledWidth)}${colors.reset}` +
    `${colors.bgYellow}${' '.repeat(partialWidth)}${colors.reset}` +
    `${colors.bgRed}${' '.repeat(emptyWidth)}${colors.reset}`;

  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  [${progressBar}] ${pct}%`);
  console.log();
  console.log(`  ${colors.green}Passed:${colors.reset}  ${passed}/${total}`);
  if (partialPass > 0) {
    console.log(`  ${colors.yellow}Partial:${colors.reset} ${partialPass}/${total}`);
  }
  console.log(`  ${colors.red}Failed:${colors.reset}  ${failed}/${total}`);
  console.log();
}

/**
 * Report phase failure details
 * @param {number} index - Case index
 * @param {Object} result - Case result
 */
export function reportFailureDetails(index, result) {
  if (result.passed) return;

  console.log(`${colors.dim}--- Case ${index + 1} Details ---${colors.reset}`);

  for (const [phase, phaseResult] of Object.entries(result.phases || {})) {
    if (!phaseResult.passed && !phaseResult.skipped) {
      console.log(`  ${colors.red}${phase}:${colors.reset}`);
      if (phaseResult.error) {
        console.log(`    Error: ${phaseResult.error}`);
      }
      if (phaseResult.expected !== undefined) {
        console.log(`    Expected: ${colors.green}${phaseResult.expected}${colors.reset}`);
        console.log(`    Actual:   ${colors.red}${phaseResult.actual}${colors.reset}`);
      }
    }
  }
  console.log();
}

/**
 * Report compact expected vs actual pairs for failed cases
 * (single-line per failing phase with available comparison)
 */
export function reportFailureComparisons(cases, results, context = {}) {
  const mismatches = [];

  results.forEach((res, idx) => {
    if (res.passed) return;

    for (const [phaseName, phase] of Object.entries(res.phases || {})) {
      if (phase?.expected !== undefined && phase?.actual !== undefined && !phase.passed) {
        mismatches.push({
          caseNum: idx + 1,
          phaseName,
          expected: phase.expected,
          actual: phase.actual
        });
      }
    }
  });

  if (mismatches.length === 0) return;

  const suiteLabel = context.suiteName ? `${context.suiteName}${context.strategyId ? ' (' + context.strategyId + (context.reasoningPriority ? '/' + context.reasoningPriority : '') + ')' : ''}` : '';
  if (suiteLabel) {
    console.log(`${colors.yellow}${colors.bold}Failure diffs for ${suiteLabel}:${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${colors.bold}Failure diffs:${colors.reset}`);
  }

  mismatches.forEach(m => {
    const desc = cases?.[m.caseNum - 1]?.input_nl || `Case ${m.caseNum}`;
    console.log(`${colors.dim}Case ${m.caseNum}${colors.reset} [${m.phaseName}] ${colors.dim}${desc}${colors.reset}`);
    console.log(`  Expected: ${colors.green}${m.expected}${colors.reset}`);
    console.log(`  Actual:   ${colors.red}${m.actual}${colors.reset}`);
    console.log();
  });
}

/**
 * Format number with K/M suffix for large values
 */
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/**
 * Report global summary across all suites
 * @param {Array} suiteResults - Results from all suites
 */
export function reportGlobalSummary(suiteResults) {
  console.log();
  console.log(`${colors.bold}${colors.magenta}${'='.repeat(120)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}EVALUATION COMPLETE${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(120)}${colors.reset}`);
  console.log();

  let totalCases = 0;
  let totalPassed = 0;
  let totalPartial = 0;

  // Aggregate reasoning stats across all suites
  const aggregatedStats = {
    queries: 0,
    proofs: 0,
    kbScans: 0,
    similarityChecks: 0,
    ruleAttempts: 0,
    transitiveSteps: 0,
    minProofDepth: Infinity,  // Track minimum across all suites
    maxProofDepth: 0,
    totalProofSteps: 0,
    // HDC usefulness stats (across both engines)
    hdcOps: 0,         // "asked": HDC query/proof operations attempted
    hdcUsefulOps: 0,   // "used": final method was HDC-based
    methods: {},
    operations: {}
  };

  // Table header with clear separation and legend
  console.log(`${colors.bold}${colors.cyan}Suite Results:${colors.reset}`);
  console.log();
  console.log(`${colors.dim}┌─ EXPECTED: counted from test case definitions (action field in cases.mjs)${colors.reset}`);
  console.log(`${colors.dim}│  L = learn cases    Q = query cases    P = prove cases${colors.reset}`);
  console.log(`${colors.dim}│${colors.reset}`);
  console.log(`${colors.dim}└─ RUNTIME: operation counts during reasoning (K = thousands, e.g., 2.0K = 2000)${colors.reset}`);
  console.log(`${colors.dim}   KBSc = KB fact iterations (expensive)   Sim = HDC similarity checks (O(n) each)${colors.reset}`);
  console.log(`${colors.dim}   Tr   = transitive chain steps           Rl  = rule inference attempts${colors.reset}`);
  console.log(`${colors.dim}   M/D  = min/max proof depth              Avg/Steps = avg steps, total steps${colors.reset}`);
  console.log(`${colors.dim}   HDC% = % of HDC ops that produced the final answer (best method = hdc*)${colors.reset}`);
  console.log(`${colors.dim}   HDC  = useful/asked count (e.g., 29/49)${colors.reset}`);
  console.log();
  console.log(`${colors.dim}${'─'.repeat(142)}${colors.reset}`);
  console.log(`${colors.bold}` +
    `${'Suite'.padEnd(25)}` +
    `${'Pass'.padStart(6)}` +
    `${'Tests'.padStart(8)}` +
    ` ${colors.gray}│${colors.reset}` +
    `${'L'.padStart(4)}` +
    `${'Q'.padStart(4)}` +
    `${'P'.padStart(4)}` +
    ` ${colors.gray}│${colors.reset}` +
    `${'KBSc'.padStart(7)}` +
    `${'Sim'.padStart(7)}` +
    `${'Tr'.padStart(5)}` +
    `${'Rl'.padStart(5)}` +
    `${'M'.padStart(4)}` +
    `${'D'.padStart(4)}` +
    `${'Avg'.padStart(5)}` +
    `${'Steps'.padStart(6)}` +
    ` ${colors.gray}│${colors.reset}` +
    `${'HDC%'.padStart(6)}` +
    `${'HDC'.padStart(10)}` +
    `${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(142)}${colors.reset}`);

  for (const suite of suiteResults) {
    totalCases += suite.summary.total;
    totalPassed += suite.summary.passed;
    totalPartial += suite.summary.partialPass || 0;

    // Aggregate reasoning stats
    const stats = suite.summary.reasoningStats || {};
    aggregatedStats.queries += stats.queries || 0;
    aggregatedStats.proofs += stats.proofs || 0;
    aggregatedStats.kbScans += stats.kbScans || 0;
    aggregatedStats.similarityChecks += stats.similarityChecks || 0;
    aggregatedStats.ruleAttempts += stats.ruleAttempts || 0;
    aggregatedStats.transitiveSteps += stats.transitiveSteps || 0;
    aggregatedStats.totalProofSteps += stats.totalProofSteps || 0;
    if ((stats.maxProofDepth || 0) > aggregatedStats.maxProofDepth) {
      aggregatedStats.maxProofDepth = stats.maxProofDepth;
    }
    // Track minimum proof depth (only if > 0, since 0 means no valid proofs)
    const suiteMin = stats.minProofDepth || 0;
    if (suiteMin > 0 && suiteMin < aggregatedStats.minProofDepth) {
      aggregatedStats.minProofDepth = suiteMin;
    }
    for (const [method, count] of Object.entries(stats.methods || {})) {
      aggregatedStats.methods[method] = (aggregatedStats.methods[method] || 0) + count;
    }
    for (const [op, count] of Object.entries(stats.operations || {})) {
      aggregatedStats.operations[op] = (aggregatedStats.operations[op] || 0) + count;
    }
    const askedOps = (stats.queries || 0) + (stats.proofs || 0);
    aggregatedStats.hdcOps += askedOps;
    aggregatedStats.hdcUsefulOps += stats.hdcUsefulOps || 0;

    const pct = suite.summary.total > 0
      ? Math.floor((suite.summary.passed / suite.summary.total) * 100)
      : 0;

    const statusColor = pct === 100 ? colors.green : pct >= 50 ? colors.yellow : colors.red;

    const suiteNum = extractSuiteNumber(suite.suiteName);
    const numDisplay = suiteNum ? `#${suiteNum} ` : '';
    const maxNameLen = 20;
    const shortName = suite.name.length > maxNameLen ? suite.name.substring(0, maxNameLen - 2) + '..' : suite.name;
    const displayName = `${numDisplay}${shortName}`;

    // Calculate action type counts for this suite
    const suiteActionCounts = { learn: 0, query: 0, prove: 0 };

    if (suite.cases) {
      for (const testCase of suite.cases) {
        if (testCase.action) {
          suiteActionCounts[testCase.action] = (suiteActionCounts[testCase.action] || 0) + 1;
        }
      }
    }

    const hdcAsked = (stats.queries || 0) + (stats.proofs || 0);
    const hdcUsed = stats.hdcUsefulOps || 0;
    const hdcPct = hdcAsked > 0 ? Math.floor((hdcUsed / hdcAsked) * 100) : 0;
    const hdcStr = hdcAsked > 0 ? `${hdcPct}%` : '-';
    const hdcCountStr = hdcAsked > 0 ? `${hdcUsed}/${hdcAsked}` : '-';

    console.log(
      `${displayName.padEnd(25)}` +
      `${statusColor}${(pct + '%').padStart(6)}${colors.reset}` +
      `${colors.dim}${String(suite.summary.passed + '/' + suite.summary.total).padStart(8)}${colors.reset}` +
      ` ${colors.gray}│${colors.reset}` +
      `${String(suiteActionCounts.learn || 0).padStart(4)}` +
      `${String(suiteActionCounts.query || 0).padStart(4)}` +
      `${String(suiteActionCounts.prove || 0).padStart(4)}` +
      ` ${colors.gray}│${colors.reset}` +
      `${formatNum(stats.kbScans || 0).padStart(7)}` +
      `${formatNum(stats.similarityChecks || 0).padStart(7)}` +
      `${String(stats.transitiveSteps || 0).padStart(5)}` +
      `${String(stats.ruleAttempts || 0).padStart(5)}` +
      `${String(stats.minProofDepth || 0).padStart(4)}` +
      `${String(stats.maxProofDepth || 0).padStart(4)}` +
      `${String(stats.avgProofLength || 0).padStart(5)}` +
      `${String(stats.totalProofSteps || 0).padStart(6)}` +
      ` ${colors.gray}│${colors.reset}` +
      `${hdcStr.padStart(6)}` +
      `${hdcCountStr.padStart(10)}`
    );
  }

  console.log(`${colors.dim}${'─'.repeat(142)}${colors.reset}`);

  // Totals row
  const overallPct = totalCases > 0 ? Math.floor((totalPassed / totalCases) * 100) : 0;
  const overallColor = overallPct === 100 ? colors.green : overallPct >= 50 ? colors.yellow : colors.red;
  const avgProofLen = aggregatedStats.proofs > 0
    ? (aggregatedStats.totalProofSteps / aggregatedStats.proofs).toFixed(1)
    : '0';
  // Convert Infinity to 0 for display
  const globalMinDepth = aggregatedStats.minProofDepth === Infinity ? 0 : aggregatedStats.minProofDepth;

  // Calculate global action type counts
  const globalActionCounts = { learn: 0, query: 0, prove: 0 };

  for (const suite of suiteResults) {
    if (suite.cases) {
      for (const testCase of suite.cases) {
        if (testCase.action) {
          globalActionCounts[testCase.action] = (globalActionCounts[testCase.action] || 0) + 1;
        }
      }
    }
  }

  const totalHdcPct = aggregatedStats.hdcOps > 0
    ? Math.floor((aggregatedStats.hdcUsefulOps / aggregatedStats.hdcOps) * 100)
    : 0;
  const totalHdcStr = aggregatedStats.hdcOps > 0 ? `${totalHdcPct}%` : '-';
  const totalHdcCountStr = aggregatedStats.hdcOps > 0
    ? `${aggregatedStats.hdcUsefulOps}/${aggregatedStats.hdcOps}`
    : '-';

  console.log(`${colors.bold}` +
    `${'TOTAL'.padEnd(25)}` +
    `${overallColor}${(overallPct + '%').padStart(6)}${colors.reset}` +
    `${colors.bold}${String(totalPassed + '/' + totalCases).padStart(8)}${colors.reset}` +
    ` ${colors.gray}│${colors.reset}` +
    `${colors.cyan}${String(globalActionCounts.learn).padStart(4)}${colors.reset}` +
    `${colors.cyan}${String(globalActionCounts.query).padStart(4)}${colors.reset}` +
    `${colors.cyan}${String(globalActionCounts.prove).padStart(4)}${colors.reset}` +
    ` ${colors.gray}│${colors.reset}` +
    `${colors.cyan}${formatNum(aggregatedStats.kbScans).padStart(7)}${colors.reset}` +
    `${colors.cyan}${formatNum(aggregatedStats.similarityChecks).padStart(7)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.transitiveSteps).padStart(5)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.ruleAttempts).padStart(5)}${colors.reset}` +
    `${colors.cyan}${String(globalMinDepth).padStart(4)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.maxProofDepth).padStart(4)}${colors.reset}` +
    `${colors.cyan}${avgProofLen.padStart(5)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.totalProofSteps).padStart(6)}${colors.reset}` +
    ` ${colors.gray}│${colors.reset}` +
    `${colors.cyan}${totalHdcStr.padStart(6)}${colors.reset}` +
    `${colors.cyan}${totalHdcCountStr.padStart(10)}${colors.reset}`
  );
  console.log(`${colors.dim}${'─'.repeat(142)}${colors.reset}`);
  console.log();

  // Score
  console.log(`${colors.bold}Score: ${overallColor}${overallPct}%${colors.reset}  ` +
    `${colors.dim}(${totalPassed} passed, ${totalCases - totalPassed} failed)${colors.reset}`);
  console.log();

}

/**
 * Report methods and operations in compact format
 */
function reportMethodsAndOps(stats) {
  const hasStats = Object.keys(stats.methods).length > 0 || Object.keys(stats.operations).length > 0;
  if (!hasStats) return;

  console.log(`${colors.bold}${colors.cyan}Reasoning Methods:${colors.reset}`);
  if (Object.keys(stats.methods).length > 0) {
    const methodsStr = Object.entries(stats.methods)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m.replace(/_/g, ' ')}:${c}`)
      .join('  ');
    console.log(`  ${colors.dim}${methodsStr}${colors.reset}`);
  }

  console.log();
  console.log(`${colors.bold}${colors.cyan}Operations:${colors.reset}`);
  if (Object.keys(stats.operations).length > 0) {
    const opsStr = Object.entries(stats.operations)
      .sort((a, b) => b[1] - a[1])
      .map(([o, c]) => `${o.replace(/_/g, ' ')}:${c}`)
      .join('  ');
    console.log(`  ${colors.dim}${opsStr}${colors.reset}`);
  }
  console.log();
}

/**
 * Report multi-strategy comparison with conclusions
 * @param {Object} resultsByStrategy - Map of strategyId -> suite results
 */
export function reportMultiStrategyComparison(resultsByStrategy) {
  console.log();
  console.log(`${colors.bold}${colors.magenta}${'═'.repeat(120)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}MULTI-STRATEGY COMPARISON${colors.reset}`);
  console.log(`${colors.magenta}${'═'.repeat(120)}${colors.reset}`);
  console.log();

  const strategies = Object.keys(resultsByStrategy);
  if (strategies.length < 2) {
    console.log(`${colors.dim}Only one strategy - no comparison available.${colors.reset}`);
    return;
  }

  // Build comparison data per suite
  const suiteComparison = {};
  const suiteSummaries = {};

  for (const strategyId of strategies) {
    for (const suiteResult of resultsByStrategy[strategyId]) {
      const suiteKey = suiteResult.suiteName;
      if (!suiteComparison[suiteKey]) {
        suiteComparison[suiteKey] = { name: suiteResult.name };
        suiteSummaries[suiteKey] = {};
      }
      suiteSummaries[suiteKey][strategyId] = suiteResult.summary;
    }
  }

  // Shorten strategy names for display (use + instead of / to avoid confusion with value separators)
  const shortStrategyName = (id) => {
    const parts = id.split('/');
    const strategyId = parts[0] || id;
    const geometry = parts.length === 3 ? parts[1] : null;
    const priorityId = parts.length === 3 ? parts[2] : parts[1];
    const strategyLabel = strategyId
      .replace('dense-binary', 'dense')
      .replace('sparse-polynomial', 'sparse')
      .replace('metric-affine', 'metric');
    const priorityLabel = (priorityId || '')
      .replace('symbolicPriority', 'symb')
      .replace('holographicPriority', 'holo');
    const geometryLabel = geometry ? `(${geometry})` : '';
    return `${strategyLabel}${geometryLabel}+${priorityLabel}`;
  };

  // Aggregated stats per strategy for final comparison
  const strategyTotals = {};
  for (const strategyId of strategies) {
    strategyTotals[strategyId] = {
      passed: 0,
      total: 0,
      hdcSuccesses: 0,
      hdcTotal: 0,
      kbScans: 0,
      simChecks: 0,
      totalSteps: 0,
      totalMs: 0,
      // Failure breakdown by phase
      failedReasoning: 0,    // reasoning phase failed
      failedNlTranslation: 0, // reasoning passed but dslToNl failed
      failedNlParsing: 0      // nlToDsl failed (parser issues)
    };
  }

  // Build map of suite results for phase failure analysis
  const suiteResultsMap = {};
  for (const strategyId of strategies) {
    for (const suiteResult of resultsByStrategy[strategyId]) {
      const suiteKey = suiteResult.suiteName;
      if (!suiteResultsMap[suiteKey]) suiteResultsMap[suiteKey] = {};
      suiteResultsMap[suiteKey][strategyId] = suiteResult.results || [];
    }
  }

  for (const [suiteKey] of Object.entries(suiteComparison)) {
    for (const strategyId of strategies) {
      const summary = suiteSummaries[suiteKey][strategyId];
      if (!summary) continue;

      const stats = summary.reasoningStats || {};
      const durationMs = summary.durationMs || 0;
      const hdcUsed = stats.hdcUsefulOps || 0;
      const hdcTot = (stats.queries || 0) + (stats.proofs || 0);
      const scans = stats.kbScans || 0;

      strategyTotals[strategyId].passed += summary.passed;
      strategyTotals[strategyId].total += summary.total;
      strategyTotals[strategyId].hdcSuccesses += hdcUsed;
      strategyTotals[strategyId].hdcTotal += hdcTot;
      strategyTotals[strategyId].kbScans += scans;
      strategyTotals[strategyId].simChecks += stats.similarityChecks || 0;
      strategyTotals[strategyId].totalMs += durationMs;

      const results = suiteResultsMap[suiteKey]?.[strategyId] || [];
      for (const res of results) {
        if (res.passed) continue;
        const phases = res.phases || {};
        if (!phases.nlToDsl?.passed && !phases.nlToDsl?.skipped) {
          strategyTotals[strategyId].failedNlParsing++;
        } else if (!phases.reasoning?.passed && !phases.reasoning?.skipped) {
          strategyTotals[strategyId].failedReasoning++;
        } else if (!phases.dslToNl?.passed && !phases.dslToNl?.skipped) {
          strategyTotals[strategyId].failedNlTranslation++;
        }
      }
    }
  }

  const orderedStrategies = [...strategies].sort((a, b) => strategyTotals[a].totalMs - strategyTotals[b].totalMs);

  // Comparison table header
  console.log(`${colors.bold}${colors.cyan}Per-Configuration Comparison:${colors.reset}`);
  console.log();
  console.log(`${colors.dim}Format: Pass%  KB / Sim  Time${colors.reset}`);

  const ANSI_RE = /\x1b\[[0-9;]*m/g;
  const visibleLen = (text) => String(text || '').replace(ANSI_RE, '').length;
  const padAnsiRight = (text, width) => {
    const value = String(text || '');
    const len = visibleLen(value);
    if (len >= width) return value;
    return value + ' '.repeat(width - len);
  };

  // Build header row - each cell width to match data
  // Data format: "100%  12K / 5K    23ms" = 24 chars
  const dataColW = 24;
  let headerRow = `${'Suite'.padEnd(18)}`;
  for (const strategyId of orderedStrategies) {
    const shortNameRaw = shortStrategyName(strategyId);
    const shortName = shortNameRaw.length > dataColW
      ? shortNameRaw.substring(0, Math.max(0, dataColW - 2)) + '..'
      : shortNameRaw;
    headerRow += ` ${colors.gray}│${colors.reset} ${shortName.padEnd(dataColW)}`;
  }
  console.log(`${colors.bold}${headerRow}${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(18 + (dataColW + 3) * orderedStrategies.length)}${colors.reset}`);

  // Print each suite row
  for (const [suiteKey, comp] of Object.entries(suiteComparison)) {
    const suiteNum = suiteKey.match(/^suite(\d+)/)?.[1] || '';
    const numDisplay = suiteNum ? `#${suiteNum} ` : '';
    const shortName = comp.name.length > 12 ? comp.name.substring(0, 10) + '..' : comp.name;
    const displayName = `${numDisplay}${shortName}`;

    let row = `${displayName.padEnd(18)}`;

    for (const strategyId of orderedStrategies) {
      const summary = suiteSummaries[suiteKey][strategyId];
      if (!summary) {
        row += ` ${colors.gray}│${colors.reset} ${padAnsiRight('N/A', dataColW)}`;
        continue;
      }

      const pct = summary.total > 0 ? Math.floor((summary.passed / summary.total) * 100) : 0;
      const stats = summary.reasoningStats || {};
      const durationMs = summary.durationMs || 0;

      // kbScans is the real measure of reasoning work (fact iterations)
      const scans = stats.kbScans || 0;

      const statusColor = pct === 100 ? colors.green : pct >= 50 ? colors.yellow : colors.red;
      // Format: "100%  12K / 5K   23ms"
      const simChecks = stats.similarityChecks || 0;
      const kbStr = scans >= 1000 ? (scans / 1000).toFixed(0) + 'K' : String(scans);
      const simStr = simChecks >= 1000 ? (simChecks / 1000).toFixed(0) + 'K' : String(simChecks);
      const opsStr = `${kbStr.padStart(4)} / ${simStr.padEnd(4)}`;
      const cell = `${statusColor}${String(pct).padStart(3)}%${colors.reset}  ${opsStr}  ${String(durationMs).padStart(3)}ms`;
      row += ` ${colors.gray}│${colors.reset} ${padAnsiRight(cell, dataColW)}`;
    }

    console.log(row);
  }

  console.log(`${colors.dim}${'─'.repeat(18 + (dataColW + 3) * orderedStrategies.length)}${colors.reset}`);
  console.log();

  // Overall conclusions as compact table
  console.log(`${colors.bold}${colors.cyan}Configuration Totals:${colors.reset}`);
  console.log();

  // Column width for each strategy (must fit "100% (182/182)" = 14 chars + padding)
  const colW = 18;

  // Header row
  let conclusionHeader = `${'Metric'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    conclusionHeader += ` ${colors.gray}│${colors.reset} ${shortStrategyName(strategyId).padEnd(colW)}`;
  }
  console.log(`${colors.bold}${conclusionHeader}${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(12 + (colW + 3) * orderedStrategies.length)}${colors.reset}`);

  // Pass Rate row
  let passRow = `${'Pass Rate'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    const totals = strategyTotals[strategyId];
    const pct = totals.total > 0 ? Math.floor((totals.passed / totals.total) * 100) : 0;
    const statusColor = pct === 100 ? colors.green : pct >= 50 ? colors.yellow : colors.red;
    const cellContent = `${pct}% (${totals.passed}/${totals.total})`.padEnd(colW);
    passRow += ` ${colors.gray}│${colors.reset} ${statusColor}${cellContent}${colors.reset}`;
  }
  console.log(passRow);

  // HDC% row
  let hdcRow = `${'HDC%'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    const totals = strategyTotals[strategyId];
    const hasHdc = totals.hdcTotal > 0;
    const hdcPct = hasHdc ? Math.floor((totals.hdcSuccesses / totals.hdcTotal) * 100) : 0;
    const hdcColor = hasHdc && hdcPct >= 50 ? colors.cyan : colors.dim;
    const cellContent = hasHdc
      ? `${hdcPct}% (${totals.hdcSuccesses}/${totals.hdcTotal})`.padEnd(colW)
      : '-'.padEnd(colW);
    hdcRow += ` ${colors.gray}│${colors.reset} ${hdcColor}${cellContent}${colors.reset}`;
  }
  console.log(hdcRow);

  // HDC Ops row (raw total count of HDC operations asked)
  let hdcOpsRow = `${'HDC Ops'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    const totals = strategyTotals[strategyId];
    const hasHdc = totals.hdcTotal > 0;
    const cellContent = hasHdc ? String(totals.hdcTotal).padEnd(colW) : '-'.padEnd(colW);
    hdcOpsRow += ` ${colors.gray}│${colors.reset} ${colors.dim}${cellContent}${colors.reset}`;
  }
  console.log(hdcOpsRow);

  // KB Scans row
  let scansRow = `${'KB Scans'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    const totals = strategyTotals[strategyId];
    const cellContent = formatNum(totals.kbScans).padEnd(colW);
    scansRow += ` ${colors.gray}│${colors.reset} ${cellContent}`;
  }
  console.log(scansRow);

  // Sim Checks row
  let simRow = `${'Sim Checks'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    const totals = strategyTotals[strategyId];
    const cellContent = formatNum(totals.simChecks).padEnd(colW);
    simRow += ` ${colors.gray}│${colors.reset} ${cellContent}`;
  }
  console.log(simRow);

  // Time row
  let timeRow = `${'Time'.padEnd(12)}`;
  for (const strategyId of orderedStrategies) {
    const totals = strategyTotals[strategyId];
    const cellContent = (totals.totalMs + 'ms').padEnd(colW);
    timeRow += ` ${colors.gray}│${colors.reset} ${colors.cyan}${cellContent}${colors.reset}`;
  }
  console.log(timeRow);

  // Check if there are any failures to show breakdown
  const hasAnyFailures = orderedStrategies.some(s => {
    const t = strategyTotals[s];
    return t.failedReasoning > 0 || t.failedNlTranslation > 0 || t.failedNlParsing > 0;
  });

  if (hasAnyFailures) {
    // Separator before failure breakdown
    console.log(`${colors.dim}${'─'.repeat(12 + (colW + 3) * orderedStrategies.length)}${colors.reset}`);
    console.log(`${colors.dim}Failure breakdown (% of total tests):${colors.reset}`);

    // Fail Reasoning row (% of total)
    let failReasonRow = `${'Fail Reason'.padEnd(12)}`;
    for (const strategyId of orderedStrategies) {
      const totals = strategyTotals[strategyId];
      const pct = totals.total > 0 ? Math.round((totals.failedReasoning / totals.total) * 100) : 0;
      const cellContent = (pct > 0 ? `${pct}%` : '-').padEnd(colW);
      const cellColor = pct > 0 ? colors.red : colors.dim;
      failReasonRow += ` ${colors.gray}│${colors.reset} ${cellColor}${cellContent}${colors.reset}`;
    }
    console.log(failReasonRow);

    // Fail NL Output row (% of total)
    let failNlOutRow = `${'Fail NL Out'.padEnd(12)}`;
    for (const strategyId of orderedStrategies) {
      const totals = strategyTotals[strategyId];
      const pct = totals.total > 0 ? Math.round((totals.failedNlTranslation / totals.total) * 100) : 0;
      const cellContent = (pct > 0 ? `${pct}%` : '-').padEnd(colW);
      const cellColor = pct > 0 ? colors.yellow : colors.dim;
      failNlOutRow += ` ${colors.gray}│${colors.reset} ${cellColor}${cellContent}${colors.reset}`;
    }
    console.log(failNlOutRow);

    // Fail NL Parse row (% of total)
    let failNlParseRow = `${'Fail Parse'.padEnd(12)}`;
    for (const strategyId of orderedStrategies) {
      const totals = strategyTotals[strategyId];
      const pct = totals.total > 0 ? Math.round((totals.failedNlParsing / totals.total) * 100) : 0;
      const cellContent = (pct > 0 ? `${pct}%` : '-').padEnd(colW);
      const cellColor = pct > 0 ? colors.magenta : colors.dim;
      failNlParseRow += ` ${colors.gray}│${colors.reset} ${cellColor}${cellContent}${colors.reset}`;
    }
    console.log(failNlParseRow);
  }

  console.log(`${colors.dim}${'─'.repeat(12 + (colW + 3) * orderedStrategies.length)}${colors.reset}`);

  // Speed comparison
  const times = orderedStrategies.map(s => ({ id: s, ms: strategyTotals[s].totalMs }));
  times.sort((a, b) => a.ms - b.ms);
  const fastest = times[0];
  const slowest = times[times.length - 1];
  const speedup = slowest.ms > 0 ? (slowest.ms / fastest.ms).toFixed(1) : 1;

  console.log(`${colors.bold}${colors.cyan}Performance:${colors.reset} ${shortStrategyName(fastest.id)} is ${speedup}x faster (${fastest.ms}ms vs ${slowest.ms}ms)`);
  console.log();
}

export default {
  reportSuiteHeader,
  reportCaseResults,
  reportSuiteSummary,
  reportFailureDetails,
  reportFailureComparisons,
  reportGlobalSummary,
  reportMultiStrategyComparison
};
