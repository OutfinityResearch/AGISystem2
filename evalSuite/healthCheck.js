#!/usr/bin/env node
/**
 * Suites Health Check
 *
 * Analyzes all evaluation suites and reports:
 * - Syntax errors in DSL
 * - Proof complexity metrics
 * - Correctness validation
 * - Potential issues and warnings
 *
 * Usage:
 *   node evalSuite/healthCheck.js
 *   node evalSuite/healthCheck.js --verbose
 *   node evalSuite/healthCheck.js suite01_foundations
 */

import { discoverSuites, loadSuite } from './lib/loader.mjs';
import { parse } from '../src/parser/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  gray: '\x1b[90m'
};

// Parse args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const specificSuites = args.filter(a => !a.startsWith('-'));

// Operators that indicate complex reasoning
const REASONING_OPERATORS = new Set([
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'
]);

/**
 * Get color based on percentage thresholds
 * <20% = red (severe), 20-80% = yellow (warning), ≥80% = green (OK)
 */
function getPctColor(pct) {
  if (pct < 20) return C.red;
  if (pct < 80) return C.yellow;
  return C.green;
}

/**
 * Get operator name from AST node
 */
function getOperatorName(operator) {
  if (!operator) return null;
  if (typeof operator === 'string') return operator;
  return operator.name || operator.value || null;
}

/**
 * Validate DSL syntax
 */
function validateDSLSyntax(dsl) {
  const issues = [];
  if (!dsl || typeof dsl !== 'string' || !dsl.trim()) {
    issues.push({ type: 'error', msg: 'Empty or invalid DSL' });
    return issues;
  }

  try {
    const ast = parse(dsl.trim());
    if (!ast.statements || ast.statements.length === 0) {
      issues.push({ type: 'warning', msg: 'DSL parses but produces no statements' });
    }
  } catch (err) {
    issues.push({ type: 'error', msg: `Parse error: ${err.message}` });
  }

  return issues;
}

/**
 * Validate expected_nl for formatting issues
 * Returns array of issues found
 */
function validateExpectedNl(expectedNl, action, inputDsl) {
  const issues = [];
  if (!expectedNl) {
    if (action === 'query' || action === 'prove') {
      issues.push({
        type: 'error',
        msg: `Missing expected_nl for ${action} action`
      });
    }
    return issues;
  }

  // Check for multiple "Proof:" occurrences
  // For query actions, multiple Proof: is OK (one per result)
  // For prove actions, should have single proof
  const proofCount = (expectedNl.match(/\bProof:/gi) || []).length;
  if (proofCount > 1 && action !== 'query') {
    issues.push({
      type: 'error',
      msg: `Multiple "Proof:" occurrences (${proofCount}) - should have single proof section`
    });
  }

  // Check for repeated pattern like "X can Y. Proof: ... X can Y. Proof: ..."
  const repeatedProofPattern = /(\w+\s+can\s+\w+)\.\s*Proof:.*?\1\.\s*Proof:/i;
  if (repeatedProofPattern.test(expectedNl)) {
    issues.push({
      type: 'error',
      msg: 'Repeated answer+proof pattern detected - consolidate into single response'
    });
  }

  // Check for missing Proof: in prove actions (unless it's a negative result)
  if (action === 'prove') {
    const hasProof = /\bProof:/i.test(expectedNl);
    const isNegative = /^(False|No|Cannot|Not found|Unknown)/i.test(expectedNl.trim());
    const isSearchTrace = /\bSearch:/i.test(expectedNl);

    if (!hasProof && !isNegative && !isSearchTrace) {
      issues.push({
        type: 'warning',
        msg: 'Missing "Proof:" in prove action - should include reasoning chain'
      });
    }
  }

  // Check for missing Proof: in query actions that require reasoning
  if (action === 'query') {
    const hasProof = /\bProof:/i.test(expectedNl);
    // Queries that need transitive reasoning should have proofs
    const needsTransitive = inputDsl && /isA\s+\??\w+\s+\w+/.test(inputDsl);
    const hasMultipleResults = (expectedNl.match(/\.\s+[A-Z]/g) || []).length >= 2;

    if (!hasProof && needsTransitive && hasMultipleResults) {
      issues.push({
        type: 'warning',
        msg: 'Query with transitive reasoning should include "Proof:" for derived results'
      });
    }
  }

  return issues;
}

/**
 * Check if DSL contains macro definitions (complex expansion)
 */
