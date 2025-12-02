# CLI Specification

ID: DS(/interface/cli)

Status: DRAFT

## Purpose

Interactive command-line interface for manual exploration, testing, and theory development. The CLI provides a REPL (Read-Eval-Print Loop) environment for direct interaction with the AGISystem2 reasoning engine.

## User Requirements (URS)

### URS-CLI-001: Interactive Exploration
Users need an interactive environment to explore the reasoning engine's capabilities without writing code.

### URS-CLI-002: Theory Development
Users need to create, load, save, and test theories interactively.

### URS-CLI-003: Manual Testing
Users need to manually test queries, assertions, and reasoning operations with immediate feedback.

### URS-CLI-004: Knowledge Inspection
Users need to inspect the current state of knowledge (concepts, facts, usage statistics).

### URS-CLI-005: Session Management
Users need to manage theory layers for what-if exploration and rollback.

### URS-CLI-006: Batch/Non-Interactive Mode
Users need to execute CLI commands from files or command line for automated testing and scripting.

### URS-CLI-007: Structured Output
Users need JSON-formatted output for programmatic consumption and test validation.

### URS-CLI-008: Portable Execution
CLI must work from any directory without requiring AGISystem2 source files in the current working directory.

### URS-CLI-009: Auto-Initialization
CLI must automatically create the `.AGISystem2/` environment structure and install sample theories on first run.

## Functional Specifications (FS)

### FS-CLI-001: Core REPL Commands
The CLI shall provide basic REPL commands:
- `help [topic]` - Display help information
- `exit` / `quit` - End session
- `config` - Show current configuration

### FS-CLI-002: Fact and Query Commands
The CLI shall support direct fact/query operations:
- `add <fact>` - Assert a fact (Subject REL Object)
- `ask <question>` - Query the knowledge base
- `retract <fact>` - Remove a fact
- `abduct <observation> [REL]` - Abductive reasoning
- `cf <question> | <facts>` - Counterfactual query

### FS-CLI-003: Reasoning Commands
The CLI shall support advanced reasoning:
- `prove <statement>` - Attempt to prove a statement
- `validate` - Check theory consistency
- `hypothesize <subject> [relation]` - Generate hypotheses

### FS-CLI-004: Theory Management Commands
The CLI shall support theory file operations:
- `list-theories` - List available theory files
- `new-theory <name>` - Create empty theory file
- `show-theory <name>` - Display theory contents
- `load-theory <name>` - Load theory into session
- `save-theory <name>` - Save current state to theory file
- `init-samples` - Install sample theories

### FS-CLI-005: Theory Layer Commands
The CLI shall support theory layering for what-if:
- `push [name]` - Push new theory layer
- `pop` - Pop and discard top layer
- `layers` - Show current layer stack

### FS-CLI-006: Knowledge Inspection Commands
The CLI shall support knowledge inspection:
- `facts [pattern]` - List facts (optionally filtered)
- `concepts [pattern]` - List concepts
- `usage <concept>` - Show usage statistics for concept
- `inspect <concept>` - Detailed concept information

### FS-CLI-007: Memory Management Commands
The CLI shall support memory management:
- `protect <concept>` - Protect concept from forgetting
- `unprotect <concept>` - Remove protection
- `forget <criteria>` - Forget concepts by criteria
- `boost <concept> [amount]` - Boost usage priority

### FS-CLI-008: DSL Script Execution
The CLI shall support direct DSL execution:
- `run <dsl-statement>` - Execute single DSL statement
- `script <file>` - Execute DSL script file

### FS-CLI-009: Domain Helpers
The CLI shall provide domain-specific shortcuts:
- `check-procedure <id> [| facts]` - Health compliance check
- `check-export <action> <regs> [| facts]` - Export regulation check
- `check-magic <actor> <city> [| facts]` - Narrative magic check

### FS-CLI-010: Batch Mode Execution
The CLI shall support non-interactive batch execution:
- `--batch <file>` - Execute commands from file (one per line)
- `--exec "command"` - Execute single command from argument
- `--output <file>` - Write results to file
- `--json` - Output in JSON format for programmatic use
- `--no-color` - Disable ANSI color codes
- `--help` - Show batch mode help

### FS-CLI-011: Batch Output Format
Batch mode shall produce structured JSON output:
```json
{
  "batchFile": "path/to/commands.txt",
  "timestamp": "ISO-8601",
  "commands": [
    {
      "command": "add",
      "args": "Dog IS_A Animal",
      "timestamp": "ISO-8601",
      "result": { "ok": true, "action": "asserted", "fact": "..." }
    }
  ],
  "summary": {
    "total": 10,
    "executed": 8,
    "skipped": 2,
    "errors": 0
  }
}
```

