#!/usr/bin/env node
/**
 * Bug Suite Runner
 *
 * Runs all bug cases from autoDiscovery/bugCases/ and reports results.
 *
 * Usage:
 *   node autoDiscovery/tools/runBugSuite.mjs                    # Run all cases
 *   node autoDiscovery/tools/runBugSuite.mjs --bug=BUG001       # Run specific bug cases
 *   node autoDiscovery/tools/runBugSuite.mjs --update-missing   # Fill missing expected_nl
 *   node autoDiscovery/tools/runBugSuite.mjs --verbose          # Show per-case details
 */

import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { runBugCase } from './runBugCase.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUG_CASES_DIR = join(__dirname, '..', 'bugCases');

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
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`${name}=`));
    return arg ? arg.split('=')[1] : null;
  };

  return {
    bugId: getArg('--bug'),
    updateMissing: args.includes('--update-missing'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    autoDeclareUnknownOperators: !args.includes('--strict-operators'),
    help: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Find all JSON case files
 */
function findCaseFiles(bugId = null) {
  const files = [];

  if (!fs.existsSync(BUG_CASES_DIR)) {
    return files;
  }

  const bugDirs = fs.readdirSync(BUG_CASES_DIR)
    .filter(d => {
      if (bugId && d !== bugId) return false;
      return fs.statSync(join(BUG_CASES_DIR, d)).isDirectory();
    });

  for (const bugDir of bugDirs) {
    const bugPath = join(BUG_CASES_DIR, bugDir);
    const caseFiles = fs.readdirSync(bugPath)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        bugId: bugDir,
        file: join(bugPath, f),
        caseId: basename(f, '.json')
      }));

    files.push(...caseFiles);
  }

  return files;
}

/**
 * Run all bug cases
 */
async function runSuite(options = {}) {
  const { bugId, updateMissing, verbose } = options;

  const caseFiles = findCaseFiles(bugId);

  if (caseFiles.length === 0) {
    console.log(`${C.yellow}No bug cases found in ${BUG_CASES_DIR}${C.reset}`);
    if (bugId) {
      console.log(`Looking for: ${bugId}`);
    }
    return { total: 0, passed: 0, failed: 0, incomplete: 0 };
  }

  console.log(`\n${C.bold}${C.magenta}Bug Suite Runner${C.reset}`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`Found ${caseFiles.length} cases ${bugId ? `for ${bugId}` : 'total'}`);
  console.log();

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    incomplete: 0,
    translatorViolations: 0,
    learnFailed: 0,
    byBug: {}
  };

  const incompleteFiles = [];

  for (const { bugId: caseBugId, file, caseId } of caseFiles) {
    results.total++;
    results.byBug[caseBugId] = results.byBug[caseBugId] || { total: 0, passed: 0, failed: 0 };
    results.byBug[caseBugId].total++;

    try {
      const result = await runBugCase(file, {
        updateExpected: updateMissing,
        verbose: false,
        autoDeclareUnknownOperators: options.autoDeclareUnknownOperators
      });

      if (result.error === 'missing_expected_nl') {
        results.incomplete++;
        incompleteFiles.push(file);
        if (verbose) {
          console.log(`${C.yellow}?${C.reset} ${caseId} [${caseBugId}] - missing expected_nl`);
        }
      } else if (result.error === 'translator_contract_violation') {
        results.translatorViolations++;
        results.byBug[caseBugId].failed++;
        if (verbose) {
          console.log(`${C.yellow}!${C.reset} ${caseId} [${caseBugId}] - translator violation: ${result.reason}`);
        }
      } else if (result.error === 'learn_failed') {
        results.learnFailed++;
        results.byBug[caseBugId].failed++;
        if (verbose) {
          console.log(`${C.red}L${C.reset} ${caseId} [${caseBugId}] - learn failed`);
        }
      } else if (result.success) {
        results.passed++;
        results.byBug[caseBugId].passed++;
        if (verbose) {
          console.log(`${C.green}✓${C.reset} ${caseId} [${caseBugId}]`);
        }
      } else {
        results.failed++;
        results.byBug[caseBugId].failed++;
        if (verbose) {
          console.log(`${C.red}✗${C.reset} ${caseId} [${caseBugId}]`);
          console.log(`    Expected: ${result.expectProved}, Got: ${result.provedValid}`);
          console.log(`    expected_nl: ${result.expected_nl?.slice(0, 60)}...`);
          console.log(`    actual_nl: ${result.actual_nl?.slice(0, 60)}...`);
        }
      }
    } catch (err) {
      results.failed++;
      results.byBug[caseBugId].failed++;
      console.log(`${C.red}E${C.reset} ${caseId} [${caseBugId}] - ${err.message}`);
    }
  }

  // Summary
  console.log(`\n${C.bold}Summary${C.reset}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  Total: ${results.total}`);
  console.log(`  ${C.green}Passed:${C.reset} ${results.passed}`);
  console.log(`  ${C.red}Failed:${C.reset} ${results.failed}`);
  console.log(`  ${C.yellow}Incomplete (missing expected_nl):${C.reset} ${results.incomplete}`);

  if (results.translatorViolations > 0) {
    console.log(`  ${C.yellow}Translator Violations:${C.reset} ${results.translatorViolations}`);
  }
  if (results.learnFailed > 0) {
    console.log(`  ${C.yellow}Learn Failed:${C.reset} ${results.learnFailed}`);
  }

  // Per-bug breakdown
  console.log(`\n${C.bold}By Bug ID:${C.reset}`);
  for (const [bId, stats] of Object.entries(results.byBug).sort()) {
    const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(0) : '0';
    const color = stats.passed === stats.total ? C.green : stats.passed > 0 ? C.yellow : C.red;
    console.log(`  ${bId}: ${color}${stats.passed}/${stats.total}${C.reset} (${passRate}%)`);
  }

  // Show incomplete files needing attention
  if (incompleteFiles.length > 0 && !updateMissing) {
    console.log(`\n${C.yellow}Incomplete cases need expected_nl:${C.reset}`);
    for (const file of incompleteFiles.slice(0, 5)) {
      console.log(`  ${file}`);
    }
    if (incompleteFiles.length > 5) {
      console.log(`  ... and ${incompleteFiles.length - 5} more`);
    }
    console.log(`\nRun with --update-missing to auto-fill from actual_nl`);
  }

  console.log();

  return results;
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
${C.bold}Bug Suite Runner${C.reset}

Runs all bug cases from autoDiscovery/bugCases/ and reports results.

${C.bold}Usage:${C.reset}
  node autoDiscovery/tools/runBugSuite.mjs [options]

${C.bold}Options:${C.reset}
  --bug=BUGID         Run only cases for specific bug (e.g., --bug=BUG001)
  --update-missing    Auto-fill missing expected_nl from actual_nl
  --verbose, -v       Show per-case results
  --strict-operators  Do not auto-declare unknown verb operators in translation
  --help, -h          Show this help

${C.bold}Directory Structure:${C.reset}
  autoDiscovery/bugCases/
    BUG001/
      prontoqa_xxx.json
      prontoqa_yyy.json
    BUG002/
      folio_zzz.json

${C.bold}Exit Codes:${C.reset}
  0 - All cases passed
  1 - Some cases failed or incomplete
`);
}

/**
 * Main
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const results = await runSuite(args);

  const hasFailures = results.failed > 0 || results.incomplete > 0;
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});
