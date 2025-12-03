#!/usr/bin/env node
/**
 * AGISystem2 Evaluation Suite Runner (Refactored)
 *
 * THREE EXECUTION MODES:
 *
 * 1. DEFAULT (no flag) - Direct DSL Execution
 *    - Runs expected_dsl directly against reasoning engine
 *    - NO LLM involved - tests pure reasoning capabilities
 *
 * 2. --eval-llm - Translation Quality Evaluation
 *    - Tests NL→DSL translation accuracy
 *
 * 3. --full - End-to-End Evaluation
 *    - Full pipeline: NL → LLM → DSL → Reasoning Engine → Answer
 *
 * Usage: node evalsuite/run.js [options]
 */

const fs = require('fs');
const path = require('path');

// Import lib modules
const {
  colors,
  log,
  logSection,
  logResult,
  logError,
  discoverCases,
  saveFailedCases,
  normalizeTestCase,
  validateTestCase,
  generateDSLQuery,
  analyzeResponse,
  parseStructuredResult,
  normalizeTruth,
  executeProof
} = require('./lib');

// Import proof classifier for qualitative analysis
const {
  classifyProof,
  classifyTestCase,
  formatClassificationForDisplay,
  ReasoningType,
  ComplexityLevel
} = require('./lib/validators/proof_classifier');

// Lazy-load heavy modules
let DirectDSLExecutor = null;
let DirectTranslationEvaluator = null;
let AGIProcess = null;

// Configuration
const SUITE_DIR = __dirname;
const AGI_SCRIPT = path.join(__dirname, '..', 'bin', 'AGISystem2.sh');
const FAILED_FILE = path.join(__dirname, 'failed.json');
const DEFAULT_TIMEOUT = 30000;

/**
 * Execution mode enumeration
 */
const ExecutionMode = {
  DIRECT_DSL: 'direct-dsl',
  EVAL_LLM: 'eval-llm',
  FULL: 'full'
};

let EXECUTION_MODE = ExecutionMode.DIRECT_DSL;

/**
 * Display usage/options at startup
 */
function showUsage() {
  log(`\n${'═'.repeat(70)}`, colors.cyan);
  log(`  ${colors.bright}AGISystem2 Evaluation Suite${colors.reset}`, colors.cyan);
  log(`${'═'.repeat(70)}`, colors.cyan);
  log(``, '');
  log(`  ${colors.bright}USAGE:${colors.reset}`, '');
  log(`    node evalsuite/run.js [MODE] [FILTERS] [OPTIONS]`, '');
  log(``, '');
  log(`  ${colors.bright}EXECUTION MODES:${colors.reset}`, '');
  log(`    ${colors.green}(default)${colors.reset}       Direct DSL - run expected_dsl, NO LLM (fastest)`, '');
  log(`    ${colors.yellow}--eval-llm${colors.reset}      Test NL→DSL translation quality`, '');
  log(`    ${colors.yellow}--full${colors.reset}          End-to-end: LLM → DSL → Execute`, '');
  log(``, '');
  log(`  ${colors.bright}FILTER OPTIONS:${colors.reset}`, '');
  log(`    --case <id>        Run a single case by ID`, colors.gray);
  log(`    --from <n>         Start from case number N`, colors.gray);
  log(`    --to <m>           End at case number M`, colors.gray);
  log(`    --runFailed        Run only previously failed cases`, colors.gray);
  log(``, '');
  log(`  ${colors.bright}OTHER OPTIONS:${colors.reset}`, '');
  log(`    --help, -h         Show this help`, colors.gray);
  log(`    --verbose, -v      Show detailed output`, colors.gray);
  log(`    --dry-run          Validate cases without running`, colors.gray);
  log(`    --timeout <ms>     Timeout per interaction (default: 30000)`, colors.gray);
  log(``, '');
  log(`${'═'.repeat(70)}\n`, colors.cyan);
}

/**
 * Load previously failed cases
 */
function loadFailedCases() {
  if (!fs.existsSync(FAILED_FILE)) {
    return { cases: [], lastUpdated: null };
  }
  try {
    return JSON.parse(fs.readFileSync(FAILED_FILE, 'utf-8'));
  } catch (e) {
    log(`  Warning: Could not parse failed.json: ${e.message}`, colors.yellow);
    return { cases: [], lastUpdated: null };
  }
}

/**
 * Save failed cases (merge with existing)
 */
