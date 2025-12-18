#!/usr/bin/env node
/**
 * Suites Health Check
 *
 * Analyzes all evaluation suites and reports:
 * - Syntax errors in DSL
 * - Proof complexity metrics
 * - Trivial vs real reasoning detection
 * - Potential issues and warnings
 *
 * Usage:
 *   node evalSuite/suitesHealthCheck.js
 *   node evalSuite/suitesHealthCheck.js --verbose
 *   node evalSuite/suitesHealthCheck.js suite01_foundations
 */

import { discoverSuites, loadSuite } from './lib/loader.mjs';
import { parse } from '../src/parser/index.mjs';
import { Session } from '../src/runtime/session.mjs';
import { initHDC } from '../src/hdc/facade.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');

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

// Known operators in the DSL
const KNOWN_OPERATORS = new Set([
  'isA', 'has', 'can', 'causes', 'before', 'after', 'partOf',
  'requires', 'enables', 'conflicts', 'prevents', 'likes', 'owns', 'uses',
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
  'Possibly', 'Necessarily', 'Always', 'Sometimes', 'Never',
  'similar', 'bundle', 'induce',
  '@goal', '@q', '@_'
]);

// Operators that indicate complex reasoning
const REASONING_OPERATORS = new Set([
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'
]);

// Reference prefixes
const REFERENCE_PREFIXES = ['@', '$'];

/**
 * Get operator name from AST node (handles Expression/Identifier)
 */
function getOperatorName(operator) {
  if (!operator) return null;
  if (typeof operator === 'string') return operator;
  if (operator.name) return operator.name;
  if (operator.value) return operator.value;
  if (operator.toString) return operator.toString();
  return null;
}

/**
 * Get arg value from AST node
 */
function getArgValue(arg) {
  if (!arg) return null;
  if (typeof arg === 'string') return arg;
  if (arg.name) return arg.name;
  if (arg.value) return arg.value;
  if (arg.toString) return arg.toString();
  return null;
}

/**
 * Try to parse DSL and return any syntax errors
 */
function validateDSLSyntax(dsl, caseInfo) {
  const issues = [];

  if (!dsl || typeof dsl !== 'string') {
    issues.push({ type: 'error', msg: 'Empty or invalid DSL' });
    return issues;
  }

  const trimmed = dsl.trim();
  if (!trimmed) {
    issues.push({ type: 'warning', msg: 'DSL is empty/whitespace only' });
    return issues;
  }

  try {
    const ast = parse(trimmed);

    // Check for empty statements
    if (!ast.statements || ast.statements.length === 0) {
      issues.push({ type: 'warning', msg: 'DSL parses but produces no statements' });
    }

    // Analyze each statement
    for (const stmt of ast.statements || []) {
      const opName = getOperatorName(stmt.operator);

      // Check for unknown operators (heuristic)
      if (opName && !KNOWN_OPERATORS.has(opName)) {
        // Not an error, just info - might be a custom operator
        // Custom relations are valid, so we don't flag them
      }

      // Check for potential issues in args
      if (stmt.args) {
        for (const arg of stmt.args) {
          const argVal = getArgValue(arg);
          // Could add checks here for suspicious patterns
        }
      }
    }

  } catch (err) {
    issues.push({ type: 'error', msg: `Parse error: ${err.message}` });
  }

  return issues;
}

/**
 * Count rules (Implies statements) in learned facts
 */
function countLearnedRules(learnedFacts) {
  let ruleCount = 0;
  for (const fact of learnedFacts) {
    if (fact.includes('Implies') || fact.includes('=>')) {
      ruleCount++;
    }
  }
  return ruleCount;
}

/**
 * Estimate complexity from expected_nl content
 */
function estimateComplexityFromExpected(expectedNl) {
  if (!expectedNl) return 0;
  const lower = expectedNl.toLowerCase();

  let score = 0;

  // Count chain indicators
  if (lower.includes('chain')) score += 2;
  if (lower.includes('because')) score += 1;
  if (lower.includes('via')) score += 1;
  if (lower.includes('therefore')) score += 1;
  if (lower.includes('inherited')) score += 1;
  if (lower.includes('rule')) score += 2;
  if (lower.includes('implies')) score += 2;

  // Count arrows/steps in proof
  const arrowCount = (expectedNl.match(/→|->|=>/g) || []).length;
  score += arrowCount;

  // Count semicolons or periods (multiple facts)
  const stmtCount = (expectedNl.match(/[;.]/g) || []).length;
  if (stmtCount > 2) score += 1;

  return score;
}