function hasMacroDefinition(inputDsl) {
  if (!inputDsl) return false;
  // Macro definitions look like: @Name:macroName graph|rule|...
  return /@\w+:\w+\s+(graph|rule|macro)/i.test(inputDsl);
}

/**
 * Count facts in learn DSL (only for non-macro DSLs)
 */
function countLearnFacts(inputDsl) {
  if (!inputDsl) return 0;
  const lines = inputDsl.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      if (l.startsWith('#')) return false;
      if (l.startsWith('@_')) return false;
      if (l.startsWith('@goal ') || l.startsWith('@goal\t') || l === '@goal') return false;
      if (l.startsWith('@q ') || l.startsWith('@q\t') || l === '@q') return false;
      return true;
    });
  return lines.length;
}

/**
 * Validate learn action - check fact count consistency
 */
function validateLearnAction(testCase) {
  const issues = [];
  if (testCase.action !== 'learn') return issues;

  const inputDsl = testCase.input_dsl || '';
  const expectedNl = testCase.expected_nl || '';

  // Skip fact count validation for macro-containing DSLs (complex expansion)
  if (hasMacroDefinition(inputDsl)) {
    return issues; // Macro expansion is non-trivial, skip count check
  }

  const factCount = countLearnFacts(inputDsl);

  // Check if expected_nl mentions a number that doesn't match
  const numberMatch = expectedNl.match(/(\d+)\s*(facts?|statements?|assertions?|rules?)/i);
  if (numberMatch) {
    const declaredCount = parseInt(numberMatch[1], 10);
    if (declaredCount !== factCount) {
      issues.push({
        type: 'warning',
        msg: `Fact count mismatch: expected_nl says ${declaredCount}, but input_dsl has ${factCount} facts`
      });
    }
  }

  // Check if input_nl mentions a count
  const inputNl = testCase.input_nl || '';
  const inputNumberMatch = inputNl.match(/(\d+)\s*(facts?|statements?|items?|things?)/i);
  if (inputNumberMatch) {
    const declaredCount = parseInt(inputNumberMatch[1], 10);
    if (declaredCount !== factCount) {
      issues.push({
        type: 'warning',
        msg: `Fact count mismatch: input_nl says ${declaredCount}, but input_dsl has ${factCount} facts`
      });
    }
  }

  // Warn if learn has no expected_nl (should confirm what was learned)
  if (!expectedNl || expectedNl.trim() === '') {
    issues.push({
      type: 'info',
      msg: `Learn action has no expected_nl - consider adding confirmation message`
    });
  }

  return issues;
}

/**
 * Extract learned facts from DSL
 */
function extractLearnedFacts(dsl) {
  const facts = [];
  if (!dsl) return facts;

  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  for (const line of lines) {
    if (line.startsWith('@_') || line.startsWith('@goal') || line.startsWith('@q')) continue;

    if (line.startsWith('@') && !line.startsWith('@_')) {
      const match = line.match(/^@\w+\s+(.+)$/);
      if (match) facts.push(match[1]);
    } else {
      facts.push(line);
    }
  }

  return facts;
}

/**
 * Check if goal is directly in learned facts
 */
