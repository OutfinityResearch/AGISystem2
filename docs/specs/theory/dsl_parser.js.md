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
- `any` is wildcard (matches anything)
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

## Sys2DSL v3.0 Syntax Handled

### Basic Triple Statement
```
@varName Subject VERB Object
```

**CRITICAL**: v3.0 enforces strict triple syntax - exactly 4 tokens total (@varName + 3 components).

### Multiple Statements Per Line
```
@a Dog IS_A mammal @b Cat IS_A mammal
```

### Variable References
```
@result $subject IS_A $type
@combined $a BOOL_AND $b
```

### Wildcards
```
@all any IS_A animal             # 'any' as wildcard
@facts Dog FACTS any             # Query with 'any'
```

### Example Verbs
```
@result Dog QUERY mammal
@causes fever ABDUCT CAUSES
@list any THEORIES any
```

### v3.0 Syntax Rules
- **Required**: `@var Subject VERB Object` - All statements use triple syntax
- **Subject position**: Concepts (lowercase), Individuals (First_cap), or variables ($var)
- **VERB position**: Relations/operations in ALL_CAPS
- **Object position**: Concepts, values, or variables
- **Wildcard**: Use `any` concept
- **Options**: Use underscore notation (e.g., `limit_5_maxDepth_3`)
- **Separators**: Newline or `@` separates statements (semicolons optional)

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

### Parse and Execute Script (v3.0)
```javascript
const parser = new DSLParser();
const lines = script.split('\n');
const statements = parser.splitIntoStatements(lines);
const ordered = parser.topologicalOrder(statements);

const env = {};
for (const stmt of ordered) {
  // v3.0: stmt has varName, command (VERB), and args [Subject, Object]
  const result = engine.executeCommand(stmt.command, stmt.args, env);
  env[stmt.varName] = result;
}
```

### Variable Expansion (v3.0)
```javascript
const parser = new DSLParser();
const env = { subject: 'Dog', type: 'mammal' };
const expanded = parser.expandString('$subject IS_A $type', env);
// → 'Dog IS_A mammal'

// v3.0 examples
const triple = '@f1 $subject IS_A $type';
// Expands to: '@f1 Dog IS_A mammal'
```

## v3.0 Parser Notes/Constraints
- **Strict Triple Syntax**: Parser enforces exactly 4 tokens total: `@varName Subject VERB Object`
- **Verb Detection**: VERB position (2nd component) must be uppercase or variable reference
- **No property=value**: Parser rejects unquoted `property=value` in Subject/Object positions
- **Case Sensitivity**:
  - ALL_CAPS → verb/relation/operation
  - all_lower → concept/type
  - First_cap → individual/instance
  - $variable → variable reference
- Variable names must be alphanumeric plus underscore
- Self-references are detected and throw as cycles
- Empty lines and comment-only lines are skipped
- Quotes are stripped from expanded strings
- The `any` token is recognized as a special wildcard concept
- Options use underscore notation (e.g., `limit_5` not `limit=5`)

## v3.0 Grammar Validation

The parser validates:
1. Statement starts with `@` (variable definition) or `$` (variable reference)
2. Exactly 4 tokens total: `@varName Subject VERB Object`
3. VERB position (2nd token after @) is uppercase or variable reference
4. No `property=value` in Subject/Object positions (use underscore notation)
5. `any` replaces all wildcards
6. Variables referenced must be defined before use (topological order)
7. BEGIN/END blocks for compound verb definitions (future extension)
