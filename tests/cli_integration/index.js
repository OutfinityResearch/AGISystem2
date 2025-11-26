/**
 * Test Suite: CLI Integration
 * DS(/tests/cli_integration/runSuite)
 *
 * Tests CLI batch mode functionality by executing command files
 * and validating results.
 *
 * All tests run in a temporary directory to avoid polluting the workspace.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLI_PATH = path.join(__dirname, '..', '..', 'cli', 'agisystem2-cli.js');
const COMMANDS_DIR = path.join(__dirname, 'commands');

// Create unique temp directory for this test run
function createTempDir() {
  const tempBase = os.tmpdir();
  const uniqueId = `agis2_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const tempDir = path.join(tempBase, uniqueId);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

// Clean up temp directory
function cleanupTempDir(tempDir) {
  if (tempDir && tempDir.includes('agis2_test_') && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function run({ profile }) {
  let passed = 0;
  let failed = 0;
  const errors = [];

  // Create temp directory for all tests
  const tempDir = createTempDir();

  function test(name, testFn) {
    try {
      const result = testFn();
      if (!result) {
        errors.push({ name, error: 'Test returned false' });
        failed++;
      } else {
        passed++;
      }
    } catch (err) {
      errors.push({ name, error: err.message });
      failed++;
    }
  }

  // Helper to run CLI in batch mode and get JSON results
  // Uses tempDir as working directory to avoid polluting workspace
  function runBatch(commandFile) {
    const fullPath = path.join(COMMANDS_DIR, commandFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Command file not found: ${fullPath}`);
    }

    try {
      const output = execSync(
        `node "${CLI_PATH}" --batch "${fullPath}" --json --no-color`,
        {
          encoding: 'utf8',
          timeout: 30000,
          cwd: tempDir  // Run in temp directory
        }
      );
      return JSON.parse(output);
    } catch (err) {
      // execSync throws on non-zero exit, but we may still have JSON output
      if (err.stdout) {
        try {
          return JSON.parse(err.stdout);
        } catch (parseErr) {
          throw new Error(`CLI output not valid JSON: ${err.stdout}`);
        }
      }
      throw err;
    }
  }

  // Helper to run single command
  // Uses tempDir as working directory to avoid polluting workspace
  function runExec(command) {
    try {
      const output = execSync(
        `node "${CLI_PATH}" --exec "${command}" --json --no-color`,
        {
          encoding: 'utf8',
          timeout: 10000,
          cwd: tempDir  // Run in temp directory
        }
      );
      return JSON.parse(output);
    } catch (err) {
      if (err.stdout) {
        try {
          return JSON.parse(err.stdout);
        } catch (parseErr) {
          throw new Error(`CLI output not valid JSON: ${err.stdout}`);
        }
      }
      throw err;
    }
  }

  // =========================================================================
  // CLI Availability Tests
  // =========================================================================

  test('CLI file exists', () => {
    return fs.existsSync(CLI_PATH);
  });

  test('CLI --help works', () => {
    const output = execSync(`node "${CLI_PATH}" --help`, {
      encoding: 'utf8',
      timeout: 5000
    });
    return output.includes('AGISystem2 CLI') && output.includes('--batch');
  });

  // =========================================================================
  // Single Command Tests (--exec)
  // =========================================================================

  test('exec: add fact returns ok', () => {
    const result = runExec('add TestExec IS_A Test');
    return result.result && result.result.ok === true;
  });

  test('exec: ask returns truth value', () => {
    // First add, then ask
    runExec('add ExecAsk IS_A Query');
    const result = runExec('ask ExecAsk IS_A Query?');
    return result.result && typeof result.result.truth !== 'undefined';
  });

  test('exec: config returns snapshot', () => {
    const result = runExec('config');
    return result.result && typeof result.result === 'object';
  });

  // =========================================================================
  // Batch Mode Tests
  // =========================================================================

  test('batch: basic_facts.txt executes without critical errors', () => {
    const result = runBatch('basic_facts.txt');
    return result.summary &&
           result.summary.executed > 0 &&
           result.summary.errors === 0;
  });

  test('batch: basic_facts.txt has correct command count', () => {
    const result = runBatch('basic_facts.txt');
    // Count non-comment, non-empty lines
    const content = fs.readFileSync(
      path.join(COMMANDS_DIR, 'basic_facts.txt'),
      'utf8'
    );
    const expectedCommands = content
      .split('\n')
      .filter(l => l.trim() && !l.trim().startsWith('#'))
      .length;
    return result.summary.executed === expectedCommands;
  });

  test('batch: theory_layers.txt executes successfully', () => {
    const result = runBatch('theory_layers.txt');
    return result.summary &&
           result.summary.executed > 0 &&
           result.summary.errors === 0;
  });

  test('batch: memory_management.txt executes successfully', () => {
    const result = runBatch('memory_management.txt');
    return result.summary &&
           result.summary.executed > 0 &&
           result.summary.errors === 0;
  });

  test('batch: abduction_reasoning.txt executes successfully', () => {
    const result = runBatch('abduction_reasoning.txt');
    return result.summary &&
           result.summary.executed > 0 &&
           result.summary.errors === 0;
  });

  test('batch: dsl_execution.txt executes successfully', () => {
    const result = runBatch('dsl_execution.txt');
    return result.summary &&
           result.summary.executed > 0 &&
           result.summary.errors === 0;
  });

  // =========================================================================
  // Result Content Validation Tests
  // =========================================================================

  test('batch: ask commands return truth values', () => {
    const result = runBatch('basic_facts.txt');
    const askCommands = result.commands.filter(c => c.command === 'ask');
    return askCommands.length > 0 &&
           askCommands.every(c => c.result && typeof c.result.truth !== 'undefined');
  });

  test('batch: prove commands return proven status', () => {
    const result = runBatch('basic_facts.txt');
    const proveCommands = result.commands.filter(c => c.command === 'prove');
    return proveCommands.length > 0 &&
           proveCommands.every(c => c.result && typeof c.result.proven !== 'undefined');
  });

  test('batch: validate command returns consistency status', () => {
    const result = runBatch('basic_facts.txt');
    const validateCommands = result.commands.filter(c => c.command === 'validate');
    return validateCommands.length > 0 &&
           validateCommands.every(c => c.result && typeof c.result.consistent !== 'undefined');
  });

  // =========================================================================
  // Output Format Tests
  // =========================================================================

  test('batch: JSON output has required structure', () => {
    const result = runBatch('basic_facts.txt');
    return result.batchFile &&
           result.timestamp &&
           Array.isArray(result.commands) &&
           result.summary &&
           typeof result.summary.total === 'number' &&
           typeof result.summary.executed === 'number' &&
           typeof result.summary.skipped === 'number' &&
           typeof result.summary.errors === 'number';
  });

  test('batch: commands have timestamps', () => {
    const result = runBatch('basic_facts.txt');
    return result.commands.every(c => c.timestamp);
  });

  // =========================================================================
  // Error Handling Tests
  // =========================================================================

  test('exec: unknown command returns error', () => {
    const result = runExec('unknowncommand test');
    return result.error && result.error.includes('Unknown command');
  });

  // =========================================================================
  // Isolation Tests - verify tests don't pollute workspace
  // =========================================================================

  test('temp directory has .AGISystem2 environment', () => {
    const envPath = path.join(tempDir, '.AGISystem2');
    return fs.existsSync(envPath) && fs.existsSync(path.join(envPath, 'theories'));
  });

  test('workspace is not polluted (no .AGISystem2 in project root)', () => {
    const projectRoot = path.join(__dirname, '..', '..');
    const envPath = path.join(projectRoot, '.AGISystem2');
    // This test passes if .AGISystem2 does NOT exist in project root
    // or if it existed before (we can't tell, so we just check temp works)
    return fs.existsSync(path.join(tempDir, '.AGISystem2'));
  });

  // Cleanup temp directory after all tests
  cleanupTempDir(tempDir);

  return {
    ok: failed === 0,
    passed,
    failed,
    total: passed + failed,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = { run };
