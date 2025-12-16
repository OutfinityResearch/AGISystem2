#!/usr/bin/env node

/**
 * AGISystem2 Performance Benchmark Runner
 * 
 * This script runs performance benchmarks for different HDC strategies
 * and compares their performance characteristics.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { performance } from 'perf_hooks';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import AGISystem2 modules
const { initHDC, getStrategy, listStrategies } = require('../src/hdc/strategies/index.mjs');

// Command line argument parsing
const args = process.argv.slice(2);
const options = {
  strategy: 'all',
  test: 'all',
  size: null,
  iterations: 1000,
  compare: false,
  output: 'text',
  help: false
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--strategy' || arg === '-s') {
    options.strategy = args[++i];
  } else if (arg === '--test' || arg === '-t') {
    options.test = args[++i];
  } else if (arg === '--size' || arg === '-z') {
    options.size = parseInt(args[++i]);
  } else if (arg === '--iterations' || arg === '-i') {
    options.iterations = parseInt(args[++i]);
  } else if (arg === '--compare' || arg === '-c') {
    options.compare = true;
  } else if (arg === '--output' || arg === '-o') {
    options.output = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    options.help = true;
  }
}

// Show help
if (options.help) {
  console.log(`
AGISystem2 Performance Benchmark Runner

Usage: node benchmarks.mjs [options]

Options:
  --strategy, -s    Strategy to benchmark (dense-binary, fractal-semantic, all)
  --test, -t        Specific test to run (binding, similarity, bundle, reasoning, all)
  --size, -z        Vector size for tests (default: 500 for FSP, 32768 for dense)
  --iterations, -i  Number of iterations (default: 1000)
  --compare, -c     Compare all strategies
  --output, -o      Output format (text, json, csv)
  --help, -h        Show this help

Examples:
  node benchmarks.mjs -s dense-binary -t binding
  node benchmarks.mjs --compare
  node benchmarks.mjs -o json > results.json
`);
  process.exit(0);
}

// Available strategies
const availableStrategies = listStrategies();
console.log(`Available strategies: ${availableStrategies.join(', ')}`);

// Determine which strategies to test
let strategiesToTest;
if (options.strategy === 'all') {
  strategiesToTest = availableStrategies;
} else if (availableStrategies.includes(options.strategy)) {
  strategiesToTest = [options.strategy];
} else {
  console.error(`Unknown strategy: ${options.strategy}`);
  process.exit(1);
}

// Determine which tests to run
const availableTests = ['binding', 'similarity', 'bundle', 'reasoning', 'all'];
let testsToRun;
if (options.test === 'all') {
  testsToRun = ['binding', 'similarity', 'bundle'];
} else if (availableTests.includes(options.test)) {
  testsToRun = [options.test];
} else {
  console.error(`Unknown test: ${options.test}`);
  process.exit(1);
}

// Run benchmarks
console.log(`\n=== AGISystem2 Performance Benchmarks ===`);
console.log(`Strategies: ${strategiesToTest.join(', ')}`);
console.log(`Tests: ${testsToRun.join(', ')}`);
console.log(`Iterations: ${options.iterations}`);
console.log(`Output: ${options.output}\n`);

const results = {};

for (const strategyId of strategiesToTest) {
  console.log(`\n--- Testing ${strategyId} ---`);
  
  try {
    // Initialize strategy
    const strategy = getStrategy(strategyId);
    console.log(`Strategy: ${strategy.properties.displayName}`);
    console.log(`Description: ${strategy.properties.description}`);
    
    // Determine geometry based on strategy
    let geometry;
    if (strategyId === 'fractal-semantic') {
      geometry = options.size || 500; // Default FSP size
    } else {
      geometry = options.size || 32768; // Default dense binary size
    }
    
    const strategyResults = {
      strategy: strategyId,
      geometry,
      properties: strategy.properties,
      tests: {}
    };
    
    // Run each test
    for (const testName of testsToRun) {
      console.log(`\nRunning ${testName} test...`);
      
      const testResult = runTest(strategy, testName, geometry, options.iterations);
      strategyResults.tests[testName] = testResult;
      
      console.log(`✓ ${testName}: ${testResult.avgMs.toFixed(3)}ms avg, ${testResult.opsPerSec.toFixed(0)} ops/sec`);
    }
    
    results[strategyId] = strategyResults;
    
  } catch (error) {
    console.error(`✗ Error testing ${strategyId}: ${error.message}`);
    results[strategyId] = { error: error.message };
  }
}

// Output results
console.log(`\n=== Benchmark Results ===`);

if (options.output === 'json') {
  console.log(JSON.stringify(results, null, 2));
} else if (options.output === 'csv') {
  console.log(convertToCSV(results));
} else {
  // Text output
  printTextResults(results);
}

// Save results if compare mode
if (options.compare) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = join(__dirname, 'results', timestamp);
  
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }
  
  for (const [strategyId, strategyResults] of Object.entries(results)) {
    if (strategyResults.error) continue;
    
    const filename = join(resultsDir, `${strategyId}.json`);
    writeFileSync(filename, JSON.stringify(strategyResults, null, 2));
    console.log(`\nSaved results to: ${filename}`);
  }
}

console.log(`\n=== Benchmarks Complete ===`);

// ==========================================================================
// TEST IMPLEMENTATIONS
// ==========================================================================

/**
 * Run a specific test
 */
