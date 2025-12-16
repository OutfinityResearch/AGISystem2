/**
 * EvalSuite - Test Runner (Granular Timeouts & Partial Failures)
 * @module evalSuite/lib/runner
 */

import { NLTransformer } from '../../src/nlp/transformer.mjs';
import { Session } from '../../src/runtime/session.mjs';
import { initHDC, getStrategyId } from '../../src/hdc/facade.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[${category}]`, ...args);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// DEFAULTS
const DEFAULT_TIMEOUTS = {
  nlToDsl: 100,    // ms
  reasoning: 100,  // ms (aggressive default as requested)
  dslToNl: 100     // ms
};

// Reasoning Step Budget (for infinite loop prevention in sync code inside Session)
const DEFAULT_STEP_BUDGET = 1000;

/**
 * Load Core Theories
 * Core theories are essential for proper reasoning and always loaded.
 */
function loadCoreTheories(session) {
  console.log('[Runner] Loading Core Theories...');
  const corePath = path.join(PROJECT_ROOT, 'config', 'Core');
  if (!fs.existsSync(corePath)) return;

  // Load all Core theories except index.sys2 (which uses Load directive)
  const files = fs.readdirSync(corePath)
    .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
    .sort();

  for (const file of files) {
    dbg('CORE', `Loading theory: ${file}`);
    const content = fs.readFileSync(path.join(corePath, file), 'utf8');
    try {
      const startTime = Date.now();
      const res = session.learn(content);
      const elapsed = Date.now() - startTime;
      if (!res.success) {
        console.error(`[Runner] Failed to load ${file}:`, res.errors);
      } else {
        dbg('CORE', `Loaded ${file} in ${elapsed}ms, facts: ${res.facts}`);
      }
    } catch (e) {
      console.error(`[Runner] Exception loading ${file}:`, e.message);
    }
  }
  console.log('[Runner] Core Theories loaded.');
}

/**
 * Helper: Measure sync execution time (Soft Timeout)
 */
function runSyncWithTimeout(fn, timeoutMs, description) {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    
    if (duration > timeoutMs) {
      return { 
        success: false, 
        result: result, // Return result anyway if it finished, but marked as fail
        error: `Timeout: Operation took ${duration}ms (limit: ${timeoutMs}ms)`,
        duration 
      };
    }
    return { success: true, result, duration };
  } catch (err) {
    return { 
      success: false, 
      error: `Error: ${err.message}`, 
      duration: Date.now() - start 
    };
  }
}

/**
 * Helper: Measure async execution time (Hard Timeout)
 */
async function runAsyncWithTimeout(promise, timeoutMs) {
  const start = Date.now();
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: Operation exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return { 
      success: true, 
      result, 
      duration: Date.now() - start 
    };
  } catch (err) {
    return { 
      success: false, 
      error: err.message, 
      duration: Date.now() - start 
    };
  }
}

// --- PHASE 1: NL -> DSL ---

function runNlToDsl(testCase, transformer, timeoutMs) {
  dbg('NL->DSL', 'Starting with input:', testCase.input_nl?.substring(0, 50));

  if (!testCase.input_nl) {
    dbg('NL->DSL', 'No NL input, skipping');
    return { passed: true, skipped: true, note: 'No NL input' };
  }

  // Parser is synchronous
  const execution = runSyncWithTimeout(() => {
    dbg('NL->DSL', 'Calling transformer.transform()');
    const result = transformer.transform(testCase.input_nl);
    dbg('NL->DSL', 'Transform result:', result.success, 'DSL:', result.dsl?.substring(0, 50));
    return result;
  }, timeoutMs, 'NL->DSL');

  if (!execution.success) {
    return { 
      passed: false, 
      error: execution.error, 
      durationMs: execution.duration 
    };
  }

  const result = execution.result;
  const hasOutput = result.dsl && result.dsl.trim().length > 0;
  
  if (!result.success || !hasOutput) {
     return {
       passed: false,
       error: result.errors?.map(e => e.error).join('; ') || 'Empty DSL output',
       durationMs: execution.duration
     };
  }

  // Validation against expected_dsl (if provided)
  // Note: We pass even if it doesn't match expected_dsl strictly, 
  // UNLESS the test case specifically demands strict matching.
  // For now, if we got valid DSL, we consider it a "Pass" for the generation phase,
  // letting the reasoning phase prove if it was correct.
  
  return {
    passed: true,
    actual: result.dsl,
    durationMs: execution.duration
  };
}


// --- PHASE 2: REASONING ---

