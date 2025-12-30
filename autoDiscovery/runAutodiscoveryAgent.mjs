#!/usr/bin/env node
/**
 * AutoDiscovery Agent (single entry point)
 *
 * Runs:
 * - sampling from external suites (logiglue loader)
 * - NL→DSL translation
 * - real Session.learn + Session.prove/query
 * - quarantine processing + bug folder writes
 *
 * This is the recommended interface for both humans and agents/skills.
 */

import fs from 'node:fs';
import { join } from 'node:path';

import { CACHE_DIR, loadExamples } from './libs/logiglue/dataset-loader.mjs';
import { ensureDir } from './discovery/fs-utils.mjs';
import { loadAnalysedCases } from './discovery/analysed.mjs';
import { runBatch } from './discovery/run-batch.mjs';
import { categorizeQuarantine } from './libs/categorize-quarantine.mjs';
import { refreshFolderReport } from './libs/reports.mjs';
import {
  C,
  DEFAULT_BATCH_SIZE,
  DEFAULT_WORKERS,
  ANALYSED_FILE,
  QUARANTINE_DIR,
  BUG_CASES_DIR,
  NLP_BUGS_DIR
} from './discovery/constants.mjs';
import { BUG_PATTERNS, NLP_BUG_PATTERNS } from './discovery/patterns.mjs';

