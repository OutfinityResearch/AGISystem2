#!/usr/bin/env node
/**
 * Performance Suite Health Check
 *
 * Validates all theory folders and evaluation cases for:
 * - Required files: theory.dsl.txt, theory.nl.txt, theory.simple.txt, eval.mjs
 * - Proper expected_nl format with Proof: sections
 * - Proof complexity (minimum 2 steps, 90% should be 5+ steps)
 * - No trivial queries (expected_count, expected_result forbidden)
 * - 80%+ of DSL statements must be graphs (Implies, And, Or, rules) not simple isA/hasA
 * - Minimum 1000 facts per theory
 *
 * Usage:
 *   node performance/healthCheck.js
 *   node performance/healthCheck.js --verbose
 *   node performance/healthCheck.js math
 */

import { discoverTheories } from './lib/loader.mjs';
import { parse } from '../src/parser/index.mjs';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const THEORIES_ROOT = join(__dirname, 'theories');

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
  cyan: '\x1b[36m'
};

// Parse args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const specificTheories = args.filter(a => !a.startsWith('-'));

// =============================================================================
// REQUIRED FILES PER THEORY
// =============================================================================
const REQUIRED_FILES = [
  'theory.dsl.txt',    // DSL expressions
  'theory.nl.txt',     // Natural language (human readable)
  'theory.simple.txt', // Simplified NL for translator
  'eval.mjs'           // Evaluation cases
];

// FORBIDDEN FIELDS in eval cases
const FORBIDDEN_FIELDS = ['expected_count', 'expected_result'];

// REQUIRED FIELDS in eval cases (for prove/query actions)
const REQUIRED_EVAL_FIELDS = ['expected_nl', 'proof_nl'];

// SIMPLE OPERATORS (not graphs) - these should be <20% of theory
const SIMPLE_OPERATORS = new Set(['isA', 'hasA', 'has', 'partOf', 'typeof']);

// GRAPH OPERATORS (complex reasoning structures)
const GRAPH_OPERATORS = new Set([
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
  'If', 'Then', 'Iff', 'implies',
  'causes', 'before', 'after', 'enables', 'prevents',
  'equals', 'notEquals', 'greaterThan', 'lessThan'
]);

// Minimum requirements
const MIN_FACTS = 1000;
const MIN_GRAPH_PERCENT = 80;
const MIN_PROOF_STEPS = 2;
const TARGET_PROOF_5PLUS_PERCENT = 90;

// =============================================================================
// FILE VALIDATION
// =============================================================================

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateRequiredFiles(theoryName) {
  const issues = [];
  const theoryDir = join(THEORIES_ROOT, theoryName);

  for (const file of REQUIRED_FILES) {
    const filePath = join(theoryDir, file);
    const exists = await fileExists(filePath);
    if (!exists) {
      issues.push({
        type: 'error',
        msg: `MISSING FILE: ${file} is required`
      });
    }
  }

  return issues;
}

// =============================================================================
// DSL ANALYSIS
// =============================================================================

