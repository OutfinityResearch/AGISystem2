/**
 * Performance Suite - Test Runner
 * @module performance/lib/runner
 *
 * Executes theory loading and evaluation cases with timing.
 */

import { Session } from '../../src/runtime/session.mjs';
import { initHDC } from '../../src/hdc/facade.mjs';
import { loadCoreTheories } from './loader.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const DEFAULT_TIMEOUTS = {
  reasoning: 500  // ms per case
};

/**
 * Load Core Theories into session
 */
function loadCoreTheoriesIntoSession(session) {
  const corePath = path.join(PROJECT_ROOT, 'config', 'Core');
  if (!fs.existsSync(corePath)) return 0;

  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  let totalFacts = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(corePath, file), 'utf8');
    try {
      const res = session.learn(content);
      if (res.success) {
        totalFacts += res.facts || 0;
      }
    } catch (e) {
      console.error(`Error loading ${file}: ${e.message}`);
    }
  }
  return totalFacts;
}

/**
 * Execute reasoning with timeout
 */
async function runWithTimeout(fn, timeoutMs) {
  const start = Date.now();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    return {
      success: true,
      result,
      durationMs: Date.now() - start
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Run a single evaluation case
 */
async function runCase(testCase, session, timeoutMs) {
  const execution = await runWithTimeout(async () => {
    if (testCase.setup_dsl) {
      session.learn(testCase.setup_dsl);
    }

    if (testCase.action === 'learn') {
      return session.learn(testCase.input_dsl);
    } else if (testCase.action === 'prove') {
      return session.prove(testCase.input_dsl, { timeout: timeoutMs });
    } else if (testCase.action === 'query') {
      return session.query(testCase.input_dsl, { timeout: timeoutMs });
    } else {
      return { success: false, error: `Unknown action: ${testCase.action}` };
    }
  }, timeoutMs);

  if (!execution.success) {
    return {
      passed: false,
      error: execution.error,
      durationMs: execution.durationMs
    };
  }

  // Validate result against expected if provided
  const result = execution.result;
  let passed = true;

  if (testCase.action === 'learn') {
    passed = result.success;
  } else if (testCase.action === 'prove') {
    if (testCase.expected_result !== undefined) {
      passed = result.proven === testCase.expected_result;
    }
  } else if (testCase.action === 'query') {
    if (testCase.expected_count !== undefined) {
      passed = (result.results?.length || 0) >= testCase.expected_count;
    }
  }

  return {
    passed,
    result,
    durationMs: execution.durationMs
  };
}

/**
 * Run complete theory evaluation
 */
export async function runTheory(theory, options = {}) {
  const strategyId = options.strategy || 'dense-binary';
  const reasoningPriority = options.reasoningPriority || 'symbolicPriority';

  // Set geometry based on strategy
  let geometry;
  if (strategyId === 'sparse-polynomial') {
    geometry = options.geometry || 4;
  } else if (strategyId === 'metric-affine') {
    geometry = options.geometry || 32;
  } else {
    geometry = options.geometry || 2048;
  }

  // Initialize HDC strategy
  initHDC(strategyId);
  process.env.REASONING_PRIORITY = reasoningPriority;

  // Create session
  const session = new Session({
    geometry,
    hdcStrategy: strategyId,
    reasoningPriority
  });

  const metrics = {
    theoryName: theory.name,
    strategy: strategyId,
    priority: reasoningPriority,
    geometry,
    coreLoadTimeMs: 0,
    theoryLoadTimeMs: 0,
    coreFactCount: 0,
    theoryFactCount: 0,
    evalResults: [],
    totalEvalTimeMs: 0
  };

  // 1. Load Core Theories
  const coreStart = Date.now();
  metrics.coreFactCount = loadCoreTheoriesIntoSession(session);
  metrics.coreLoadTimeMs = Date.now() - coreStart;

  // 2. Load Theory DSL
  if (theory.dsl) {
    const theoryStart = Date.now();
    try {
      const res = session.learn(theory.dsl);
      metrics.theoryFactCount = res.facts || 0;
      if (!res.success) {
        console.error(`Failed to load theory ${theory.name}:`, res.errors);
      }
    } catch (e) {
      console.error(`Exception loading theory ${theory.name}:`, e.message);
    }
    metrics.theoryLoadTimeMs = Date.now() - theoryStart;
  }

  // 3. Run Evaluation Cases
  const timeoutMs = theory.timeout || options.timeout || DEFAULT_TIMEOUTS.reasoning;
  const evalStart = Date.now();

  for (const testCase of theory.cases) {
    const result = await runCase(testCase, session, timeoutMs);
    metrics.evalResults.push({
      ...result,
      action: testCase.action,
      description: testCase.input_nl || testCase.input_dsl?.substring(0, 50)
    });
  }

  metrics.totalEvalTimeMs = Date.now() - evalStart;

  // 4. Calculate Summary
  const reasoningStats = session.getReasoningStats();
  session.close();

  const total = metrics.evalResults.length;
  const passed = metrics.evalResults.filter(r => r.passed).length;
  const failed = total - passed;

  return {
    ...metrics,
    summary: {
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total * 100).toFixed(1) : 0,
      reasoningStats
    }
  };
}

/**
 * Run all theories with comparison
 */
export async function runAllTheories(theories, configurations) {
  const results = {};

  for (const config of configurations) {
    const configKey = `${config.strategy}/${config.priority}`;
    results[configKey] = [];

    for (const theory of theories) {
      console.log(`  Running ${theory.name} with ${configKey}...`);
      const result = await runTheory(theory, config);
      results[configKey].push(result);
    }
  }

  return results;
}

export default { runCase, runTheory, runAllTheories };