function parseArgs(argv) {
  const args = argv.slice(2);

  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`${name}=`));
    return arg ? arg.split('=')[1] : null;
  };

  const getIntArg = (name, def) => {
    const val = getArg(name);
    if (val === null || val === undefined) return def;
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : def;
  };

  const modeArg = args.find(a => !a.startsWith('-'));
  const mode = modeArg || 'run';

  return {
    mode,
    batch: getIntArg('--batch', DEFAULT_BATCH_SIZE),
    workers: getIntArg('--workers', DEFAULT_WORKERS),
    source: getArg('--source'),
    seed: getIntArg('--seed', Date.now()),
    continuous: args.includes('--continuous'),
    clean: args.includes('--clean'),
    strictOperators: args.includes('--strict-operators'),
    offline: !args.includes('--online'),
    maxPerBug: getIntArg('--max-per-bug', 10),
    maxPerNlpBug: getIntArg('--max-per-nlpbug', 10),
    keepBugCases: args.includes('--keep-bugcases'),
    keepNlpBugs: args.includes('--keep-nlpbugs'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${C.bold}AutoDiscovery Agent${C.reset}

${C.dim}Single entry point for autoDiscovery. Translates NL→DSL, runs learn+prove/query, and buckets failures.${C.reset}

${C.bold}Usage:${C.reset}
  node autoDiscovery/runAutodiscoveryAgent.mjs [mode] [options]

${C.bold}Modes:${C.reset}
  run              Discover + process quarantine (default)
  discover         Sample + execute, write failures to quarantine
  categorize       Re-run quarantine and bucket into bugCases/nlpBugs
  report           Enforce caps and rewrite report.md files
  clean            Delete analysed/quarantine/bugCases/nlpBugs
  status           Print current folder status (quarantine, bugCases, nlpBugs)

${C.bold}Options:${C.reset}
  --help, -h            Show help
  --batch=N             Sample size per iteration (default: ${DEFAULT_BATCH_SIZE})
  --workers=N           Parallel workers (default: ${DEFAULT_WORKERS})
  --source=NAME         Filter to one source (prontoqa, folio, logiqa, logicnli, ...)
  --seed=N              Random seed (default: Date.now())
  --online              Allow dataset downloads (default: offline/cache-only)
  --max-per-bug=N       Keep at most N cases per BUG folder (default: 10)
  --max-per-nlpbug=N    Keep at most N cases per NLP folder (default: 10)
  --continuous          Loop until interrupted (Ctrl+C)
  --clean               Start from scratch (also deletes bug folders)
  --strict-operators    Disable auto-declaration of unknown operators during translation
  --keep-bugcases       Do not delete existing bugCases on --clean
  --keep-nlpbugs        Do not delete existing nlpBugs on --clean
  --verbose, -v         Per-case verbose output

${C.bold}Examples:${C.reset}
  node autoDiscovery/runAutodiscoveryAgent.mjs --batch=200
  node autoDiscovery/runAutodiscoveryAgent.mjs --source=prontoqa --batch=200
  node autoDiscovery/runAutodiscoveryAgent.mjs --clean --batch=1000
  node autoDiscovery/runAutodiscoveryAgent.mjs --continuous --batch=200
`);
}

function safeRm(pathLike, options = {}) {
  try {
    if (fs.existsSync(pathLike)) {
      fs.rmSync(pathLike, { recursive: true, force: true, ...options });
    }
  } catch {
    // ignore
  }
}

function countJsonFiles(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let total = 0;
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) total += countJsonFiles(p);
      else if (e.isFile() && e.name.endsWith('.json')) total++;
    }
    return total;
  } catch {
    return 0;
  }
}

function printSourceStats(bySourceStats) {
  const rows = Object.entries(bySourceStats || {})
    .map(([source, s]) => {
      const evaluable = Math.max(0, (s.total || 0) - (s.noExpectation || 0) - (s.unsupported || 0));
      const passPct = evaluable > 0 ? ((s.passed || 0) / evaluable) * 100 : null;
      return { source, evaluable, passed: s.passed || 0, total: s.total || 0, passPct };
    })
    .sort((a, b) => (b.evaluable - a.evaluable) || a.source.localeCompare(b.source));

  if (rows.length === 0) return;

  console.log(`\n${C.bold}Per-source pass rate (this run)${C.reset}`);
  for (const r of rows) {
    const pct = r.passPct === null ? 'n/a' : `${r.passPct.toFixed(1)}%`;
    console.log(`  - ${r.source.padEnd(12)} ${pct.padStart(7)}  (${r.passed}/${r.evaluable} evaluable, ${r.total} total)`);
  }
}

function printStatus() {
  const quarantineCount = countJsonFiles(QUARANTINE_DIR);
  const bugCount = countJsonFiles(BUG_CASES_DIR);
  const nlpCount = countJsonFiles(NLP_BUGS_DIR);
  console.log(`${C.bold}autoDiscovery status${C.reset}`);
  console.log(`  - quarantine: ${quarantineCount} json`);
  console.log(`  - bugCases:   ${bugCount} json`);
  console.log(`  - nlpBugs:    ${nlpCount} json`);
  console.log(`  - analysed:   ${fs.existsSync(ANALYSED_FILE) ? 'present' : 'missing'}`);
}

async function runDiscoverOnce(args, { quarantineOnly = true } = {}) {
  console.log(`${C.bold}${C.magenta}AGISystem2 - AutoDiscovery Agent${C.reset}`);
  console.log(`${C.dim}Mode: ${args.mode} | loadCore: true | offline=${args.offline !== false} | autoDeclareUnknownOperators=${!args.strictOperators}${C.reset}\n`);

  ensureDir(QUARANTINE_DIR);
  const analysedCases = args.clean ? new Set() : loadAnalysedCases();
  console.log(`${C.cyan}Previously analysed: ${analysedCases.size} cases${C.reset}`);

  const progressCallback = ({ phase, source }) => {
    if (phase === 'loading') process.stdout.write(`\r  Loading ${source}...`);
  };

  let examples;
  const data = await loadExamples({
    sources: args.source ? [args.source] : null,
    limit: args.batch * 2,
    randomSeed: args.seed,
    offline: args.offline === true,
    progressCallback
  });
  examples = data.examples;
  console.log(`\n  Loaded ${examples.length} examples from ${data.subsetsLoaded?.length || 0} sources`);
  if (examples.length === 0) {
    if (args.offline === true) {
      console.log(`\n${C.yellow}No examples loaded in offline mode.${C.reset}`);
      console.log(`${C.dim}Dataset cache appears empty. Cache dir: ${CACHE_DIR}${C.reset}`);
      console.log(`${C.dim}Tip: run once with --online to download datasets (or set LOGIGLUE_CACHE_DIR to a prefilled cache).${C.reset}`);
    } else if (args.source) {
      console.log(`\n${C.yellow}No examples loaded for source=${args.source}.${C.reset}`);
      console.log(`${C.dim}Check the source name (e.g. prontoqa, folio, logiqa, logicnli, reclor, clutrr, ruletaker).${C.reset}`);
    }
  }

  const results = await runBatch(examples, analysedCases, {
    ...args,
    autoDeclareUnknownOperators: args.strictOperators !== true,
    quarantineAllFailures: quarantineOnly === true
  });

  const accuracy = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : '0.0';
  console.log(`\n${C.bold}Run Results:${C.reset}`);
  console.log(`  ${C.green}Passed:${C.reset} ${results.passed}/${results.total} (${accuracy}%)`);

  const translationTotal = results.categoryA + results.categoryL + results.categoryG;
  console.log(`  ${C.yellow}Translation issues:${C.reset} ${translationTotal}`);
  console.log(`  ${C.red}Reasoning bugs:${C.reset} ${results.categoryB}`);
  console.log(`  ${C.cyan}Unknown:${C.reset} ${results.categoryU}`);
  console.log(`  ${C.dim}No expectation:${C.reset} ${results.categoryN}`);
  console.log(`  ${C.dim}Unsupported:${C.reset} ${results.categoryS}`);
  console.log(`  ${C.dim}Skipped:${C.reset} ${results.skipped}`);

  printSourceStats(results.bySourceStats);

  if (quarantineOnly) {
    const quarantineCount = countJsonFiles(QUARANTINE_DIR);
    console.log(`\n${C.dim}Quarantine now contains ${quarantineCount} case(s). Run:${C.reset}`);
    console.log(`  node autoDiscovery/runAutodiscoveryAgent.mjs categorize --max-per-bug=${args.maxPerBug} --max-per-nlpbug=${args.maxPerNlpBug}`);
  }
}

function refreshAllReports({ maxPerBug = 10, maxPerNlpBug = 10 } = {}) {
  // BUG folders
  if (fs.existsSync(BUG_CASES_DIR)) {
    const bugDirs = fs.readdirSync(BUG_CASES_DIR).filter(d => d.startsWith('BUG') && fs.statSync(join(BUG_CASES_DIR, d)).isDirectory());
    for (const bugId of bugDirs) {
      const p = BUG_PATTERNS[bugId] || { name: bugId, description: '' };
      refreshFolderReport(join(BUG_CASES_DIR, bugId), { id: bugId, title: p.name, description: p.description, maxCases: maxPerBug });
    }
  }
  // NLP folders
  if (fs.existsSync(NLP_BUGS_DIR)) {
    const nlpDirs = fs.readdirSync(NLP_BUGS_DIR).filter(d => d.startsWith('NLP') && fs.statSync(join(NLP_BUGS_DIR, d)).isDirectory());
    for (const nlpId of nlpDirs) {
      const p = NLP_BUG_PATTERNS[nlpId] || { name: nlpId, description: '' };
      refreshFolderReport(join(NLP_BUGS_DIR, nlpId), { id: nlpId, title: p.name, description: p.description, maxCases: maxPerNlpBug });
    }
  }
}

function runCategorize(args) {
  console.log(`${C.bold}${C.magenta}AGISystem2 - AutoDiscovery Agent${C.reset}`);
  console.log(`${C.dim}Mode: categorize | re-run quarantine | autoDeclareUnknownOperators=${!args.strictOperators}${C.reset}\n`);

  const stats = categorizeQuarantine({
    autoDeclareUnknownOperators: args.strictOperators !== true,
    maxPerBug: args.maxPerBug,
    maxPerNlpBug: args.maxPerNlpBug
  });

  console.log(`${C.bold}Categorize Results:${C.reset}`);
  console.log(`  fixed (no longer reproduces): ${stats.fixed}`);
  console.log(`  moved to bugCases: ${stats.movedBug}`);
  console.log(`  moved to nlpBugs:  ${stats.movedNlp}`);

  refreshAllReports({ maxPerBug: args.maxPerBug, maxPerNlpBug: args.maxPerNlpBug });

  const quarantineCount = countJsonFiles(QUARANTINE_DIR);
  console.log(`\n${C.dim}Quarantine remaining: ${quarantineCount}${C.reset}`);
  if (!args.keepNlpBugs) {
    // Optional hygiene: keep only bugCases by default.
    safeRm(NLP_BUGS_DIR);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.mode === 'status') {
    printStatus();
    process.exit(0);
  }

  if (args.mode === 'report') {
    refreshAllReports({ maxPerBug: args.maxPerBug, maxPerNlpBug: args.maxPerNlpBug });
    printStatus();
    process.exit(0);
  }

  if (args.mode === 'clean' || args.clean) {
    safeRm(ANALYSED_FILE, { force: true });
    safeRm(QUARANTINE_DIR);
    if (!args.keepBugCases) safeRm(BUG_CASES_DIR);
    if (!args.keepNlpBugs) safeRm(NLP_BUGS_DIR);
    if (args.mode === 'clean') {
      console.log(`${C.green}autoDiscovery cleaned.${C.reset}`);
      process.exit(0);
    }
  }

  const loop = args.continuous === true;
  do {
    if (args.mode === 'categorize') {
      runCategorize(args);
    } else if (args.mode === 'discover') {
      await runDiscoverOnce(args, { quarantineOnly: true });
    } else {
      // default: run = discover + categorize (keeps quarantine empty)
      await runDiscoverOnce({ ...args, mode: 'discover' }, { quarantineOnly: true });
      runCategorize(args);
    }
    if (!loop) break;
    console.log(`\n${C.dim}Continuing... (Ctrl+C to stop)${C.reset}`);
    await new Promise(r => setTimeout(r, 500));
  } while (true);
}

main().catch(err => {
  console.error(`${C.red}Fatal:${C.reset} ${err?.message || String(err)}`);
  process.exit(1);
});