function saveFailedCasesToFile(newFailedCases, rangeFrom, rangeTo) {
  let existing = loadFailedCases();

  existing.cases = existing.cases.filter(c => {
    const caseNum = parseInt(c.id.split('_')[0], 10);
    if (rangeFrom !== null && rangeTo !== null) {
      if (caseNum >= rangeFrom && caseNum <= rangeTo) {
        return false;
      }
    }
    return true;
  });

  for (const failedCase of newFailedCases) {
    const existingIdx = existing.cases.findIndex(c => c.id === failedCase.id);
    if (existingIdx === -1) {
      existing.cases.push(failedCase);
    } else {
      existing.cases[existingIdx] = failedCase;
    }
  }

  existing.cases.sort((a, b) => a.id.localeCompare(b.id));
  existing.lastUpdated = new Date().toISOString();

  fs.writeFileSync(FAILED_FILE, JSON.stringify(existing, null, 2));
  log(`\n  Failed cases saved to: ${FAILED_FILE}`, colors.gray);
}

/**
 * Discover test cases in suite directory
 */
function discoverTestCases(options = {}) {
  const { filterCase, from, to, runFailed } = options;

  let cases = [];
  const entries = fs.readdirSync(SUITE_DIR, { withFileTypes: true });

  let failedCaseIds = null;
  if (runFailed) {
    const failedData = loadFailedCases();
    if (failedData.cases.length === 0) {
      log(`  No failed cases found in ${FAILED_FILE}`, colors.yellow);
      return [];
    }
    failedCaseIds = new Set(failedData.cases.map(c => c.id));
    log(`  Running ${failedCaseIds.size} previously failed case(s)`, colors.yellow);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (filterCase && !entry.name.includes(filterCase)) continue;

    const caseJsonFile = path.join(SUITE_DIR, entry.name, 'case.json');
    const caseJsFile = path.join(SUITE_DIR, entry.name, 'case.js');

    let caseFile = null;
    let caseData = null;

    if (fs.existsSync(caseJsonFile)) {
      caseFile = caseJsonFile;
      try {
        caseData = JSON.parse(fs.readFileSync(caseFile, 'utf-8'));
      } catch (e) {
        log(`  Warning: Failed to parse ${caseFile}: ${e.message}`, colors.yellow);
      }
    } else if (fs.existsSync(caseJsFile)) {
      caseFile = caseJsFile;
      try {
        delete require.cache[require.resolve(caseFile)];
        caseData = require(caseFile);
      } catch (e) {
        log(`  Warning: Failed to load ${caseFile}: ${e.message}`, colors.yellow);
      }
    }

    if (caseData) {
      // Normalize case format
      caseData = normalizeTestCase(caseData);
      caseData._dir = entry.name;
      caseData._path = caseFile;
      cases.push(caseData);
    }
  }

  cases.sort((a, b) => a._dir.localeCompare(b._dir));

  if (from !== null || to !== null) {
    const startIdx = from !== null ? from - 1 : 0;
    const endIdx = to !== null ? to : cases.length;
    cases = cases.slice(startIdx, endIdx);
    log(`  Filtered to range: cases ${startIdx + 1} to ${Math.min(endIdx, cases.length + startIdx)}`, colors.gray);
  }

  if (failedCaseIds) {
    cases = cases.filter(c => failedCaseIds.has(c.id));
  }

  return cases;
}

/**
 * Evaluate a single test case with REAL proof execution and validation
 *
 * This function performs deep validation:
 * 1. Loads theory_DSL facts into session
 * 2. Executes TASK_DSL query and verifies result
 * 3. Executes PROOF_DSL and verifies:
 *    - All @p facts exist in KB with correct truth
 *    - Chain @c references are valid
 *    - @result and @proof are produced
 * 4. Verifies proof demonstrates the query
 */
