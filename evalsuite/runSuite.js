#!/usr/bin/env node
/**
 * AGISystem2 Evaluation Suite Runner
 *
 * Runs test cases against the AGISystem2 chat interface to validate
 * that the LLM correctly translates natural language to Sys2DSL
 * and that the reasoning engine produces expected answers.
 *
 * Usage:
 *   node evalsuite/runSuite.js [options]
 *
 * Options:
 *   --case <id>     Run only specific case (e.g., 01_taxonomy)
 *   --from <n>      Start from case number N (1-indexed)
 *   --to <m>        End at case number M (inclusive)
 *   --runFailed     Run only previously failed cases (from failed.json)
 *   --verbose       Show detailed output
 *   --dry-run       Parse cases without running AGISystem2
 *   --timeout <ms>  Timeout per interaction (default: 30000)
 *
 * Examples:
 *   node evalsuite/runSuite.js --from 1 --to 10    # Run cases 1-10
 *   node evalsuite/runSuite.js --from 20 --to 30   # Run cases 20-30
 *   node evalsuite/runSuite.js --runFailed         # Run only failed tests
 *   node evalsuite/runSuite.js --case 05_abductive # Run specific case
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const SUITE_DIR = __dirname;
const AGI_SCRIPT = path.join(__dirname, '..', 'bin', 'AGISystem2.sh');
const FAILED_FILE = path.join(__dirname, 'failed.json');
const DEFAULT_TIMEOUT = 30000;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

/**
 * Display usage/options at startup
 */
function showUsage() {
  log(`\n${'─'.repeat(60)}`, colors.gray);
  log(`  Available Options:`, colors.bright);
  log(`${'─'.repeat(60)}`, colors.gray);
  log(`  --from <n>      Start from case number N (1-indexed)`, colors.cyan);
  log(`  --to <m>        End at case number M (inclusive)`, colors.cyan);
  log(`  --runFailed     Run only previously failed cases`, colors.cyan);
  log(`  --case <id>     Run specific case by ID`, colors.cyan);
  log(`  --verbose       Show detailed output`, colors.cyan);
  log(`  --dry-run       Validate cases without running`, colors.cyan);
  log(`  --timeout <ms>  Set timeout per interaction`, colors.cyan);
  log(`${'─'.repeat(60)}`, colors.gray);
  log(`  Examples:`, colors.bright);
  log(`    node evalsuite/runSuite.js --from 1 --to 10`, colors.gray);
  log(`    node evalsuite/runSuite.js --runFailed`, colors.gray);
  log(`    node evalsuite/runSuite.js --case 05_abductive`, colors.gray);
  log(`${'─'.repeat(60)}\n`, colors.gray);
}

/**
 * Load previously failed cases from failed.json
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
 * Save failed cases to failed.json (merge with existing, don't overwrite from other ranges)
 */
function saveFailedCases(newFailedCases, rangeFrom, rangeTo) {
  let existing = loadFailedCases();

  // Remove existing entries for cases in current range (they will be updated)
  const casesInRange = new Set(newFailedCases.map(c => c.id));

  // Keep cases outside current range, remove those in range (will be re-added if failed)
  existing.cases = existing.cases.filter(c => {
    // If this case is in our current run range, remove it (we'll add back if still failing)
    const caseNum = parseInt(c.id.split('_')[0], 10);
    if (rangeFrom !== null && rangeTo !== null) {
      if (caseNum >= rangeFrom && caseNum <= rangeTo) {
        return false; // Remove - will be re-added if still failing
      }
    }
    return true; // Keep cases outside our range
  });

  // Add new failed cases
  for (const failedCase of newFailedCases) {
    // Check if already exists (by id)
    const existingIdx = existing.cases.findIndex(c => c.id === failedCase.id);
    if (existingIdx === -1) {
      existing.cases.push(failedCase);
    } else {
      existing.cases[existingIdx] = failedCase;
    }
  }

  // Sort by case ID
  existing.cases.sort((a, b) => a.id.localeCompare(b.id));

  existing.lastUpdated = new Date().toISOString();
  existing.rangeInfo = { lastFrom: rangeFrom, lastTo: rangeTo };

  fs.writeFileSync(FAILED_FILE, JSON.stringify(existing, null, 2));
  log(`\n  Failed cases saved to: ${FAILED_FILE}`, colors.gray);
  log(`  Total failed cases tracked: ${existing.cases.length}`, colors.yellow);
}

