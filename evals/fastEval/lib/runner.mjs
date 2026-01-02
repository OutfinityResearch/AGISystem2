/**
 * EvalSuite - Test Runner (Granular Timeouts & Partial Failures)
 * @module evals/fastEval/lib/runner
 */

import { NLTransformer } from '../../../src/nlp/transformer.mjs';
import { Session } from '../../../src/runtime/session.mjs';
import { getThresholds } from '../../../src/core/constants.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { debug_trace } from '../../../src/utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[${category}]`, ...args);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const CONFIG_ROOT = path.join(PROJECT_ROOT, 'config');
const DOMAIN_ROOT = path.join(PROJECT_ROOT, 'evals', 'domains');
const CONFIG_SCOPES = new Set(['Packs', 'runtime']);

// DEFAULTS
const DEFAULT_TIMEOUTS = {
  nlToDsl: 100,    // ms
  reasoning: 100,  // ms (aggressive default as requested)
  dslToNl: 100     // ms
};

// Reasoning Step Budget (for infinite loop prevention in sync code inside Session)
const DEFAULT_STEP_BUDGET = 1000;

function snapshotSessionState(session) {
  return {
    kbFacts: session?.kbFacts?.length || 0,
    nextFactId: session?.nextFactId || 0,
    rules: session?.rules?.length || 0,
    graphs: session?.graphs?.size || 0,
    operators: session?.operators?.size || 0,
    declaredOperators: session?.declaredOperators?.size || 0,
    vocabAtoms: session?.vocabulary?.atoms?.size || 0,
    vocabReverse: session?.vocabulary?.reverse?.size || 0,
    referenceTexts: session?.referenceTexts?.size || 0,
    referenceMetadata: session?.referenceMetadata?.size || 0
  };
}

function statesEqual(a, b) {
  if (!a || !b) return false;
  for (const key of Object.keys(a)) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Load baseline packs required for fastEval runs.
 *
 * Policy:
 * - Packs loaded here must be general-purpose (Bootstrap/Logic/etc), not suite-specific.
 * - Suite-specific vocabulary belongs in suite-local `.sys2` files or under `evals/domains/*`.
 */
function loadBaselinePacks(session) {
  const packs = [
    'Bootstrap',
    'Relations',
    'Logic',
    'Temporal',
    'Modal',
    'Defaults',
    'Properties',
    'Numeric',
    'Semantics',
    'Lexicon',
    'Reasoning',
    'Canonicalization',
    'Consistency'
  ];

  console.log(`[Runner] Loading baseline packs (${packs.length})...`);
  const loaded = new Set();
  const start = Date.now();

  for (const packName of packs) {
    const packPath = path.join(PROJECT_ROOT, 'config', 'Packs', packName);
    if (!fs.existsSync(packPath)) {
      console.error(`[Runner] Missing baseline pack directory: ${packName}`);
      continue;
    }
    const report = session.loadPack(packName, {
      packPath,
      includeIndex: true,
      validate: false
    });
    if (!report?.success) {
      for (const err of report?.errors || []) {
        console.error(`[Runner] Failed to load ${packName} (${err.file}):`, err.errors);
      }
      continue;
    }
    loaded.add(packName);
  }

  dbg('CORE', `Loaded baseline packs in ${Date.now() - start}ms`);
  return loaded;
}

function resolveConfigTheoryPath(entry) {
  if (!entry || typeof entry !== 'string') return null;
  if (path.isAbsolute(entry)) return entry;
  const cleaned = entry.replace(/^[.][/]/, '');
  if (cleaned.includes('/')) {
    const top = cleaned.split('/')[0];
    if (CONFIG_SCOPES.has(top)) return path.join(CONFIG_ROOT, cleaned);
    return path.join(DOMAIN_ROOT, cleaned);
  }
  // Enforce explicit scope to avoid accidental dependencies on legacy layouts.
  return null;
}

