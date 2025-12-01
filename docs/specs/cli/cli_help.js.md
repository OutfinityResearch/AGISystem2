# Design Spec: cli/cli_help.js

ID: DS(/cli/cli_help.js)

Status: IMPLEMENTED v1.0

## 1. Purpose

Help documentation system for the AGISystem2 CLI. Provides colorized help text, command references, syntax documentation, and usage examples.

**File**: `cli/cli_help.js`
**Module Type**: CommonJS
**Exports**: `createColorScheme`, `printMainHelp`, `printCommandsHelp`, `printSyntaxHelp`, `printExamplesHelp`, `printBatchHelp`

---

## 2. Color Scheme

### createColorScheme(options)
```javascript
function createColorScheme(options: { noColor?: boolean, json?: boolean }): ColorScheme
```

Creates a color scheme object based on CLI options.

**Parameters:**
- `options.noColor` - Disable colors
- `options.json` - JSON output mode (implies no color)

**Returns:**
```javascript
// With colors
{
  heading: '\x1b[1;36m',   // Cyan bold
  section: '\x1b[1;34m',   // Blue bold
  command: '\x1b[1;32m',   // Green bold
  label: '\x1b[1;33m',     // Yellow bold
  example: '\x1b[0;36m',   // Cyan
  error: '\x1b[1;31m',     // Red bold
  dim: '\x1b[2m',          // Gray
  reset: '\x1b[0m'         // Reset
}

// Without colors (noColor or json mode)
{
  heading: '', section: '', command: '', label: '',
  example: '', error: '', dim: '', reset: ''
}
```

---

## 3. Help Functions

### printMainHelp(color)
```javascript
function printMainHelp(color: ColorScheme): void
```

Displays main help overview with all command categories:
- Core commands (help)
- Fact and query commands (add, ask, retract, abduct, cf)
- Reasoning commands (prove, validate, hypothesize)
- Theory layers (push, pop, layers)
- Knowledge inspection (facts, concepts, usage, inspect)
- Memory management (protect, unprotect, forget, boost)
- Domain helpers (check-procedure, check-export, check-magic)
- Theory files (new-theory, list-theories, show-theory, load-theory)
- Introspection (config, run, debug, exit)

### printCommandsHelp(color)
```javascript
function printCommandsHelp(color: ColorScheme): void
```

Displays detailed command reference with:
- Full syntax for each command
- Descriptions of what each command does
- Usage examples with expected results

### printSyntaxHelp(color)
```javascript
function printSyntaxHelp(color: ColorScheme): void
```

Displays grammar and syntax documentation:
- Fact format (Subject REL Object)
- Question formats (natural interrogatives, canonical triples)
- Available relations (structural, causal, deontic, domain-specific)
- Grammar constraints

### printExamplesHelp(color)
```javascript
function printExamplesHelp(color: ColorScheme): void
```

Displays example sessions for common workflows:
- Basics (add, ask)
- Abduction
- Counterfactual reasoning
- Health compliance
- Export and narrative checks
- Theory management

### printBatchHelp(color)
```javascript
function printBatchHelp(color: ColorScheme): void
```

Displays batch mode help:
- Usage examples for `--batch`, `--exec`, `--json`
- Batch file format documentation
- Command line options reference

---

## 4. Help Content Structure

### Command Categories

```
┌─────────────────────────────────────────┐
│           AGISystem2 Raw CLI            │
├─────────────────────────────────────────┤
│ Core commands                           │
│   help, help commands, help syntax...   │
├─────────────────────────────────────────┤
│ Fact and query commands                 │
│   add, ask, retract, abduct, cf         │
├─────────────────────────────────────────┤
│ Reasoning commands                      │
│   prove, validate, hypothesize          │
├─────────────────────────────────────────┤
│ Theory layers                           │
│   push, pop, layers                     │
├─────────────────────────────────────────┤
│ Knowledge inspection                    │
│   facts, concepts, usage, inspect       │
├─────────────────────────────────────────┤
│ Memory management                       │
│   protect, unprotect, forget, boost     │
├─────────────────────────────────────────┤
│ Domain helpers                          │
│   check-procedure, check-export, ...    │
├─────────────────────────────────────────┤
│ Theory files                            │
│   new-theory, list-theories, ...        │
├─────────────────────────────────────────┤
│ Introspection                           │
│   config, run, debug, exit              │
└─────────────────────────────────────────┘
```

---

## 5. Usage Example

```javascript
const { createColorScheme, printMainHelp } = require('./cli_help');

const options = { noColor: false };
const color = createColorScheme(options);

printMainHelp(color);
// Outputs colored help text to console
```

---

## 6. Related Documents

- DS(/cli/agisystem2-cli.js) - Main entry point
- DS(/cli/cli_commands.js) - Command execution
- DS(/cli/cli_interactive.js) - Interactive REPL
