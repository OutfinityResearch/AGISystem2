#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function main() {
  const testsRoot = path.join(process.cwd(), 'tests');
  if (!fs.existsSync(testsRoot)) {
    console.log('No tests directory found.');
    process.exit(0);
  }

  const entries = fs.readdirSync(testsRoot, { withFileTypes: true });
  // Exclude non-test directories
  const excludeDirs = ['fixtures', 'results'];
  const suites = entries
    .filter((e) => e.isDirectory() && !excludeDirs.includes(e.name))
    .map((e) => e.name)
    .sort();

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Available suites:');
    for (const s of suites) {
      console.log(`- ${s}`);
    }
    console.log('\nUsage: node tests/runTests.js <suite|all> [profile]');
    process.exit(0);
  }

  const which = args[0];
  const profile = args[1] || 'auto_test';
  const timeoutMs = Number.parseInt(process.env.TEST_TIMEOUT_MS || '', 10) || 5000;

  let toRun;
  if (which === 'all') {
    toRun = suites;
  } else {
    if (!suites.includes(which)) {
      console.error(`Unknown suite '${which}'. Available: ${suites.join(', ')}`);
      process.exit(1);
    }
    toRun = [which];
  }

  let overallOk = true;
  const resultsData = {
    timestamp: new Date().toISOString(),
    profile,
    summary: { total: 0, passed: 0, failed: 0, skipped: 0, timeout: 0 },
    suites: {}
  };

  for (const suite of toRun) {
    const suitePath = path.join(testsRoot, suite, 'index.js');
    if (!fs.existsSync(suitePath)) {
      console.warn(`Skipping suite '${suite}' (no index.js)`);
      resultsData.suites[suite] = { status: 'skipped', reason: 'no index.js' };
      resultsData.summary.skipped++;
      resultsData.summary.total++;
      continue;
    }
    /* eslint-disable global-require, import/no-dynamic-require */
    const mod = require(suitePath);
    if (typeof mod.run !== 'function') {
      console.warn(`Skipping suite '${suite}' (no exported run function)`);
      resultsData.suites[suite] = { status: 'skipped', reason: 'no run function' };
      resultsData.summary.skipped++;
      resultsData.summary.total++;
      continue;
    }
    process.stdout.write(`Running suite '${suite}' with profile '${profile}'... `);
    // eslint-enable
    // eslint-disable-next-line no-await-in-loop
    const result = await Promise.race([
      mod.run({ profile, timeoutMs }),
      new Promise((resolve) => {
        setTimeout(() => resolve({ ok: false, _timeout: true }), timeoutMs);
      })
    ]);
    resultsData.summary.total++;
    if (result && result._timeout) {
      overallOk = false;
      console.log('\x1b[33mTIMEOUT\x1b[0m');
      resultsData.suites[suite] = { status: 'timeout', passed: 0, failed: 1 };
      resultsData.summary.timeout++;
    } else if (result && result.ok === false) {
      overallOk = false;
      const passed = result.passed || 0;
      const failed = result.failed || 1;
      const total = result.total || (passed + failed);
      console.log(`\x1b[31mFAIL\x1b[0m (${passed}/${total} passed)`);
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors.slice(0, 5)) {
          console.log(`  \x1b[31m✗\x1b[0m ${err}`);
        }
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more errors`);
        }
      }
      resultsData.suites[suite] = {
        status: 'failed',
        passed,
        failed,
        total,
        errors: result.errors || []
      };
      resultsData.summary.failed++;
    } else {
      const passed = result && result.passed ? result.passed : 1;
      const total = result && result.total ? result.total : passed;
      console.log(`\x1b[32mOK\x1b[0m (${passed}/${total} passed)`);
      resultsData.suites[suite] = {
        status: 'passed',
        passed,
        failed: 0,
        total
      };
      resultsData.summary.passed++;
    }
  }

  // Print summary
  console.log('\n' + '─'.repeat(50));
  console.log('Test Summary:');
  const { passed, failed, skipped, timeout, total } = resultsData.summary;
  const passedColor = passed > 0 ? '\x1b[32m' : '';
  const failedColor = failed > 0 ? '\x1b[31m' : '';
  const timeoutColor = timeout > 0 ? '\x1b[33m' : '';
  const reset = '\x1b[0m';
  console.log(`  ${passedColor}Passed:  ${passed}${reset}`);
  console.log(`  ${failedColor}Failed:  ${failed}${reset}`);
  if (timeout > 0) console.log(`  ${timeoutColor}Timeout: ${timeout}${reset}`);
  if (skipped > 0) console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${total}`);
  console.log('─'.repeat(50));

  // Write results JSON for matrix.html consumption
  const resultsDir = path.join(testsRoot, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsPath = path.join(resultsDir, 'test_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
  console.log(`Results written to ${resultsPath}`);

  process.exit(overallOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