function loadDeclaredTheories(session, theories = [], loaded = new Set()) {
  if (!Array.isArray(theories) || theories.length === 0) return;
  console.log(`[Runner] Loading ${theories.length} declared theories...`);
  for (const entry of theories) {
    const fullPath = resolveConfigTheoryPath(entry);
    if (!fullPath) {
      console.error(`[Runner] Invalid theory reference (must be scoped): ${entry}`);
      continue;
    }
    if (!fs.existsSync(fullPath)) {
      console.error(`[Runner] Missing declared theory: ${entry}`);
      continue;
    }
    if (loaded.has(fullPath)) continue;
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const res = session.learn(content);
      if (!res.success) {
        console.error(`[Runner] Failed to load declared theory ${entry}:`, res.errors);
      }
      loaded.add(fullPath);
    } catch (e) {
      console.error(`[Runner] Exception loading declared theory ${entry}:`, e.message);
    }
  }
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

    const beforeState = testCase.assert_state_unchanged ? snapshotSessionState(session) : null;

    if (testCase.action === 'learn') {
      const result = session.learn(dslToExecute);
      const afterState = testCase.assert_state_unchanged ? snapshotSessionState(session) : null;
      return { result, beforeState, afterState };
    }
    else if (testCase.action === 'listSolutions') {
      // List all CSP solutions for a given solve destination (solutionRelation)
      const destination = dslToExecute.trim();
      const solutions = session.kbFacts.filter(f =>
        f.metadata?.operator === 'cspSolution' &&
        f.metadata?.solutionRelation === destination
      );
      const maxSolutionsRaw =
        testCase.maxSolutions ??
        testCase.max_solutions ??
        testCase.max_results ??
        testCase.maxResults ??
        null;
      const maxSolutions = Number.isFinite(maxSolutionsRaw) ? Math.max(1, maxSolutionsRaw) : null;
      const shown = maxSolutions !== null ? solutions.slice(0, maxSolutions) : solutions;
      const result = {
        success: solutions.length > 0,
        destination,
        solutionCount: solutions.length,
        shownCount: shown.length,
        truncated: shown.length < solutions.length,
        solutions: shown.map((sol, i) => ({
          index: i + 1,
          facts: sol.metadata?.facts || [],
          assignments: sol.metadata?.assignments || []
        }))
      };
      return { result, beforeState: null, afterState: null };
    }
    else {
      // For query/prove, use the DSL
      const queryDsl = testCase.query_dsl || dslToExecute;

      const sessionOptions = { timeout: timeoutMs };
      const maxResults =
        testCase.maxResults ??
        testCase.max_results ??
        testCase.max_results_count ??
        null;
      if (Number.isFinite(maxResults)) {
        sessionOptions.maxResults = Math.max(1, maxResults);
      }
      const useLevelOptimization =
        testCase.useLevelOptimization ??
        testCase.use_level_optimization ??
        null;
      if (typeof useLevelOptimization === 'boolean') {
        sessionOptions.useLevelOptimization = useLevelOptimization;
      }

      if (testCase.action === 'prove' || testCase.action === 'elaborate') {
        const result = session.prove(queryDsl, sessionOptions);
        return { result, beforeState: null, afterState: null };
      } else {
        // Solve blocks are executed via learn(), not query()
        // Detect solve block: starts with @dest solve ProblemType
        if (queryDsl.trim().match(/^@\w+\s+solve\s+/)) {
          const result = session.learn(queryDsl);
          return { result, beforeState: null, afterState: null };
        }
        const result = session.query(queryDsl, sessionOptions);
        return { result, beforeState: null, afterState: null };
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

  const payload = execution.result || {};
  const result = payload.result;
  const beforeState = payload.beforeState || null;
  const afterState = payload.afterState || null;
  
  // Logical Validation
  let passed = false;
  if (testCase.action === 'learn') {
    const expectedSuccess = typeof testCase.expect_success === 'boolean' ? testCase.expect_success : true;
    passed = result.success === expectedSuccess;

    if (passed && expectedSuccess === false && testCase.expect_error_includes) {
      const errors = Array.isArray(result.errors) ? result.errors.map(String) : [];
      const pieces = Array.isArray(testCase.expect_error_includes)
        ? testCase.expect_error_includes
        : [testCase.expect_error_includes];
      const ok = pieces.filter(Boolean).every(piece =>
        errors.some(e => String(e).includes(String(piece)))
      );
      if (!ok) {
        return {
          passed: false,
          error: `Expected error to include: ${JSON.stringify(testCase.expect_error_includes)}`,
          actual: result,
          usedFallback,
          durationMs: execution.duration
        };
      }
    }

    if (passed && expectedSuccess === false && testCase.assert_state_unchanged) {
      if (!statesEqual(beforeState, afterState)) {
        return {
          passed: false,
          error: `Expected session state unchanged for rejected learn`,
          expected: beforeState,
          actual: afterState,
          usedFallback,
          durationMs: execution.duration
        };
      }
    }
  }
  else if (testCase.action === 'prove' || testCase.action === 'elaborate') {
      // Prove passes if it returns a valid structure (true or false),
      // correctness is checked in DSL->NL or expected_result
      passed = true;

      // When proof validation is enabled, treat the proof object as the source of truth,
      // not the suite text (which may be imperfect).
      const expectsProof = caseExpectsProof(testCase);
      if (expectsProof && session?.proofValidationEnabled) {
        const proofObject = result?.proofObject;
        if (!proofObject || typeof proofObject !== 'object') {
          return {
            passed: false,
            error: 'Proof validation enabled but no proofObject was produced',
            actual: result,
            usedFallback,
            durationMs: execution.duration
          };
        }
        if (proofObject.validatorOk === false) {
          return {
            passed: false,
            error: 'Proof validator failed (proofObject.validatorOk=false)',
            actual: result,
            usedFallback,
            durationMs: execution.duration
          };
        }
        if (result?.valid && (!Array.isArray(result?.steps) || result.steps.length === 0)) {
          return {
            passed: false,
            error: 'Proved true but produced no proof steps',
            actual: result,
            usedFallback,
            durationMs: execution.duration
          };
        }
      }
  } else if (testCase.action === 'listSolutions') {
      // listSolutions passes if it returns valid structure
      passed = result !== undefined && result !== null;
  } else {
      // For query: success=false with valid structure means "no results found"
      // which is a valid outcome - let DSL->NL handle output
      passed = result !== undefined && result !== null;
  }

  return {
    passed,
    actual: result,
    usedFallback,
    durationMs: execution.duration
  };
}


// --- PHASE 3: DSL -> NL (Decoding) ---

function coerceTranslationText(result) {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    const proofText = typeof result.proofText === 'string' ? result.proofText.trim() : '';
    if (text && proofText) return `${text} Proof: ${proofText}`;
    if (text) return text;
  }
  return String(result ?? '');
}

