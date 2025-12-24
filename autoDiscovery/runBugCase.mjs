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
import { validateQuestionDsl } from './discovery/session.mjs';

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

function loadCoreTheories(session) {
  const result = session.loadCore({ includeIndex: false });
  if (result.success !== true) {
    const msg = result.errors?.map(e => `${e.file}: ${e.errors?.join('; ')}`).join(' | ') || 'unknown error';
    throw new Error(`loadCore failed: ${msg}`);
  }
  return 1;
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
  const {
    updateExpected = false,
    acceptActual = false,
    verbose = true,
    autoDeclareUnknownOperators = true
  } = options;

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
    label: bugCase.dataset?.label,
    translateOptions: { autoDeclareUnknownOperators, expandCompoundQuestions: true }
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
    reasoningPriority: REASONING_PRIORITY.SYMBOLIC,
    reasoningProfile: 'theoryDriven'
  });

  try {
    loadCoreTheories(session);
  } catch (err) {
    console.log(`${C.red}Core Load Failed:${C.reset} ${err.message}`);
    return { success: false, error: 'core_load_failed', caseId };
  }

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
  const goals = goalValidation.goals || [translated.questionDsl];
  const goalLogic = goalValidation.goalLogic || 'Single';
  if (autoDeclareUnknownOperators && Array.isArray(goalValidation.declaredOperators) && goalValidation.declaredOperators.length > 0) {
    const declLines = goalValidation.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
    session.learn(declLines);
  }
  const perGoal = goals.map(g => ({ goalDsl: g, result: session.prove(g, { timeout: 2000 }) }));
  const provedValid = goalLogic === 'Or'
    ? perGoal.some(p => p.result.valid === true)
    : perGoal.every(p => p.result.valid === true);
  const proveResult = {
    valid: provedValid,
    method: goals.length > 1 ? `compound_goal_${goalLogic.toLowerCase()}` : (perGoal[0]?.result?.method || null),
    steps: goals.length > 1 ? [] : (perGoal[0]?.result?.steps || []),
    reason: goals.length > 1 ? null : (perGoal[0]?.result?.reason || null),
    parts: perGoal.map(p => ({
      goalDsl: p.goalDsl,
      valid: p.result.valid,
      method: p.result.method || null,
      reason: p.result.reason || null,
      stepsCount: p.result.steps?.length || 0
    }))
  };

  // Step 6: Generate actual_nl using describeResult
  let actual_nl;
  if (goals.length === 1) {
    actual_nl = session.describeResult({ action: 'prove', reasoningResult: perGoal[0].result, queryDsl: goals[0] });
  } else {
    const parts = perGoal.map(p => {
      const nl = session.describeResult({ action: 'prove', reasoningResult: p.result, queryDsl: p.goalDsl });
      return `- ${p.goalDsl}\n  ${nl}`;
    });
    actual_nl = `Compound goal (${goalLogic}):\n${parts.join('\n')}`;
  }

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
  const expectedMarkedTodo = typeof expected_nl === 'string' && /(^|\b)todo(\b|$)/i.test(expected_nl);
  if (!expected_nl || expectedMarkedTodo) {
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
  --strict-operators Do not auto-declare unknown verb operators in translation
  --help, -h         Show this help

${C.bold}Example:${C.reset}
  node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG001/prontoqa_xxx.json
`);
    process.exit(0);
  }

  const updateExpected = args.includes('--update-expected') || args.includes('--accept-actual');
  const autoDeclareUnknownOperators = !args.includes('--strict-operators');
  const caseFile = args.find(a => a.endsWith('.json'));

  if (!caseFile) {
    console.error(`${C.red}Error: No JSON case file specified${C.reset}`);
    process.exit(1);
  }

  const result = await runBugCase(caseFile, { updateExpected, verbose: true, autoDeclareUnknownOperators });

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