async function evaluateCase(testCase, executor, options) {
  const results = {
    id: testCase.id,
    name: testCase.name,
    queries: [],
    passed: 0,
    failed: 0,
    proofSummary: null
  };

  // Get theory facts from either theory_DSL or theory.expected_facts
  const theoryDSL = testCase.theory_DSL ||
                    testCase.theory?.expected_facts ||
                    [];

  // Show and teach theory facts
  if (theoryDSL.length > 0) {
    log(`\n  ═══ THEORY_DSL (${theoryDSL.length} facts) ═══`, colors.cyan);
    for (const fact of theoryDSL) {
      log(`    ${fact}`, colors.gray);
    }

    log(`\n  Teaching facts to KB...`, colors.gray);
    for (const fact of theoryDSL) {
      if (fact.trim() && !fact.startsWith('#')) {
        const dsl = fact.startsWith('@') ? fact : `@f ${fact}`;
        await executor.send(dsl);
      }
    }
  }

  // Evaluate each task with REAL proof execution
  for (const task of testCase.tasks || testCase.queries || []) {
    // Support both task format (TASK_DSL, PROOF_DSL) and query format (expected_dsl)
    const taskId = task.id;
    const taskNL = task.TASK_NL || task.natural_language || taskId;
    const taskDSL = task.TASK_DSL || task.expected_dsl;
    const proofDSL = task.PROOF_DSL;

    log(`\n  Query ${taskId}: ${taskNL}`, colors.bright);

    if (!taskDSL) {
      log(`    Skipping - no TASK_DSL available`, colors.yellow);
      results.queries.push({
        id: taskId,
        passed: false,
        matchReason: 'No TASK_DSL available'
      });
      results.failed++;
      continue;
    }

    // ALWAYS show proof DSL (not just in verbose mode)
    if (proofDSL) {
      log(`    PROOF:`, colors.cyan);
      for (const line of proofDSL.split('\n').filter(l => l.trim())) {
        log(`      ${line}`, colors.gray);
      }
    }

    // Show extra verbose details: full theory
    if (options.verbose) {
      log(`\n    ═══ THEORY (${theoryDSL.length} facts) ═══`, colors.cyan);
      for (const fact of theoryDSL.slice(0, 5)) {  // Show first 5
        log(`      ${fact}`, colors.gray);
      }
      if (theoryDSL.length > 5) {
        log(`      ... and ${theoryDSL.length - 5} more`, colors.gray);
      }
    }

    // REAL VALIDATION: Execute proof and verify against KB
    if (proofDSL) {
      try {
        const proofResult = executeProof({
          theoryDSL,
          taskDSL,
          proofDSL,
          taskId
        });

        if (options.verbose) {
          log(`\n    ═══ EXECUTION ═══`, colors.cyan);
          for (const entry of proofResult.executionLog) {
            log(`      ${entry}`, colors.gray);
          }

          // Show result point
          if (proofResult.resultPoint) {
            log(`\n    ═══ RESULT POINT ═══`, colors.cyan);
            log(`      ${JSON.stringify(proofResult.resultPoint)}`, colors.yellow);
          }

          // Show verified facts details
          if (proofResult.factsVerified?.length > 0) {
            log(`\n    ═══ VERIFIED FACTS ═══`, colors.green);
            for (const v of proofResult.factsVerified) {
              const inTheory = v.inTheory ? '✓ in theory' : '⚡ derived';
              log(`      @${v.variable}: ${v.fact} [${v.truth}] (${inTheory})`, colors.green);
            }
          }

          // Show missing facts
          if (proofResult.factsMissing?.length > 0) {
            log(`\n    ═══ MISSING/FAILED FACTS ═══`, colors.red);
            for (const m of proofResult.factsMissing) {
              log(`      @${m.variable}: ${m.fact} - ${m.error || m.truth}`, colors.red);
            }
          }
        }

        // Show raw result from session (only relevant fields)
        if (proofResult.resultPoint) {
          const rp = proofResult.resultPoint;
          log(`    @result = { truth: "${rp.truth}", band: "${rp.band || rp.truth}", method: "${rp.method || 'direct'}" }`, colors.gray);
        }

        // Classify this proof qualitatively
        const proofClassification = classifyProof(proofResult, proofDSL, task);

        // Show qualitative classification
        const complexityIcon = {
          'trivial': '○',
          'shallow': '◐',
          'moderate': '◑',
          'complex': '●',
          'sophisticated': '◉'
        }[proofClassification.complexity] || '?';

        const genuineFlag = proofClassification.isGenuineReasoning ? colors.green + '✓' : colors.yellow + '⚠';
        log(`    ${genuineFlag} ${complexityIcon} ${proofClassification.description}${colors.reset}`, '');

        // Show issues if any
        if (proofClassification.issues.length > 0) {
          for (const issue of proofClassification.issues) {
            log(`      ⚠ ${issue}`, colors.yellow);
          }
        }

        // Show verified facts (compact)
        if (proofResult.factsVerified?.length > 0 && options.verbose) {
          log(`    ─── Facts (${proofResult.factsVerified.length}) ───`, colors.cyan);
          for (const v of proofResult.factsVerified) {
            const methodIcon = v.method === 'direct' ? '●' : (v.method === 'transitive' ? '◆' : '○');
            log(`      ${methodIcon} @${v.variable}: ${v.fact}`, colors.gray);
          }
        }

        if (proofResult.factsMissing?.length > 0) {
          log(`    ─── Missing Facts ───`, colors.red);
          for (const m of proofResult.factsMissing) {
            log(`      ✗ @${m.variable}: ${m.fact} - ${m.reason}`, colors.red);
          }
        }

        if (proofResult.valid) {
          // Show verified facts count
          const verifiedCount = proofResult.factsVerified?.length || 0;
          const missingCount = proofResult.factsMissing?.length || 0;

          if (verifiedCount > 0) {
            logResult(true, `Proof valid: ${verifiedCount} facts verified in KB`);
          } else {
            logResult(true, `Proof valid: @result and @proof produced`);
          }

          results.passed++;
          results.queries.push({
            id: taskId,
            passed: true,
            matchReason: `Proof executed: ${verifiedCount} KB facts verified`,
            matchType: 'proof_valid',
            factsVerified: proofResult.factsVerified,
            resultPoint: proofResult.resultPoint,
            classification: proofClassification,
            proofResult: proofResult  // Full proof result for metrics
          });
        } else {
          // Proof failed - show issues
          const issues = proofResult.issues.join('; ');
          logResult(false, `Proof invalid: ${issues}`);

          if (proofResult.factsMissing?.length > 0 && !options.verbose) {
            log(`    Missing facts:`, colors.red);
            for (const missing of proofResult.factsMissing) {
              log(`      - @${missing.variable}: ${missing.fact}`, colors.red);
            }
          }

          results.failed++;
          results.queries.push({
            id: taskId,
            passed: false,
            matchReason: `Proof failed: ${issues}`,
            matchType: 'proof_invalid',
            issues: proofResult.issues,
            factsMissing: proofResult.factsMissing,
            proofResult: proofResult  // Full proof result for metrics
          });
        }
      } catch (err) {
        logResult(false, `Proof execution error: ${err.message}`);
        results.queries.push({
          id: taskId,
          passed: false,
          matchReason: `Error: ${err.message}`
        });
        results.failed++;
      }
    } else {
      // No PROOF_DSL - fallback to simple query execution
      log(`    Warning: No PROOF_DSL - using simple validation`, colors.yellow);

      try {
        const response = await executor.send(taskDSL, taskId);
        log(`    Response: ${response.substring(0, 200)}...`, colors.gray);

        // Use response analyzer for simple validation
        const analysis = analyzeResponse(response, task.expected_answer || {});

        if (analysis.passed) {
          logResult(true, `${analysis.reason} (no proof)`);
          results.passed++;
        } else {
          logResult(false, `${analysis.reason}`);
          results.failed++;
        }

        results.queries.push({
          id: taskId,
          passed: analysis.passed,
          matchReason: analysis.reason + ' (no PROOF_DSL)',
          matchType: analysis.matchType
        });
      } catch (err) {
        logResult(false, `Error: ${err.message}`);
        results.queries.push({
          id: taskId,
          passed: false,
          matchReason: `Error: ${err.message}`
        });
        results.failed++;
      }
    }
  }

  // Generate qualitative case summary using classifier
  const caseSummary = classifyTestCase(results.queries, testCase);

  log(`\n  ═══ CASE SUMMARY: ${testCase.id} ═══`, colors.cyan);
  log(`    Tasks: ${results.passed + results.failed} | Passed: ${results.passed} | Failed: ${results.failed}`, colors.bright);

  // Show complexity distribution
  const complexityParts = [];
  for (const [level, count] of Object.entries(caseSummary.complexityDistribution)) {
    if (count > 0) {
      const icon = { trivial: '○', shallow: '◐', moderate: '◑', complex: '●', sophisticated: '◉' }[level] || '?';
      complexityParts.push(`${icon}${level}:${count}`);
    }
  }
  log(`    Complexity: ${complexityParts.join(' ')}`, colors.gray);

  // Show reasoning types
  const typeNames = {
    fact_lookup: 'lookup',
    transitive_closure: 'transitive',
    property_inheritance: 'inheritance',
    deduction: 'deduction',
    abduction: 'abduction',
    exception_handling: 'exceptions'
  };
  const typeParts = [];
  for (const [type, count] of Object.entries(caseSummary.reasoningTypeDistribution)) {
    if (count > 0) {
      typeParts.push(`${typeNames[type] || type}:${count}`);
    }
  }
  log(`    Reasoning: ${typeParts.join(', ')}`, colors.gray);

  // Quality verdict
  const qualityColor = caseSummary.genuineReasoningCount === 0 ? colors.red :
                       caseSummary.genuineReasoningCount < caseSummary.totalTasks / 2 ? colors.yellow : colors.green;
  log(`    ${qualityColor}Quality: ${caseSummary.qualitySummary}${colors.reset}`, '');

  // Store for final summary
  results.caseSummary = caseSummary;

  return results;
}