/**
 * Analyze proof complexity heuristics
 */
function analyzeProofComplexity(testCase, learnedFacts) {
  const metrics = {
    action: testCase.action,
    dslStatementCount: 0,
    hasTransitiveChain: false,
    estimatedChainLength: 0,
    hasRuleApplication: false,
    hasLogicalOperators: false,
    hasNegation: false,
    hasModalOperators: false,
    isTrivialLookup: false,
    isDirectFact: false,
    reasoningType: 'unknown',
    complexityCategory: 'unknown', // trivial, shallow, deep, or other_0/1/2/3
    warnings: []
  };

  const dsl = testCase.input_dsl?.trim() || '';

  try {
    const ast = parse(dsl);
    metrics.dslStatementCount = ast.statements?.length || 0;

    for (const stmt of ast.statements || []) {
      const opName = getOperatorName(stmt.operator);

      // Check for logical operators
      if (opName && REASONING_OPERATORS.has(opName)) {
        metrics.hasLogicalOperators = true;
      }

      if (opName === 'Not') {
        metrics.hasNegation = true;
      }

      if (opName === 'Implies') {
        metrics.hasRuleApplication = true;
      }

      // Check for modal operators
      if (['Possibly', 'Necessarily', 'Always', 'Sometimes', 'Never'].includes(opName)) {
        metrics.hasModalOperators = true;
      }
    }
  } catch (e) {
    // Already reported as syntax error
  }

  // Heuristic: Detect trivial lookups
  if (testCase.action === 'query' || testCase.action === 'prove') {
    const goal = extractGoal(dsl);

    if (goal) {
      // Check if goal is directly in learned facts
      const isDirectMatch = checkDirectFactMatch(goal, learnedFacts);

      if (isDirectMatch) {
        metrics.isDirectFact = true;
        metrics.isTrivialLookup = true;
        metrics.reasoningType = 'direct_lookup';
        metrics.complexityCategory = 'trivial';
        metrics.estimatedChainLength = 0;
        metrics.warnings.push('Goal may be directly in KB (no reasoning needed)');
      } else {
        // Estimate if transitive reasoning is needed
        const transitiveInfo = estimateTransitiveChain(goal, learnedFacts);
        if (transitiveInfo.isTransitive) {
          metrics.hasTransitiveChain = true;
          metrics.estimatedChainLength = transitiveInfo.estimatedLength;
          if (transitiveInfo.estimatedLength <= 2) {
            metrics.reasoningType = 'shallow_transitive';
            metrics.complexityCategory = 'shallow';
          } else {
            metrics.reasoningType = 'deep_transitive';
            metrics.complexityCategory = 'deep';
          }
        } else if (metrics.hasRuleApplication || metrics.hasLogicalOperators) {
          metrics.reasoningType = 'rule_inference';
          // Estimate chain length based on complexity indicators
          if (metrics.hasNegation && metrics.hasRuleApplication) {
            metrics.estimatedChainLength = 4; // Complex: negation + rules
            metrics.complexityCategory = 'other_3'; // 4+ steps
          } else if (metrics.hasRuleApplication) {
            metrics.estimatedChainLength = 3; // Rule application ~3 steps
            metrics.complexityCategory = 'other_2'; // 3-4 steps
          } else {
            metrics.estimatedChainLength = 2; // Logical operators ~2 steps
            metrics.complexityCategory = 'other_1'; // 2 steps
          }
        } else {
          metrics.reasoningType = 'symbolic_search';

          // Count learned rules and estimate complexity from expected_nl
          const learnedRuleCount = countLearnedRules(learnedFacts);
          const expectedComplexity = estimateComplexityFromExpected(testCase.expected_nl);

          // Estimate based on multiple factors
          let complexityScore = 0;

          // Factor 1: Rules in KB suggest rule-based reasoning
          if (learnedRuleCount >= 3) complexityScore += 2;
          else if (learnedRuleCount >= 1) complexityScore += 1;

          // Factor 2: Expected output complexity
          complexityScore += Math.min(3, Math.floor(expectedComplexity / 2));

          // Factor 3: Modal operators suggest 2+ steps
          if (metrics.hasModalOperators) complexityScore += 1;

          // Factor 4: Multiple DSL statements
          if (metrics.dslStatementCount >= 3) complexityScore += 1;

          // Categorize based on score
          if (complexityScore >= 4) {
            metrics.estimatedChainLength = 4;
            metrics.complexityCategory = 'other_3'; // ~4+ steps
          } else if (complexityScore >= 3) {
            metrics.estimatedChainLength = 3;
            metrics.complexityCategory = 'other_2'; // ~3 steps
          } else if (complexityScore >= 1) {
            metrics.estimatedChainLength = 2;
            metrics.complexityCategory = 'other_1'; // ~2 steps
          } else {
            metrics.estimatedChainLength = 1;
            metrics.complexityCategory = 'other_0'; // ~1 step
          }
        }
      }
    }
  } else if (testCase.action === 'learn') {
    metrics.reasoningType = 'learning';
    metrics.complexityCategory = 'learning';
    metrics.estimatedChainLength = 0;
  }

  return metrics;
}

