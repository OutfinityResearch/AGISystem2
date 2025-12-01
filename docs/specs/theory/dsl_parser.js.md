# Design Spec: src/theory/dsl_parser.js

ID: DS(/theory/dsl_parser.js)

Class `DSLParser`
- **Role**: Parses Sys2DSL scripts and handles dependency-based execution order. Provides utilities for statement splitting, topological sorting (Kahn's algorithm), variable expansion, and pattern matching.
- **Pattern**: Parser/Transformer. Stateless utility class.
- **Key Collaborators**: `TheoryDSLEngine`, `DSLCommands*` classes.

## Public API

### Statement Parsing
```javascript
splitIntoStatements(lines: string[]): Statement[]
```
Splits input lines into statement objects.
- Handles comments (`#` prefix)
- Supports multiple statements per line (split on `@`)
- Returns: `[{ varName, command, args, raw }, ...]`

### Dependency Resolution
```javascript
topologicalOrder(statements: Statement[]): Statement[]
```
Sorts statements in topological order based on variable dependencies.
- Uses **Kahn's algorithm** for dependency resolution
- Detects cycles and throws error with cycle participants
- Throws on duplicate variable names

### Variable Expansion
```javascript
expandString(str: string, env: Object): string
```
Expands `$varName` references in a string using the environment.
- Strips surrounding quotes
- Returns empty string for undefined variables

```javascript
resolveVar(token: string, env: Object): any
```
Resolves a variable from environment (handles `$` prefix).

```javascript
resolveVarAsArray(token: string, env: Object): Array
```
Resolves a variable as an array (wraps non-arrays).

### String Utilities
```javascript
stripQuotes(str: string): string
```
Removes surrounding single or double quotes.

### Pattern Matching
```javascript
tokenMatches(patternToken: string, value: string): boolean
```
Checks if a pattern token matches a value.
- `?` is wildcard (matches anything)
- Otherwise exact string match

### Validation
```javascript
validateNoPropertyValue(token: string, position: string): void
```
Validates that a triplet argument does not contain `property=value` syntax.
- Throws descriptive error if invalid syntax detected
- Prevents common misuse of triplet format

## Statement Structure

```javascript
{
  varName: string,    // Variable name (without @)
  command: string,    // Command name (uppercase)
  args: string[],     // Array of argument tokens
  raw: string,        // Original statement text
  deps: Set<string>,  // Computed dependencies (after topologicalOrder)
  dependents: Array,  // Computed dependents (after topologicalOrder)
  inDegree: number    // Computed in-degree (after topologicalOrder)
}
```

## Sys2DSL Syntax Handled

### Basic Statement
```
@varName COMMAND arg1 arg2 "quoted arg"
```

### Multiple Statements Per Line
```
@a ASK "question" @b ASSERT X IS_A Y
```

### Variable References
```
@result ASK "Is $subject a $type?"
```

### Wildcards in Patterns
```
@matches FACTS_MATCHING ? IS_A Animal
```

## Algorithm: Topological Sort (Kahn's)

```javascript
topologicalOrder(statements) {
  // 1. Build name→statement map, detect duplicates
  // 2. Parse $varName references in args to build dependency graph
  // 3. Compute in-degree for each statement
  // 4. Initialize queue with zero in-degree statements
  // 5. Process queue:
  //    - Pop statement, add to result
  //    - Decrement in-degree of dependents
  //    - Add newly zero in-degree to queue
  // 6. If result.length !== statements.length → cycle detected
}
```

## Usage Examples

### Parse and Execute Script
```javascript
const parser = new DSLParser();
const lines = script.split('\n');
const statements = parser.splitIntoStatements(lines);
const ordered = parser.topologicalOrder(statements);

const env = {};
for (const stmt of ordered) {
  const result = engine.executeCommand(stmt.command, stmt.args, env);
  env[stmt.varName] = result;
}
```

### Variable Expansion
```javascript
const parser = new DSLParser();
const env = { subject: 'Dog', type: 'mammal' };
const expanded = parser.expandString('Is $subject a $type?', env);
// → 'Is Dog a mammal?'
```

## Notes/Constraints
- All commands are converted to uppercase during parsing
- Variable names must be alphanumeric plus underscore
- Self-references are detected and throw as cycles
- Empty lines and comment-only lines are skipped
- Quotes are stripped from expanded strings