/**
 * Evaluate translation quality
 */
async function evaluateTranslation(testCase, executor, options, stats) {
  const results = {
    id: testCase.id,
    name: testCase.name,
    queries: [],
    passed: 0,
    failed: 0
  };

  // Set theory context for translation
  if (executor.setTheoryContext) {
    executor.setTheoryContext({
      theory: testCase.theory?.natural_language || '',
      facts: testCase.theory?.expected_facts || []
    });
  }

  for (const query of testCase.queries || []) {
    log(`\n  Query ${query.id}: ${query.natural_language}`, colors.bright);

    try {
      const generatedDsl = await executor.translateQuestion(query.natural_language);
      const expectedDsl = query.expected_dsl;

      log(`    Generated: ${generatedDsl || '(none)'}`, colors.gray);
      log(`    Expected:  ${expectedDsl || '(none)'}`, colors.gray);

      const comparison = executor.compareDsl(generatedDsl, expectedDsl);

      // Update stats
      if (comparison.matchType === 'exact') stats.exact++;
      else if (comparison.matchType === 'semantic') stats.semantic++;
      else if (comparison.matchType === 'partial') stats.partial++;
      else stats.none++;

      const passed = comparison.matchType === 'exact' || comparison.matchType === 'semantic';
      if (passed) {
        logResult(true, `${comparison.matchType} (${comparison.similarity}%)`);
        results.passed++;
      } else {
        logResult(false, `${comparison.matchType} (${comparison.similarity}%)`);
        results.failed++;
      }

      results.queries.push({
        id: query.id,
        passed,
        matchReason: comparison.details,
        matchType: comparison.matchType
      });
    } catch (err) {
      logResult(false, `Error: ${err.message}`);
      stats.none++;
      results.queries.push({
        id: query.id,
        passed: false,
        matchReason: `Error: ${err.message}`
      });
      results.failed++;
    }
  }

  // If this is a v4.1 case with tasks/PROOF_DSL, run formal proof validation
  if (testCase.tasks && testCase.tasks.length > 0) {
    const proofExec = executeTestCase(testCase);

    results.proofSummary = {
      passed: proofExec.passed,
      failed: proofExec.failed,
      tasks: proofExec.tasks
    };

    // Treat each proof task as an additional check that must pass
    results.passed += proofExec.passed;
    results.failed += proofExec.failed;

    if (proofExec.failed > 0 && options.verbose) {
      log(`\n  Proof validation failed for ${proofExec.failed} task(s):`, colors.red);
      for (const t of proofExec.tasks.filter(t => !t.valid)) {
        log(`    - ${t.taskId}: ${t.issues.join('; ')}`, colors.red);
      }
    }
  }

  return results;
}

