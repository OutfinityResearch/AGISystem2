/**
 * Performance Suite - Test Runner
 * @module performance/lib/runner
 *
 * Executes theory loading and evaluation cases with timing and stats.
 */

import { Session } from '../../src/runtime/session.mjs';
import { initHDC } from '../../src/hdc/facade.mjs';
import { loadDomainTheory } from './loader.mjs';
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
  if (!fs.existsSync(corePath)) return { facts: 0, symbols: 0, errors: [] };

  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  let totalFacts = 0;
  const errors = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(corePath, file), 'utf8');
    try {
      const res = session.learn(content);
      if (res.success) {
        totalFacts += res.facts || 0;
      } else if (res.errors) {
        errors.push(...res.errors);
      }
    } catch (e) {
      errors.push(`${file}: ${e.message}`);
    }
  }

  return {
    facts: totalFacts,
    symbols: session.vocabulary?.size || 0,
    kbSize: session.kbFacts?.length || 0,
    errors
  };
}

/**
 * Load Domain Theory into session (from config/<Domain>/)
 */
async function loadDomainTheoryIntoSession(session, theoryName) {
  const domainTheories = await loadDomainTheory(theoryName);
  let totalFacts = 0;
  const errors = [];

  for (const content of domainTheories) {
    try {
      const res = session.learn(content);
      if (res.success) {
        totalFacts += res.facts || 0;
      } else if (res.errors) {
        errors.push(...res.errors);
      }
    } catch (e) {
      errors.push(`Domain theory: ${e.message}`);
    }
  }

  return {
    facts: totalFacts,
    symbols: session.vocabulary?.size || 0,
    kbSize: session.kbFacts?.length || 0,
    errors
  };
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

// Colors for progress output
const P = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m'
};

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Run complete theory evaluation with progress output
 */