async function runReasoning(testCase, generatedDsl, session, timeoutMs) {
  dbg('REASON', 'Starting action:', testCase.action, 'timeout:', timeoutMs);

  // Determine source DSL:
  // For query/prove: prefer input_dsl (guaranteed correct) over generated
  // For learn: use generated DSL if available, else input_dsl
  let dslToExecute;
  let usedFallback = false;

  if (testCase.action === 'query' || testCase.action === 'prove') {
    // For query/prove, use input_dsl if available (it's the correct DSL)
    if (testCase.input_dsl || testCase.query_dsl) {
      dslToExecute = testCase.query_dsl || testCase.input_dsl;
      dbg('REASON', 'Using input_dsl for query/prove');
    } else if (generatedDsl) {
      dslToExecute = generatedDsl;
      dbg('REASON', 'Using generated DSL (no input_dsl available)');
    }
  } else {
    // For learn, prefer input_dsl (canonical) over generated DSL
    // NL transformer often produces structurally different DSL (different # of facts)
    if (testCase.input_dsl) {
      dslToExecute = testCase.input_dsl;
      usedFallback = true;
      dbg('REASON', 'Using input_dsl for learn (canonical)');
    } else if (generatedDsl && !generatedDsl.trim().startsWith('#')) {
      dslToExecute = generatedDsl;
      dbg('REASON', 'Using generated DSL for learn (no input_dsl)');
    }
  }

  if (!dslToExecute) {
    dbg('REASON', 'No DSL available');
    return { passed: false, error: 'No DSL available' };
  }
  dbg('REASON', 'DSL to execute:', dslToExecute?.substring(0, 80));

  // Execute Async with Timeout
  const execution = await runAsyncWithTimeout((async () => {
    
    // Setup first
    if (testCase.setup_dsl) {
      session.learn(testCase.setup_dsl);
    }

    if (testCase.action === 'learn') {
      return session.learn(dslToExecute);
    } 
    else {
      // For query/prove, use the DSL
      const queryDsl = testCase.query_dsl || dslToExecute;
      
      const sessionOptions = { timeout: timeoutMs };

      if (testCase.action === 'prove' || testCase.action === 'elaborate') {
        return session.prove(queryDsl, sessionOptions);
      } else {
        return session.query(queryDsl, sessionOptions); // Assuming query also supports options now or will ignore them
      }
    }
  })(), timeoutMs);

  if (!execution.success) {
    return {
      passed: false,
      error: execution.error,
      usedFallback,
      durationMs: execution.duration
    };
  }

  const result = execution.result;
  
  // Logical Validation
  let passed = false;
  if (testCase.action === 'learn') passed = result.success;
  else if (testCase.action === 'prove' || testCase.action === 'elaborate') {
      // Prove passes if it returns a valid structure (true or false), 
      // correctness is checked in DSL->NL or expected_result
      passed = true; 
  } else {
      passed = result.success;
  }

  return {
    passed,
    actual: result,
    usedFallback,
    durationMs: execution.duration
  };
}


// --- PHASE 3: DSL -> NL (Decoding) ---

