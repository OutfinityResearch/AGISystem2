# Module Plan: src/parser/parser.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-10, FS-11, FS-12, FS-13, FS-14, FS-15

---

## 1. Purpose

Parses token stream into an Abstract Syntax Tree (AST) representing the DSL program. Implements the Sys2DSL grammar with support for statements, macros, theories, and expressions.

---

## 2. Responsibilities

- Parse token stream into AST
- Validate syntactic structure
- Generate meaningful error messages
- Support recovery from parse errors
- Build complete AST for execution

---

## 3. Public API

```javascript
class Parser {
  constructor(source: string)

  // Parse entire program
  parse(): Program

  // Parse single statement (for REPL)
  parseStatement(): Statement

  // Get parse errors
  getErrors(): ParseError[]
}

interface ParseError {
  message: string;
  line: number;
  column: number;
  expected: string;
  found: string;
}
```

---

## 4. Grammar

```
Program     := Statement*
Statement   := Assignment | MacroDef | TheoryDef | Return
Assignment  := '@' IDENT (':' IDENT)? Expression+
MacroDef    := '@' IDENT (':' IDENT)? 'macro' IDENT* NEWLINE INDENT Statement+ DEDENT 'end'
TheoryDef   := '@' IDENT 'theory' NUMBER IDENT NEWLINE INDENT Statement* DEDENT 'end'
Return      := 'return' Expression
Expression  := Identifier | Reference | Hole | Literal | Group
Identifier  := IDENT
Reference   := '$' IDENT
Hole        := '?' IDENT
Literal     := STRING | NUMBER
Group       := '(' Expression+ ')'
```

---

## 5. Internal Design

### 5.1 Parser Class

```javascript
class Parser {
  constructor(source) {
    this.lexer = new Lexer(source);
    this.current = null;
    this.errors = [];
    this.advance();
  }

  parse() {
    const statements = [];

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
      } catch (e) {
        this.errors.push(e);
        this.synchronize();
      }
    }

    return new Program(statements);
  }
}
```

### 5.2 Statement Parsing

```javascript
parseStatement() {
  // Skip empty lines
  while (this.check(NEWLINE)) this.advance();

  if (this.isAtEnd()) return null;

  // All statements start with @
  this.expect(AT, "Expected '@' at start of statement");

  const dest = this.expect(IDENTIFIER, "Expected destination name");
  let exportName = null;

  // Optional export
  if (this.match(COLON)) {
    exportName = this.expect(IDENTIFIER, "Expected export name");
  }

  // Determine statement type
  if (this.check(MACRO)) {
    return this.parseMacroDef(dest, exportName);
  }

  if (this.check(THEORY)) {
    return this.parseTheoryDef(dest);
  }

  // Regular assignment
  return this.parseAssignment(dest, exportName);
}
```

### 5.3 Assignment Parsing

```javascript
parseAssignment(dest, exportName) {
  const operator = this.parseExpression();
  const args = [];

  while (!this.check(NEWLINE) && !this.isAtEnd()) {
    args.push(this.parseExpression());
  }

  this.expect(NEWLINE, "Expected newline after statement");

  return new Assignment(dest, exportName, operator, args);
}
```

### 5.4 Expression Parsing

```javascript
parseExpression() {
  if (this.match(DOLLAR)) {
    const name = this.expect(IDENTIFIER, "Expected variable name after $");
    return new Reference(name);
  }

  if (this.match(QUESTION)) {
    const name = this.expect(IDENTIFIER, "Expected hole name after ?");
    return new Hole(name);
  }

  if (this.check(STRING)) {
    const token = this.advance();
    return new Literal(token.value, 'string');
  }

  if (this.check(NUMBER)) {
    const token = this.advance();
    return new Literal(parseFloat(token.value), 'number');
  }

  if (this.check(IDENTIFIER)) {
    const token = this.advance();
    return new Identifier(token.value);
  }

  throw this.error("Expected expression");
}
```

### 5.5 Macro Parsing

```javascript
parseMacroDef(name, exportName) {
  this.expect(MACRO, "Expected 'macro' keyword");

  const params = [];
  while (this.check(IDENTIFIER)) {
    params.push(this.advance().value);
  }

  this.expect(NEWLINE, "Expected newline after macro header");
  this.expect(INDENT, "Expected indented macro body");

  const body = [];
  while (!this.check(DEDENT) && !this.isAtEnd()) {
    const stmt = this.parseStatement();
    if (stmt) body.push(stmt);
  }

  this.expect(DEDENT, "Expected dedent");
  this.expect(END, "Expected 'end' keyword");

  return new MacroDef(name, exportName, params, body);
}
```

### 5.6 Error Recovery

```javascript
synchronize() {
  // Skip to next statement boundary
  while (!this.isAtEnd()) {
    if (this.previous()?.type === NEWLINE) return;

    switch (this.current.type) {
      case AT:
      case MACRO:
      case END:
      case THEORY:
        return;
    }

    this.advance();
  }
}
```

---

## 6. Dependencies

- `./lexer.js` - Lexer class
- `./ast.js` - AST node classes

---

## 7. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| PAR-01 | Simple assignment | Assignment node |
| PAR-02 | Assignment with export | exportName set |
| PAR-03 | Variable reference | Reference node |
| PAR-04 | Query hole | Hole node |
| PAR-05 | String literal | Literal with string |
| PAR-06 | Number literal | Literal with number |
| PAR-07 | Macro definition | MacroDef with params, body |
| PAR-08 | Theory definition | TheoryDef with contents |
| PAR-09 | Nested structures | Correct tree |
| PAR-10 | Error recovery | Continue after error |
| PAR-11 | Missing @ | Error with position |

---

## 8. Error Messages

| Error | Message Format |
|-------|----------------|
| UnexpectedToken | "Expected {expected}, found {found} at line {line}" |
| MissingOperator | "Statement requires an operator after destination" |
| InvalidMacro | "Invalid macro definition at line {line}" |
| UnterminatedBlock | "Unterminated {block_type} starting at line {line}" |

---

*End of Module Plan*