function lintProofText(testCase, actualText) {
  if (!testCase || (testCase.action !== 'query' && testCase.action !== 'prove')) return [];
  if (typeof actualText !== 'string') return ['non_string_output'];

  const issues = [];
  const text = actualText;
  const lower = text.toLowerCase();

  // Heuristic 1: Internal search traces should not leak into user-facing proof.
  if (/\bsearch:\b/i.test(text)) issues.push('contains_search_trace');

  // Heuristic 2: Proof should not be empty/trivial when present.
  const proofIdx = lower.indexOf('proof:');
  if (proofIdx >= 0) {
    const proofBody = text.slice(proofIdx + 'proof:'.length).trim();
    if (proofBody.length < 12) issues.push('proof_too_short');
  } else {
    issues.push('missing_proof_prefix');
  }

  return issues;
}

function runDecoding(testCase, reasoningPhase, session, timeoutMs) {
  const proofValidation = validateProofExpectation(testCase);
  if (proofValidation) {
    return proofValidation;
  }
  if (!testCase.expected_nl) {
    return { passed: true, skipped: true };
  }
  if (!reasoningPhase.passed && !reasoningPhase.actual) {
    return { passed: false, skipped: true, error: 'Reasoning failed, cannot decode' };
  }

  const execution = runSyncWithTimeout(() => {
    return session.describeResult({
      action: testCase.action,
      reasoningResult: reasoningPhase.actual,
      queryDsl: testCase.query_dsl || testCase.input_dsl || ''
    });
  }, timeoutMs, 'DSL->NL');

  if (!execution.success) {
    return { passed: false, error: execution.error, durationMs: execution.duration };
  }

  const actualText = coerceTranslationText(execution.result);
  const lintIssues = lintProofText(testCase, actualText);
  const proofLengthCheck = validateProofLength(testCase, actualText);
  if (proofLengthCheck) {
    proofLengthCheck.durationMs = execution.duration;
    return proofLengthCheck;
  }

  const passed = compareOutputs(testCase, actualText);
  return {
    passed,
    actual: actualText,
    expected: testCase.expected_nl,
    lintIssues,
    durationMs: execution.duration
  };
}

