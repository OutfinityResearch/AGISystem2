#!/usr/bin/env node
/**
 * Bug Cases Validator (boolean semantics only)
 *
 * Validates bug cases in `autoDiscovery/bugCases/*` by re-running:
 *   NL -> DSL (translateExample)
 *   Session.learn(contextDsl)
 *   Session.prove/query(questionDsl)
 *
 * It checks only boolean correctness vs `dataset.expectProved` and ignores `expected_nl`.
 *
 * Usage:
 *   node autoDiscovery/validateBugCases.mjs
 *   node autoDiscovery/validateBugCases.mjs --bug=BUG001
 *   node autoDiscovery/validateBugCases.mjs --bug=BUG001 --limit=50
 *   node autoDiscovery/validateBugCases.mjs --strict-operators
 */

import fs from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { translateExample, resetRefCounter } from '../src/nlp/nl2dsl.mjs';
import { Session } from '../src/runtime/session.mjs';
import { REASONING_PRIORITY } from '../src/core/constants.mjs';
import { validateQuestionDsl } from './discovery/session.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUG_CASES_DIR = join(__dirname, 'bugCases');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`${name}=`));
    return arg ? arg.split('=')[1] : null;
  };
  const getIntArg = (name, defaultVal) => {
    const val = getArg(name);
    return val ? parseInt(val, 10) : defaultVal;
  };
  return {
    bugId: getArg('--bug'),
    limit: getIntArg('--limit', 0),
    autoDeclareUnknownOperators: !args.includes('--strict-operators'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${C.bold}Bug Cases Validator${C.reset}

Validates bug cases by boolean result only (expectProved vs proved).

Usage:
  node autoDiscovery/validateBugCases.mjs [options]

Options:
  --bug=BUGID         Validate only this bug folder (e.g. BUG001)
  --limit=N           Validate at most N cases (0 = all)
  --strict-operators  Disable auto-declaration for unknown operators during translation
  --verbose, -v       Print per-case results
  --help, -h          Show help
`);
}

function findCaseFiles(bugId = null) {
  if (!fs.existsSync(BUG_CASES_DIR)) return [];
  const bugDirs = fs.readdirSync(BUG_CASES_DIR)
    .filter(d => {
      if (bugId && d !== bugId) return false;
      return fs.statSync(join(BUG_CASES_DIR, d)).isDirectory();
    });
  const out = [];
  for (const dir of bugDirs) {
    const bugPath = join(BUG_CASES_DIR, dir);
    const jsons = fs.readdirSync(bugPath).filter(f => f.endsWith('.json'));
    for (const f of jsons) {
      out.push({ bugId: dir, file: join(bugPath, f), caseId: basename(f, '.json') });
    }
  }
  return out;
}

function queryToBool(result) {
  if (!result) return false;
  if (result.success !== true) return false;
  if (Array.isArray(result.allResults)) return result.allResults.length > 0;
  if (Array.isArray(result.matches)) return result.matches.length > 0;
  return true;
}

function loadCoreTheories(session) {
  const result = session.loadCore({ includeIndex: false });
  if (result.success !== true) {
    const msg = result.errors?.map(e => `${e.file}: ${e.errors?.join('; ')}`).join(' | ') || 'unknown error';
    throw new Error(`loadCore failed: ${msg}`);
  }
}

async function validateOne(caseFile, { autoDeclareUnknownOperators } = {}) {
  const raw = JSON.parse(fs.readFileSync(caseFile, 'utf8'));
  const expectProved = raw?.dataset?.expectProved;
  if (expectProved !== true && expectProved !== false) {
    return { ok: true, skipped: true, reason: 'no_expectation' };
  }

  resetRefCounter();
  const translated = translateExample({
    source: raw.source || 'generic',
    context: raw.input?.context_nl,
    question: raw.input?.question_nl,
    label: raw.dataset?.label,
    translateOptions: { autoDeclareUnknownOperators, expandCompoundQuestions: true }
  });

  const goalValidation = validateQuestionDsl(translated.questionDsl);
  if (!goalValidation.valid) {
    return { ok: false, reason: `invalid_goal:${goalValidation.reason}` };
  }

  const sessionConfig = raw.sessionConfig || {
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

  loadCoreTheories(session);

  const learnResult = session.learn(translated.contextDsl);
  if (learnResult.success !== true) {
    return { ok: false, reason: `learn_failed:${(learnResult.errors || []).join('; ')}` };
  }

  // Declare goal ops if the validator extracted any.
  if (autoDeclareUnknownOperators && Array.isArray(goalValidation.declaredOperators) && goalValidation.declaredOperators.length > 0) {
    const declLines = goalValidation.declaredOperators.map(op => `@${op}:${op} __Relation`).join('\n');
    session.learn(declLines);
  }

  const goals = goalValidation.goals || [translated.questionDsl];
  const goalLogic = goalValidation.goalLogic || 'Single';
  const action = goalValidation.action || (goals.some(g => g.includes('?')) ? 'query' : 'prove');

  const perGoal = goals.map(goalDsl => {
    if (action === 'query') {
      const result = session.query(goalDsl, { timeout: 2000 });
      return { goalDsl, ok: queryToBool(result), result };
    }
    const result = session.prove(goalDsl, { timeout: 2000 });
    return { goalDsl, ok: result?.valid === true, result };
  });

  const proved = goalLogic === 'Or' ? perGoal.some(p => p.ok) : perGoal.every(p => p.ok);
  const correct = proved === expectProved;
  return { ok: correct, proved, expectProved, action, goalLogic, perGoal };
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const files = findCaseFiles(args.bugId);
  if (files.length === 0) {
    console.log(`${C.yellow}No bug cases found in ${BUG_CASES_DIR}${C.reset}`);
    process.exit(0);
  }

  const limit = args.limit > 0 ? Math.min(args.limit, files.length) : files.length;
  const toRun = files.slice(0, limit);

  console.log(`${C.bold}${C.magenta}Bug Cases Validator${C.reset}`);
  console.log(`${C.dim}Boolean validation only (ignores expected_nl). Cases: ${toRun.length}${C.reset}\n`);

  const byBug = {};
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const { bugId, file, caseId } of toRun) {
    byBug[bugId] = byBug[bugId] || { total: 0, passed: 0, failed: 0, skipped: 0 };
    byBug[bugId].total++;

    let result;
    try {
      result = await validateOne(file, { autoDeclareUnknownOperators: args.autoDeclareUnknownOperators });
    } catch (e) {
      result = { ok: false, reason: `exception:${e.message}` };
    }

    if (result.skipped) {
      skipped++;
      byBug[bugId].skipped++;
      if (args.verbose) console.log(`${C.dim}-${C.reset} ${caseId} [${bugId}] SKIP (${result.reason})`);
      continue;
    }

    if (result.ok) {
      passed++;
      byBug[bugId].passed++;
      if (args.verbose) console.log(`${C.green}✓${C.reset} ${caseId} [${bugId}]`);
      continue;
    }

    failed++;
    byBug[bugId].failed++;
    if (args.verbose) {
      const exp = result.expectProved;
      const got = result.proved;
      console.log(`${C.red}✗${C.reset} ${caseId} [${bugId}] expect=${exp} got=${got} ${result.reason ? `(${result.reason})` : ''}`);
    }
  }

  console.log(`${C.bold}Summary${C.reset}`);
  console.log(`  ${C.green}Passed:${C.reset} ${passed}`);
  console.log(`  ${C.red}Failed:${C.reset} ${failed}`);
  console.log(`  ${C.dim}Skipped:${C.reset} ${skipped}\n`);

  console.log(`${C.bold}By Bug${C.reset}`);
  for (const [bugId, s] of Object.entries(byBug).sort()) {
    const color = s.failed === 0 ? C.green : C.red;
    console.log(`  ${bugId}: ${color}${s.passed}/${s.total}${C.reset} (failed=${s.failed}, skipped=${s.skipped})`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${C.red}Fatal:${C.reset} ${err.message}`);
  process.exit(1);
});

