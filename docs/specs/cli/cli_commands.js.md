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

| Command | Syntax | DSL Translation |
|---------|--------|-----------------|
| `add` | `add <fact>` | `@f ASSERT <fact>` |
| `ask` | `ask <question>` | `@q ASK "<question>"` |
| `retract` | `retract <fact>` | `@r RETRACT <fact>` |
| `abduct` | `abduct <obs> [REL]` | `@h ABDUCT <obs> [REL]` |
| `cf` | `cf <q> \| <facts>` | `@cf CF "<q>" \| <facts>` |

### Reasoning Commands

| Command | Syntax | DSL Translation |
|---------|--------|-----------------|
| `prove` | `prove <statement>` | `@r PROVE <statement>` |
| `validate` | `validate` | `@r VALIDATE` |
| `hypothesize` | `hypothesize <subject>` | `@r HYPOTHESIZE <subject>` |

### Theory Layer Commands

| Command | Syntax | DSL Translation |
|---------|--------|-----------------|
| `push` | `push [name]` | `@r THEORY_PUSH name="<name>"` |
| `pop` | `pop` | `@r THEORY_POP` |
| `layers` | `layers` | `@r LIST_THEORIES` |

### Knowledge Inspection

| Command | Syntax | DSL Translation |
|---------|--------|-----------------|
| `facts` | `facts [pattern]` | `@r FACTS_MATCHING <pattern>` |
| `concepts` | `concepts` | Direct: `conceptStore.listConcepts()` |
| `usage` | `usage <concept>` | `@r GET_USAGE <concept>` |
| `inspect` | `inspect <concept>` | `@r INSPECT <concept>` |

### Memory Management

| Command | Syntax | DSL Translation |
|---------|--------|-----------------|
| `protect` | `protect <concept>` | `@r PROTECT <concept>` |
| `unprotect` | `unprotect <concept>` | Direct: `conceptStore.unprotect()` |
| `forget` | `forget <criteria>` | `@r FORGET <criteria>` |
| `boost` | `boost <concept> [n]` | `@r BOOST <concept> <n>` |

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

## 6. Usage Example

```javascript
const { executeCommand, initSampleTheories } = require('./cli_commands');

// Execute command
const result = executeCommand('add Dog IS_A Animal', session, theoriesRoot);
// → { command: 'add', args: 'Dog IS_A Animal', result: { ok: true, action: 'asserted', fact: '...' }, timestamp: '...' }

// Handle comments/empty lines
const skipped = executeCommand('# This is a comment', session, theoriesRoot);
// → { command: null, skipped: true, line: '# This is a comment', timestamp: '...' }
```

---

## 7. Related Documents

- DS(/cli/agisystem2-cli.js) - Main entry point
- DS(/cli/cli_interactive.js) - Interactive REPL
- DS(/interface/system2_session.js) - Session API
- DS(/theory/dsl_engine.js) - DSL execution
