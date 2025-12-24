#!/usr/bin/env node
/**
 * Automated Bug Discovery Script
 *
 * - Samples examples (dataset-loader)
 * - Translates NL→DSL
 * - Runs a real Session.learn + Session.prove using symbolicPriority
 * - Records failures into quarantine/ and bug folders
 *
 * Default behavior for discovery:
 * - autoDeclareUnknownOperators=true (opt-in safety for discovery runs)
 * - loadCore() always
 */

import { loadExamples } from './libs/logiglue/dataset-loader.mjs';
import { ensureDir } from './discovery/fs-utils.mjs';
import { loadAnalysedCases } from './discovery/analysed.mjs';
import { analyzeQuarantine } from './discovery/quarantine.mjs';
import {
  C,
  DEFAULT_BATCH_SIZE,
  DEFAULT_WORKERS,
  QUARANTINE_DIR
} from './discovery/constants.mjs';
import { runBatch } from './discovery/run-batch.mjs';
import { BUG_PATTERNS, NLP_BUG_PATTERNS } from './discovery/patterns.mjs';

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
    batch: getIntArg('--batch', DEFAULT_BATCH_SIZE),
    workers: getIntArg('--workers', DEFAULT_WORKERS),
    source: getArg('--source'),
    continuous: args.includes('--continuous'),
    analyze: args.includes('--analyze'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    seed: getIntArg('--seed', Date.now()),
    autoDeclareUnknownOperators: !args.includes('--strict-operators'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
${C.bold}Automated Bug Discovery Script${C.reset}

Runs continuous evaluation to discover translation bugs and reasoning failures.

${C.bold}Usage:${C.reset}
  node autoDiscovery/bugsAutoDiscovery.mjs [options]

${C.bold}Options:${C.reset}
  --help, -h            Show this help message
  --batch=N             Process N cases per batch (default: ${DEFAULT_BATCH_SIZE})
  --workers=N           Parallel workers (default: ${DEFAULT_WORKERS})
  --source=NAME         Only use specific source (prontoqa, folio, ruletaker, etc.)
  --continuous          Run indefinitely until interrupted
  --analyze             Analyze quarantine folder and exit
  --verbose, -v         Show per-case results
  --seed=N              Random seed for sampling
  --strict-operators    Disable auto-declaration for unknown verb operators

${C.bold}Examples:${C.reset}
  node autoDiscovery/bugsAutoDiscovery.mjs --batch=100
  node autoDiscovery/bugsAutoDiscovery.mjs --source=prontoqa
  node autoDiscovery/bugsAutoDiscovery.mjs --continuous
  node autoDiscovery/bugsAutoDiscovery.mjs --analyze
`);
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.analyze) {
    analyzeQuarantine();
    process.exit(0);
  }

  console.log(`${C.bold}${C.magenta}AGISystem2 - Automated Bug Discovery${C.reset}`);
  console.log(`${C.dim}Discovery mode: symbolicPriority, loadCore, autoDeclareUnknownOperators=${args.autoDeclareUnknownOperators}${C.reset}\n`);

  ensureDir(QUARANTINE_DIR);
  const analysedCases = loadAnalysedCases();
  console.log(`${C.cyan}Previously analysed: ${analysedCases.size} cases${C.reset}`);

  const progressCallback = ({ phase, source }) => {
    if (phase === 'loading') process.stdout.write(`\r  Loading ${source}...`);
  };

  let iteration = 0;
  let totalProcessed = 0;
  let totalPassed = 0;
  let totalCategoryA = 0;
  let totalCategoryB = 0;

  do {
    iteration++;
    console.log(`\n${C.bold}${C.blue}━━━ Iteration ${iteration} ━━━${C.reset}`);

    let examples;
    try {
      const data = await loadExamples({
        sources: args.source ? [args.source] : null,
        limit: args.batch * 2,
        randomSeed: args.seed + iteration,
        progressCallback
      });
      examples = data.examples;
      console.log(`\n  Loaded ${examples.length} examples from ${data.subsetsLoaded?.length || 0} sources`);
    } catch (err) {
      console.error(`${C.red}Failed to load examples: ${err.message}${C.reset}`);
      if (!args.continuous) process.exit(1);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const results = await runBatch(examples, analysedCases, args);

    totalProcessed += results.total;
    totalPassed += results.passed;
    totalCategoryA += results.categoryA + results.categoryL + results.categoryG;
    totalCategoryB += results.categoryB;

    const accuracy = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : '0.0';
    console.log(`\n${C.bold}Iteration ${iteration} Results:${C.reset}`);
    console.log(`  ${C.green}Passed:${C.reset} ${results.passed} (${accuracy}%)`);

    const translationTotal = results.categoryA + results.categoryL + results.categoryG;
    console.log(`  ${C.yellow}Translation Issues:${C.reset} ${translationTotal}`);
    if (translationTotal > 0) {
      if (results.categoryA > 0) console.log(`    - Translation failed: ${results.categoryA}`);
      if (results.categoryL > 0) console.log(`    - Learn failed: ${results.categoryL}`);
      if (results.categoryG > 0) console.log(`    - Invalid goal: ${results.categoryG}`);
    }

    console.log(`  ${C.red}Known Reasoning Bugs:${C.reset} ${results.categoryB}`);
    console.log(`  ${C.cyan}Unknown (needs analysis):${C.reset} ${results.categoryU}`);
    console.log(`  ${C.dim}Unsupported labels:${C.reset} ${results.categoryS}`);
    console.log(`  ${C.dim}Skipped (already tested):${C.reset} ${results.skipped}`);

    if (Object.keys(results.byBugType).length > 0) {
      console.log(`\n  ${C.bold}Reasoning Bugs:${C.reset}`);
      for (const [bugId, count] of Object.entries(results.byBugType).sort()) {
        const info = BUG_PATTERNS[bugId] || { name: bugId };
        console.log(`    ${bugId}: ${count} - ${info.name}`);
      }
    }

    if (results.byNlpBug && Object.keys(results.byNlpBug).length > 0) {
      console.log(`\n  ${C.bold}NLP/Translation Bugs:${C.reset}`);
      for (const [nlpId, count] of Object.entries(results.byNlpBug).sort()) {
        const info = NLP_BUG_PATTERNS[nlpId] || { name: nlpId };
        console.log(`    ${nlpId}: ${count} - ${info.name}`);
      }
    }

    if (Object.keys(results.byReason).length > 0) {
      console.log(`\n  ${C.bold}By Reason:${C.reset}`);
      for (const [reason, count] of Object.entries(results.byReason).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
        console.log(`    ${reason.padEnd(25)}: ${count}`);
      }
    }

    if (Object.keys(results.bySource).length > 1) {
      console.log(`\n  ${C.bold}By Source:${C.reset}`);
      for (const [source, count] of Object.entries(results.bySource).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${source.padEnd(12)}: ${count}`);
      }
    }

    if (args.continuous) {
      console.log(`\n${C.dim}Continuing... (Ctrl+C to stop)${C.reset}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  } while (args.continuous);

  console.log(`\n${C.bold}${C.magenta}═══════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}Final Summary${C.reset}`);
  console.log(`  Total Processed: ${totalProcessed}`);
  console.log(`  ${C.green}Passed:${C.reset} ${totalPassed} (${((totalPassed / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`  ${C.yellow}Translation Issues:${C.reset} ${totalCategoryA}`);
  console.log(`  ${C.red}Reasoning Bugs:${C.reset} ${totalCategoryB}`);
  console.log(`  Total Analysed: ${analysedCases.size}`);
  console.log(`${C.bold}${C.magenta}═══════════════════════════════════════${C.reset}\n`);

  process.exit(totalCategoryA + totalCategoryB > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});

