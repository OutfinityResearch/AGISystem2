#!/usr/bin/env node
/**
 * Geometry Analysis Script
 *
 * Runs evaluation suite with different geometry settings to analyze
 * the effect on holographic computing performance.
 */

import { discoverSuites, loadSuite } from './lib/loader.mjs';
import { runSuite } from './lib/runner.mjs';
import { listStrategies } from '../src/hdc/facade.mjs';

// Geometry configurations to test
const DENSE_DIMS = [256, 512, 1024, 2048, 4096];
const SPARSE_KS = [2, 3, 4, 6, 8];

// Only run with holographicPriority to see HDC effects
const PRIORITY = 'holographicPriority';

async function analyzeGeometry() {
  console.log('\n\x1b[1m\x1b[34m═══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[34mGEOMETRY ANALYSIS - Effect of Vector Dimensions on HDC Performance\x1b[0m');
  console.log('\x1b[34m═══════════════════════════════════════════════════════════════════\x1b[0m\n');

  // Discover suites - use a subset for speed
  const allSuites = await discoverSuites();
  // Use first 5 suites for analysis (mix of simple and complex)
  const testSuites = allSuites.slice(0, 5);

  console.log(`Testing with ${testSuites.length} suites: ${testSuites.join(', ')}\n`);

  const results = {
    'dense-binary': {},
    'sparse-polynomial': {}
  };

  // Test dense-binary with different dimensions
  console.log('\x1b[1m\x1b[35m─── Dense-Binary Strategy ───\x1b[0m\n');
  for (const dim of DENSE_DIMS) {
    console.log(`\x1b[33mTesting dense-binary with dim=${dim}...\x1b[0m`);

    let totalPassed = 0;
    let totalTests = 0;
    let totalHdcSuccesses = 0;
    let totalHdcAttempts = 0;
    let totalTime = 0;

    for (const suiteName of testSuites) {
      try {
        const suite = await loadSuite(suiteName);
        const { summary } = await runSuite(suite, {
          strategy: 'dense-binary',
          reasoningPriority: PRIORITY,
          geometry: dim
        });

        totalPassed += summary.passed;
        totalTests += summary.total;
        totalTime += summary.durationMs;

        const stats = summary.reasoningStats || {};
        // Count HDC query/proof attempts and successes
        totalHdcAttempts += (stats.holographicProofs || 0) + (stats.holographicQueries || 0);
        totalHdcSuccesses += (stats.hdcProofSuccesses || 0) + (stats.hdcUnbindSuccesses || 0);
      } catch (e) {
        console.error(`  Error running ${suiteName}: ${e.message}`);
      }
    }

    const passRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
    const hdcRate = totalHdcAttempts > 0 ? (totalHdcSuccesses / totalHdcAttempts * 100).toFixed(1) : 0;

    results['dense-binary'][dim] = {
      passRate: parseFloat(passRate),
      hdcRate: parseFloat(hdcRate),
      hdcSuccesses: totalHdcSuccesses,
      hdcAttempts: totalHdcAttempts,
      timeMs: totalTime
    };

    console.log(`  Pass: ${passRate}% | HDC: ${hdcRate}% (${totalHdcSuccesses}/${totalHdcAttempts}) | Time: ${totalTime}ms\n`);
  }

  // Test sparse-polynomial with different k values
  console.log('\x1b[1m\x1b[35m─── Sparse-Polynomial Strategy ───\x1b[0m\n');
  for (const k of SPARSE_KS) {
    console.log(`\x1b[33mTesting sparse-polynomial with k=${k}...\x1b[0m`);

    let totalPassed = 0;
    let totalTests = 0;
    let totalHdcSuccesses = 0;
    let totalHdcAttempts = 0;
    let totalTime = 0;

    for (const suiteName of testSuites) {
      try {
        const suite = await loadSuite(suiteName);
        const { summary } = await runSuite(suite, {
          strategy: 'sparse-polynomial',
          reasoningPriority: PRIORITY,
          geometry: k
        });

        totalPassed += summary.passed;
        totalTests += summary.total;
        totalTime += summary.durationMs;

        const stats = summary.reasoningStats || {};
        totalHdcAttempts += (stats.holographicProofs || 0) + (stats.holographicQueries || 0);
        totalHdcSuccesses += (stats.hdcProofSuccesses || 0) + (stats.hdcUnbindSuccesses || 0);
      } catch (e) {
        console.error(`  Error running ${suiteName}: ${e.message}`);
      }
    }

    const passRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
    const hdcRate = totalHdcAttempts > 0 ? (totalHdcSuccesses / totalHdcAttempts * 100).toFixed(1) : 0;

    results['sparse-polynomial'][k] = {
      passRate: parseFloat(passRate),
      hdcRate: parseFloat(hdcRate),
      hdcSuccesses: totalHdcSuccesses,
      hdcAttempts: totalHdcAttempts,
      timeMs: totalTime
    };

    console.log(`  Pass: ${passRate}% | HDC: ${hdcRate}% (${totalHdcSuccesses}/${totalHdcAttempts}) | Time: ${totalTime}ms\n`);
  }

  // Print summary table
  console.log('\n\x1b[1m\x1b[34m═══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[34mSUMMARY TABLE\x1b[0m');
  console.log('\x1b[34m═══════════════════════════════════════════════════════════════════\x1b[0m\n');

  console.log('\x1b[1mDense-Binary (vector dimension):\x1b[0m');
  console.log('┌──────────┬──────────┬──────────┬─────────────────┬──────────┐');
  console.log('│   Dim    │ Pass Rate│ HDC Rate │  HDC Success    │  Time    │');
  console.log('├──────────┼──────────┼──────────┼─────────────────┼──────────┤');
  for (const dim of DENSE_DIMS) {
    const r = results['dense-binary'][dim];
    const passColor = r.passRate >= 100 ? '\x1b[32m' : r.passRate >= 90 ? '\x1b[33m' : '\x1b[31m';
    console.log(`│ ${String(dim).padStart(6)}   │ ${passColor}${String(r.passRate + '%').padStart(6)}\x1b[0m   │ ${String(r.hdcRate + '%').padStart(6)}   │ ${String(r.hdcSuccesses + '/' + r.hdcAttempts).padStart(15)} │ ${String(r.timeMs + 'ms').padStart(8)} │`);
  }
  console.log('└──────────┴──────────┴──────────┴─────────────────┴──────────┘\n');

  console.log('\x1b[1mSparse-Polynomial (exponent count k):\x1b[0m');
  console.log('┌──────────┬──────────┬──────────┬─────────────────┬──────────┐');
  console.log('│    k     │ Pass Rate│ HDC Rate │  HDC Success    │  Time    │');
  console.log('├──────────┼──────────┼──────────┼─────────────────┼──────────┤');
  for (const k of SPARSE_KS) {
    const r = results['sparse-polynomial'][k];
    const passColor = r.passRate >= 100 ? '\x1b[32m' : r.passRate >= 90 ? '\x1b[33m' : '\x1b[31m';
    console.log(`│ ${String(k).padStart(6)}   │ ${passColor}${String(r.passRate + '%').padStart(6)}\x1b[0m   │ ${String(r.hdcRate + '%').padStart(6)}   │ ${String(r.hdcSuccesses + '/' + r.hdcAttempts).padStart(15)} │ ${String(r.timeMs + 'ms').padStart(8)} │`);
  }
  console.log('└──────────┴──────────┴──────────┴─────────────────┴──────────┘\n');

  console.log('\x1b[2mNote: HDC Rate = percentage of HDC operations that succeeded without symbolic fallback\x1b[0m');
  console.log('\x1b[2mHigher HDC Rate means more "pure" holographic computing\x1b[0m\n');
}

analyzeGeometry().catch(console.error);