function analyzeDSL(dslContent) {
  const stats = {
    totalStatements: 0,
    simpleStatements: 0,  // isA, hasA, etc.
    graphStatements: 0,   // Implies, And, Or, rules
    otherStatements: 0,
    namedGraphs: 0,       // @name definitions
    multiLineGraphs: 0,   // @name graph ... end blocks
    rules: 0,             // Implies statements
    variables: 0,         // statements with ?var
    theoryBlocks: 0       // theory ... end blocks
  };

  if (!dslContent) return stats;

  // Count multi-line graph definitions: @name:export graph ... end or @:name graph ... end
  const graphBlockRegex = /@(?:\w+)?(?::\w+)?\s+graph\b[\s\S]*?end\b/gi;
  const graphBlocks = dslContent.match(graphBlockRegex) || [];
  stats.multiLineGraphs = graphBlocks.length;

  // Count theory blocks: @name theory ... end or theory Name { ... }
  const theoryBlockRegex = /(?:@\w+\s+theory\b[\s\S]*?end\b)|(?:theory\s+\w+\s*\{[\s\S]*?\})/gi;
  const theoryBlocks = dslContent.match(theoryBlockRegex) || [];
  stats.theoryBlocks = theoryBlocks.length;

  const lines = dslContent.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));

  let inGraphBlock = false;
  let inTheoryBlock = false;

  for (const line of lines) {
    // Track graph/theory block boundaries
    if (/^@\w+(?::\w+)?\s+graph\b/.test(line) || /^theory\s+\w+/.test(line)) {
      inGraphBlock = true;
    }
    if (line === 'end' || line === '}') {
      inGraphBlock = false;
      inTheoryBlock = false;
      continue; // Don't count 'end' as a statement
    }
    if (line === 'return' || line.startsWith('return ')) {
      continue; // Don't count return as separate statement
    }

    stats.totalStatements++;

    // Check for named graphs (@name)
    if (line.startsWith('@') && !line.startsWith('@_') && !line.startsWith('@goal') && !line.startsWith('@q')) {
      stats.namedGraphs++;
    }

    // Check for variables (?var)
    if (/\?\w+/.test(line)) {
      stats.variables++;
    }

    // Get first word (operator) - handle @name prefix
    const withoutPrefix = line.replace(/^@[\w:]+\s+/, '');
    const firstWord = withoutPrefix.split(/\s+/)[0];
    const operator = firstWord.replace(/^\$/, '');

    if (SIMPLE_OPERATORS.has(operator)) {
      stats.simpleStatements++;
    } else if (GRAPH_OPERATORS.has(operator) || operator === 'graph') {
      stats.graphStatements++;
      if (operator === 'Implies' || operator === 'implies') {
        stats.rules++;
      }
    } else {
      // Check if it's a complex structure (has named refs, variables, etc.)
      if (line.includes('$') || /\?\w+/.test(line) || line.startsWith('@') || inGraphBlock) {
        stats.graphStatements++;
      } else {
        stats.otherStatements++;
      }
    }
  }

  return stats;
}

function validateDSLComplexity(dslContent, theoryName) {
  const issues = [];
  const stats = analyzeDSL(dslContent);

  // Check minimum facts
  if (stats.totalStatements < MIN_FACTS) {
    issues.push({
      type: 'error',
      msg: `INSUFFICIENT FACTS: ${stats.totalStatements} statements (minimum ${MIN_FACTS} required)`
    });
  }

  // Check graph percentage (should be 80%+ complex, not simple isA/hasA)
  // Complex = total - simple
  const complexCount = stats.totalStatements - stats.simpleStatements;
  const complexPercent = stats.totalStatements > 0
    ? (complexCount / stats.totalStatements * 100)
    : 0;

  if (complexPercent < MIN_GRAPH_PERCENT) {
    issues.push({
      type: 'error',
      msg: `TOO SIMPLE: Only ${complexPercent.toFixed(1)}% complex statements (minimum ${MIN_GRAPH_PERCENT}% required). Found ${stats.simpleStatements} simple isA/hasA vs ${complexCount} complex.`
    });
  }

  // Check for rules (theorems)
  if (stats.rules < 10) {
    issues.push({
      type: 'warning',
      msg: `FEW RULES: Only ${stats.rules} Implies statements. Add more theorems/axioms.`
    });
  }

  // Check for variables (generalization)
  if (stats.variables < stats.totalStatements * 0.3) {
    issues.push({
      type: 'warning',
      msg: `FEW VARIABLES: Only ${stats.variables} statements use ?variables. Theorems should be general.`
    });
  }

  return { issues, stats };
}

// =============================================================================
// EVAL CASE VALIDATION
// =============================================================================

function countProofSteps(expectedNl) {
  if (!expectedNl) return 0;

  const proofMatch = expectedNl.match(/Proof:\s*(.+)/i);
  if (!proofMatch) return 0;

  const proofContent = proofMatch[1];
  const steps = proofContent.split(/\.\s+/)
    .filter(s => s.trim().length > 3)
    .length;

  return steps;
}

