#!/usr/bin/env node
/**
 * Bug Case Runner
 *
 * Runs a single bug case from JSON file and validates expected vs actual.
 *
 * Usage:
 *   node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_xxx.json
 *   node autoDiscovery/runBugCase.mjs --update-expected case.json  # Update expected_nl from actual
 *   node autoDiscovery/runBugCase.mjs --accept-actual case.json    # Accept actual as expected
 */

import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { translateExample, resetRefCounter } from '../src/nlp/nl2dsl.mjs';
import { Session } from '../src/runtime/session.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_ROOT = join(ROOT, 'config');

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

/**
 * Load Core theories into session
 */
function loadCoreTheories(session) {
  const corePath = join(CONFIG_ROOT, 'Core');
  if (!fs.existsSync(corePath)) return 0;

  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  let loaded = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(join(corePath, file), 'utf8');
      const res = session.learn(content);
      if (res.success !== false) loaded++;
    } catch (err) { /* skip */ }
  }
  return loaded;
}

/**
 * Validate questionDsl is valid for prove()
 * STRICT: must be single statement or have @goal as first line
 */
function validateQuestionDsl(questionDsl) {
  if (!questionDsl || !questionDsl.trim()) {
    return { valid: false, reason: 'empty_question_dsl' };
  }

  const lines = questionDsl.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));

  if (lines.length === 0) {
    return { valid: false, reason: 'no_statements' };
  }

  if (lines.length === 1) {
    // Single statement is OK (but should ideally start with @goal)
    return { valid: true };
  }

  // Multi-line: MUST have @goal as first statement
  const firstLine = lines[0].trim();
  if (firstLine.startsWith('@goal ') || firstLine.startsWith('@goal:')) {
    return { valid: true };
  }

  // Check if any line has @goal (but not first) - this is INVALID
  const hasGoalElsewhere = lines.slice(1).some(l => l.trim().startsWith('@goal'));
  if (hasGoalElsewhere) {
    return { valid: false, reason: 'goal_not_first_statement' };
  }

  // Multi-line without explicit @goal - INVALID (translator contract violation)
  return { valid: false, reason: 'multi_statement_no_goal' };
}

/**
 * Normalize text for comparison
 */