/**
 * Extract goal from DSL
 */
function extractGoal(dsl) {
  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    if (line.startsWith('@goal') || line.startsWith('@q')) {
      return line;
    }
  }
  // Last line might be the goal
  return lines[lines.length - 1] || null;
}

/**
 * Check if a goal can be directly found in learned facts
 */
function checkDirectFactMatch(goal, learnedFacts) {
  if (!goal || !learnedFacts.length) return false;

  // Parse goal to extract operator and args
  const goalMatch = goal.match(/^@(?:goal|q)\s+(\w+)\s+(.+)$/);
  if (!goalMatch) return false;

  const [, goalOp, goalArgs] = goalMatch;
  const goalArgList = goalArgs.split(/\s+/).filter(a => !a.startsWith('?'));

  // Check each learned fact
  for (const fact of learnedFacts) {
    const factMatch = fact.match(/^(\w+)\s+(.+)$/);
    if (!factMatch) continue;

    const [, factOp, factArgs] = factMatch;
    if (factOp !== goalOp) continue;

    const factArgList = factArgs.split(/\s+/);

    // Check if all non-variable goal args match
    let matches = true;
    for (let i = 0; i < goalArgList.length; i++) {
      if (goalArgList[i] !== factArgList[i]) {
        matches = false;
        break;
      }
    }

    if (matches && goalArgList.length === factArgList.length) {
      return true;
    }
  }

  return false;
}

/**
 * Estimate transitive chain length heuristically
 */
function estimateTransitiveChain(goal, learnedFacts) {
  const result = { isTransitive: false, estimatedLength: 0 };

  // Check for isA transitive patterns
  const goalMatch = goal.match(/^@(?:goal|q)\s+isA\s+(\w+)\s+(\w+)$/);
  if (!goalMatch) return result;

  const [, subject, target] = goalMatch;

  // Build a simple graph of isA relationships
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

    const neighbors = isaGraph.get(current) || [];
    for (const next of neighbors) {
      queue.push([next, depth + 1]);
    }
  }

  return result;
}

/**
 * Extract learned facts from a learn case
 */
function extractLearnedFacts(dsl) {
  const facts = [];
  if (!dsl) return facts;

  const lines = dsl.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  for (const line of lines) {
    // Skip references and meta
    if (line.startsWith('@_') || line.startsWith('@goal') || line.startsWith('@q')) continue;

    // Handle reference definitions
    if (line.startsWith('@') && !line.startsWith('@_')) {
      // This is a reference like @refName isA X Y
      const match = line.match(/^@\w+\s+(.+)$/);
      if (match) {
        facts.push(match[1]);
      }
    } else {
      facts.push(line);
    }
  }

  return facts;
}

/**
 * Check if a prove case has demonstration steps in expected_nl
 */