function checkDirectFactMatch(goal, learnedFacts) {
  if (!goal || !learnedFacts.length) return false;

  const goalMatch = goal.match(/^@(?:goal|q)\s+(\w+)\s+(.+)$/);
  if (!goalMatch) return false;

  const [, goalOp, goalArgs] = goalMatch;
  const goalArgList = goalArgs.split(/\s+/).filter(a => !a.startsWith('?'));

  for (const fact of learnedFacts) {
    const factMatch = fact.match(/^(\w+)\s+(.+)$/);
    if (!factMatch) continue;

    const [, factOp, factArgs] = factMatch;
    if (factOp !== goalOp) continue;

    const factArgList = factArgs.split(/\s+/);
    if (goalArgList.length === factArgList.length &&
        goalArgList.every((arg, i) => arg === factArgList[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Estimate transitive chain length
 */
function estimateTransitiveChain(goal, learnedFacts) {
  const result = { isTransitive: false, estimatedLength: 0 };

  const goalMatch = goal.match(/^@(?:goal|q)\s+isA\s+(\w+)\s+(\w+)$/);
  if (!goalMatch) return result;

  const [, subject, target] = goalMatch;

  const isaGraph = new Map();
  for (const fact of learnedFacts) {
    const factMatch = fact.match(/^isA\s+(\w+)\s+(\w+)$/);
    if (factMatch) {
      const [, from, to] = factMatch;
      if (!isaGraph.has(from)) isaGraph.set(from, []);
      isaGraph.get(from).push(to);
    }
  }

  // BFS to find path
  const visited = new Set();
  const queue = [[subject, 0]];

  while (queue.length > 0) {
    const [current, depth] = queue.shift();
    if (current === target) {
      result.isTransitive = true;
      result.estimatedLength = depth;
      return result;
    }
    if (visited.has(current)) continue;
    visited.add(current);

    for (const next of isaGraph.get(current) || []) {
      queue.push([next, depth + 1]);
    }
  }

  return result;
}

/**
 * Extract goal from DSL
 */
function extractGoal(dsl) {
  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    if (line.startsWith('@goal') || line.startsWith('@q')) return line;
  }
  return lines[lines.length - 1] || null;
}

/**
 * Analyze proof complexity
 */
function analyzeProofComplexity(testCase, learnedFacts) {
  const metrics = {
    action: testCase.action,
    isTrivialLookup: false,
    estimatedChainLength: 0,
    reasoningType: 'unknown',
    warnings: []
  };

  const dsl = testCase.input_dsl?.trim() || '';

  if (testCase.action === 'learn') {
    metrics.reasoningType = 'learning';
    return metrics;
  }

  if (testCase.action === 'query' || testCase.action === 'prove') {
    const goal = extractGoal(dsl);

    if (goal) {
      if (checkDirectFactMatch(goal, learnedFacts)) {
        metrics.isTrivialLookup = true;
        metrics.reasoningType = 'direct_lookup';
        metrics.warnings.push('Goal may be directly in KB');
      } else {
        const transitiveInfo = estimateTransitiveChain(goal, learnedFacts);
        if (transitiveInfo.isTransitive) {
          metrics.estimatedChainLength = transitiveInfo.estimatedLength;
          metrics.reasoningType = transitiveInfo.estimatedLength <= 2 ? 'shallow_transitive' : 'deep_transitive';
        } else {
          // Check for rule-based reasoning
          try {
            const ast = parse(dsl);
            for (const stmt of ast.statements || []) {
              const opName = getOperatorName(stmt.operator);
              if (opName && REASONING_OPERATORS.has(opName)) {
                metrics.reasoningType = 'rule_inference';
                metrics.estimatedChainLength = 3;
                break;
              }
            }
          } catch (e) { /* ignore */ }

          if (metrics.reasoningType === 'unknown') {
            metrics.reasoningType = 'symbolic_search';
            metrics.estimatedChainLength = 2;
          }
        }
      }
    }
  }

  return metrics;
}

/**
 * Count steps from expected_nl
 */
function countStepsFromExpected(expectedNl) {
  if (!expectedNl) return 0;
  const cleaned = expectedNl.replace(/\b(Proof|Search|Answer):/gi, ' ').trim();
  if (!cleaned) return 0;

  return cleaned.split(/[.?!;]+/).map(s => s.trim()).filter(s => s.length > 3).length;
}

/**
 * Analyze a single suite
 */
async function analyzeSuite(suite) {
  const analysis = {
    name: suite.name,
    suiteName: suite.suiteName,
    caseCount: suite.cases.length,
    actionCounts: { learn: 0, query: 0, prove: 0 },
    syntaxErrors: [],
    formatErrors: [],  // expected_nl format issues
    trivialCases: [],
    complexityMetrics: [],
    expectedNls: [],
    cases: suite.cases
  };

  let allLearnedFacts = [];

  for (let i = 0; i < suite.cases.length; i++) {
    const testCase = suite.cases[i];
    const caseNum = i + 1;
    const caseInfo = `Case ${caseNum}: ${testCase.input_nl?.substring(0, 40) || 'No description'}`;

    // Count actions
    if (testCase.action) {
      analysis.actionCounts[testCase.action] = (analysis.actionCounts[testCase.action] || 0) + 1;
    }

    // Validate DSL syntax
    for (const issue of validateDSLSyntax(testCase.input_dsl)) {
      if (issue.type === 'error') {
        analysis.syntaxErrors.push({ case: caseNum, caseInfo, ...issue });
      }
    }

    // Validate expected_nl format
    for (const issue of validateExpectedNl(testCase.expected_nl, testCase.action, testCase.input_dsl)) {
      analysis.formatErrors.push({ case: caseNum, caseInfo, ...issue });
    }

    // Validate learn actions
    for (const issue of validateLearnAction(testCase)) {
      analysis.formatErrors.push({ case: caseNum, caseInfo, ...issue });
    }

    // Collect learned facts
    if (testCase.action === 'learn') {
      allLearnedFacts = allLearnedFacts.concat(extractLearnedFacts(testCase.input_dsl));
    }

    // Analyze complexity
    const complexity = analyzeProofComplexity(testCase, allLearnedFacts);
    complexity.caseNum = caseNum;
    analysis.complexityMetrics.push(complexity);
    analysis.expectedNls.push(testCase.expected_nl || '');

    if (complexity.isTrivialLookup) {
      analysis.trivialCases.push({ case: caseNum, caseInfo });
    }
  }

  return analysis;
}

/**
 * Print suite analysis report
 */
function printSuiteReport(analysis, verbose) {
  console.log();
  console.log(`${C.bold}${C.blue}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bold}Suite: ${analysis.name} (${analysis.suiteName})${C.reset}`);
  console.log(`${C.blue}${'═'.repeat(70)}${C.reset}`);

  console.log();
  console.log(`${C.cyan}Summary:${C.reset}`);
  console.log(`  Cases: ${analysis.caseCount} (L:${analysis.actionCounts.learn} Q:${analysis.actionCounts.query} P:${analysis.actionCounts.prove})`);

  const errColor = analysis.syntaxErrors.length > 0 ? C.red : C.green;
  console.log(`  Syntax Errors: ${errColor}${analysis.syntaxErrors.length}${C.reset}`);

  const fmtColor = analysis.formatErrors.length > 0 ? C.red : C.green;
  console.log(`  Format Errors: ${fmtColor}${analysis.formatErrors.length}${C.reset}`);

  // Print syntax errors
  if (analysis.syntaxErrors.length > 0) {
    console.log();
    console.log(`${C.red}${C.bold}Syntax Errors:${C.reset}`);
    for (const err of analysis.syntaxErrors) {
      console.log(`  ${C.red}✗${C.reset} Case ${err.case}: ${err.msg}`);
    }
  }

  // Print format errors (multiple Proof:, etc.)
  if (analysis.formatErrors.length > 0) {
    console.log();
    console.log(`${C.red}${C.bold}Format Errors (expected_nl):${C.reset}`);
    for (const err of analysis.formatErrors) {
      console.log(`  ${C.red}✗${C.reset} Case ${err.case}: ${err.msg}`);
      if (verbose) console.log(`    ${C.dim}${err.caseInfo}${C.reset}`);
    }
  }

  // Print trivial cases
  if (verbose && analysis.trivialCases.length > 0) {
    console.log();
    console.log(`${C.yellow}⚠ Trivial Cases:${C.reset}`);
    for (const tc of analysis.trivialCases) {
      console.log(`  Case ${tc.case}: ${C.dim}${tc.caseInfo}${C.reset}`);
    }
  }
}

/**
 * Print global summary with correctness table
 */
function printGlobalSummary(allAnalyses) {
  console.log();
  console.log(`${C.bold}${C.magenta}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bold}${C.magenta}GLOBAL HEALTH CHECK SUMMARY${C.reset}`);
  console.log(`${C.magenta}${'═'.repeat(70)}${C.reset}`);
  console.log();

  // Correctness Table
  console.log(`${C.bold}${C.cyan}Correctness by Suite:${C.reset}`);
  console.log();

  const maxSuiteLen = Math.max(12, ...allAnalyses.map(a => a.suiteName.length));
  const header = `${'Suite'.padEnd(maxSuiteLen)}  Cases  SynErr  FmtErr  Health`;
  console.log(`${C.bold}${header}${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(header.length + 5)}${C.reset}`);

  let totalCases = 0, totalSynErr = 0, totalFmtErr = 0;

  for (const analysis of allAnalyses) {
    const cases = analysis.caseCount;
    const synErr = analysis.syntaxErrors.length;
    const fmtErr = analysis.formatErrors.length;
    const errTotal = synErr + fmtErr;
    const healthPct = cases > 0 ? Math.round(((cases - errTotal) / cases) * 100) : 100;
    const healthColor = getPctColor(healthPct);

    totalCases += cases;
    totalSynErr += synErr;
    totalFmtErr += fmtErr;

    const synColor = synErr > 0 ? C.red : C.green;
    const fmtColor = fmtErr > 0 ? C.red : C.green;

    console.log(
      `${analysis.suiteName.padEnd(maxSuiteLen)}  ` +
      `${String(cases).padStart(5)}  ` +
      `${synColor}${String(synErr).padStart(6)}${C.reset}  ` +
      `${fmtColor}${String(fmtErr).padStart(6)}${C.reset}  ` +
      `${healthColor}${String(healthPct).padStart(5)}%${C.reset}`
    );
  }

  console.log(`${C.dim}${'─'.repeat(header.length + 5)}${C.reset}`);

  const totalErrTotal = totalSynErr + totalFmtErr;
  const totalHealthPct = totalCases > 0 ? Math.round(((totalCases - totalErrTotal) / totalCases) * 100) : 100;
  const totalHealthColor = getPctColor(totalHealthPct);
  const totalSynColor = totalSynErr > 0 ? C.red : C.green;
  const totalFmtColor = totalFmtErr > 0 ? C.red : C.green;

  console.log(`${C.bold}` +
    `${'TOTAL'.padEnd(maxSuiteLen)}  ` +
    `${String(totalCases).padStart(5)}  ` +
    `${totalSynColor}${String(totalSynErr).padStart(6)}${C.reset}  ` +
    `${totalFmtColor}${String(totalFmtErr).padStart(6)}${C.reset}  ` +
    `${totalHealthColor}${String(totalHealthPct).padStart(5)}%${C.reset}`
  );

  // Complexity Table
  console.log();
  console.log(`${C.bold}${C.cyan}Proof Complexity Distribution:${C.reset}`);
  console.log();

  let proveShallow = 0, proveNormal = 0, proveDeep = 0, totalProve = 0;

  for (const analysis of allAnalyses) {
    for (let i = 0; i < analysis.complexityMetrics.length; i++) {
      const m = analysis.complexityMetrics[i];
      if (m.action === 'prove') {
        totalProve++;
        const steps = countStepsFromExpected(analysis.expectedNls[i]);
        if (steps < 5) proveShallow++;
        else if (steps <= 10) proveNormal++;
        else proveDeep++;
      }
    }
  }

  const pctShallow = totalProve > 0 ? Math.round((proveShallow / totalProve) * 100) : 0;
  const pctNormal = totalProve > 0 ? Math.round((proveNormal / totalProve) * 100) : 0;
  const pctDeep = totalProve > 0 ? Math.round((proveDeep / totalProve) * 100) : 0;

  console.log(`  Shallow (<5 steps):  ${getPctColor(100 - pctShallow)}${proveShallow}${C.reset} (${pctShallow}%)`);
  console.log(`  Normal (5-10 steps): ${C.green}${proveNormal}${C.reset} (${pctNormal}%)`);
  console.log(`  Deep (>10 steps):    ${C.cyan}${proveDeep}${C.reset} (${pctDeep}%)`);

  // Overall health score
  console.log();
  const healthScore = totalHealthPct;
  const healthColor = getPctColor(healthScore);
  console.log(`${C.bold}Overall Health: ${healthColor}${healthScore}%${C.reset}`);

  if (totalSynErr > 0 || totalFmtErr > 0) {
    console.log();
    console.log(`${C.cyan}Recommendations:${C.reset}`);
    if (totalSynErr > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalSynErr} syntax error(s)`);
    }
    if (totalFmtErr > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalFmtErr} format error(s) (multiple Proof:, etc.)`);
    }

    // Detailed actionable list for agents
    console.log();
    console.log(`${C.bold}${C.yellow}═══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold}${C.yellow}ACTIONABLE FIX LIST (for automated fixing)${C.reset}`);
    console.log(`${C.yellow}═══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log();

    let fixIndex = 1;

    for (const analysis of allAnalyses) {
      const hasIssues = analysis.syntaxErrors.length > 0 || analysis.formatErrors.length > 0;
      if (!hasIssues) continue;

      // Syntax errors
      for (const err of analysis.syntaxErrors) {
        const testCase = analysis.cases[err.case - 1];
        console.log(`${C.bold}[FIX ${fixIndex}]${C.reset} ${C.red}SYNTAX ERROR${C.reset}`);
        console.log(`  Suite: ${C.cyan}${analysis.suiteName}${C.reset}`);
        console.log(`  File:  ${C.dim}evalSuite/${analysis.suiteName}/cases.mjs${C.reset}`);
        console.log(`  Case:  ${err.case}`);
        console.log(`  Input: "${testCase?.input_nl || 'N/A'}"`);
        console.log(`  Error: ${C.red}${err.msg}${C.reset}`);
        console.log(`  Action: Fix the input_dsl syntax in case ${err.case}`);
        console.log();
        fixIndex++;
      }

      // Format errors
      for (const err of analysis.formatErrors) {
        const testCase = analysis.cases[err.case - 1];
        const typeColor = err.type === 'error' ? C.red : err.type === 'warning' ? C.yellow : C.cyan;
        const typeLabel = err.type.toUpperCase();

        console.log(`${C.bold}[FIX ${fixIndex}]${C.reset} ${typeColor}${typeLabel}${C.reset}`);
        console.log(`  Suite: ${C.cyan}${analysis.suiteName}${C.reset}`);
        console.log(`  File:  ${C.dim}evalSuite/${analysis.suiteName}/cases.mjs${C.reset}`);
        console.log(`  Case:  ${err.case}`);
        console.log(`  Input: "${testCase?.input_nl || 'N/A'}"`);
        console.log(`  Issue: ${typeColor}${err.msg}${C.reset}`);

        if (testCase?.expected_nl) {
          const truncated = testCase.expected_nl.length > 120
            ? testCase.expected_nl.substring(0, 120) + '...'
            : testCase.expected_nl;
          console.log(`  Current expected_nl: "${C.dim}${truncated}${C.reset}"`);
        }

        // Provide specific action based on error type
        let action = '';
        if (err.msg.includes('Multiple "Proof:"')) {
          action = 'Consolidate multiple "Proof:" sections into a single proof';
        } else if (err.msg.includes('Missing "Proof:"')) {
          action = 'Add "Proof:" section with reasoning chain to expected_nl';
        } else if (err.msg.includes('Missing expected_nl')) {
          action = 'Add expected_nl with expected response';
        } else if (err.msg.includes('Fact count mismatch')) {
          action = 'Correct the fact count in input_nl or expected_nl to match input_dsl';
        } else if (err.msg.includes('no expected_nl')) {
          action = 'Add expected_nl confirming what facts were learned';
        } else if (err.msg.includes('Repeated answer+proof')) {
          action = 'Consolidate repeated answer+proof patterns into single response';
        } else {
          action = 'Review and fix the issue';
        }
        console.log(`  Action: ${action}`);
        console.log();
        fixIndex++;
      }
    }

    // Summary prompt for agent
    if (fixIndex > 1) {
      console.log(`${C.bold}${C.magenta}─── AGENT PROMPT ───${C.reset}`);
      console.log();
      console.log(`${C.dim}Copy the prompt below to fix all issues:${C.reset}`);
      console.log();
      console.log(`${C.green}Fix the following ${fixIndex - 1} issue(s) in evalSuite test cases:${C.reset}`);
      console.log();

      for (const analysis of allAnalyses) {
        for (const err of analysis.formatErrors) {
          const testCase = analysis.cases[err.case - 1];
          console.log(`- ${analysis.suiteName} case ${err.case} ("${testCase?.input_nl?.substring(0, 50) || 'N/A'}..."): ${err.msg}`);
        }
        for (const err of analysis.syntaxErrors) {
          const testCase = analysis.cases[err.case - 1];
          console.log(`- ${analysis.suiteName} case ${err.case} ("${testCase?.input_nl?.substring(0, 50) || 'N/A'}..."): ${err.msg}`);
        }
      }
      console.log();
      console.log(`${C.dim}For format errors with multiple "Proof:" occurrences: consolidate into a single answer with one "Proof:" section.${C.reset}`);
      console.log();
    }
  }

  console.log();
}

/**
 * Main
 */
async function main() {
  console.log(`${C.bold}${C.magenta}AGISystem2 - Suites Health Check${C.reset}`);
  console.log(`${C.dim}Analyzing evaluation suites for syntax and format errors${C.reset}`);
  console.log();

  let suiteNames = await discoverSuites();

  if (specificSuites.length > 0) {
    suiteNames = suiteNames.filter(s => specificSuites.some(spec => s.includes(spec)));
  }

  if (suiteNames.length === 0) {
    console.log(`${C.red}No suites found.${C.reset}`);
    process.exit(1);
  }

  console.log(`Found ${suiteNames.length} suite(s)`);

  const allAnalyses = [];

  for (const suiteName of suiteNames) {
    try {
      const suite = await loadSuite(suiteName);
      const analysis = await analyzeSuite(suite);
      allAnalyses.push(analysis);
      printSuiteReport(analysis, verbose);
    } catch (err) {
      console.log(`${C.red}Error loading suite ${suiteName}: ${err.message}${C.reset}`);
    }
  }

  if (allAnalyses.length > 0) {
    printGlobalSummary(allAnalyses);
  }
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  if (verbose) console.error(err.stack);
  process.exit(1);
});