function normalizeForComparison(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[.,!?:;]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Run a bug case
 */
async function runBugCase(caseFile, options = {}) {
  const { updateExpected = false, acceptActual = false, verbose = true } = options;

  // Load case JSON
  if (!fs.existsSync(caseFile)) {
    console.error(`${C.red}Error: Case file not found: ${caseFile}${C.reset}`);
    return { success: false, error: 'file_not_found' };
  }

  let bugCase;
  try {
    bugCase = JSON.parse(fs.readFileSync(caseFile, 'utf8'));
  } catch (err) {
    console.error(`${C.red}Error: Invalid JSON: ${err.message}${C.reset}`);
    return { success: false, error: 'invalid_json' };
  }

  const caseId = bugCase.caseId || basename(caseFile, '.json');

  if (verbose) {
    console.log(`\n${C.bold}${C.cyan}Running Bug Case: ${caseId}${C.reset}`);
    console.log(`${'─'.repeat(50)}`);
  }

  // Step 1: Translate from NL
  resetRefCounter();
  const translated = translateExample({
    source: bugCase.source || 'generic',
    context: bugCase.input?.context_nl,
    question: bugCase.input?.question_nl,
    label: bugCase.dataset?.label
  });

  // Step 2: Validate questionDsl
  const goalValidation = validateQuestionDsl(translated.questionDsl);
  if (!goalValidation.valid) {
    console.log(`${C.yellow}Translator Contract Violation:${C.reset} ${goalValidation.reason}`);
    console.log(`questionDsl:\n${translated.questionDsl}`);
    return {
      success: false,
      error: 'translator_contract_violation',
      reason: goalValidation.reason,
      caseId
    };
  }

  // Step 3: Create session with config
  const sessionConfig = bugCase.sessionConfig || {
    hdcStrategy: 'dense-binary',
    geometry: 256,
    closedWorldAssumption: true,
    rejectContradictions: false
  };

  const session = new Session({
    ...sessionConfig,
    reasoningPriority: REASONING_PRIORITY.HOLOGRAPHIC,
    reasoningProfile: 'theoryDriven'
  });

  loadCoreTheories(session);

  // Step 4: Learn context
  const learnResult = session.learn(translated.contextDsl);
  if (learnResult.success === false || (learnResult.errors && learnResult.errors.length > 0)) {
    console.log(`${C.red}Learn Failed:${C.reset} ${learnResult.errors?.join(', ') || 'unknown error'}`);
    return {
      success: false,
      error: 'learn_failed',
      learnResult,
      caseId
    };
  }

  // Step 5: Prove
  const proveResult = session.prove(translated.questionDsl, { timeout: 2000 });

  // Step 6: Generate actual_nl using describeResult
  const actual_nl = session.describeResult({
    action: 'prove',
    reasoningResult: proveResult,
    queryDsl: translated.questionDsl
  });

  // Step 7: Check expected_nl
  const expected_nl = bugCase.expected?.expected_nl;
  const expectProved = bugCase.dataset?.expectProved;

  if (verbose) {
    console.log(`\n${C.bold}Results:${C.reset}`);
    console.log(`  Expected (expectProved): ${expectProved === true ? C.green : C.red}${expectProved}${C.reset}`);
    console.log(`  Actual (valid): ${proveResult.valid === true ? C.green : C.red}${proveResult.valid}${C.reset}`);
    console.log(`  Steps: ${proveResult.steps?.length || 0}`);
    console.log(`\n${C.bold}actual_nl:${C.reset}`);
    console.log(`  ${actual_nl}`);
  }

  // Handle missing expected_nl
  if (!expected_nl || expected_nl === 'TODO') {
    console.log(`\n${C.yellow}Missing expected_nl!${C.reset}`);
    console.log(`\nTo complete this bug case, add expected_nl to the JSON file.`);
    console.log(`\n${C.bold}Suggested expected_nl based on expectProved=${expectProved}:${C.reset}`);

    if (expectProved === true) {
      console.log(`  "expected_nl": "True: [goal description]. Proof: [steps]"`);
    } else if (expectProved === false) {
      console.log(`  "expected_nl": "Cannot prove: [goal description]"`);
    }

    console.log(`\n${C.bold}Or run with --accept-actual to use actual_nl:${C.reset}`);
    console.log(`  node autoDiscovery/runBugCase.mjs --accept-actual ${caseFile}`);

    if (acceptActual || updateExpected) {
      // Update the JSON file
      bugCase.expected = bugCase.expected || {};
      bugCase.expected.expected_nl = actual_nl;
      bugCase.expected.note = `auto-filled from actual_nl on ${new Date().toISOString()}`;

      fs.writeFileSync(caseFile, JSON.stringify(bugCase, null, 2));
      console.log(`\n${C.green}Updated expected_nl in ${caseFile}${C.reset}`);
    }

    return {
      success: false,
      error: 'missing_expected_nl',
      actual_nl,
      caseId
    };
  }

  if (verbose) {
    console.log(`\n${C.bold}expected_nl:${C.reset}`);
    console.log(`  ${expected_nl}`);
  }

  // Step 8: Compare expectProved vs proveResult.valid
  const correctProved = (proveResult.valid === expectProved);

  // Step 9: Compare expected_nl vs actual_nl (tolerant)
  const normalizedExpected = normalizeForComparison(expected_nl);
  const normalizedActual = normalizeForComparison(actual_nl);
  const nlMatch = normalizedActual.includes(normalizedExpected) ||
                  normalizedExpected.includes(normalizedActual);

  if (verbose) {
    console.log(`\n${C.bold}Comparison:${C.reset}`);
    console.log(`  Proved match: ${correctProved ? C.green + 'YES' : C.red + 'NO'}${C.reset}`);
    console.log(`  NL match: ${nlMatch ? C.green + 'YES' : C.red + 'NO'}${C.reset}`);
  }

  const overallSuccess = correctProved && nlMatch;

  if (verbose) {
    console.log(`\n${C.bold}Overall: ${overallSuccess ? C.green + 'PASS' : C.red + 'FAIL'}${C.reset}`);
  }

  return {
    success: overallSuccess,
    caseId,
    correctProved,
    nlMatch,
    expectProved,
    provedValid: proveResult.valid,
    expected_nl,
    actual_nl,
    stepsCount: proveResult.steps?.length || 0,
    reason: proveResult.reason
  };
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${C.bold}Bug Case Runner${C.reset}

Runs a single bug case from JSON and validates expected vs actual.

${C.bold}Usage:${C.reset}
  node autoDiscovery/runBugCase.mjs <case.json>
  node autoDiscovery/runBugCase.mjs --accept-actual <case.json>
  node autoDiscovery/runBugCase.mjs --update-expected <case.json>

${C.bold}Options:${C.reset}
  --accept-actual    If expected_nl is missing, use actual_nl as expected
  --update-expected  Same as --accept-actual
  --help, -h         Show this help

${C.bold}Example:${C.reset}
  node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_xxx.json
`);
    process.exit(0);
  }

  const updateExpected = args.includes('--update-expected') || args.includes('--accept-actual');
  const caseFile = args.find(a => a.endsWith('.json'));

  if (!caseFile) {
    console.error(`${C.red}Error: No JSON case file specified${C.reset}`);
    process.exit(1);
  }

  const result = await runBugCase(caseFile, { updateExpected, verbose: true });

  process.exit(result.success ? 0 : 1);
}

// Only run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
    console.error(err.stack);
    process.exit(1);
  });
}

export { runBugCase, validateQuestionDsl };