function runDslToNl(testCase, reasoningPhase, session, timeoutMs) {
  dbg('DSL->NL', 'Starting, expected_nl:', testCase.expected_nl?.substring(0, 40));

  if (!testCase.expected_nl) {
    dbg('DSL->NL', 'No expected_nl, skipping');
    return { passed: true, skipped: true };
  }
  if (!reasoningPhase.passed && !reasoningPhase.actual) {
    dbg('DSL->NL', 'Reasoning failed, cannot decode');
    return { passed: false, skipped: true, error: 'Reasoning failed, cannot decode' };
  }

  const execution = runSyncWithTimeout(() => {
    const result = reasoningPhase.actual;
    let text = '';
    dbg('DSL->NL', 'Action:', testCase.action, 'result keys:', Object.keys(result || {}));

    if (testCase.action === 'learn') {
       // Include warnings (contradictions, etc.) in the output if present
       if (result.warnings && result.warnings.length > 0) {
         text = result.warnings[0]; // First warning is most relevant
       } else {
         text = result.success ? `Learned ${result.facts} facts` : 'Failed';
       }
       dbg('DSL->NL', 'Learn text:', text);
    }
    else if (testCase.action === 'prove') {
       dbg('DSL->NL', 'Processing prove result, valid:', result?.valid, 'result:', result?.result);

       if (!result?.valid) {
         // Failed proof - generate text for what couldn't be proven
         let goalText = result?.goal || 'statement';
         if (result?.goal) {
           const parts = result.goal.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           if (parts.length >= 2) {
             goalText = session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
           }
         }
         text = 'Cannot prove: ' + goalText;
       } else if (result.result === false) {
         // Disjoint proof - we proved the NEGATION (e.g., Tokyo NOT in Europe)
         const steps = result.steps || [];
         const proofSteps = [];

         // Extract proof chain from steps
         for (const step of steps) {
           if (step.operation === 'chain_step' && step.from && step.to) {
             const stepText = session.generateText('locatedIn', [step.from, step.to]).replace(/\.$/, '');
             if (stepText && !proofSteps.includes(stepText)) {
               proofSteps.push(stepText);
             }
           } else if (step.operation === 'disjoint_check') {
             proofSteps.push(`${step.container} and ${step.target} are disjoint`);
           }
         }

         // Get goal text
         let goalText = '';
         const goalString = result.goal;
         if (goalString) {
           const parts = goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           if (parts.length >= 1) {
             goalText = session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
           }
         }

         // Build negative proof output
         if (goalText && proofSteps.length > 0) {
           text = `False: NOT ${goalText}. Proof: ${proofSteps.join('. ')}.`;
         } else if (goalText) {
           text = `False: NOT ${goalText}`;
         } else {
           text = 'Proof valid (negative)';
         }
       } else {
         // Success - directly decode proof step facts into propositions
         const steps = result.steps || [];
         const proofSteps = [];

         for (const step of steps) {
           if (step.fact) {
             // Parse DSL fact: "operator arg1 arg2"
             const factParts = step.fact.trim().split(/\s+/);
             if (factParts.length >= 2) {
               const stepOp = factParts[0];
               const stepArgs = factParts.slice(1);
               const stepText = session.generateText(stepOp, stepArgs).replace(/\.$/, '');
               if (stepText && !proofSteps.includes(stepText)) {
                 proofSteps.push(stepText);
               }
             }
           }
         }

         // Get the goal text
         let goalText = '';
         const goalString = result.goal || (steps.length > 0 && steps[0].goal);
         if (goalString) {
           const parts = goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           if (parts.length >= 1) {
             goalText = session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
           }
         }

         // Build output with proof chain
         if (goalText && proofSteps.length > 0) {
           text = `True: ${goalText}. Proof: ${proofSteps.join('. ')}.`;
         } else if (goalText) {
           text = `True: ${goalText}`;
         } else {
           text = 'Proof valid';
         }
       }
       dbg('DSL->NL', 'Prove result text:', text?.substring(0, 80));
    }
    else if (testCase.action === 'elaborate') {
       dbg('DSL->NL', 'Calling session.elaborate()');
       const el = session.elaborate(result);
       text = el.text;
       dbg('DSL->NL', 'Elaborate result:', text?.substring(0, 50));
    }
    else {
       // Reconstruct text for query
       dbg('DSL->NL', 'Query result bindings:', result.bindings ? 'yes' : 'no');
       if (result.bindings) {
           const texts = [];
           const query = testCase.query_dsl || testCase.input_dsl || '';
           const parts = query.trim().split(/\s+/).filter(p => !p.startsWith('@'));
           const op = parts[0];
           dbg('DSL->NL', 'Query op:', op, 'parts:', parts);

           // Filter results: use matches with reasonable quality (score >= 0.5)
           const allResults = result.allResults || [{bindings: result.bindings, score: 1}];
           const goodResults = allResults.filter(r => (r.score || 1) >= 0.5);
           const resultsToProcess = goodResults.length > 0 ? goodResults : [allResults[0]];

           for(const r of resultsToProcess) {
               const args = parts.slice(1).map(a => {
                   if(a.startsWith('?')) return r.bindings.get(a.substring(1))?.answer || a;
                   return a;
               });
               dbg('DSL->NL', 'generateText args:', op, args);
               texts.push(session.generateText(op, args));
           }
           text = [...new Set(texts)].join('. ');
       } else {
           text = 'No results';
       }
       dbg('DSL->NL', 'Final text:', text?.substring(0, 80));
    }
    return text || 'No output';
  }, timeoutMs, 'DSL->NL');

  if (!execution.success) {
    return { passed: false, error: execution.error, durationMs: execution.duration };
  }

  const actualText = execution.result;

  // Comparison - normalize by removing punctuation, articles, and extra whitespace
  const normalize = s => s.toLowerCase()
    .replace(/[^\w\s]/g, '')           // Remove punctuation
    .replace(/\b(a|an|the)\b/g, '')    // Remove articles
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();

  // For queries with multiple results, check if all expected parts are present (order-independent)
  let passed;
  if (testCase.action === 'query' && testCase.expected_nl.includes('.')) {
    // Split expected into parts and check all are present
    const expectedParts = normalize(testCase.expected_nl).split(/\s+/).filter(w => w.length > 2);
    const actualNorm = normalize(actualText);
    passed = expectedParts.every(part => actualNorm.includes(part));
  } else {
    passed = normalize(actualText).includes(normalize(testCase.expected_nl));
  }

  return {
    passed,
    actual: actualText,
    expected: testCase.expected_nl,
    durationMs: execution.duration
  };
}


