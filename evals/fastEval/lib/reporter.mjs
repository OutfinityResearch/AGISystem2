/**
 * EvalSuite - Console Reporter
 * @module evals/fastEval/lib/reporter
 *
 * Color-coded terminal output for evaluation results.
 */

import { getStrategy } from '../../../src/hdc/facade.mjs';

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

  reportMethodsAndOps(aggregatedStats);
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
    const parts = String(id).split('/');
    const strategyId = parts[0] || id;
    const modeRaw = (parts.length === 3 && strategyId === 'exact') ? parts[1] : null;
    const geometryRaw = (parts.length === 3 && strategyId !== 'exact') ? parts[1] : null;
    const priorityId = parts.length === 3 ? parts[2] : parts[1];

    const priorityLabel = (priorityId || '')
      .replace('symbolicPriority', 'symb')
      .replace('holographicPriority', 'holo');

    const strategyLabel = strategyId
      .replace('dense-binary', 'dense')
      .replace('sparse-polynomial', 'sparse')
      .replace('metric-affine-elastic', 'metric-elastic')
      .replace('metric-affine', 'metric');

    if (strategyId === 'exact') {
      const mode = String(modeRaw || 'A').trim().toUpperCase();
      return `${strategyLabel}(${mode})+${priorityLabel}`;
    }

    const geometry = geometryRaw && !Number.isNaN(Number(geometryRaw)) ? Number(geometryRaw) : null;
    if (geometry === null) return `${strategyLabel}+${priorityLabel}`;

    let bytes = null;
    try {
      const strategy = getStrategy(strategyId);
      bytes = strategy?.properties?.bytesPerVector?.(geometry) ?? null;
    } catch {
      bytes = null;
    }

    const geometryLabel = (() => {
      // Display rule:
      // - sparse: show both k and total bytes (k,B)
      // - others: show only total bytes (B)
      if (strategyId === 'dense-binary') {
        const totalBytes = bytes !== null ? bytes : (Number.isFinite(geometry) ? Math.ceil(geometry / 8) : null);
        if (totalBytes !== null) return `(${totalBytes}B)`;
        return `(${geometry}b)`;
      }
      if (strategyId === 'sparse-polynomial') {
        if (bytes !== null) return `(k${geometry},${bytes}B)`;
        return `(k${geometry})`;
      }
      if (bytes !== null) return `(${bytes}B)`;
      return `(${geometry})`;
    })();

    return `${strategyLabel}${geometryLabel}+${priorityLabel}`;
  };

  function computeColumnWidth(strategyIds) {
    const minW = 18;
    const headerW = Math.max(...strategyIds.map(s => shortStrategyName(s).length));
    const exampleCellW = Math.max(
      '100% (9999/9999)'.length,
      '100% (9999/9999)'.length,
      '100%'.length,
      '-'.length
    );
    return Math.max(minW, headerW, exampleCellW) + 1;
  }

  // Aggregated stats per strategy for final comparison
  const strategyTotals = {};
  for (const strategyId of strategies) {
    strategyTotals[strategyId] = {
      passed: 0,
      total: 0,
      // HDC utilization metrics:
      // - hdcTotal: total query+prove ops executed
      // - hdcTried: ops where an HDC attempt was made (Master Equation / HDC-first engines)
      // - hdcValidated: ops where HDC produced at least one acceptable result (validated or trusted)
      // - hdcFinal: ops where the final chosen method was HDC-based (method starts with "hdc")
      hdcTotal: 0,
      hdcTried: 0,
      hdcValidated: 0,
      hdcFinal: 0,
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
      const hdcFinal = stats.hdcUsefulOps || 0;
      const hdcTot = (stats.queries || 0) + (stats.proofs || 0);
      const scans = stats.kbScans || 0;

      strategyTotals[strategyId].passed += summary.passed;
      strategyTotals[strategyId].total += summary.total;
      strategyTotals[strategyId].hdcFinal += hdcFinal;
      strategyTotals[strategyId].hdcTotal += hdcTot;

      // Tried/validated are counted from engine-specific stats.
      // Note: in symbolicPriority, QueryEngine may still attempt HDC Master Equation (hdcQueries/hdcSuccesses).
      // In holographicPriority, HDC-first engines use hdcUnbindAttempts/holographicQueryHdcSuccesses + holographicProofs/hdcProofSuccesses.
      const tried =
        (stats.hdcQueries || 0) +
        (stats.hdcUnbindAttempts || 0) +
        (stats.holographicProofs || 0);
      const validated =
        (stats.hdcSuccesses || 0) +
        (stats.holographicQueryHdcSuccesses || 0) +
        (stats.hdcProofSuccesses || 0);

      strategyTotals[strategyId].hdcTried += tried;
      strategyTotals[strategyId].hdcValidated += validated;

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
  console.log(`${colors.dim}Format: Pass%  KB/Sim  t(ms)${colors.reset}`);

  const ANSI_RE = /\x1b\[[0-9;]*m/g;
  const visibleLen = (text) => String(text || '').replace(ANSI_RE, '').length;
  const padAnsiRight = (text, width) => {
    const value = String(text || '');
    const len = visibleLen(value);
    if (len >= width) return value;
    return value + ' '.repeat(width - len);
  };
  const padAnsiLeft = (text, width) => {
    const value = String(text || '');
    const len = visibleLen(value);
    if (len >= width) return value;
    return ' '.repeat(width - len) + value;
  };

  const suiteKeysOrdered = Object.keys(suiteComparison).sort((a, b) => {
    const an = Number(a.match(/^suite(\d+)/)?.[1] || 0);
    const bn = Number(b.match(/^suite(\d+)/)?.[1] || 0);
    return an - bn;
  });

  const suiteNumLabel = (suiteKey) => {
    const n = Number(suiteKey.match(/^suite(\d+)/)?.[1] || 0);
    return n > 0 ? `#${String(n).padStart(2, '0')}` : suiteKey;
  };

  // Legend: keep suite names out of the table (columns only show #NN)
  console.log(`${colors.dim}Legend:${colors.reset}`);
  const legendCells = suiteKeysOrdered.map(k => `${suiteNumLabel(k)} ${suiteComparison[k]?.name || ''}`.trim());
  const legendPerLine = 3;
  for (let i = 0; i < legendCells.length; i += legendPerLine) {
    console.log(`  ${colors.dim}${legendCells.slice(i, i + legendPerLine).join('   ')}${colors.reset}`);
  }
  console.log();

  // Rotate "Per-Configuration Comparison": rows=configs, columns=suites, chunked to fit terminal.
  const termW = Number(process.stdout.columns) > 0 ? Number(process.stdout.columns) : 120;
  const configColW = Math.min(
    32,
    Math.max('Config'.length, ...orderedStrategies.map(s => shortStrategyName(s).length))
  );
  const cellW = 18; // "100% 32K/705  9" (pct + KB/Sim + time)

  const fmt4 = (n) => {
    const num = Number(n || 0);
    if (num < 1000) return String(num).padStart(4, ' ');
    if (num < 10_000) return `${(num / 1000).toFixed(1)}K`; // 3.8K
    if (num < 1_000_000) return `${Math.round(num / 1000)}K`.padStart(4, ' '); // 73K / 999K
    if (num < 10_000_000) return `${(num / 1_000_000).toFixed(1)}M`; // 8.0M
    return `${Math.round(num / 1_000_000)}M`.padStart(4, ' ');
  };

  const fmtTime3 = (ms) => {
    const n = Math.round(Number(ms || 0));
    if (n < 1000) return String(n).padStart(3, ' ');
    if (n < 10_000) return `${Math.round(n / 1000)}s`.padStart(3, ' ');
    return '>9s';
  };

  const maxSuiteCols = Math.max(
    2,
    Math.floor((termW - configColW - 1) / (cellW + 3))
  );

  for (let start = 0; start < suiteKeysOrdered.length; start += maxSuiteCols) {
    const chunk = suiteKeysOrdered.slice(start, start + maxSuiteCols);
    const chunkLabel = chunk.length > 1
      ? `${suiteNumLabel(chunk[0])}..${suiteNumLabel(chunk[chunk.length - 1])}`
      : suiteNumLabel(chunk[0]);

    console.log(`${colors.bold}${colors.cyan}Suites ${chunkLabel}:${colors.reset}`);

    let header = padAnsiRight('Config', configColW);
    for (const suiteKey of chunk) {
      header += ` ${colors.gray}│${colors.reset} ${padAnsiRight(suiteNumLabel(suiteKey), cellW)}`;
    }
    console.log(`${colors.bold}${header}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(configColW + (cellW + 3) * chunk.length)}${colors.reset}`);

    for (const strategyId of orderedStrategies) {
      let row = padAnsiRight(shortStrategyName(strategyId), configColW);
      for (const suiteKey of chunk) {
        const summary = suiteSummaries[suiteKey][strategyId];
        if (!summary) {
          row += ` ${colors.gray}│${colors.reset} ${padAnsiRight('N/A', cellW)}`;
          continue;
        }

        const pct = summary.total > 0 ? Math.floor((summary.passed / summary.total) * 100) : 0;
        const stats = summary.reasoningStats || {};
        const durationMs = summary.durationMs || 0;

        const statusColor = pct === 100 ? colors.green : pct >= 50 ? colors.yellow : colors.red;

        const kb4 = fmt4(stats.kbScans || 0);
        const sim4 = fmt4(stats.similarityChecks || 0);
        const t3 = fmtTime3(durationMs);

        const cell = `${statusColor}${String(pct).padStart(3)}%${colors.reset} ${colors.dim}${kb4}/${sim4}${colors.reset} ${t3}`;
        row += ` ${colors.gray}│${colors.reset} ${padAnsiRight(cell, cellW)}`;
      }
      console.log(row);
    }

    console.log(`${colors.dim}${'─'.repeat(configColW + (cellW + 3) * chunk.length)}${colors.reset}`);
    console.log();
  }

  // Overall conclusions as compact table
  console.log(`${colors.bold}${colors.cyan}Configuration Totals:${colors.reset}`);
  console.log();

  // Rotate the table (configs as rows, metrics as columns) to avoid horizontal overflow.
  const fastestMs = Math.min(...orderedStrategies.map(s => strategyTotals[s]?.totalMs ?? 0));

  const hasAnyFailures = orderedStrategies.some(s => {
    const t = strategyTotals[s];
    return t.failedReasoning > 0 || t.failedNlTranslation > 0 || t.failedNlParsing > 0;
  });

  const columns = [
    { key: 'strategy', title: 'Strategy', align: 'left' },
    { key: 'pass', title: 'Pass Rate', align: 'right' },
    { key: 'hdcTried', title: 'HDC Tried', align: 'right' },
    { key: 'hdcValid', title: 'HDC Valid', align: 'right' },
    { key: 'hdcFinal', title: 'HDC Final', align: 'right' },
    { key: 'hdcOps', title: 'HDC Ops', align: 'right' },
    { key: 'kb', title: 'KB Scans', align: 'right' },
    { key: 'sim', title: 'Sim Checks', align: 'right' },
    { key: 'time', title: 'Time', align: 'right' }
  ];

  if (hasAnyFailures) {
    columns.push(
      { key: 'failReason', title: 'Fail Reason', align: 'right' },
      { key: 'failNlOut', title: 'Fail NL Out', align: 'right' },
      { key: 'failParse', title: 'Fail Parse', align: 'right' }
    );
  }

  const rows = orderedStrategies.map(strategyId => {
    const totals = strategyTotals[strategyId];

    const passPct = totals.total > 0 ? Math.floor((totals.passed / totals.total) * 100) : 0;
    const passColor = passPct === 100 ? colors.green : passPct >= 50 ? colors.yellow : colors.red;
    const passCell = `${passColor}${passPct}% (${totals.passed}/${totals.total})${colors.reset}`;

    const hasAsked = totals.hdcTotal > 0;

    const triedPct = hasAsked ? Math.floor((totals.hdcTried / totals.hdcTotal) * 100) : 0;
    const triedColor = hasAsked && triedPct >= 50 ? colors.cyan : colors.dim;
    const triedCell = hasAsked
      ? `${triedColor}${triedPct}% (${totals.hdcTried}/${totals.hdcTotal})${colors.reset}`
      : `${colors.dim}-${colors.reset}`;

    const hasTried = totals.hdcTried > 0;
    const validPct = hasTried ? Math.floor((totals.hdcValidated / totals.hdcTried) * 100) : 0;
    const validColor = hasTried && validPct >= 50 ? colors.cyan : colors.dim;
    const validCell = hasTried
      ? `${validColor}${validPct}% (${totals.hdcValidated}/${totals.hdcTried})${colors.reset}`
      : `${colors.dim}-${colors.reset}`;

    const finalPct = hasAsked ? Math.floor((totals.hdcFinal / totals.hdcTotal) * 100) : 0;
    const finalColor = hasAsked && finalPct >= 50 ? colors.cyan : colors.dim;
    const finalCell = hasAsked
      ? `${finalColor}${finalPct}% (${totals.hdcFinal}/${totals.hdcTotal})${colors.reset}`
      : `${colors.dim}-${colors.reset}`;

    const timeCell = totals.totalMs === fastestMs
      ? `${colors.cyan}${totals.totalMs}ms${colors.reset}`
      : `${totals.totalMs}ms`;

    const base = {
      strategy: shortStrategyName(strategyId),
      pass: passCell,
      hdcTried: triedCell,
      hdcValid: validCell,
      hdcFinal: finalCell,
      hdcOps: hasAsked ? `${totals.hdcTotal}` : `${colors.dim}-${colors.reset}`,
      kb: formatNum(totals.kbScans),
      sim: formatNum(totals.simChecks),
      time: timeCell
    };

    if (!hasAnyFailures) return base;

    const pctOrDash = (n) => {
      const pct = totals.total > 0 ? Math.round((n / totals.total) * 100) : 0;
      return pct > 0 ? `${pct}%` : `${colors.dim}-${colors.reset}`;
    };

    return {
      ...base,
      failReason: totals.failedReasoning > 0 ? `${colors.red}${pctOrDash(totals.failedReasoning)}${colors.reset}` : `${colors.dim}-${colors.reset}`,
      failNlOut: totals.failedNlTranslation > 0 ? `${colors.yellow}${pctOrDash(totals.failedNlTranslation)}${colors.reset}` : `${colors.dim}-${colors.reset}`,
      failParse: totals.failedNlParsing > 0 ? `${colors.magenta}${pctOrDash(totals.failedNlParsing)}${colors.reset}` : `${colors.dim}-${colors.reset}`
    };
  });

  const colWidths = new Map();
  for (const c of columns) {
    const maxCell = Math.max(
      visibleLen(c.title),
      ...rows.map(r => visibleLen(r[c.key]))
    );
    colWidths.set(c.key, Math.min(40, maxCell));
  }

  const pad = (text, width, align) => {
    const v = String(text ?? '');
    const len = visibleLen(v);
    if (len >= width) return v;
    const padN = ' '.repeat(width - len);
    return align === 'right' ? padN + v : v + padN;
  };

  const header = columns
    .map((c, idx) => {
      const cell = pad(c.title, colWidths.get(c.key), c.align);
      return idx === 0 ? cell : `${colors.gray}│${colors.reset} ${cell}`;
    })
    .join(' ');
  console.log(`${colors.bold}${header}${colors.reset}`);

  const totalWidth = columns.reduce((sum, c, idx) => sum + colWidths.get(c.key) + (idx === 0 ? 0 : 3), 0);
  console.log(`${colors.dim}${'─'.repeat(totalWidth)}${colors.reset}`);

  for (const r of rows) {
    const line = columns
      .map((c, idx) => {
        const cell = pad(r[c.key], colWidths.get(c.key), c.align);
        return idx === 0 ? cell : `${colors.gray}│${colors.reset} ${cell}`;
      })
      .join(' ');
    console.log(line);
  }

  console.log(`${colors.dim}${'─'.repeat(totalWidth)}${colors.reset}`);

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
