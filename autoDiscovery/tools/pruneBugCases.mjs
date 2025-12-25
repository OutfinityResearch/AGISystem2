#!/usr/bin/env node
/**
 * Prune bugCases by re-validating them.
 *
 * Deletes:
 * - Individual case JSON files that no longer fail (boolean validation passes).
 * - Entire BUG folders that end up with 0 JSON cases (including report.md).
 *
 * Usage:
 *   node autoDiscovery/tools/pruneBugCases.mjs
 *   node autoDiscovery/tools/pruneBugCases.mjs --bug=BUG001
 *   node autoDiscovery/tools/pruneBugCases.mjs --dry-run
 */

import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateOne } from '../libs/pruneBugCases.lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUG_CASES_DIR = join(__dirname, '..', 'bugCases');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`${name}=`));
    return arg ? arg.split('=')[1] : null;
  };
  return {
    bugId: getArg('--bug'),
    dryRun: args.includes('--dry-run'),
    keepSkipped: args.includes('--keep-skipped'),
    autoDeclareUnknownOperators: !args.includes('--strict-operators'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${C.bold}Prune Bug Cases${C.reset}

Deletes cases that no longer reproduce and removes empty bug folders.

Usage:
  node autoDiscovery/tools/pruneBugCases.mjs [options]

Options:
  --bug=BUGID         Only prune a specific bug folder
  --dry-run           Print what would be deleted without deleting
  --keep-skipped      Keep cases that cannot be validated (missing expectProved or NL)
  --strict-operators  Disable auto-declaration for unknown operators during translation
  --help, -h          Show help
`);
}

function listBugDirs(bugId) {
  if (!fs.existsSync(BUG_CASES_DIR)) return [];
  return fs.readdirSync(BUG_CASES_DIR)
    .filter(d => {
      if (bugId && d !== bugId) return false;
      return fs.statSync(join(BUG_CASES_DIR, d)).isDirectory();
    });
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
}

function safeRm(fileOrDir, dryRun) {
  if (dryRun) return;
  fs.rmSync(fileOrDir, { recursive: true, force: true });
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const bugDirs = listBugDirs(args.bugId);
  if (bugDirs.length === 0) {
    console.log(`${C.yellow}No bug folders found in ${BUG_CASES_DIR}${C.reset}`);
    process.exit(0);
  }

  console.log(`${C.bold}${C.magenta}Pruning bugCases${C.reset} ${args.dryRun ? '(dry-run)' : ''}`);

  let deletedCases = 0;
  let keptCases = 0;
  let deletedDirs = 0;

  for (const bugId of bugDirs) {
    const bugDir = join(BUG_CASES_DIR, bugId);
    const jsonFiles = listJsonFiles(bugDir);
    if (jsonFiles.length === 0) continue;

    let keptInDir = 0;
    for (const file of jsonFiles) {
      let res;
      try {
        res = await validateOne(file, { autoDeclareUnknownOperators: args.autoDeclareUnknownOperators });
      } catch (e) {
        res = { ok: false, reason: `exception:${e.message}` };
      }

      if (res.skipped) {
        if (args.keepSkipped) {
          keptInDir++;
          keptCases++;
        } else {
          deletedCases++;
          if (args.dryRun) {
            console.log(`${C.dim}rm${C.reset} ${file}  # skipped: ${res.reason}`);
          }
          safeRm(file, args.dryRun);
        }
        continue;
      }

      if (res.ok) {
        deletedCases++;
        if (args.dryRun) {
          console.log(`${C.dim}rm${C.reset} ${file}`);
        }
        safeRm(file, args.dryRun);
      } else {
        keptInDir++;
        keptCases++;
      }
    }

    const remainingJson = listJsonFiles(bugDir);
    if (remainingJson.length === 0) {
      deletedDirs++;
      if (args.dryRun) {
        console.log(`${C.dim}rm -r${C.reset} ${bugDir}`);
      }
      safeRm(bugDir, args.dryRun);
    } else if (keptInDir > 0) {
      // keep report.md as-is
    }
  }

  console.log(`\n${C.bold}Prune Summary${C.reset}`);
  console.log(`  Deleted cases: ${deletedCases}`);
  console.log(`  Kept cases: ${keptCases}`);
  console.log(`  Deleted bug folders: ${deletedDirs}`);

  process.exit(0);
}

main().catch(err => {
  console.error(`${C.red}Fatal:${C.reset} ${err.message}`);
  process.exit(1);
});
