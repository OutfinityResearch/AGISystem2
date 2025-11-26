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
  const suites = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

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
      console.log('TIMEOUT');
      resultsData.suites[suite] = { status: 'timeout', passed: 0, failed: 1 };
      resultsData.summary.timeout++;
    } else if (result && result.ok === false) {
      overallOk = false;
      console.log('FAIL');
      resultsData.suites[suite] = {
        status: 'failed',
        passed: result.passed || 0,
        failed: result.failed || 1,
        total: result.total || 1
      };
      resultsData.summary.failed++;
    } else {
      console.log('OK');
      resultsData.suites[suite] = {
        status: 'passed',
        passed: result && result.passed ? result.passed : 1,
        failed: 0,
        total: result && result.total ? result.total : 1
      };
      resultsData.summary.passed++;
    }
  }

  // Write results JSON for matrix.html consumption
  const resultsDir = path.join(testsRoot, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsPath = path.join(resultsDir, 'test_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2));
  console.log(`\nResults written to ${resultsPath}`);

  process.exit(overallOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
