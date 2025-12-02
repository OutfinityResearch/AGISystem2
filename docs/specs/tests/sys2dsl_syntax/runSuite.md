# Suite: sys2dsl_syntax

ID: DS(/tests/sys2dsl_syntax/runSuite)

Scope: Validates the lexical structure and parsing rules of Sys2DSL as specified in DS(/theory/Sys2DSL_syntax).

Fixtures: In-memory parsing only, no persisted state.

Profile: `auto_test`.

Steps/Assertions:

## Lexical Structure Tests

- Token recognition:
  - Parse `@result Water IS_A liquid` and verify tokens:
    - `@result` = VARIABLE_DEF
    - `Water` = FACT (Capitalized)
    - `IS_A` = RELATION (UPPERCASE)
    - `liquid` = CONCEPT (lowercase)
  - Verify that parser distinguishes case conventions correctly.

- Variable naming:
  - `@validVar123` should be accepted
  - `@123invalid` should throw parse error (starts with digit)
  - `@_underscore` should throw parse error (starts with underscore)

- String literals:
  - Parse `@s LITERAL "hello world"` and verify string content preserved
  - Parse `@s LITERAL "with \"escaped\" quotes"` and verify escaping works

- Comments:
  - `# full line comment` should be ignored
  - Lines starting with `#` should not produce tokens

## Statement Syntax Tests

- Basic statement form:
  - `@var Subject VERB Object` parses to correct AST (triple syntax)
  - `@var COMMAND param1 param2` parses to correct AST (command syntax)
  - Missing `@var` prefix throws error
  - Missing verb/command throws error

- Semicolon separation:
  - `@a Water IS_A liquid; @b Fire IS_A element` produces two statements
  - Verify both statements are correctly parsed

- Line continuation:
  - Multi-line statement with `\` at end continues correctly
  - Verify parameters are joined

## Variable References

- Reference resolution:
  - Script `@a LITERAL 42; @b ECHO $a` should resolve `$a` to value of `@a`
  - Undefined reference `$undefined` should throw error

- Dependency ordering:
  - Script with forward reference `@b ECHO $a; @a LITERAL 1` should resolve via topological sort
  - Cyclic references `@a ECHO $b; @b ECHO $a` should throw cycle detection error

## Error Handling

- Syntax errors:
  - Malformed command throws descriptive error with line number
  - Unknown command name throws "unknown command" error
  - Verify error messages include source location

Sample Outputs:
- Token test returns structured token list with correct types
- Valid scripts parse to AST without errors
- Invalid scripts throw errors with line/column info
- Variable resolution produces expected values