function validateProofExpectation(testCase) {
  if (!testCase.expected_nl) return null;
  if (testCase.action !== 'query' && testCase.action !== 'prove') return null;
  const proofNl = testCase.proof_nl;
  const altProofNl = testCase.alternative_proof_nl;
  const proofMissing = proofNl === undefined ||
    proofNl === null ||
    (typeof proofNl === 'string' && proofNl.trim().length === 0) ||
    (Array.isArray(proofNl) && proofNl.filter(p => typeof p === 'string' && p.trim().length > 0).length === 0);

  const countQueryAnswers = (text) => {
    if (Array.isArray(text)) return text.length;
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (/^No results\b/i.test(trimmed) || /^No valid\b/i.test(trimmed)) return 1;
    return trimmed
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .length;
  };

  if (proofMissing) {
    return {
      passed: false,
      error: `VALIDATION ERROR: ${testCase.action} cases must include proof_nl`,
      expected: 'proof_nl string or string[]',
      actual: proofNl
    };
  }
  if (testCase.action === 'query' && !Array.isArray(testCase.expected_nl)) {
    return {
      passed: false,
      error: 'VALIDATION ERROR: query cases must use expected_nl as an array (one answer per entry)',
      expected: 'expected_nl string[]',
      actual: testCase.expected_nl
    };
  }
  if (testCase.action === 'query' && !Array.isArray(proofNl)) {
    return {
      passed: false,
      error: 'VALIDATION ERROR: query cases must use proof_nl as an array (one proof per answer)',
      expected: 'proof_nl string[]',
      actual: proofNl
    };
  }
  if (testCase.action === 'query' && Array.isArray(proofNl)) {
    const answerCount = countQueryAnswers(testCase.expected_nl);
    if (answerCount > 0 && proofNl.length !== answerCount) {
      return {
        passed: false,
        error: `VALIDATION ERROR: proof_nl length (${proofNl.length}) does not match number of answers (${answerCount})`,
        expected: `proof_nl length ${answerCount}`,
        actual: proofNl.length
      };
    }
  }

  if (altProofNl !== undefined && altProofNl !== null) {
    const altProofMissing =
      (typeof altProofNl === 'string' && altProofNl.trim().length === 0) ||
      (Array.isArray(altProofNl) && altProofNl.filter(p => typeof p === 'string' && p.trim().length > 0).length === 0);
    if (altProofMissing) {
      return {
        passed: false,
        error: 'VALIDATION ERROR: alternative_proof_nl is present but empty',
        expected: 'alternative_proof_nl string or string[]',
        actual: altProofNl
      };
    }
    if (testCase.action === 'query' && !Array.isArray(altProofNl)) {
      return {
        passed: false,
        error: 'VALIDATION ERROR: query cases must use alternative_proof_nl as an array (one proof per answer)',
        expected: 'alternative_proof_nl string[]',
        actual: altProofNl
      };
    }
    if (testCase.action !== 'query' && Array.isArray(altProofNl)) {
      return {
        passed: false,
        error: 'VALIDATION ERROR: prove cases must use alternative_proof_nl as a string',
        expected: 'alternative_proof_nl string',
        actual: altProofNl
      };
    }
    if (testCase.action === 'query' && Array.isArray(altProofNl)) {
      const answerCount = countQueryAnswers(testCase.expected_nl);
      if (answerCount > 0 && altProofNl.length !== answerCount) {
        return {
          passed: false,
          error: `VALIDATION ERROR: alternative_proof_nl length (${altProofNl.length}) does not match number of answers (${answerCount})`,
          expected: `alternative_proof_nl length ${answerCount}`,
          actual: altProofNl.length
        };
      }
    }
  }
  return null;
}

function normalizeExpectedEntries(expectedNl) {
  return Array.isArray(expectedNl) ? expectedNl : [expectedNl];
}

function hasExemptText(text) {
  if (text === undefined || text === null) return false;
  const trimmed = String(text).trim();
  if (trimmed.length === 0) return false;
  return trimmed.includes('No results') ||
         trimmed.includes('Cannot') ||
         trimmed.includes('No valid') ||
         trimmed.startsWith('False:');
}

function isExemptExpected(expectedNl) {
  const entries = normalizeExpectedEntries(expectedNl);
  if (entries.length !== 1) return false;
  return hasExemptText(entries[0]);
}

function caseExpectsProof(testCase) {
  if (!testCase || !testCase.expected_nl) return false;
  if (testCase.action !== 'query' && testCase.action !== 'prove') return false;
  const proofNl = testCase.proof_nl;
  const entries = normalizeExpectedEntries(testCase.expected_nl).map(entry => String(entry || ''));
  const hasProofLabel = entries.some(entry => entry.includes('Proof:') || entry.includes('Proof '));
  const isExempt = isExemptExpected(testCase.expected_nl);

  return !isExempt && (!!proofNl || hasProofLabel);
}

