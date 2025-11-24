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
  for (const suite of toRun) {
    const suitePath = path.join(testsRoot, suite, 'index.js');
    if (!fs.existsSync(suitePath)) {
      console.warn(`Skipping suite '${suite}' (no index.js)`);
      continue;
    }
    /* eslint-disable global-require, import/no-dynamic-require */
    const mod = require(suitePath);
    if (typeof mod.run !== 'function') {
      console.warn(`Skipping suite '${suite}' (no exported run function)`);
      continue;
    }
    process.stdout.write(`Running suite '${suite}' with profile '${profile}'... `);
    // eslint-enable
    // eslint-disable-next-line no-await-in-loop
    const result = await mod.run({ profile });
    if (result && result.ok === false) {
      overallOk = false;
      console.log('FAIL');
    } else {
      console.log('OK');
    }
  }

  process.exit(overallOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