export async function runTheory(theory, options = {}) {
  const strategyId = options.strategy || 'dense-binary';
  const reasoningPriority = options.priority || 'symbolicPriority';
  const showProgress = options.showProgress !== false;

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
    // Core stats
    coreLoadTimeMs: 0,
    coreFacts: 0,
    coreSymbols: 0,
    // Domain (from config/<Domain>/) stats
    domainLoadTimeMs: 0,
    domainFacts: 0,
    // Theory (from performance/theories/) stats
    theoryLoadTimeMs: 0,
    theoryFactCount: 0,
    // KB totals after all loading
    kbSize: 0,
    symbolCount: 0,
    // Eval stats
    evalResults: [],
    totalEvalTimeMs: 0,
    // Errors
    loadErrors: []
  };

  // 1. Load Core Theories
  if (showProgress) process.stdout.write(`      ${P.dim}[1/4] Core...${P.reset}`);
  const coreStart = Date.now();
  const coreResult = loadCoreTheoriesIntoSession(session);
  metrics.coreLoadTimeMs = Date.now() - coreStart;
  metrics.coreFacts = coreResult.facts;
  metrics.coreSymbols = coreResult.symbols;
  if (coreResult.errors.length > 0) {
    metrics.loadErrors.push(...coreResult.errors);
  }
  if (showProgress) {
    const coreStatus = coreResult.errors.length > 0 ? `${P.yellow}⚠${P.reset}` : `${P.green}✓${P.reset}`;
    console.log(`\r      ${coreStatus} ${P.dim}[1/4] Core: ${metrics.coreFacts} facts (${formatMs(metrics.coreLoadTimeMs)})${P.reset}`);
  }

  // 2. Load Domain Theory (config/<Domain>/)
  if (showProgress) process.stdout.write(`      ${P.dim}[2/4] Domain...${P.reset}`);
  const domainStart = Date.now();
  const domainResult = await loadDomainTheoryIntoSession(session, theory.name);
  metrics.domainLoadTimeMs = Date.now() - domainStart;
  metrics.domainFacts = domainResult.facts;
  if (domainResult.errors.length > 0) {
    metrics.loadErrors.push(...domainResult.errors);
  }
  if (showProgress) {
    const domStatus = domainResult.errors.length > 0 ? `${P.yellow}⚠${P.reset}` : `${P.green}✓${P.reset}`;
    console.log(`\r      ${domStatus} ${P.dim}[2/4] Domain: ${metrics.domainFacts} facts (${formatMs(metrics.domainLoadTimeMs)})${P.reset}`);
  }

  // 3. Load Theory DSL (performance/theories/<name>/theory.dsl.txt)
  if (theory.dsl) {
    if (showProgress) process.stdout.write(`      ${P.dim}[3/4] Theory DSL...${P.reset}`);
    const theoryStart = Date.now();
    let theoryErrors = [];
    try {
      const res = session.learn(theory.dsl);
      metrics.theoryFactCount = res.facts || 0;
      if (!res.success && res.errors) {
        theoryErrors = res.errors;
        metrics.loadErrors.push(...res.errors);
      }
    } catch (e) {
      theoryErrors = [e.message];
      metrics.loadErrors.push(e.message);
    }
    metrics.theoryLoadTimeMs = Date.now() - theoryStart;
    if (showProgress) {
      const thStatus = theoryErrors.length > 0 ? `${P.red}✗${P.reset}` : `${P.green}✓${P.reset}`;
      console.log(`\r      ${thStatus} ${P.dim}[3/4] Theory: ${metrics.theoryFactCount} facts (${formatMs(metrics.theoryLoadTimeMs)})${P.reset}`);
      if (theoryErrors.length > 0) {
        console.log(`        ${P.red}Error: ${theoryErrors[0]}${P.reset}`);
      }
    }
  } else {
    if (showProgress) console.log(`      ${P.dim}[3/4] Theory: no DSL${P.reset}`);
  }

  // 4. Capture KB totals after all loading
  metrics.kbSize = session.kbFacts?.length || 0;
  metrics.symbolCount = session.vocabulary?.size || 0;
  if (showProgress) {
    console.log(`      ${P.cyan}→${P.reset} ${P.dim}KB: ${metrics.kbSize} facts, ${metrics.symbolCount} symbols${P.reset}`);
  }

  // 5. Run Evaluation Cases
  const timeoutMs = theory.timeout || options.timeout || DEFAULT_TIMEOUTS.reasoning;
  const evalStart = Date.now();
  const totalCases = theory.cases.length;

  if (showProgress && totalCases > 0) {
    process.stdout.write(`      ${P.dim}[4/4] Eval: 0/${totalCases}...${P.reset}`);
  }

  let caseIdx = 0;
  for (const testCase of theory.cases) {
    const result = await runCase(testCase, session, timeoutMs);
    metrics.evalResults.push({
      ...result,
      action: testCase.action,
      description: testCase.input_nl || testCase.input_dsl?.substring(0, 50)
    });
    caseIdx++;

    // Progress update every 10 cases or at end
    if (showProgress && totalCases > 0 && (caseIdx % 10 === 0 || caseIdx === totalCases)) {
      const elapsed = Date.now() - evalStart;
      process.stdout.write(`\r      ${P.dim}[4/4] Eval: ${caseIdx}/${totalCases} (${formatMs(elapsed)})...${P.reset}   `);
    }
  }

  metrics.totalEvalTimeMs = Date.now() - evalStart;

  // 6. Get Reasoning Stats
  const reasoningStats = session.getReasoningStats();
  session.close();

  const total = metrics.evalResults.length;
  const passed = metrics.evalResults.filter(r => r.passed).length;
  const failed = total - passed;

  if (showProgress && totalCases > 0) {
    const evalStatus = failed === 0 ? `${P.green}✓${P.reset}` : `${P.yellow}⚠${P.reset}`;
    console.log(`\r      ${evalStatus} ${P.dim}[4/4] Eval: ${passed}/${total} passed (${formatMs(metrics.totalEvalTimeMs)})${P.reset}   `);
  } else if (showProgress) {
    console.log(`      ${P.dim}[4/4] Eval: no cases${P.reset}`);
  }

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