function runTest(strategy, testName, geometry, iterations) {
  // Prepare test vectors
  const testVectors = createTestVectors(strategy, geometry);
  
  // Warm up
  for (let i = 0; i < 100; i++) {
    runTestIteration(strategy, testName, geometry, testVectors);
  }
  
  // Run timed test
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    runTestIteration(strategy, testName, geometry, testVectors);
  }
  
  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;
  const opsPerSec = iterations / (totalMs / 1000);
  
  return {
    iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    avgMs: Math.round(avgMs * 1000) / 1000,
    opsPerSec: Math.round(opsPerSec),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create test vectors for a strategy
 */
function createTestVectors(strategy, geometry) {
  return {
    v1: strategy.createRandom(geometry, 42),
    v2: strategy.createRandom(geometry, 43),
    v3: strategy.createRandom(geometry, 44),
    vectors: [
      strategy.createRandom(geometry, 45),
      strategy.createRandom(geometry, 46),
      strategy.createRandom(geometry, 47),
      strategy.createRandom(geometry, 48),
      strategy.createRandom(geometry, 49)
    ]
  };
}

/**
 * Run a single test iteration
 */
function runTestIteration(strategy, testName, geometry, testVectors) {
  switch (testName) {
    case 'binding':
      return strategy.bind(testVectors.v1, testVectors.v2);
    
    case 'similarity':
      return strategy.similarity(testVectors.v1, testVectors.v2);
    
    case 'bundle':
      return strategy.bundle(testVectors.vectors);
    
    case 'reasoning':
      // More complex reasoning test
      const bound = strategy.bind(testVectors.v1, testVectors.v2);
      const unbound = strategy.unbind(bound, testVectors.v2);
      return strategy.similarity(unbound, testVectors.v1);
    
    default:
      throw new Error(`Unknown test: ${testName}`);
  }
}

// ==========================================================================
// RESULT FORMATTING
// ==========================================================================

/**
 * Print results in text format
 */
function printTextResults(results) {
  for (const [strategyId, strategyResults] of Object.entries(results)) {
    if (strategyResults.error) {
      console.log(`\n${strategyId}: ERROR - ${strategyResults.error}`);
      continue;
    }
    
    console.log(`\n${strategyId}:`);
    console.log(`  Geometry: ${strategyResults.geometry}`);
    console.log(`  Strategy: ${strategyResults.properties.displayName}`);
    console.log(`  Complexity: ${strategyResults.properties.bindComplexity}`);
    console.log(`  Memory/Vector: ${strategyResults.properties.bytesPerVector(strategyResults.geometry)} bytes`);
    
    console.log('\n  Test Results:');
    console.log('  ' + '='.repeat(50));
    console.log('  Test'.padEnd(15) + 'Avg (ms)'.padEnd(12) + 'Ops/sec'.padEnd(15) + 'Total (ms)');
    console.log('  ' + '='.repeat(50));
    
    for (const [testName, testResult] of Object.entries(strategyResults.tests)) {
      console.log(
        '  ' + testName.padEnd(15) +
        testResult.avgMs.toFixed(3).toString().padEnd(12) +
        testResult.opsPerSec.toString().padEnd(15) +
        testResult.totalMs.toString()
      );
    }
    
    // Calculate summary
    const testResults = Object.values(strategyResults.tests);
    const totalOps = testResults.reduce((sum, r) => sum + r.opsPerSec, 0);
    const avgOps = totalOps / testResults.length;
    
    console.log('  ' + '='.repeat(50));
    console.log(`  Average: ${avgOps.toFixed(0)} ops/sec`);
  }
}

/**
 * Convert results to CSV format
 */
function convertToCSV(results) {
  let csv = 'Strategy,Test,Geometry,AvgMs,OpsPerSec,TotalMs,Timestamp\n';
  
  for (const [strategyId, strategyResults] of Object.entries(results)) {
    if (strategyResults.error) continue;
    
    for (const [testName, testResult] of Object.entries(strategyResults.tests)) {
      csv += `${strategyId},${testName},${strategyResults.geometry},`;
      csv += `${testResult.avgMs},${testResult.opsPerSec},${testResult.totalMs},`;
      csv += `${testResult.timestamp}\n`;
    }
  }
  
  return csv;
}