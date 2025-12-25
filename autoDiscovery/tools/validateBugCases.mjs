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

import { validateOne } from '../libs/bugcase-validator.lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUG_CASES_DIR = join(__dirname, '..', 'bugCases');

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
