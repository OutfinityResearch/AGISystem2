# Design Spec: cli/agisystem2-cli.js

ID: DS(/cli/agisystem2-cli.js)

Status: IMPLEMENTED v1.0

## 1. Purpose

Main entry point for the AGISystem2 command-line interface. Provides interactive REPL mode, batch execution mode, and single-command execution for theory exploration and testing.

**File**: `cli/agisystem2-cli.js`
**Module Type**: CommonJS (executable)
**Shebang**: `#!/usr/bin/env node`

---

## 2. Command Line Interface

### Usage Modes

```bash
# Interactive REPL
node cli/agisystem2-cli.js

# Single command execution
node cli/agisystem2-cli.js --exec "add Dog IS_A Animal"

# Batch mode (execute commands from file)
node cli/agisystem2-cli.js --batch commands.txt [--output results.json]

# Help
node cli/agisystem2-cli.js --help
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `--batch <file>` | Execute commands from file (one per line) |
| `--output <file>` | Write results to file (implies JSON format) |
| `--exec "cmd"` | Execute a single command |
| `--json` | Output results in JSON format |
| `--no-color` | Disable colored output |
| `--help`, `-h` | Show help |

---

## 3. Architecture

```
cli/
├── agisystem2-cli.js    ← Entry point (this file)
├── cli_commands.js      ← Command execution logic
├── cli_interactive.js   ← Interactive REPL handler
└── cli_help.js          ← Help documentation
```

### Module Dependencies

```javascript
const AgentSystem2 = require('../src/interface/agent_system2');
const { createColorScheme, printBatchHelp } = require('./cli_help');
const { executeCommand, initSampleTheories } = require('./cli_commands');
const { runInteractive } = require('./cli_interactive');
```

---

## 4. Core Functions

### initEngine()
```javascript
function initEngine(): { agent, session, root, theoriesRoot, isFirstRun }
```
Initializes the AGISystem2 engine and creates a session.

**Behavior:**
1. Creates `.AGISystem2/` directory structure in current working directory
2. On first run, copies sample theories to `theories/` subdirectory
3. Creates `AgentSystem2` with `manual_test` profile
4. Returns agent, session, and path information

### runBatch(batchFile, outputFile, jsonOutput)
```javascript
async function runBatch(batchFile: string, outputFile?: string, jsonOutput?: boolean): Promise<void>
```
Executes commands from a file in batch mode.

**Batch File Format:**
```
# Comments start with # or //
add Dog IS_A Animal
add Cat IS_A Animal
ask Is Dog an Animal?
prove Cat IS_A Animal
```

**Output:**
- JSON results with summary (total, executed, skipped, errors)
- Exit code 1 if any errors occurred

### runSingleCommand(command, jsonOutput)
```javascript
async function runSingleCommand(command: string, jsonOutput?: boolean): Promise<void>
```
Executes a single command from `--exec` argument.

---

## 5. Directory Structure

On first run, creates:
```
.AGISystem2/
├── data/           # Storage for concepts and facts
└── theories/       # User and sample theory files
    ├── health_compliance.sys2dsl
    ├── law_minimal.sys2dsl
    └── scifi_magic.sys2dsl
```

---

## 6. Usage Examples

### Interactive Mode
```bash
$ node cli/agisystem2-cli.js
AGISystem2 Raw CLI
AGIS2> add Dog IS_A Animal
OK (fact ingested via Sys2DSL)
AGIS2> ask Is Dog an Animal?
Result: TRUE_CERTAIN  Band: certain
AGIS2> exit
```

### Batch Mode
```bash
$ node cli/agisystem2-cli.js --batch tests/facts.txt --output results.json
Results written to: results.json
```

### Single Command with JSON
```bash
$ node cli/agisystem2-cli.js --exec "ask Is Dog an Animal?" --json
{
  "command": "ask",
  "args": "Is Dog an Animal?",
  "result": { "truth": "TRUE_CERTAIN", "band": "certain" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 7. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (command failed or batch had errors) |

---

## 8. Related Documents

- DS(/cli/cli_commands.js) - Command execution logic
- DS(/cli/cli_interactive.js) - Interactive REPL
- DS(/cli/cli_help.js) - Help system
- DS(/interface/agent_system2.js) - Engine entry point
- DS(/interface/system2_session.js) - Session API