function validateCase(testCase, caseIndex) {
  const issues = [];
  const action = testCase.action;

  // Check for forbidden fields
  for (const field of FORBIDDEN_FIELDS) {
    if (testCase[field] !== undefined) {
      issues.push({
        type: 'error',
        msg: `Case ${caseIndex + 1}: FORBIDDEN field "${field}". Use expected_dsl + proof_dsl instead.`
      });
    }
  }

  // Check required fields for query/prove
  if (action === 'query' || action === 'prove') {
    // Check for required fields
    for (const field of REQUIRED_EVAL_FIELDS) {
      if (testCase[field] === undefined) {
        issues.push({
          type: 'error',
          msg: `Case ${caseIndex + 1}: MISSING required field "${field}" for ${action} action`
        });
      }
    }

    // Validate proof_nl is an array with steps
    if (testCase.proof_nl !== undefined) {
      if (!Array.isArray(testCase.proof_nl)) {
        issues.push({
          type: 'error',
          msg: `Case ${caseIndex + 1}: proof_nl must be an array of proof steps`
        });
      } else if (testCase.proof_nl.length < MIN_PROOF_STEPS) {
        // Check if it's a negative case (empty proof is ok for negatives)
        const isNegative = testCase.expected_nl &&
          (testCase.expected_nl.startsWith('False') ||
           testCase.expected_nl.startsWith('Cannot') ||
           testCase.expected_nl.startsWith('Unknown'));

        if (!isNegative && testCase.proof_nl.length > 0) {
          issues.push({
            type: 'error',
            msg: `Case ${caseIndex + 1}: PROOF TOO SHORT (${testCase.proof_nl.length} steps, min ${MIN_PROOF_STEPS})`
          });
        }
      }
    }

    // Validate expected_nl format
    if (testCase.expected_nl !== undefined) {
      if (typeof testCase.expected_nl !== 'string') {
        issues.push({
          type: 'error',
          msg: `Case ${caseIndex + 1}: expected_nl must be a string`
        });
      }
    }
  }

  return issues;
}

function analyzeProofComplexity(cases) {
  const stats = {
    total: 0,
    withProof: 0,
    steps2to4: 0,
    steps5plus: 0,
    negative: 0
  };

  for (const c of cases) {
    if (c.action !== 'query' && c.action !== 'prove') continue;
    stats.total++;

    // Check for negative cases
    const isNegative = c.expected_nl &&
      (c.expected_nl.startsWith('False') ||
       c.expected_nl.startsWith('Cannot') ||
       c.expected_nl.startsWith('Unknown'));

    if (isNegative) {
      stats.negative++;
      continue;
    }

    // Count proof steps from proof_nl array
    const proofNl = c.proof_nl || [];
    const steps = Array.isArray(proofNl) ? proofNl.length : 0;

    if (steps > 0) {
      stats.withProof++;
      if (steps >= 5) {
        stats.steps5plus++;
      } else if (steps >= 2) {
        stats.steps2to4++;
      }
    }
  }

  return stats;
}

// =============================================================================
// MAIN HEALTH CHECK
// =============================================================================

async function checkTheory(theoryName) {
  const result = {
    name: theoryName,
    errors: 0,
    warnings: 0,
    issues: [],
    dslStats: null,
    proofStats: null
  };

  // 1. Check required files
  const fileIssues = await validateRequiredFiles(theoryName);
  result.issues.push(...fileIssues);
  result.errors += fileIssues.filter(i => i.type === 'error').length;

  // 2. Check DSL complexity (if file exists)
  const dslPath = join(THEORIES_ROOT, theoryName, 'theory.dsl.txt');
  if (await fileExists(dslPath)) {
    try {
      const dslContent = await readFile(dslPath, 'utf8');
      const { issues, stats } = validateDSLComplexity(dslContent, theoryName);
      result.issues.push(...issues);
      result.errors += issues.filter(i => i.type === 'error').length;
      result.warnings += issues.filter(i => i.type === 'warning').length;
      result.dslStats = stats;
    } catch (err) {
      result.issues.push({ type: 'error', msg: `DSL READ ERROR: ${err.message}` });
      result.errors++;
    }
  }

  // 3. Check eval cases (if file exists)
  const evalPath = join(THEORIES_ROOT, theoryName, 'eval.mjs');
  if (await fileExists(evalPath)) {
    try {
      const evalModule = await import(evalPath);
      const cases = evalModule.cases || evalModule.steps || [];

      for (let i = 0; i < cases.length; i++) {
        const caseIssues = validateCase(cases[i], i);
        result.issues.push(...caseIssues);
        result.errors += caseIssues.filter(i => i.type === 'error').length;
        result.warnings += caseIssues.filter(i => i.type === 'warning').length;
      }

      // Analyze proof complexity
      const proofStats = analyzeProofComplexity(cases);
      result.proofStats = proofStats;

      if (proofStats.withProof > 0) {
        const pct5plus = (proofStats.steps5plus / proofStats.withProof * 100);
        if (pct5plus < TARGET_PROOF_5PLUS_PERCENT) {
          result.issues.push({
            type: 'warning',
            msg: `PROOF COMPLEXITY: Only ${pct5plus.toFixed(0)}% proofs have 5+ steps (target ${TARGET_PROOF_5PLUS_PERCENT}%)`
          });
          result.warnings++;
        }
      }
    } catch (err) {
      result.issues.push({ type: 'error', msg: `EVAL LOAD ERROR: ${err.message}` });
      result.errors++;
    }
  }

  return result;
}

