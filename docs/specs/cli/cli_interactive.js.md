# Design Spec: cli/cli_interactive.js

ID: DS(/cli/cli_interactive.js)

Status: IMPLEMENTED v1.0

## 1. Purpose

Interactive REPL handler for the AGISystem2 CLI. Provides colored output, user-friendly formatting, and debug mode for DSL introspection.

**File**: `cli/cli_interactive.js`
**Module Type**: CommonJS
**Exports**: `runInteractive`

---

## 2. Main Function

### runInteractive(session, theoriesRoot, color)
```javascript
function runInteractive(
  session: System2Session,
  theoriesRoot: string,
  color: ColorScheme
): void
```

Starts the interactive REPL session.

**Parameters:**
- `session` - The DSL session instance
- `theoriesRoot` - Path to theories directory
- `color` - Color scheme object from `cli_help.js`

**Behavior:**
1. Creates readline interface with prompt `AGIS2> `
2. Displays main help on startup
3. Processes commands in loop until exit/quit
4. Handles SIGINT (Ctrl+C) gracefully

---

## 3. REPL Features

### Debug Mode

Toggle with `debug` command to see DSL translations:

```
AGIS2> debug
Debug mode: ON
DSL commands and results will be shown for each operation

AGIS2> add Dog IS_A Animal
[DSL] @f ASSERT Dog IS_A Animal
[Result] {"subject":"Dog","relation":"IS_A","object":"Animal"}
OK (fact ingested via Sys2DSL)
```

### Colored Output

Uses ANSI escape codes for visual clarity:
- **Headings**: Cyan bold
- **Sections**: Blue bold
- **Commands**: Green bold
- **Labels**: Yellow bold
- **Examples**: Cyan
- **Errors**: Red bold
- **Dim**: Gray (for metadata)

---

## 4. Command Handler

### handleCommand(cmd, args, session, theoriesRoot, color, rl)
```javascript
function handleCommand(
  cmd: string,
  args: string,
  session: System2Session,
  theoriesRoot: string,
  color: ColorScheme,
  rl: readline.Interface
): void
```

Routes commands to appropriate handlers with formatted output.

**Enhanced Commands (vs batch mode):**
- `facts` - Shows first 20 facts with "... and N more"
- `concepts` - Shows first 30 concepts with "... and N more"
- `prove` - Shows proof chain if available
- `validate` - Lists individual issues with types
- `hypothesize` - Formats hypothesis list

---

## 5. Domain Helpers

### handleDomainHelper(cmd, args, session, color)
```javascript
function handleDomainHelper(
  cmd: string,
  args: string,
  session: System2Session,
  color: ColorScheme
): void
```

Handles domain-specific compliance and narrative checks.

**Supported Commands:**

#### check-procedure
```
check-procedure ProcedureX | Consent GIVEN yes ; AuditTrail PRESENT yes
```
Evaluates health-style procedure compliance with optional extra facts.

#### check-export
```
check-export ExportData GDPR HIPAA
```
Checks export action under specified regulations.

#### check-magic
```
check-magic Alice CityX | SciFi_TechMagic PERMITS Magic_IN CityX
```
Checks narrative magic permissions with optional context.

---

## 6. Security

### validateTheoryPath(name, theoriesRoot)
```javascript
function validateTheoryPath(
  name: string,
  theoriesRoot: string
): { valid: boolean, path?: string, error?: string }
```

Validates theory file paths to prevent path traversal attacks.

**Validation Rules:**
1. Name must match `/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/`
2. Resolved path must be inside theoriesRoot

---

## 7. Special Commands

| Command | Description |
|---------|-------------|
| `help` | Show main help |
| `help commands` | Show commands reference |
| `help syntax` | Show grammar help |
| `help examples` | Show example sessions |
| `debug` | Toggle debug mode |
| `exit` / `quit` | Exit REPL |

---

## 8. Output Formatting Examples

### Successful Query
```
AGIS2> ask Is Dog an Animal?
Result: TRUE_CERTAIN  Band: certain
```

### Proof Result
```
AGIS2> prove Dog IS_A Animal
PROVEN (method: direct, confidence: 1)
Chain: Dog → Animal
```

### Validation
```
AGIS2> validate
CONSISTENT (42 facts checked)
```

### Hypotheses
```
AGIS2> hypothesize Dog
Hypotheses for Dog:
  - Dog HAS_PROPERTY loyal (basis: inheritance)
  - Dog CAN bark (basis: type_default)
```

---

## 9. Related Documents

- DS(/cli/agisystem2-cli.js) - Main entry point
- DS(/cli/cli_commands.js) - Command execution
- DS(/cli/cli_help.js) - Help system
- DS(/interface/system2_session.js) - Session API
