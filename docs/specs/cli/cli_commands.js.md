# Design Spec: cli/cli_commands.js

ID: DS(/cli/cli_commands.js)

Status: IMPLEMENTED v1.0

## 1. Purpose

Command executor for the AGISystem2 CLI. Translates user-friendly CLI commands to Sys2DSL statements and executes them via the session. Used by both batch mode and interactive mode.

**File**: `cli/cli_commands.js`
**Module Type**: CommonJS
**Exports**: `executeCommand`, `initSampleTheories`

---

## 2. Main Functions

### executeCommand(line, session, theoriesRoot)
```javascript
function executeCommand(
  line: string,
  session: System2Session,
  theoriesRoot: string
): CommandResult
```

Executes a single CLI command and returns structured result.

**Parameters:**
- `line` - The command line to execute
- `session` - The DSL session instance
- `theoriesRoot` - Path to theories directory

**Returns:**
```javascript
{
  command: string | null,  // Command name
  args: string,            // Command arguments
  result?: any,            // Execution result
  error?: string,          // Error message if failed
  skipped?: boolean,       // True if empty/comment line
  timestamp: ISO8601       // Execution timestamp
}
```

---

## 3. Supported Commands

### Fact and Query Commands

**v3.0 Note**: CLI commands now generate v3.0 strict triple syntax.

| Command | Syntax | v3.0 DSL Translation |
|---------|--------|---------------------|
| `add` | `add <fact>` | `@_ Subject VERB Object` (parsed from fact) |
| `ask` | `ask <question>` | `@q Subject VERB Object` (parsed from question) |
| `retract` | `retract <fact>` | `@_ Subject RETRACT Object` |
| `abduct` | `abduct <obs> [REL]` | `@h Observation ABDUCT Domain` |
| `cf` | `cf <q> \| <facts>` | Uses PUSH/POP pattern with v3 syntax |

### Reasoning Commands

| Command | Syntax | v3.0 DSL Translation |
|---------|--------|---------------------|
| `prove` | `prove <statement>` | `@r Subject VERB Object` (parsed) |
| `validate` | `validate` | `@r any VALIDATE any` |
| `hypothesize` | `hypothesize <subject>` | `@r Subject HYPOTHESIZE Domain` |

### Theory Layer Commands

| Command | Syntax | v3.0 DSL Translation |
|---------|--------|---------------------|
| `push` | `push [name]` | `@r LayerName PUSH any` |
| `pop` | `pop` | `@r any POP any` |
| `layers` | `layers` | `@r any THEORIES any` |

### Knowledge Inspection

| Command | Syntax | v3.0 DSL Translation |
|---------|--------|---------------------|
| `facts` | `facts [pattern]` | `@r Pattern FACTS any` |
| `concepts` | `concepts` | Direct: `conceptStore.listConcepts()` |
| `usage` | `usage <concept>` | `@r Concept USAGE any` |
| `inspect` | `inspect <concept>` | `@r Concept INSPECT any` |

### Memory Management

| Command | Syntax | v3.0 DSL Translation |
|---------|--------|---------------------|
| `protect` | `protect <concept>` | `@r Concept PROTECT any` |
| `unprotect` | `unprotect <concept>` | Direct: `conceptStore.unprotect()` |
| `forget` | `forget <criteria>` | `@r Criteria FORGET any` |
| `boost` | `boost <concept> [n]` | `@n NUMERIC_VALUE n; @r Concept BOOST $n` |

### Theory File Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| `list-theories` | `list-theories` | Lists `.sys2dsl` files in theories directory |
| `load-theory` | `load-theory <name>` | Loads theory into session |
| `show-theory` | `show-theory <name>` | Prints theory file contents |
| `new-theory` | `new-theory <name>` | Creates empty theory file |

### Utility Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| `run` | `run <dsl>` | Execute raw DSL statement |
| `config` | `config` | Print config snapshot |

### Domain Helpers (Stubs)

| Command | Syntax | Description |
|---------|--------|-------------|
| `check-procedure` | `check-procedure <id>` | Health compliance check |
| `check-export` | `check-export <id> <regs>` | Export regulation check |
| `check-magic` | `check-magic <actor> <city>` | Narrative magic check |

---

## 4. Security

### Path Traversal Prevention

Theory file operations validate names to prevent path traversal:

```javascript
// Only allow alphanumeric, underscore, dash, and dot (not leading)
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
  return { error: 'Invalid theory name' };
}

// Double-check resolved path is inside theoriesRoot
const resolvedPath = path.resolve(filePath);
const resolvedRoot = path.resolve(theoriesRoot);
if (!resolvedPath.startsWith(resolvedRoot + path.sep)) {
  return { error: 'Invalid theory path' };
}
```

---

## 5. initSampleTheories(theoriesRoot)
```javascript
function initSampleTheories(theoriesRoot: string): void
```

Copies sample theory files from `data/init/theories/` to the user's theories directory.

**Sample Theories:**
- `health_compliance.sys2dsl` - Medical procedure compliance
- `law_minimal.sys2dsl` - Basic legal concepts
- `scifi_magic.sys2dsl` - Fantasy/sci-fi narrative rules

---

## 6. v3.0 Usage Example

```javascript
const { executeCommand, initSampleTheories } = require('./cli_commands');

// v3.0: Execute command - generates triple syntax
const result = executeCommand('add Dog IS_A animal', session, theoriesRoot);
// Internally generates: @_ Dog IS_A animal
// → { command: 'add', args: 'Dog IS_A animal', result: { ... }, timestamp: '...' }

// Handle comments/empty lines
const skipped = executeCommand('# This is a comment', session, theoriesRoot);
// → { command: null, skipped: true, line: '# This is a comment', timestamp: '...' }

// v3.0: Direct DSL execution
const dslResult = executeCommand('run @r Dog IS_A animal', session, theoriesRoot);
// Executes v3.0 strict triple syntax directly
```

### v3.0 Migration Notes

CLI commands automatically translate user-friendly syntax to v3.0 triples:
- `add X IS_A Y` → generates `@_ X IS_A Y` (v3 triple)
- `ask "question"` → parses to Subject-VERB-Object → generates `@q Subject VERB Object` (v3 triple)
- `facts Dog` → generates `@r Dog FACTS any`
- `push hypothetical` → generates `@r hypothetical PUSH any`

The CLI layer handles the conversion, so users don't need to know v3 syntax details.

---

## 7. Related Documents

- DS(/cli/agisystem2-cli.js) - Main entry point
- DS(/cli/cli_interactive.js) - Interactive REPL
- DS(/interface/system2_session.js) - Session API
- DS(/theory/dsl_engine.js) - DSL execution