function hasProofSteps(expectedNl) {
  if (!expectedNl) return false;
  const lower = expectedNl.toLowerCase();
  // Check for proof step indicators
  return lower.includes('proof:') ||
         lower.includes('because') ||
         lower.includes('via') ||
         lower.includes('chain:') ||
         (lower.includes('. ') && lower.split('. ').length > 2); // Multiple sentences suggest steps
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
    syntaxWarnings: [],
    complexityMetrics: [],
    trivialCases: [],
    shallowCases: [],
    deepCases: [],
    proofWithoutSteps: [],  // Proofs that don't show reasoning steps
    expectedNls: [],  // Store expected_nl for step counting
    cases: suite.cases,  // Store original cases
    issues: []
  };

  // Collect all learned facts across the suite
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
    const syntaxIssues = validateDSLSyntax(testCase.input_dsl, caseInfo);
    for (const issue of syntaxIssues) {
      if (issue.type === 'error') {
        analysis.syntaxErrors.push({ case: caseNum, caseInfo, ...issue });
      } else {
        analysis.syntaxWarnings.push({ case: caseNum, caseInfo, ...issue });
      }
    }

    // Collect learned facts from learn cases
    if (testCase.action === 'learn') {
      const facts = extractLearnedFacts(testCase.input_dsl);
      allLearnedFacts = allLearnedFacts.concat(facts);
    }

    // Analyze proof complexity
    const complexity = analyzeProofComplexity(testCase, allLearnedFacts);
    complexity.caseNum = caseNum;
    complexity.caseInfo = caseInfo;
    analysis.complexityMetrics.push(complexity);
    analysis.expectedNls.push(testCase.expected_nl || '');

    // Categorize by reasoning type
    if (complexity.isTrivialLookup) {
      analysis.trivialCases.push({ case: caseNum, caseInfo, reason: complexity.warnings.join(', ') });
    } else if (complexity.estimatedChainLength <= 2 && complexity.hasTransitiveChain) {
      analysis.shallowCases.push({ case: caseNum, caseInfo, chainLength: complexity.estimatedChainLength });
    } else if (complexity.estimatedChainLength > 2) {
      analysis.deepCases.push({ case: caseNum, caseInfo, chainLength: complexity.estimatedChainLength });
    }

    // Check for proofs without demonstration steps
    if (testCase.action === 'prove') {
      const expectedNl = testCase.expected_nl || '';
      if (!hasProofSteps(expectedNl)) {
        analysis.proofWithoutSteps.push({
          case: caseNum,
          caseInfo,
          expected: expectedNl.substring(0, 60) + (expectedNl.length > 60 ? '...' : '')
        });
      }
    }

    // Check for potential issues
    for (const warning of complexity.warnings) {
      analysis.issues.push({ case: caseNum, caseInfo, type: 'warning', msg: warning });
    }
  }

  return analysis;
}

/**
 * Print suite analysis report
 */
