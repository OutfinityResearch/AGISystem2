# Module Plan: src/parser/lexer.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-08, FS-09, FS-15, FS-16

---

## 1. Purpose

Tokenizes Sys2DSL source text into a stream of tokens for parsing. Handles all DSL syntax including declarations, references, holes, strings, numbers, and comments.

---

## 2. Responsibilities

- Convert DSL text to token stream
- Track line and column numbers for error reporting
- Handle string literals with escapes
- Handle numeric literals (integers and floats)
- Skip comments and whitespace
- Recognize keywords vs identifiers

---

## 3. Public API

```javascript
class Lexer {
  constructor(source: string)

  // Get next token
  nextToken(): Token

  // Peek without consuming
  peek(): Token

  // Check if more tokens
  hasMore(): boolean

  // Get all tokens (for debugging)
  tokenize(): Token[]
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

enum TokenType {
  // Declarations
  AT,           // @
  DOLLAR,       // $
  QUESTION,     // ?
  COLON,        // :

  // Literals
  IDENTIFIER,   // names
  STRING,       // "quoted"
  NUMBER,       // 42, 3.14

  // Keywords
  MACRO,        // macro
  END,          // end
  RETURN,       // return
  THEORY,       // theory

  // Structure
  NEWLINE,      // \n (significant)
  INDENT,       // increased indentation
  DEDENT,       // decreased indentation
  EOF           // end of input
}
```

---

## 4. Internal Design

### 4.1 State Machine

```
States:
  START -> ready for next token
  IN_STRING -> reading string literal
  IN_NUMBER -> reading numeric literal
  IN_IDENTIFIER -> reading identifier/keyword
  IN_COMMENT -> skipping until newline
```

### 4.2 Main Algorithm

```javascript
nextToken() {
  this.skipWhitespace();  // Skip spaces/tabs (not newlines)

  if (this.atEnd()) return this.makeToken(EOF);

  const char = this.current();

  // Single-character tokens
  if (char === '@') return this.advance() && this.makeToken(AT);
  if (char === '$') return this.advance() && this.makeToken(DOLLAR);
  if (char === '?') return this.advance() && this.makeToken(QUESTION);
  if (char === ':') return this.advance() && this.makeToken(COLON);
  if (char === '\n') return this.handleNewline();

  // Comments
  if (char === '#') return this.skipComment();

  // String literals
  if (char === '"') return this.readString();

  // Numbers
  if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek()))) {
    return this.readNumber();
  }

  // Identifiers and keywords
  if (this.isIdentifierStart(char)) {
    return this.readIdentifier();
  }

  // Unknown character
  throw this.error(`Unexpected character: ${char}`);
}
```

### 4.3 Indentation Tracking

```javascript
handleNewline() {
  this.advance();  // consume \n
  this.line++;
  this.column = 1;

  // Count leading spaces
  const indent = this.countIndent();

  if (indent > this.currentIndent) {
    this.indentStack.push(indent);
    this.currentIndent = indent;
    return this.makeToken(INDENT);
  }

  while (indent < this.currentIndent) {
    this.indentStack.pop();
    this.currentIndent = this.indentStack[this.indentStack.length - 1] || 0;
    this.pendingDedents++;
  }

  if (this.pendingDedents > 0) {
    this.pendingDedents--;
    return this.makeToken(DEDENT);
  }

  return this.makeToken(NEWLINE);
}
```

### 4.4 Keyword Recognition

```javascript
const KEYWORDS = {
  'macro': MACRO,
  'end': END,
  'return': RETURN,
  'theory': THEORY
};

readIdentifier() {
  const start = this.position;
  while (this.isIdentifierChar(this.current())) {
    this.advance();
  }

  const text = this.source.slice(start, this.position);
  const type = KEYWORDS[text] || IDENTIFIER;

  return this.makeToken(type, text);
}
```

---

## 5. Dependencies

- None (leaf module)

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| LEX-01 | Simple statement | @, IDENT, IDENT, IDENT, NEWLINE |
| LEX-02 | Variable reference | DOLLAR, IDENT |
| LEX-03 | Query hole | QUESTION, IDENT |
| LEX-04 | String literal | STRING with value |
| LEX-05 | Number literal | NUMBER with value |
| LEX-06 | Comment skipped | Next token after comment |
| LEX-07 | Indentation | INDENT/DEDENT tokens |
| LEX-08 | Keywords | Correct token types |
| LEX-09 | Line/column tracking | Accurate positions |
| LEX-10 | String escapes | \n, \t, \" handled |

---

## 7. Error Messages

| Error | Cause | Message Format |
|-------|-------|----------------|
| UnexpectedChar | Invalid character | "Unexpected character '{char}' at line {line}, column {col}" |
| UnterminatedString | Missing closing quote | "Unterminated string starting at line {line}" |
| InvalidNumber | Malformed number | "Invalid number format at line {line}" |

---

## 8. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| tokenize(100 lines) | < 5ms | Benchmark |
| tokenize(1000 lines) | < 50ms | Benchmark |
| Memory per token | < 100 bytes | Profiling |

---

*End of Module Plan*