/**
 * Run dry-run mode
 */
function dryRun(cases) {
  logSection('DRY RUN - Validating Test Cases');

  let valid = 0;
  let invalid = 0;

  for (const testCase of cases) {
    log(`\n  ${testCase._dir}: ${testCase.name}`, colors.bright);

    const validation = validateTestCase(testCase);

    if (validation.valid) {
      valid++;
      logResult(true, `Valid - ${testCase.queries?.length || 0} queries`);
    } else {
      invalid++;
      logResult(false, `Invalid:`);
      for (const issue of validation.issues) {
        log(`      - ${issue}`, colors.red);
      }
    }
  }

  logSection('DRY RUN SUMMARY');
  log(`  Valid cases: ${valid}`, colors.green);
  log(`  Invalid cases: ${invalid}`, invalid > 0 ? colors.red : colors.green);

  return invalid === 0;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  const validFlags = new Set(['--eval-llm', '--full', '--runFailed', '--verbose', '-v', '--dry-run', '--help', '-h']);
  const validOptionsWithValue = new Set(['--case', '--only-case', '--from', '--to', '--timeout']);

  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  // Validate arguments
  const unknownArgs = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (validFlags.has(arg)) {
        // Valid flag
      } else if (validOptionsWithValue.has(arg)) {
        i++; // Skip value
      } else {
        unknownArgs.push(arg);
      }
    }
  }

  if (unknownArgs.length > 0) {
    console.error(`\n${colors.red}Error: Unknown option(s): ${unknownArgs.join(', ')}${colors.reset}\n`);
    showUsage();
    process.exit(1);
  }

  const options = {
    filterCase: null,
    from: null,
    to: null,
    runFailed: args.includes('--runFailed'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
    timeout: DEFAULT_TIMEOUT
  };

  // Determine execution mode
  if (args.includes('--eval-llm')) {
    EXECUTION_MODE = ExecutionMode.EVAL_LLM;
  } else if (args.includes('--full')) {
    EXECUTION_MODE = ExecutionMode.FULL;
  } else {
    EXECUTION_MODE = ExecutionMode.DIRECT_DSL;
  }

  // Parse arguments
  let caseIdx = args.indexOf('--case');
  if (caseIdx === -1) caseIdx = args.indexOf('--only-case');
  if (caseIdx !== -1 && args[caseIdx + 1]) {
    options.filterCase = args[caseIdx + 1];
  }

  const fromIdx = args.indexOf('--from');
  if (fromIdx !== -1 && args[fromIdx + 1]) {
    options.from = parseInt(args[fromIdx + 1], 10);
  }

  const toIdx = args.indexOf('--to');
  if (toIdx !== -1 && args[toIdx + 1]) {
    options.to = parseInt(args[toIdx + 1], 10);
  }

  const timeoutIdx = args.indexOf('--timeout');
  if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
    options.timeout = parseInt(args[timeoutIdx + 1], 10);
  }

  showUsage();

  logSection('AGISystem2 Evaluation Suite');
  log(`  Suite directory: ${SUITE_DIR}`);
  log(`  Timeout: ${options.timeout}ms`);

  const modeDescriptions = {
    [ExecutionMode.DIRECT_DSL]: 'DIRECT DSL (no LLM - pure reasoning test)',
    [ExecutionMode.EVAL_LLM]: 'EVAL LLM (test NL→DSL translation quality)',
    [ExecutionMode.FULL]: 'FULL (end-to-end: LLM → DSL → Execute)'
  };
  log(`  Mode: ${modeDescriptions[EXECUTION_MODE]}`, colors.cyan);

  // Discover test cases
  const cases = discoverTestCases(options);
  log(`\n  Found ${cases.length} test case(s)`, colors.bright);

  if (cases.length === 0) {
    log('  No test cases found!', colors.red);
    process.exit(1);
  }

  // Dry run mode
  if (options.dryRun) {
    const valid = dryRun(cases);
    process.exit(valid ? 0 : 1);
  }

  // Lazy load executor classes
  DirectDSLExecutor = require('./lib/executors/direct_dsl_executor');
  DirectTranslationEvaluator = require('./lib/evaluators/direct_translation_evaluator');
  AGIProcess = require('./lib/executors/agi_process');

  // Run evaluation
  let totalPassed = 0;
  let totalFailed = 0;
  const allResults = [];
  const translationStats = { exact: 0, semantic: 0, partial: 0, none: 0 };

  for (const testCase of cases) {
    logSection(`Case: ${testCase.id} - ${testCase.name}`);

    let executor;
    switch (EXECUTION_MODE) {
      case ExecutionMode.DIRECT_DSL:
        executor = new DirectDSLExecutor(options);
        break;
      case ExecutionMode.EVAL_LLM:
        executor = new DirectTranslationEvaluator(options);
        break;
      case ExecutionMode.FULL:
        executor = new AGIProcess(options);
        break;
    }

    try {
      log(`  Starting executor...`, colors.gray);
      await executor.start();

      let result;
      if (EXECUTION_MODE === ExecutionMode.EVAL_LLM) {
        result = await evaluateTranslation(testCase, executor, options, translationStats);
      } else {
        result = await evaluateCase(testCase, executor, options);
      }

      allResults.push(result);
      totalPassed += result.passed;
      totalFailed += result.failed;

    } catch (err) {
      log(`  Error running case: ${err.message}`, colors.red);
      if (options.verbose) {
        console.error(err.stack);
      }
      totalFailed += (testCase.queries?.length || 0);
    } finally {
      await executor.stop();
    }
  }

  // Final summary
  logSection('EVALUATION SUMMARY');

  const totalQueries = totalPassed + totalFailed;

  // Count verification methods from all results
  const methodStats = {};
  let totalFactsVerified = 0;
  for (const result of allResults) {
    for (const q of result.queries || []) {
      if (q.factsVerified) {
        for (const f of q.factsVerified) {
          totalFactsVerified++;
          const method = f.method || 'unknown';
          methodStats[method] = (methodStats[method] || 0) + 1;
        }
      }
    }
  }

  log(`\n  ${colors.bright}TOTALS:${colors.reset}`);
  log(`    Queries:  ${totalQueries}`);
  log(`    ${colors.green}Passed:${colors.reset}   ${totalPassed} (${((totalPassed / totalQueries) * 100).toFixed(1)}%)`);
  log(`    ${colors.red}Failed:${colors.reset}   ${totalFailed}`);

  // Aggregate qualitative statistics across all cases
  const globalStats = {
    totalGenuine: 0,
    totalTrivial: 0,
    complexityDist: { trivial: 0, shallow: 0, moderate: 0, complex: 0, sophisticated: 0 },
    reasoningDist: {},
    avgDepth: 0,
    maxDepth: 0
  };
  let totalDepth = 0;

  for (const result of allResults) {
    if (result.caseSummary) {
      globalStats.totalGenuine += result.caseSummary.genuineReasoningCount;
      globalStats.totalTrivial += result.caseSummary.complexityDistribution.trivial || 0;
      totalDepth += parseFloat(result.caseSummary.avgDepth) * result.caseSummary.totalTasks;
      if (result.caseSummary.maxDepth > globalStats.maxDepth) {
        globalStats.maxDepth = result.caseSummary.maxDepth;
      }

      for (const [level, count] of Object.entries(result.caseSummary.complexityDistribution)) {
        globalStats.complexityDist[level] = (globalStats.complexityDist[level] || 0) + count;
      }
      for (const [type, count] of Object.entries(result.caseSummary.reasoningTypeDistribution)) {
        globalStats.reasoningDist[type] = (globalStats.reasoningDist[type] || 0) + count;
      }
    }
  }
  globalStats.avgDepth = totalQueries > 0 ? (totalDepth / totalQueries).toFixed(1) : 0;

  // QUALITATIVE SUMMARY
  log(`\n  ${colors.bright}PROOF QUALITY ANALYSIS:${colors.reset}`);

  // Complexity breakdown
  const complexityIcons = { trivial: '○', shallow: '◐', moderate: '◑', complex: '●', sophisticated: '◉' };
  log(`    Complexity distribution across ${totalQueries} proofs:`);
  for (const [level, count] of Object.entries(globalStats.complexityDist)) {
    if (count > 0) {
      const pct = ((count / totalQueries) * 100).toFixed(0);
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      log(`      ${complexityIcons[level]} ${level.padEnd(13)} ${bar} ${count} (${pct}%)`, colors.gray);
    }
  }

  // Reasoning types
  const typeNames = {
    fact_lookup: 'Fact lookup (trivial)',
    transitive_closure: 'Transitive chains',
    property_inheritance: 'Property inheritance',
    deduction: 'Deductive reasoning',
    abduction: 'Abductive inference',
    induction: 'Inductive generalization',
    exception_handling: 'Exception handling',
    counterfactual: 'Counterfactual reasoning'
  };
  log(`\n    Reasoning types used:`);
  for (const [type, count] of Object.entries(globalStats.reasoningDist).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / totalQueries) * 100).toFixed(0);
    log(`      • ${typeNames[type] || type}: ${count} (${pct}%)`, colors.gray);
  }

  // Overall quality verdict
  const genuinePct = ((globalStats.totalGenuine / totalQueries) * 100).toFixed(0);
  const trivialPct = ((globalStats.totalTrivial / totalQueries) * 100).toFixed(0);

  // Calculate min depth (excluding 0)
  let minDepth = Infinity;
  for (const result of allResults) {
    if (result.caseSummary) {
      for (const c of result.caseSummary.classifications || []) {
        if (c.depth > 0 && c.depth < minDepth) {
          minDepth = c.depth;
        }
      }
    }
  }
  if (minDepth === Infinity) minDepth = 0;

  log(`\n    ${colors.bright}Overall Quality Verdict:${colors.reset}`);
  log(`      Proof depth: min=${minDepth}, avg=${globalStats.avgDepth}, max=${globalStats.maxDepth} steps`);
  log(`      Genuine reasoning: ${globalStats.totalGenuine}/${totalQueries} (${genuinePct}%)`);
  log(`      Trivial lookups: ${globalStats.totalTrivial}/${totalQueries} (${trivialPct}%)`);

  if (genuinePct < 25) {
    log(`\n      ${colors.red}⚠ SUITE QUALITY: POOR — Most proofs are trivial fact lookups, not real reasoning${colors.reset}`, '');
    log(`        Recommendation: Add complex deduction chains (5+ steps), abductive reasoning, counterfactuals`, colors.gray);
  } else if (genuinePct < 50) {
    log(`\n      ${colors.yellow}⚠ SUITE QUALITY: NEEDS IMPROVEMENT — Only ${genuinePct}% genuine reasoning${colors.reset}`, '');
    log(`        Recommendation: Increase proof depth, add more reasoning variety`, colors.gray);
  } else if (genuinePct < 75) {
    log(`\n      ${colors.cyan}◑ SUITE QUALITY: MODERATE — ${genuinePct}% genuine reasoning${colors.reset}`, '');
  } else {
    log(`\n      ${colors.green}● SUITE QUALITY: GOOD — ${genuinePct}% genuine reasoning${colors.reset}`, '');
  }

  // Per-case summary with quality indicators
  log(`\n  ${colors.bright}Per-Case Quality:${colors.reset}`);

  // Calculate column widths for alignment
  const maxIdLen = Math.max(...allResults.map(r => r.id.length));

  for (const result of allResults) {
    const totalTasks = result.passed + result.failed;
    const cs = result.caseSummary;

    if (!cs) {
      log(`    ${result.id}: ${result.passed}/${totalTasks} passed — no classification`, colors.gray);
      continue;
    }

    const genuineCount = cs.genuineReasoningCount;
    const qualityIcon = genuineCount === 0 ? '○' :
                        genuineCount < totalTasks / 2 ? '◐' :
                        genuineCount < totalTasks ? '◑' : '●';

    const qualityColor = genuineCount === 0 ? colors.red :
                         genuineCount < totalTasks / 2 ? colors.yellow : colors.green;

    const passColor = result.failed === 0 ? colors.green : colors.yellow;

    // Format real metrics arrays for per-task data
    // work[] = stepsExecuted (actual BFS iterations - total reasoning work)
    // dsl[] = PROOF_DSL line count (specification length)
    const workArr = cs.reasoningSteps || [];   // Renamed from steps - now shows actual BFS work
    const dslArr = cs.proofLengths || [];      // Renamed from proof - shows DSL spec size
    const factsArr = cs.factsVerifiedCounts || [];  // Facts verified per task

    // Build readable complexity summary (e.g., "2 moderate, 3 complex, 3 deep")
    const compWords = [];
    if (cs.complexityDistribution.trivial > 0) compWords.push(`${cs.complexityDistribution.trivial} trivial`);
    if (cs.complexityDistribution.shallow > 0) compWords.push(`${cs.complexityDistribution.shallow} shallow`);
    if (cs.complexityDistribution.moderate > 0) compWords.push(`${cs.complexityDistribution.moderate} moderate`);
    if (cs.complexityDistribution.complex > 0) compWords.push(`${cs.complexityDistribution.complex} complex`);
    if (cs.complexityDistribution.sophisticated > 0) compWords.push(`${cs.complexityDistribution.sophisticated} deep`);
    const compSummary = compWords.length > 0 ? compWords.join(', ') : 'no proofs';

    // Padded columns for alignment
    const passStr = `${result.passed}/${totalTasks}`.padEnd(4);
    const idStr = result.id.padEnd(maxIdLen + 1);
    const workStr = workArr.map(n => String(n).padStart(2)).join(' ');
    const dslStr = dslArr.map(n => String(n).padStart(2)).join(' ');
    const compStr = compSummary.padEnd(42);
    const qualStr = cs.qualitySummary.padEnd(50);

    // Everything on ONE line - elegant aligned format with square brackets
    // work[] = actual BFS steps executed by reasoner (total reasoning effort)
    // dsl[] = PROOF_DSL line count (specification complexity)
    log(`    ${passColor}${passStr}${colors.reset} ${idStr} work[${workStr}] dsl[${dslStr}]  ${compStr} ${qualStr}`, '');
  }

  // Write results
  const resultsPath = path.join(SUITE_DIR, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPassed,
    totalFailed,
    cases: allResults
  }, null, 2));
  log(`\n  Results written to: ${resultsPath}`, colors.gray);

  // Save failed cases
  const failedCasesForSave = allResults
    .filter(r => r.failed > 0)
    .map(r => ({
      id: r.id,
      name: r.name,
      failedQueries: r.queries.filter(q => !q.passed).map(q => q.id),
      lastRun: new Date().toISOString()
    }));

  if (failedCasesForSave.length > 0 || options.from !== null || options.to !== null) {
    saveFailedCasesToFile(failedCasesForSave, options.from, options.to);
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