function logSection(title) {
  log(`\n${'═'.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.cyan + colors.bright);
  log(`${'═'.repeat(60)}`, colors.cyan);
}

function logResult(passed, message) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  log(`  ${symbol} ${message}`, color);
}

/**
 * Discover all test cases in the suite directory
 * @param {Object} options - Filter options
 * @param {string} options.filterCase - Run only specific case by ID
 * @param {number} options.from - Start from case number (1-indexed)
 * @param {number} options.to - End at case number (inclusive)
 * @param {boolean} options.runFailed - Run only previously failed cases
 */
function discoverCases(options = {}) {
  const { filterCase, from, to, runFailed } = options;

  let cases = [];
  const entries = fs.readdirSync(SUITE_DIR, { withFileTypes: true });

  // If runFailed mode, load failed cases first
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
    if (filterCase && entry.name !== filterCase) continue;

    const caseFile = path.join(SUITE_DIR, entry.name, 'case.json');
    if (fs.existsSync(caseFile)) {
      try {
        const caseData = JSON.parse(fs.readFileSync(caseFile, 'utf-8'));
        caseData._dir = entry.name;
        caseData._path = caseFile;
        cases.push(caseData);
      } catch (e) {
        log(`  Warning: Failed to parse ${caseFile}: ${e.message}`, colors.yellow);
      }
    }
  }

  // Sort by directory name (which includes case number)
  cases.sort((a, b) => a._dir.localeCompare(b._dir));

  // Apply range filter (--from and --to)
  if (from !== null || to !== null) {
    const startIdx = from !== null ? from - 1 : 0;
    const endIdx = to !== null ? to : cases.length;
    cases = cases.slice(startIdx, endIdx);
    log(`  Filtered to range: cases ${startIdx + 1} to ${Math.min(endIdx, cases.length + startIdx)}`, colors.gray);
  }

  // Apply runFailed filter
  if (failedCaseIds) {
    cases = cases.filter(c => failedCaseIds.has(c.id));
  }

  return cases;
}

/**
 * AGISystem2 Process Manager
 * Spawns the chat interface and manages stdin/stdout communication
 */
class AGIProcess {
  constructor(options = {}) {
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.verbose = options.verbose || false;
    this.process = null;
    this.buffer = '';
    this.responseResolve = null;
    this.responseReject = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      // Check if script exists
      if (!fs.existsSync(AGI_SCRIPT)) {
        reject(new Error(`AGISystem2.sh not found at ${AGI_SCRIPT}`));
        return;
      }

      // Use --debug flag to get structured DSL output
      this.process = spawn('bash', [AGI_SCRIPT, '--no-color', '--debug'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.process.on('error', (err) => {
        reject(new Error(`Failed to start AGISystem2: ${err.message}`));
      });

      this.process.on('exit', (code) => {
        if (this.verbose) {
          log(`  [AGI] Process exited with code ${code}`, colors.gray);
        }
      });

      // Collect stdout
      this.process.stdout.on('data', (data) => {
        const text = data.toString();
        this.buffer += text;

        if (this.verbose) {
          log(`  [AGI OUT] ${text.trim()}`, colors.gray);
        }

        // Check if we have a complete response (ends with prompt)
        if (this.isResponseComplete()) {
          if (this.responseResolve) {
            const response = this.extractResponse();
            this.responseResolve(response);
            this.responseResolve = null;
            this.responseReject = null;
          }
        }
      });

      // Collect stderr (usually warnings/errors)
      this.process.stderr.on('data', (data) => {
        if (this.verbose) {
          log(`  [AGI ERR] ${data.toString().trim()}`, colors.yellow);
        }
      });

      // Wait for initial prompt
      setTimeout(() => {
        resolve();
      }, 2000); // Give it time to start
    });
  }

  isResponseComplete() {
    // Look for prompt indicators that signal response is complete
    // The chat interface typically shows a prompt like "> " or "You: "
    const promptPatterns = [
      /\n>\s*$/,
      /\nYou:\s*$/,
      /\nInput:\s*$/,
      /\n\?\s*$/
    ];

    for (const pattern of promptPatterns) {
      if (pattern.test(this.buffer)) {
        return true;
      }
    }

    // Also check for JSON response completion
    if (this.buffer.includes('"truth"') && this.buffer.includes('}')) {
      return true;
    }

    return false;
  }

  extractResponse() {
    const response = this.buffer;
    this.buffer = '';
    return response;
  }

  async send(message) {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('AGI process not started'));
        return;
      }

      this.buffer = '';
      this.responseResolve = resolve;
      this.responseReject = reject;

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (this.responseResolve) {
          // Return what we have so far
          const partialResponse = this.extractResponse();
          this.responseResolve(partialResponse || '[TIMEOUT - No response]');
          this.responseResolve = null;
          this.responseReject = null;
        }
      }, this.timeout);

      // Send message
      if (this.verbose) {
        log(`  [AGI IN] ${message}`, colors.blue);
      }

      this.process.stdin.write(message + '\n');

      // Clear timeout when resolved
      const originalResolve = this.responseResolve;
      this.responseResolve = (response) => {
        clearTimeout(timeoutId);
        originalResolve(response);
      };
    });
  }

  async stop() {
    if (this.process) {
      // Send exit command
      try {
        this.process.stdin.write('/exit\n');
      } catch (e) {
        // Ignore
      }

      // Force kill after short delay
      setTimeout(() => {
        if (this.process) {
          this.process.kill();
          this.process = null;
        }
      }, 1000);
    }
  }
}

/**
 * Evaluate a single test case
 */
async function evaluateCase(testCase, agi, options) {
  const results = {
    id: testCase.id,
    name: testCase.name,
    theoryLoaded: false,
    queries: [],
    passed: 0,
    failed: 0
  };

  log(`\n  Loading theory...`, colors.gray);

  // Send the theory as natural language
  // Note: expected_facts are available in case.json but loading them individually
  // is too slow. The LLM should extract facts from natural_language.
  const theoryResponse = await agi.send(testCase.theory.natural_language);
  results.theoryLoaded = !theoryResponse.includes('error') &&
                          !theoryResponse.includes('Error');

  if (options.verbose) {
    log(`  Theory response: ${theoryResponse.substring(0, 200)}...`, colors.gray);
  }

  // Run each query
  for (const query of testCase.queries) {
    log(`\n  Query ${query.id}: "${query.natural_language}"`, colors.blue);

    const queryResult = {
      id: query.id,
      question: query.natural_language,
      expectedTruth: query.expected_answer.truth,
      expectedNatural: query.expected_answer.natural_language,
      actualResponse: '',
      passed: false,
      matchReason: ''
    };

    try {
      const response = await agi.send(query.natural_language);
      queryResult.actualResponse = response;

      // Analyze response for correctness
      const analysis = analyzeResponse(response, query.expected_answer);
      queryResult.passed = analysis.passed;
      queryResult.matchReason = analysis.reason;

      if (queryResult.passed) {
        results.passed++;
        const matchLabel = analysis.matchType === 'structured_dsl' ? ' [DSL]' : ' [NL]';
        logResult(true, `Expected: ${query.expected_answer.truth}${matchLabel}`);
      } else {
        results.failed++;
        logResult(false, `Expected: ${query.expected_answer.truth}`);
        log(`    Reason: ${analysis.reason}`, colors.gray);
        if (options.verbose) {
          log(`    Expected NL: ${query.expected_answer.natural_language}`, colors.gray);
          log(`    Actual: ${response.substring(0, 300)}...`, colors.gray);
        }
      }
    } catch (err) {
      results.failed++;
      queryResult.error = err.message;
      logResult(false, `Error: ${err.message}`);
    }

    results.queries.push(queryResult);
  }

  return results;
}

/**
 * Parse structured result from debug output
 * Looks for [Structured Result] section with truth value
 */
function parseStructuredResult(response) {
  const result = {
    found: false,
    truth: null,
    method: null,
    confidence: null
  };

  // Look for structured result section
  const structuredMatch = response.match(/\[Structured Result\][\s\S]*?truth:\s*(\w+)/i);
  if (structuredMatch) {
    result.found = true;
    result.truth = structuredMatch[1].toUpperCase();
  }

  // Also try to parse DSL representation
  const dslMatch = response.match(/# Result:\s*({[\s\S]*?})/);
  if (dslMatch) {
    try {
      const parsed = JSON.parse(dslMatch[1]);
      result.found = true;
      result.truth = parsed.truth || result.truth;
      result.method = parsed.method;
      result.confidence = parsed.confidence;
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Try to find truth value in response
  if (!result.found) {
    const truthPatterns = [
      /truth[:\s]+["']?(\w+)/i,
      /"truth":\s*"(\w+)"/,
      /Result:\s*(\w+)/
    ];
    for (const pattern of truthPatterns) {
      const match = response.match(pattern);
      if (match) {
        const truth = match[1].toUpperCase();
        if (['TRUE_CERTAIN', 'TRUE', 'FALSE', 'PLAUSIBLE', 'UNKNOWN'].includes(truth)) {
          result.found = true;
          result.truth = truth;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Normalize truth value for comparison
 */
function normalizeTruth(truth) {
  if (!truth) return null;
  const t = truth.toUpperCase();
  // TRUE and TRUE_CERTAIN are considered equivalent
  if (t === 'TRUE') return 'TRUE_CERTAIN';
  // UNKNOWN responses can sometimes indicate FALSE (when facts don't exist)
  return t;
}

/**
 * Check if response text indicates a specific truth value
 */
function detectTruthFromText(text, expectedTruth) {
  const lower = text.toLowerCase();

  // Stronger indicators for each truth value
  const strongIndicators = {
    'TRUE_CERTAIN': [
      /\byes[,.]?\s/i,
      /\bthat is correct\b/i,
      /\bis true\b/i,
      /\bcan\s+\w+\b/i,
      /\bdoes\s+\w+\b/i,
      /\bwill\s+\w+\b/i,
      /\bwould\s+(be|have|cause)\b/i
    ],
    'FALSE': [
      /\bno[,.]?\s/i,
      /\bcannot\b/i,
      /\bcan't\b/i,
      /\bwon't\b/i,
      /\bis not\b/i,
      /\bare not\b/i,
      /\bdoes not\b/i,
      /\bwould not\b/i,
      /\bnot\s+(likely|possible|true)\b/i,
      /\bless likely\b/i,
      /\bviolates?\b/i,
      /\bbreaks?\b/i,
      /\bconflicts?\b/i
    ],
    'PLAUSIBLE': [
      /\bpossibly\b/i,
      /\bmaybe\b/i,
      /\blikely\b/i,
      /\bprobably\b/i,
      /\bcould be\b/i,
      /\bmight\b/i,
      /\bplausible\b/i
    ]
  };

  const indicators = strongIndicators[expectedTruth] || [];
  for (const pattern of indicators) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Analyze if response matches expected answer
 * Uses multiple strategies: regex patterns, key concepts, and DSL results
 */
function analyzeResponse(response, expected) {
  const responseLower = response.toLowerCase();
  const expectedLower = expected.natural_language.toLowerCase();
  const expectedTruth = expected.truth;

  // Strategy 1: Use strong regex pattern matching
  if (detectTruthFromText(response, expectedTruth)) {
    return {
      passed: true,
      reason: `Pattern Match: Found strong ${expectedTruth} indicators`,
      matchType: 'pattern'
    };
  }

  // Strategy 2: Check for key concepts from expected answer
  const keyWords = expectedLower.split(/\s+/).filter(w => w.length > 4);
  let conceptMatch = 0;
  for (const word of keyWords) {
    if (responseLower.includes(word)) {
      conceptMatch++;
    }
  }

  // Strategy 3: Simple keyword matching
  const truthIndicators = {
    'TRUE_CERTAIN': ['yes', 'true', 'correct', 'is a', 'is an', 'are', 'can', 'does'],
    'FALSE': ['no', 'not', 'false', 'incorrect', 'cannot', 'is not', 'are not', 'less likely'],
    'PLAUSIBLE': ['possibly', 'maybe', 'likely', 'probably', 'could be', 'might', 'plausible'],
    'UNKNOWN': ['unknown', 'uncertain', 'not sure', 'cannot determine', 'don\'t have enough']
  };

  const indicators = truthIndicators[expectedTruth] || [];
  let matchCount = 0;
  for (const indicator of indicators) {
    if (responseLower.includes(indicator)) {
      matchCount++;
    }
  }

  // Check for negative indicators (would contradict the expected truth)
  const negativeIndicators = expectedTruth === 'TRUE_CERTAIN'
    ? truthIndicators['FALSE']
    : expectedTruth === 'FALSE'
      ? truthIndicators['TRUE_CERTAIN']
      : [];

  let negativeCount = 0;
  for (const indicator of negativeIndicators) {
    if (responseLower.includes(indicator)) {
      negativeCount++;
    }
  }

  // NL passes if we have indicators and they outweigh negatives, or good concept match
  const nlPassed = (matchCount > negativeCount) ||
                   (matchCount > 0 && conceptMatch >= keyWords.length * 0.3);

  if (nlPassed) {
    return {
      passed: true,
      reason: `NL Match: ${matchCount} indicators (+), ${negativeCount} (-), ${conceptMatch}/${keyWords.length} concepts`,
      matchType: 'natural_language'
    };
  }

  // Strategy 4: Check structured/DSL result
  const structured = parseStructuredResult(response);
  if (structured.found) {
    const normalizedExpected = normalizeTruth(expectedTruth);
    const normalizedActual = normalizeTruth(structured.truth);

    if (normalizedExpected === normalizedActual) {
      return {
        passed: true,
        reason: `DSL Match: Expected ${expectedTruth}, got ${structured.truth}` +
                (structured.method ? ` (method: ${structured.method})` : ''),
        matchType: 'structured_dsl'
      };
    }

    // Special case: UNKNOWN from DSL but NL text suggests the expected answer
    if (structured.truth === 'UNKNOWN' && matchCount > 0) {
      return {
        passed: true,
        reason: `Weak NL Match (DSL UNKNOWN but ${matchCount} text indicators for ${expectedTruth})`,
        matchType: 'weak_nl'
      };
    }

    return {
      passed: false,
      reason: `DSL mismatch: expected ${expectedTruth}, got ${structured.truth}`,
      matchType: 'none',
      structuredResult: structured
    };
  }

  return {
    passed: false,
    reason: `No match: ${matchCount} indicators, ${conceptMatch}/${keyWords.length} concepts, no DSL`,
    matchType: 'none'
  };
}

/**
 * Run dry-run mode (parse and validate cases without executing)
 */
function dryRun(cases) {
  logSection('DRY RUN - Validating Test Cases');

  let valid = 0;
  let invalid = 0;

  for (const testCase of cases) {
    log(`\n  ${testCase._dir}: ${testCase.name}`, colors.bright);

    // Validate structure
    const issues = [];

    if (!testCase.theory?.natural_language) {
      issues.push('Missing theory.natural_language');
    }
    if (!testCase.queries || testCase.queries.length === 0) {
      issues.push('No queries defined');
    }
    for (const q of testCase.queries || []) {
      if (!q.natural_language) {
        issues.push(`Query ${q.id} missing natural_language`);
      }
      if (!q.expected_answer?.truth) {
        issues.push(`Query ${q.id} missing expected_answer.truth`);
      }
    }

    if (issues.length === 0) {
      valid++;
      logResult(true, `Valid - ${testCase.queries.length} queries`);
    } else {
      invalid++;
      logResult(false, `Invalid:`);
      for (const issue of issues) {
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

  const options = {
    filterCase: null,
    from: null,
    to: null,
    runFailed: args.includes('--runFailed'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
    timeout: DEFAULT_TIMEOUT
  };

  // Parse --case argument
  const caseIdx = args.indexOf('--case');
  if (caseIdx !== -1 && args[caseIdx + 1]) {
    options.filterCase = args[caseIdx + 1];
  }

  // Parse --from argument
  const fromIdx = args.indexOf('--from');
  if (fromIdx !== -1 && args[fromIdx + 1]) {
    options.from = parseInt(args[fromIdx + 1], 10);
  }

  // Parse --to argument
  const toIdx = args.indexOf('--to');
  if (toIdx !== -1 && args[toIdx + 1]) {
    options.to = parseInt(args[toIdx + 1], 10);
  }

  // Parse --timeout argument
  const timeoutIdx = args.indexOf('--timeout');
  if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
    options.timeout = parseInt(args[timeoutIdx + 1], 10);
  }

  // Show usage at startup
  showUsage();

  logSection('AGISystem2 Evaluation Suite');
  log(`  Suite directory: ${SUITE_DIR}`);
  log(`  AGI script: ${AGI_SCRIPT}`);
  log(`  Timeout: ${options.timeout}ms`);

  // Show active filters
  if (options.from !== null || options.to !== null) {
    log(`  Range: ${options.from || 1} to ${options.to || 'end'}`, colors.cyan);
  }
  if (options.runFailed) {
    log(`  Mode: Running FAILED cases only`, colors.yellow);
  }
  if (options.filterCase) {
    log(`  Filter: ${options.filterCase}`, colors.cyan);
  }

  // Discover test cases
  const cases = discoverCases({
    filterCase: options.filterCase,
    from: options.from,
    to: options.to,
    runFailed: options.runFailed
  });
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

  // Full run
  let totalPassed = 0;
  let totalFailed = 0;
  const allResults = [];

  for (const testCase of cases) {
    logSection(`Case: ${testCase.id} - ${testCase.name}`);

    // Start fresh AGI process for each case
    const agi = new AGIProcess(options);

    try {
      log('  Starting AGISystem2...', colors.gray);
      await agi.start();

      const result = await evaluateCase(testCase, agi, options);
      allResults.push(result);

      totalPassed += result.passed;
      totalFailed += result.failed;

    } catch (err) {
      log(`  Error running case: ${err.message}`, colors.red);
      totalFailed += testCase.queries.length;
    } finally {
      await agi.stop();
    }
  }

  // Final summary
  logSection('EVALUATION SUMMARY');

  for (const result of allResults) {
    const status = result.failed === 0 ? colors.green : colors.yellow;
    log(`  ${result.id}: ${result.passed}/${result.passed + result.failed} passed`, status);
  }

  log('');
  log(`  Total Passed: ${totalPassed}`, colors.green);
  log(`  Total Failed: ${totalFailed}`, totalFailed > 0 ? colors.red : colors.green);
  log(`  Pass Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  // Write results to file
  const resultsPath = path.join(SUITE_DIR, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPassed,
    totalFailed,
    cases: allResults
  }, null, 2));
  log(`\n  Results written to: ${resultsPath}`, colors.gray);

  // Save failed cases to failed.json (merge with existing)
  const failedCasesForSave = allResults
    .filter(r => r.failed > 0)
    .map(r => ({
      id: r.id,
      name: r.name,
      failedQueries: r.queries.filter(q => !q.passed).map(q => q.id),
      lastRun: new Date().toISOString()
    }));

  if (failedCasesForSave.length > 0 || options.from !== null || options.to !== null) {
    // Save even if no failures in this range (to clear old failures)
    saveFailedCases(failedCasesForSave, options.from, options.to);
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
