/**
 * AGISystem2 - Lexer
 * @module parser/lexer
 *
 * Tokenizes Sys2DSL input into a stream of tokens.
 */

import { TOKEN_TYPES, KEYWORDS } from '../core/constants.mjs';

export class Token {
  constructor(type, value, line, column) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, ${this.line}:${this.column})`;
  }
}

export class LexerError extends Error {
  constructor(message, line, column) {
    super(`Lexer error at ${line}:${column}: ${message}`);
    this.name = 'LexerError';
    this.line = line;
    this.column = column;
  }
}

export class Lexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  /**
   * Tokenize the entire input
   * @returns {Token[]} Array of tokens
   */
  tokenize() {
    while (!this.isEof()) {
      this.skipWhitespace();
      if (this.isEof()) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push(new Token(TOKEN_TYPES.EOF, null, this.line, this.column));
    return this.tokens;
  }

  /**
   * Get next token
   * @returns {Token|null} Next token or null
   */
  nextToken() {
    const ch = this.peek();

    // Skip comments
    if (ch === '#' || (ch === '/' && this.peek(1) === '/')) {
      this.skipLineComment();
      return null;
    }

    // Multi-line comment
    if (ch === '/' && this.peek(1) === '*') {
      this.skipBlockComment();
      return null;
    }

    // Newline
    if (ch === '\n') {
      const token = new Token(TOKEN_TYPES.NEWLINE, '\n', this.line, this.column);
      this.advance();
      this.line++;
      this.column = 1;
      return token;
    }

    // @ prefix (destination/label)
    if (ch === '@') {
      return this.readAtIdentifier();
    }

    // ? prefix (hole/variable)
    if (ch === '?') {
      return this.readHole();
    }

    // $ prefix (reference to stored variable)
    if (ch === '$') {
      return this.readReference();
    }

    // String literal
    if (ch === '"' || ch === "'") {
      return this.readString(ch);
    }

    // Number
    if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
      return this.readNumber();
    }

    // Identifier or keyword
    if (this.isAlpha(ch)) {
      return this.readIdentifier();
    }

    // Single character tokens
    switch (ch) {
      case '(':
        return this.singleChar(TOKEN_TYPES.LPAREN);
      case ')':
        return this.singleChar(TOKEN_TYPES.RPAREN);
      case '[':
        return this.singleChar(TOKEN_TYPES.LBRACKET);
      case ']':
        return this.singleChar(TOKEN_TYPES.RBRACKET);
      case '{':
        return this.singleChar(TOKEN_TYPES.LBRACE);
      case '}':
        return this.singleChar(TOKEN_TYPES.RBRACE);
      case ',':
        return this.singleChar(TOKEN_TYPES.COMMA);
      case ':':
        return this.singleChar(TOKEN_TYPES.COLON);
    }

    throw new LexerError(`Unexpected character '${ch}'`, this.line, this.column);
  }

  /**
   * Read @identifier token
   * Supports: @var, @var:name, @:name, @_
   */
  readAtIdentifier() {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // skip @

    let value = '';

    // Check for @:name shorthand (KB-only, no local variable)
    if (this.peek() === ':') {
      this.advance(); // skip :
      let persistName = '';
      while (!this.isEof() && (this.isAlphaNum(this.peek()) || this.peek() === '_' || this.peek() === '-')) {
        persistName += this.advance();
      }
      if (persistName.length === 0) {
        throw new LexerError('Expected name after @:', startLine, startColumn);
      }
      // Return ":name" format to indicate KB-only (no local var)
      return new Token(TOKEN_TYPES.AT, `:${persistName}`, startLine, startColumn);
    }

    // Read the identifier after @
    while (!this.isEof() && (this.isAlphaNum(this.peek()) || this.peek() === '_' || this.peek() === '-')) {
      value += this.advance();
    }

    if (value.length === 0) {
      throw new LexerError('Expected identifier after @', startLine, startColumn);
    }

    // Check for :name suffix (persistent fact name)
    let persistName = null;
    if (this.peek() === ':') {
      this.advance(); // skip :
      persistName = '';
      while (!this.isEof() && (this.isAlphaNum(this.peek()) || this.peek() === '_' || this.peek() === '-')) {
        persistName += this.advance();
      }
      if (persistName.length === 0) {
        throw new LexerError('Expected name after :', startLine, startColumn);
      }
    }

    // Return token with persist flag in value
    // Format: "varname", "varname:persistname", or ":persistname"
    const tokenValue = persistName ? `${value}:${persistName}` : value;
    return new Token(TOKEN_TYPES.AT, tokenValue, startLine, startColumn);
  }

  /**
   * Read ?hole token
   */
  readHole() {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // skip ?

    let value = '';
    while (!this.isEof() && (this.isAlphaNum(this.peek()) || this.peek() === '_')) {
      value += this.advance();
    }

    if (value.length === 0) {
      throw new LexerError('Expected identifier after ?', startLine, startColumn);
    }

    return new Token(TOKEN_TYPES.HOLE, value, startLine, startColumn);
  }

  /**
   * Read $reference token
   */
  readReference() {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // skip $

    let value = '';
    while (!this.isEof() && (this.isAlphaNum(this.peek()) || this.peek() === '_')) {
      value += this.advance();
    }

    if (value.length === 0) {
      throw new LexerError('Expected identifier after $', startLine, startColumn);
    }

    return new Token(TOKEN_TYPES.REFERENCE, value, startLine, startColumn);
  }

  /**
   * Read identifier token
   */
  readIdentifier() {
    const startLine = this.line;
    const startColumn = this.column;

    let value = '';
    while (!this.isEof() && (this.isAlphaNum(this.peek()) || this.peek() === '_')) {
      value += this.advance();
    }

    // Check if keyword
    if (KEYWORDS.includes(value)) {
      return new Token(TOKEN_TYPES.KEYWORD, value, startLine, startColumn);
    }

    return new Token(TOKEN_TYPES.IDENTIFIER, value, startLine, startColumn);
  }

  /**
   * Read number token
   */
  readNumber() {
    const startLine = this.line;
    const startColumn = this.column;

    let value = '';
    if (this.peek() === '-') {
      value += this.advance();
    }

    while (!this.isEof() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      value += this.advance(); // .
      while (!this.isEof() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return new Token(TOKEN_TYPES.NUMBER, parseFloat(value), startLine, startColumn);
  }

  /**
   * Read string token
   */
  readString(quote) {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // opening quote

    let value = '';
    while (!this.isEof() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped;
        }
      } else if (this.peek() === '\n') {
        throw new LexerError('Unterminated string literal', startLine, startColumn);
      } else {
        value += this.advance();
      }
    }

    if (this.isEof()) {
      throw new LexerError('Unterminated string literal', startLine, startColumn);
    }

    this.advance(); // closing quote
    return new Token(TOKEN_TYPES.STRING, value, startLine, startColumn);
  }

  /**
   * Create single character token
   */
  singleChar(type) {
    const token = new Token(type, this.peek(), this.line, this.column);
    this.advance();
    return token;
  }

  /**
   * Skip whitespace (except newlines)
   */
  skipWhitespace() {
    while (!this.isEof() && this.isWhitespace(this.peek()) && this.peek() !== '\n') {
      this.advance();
    }
  }

  /**
   * Skip line comment
   */
  skipLineComment() {
    while (!this.isEof() && this.peek() !== '\n') {
      this.advance();
    }
  }

  /**
   * Skip block comment
   */
  skipBlockComment() {
    this.advance(); // /
    this.advance(); // *
    while (!this.isEof()) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        return;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }
    throw new LexerError('Unterminated block comment', this.line, this.column);
  }

  /**
   * Peek at character at offset
   */
  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.input.length ? this.input[idx] : '\0';
  }

  /**
   * Advance and return current character
   */
  advance() {
    const ch = this.input[this.pos++];
    this.column++;
    return ch;
  }

  /**
   * Check if at end of input
   */
  isEof() {
    return this.pos >= this.input.length;
  }

  isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\r';
  }

  isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  isAlpha(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  isAlphaNum(ch) {
    return this.isAlpha(ch) || this.isDigit(ch);
  }
}

export default Lexer;