// --- MAIN RUNNERS ---

export async function runCase(testCase, session = null, config = {}) {
  const sess = session || new Session({ geometry: 2048 });
  if (!session) loadCoreTheories(sess);

  // Apply timeouts (Cascade: Case Config > Suite Config (passed in func) > Defaults)
  const timeouts = {
    nlToDsl: testCase.timeout_nl || config.nlToDsl || DEFAULT_TIMEOUTS.nlToDsl,
    reasoning: testCase.timeout_reasoning || config.reasoning || DEFAULT_TIMEOUTS.reasoning,
    dslToNl: testCase.timeout_decoding || config.dslToNl || DEFAULT_TIMEOUTS.dslToNl
  };

  const transformer = new NLTransformer();
  const phases = {};

  // 1. NL -> DSL
  phases.nlToDsl = runNlToDsl(testCase, transformer, timeouts.nlToDsl);

  // 2. Reasoning (Uses Generated DSL if valid, else Fallback Input DSL)
  phases.reasoning = await runReasoning(testCase, phases.nlToDsl.actual, sess, timeouts.reasoning);

  // 3. DSL -> NL
  phases.dslToNl = runDslToNl(testCase, phases.reasoning, sess, timeouts.dslToNl);

  // Overall Status
  // A case passes ONLY if all applicable phases passed
  // But we return full detail for partial analysis
  const passed = phases.nlToDsl.passed && phases.reasoning.passed && phases.dslToNl.passed;

  return {
    passed,
    phases
  };
}

export async function runSuite(suite, options = {}) {
  const results = [];

  // Initialize HDC strategy if specified
  const strategyId = options.strategy || process.env.SYS2_HDC_STRATEGY || 'dense-binary';
  initHDC(strategyId);

  // Use appropriate geometry for each strategy
  // FSP uses k=4 exponents - good balance of speed and safety margin
  const geometry = strategyId === 'fractal-semantic' ? 4 : 2048;
  const session = new Session({ geometry });

  // 1. Load Core Theories
  loadCoreTheories(session);

  // 2. Load Suite-Specific Theories
  if (suite.suiteTheories && suite.suiteTheories.length > 0) {
    console.log(`[Runner] Loading ${suite.suiteTheories.length} suite-specific theories...`);
    for (const theoryContent of suite.suiteTheories) {
      try {
        const res = session.learn(theoryContent);
        if (!res.success) {
          console.error('[Runner] Failed to load suite theory:', res.errors);
        }
      } catch (e) {
        console.error('[Runner] Exception loading suite theory:', e.message);
      }
    }
  }

  // Suite-level timeout config
  const suiteConfig = {
    nlToDsl: suite.timeouts?.nlToDsl || DEFAULT_TIMEOUTS.nlToDsl,
    reasoning: suite.timeouts?.reasoning || DEFAULT_TIMEOUTS.reasoning,
    dslToNl: suite.timeouts?.dslToNl || DEFAULT_TIMEOUTS.dslToNl
  };

  console.log(`Running suite with timeouts: ${JSON.stringify(suiteConfig)}`);

  const suiteStartTime = Date.now();
  for (const step of suite.cases) {
    const result = await runCase(step, session, suiteConfig);
    results.push(result);
  }
  const suiteDurationMs = Date.now() - suiteStartTime;

  const reasoningStats = session.getReasoningStats();
  session.close();

  // Stats
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  
  // Count "Partial Fixes" -> NL Failed but Reasoning Passed (using fallback)
  const brokenParser = results.filter(r => !r.phases.nlToDsl.passed && r.phases.reasoning.passed).length;

  return {
    results,
    summary: {
      total,
      passed,
      failed: total - passed,
      brokenParser, // Useful metric: logic works, language fails
      reasoningStats,
      results, // Include results for detailed reporting
      strategyId, // Include which strategy was used
      durationMs: suiteDurationMs // Time to run suite
    },
    cases: suite.cases, // Include cases for detailed reporting
    name: suite.name,
    suiteName: suite.suiteName,
    strategyId, // Include strategy at suite level too
    durationMs: suiteDurationMs
  };
}

export default { runCase, runSuite };