function printSuiteReport(analysis, verbose) {
  console.log();
  console.log(`${C.bold}${C.blue}${'═'.repeat(80)}${C.reset}`);
  console.log(`${C.bold}Suite: ${analysis.name} (${analysis.suiteName})${C.reset}`);
  console.log(`${C.blue}${'═'.repeat(80)}${C.reset}`);

  // Summary
  console.log();
  console.log(`${C.cyan}Summary:${C.reset}`);
  console.log(`  Cases: ${analysis.caseCount} (L:${analysis.actionCounts.learn} Q:${analysis.actionCounts.query} P:${analysis.actionCounts.prove})`);
  console.log(`  Syntax Errors: ${analysis.syntaxErrors.length > 0 ? C.red + analysis.syntaxErrors.length + C.reset : C.green + '0' + C.reset}`);
  console.log(`  Warnings: ${analysis.syntaxWarnings.length > 0 ? C.yellow + analysis.syntaxWarnings.length + C.reset : '0'}`);

  // Reasoning complexity breakdown
  console.log();
  console.log(`${C.cyan}Reasoning Complexity:${C.reset}`);
  console.log(`  Trivial lookups (direct KB match):  ${analysis.trivialCases.length > 0 ? C.yellow + analysis.trivialCases.length + C.reset : C.green + '0' + C.reset}`);
  console.log(`  Shallow reasoning (chain ≤ 2):      ${analysis.shallowCases.length}`);
  console.log(`  Deep reasoning (chain > 2):         ${C.green}${analysis.deepCases.length}${C.reset}`);

  // Calculate reasoning type distribution
  const reasoningTypes = {};
  for (const m of analysis.complexityMetrics) {
    reasoningTypes[m.reasoningType] = (reasoningTypes[m.reasoningType] || 0) + 1;
  }

  console.log();
  console.log(`${C.cyan}Reasoning Type Distribution:${C.reset}`);
  for (const [type, count] of Object.entries(reasoningTypes).sort((a, b) => b[1] - a[1])) {
    const pct = Math.round((count / analysis.caseCount) * 100);
    console.log(`  ${type.padEnd(20)} ${String(count).padStart(3)} (${pct}%)`);
  }

  // Print syntax errors
  if (analysis.syntaxErrors.length > 0) {
    console.log();
    console.log(`${C.red}${C.bold}Syntax Errors:${C.reset}`);
    for (const err of analysis.syntaxErrors) {
      console.log(`  ${C.red}✗${C.reset} Case ${err.case}: ${err.msg}`);
      if (verbose) {
        console.log(`    ${C.dim}${err.caseInfo}${C.reset}`);
      }
    }
  }

  // Print warnings (verbose only)
  if (verbose && analysis.syntaxWarnings.length > 0) {
    console.log();
    console.log(`${C.yellow}Syntax Warnings:${C.reset}`);
    for (const warn of analysis.syntaxWarnings) {
      console.log(`  ${C.yellow}⚠${C.reset} Case ${warn.case}: ${warn.msg}`);
    }
  }

  // Print trivial cases
  if (analysis.trivialCases.length > 0) {
    console.log();
    console.log(`${C.yellow}⚠ Potential Trivial Cases (may not test real reasoning):${C.reset}`);
    for (const tc of analysis.trivialCases) {
      console.log(`  Case ${tc.case}: ${tc.reason}`);
      if (verbose) {
        console.log(`    ${C.dim}${tc.caseInfo}${C.reset}`);
      }
    }
  }

  // Print proofs without demonstration steps
  if (analysis.proofWithoutSteps.length > 0) {
    console.log();
    console.log(`${C.yellow}⚠ Proofs without demonstration steps (${analysis.proofWithoutSteps.length}):${C.reset}`);
    for (const pw of analysis.proofWithoutSteps) {
      console.log(`  Case ${pw.case}: ${C.dim}${pw.expected || '(empty expected_nl)'}${C.reset}`);
    }
  }

  // Print deep cases (verbose)
  if (verbose && analysis.deepCases.length > 0) {
    console.log();
    console.log(`${C.green}Deep Reasoning Cases:${C.reset}`);
    for (const dc of analysis.deepCases) {
      console.log(`  ${C.green}✓${C.reset} Case ${dc.case}: chain length ${dc.chainLength}`);
    }
  }
}

/**
 * Count actual proof steps from expected_nl
 */
function countProofSteps(expectedNl) {
  if (!expectedNl) return 0;
  const proofMatch = expectedNl.match(/Proof:\s*(.+)/i);
  if (proofMatch) {
    return proofMatch[1].split(/\.\s+/).filter(s => s.trim().length > 3).length;
  }
  const searchMatch = expectedNl.match(/Search:\s*(.+)/i);
  if (searchMatch) {
    return searchMatch[1].split(/\.\s+/).filter(s => s.trim().length > 3).length;
  }
  return 0;
}

/**
 * Estimate query complexity from DSL and context
 */