### FS-CLI-012: Batch File Format
Command files shall support:
- One command per line
- Comments starting with `#` or `//`
- Empty lines (ignored)
- Same command syntax as interactive mode

### FS-CLI-013: Portable File Resolution
The CLI shall:
- Use `__dirname` (package location) for init data files (relations.json, config_profile.json)
- Use `process.cwd()` (current directory) for user environment (.AGISystem2/)
- Never require data files to exist in current working directory

### FS-CLI-014: First-Run Auto-Setup
On first execution in a new directory, the CLI shall:
- Create `.AGISystem2/data/` for persistent storage
- Create `.AGISystem2/theories/` for theory files
- Install sample theories (health_compliance, law_minimal, scifi_magic)
- Display initialization message (unless in JSON/batch mode)

## Implementation

### File Location
`cli/agisystem2-cli.js`

### Dependencies
- `src/interface/agent_system2.js` - Main engine interface
- `src/interface/system2_session.js` - Session management

### Data Storage
- `.AGISystem2/data/` - Persistent storage
- `.AGISystem2/theories/` - Theory files

### Command Structure

```javascript
// Each command follows pattern:
case 'command-name': {
  // Parse arguments
  // Execute via session.run() with DSL
  // Format and display results
  break;
}
```

### Session Integration

All commands that modify or query knowledge must go through the session's DSL engine:

```javascript
// Correct: Use DSL commands
session.run(['@result PROVE Subject REL Object']);

// Incorrect: Direct API calls bypass audit/tracing
api.prove(...);
```

## Command Reference

| Command | DSL Equivalent (v3 Triple Syntax) | Description |
|---------|-----------------------------------|-------------|
| `add X R Y` | `@_ X R Y` | Add fact |
| `ask Q` | `@q Subject VERB Object` | Query (NL→triple) |
| `retract X R Y` | `@_ X RETRACT Y` | Remove fact |
| `prove X R Y` | `@r X R Y` | Prove statement |
| `validate` | `@r any VALIDATE any` | Check consistency |
| `push name` | `@_ name PUSH any` | Push layer |
| `pop` | `@_ any POP any` | Pop layer |
| `layers` | `@r any THEORIES any` | Show layers |
| `usage C` | `@r C USAGE any` | Usage stats |
| `protect C` | `@_ C PROTECT any` | Protect concept |
| `forget ...` | `@r Criteria FORGET any` | Forget concepts |
| `boost C N` | `@_ C BOOST N` | Boost usage |

## Error Handling

- Parse errors: Show usage hint for command
- DSL errors: Display error message from engine
- File errors: Show path and reason

## Output Formatting

- Success: Green label + result
- Error: Red label + message
- Info: Blue/cyan for sections
- Dim: Gray for hints

## Requirements Trace

- URS-001: Neuro-symbolic assistant (CLI is primary interaction mode)
- URS-006: What-if exploration (theory layers via push/pop)
- URS-007: Interactive latency (CLI responsiveness)
- FS-02: Theory layering (push/pop commands)
- FS-05: Reasoning engine (prove, validate, hypothesize)
- FS-14: Sys2DSL (all commands via DSL)

## Test Coverage

Suite: `cli_integration`
Location: `tests/cli_integration/`

### Test Files
- `commands/basic_facts.txt` - Basic fact operations (add, ask, prove, retract)
- `commands/theory_layers.txt` - Theory layer operations (push, pop, layers)
- `commands/memory_management.txt` - Memory commands (usage, protect, boost, forget)
- `commands/abduction_reasoning.txt` - Abductive and counterfactual reasoning
- `commands/dsl_execution.txt` - Direct DSL execution

### Test Cases (19 total)
1. CLI file exists
2. CLI --help works
3. exec: add fact returns ok
4. exec: ask returns truth value
5. exec: config returns snapshot
6. batch: basic_facts.txt executes without errors
7. batch: basic_facts.txt has correct command count
8. batch: theory_layers.txt executes successfully
9. batch: memory_management.txt executes successfully
10. batch: abduction_reasoning.txt executes successfully
11. batch: dsl_execution.txt executes successfully
12. batch: ask commands return truth values
13. batch: prove commands return proven status
14. batch: validate command returns consistency status
15. batch: JSON output has required structure
16. batch: commands have timestamps
17. exec: unknown command returns error
18. temp directory has .AGISystem2 environment
19. workspace is not polluted (tests run in temp directory)