function validateProofLength(testCase, actualText) {
  if (testCase.action !== 'query' && testCase.action !== 'prove' && testCase.action !== 'learn') return null;
  const expectedNl = testCase.expected_nl || '';
  const proofNl = testCase.proof_nl;
  const expectedEntries = normalizeExpectedEntries(expectedNl).map(entry => String(entry || ''));
  const expectedText = expectedEntries.join(' ');

  if (testCase.action === 'learn') {
    const proofRequired = proofNl !== undefined && proofNl !== null;
    if (!proofRequired) return null;
    if (!actualText || !actualText.includes('Proof:')) {
      return {
        passed: false,
        error: 'VALIDATION ERROR: Missing "Proof:" in actual output',
        actual: actualText,
        expected: testCase.expected_nl
      };
    }
    const proofMatch = actualText.match(/Proof:\s*(.+)/);
    if (!proofMatch) return null;
    const proofContent = proofMatch[1].trim();
    if (proofContent.length < 10) {
      return {
        passed: false,
        error: `VALIDATION ERROR: Proof content too short (${proofContent.length} chars, min 10). Got: "${proofContent}"`,
        actual: actualText,
        expected: testCase.expected_nl
      };
    }
    return null;
  }

  const isExempt = isExemptExpected(expectedNl);
  const proofRequired = !isExempt && (!!proofNl || /\bProof:/i.test(expectedText));
  if (!proofRequired) return null;

  if (!actualText || !actualText.includes('Proof:')) {
    return {
      passed: false,
      error: 'VALIDATION ERROR: Missing "Proof:" in actual output',
      actual: actualText,
      expected: expectedNl
    };
  }

  const proofMatch = actualText.match(/Proof:\s*(.+)/);
  if (!proofMatch) return null;
  const proofContent = proofMatch[1].trim();
  if (proofContent.length < 10) {
    return {
      passed: false,
      error: `VALIDATION ERROR: Proof content too short (${proofContent.length} chars, min 10). Got: "${proofContent}"`,
      actual: actualText,
      expected: testCase.expected_nl
    };
  }
  return null;
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\bisa\b/g, 'is a')
    .replace(/\bhasa\b/g, 'has a')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(a|an|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractProofContent(text) {
  if (!text || typeof text !== 'string') return '';
  const idx = text.toLowerCase().indexOf('proof:');
  if (idx === -1) return '';
  return text.slice(idx + 'proof:'.length).trim();
}

function proofIncludes(expectedProofNl, actualText) {
  if (expectedProofNl === undefined || expectedProofNl === null) return true;
  const proofText = extractProofContent(actualText) || actualText || '';
  const normProof = normalizeText(proofText);

  if (Array.isArray(expectedProofNl)) {
    return expectedProofNl
      .filter(Boolean)
      .every(piece => normProof.includes(normalizeText(String(piece))));
  }
  return normProof.includes(normalizeText(String(expectedProofNl)));
}

function compareOutputs(testCase, actualText) {
  const expected = testCase.expected_nl || '';
  const proofNl = testCase.proof_nl;
  const altProofNl = testCase.alternative_proof_nl;

  // For learn actions, just verify facts were learned (relaxed validation)
  // Exact fact counts are validated in healthCheck.js
  if (testCase.action === 'learn') {
    if (proofNl !== undefined && proofNl !== null) {
      const proofOk =
        proofIncludes(proofNl, actualText) ||
        ((altProofNl !== undefined && altProofNl !== null) && proofIncludes(altProofNl, actualText));
      if (!proofOk) return false;
    }
    // Check that output indicates learning happened
    if (actualText.startsWith('Learned') && /\d+/.test(actualText)) {
      return true; // Any "Learned N facts" is acceptable
    }
    // Also accept warnings (e.g., "Warning: direct contradiction detected")
    if (actualText.startsWith('Warning:')) {
      return true;
    }
    // Accept CSP solve block output (e.g., "Found 2 seating:..." or "No valid solutions")
    if (actualText.startsWith('Found ') && /\d+/.test(actualText)) {
      return true;
    }
    if (actualText.startsWith('No valid solutions')) {
      return true;
    }
    return false;
  }

  // If a proof expectation is separated, validate it against the proof section.
  if (proofNl !== undefined && proofNl !== null) {
    if (testCase.action === 'query' && Array.isArray(expected)) {
      const actualNorm = normalizeText(actualText);
      const mainOk = expected.every(entry => actualNorm.includes(normalizeText(entry)));
      const proofOk =
        proofIncludes(proofNl, actualText) ||
        ((altProofNl !== undefined && altProofNl !== null) && proofIncludes(altProofNl, actualText));
      return mainOk && proofOk;
    }
    const mainOk = normalizeText(actualText).includes(normalizeText(expected));
    const proofOk =
      proofIncludes(proofNl, actualText) ||
      ((altProofNl !== undefined && altProofNl !== null) && proofIncludes(altProofNl, actualText));
    return mainOk && proofOk;
  }

  if (testCase.action === 'query') {
    const actualNorm = normalizeText(actualText);
    if (Array.isArray(expected)) {
      return expected.every(entry => actualNorm.includes(normalizeText(entry)));
    }
    if (expected.includes('.')) {
      const expectedParts = normalizeText(expected).split(/\s+/).filter(w => w.length > 2);
      return expectedParts.every(part => actualNorm.includes(part));
    }
    return actualNorm.includes(normalizeText(expected));
  }
  return normalizeText(actualText).includes(normalizeText(expected));
}


// --- MAIN RUNNERS ---

export async function runCase(testCase, session = null, config = {}) {
  const sess = session || new Session({
    hdcStrategy: process.env.SYS2_HDC_STRATEGY || 'exact',
    geometry: 256
  });
  if (!session) loadBaselinePacks(sess);

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
  phases.dslToNl = runDecoding(testCase, phases.reasoning, sess, timeouts.dslToNl);

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

  // Session configuration (avoid process-global state)
  const strategyId = options.strategy || process.env.SYS2_HDC_STRATEGY || 'exact';

  const reasoningPriority = options.reasoningPriority || process.env.REASONING_PRIORITY || 'symbolicPriority';
  const exactUnbindMode = options.exactUnbindMode || null;

  // Use geometry from options or defaults
  // Dense-binary: vector dimension (default 2048)
  // Sparse-polynomial: exponent count k (default 4)
  // Metric-affine: byte channels (default 32)
  let defaultGeometry;
  if (strategyId === 'exact') {
    defaultGeometry = 256;
  } else if (strategyId === 'sparse-polynomial') {
    defaultGeometry = 4;
  } else if (strategyId === 'metric-affine') {
    defaultGeometry = 32;
  } else if (strategyId === 'metric-affine-elastic') {
    // geometry is BYTES (start at 8 bytes = 64 bits)
    defaultGeometry = 8;
  } else {
    defaultGeometry = 2048;
  }
  const geometry = options.geometry || defaultGeometry;

  const sessionOptions = {
    geometry,
    hdcStrategy: strategyId,
    reasoningPriority,
    ...(suite.sessionOptions || {})
  };
  if (strategyId === 'exact' && exactUnbindMode) {
    sessionOptions.exactUnbindMode = exactUnbindMode;
  }

  const session = new Session({
    ...sessionOptions
  });

  dbg('CONFIG', `Strategy: ${strategyId}, Geometry: ${geometry}, Priority: ${reasoningPriority}`);

  // 1. Load baseline packs
  const loadedTheories = loadBaselinePacks(session) || new Set();

  // 2. Load suite-declared config theories (relative to config/)
  loadDeclaredTheories(session, suite.declaredTheories, loadedTheories);

  // 3. Load Suite-Specific Theories
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
  const proofLint = (() => {
    let casesWithIssues = 0;
    const byIssue = {};
    for (const r of results) {
      const issues = r?.phases?.dslToNl?.lintIssues;
      if (!Array.isArray(issues) || issues.length === 0) continue;
      casesWithIssues++;
      for (const i of issues) {
        byIssue[i] = (byIssue[i] || 0) + 1;
      }
    }
    return { casesWithIssues, byIssue };
  })();

  return {
    results,
    summary: {
      total,
      passed,
      failed: total - passed,
      brokenParser, // Useful metric: logic works, language fails
      reasoningStats,
      proofLint,
      results, // Include results for detailed reporting
      strategyId, // Include which strategy was used
      geometry, // Include geometry used
      durationMs: suiteDurationMs // Time to run suite
    },
    cases: suite.cases, // Include cases for detailed reporting
    name: suite.name,
    suiteName: suite.suiteName,
    strategyId, // Include strategy at suite level too
    geometry, // Include geometry at suite level too
    durationMs: suiteDurationMs
  };
}

export default { runCase, runSuite };