function estimateQueryComplexity(testCase, learnedFacts) {
  const dsl = testCase.input_dsl?.trim() || '';

  // Check if query involves transitive relations
  const hasTransitive = /isA|locatedIn|partOf|before|causes/.test(dsl);

  // Count variables in query
  const varCount = (dsl.match(/\?\w+/g) || []).length;

  // Check learned facts for depth
  let maxChainDepth = 0;
  const isaGraph = new Map();
  for (const fact of learnedFacts) {
    const match = fact.match(/^isA\s+(\w+)\s+(\w+)$/);
    if (match) {
      const [, from, to] = match;
      if (!isaGraph.has(from)) isaGraph.set(from, []);
      isaGraph.get(from).push(to);
    }
  }

  // Estimate max chain depth in KB
  for (const [start] of isaGraph) {
    let depth = 0;
    let current = start;
    while (isaGraph.has(current) && depth < 15) {
      current = isaGraph.get(current)[0];
      depth++;
    }
    maxChainDepth = Math.max(maxChainDepth, depth);
  }

  // Categorize: <5 = shallow, 5-10 = normal, >10 = deep
  if (!hasTransitive || maxChainDepth < 3) return 'shallow';
  if (maxChainDepth >= 8) return 'deep';
  return 'normal';
}

/**
 * Print global summary
 */
