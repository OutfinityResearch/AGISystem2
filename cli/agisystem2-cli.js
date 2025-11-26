#!/usr/bin/env node
/**
 * DS(/cli/agisystem2-cli.js) - AGISystem2 CLI Entry Point
 *
 * Interactive and batch command-line interface for theory exploration and testing.
 *
 * Architecture:
 * - cli_help.js: Help documentation
 * - cli_commands.js: Command execution logic
 * - cli_interactive.js: Interactive REPL handler
 *
 * Usage:
 *   Interactive:  node cli/agisystem2-cli.js
 *   Batch:        node cli/agisystem2-cli.js --batch <commands.txt> [--output <results.json>]
 *   Single:       node cli/agisystem2-cli.js --exec "add Dog IS_A Animal"
 *   Help:         node cli/agisystem2-cli.js --help
 *
 * @module cli/agisystem2-cli
 */

const fs = require('fs');
const path = require('path');
const AgentSystem2 = require('../src/interface/agent_system2');
const { createColorScheme, printBatchHelp } = require('./cli_help');
const { executeCommand, initSampleTheories } = require('./cli_commands');
const { runInteractive } = require('./cli_interactive');

// Parse command line arguments
const argv = process.argv.slice(2);
const options = {
  batch: null,
  output: null,
  exec: null,
  noColor: false,
  json: false,
  help: false
};

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--batch' && argv[i + 1]) {
    options.batch = argv[++i];
  } else if (argv[i] === '--output' && argv[i + 1]) {
    options.output = argv[++i];
  } else if (argv[i] === '--exec' && argv[i + 1]) {
    options.exec = argv[++i];
  } else if (argv[i] === '--no-color') {
    options.noColor = true;
  } else if (argv[i] === '--json') {
    options.json = true;
  } else if (argv[i] === '--help' || argv[i] === '-h') {
    options.help = true;
  }
}

const color = createColorScheme(options);

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Initialize the engine and session
 */
function initEngine() {
  const cwd = process.cwd();
  const root = path.join(cwd, '.AGISystem2');
  const dataRoot = path.join(root, 'data');
  const theoriesRoot = path.join(root, 'theories');

  const isFirstRun = !fs.existsSync(root);

  ensureDir(dataRoot);
  ensureDir(theoriesRoot);

  if (isFirstRun) {
    initSampleTheories(theoriesRoot);
    if (!options.json && !options.batch) {
      console.log(`${color.dim}First run: created .AGISystem2/ environment with sample theories${color.reset}\n`);
    }
  }

  const agent = new AgentSystem2({
    profile: 'manual_test',
    overrides: { storageRoot: dataRoot }
  });
  const session = agent.createSession();

  return { agent, session, root, theoriesRoot, isFirstRun };
}

/**
 * Run commands from a file in batch mode
 */
async function runBatch(batchFile, outputFile, jsonOutput) {
  const { session, theoriesRoot } = initEngine();

  if (!fs.existsSync(batchFile)) {
    console.error(`Error: Batch file not found: ${batchFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(batchFile, 'utf8');
  const lines = content.split('\n');

  const results = {
    batchFile,
    timestamp: new Date().toISOString(),
    commands: [],
    summary: { total: 0, executed: 0, skipped: 0, errors: 0 }
  };

  for (const line of lines) {
    results.summary.total++;
    const cmdResult = executeCommand(line, session, theoriesRoot);

    if (cmdResult.skipped) {
      results.summary.skipped++;
    } else if (cmdResult.error) {
      results.summary.errors++;
      results.commands.push(cmdResult);
    } else {
      results.summary.executed++;
      results.commands.push(cmdResult);
    }
  }

  // Output results
  if (jsonOutput || outputFile) {
    const output = JSON.stringify(results, null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, output, 'utf8');
      console.log(`Results written to: ${outputFile}`);
    } else {
      console.log(output);
    }
  } else {
    console.log(`\n${color.heading}Batch Execution Results${color.reset}`);
    console.log(`File: ${batchFile}`);
    console.log(`Total: ${results.summary.total}, Executed: ${results.summary.executed}, Skipped: ${results.summary.skipped}, Errors: ${results.summary.errors}\n`);

    for (const cmd of results.commands) {
      if (cmd.error) {
        console.log(`${color.error}ERROR${color.reset} ${cmd.command} ${cmd.args}`);
        console.log(`  ${color.dim}${cmd.error}${color.reset}`);
      } else {
        console.log(`${color.label}OK${color.reset} ${cmd.command} ${cmd.args}`);
        if (cmd.result && typeof cmd.result === 'object') {
          const preview = JSON.stringify(cmd.result).substring(0, 80);
          console.log(`  ${color.dim}${preview}${preview.length >= 80 ? '...' : ''}${color.reset}`);
        }
      }
    }
  }

  process.exit(results.summary.errors > 0 ? 1 : 0);
}

/**
 * Execute a single command from --exec argument
 */
async function runSingleCommand(command, jsonOutput) {
  const { session, theoriesRoot } = initEngine();

  const result = executeCommand(command, session, theoriesRoot);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.error) {
      console.log(`${color.error}ERROR${color.reset}: ${result.error}`);
      process.exit(1);
    } else {
      console.log(`${color.label}Result${color.reset}:`);
      console.log(JSON.stringify(result.result, null, 2));
    }
  }

  process.exit(result.error ? 1 : 0);
}

/**
 * Main entry point
 */
async function main() {
  if (options.help) {
    printBatchHelp(color);
    process.exit(0);
  }

  if (options.batch) {
    await runBatch(options.batch, options.output, options.json);
    return;
  }

  if (options.exec) {
    await runSingleCommand(options.exec, options.json);
    return;
  }

  // Interactive mode
  const { session, theoriesRoot } = initEngine();
  runInteractive(session, theoriesRoot, color);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