async function main() {
  console.log();
  console.log(`${C.bold}${C.blue}Performance Suite Health Check${C.reset}`);
  console.log(`${C.dim}Validating theory files and evaluation cases${C.reset}`);
  console.log();

  try {
    let theories = await discoverTheories();

    if (specificTheories.length > 0) {
      theories = theories.filter(t => specificTheories.some(arg => t.includes(arg)));
    }

    if (theories.length === 0) {
      console.log(`${C.yellow}No theories found${C.reset}`);
      process.exit(0);
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const theoryName of theories) {
      const result = await checkTheory(theoryName);

      console.log(`${C.cyan}═══ ${result.name} ═══${C.reset}`);

      // Show DSL stats
      if (result.dslStats) {
        const s = result.dslStats;
        const complexCount = s.totalStatements - s.simpleStatements;
        const complexPct = s.totalStatements > 0
          ? (complexCount / s.totalStatements * 100).toFixed(1)
          : 0;
        console.log(`${C.dim}Facts: ${s.totalStatements} | Complex: ${complexPct}% | Rules: ${s.rules} | Vars: ${s.variables} | Graphs: ${s.multiLineGraphs}${C.reset}`);
      }

      // Show proof stats
      if (result.proofStats) {
        const p = result.proofStats;
        console.log(`${C.dim}Cases: ${p.total} | 5+ steps: ${p.steps5plus} | 2-4 steps: ${p.steps2to4} | Negative: ${p.negative}${C.reset}`);
      }

      // Show issues
      if (result.errors === 0 && result.warnings === 0) {
        console.log(`  ${C.green}✓ All validations passed${C.reset}`);
      } else {
        for (const issue of result.issues) {
          if (issue.type === 'error') {
            console.log(`  ${C.red}✗ ${issue.msg}${C.reset}`);
          } else if (verbose) {
            console.log(`  ${C.yellow}⚠ ${issue.msg}${C.reset}`);
          }
        }
        if (!verbose && result.warnings > 0) {
          console.log(`  ${C.yellow}${result.warnings} warnings (use --verbose)${C.reset}`);
        }
      }

      totalErrors += result.errors;
      totalWarnings += result.warnings;
      console.log();
    }

    // Global summary
    console.log(`${C.bold}${'═'.repeat(60)}${C.reset}`);
    console.log(`${C.bold}Summary: ${theories.length} theories${C.reset}`);

    if (totalErrors === 0 && totalWarnings === 0) {
      console.log(`${C.green}${C.bold}✓ All validations passed!${C.reset}`);
    } else {
      console.log(`${C.red}${totalErrors} errors${C.reset}, ${C.yellow}${totalWarnings} warnings${C.reset}`);
    }

    process.exit(totalErrors > 0 ? 1 : 0);

  } catch (err) {
    console.error(`${C.red}Error: ${err.message}${C.reset}`);
    if (verbose) console.error(err.stack);
    process.exit(1);
  }
}

main();