function printGlobalSummary(allAnalyses) {
  console.log();
  console.log(`${C.bold}${C.magenta}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bold}${C.magenta}GLOBAL HEALTH CHECK SUMMARY${C.reset}`);
  console.log(`${C.magenta}${'═'.repeat(70)}${C.reset}`);
  console.log();

  let totalLearn = 0, totalQuery = 0, totalProve = 0;
  let proveShallow = 0, proveNormal = 0, proveDeep = 0;
  let queryShallow = 0, queryNormal = 0, queryDeep = 0;
  let totalSyntaxErrors = 0;

  // Collect all learned facts for query estimation
  const allLearnedFacts = [];

  // Find longest suite name for proper alignment
  const maxSuiteLen = Math.max(5, ...allAnalyses.map(a => a.suiteName.length));
  const suiteW = maxSuiteLen + 2;
  const tableW = suiteW + 52;

  console.log(`${C.bold}${'Suite'.padEnd(suiteW)}  L   Q   P  │ P:<5  5-10  >10 │ Q:<5  5-10  >10${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(tableW)}${C.reset}`);

  for (const analysis of allAnalyses) {
    const learn = analysis.actionCounts.learn || 0;
    const query = analysis.actionCounts.query || 0;
    const prove = analysis.actionCounts.prove || 0;

    // Collect learned facts from this suite
    for (const tc of analysis.complexityMetrics) {
      if (tc.action === 'learn') {
        // Already collected in analysis
      }
    }

    // Count prove complexity by actual step count
    let pShallow = 0, pNormal = 0, pDeep = 0;
    let qShallow = 0, qNormal = 0, qDeep = 0;

    for (let i = 0; i < analysis.complexityMetrics.length; i++) {
      const m = analysis.complexityMetrics[i];
      const testCase = analysis.cases ? analysis.cases[i] : null;

      if (m.action === 'prove') {
        // Use actual step count from expected_nl
        const steps = countProofSteps(analysis.expectedNls?.[i] || '');
        if (steps < 5) pShallow++;
        else if (steps <= 10) pNormal++;
        else pDeep++;
      } else if (m.action === 'query') {
        // Estimate query complexity
        const complexity = m.estimatedChainLength || 0;
        if (complexity < 3) qShallow++;
        else if (complexity <= 6) qNormal++;
        else qDeep++;
      }
    }

    totalLearn += learn;
    totalQuery += query;
    totalProve += prove;
    proveShallow += pShallow;
    proveNormal += pNormal;
    proveDeep += pDeep;
    queryShallow += qShallow;
    queryNormal += qNormal;
    queryDeep += qDeep;
    totalSyntaxErrors += analysis.syntaxErrors.length;

    // Color coding
    const pShallowC = pShallow > 0 ? C.yellow : C.dim;
    const pNormalC = pNormal > 0 ? C.green : C.dim;
    const pDeepC = pDeep > 0 ? C.cyan : C.dim;

    console.log(
      `${analysis.suiteName.padEnd(suiteW)} ` +
      `${String(learn).padStart(2)} ` +
      `${String(query).padStart(3)} ` +
      `${String(prove).padStart(3)}  │ ` +
      `${pShallowC}${String(pShallow).padStart(4)}${C.reset} ` +
      `${pNormalC}${String(pNormal).padStart(5)}${C.reset} ` +
      `${pDeepC}${String(pDeep).padStart(4)}${C.reset} │ ` +
      `${String(qShallow).padStart(4)} ` +
      `${String(qNormal).padStart(5)} ` +
      `${String(qDeep).padStart(4)}`
    );
  }

  console.log(`${C.dim}${'─'.repeat(tableW)}${C.reset}`);

  const totalReason = totalQuery + totalProve;
  const pShallowC = proveShallow > 0 ? C.yellow : C.dim;
  const pNormalC = proveNormal > 0 ? C.green : C.dim;
  const pDeepC = proveDeep > 0 ? C.cyan : C.dim;

  console.log(`${C.bold}` +
    `${'TOTAL'.padEnd(suiteW)} ` +
    `${String(totalLearn).padStart(2)} ` +
    `${String(totalQuery).padStart(3)} ` +
    `${String(totalProve).padStart(3)}  │ ` +
    `${pShallowC}${String(proveShallow).padStart(4)}${C.reset} ` +
    `${pNormalC}${String(proveNormal).padStart(5)}${C.reset} ` +
    `${pDeepC}${String(proveDeep).padStart(4)}${C.reset} │ ` +
    `${String(queryShallow).padStart(4)} ` +
    `${String(queryNormal).padStart(5)} ` +
    `${String(queryDeep).padStart(4)}` +
    `${C.reset}`
  );

  console.log();
  console.log(`${C.dim}Legend: L=Learn, Q=Query, P=Prove${C.reset}`);
  console.log(`${C.dim}        P:<5=shallow(<5 steps), 5-10=normal, >10=deep${C.reset}`);
  console.log(`${C.dim}        Q: estimated complexity based on KB depth${C.reset}`);

  // Summary stats
  console.log();
  const provePct5plus = totalProve > 0 ? Math.round((proveNormal + proveDeep) / totalProve * 100) : 0;
  const proveColor = provePct5plus >= 99 ? C.green : provePct5plus >= 90 ? C.yellow : C.red;
  console.log(`${C.bold}Prove with 5+ steps: ${proveColor}${proveNormal + proveDeep}/${totalProve} (${provePct5plus}%)${C.reset}`);

  if (proveDeep > 0) {
    console.log(`${C.cyan}Deep proofs (>10 steps): ${proveDeep}${C.reset}`);
  }

  // Health score
  const healthScore = Math.min(100, Math.round(provePct5plus));
  const healthColor = healthScore >= 99 ? C.green : healthScore >= 90 ? C.yellow : C.red;
  console.log();
  console.log(`${C.bold}Health Score: ${healthColor}${healthScore}%${C.reset}`);

  // Recommendations
  if (totalSyntaxErrors > 0 || proveShallow > 0) {
    console.log();
    console.log(`${C.cyan}Recommendations:${C.reset}`);
    if (totalSyntaxErrors > 0) {
      console.log(`  ${C.red}•${C.reset} Fix ${totalSyntaxErrors} syntax error(s)`);
    }
    if (proveShallow > 0) {
      console.log(`  ${C.yellow}•${C.reset} ${proveShallow} prove case(s) have <5 steps - consider adding deeper chains`);
    }
  }

  console.log();
}

/**
 * Main
 */
async function main() {
  console.log(`${C.bold}${C.magenta}AGISystem2 - Suites Health Check${C.reset}`);
  console.log(`${C.dim}Analyzing evaluation suites for syntax errors and reasoning complexity${C.reset}`);
  console.log();

  // Discover suites
  let suiteNames = await discoverSuites();

  // Filter if specific suites requested
  if (specificSuites.length > 0) {
    suiteNames = suiteNames.filter(s =>
      specificSuites.some(spec => s.includes(spec))
    );
  }

  if (suiteNames.length === 0) {
    console.log(`${C.red}No suites found.${C.reset}`);
    process.exit(1);
  }

  console.log(`Found ${suiteNames.length} suite(s): ${suiteNames.join(', ')}`);

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

  // Global summary
  if (allAnalyses.length > 1) {
    printGlobalSummary(allAnalyses);
  }
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  if (verbose) {
    console.error(err.stack);
  }
  process.exit(1);
});
