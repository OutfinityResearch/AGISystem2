/**
 * AGISystem2 - Parser
 * @module parser/parser
 *
 * Parses token stream into AST.
 */

import { TOKEN_TYPES } from '../core/constants.mjs';
import { Lexer } from './lexer.mjs';
import {
  Program,
  Statement,
  Identifier,
  Hole,
  Reference,
  Literal,
  List,
  Compound,
  TheoryDeclaration,
  GraphDeclaration,
  SolveBlock,
  SolveDeclaration
} from './ast.mjs';

export class ParseError extends Error {
  constructor(message, token) {
    const location = token ? ` at ${token.line}:${token.column}` : '';
    super(`Parse error${location}: ${message}`);
    this.name = 'ParseError';
    this.token = token;
  }
}

export class Parser {
  constructor(tokens, options = {}) {
    // Keep NEWLINE tokens - they separate statements
    this.tokens = tokens;
    this.pos = 0;
    this.sourceName = options.sourceName || null;
    this.commentPolicy = options.commentPolicy || null; // null => infer
    this.warnings = [];
    this.maxWarnings = Number.isFinite(options.maxWarnings) ? options.maxWarnings : 200;
    this._warningsTruncated = 0;
  }

  /**
   * Parse tokens into AST
   * @returns {Program} AST root
   */
  parse() {
    const statements = [];
    let maxIterations = this.tokens.length * 2;  // Safety limit

    while (!this.isEof() && maxIterations-- > 0) {
      // Skip leading newlines
      this.skipNewlines();
      if (this.isEof()) break;

      const startPos = this.pos;
      const stmt = this.parseTopLevel();
      if (stmt) {
        statements.push(stmt);
      }

      // SAFETY: If we didn't advance, we hit an unrecognized token - throw error
      if (this.pos === startPos && !this.isEof()) {
        const badToken = this.peek();
        throw new ParseError(
          `Unexpected token '${badToken.value || badToken.type}'`,
          badToken
        );
      }

      // Skip trailing newlines after statement
      this.skipNewlines();
    }

    const program = new Program(statements);
    program.warnings = this.warnings.slice();
    if (this._warningsTruncated > 0) {
      program.warningsTruncated = this._warningsTruncated;
    }
    if (this.sourceName) {
      program.sourceName = this.sourceName;
    }
    return program;
  }

  /**
   * Parse top-level declaration or statement
   */
  parseTopLevel() {
    const token = this.peek();

    // Comment-only lines are ignored.
    if (token.type === TOKEN_TYPES.COMMENT) {
      this.advance();
      return null;
    }

    // Check for primary theory syntax: @Name theory <geometry> <init> ... end
    if (token.type === TOKEN_TYPES.AT) {
      // Look ahead to see if next token after identifier is 'theory' keyword
      const savedPos = this.pos;
      this.advance(); // consume @name

      // Solve block syntax: @dest solve ProblemType ... end
      // NOTE: `solve` is currently lexed as an IDENTIFIER (not a KEYWORD).
      if (this.check(TOKEN_TYPES.IDENTIFIER) && this.peek().value === 'solve') {
        // Heuristic disambiguation:
        // - solve *statement* form keeps options on the same line (often via a list/compound).
        // - solve *block* form uses NEWLINE + declarations + KEYWORD 'end'.
        //
        // If we see an immediate NEWLINE after the problem type and we can find a terminating
        // 'end' before the next '@' statement, parse as a SolveBlock.
        this.advance(); // consume 'solve'
        if (this.check(TOKEN_TYPES.IDENTIFIER)) {
          this.advance(); // consume ProblemType
          if (this.check(TOKEN_TYPES.NEWLINE)) {
            let foundEnd = false;
            for (let i = this.pos; i < this.tokens.length; i++) {
              const t = this.tokens[i];
              if (!t) break;
              if (t.type === TOKEN_TYPES.AT) break;
              if (t.type === TOKEN_TYPES.KEYWORD && t.value === 'end') {
                foundEnd = true;
                break;
              }
            }
            if (foundEnd) {
              this.pos = savedPos; // rewind
              return this.parseSolveBlock();
            }
          }
        }
      }

      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'theory') {
        // This is the primary theory syntax
        this.pos = savedPos; // rewind
        return this.parseTheoryPrimary();
      }

      // Not a theory or solve block, rewind and parse as normal statement
      this.pos = savedPos;
    }

    if (token.type === TOKEN_TYPES.KEYWORD) {
      switch (token.value) {
        case 'theory':
          return this.parseTheoryBracket(); // Alternative bracket syntax
      }
    }

    return this.parseStatement();
  }

  inferCommentPolicy() {
    if (this.commentPolicy) return this.commentPolicy;
    const env = String(process?.env?.SYS2DSL_COMMENT_POLICY || '').trim().toLowerCase();
    if (env === 'off' || env === 'warn' || env === 'require') return env;

    // Default: warn only for loaded theory packs (Core/Kernel/etc.), not for ad-hoc user input.
    const src = this.sourceName ? String(this.sourceName) : '';
    if (src.includes('/config/Packs/')) return 'warn';
    return 'off';
  }

  addWarning(message, token) {
    if (this.warnings.length >= this.maxWarnings) {
      this._warningsTruncated++;
      return;
    }
    this.warnings.push({
      message: String(message || 'Warning'),
      file: this.sourceName || null,
      line: token?.line ?? null,
      column: token?.column ?? null
    });
  }

  warnMissingOrWeakComment(kind, locationToken, commentText) {
    const policy = this.inferCommentPolicy();
    if (policy === 'off') return;

    const text = String(commentText || '').trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    if (wordCount >= 3) return;

    const prefix = text ? 'Comment too short' : 'Missing comment';
    const suffix = text ? ` (${wordCount} words)` : '';
    this.addWarning(`${prefix} for ${kind}; add an inline explanation with at least 3 words.${suffix}`, locationToken);
  }

  /**
   * Parse theory declaration - PRIMARY syntax
   * @Name theory <geometry> <init> ... end
   */
  parseTheoryPrimary() {
    const atToken = this.expect(TOKEN_TYPES.AT);
    const name = atToken.value.split(':')[0]; // Handle @name:persist format
    const startLine = atToken.line;
    const startColumn = atToken.column;

    this.expect(TOKEN_TYPES.KEYWORD, 'theory');

    // Parse geometry (required)
    const geometryToken = this.expect(TOKEN_TYPES.NUMBER);
    const geometry = geometryToken.value;

    // Parse init type (required): deterministic or random
    const initToken = this.expect(TOKEN_TYPES.IDENTIFIER);
    const initType = initToken.value;
    if (initType !== 'deterministic' && initType !== 'random') {
      throw new ParseError(`Expected 'deterministic' or 'random', got '${initType}'`, initToken);
    }

    this.skipNewlines();

    // Parse body until 'end' keyword
    const statements = [];
    while (!this.isEof()) {
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'end') {
        this.advance(); // consume 'end'
        break;
      }
      this.skipNewlines();
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'end') {
        this.advance();
        break;
      }
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
      this.skipNewlines();
    }

    return new TheoryDeclaration(name, statements, startLine, startColumn, {
      geometry,
      initType,
      useBracketSyntax: false
    });
  }

  /**
   * Parse theory declaration - ALTERNATIVE syntax (bracket or begin/end)
   * theory Name { statements }
   * theory Name begin statements end
   */
  parseTheoryBracket() {
    const startToken = this.expect(TOKEN_TYPES.KEYWORD, 'theory');
    const name = this.expect(TOKEN_TYPES.IDENTIFIER).value;

    // Determine block style: { }, begin/end, or [ ] (legacy)
    let useBraces = false;
    let useBeginEnd = false;
    let useBrackets = false;

    if (this.check(TOKEN_TYPES.LBRACE)) {
      this.advance(); // consume {
      useBraces = true;
    } else if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'begin') {
      this.advance(); // consume 'begin'
      useBeginEnd = true;
    } else if (this.check(TOKEN_TYPES.LBRACKET)) {
      this.advance(); // consume [
      useBrackets = true;
    } else {
      throw new ParseError("Expected '{', 'begin', or '[' after theory name", this.peek());
    }

    this.skipNewlines();

    const statements = [];

    if (useBraces) {
      while (!this.check(TOKEN_TYPES.RBRACE) && !this.isEof()) {
        this.skipNewlines();
        if (this.check(TOKEN_TYPES.RBRACE)) break;
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
        this.skipNewlines();
      }
      this.expect(TOKEN_TYPES.RBRACE);
    } else if (useBeginEnd) {
      while (!this.isEof()) {
        this.skipNewlines();
        if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'end') {
          this.advance(); // consume 'end'
          break;
        }
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
        this.skipNewlines();
      }
    } else {
      // Legacy bracket syntax
      while (!this.check(TOKEN_TYPES.RBRACKET) && !this.isEof()) {
        this.skipNewlines();
        if (this.check(TOKEN_TYPES.RBRACKET)) break;
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
        this.skipNewlines();
      }
      this.expect(TOKEN_TYPES.RBRACKET);
    }

    return new TheoryDeclaration(name, statements, startToken.line, startToken.column, {
      geometry: null, // Uses session default
      initType: 'deterministic',
      useBracketSyntax: true
    });
  }

  /**
   * Parse statement
   * [@dest] or [@dest:persistName] operator arg1 arg2 ...
   * @dest = temporary variable (scope only)
   * @dest:persistName = persistent fact (added to KB)
   *
   * Also handles graph definitions (HDC point relationship graphs):
   * @name:persistName graph param1 param2 ...
   *   body statements
   *   return $result
   * end
   *
   * Note: 'macro' is still accepted as a deprecated synonym for 'graph'
   */
  parseStatement() {
    let destination = null;
    let persistName = null;
    let startLine = this.peek().line;
    let startColumn = this.peek().column;
    let statementTokenForWarnings = this.peek();

    // Optional destination with optional persist name
    if (this.check(TOKEN_TYPES.AT)) {
      const destToken = this.advance();
      const destValue = destToken.value;
      startLine = destToken.line;
      startColumn = destToken.column;
      statementTokenForWarnings = destToken;
      // Check if it has :persistName suffix
      if (destValue.includes(':')) {
        const parts = destValue.split(':');
        destination = parts[0];
        persistName = parts[1];
      } else {
        destination = destValue;
      }
    }

    // Check if this is a graph definition (or macro - deprecated synonym)
    if (this.check(TOKEN_TYPES.KEYWORD) &&
        (this.peek().value === 'graph' || this.peek().value === 'macro')) {
      return this.parseGraph(destination, persistName, startLine, startColumn, statementTokenForWarnings);
    }

    // Operator
    const operator = this.parseExpression();
    if (!operator) {
      if (destination !== null || persistName !== null) {
        throw new ParseError('Expected an operator after @destination (use $name to reference bindings)', this.peek());
      }
      return null;
    }

    // Arguments
    const args = [];
    while (!this.isEof() && !this.isStatementEnd()) {
      if (this.check(TOKEN_TYPES.AT)) {
        throw new ParseError(
          "Multiple '@' tokens on a single line are not allowed. Only the destination may use '@'. Use '$name' to reference an existing binding.",
          this.peek()
        );
      }
      const arg = this.parseExpression();
      if (!arg) break;
      args.push(arg);
    }

    let commentText = null;
    let commentToken = null;
    if (this.check(TOKEN_TYPES.COMMENT)) {
      commentToken = this.advance();
      commentText = String(commentToken.value || '').trim();
    }

    const stmt = new Statement(
      destination,
      operator,
      args,
      operator.line,
      operator.column,
      persistName  // New: pass persist name to Statement
    );
    stmt.source = { file: this.sourceName || null, line: startLine, column: startColumn };
    stmt.comment = commentText;
    stmt.commentColumn = commentToken?.column ?? null;
    this.warnMissingOrWeakComment('statement', statementTokenForWarnings, commentText);
    return stmt;
  }

  /**
   * Parse graph definition (HDC point relationship graph)
   * @name:persistName graph param1 param2 ...
   *   body statements
   *   return $result
   * end
   *
   * Note: 'macro' keyword is still accepted as a deprecated synonym
   */
  parseGraph(destination, persistName, line, column, headerTokenForWarnings) {
    // Consume 'graph' or 'macro' keyword (both accepted)
    const keyword = this.peek().value;
    if (keyword !== 'graph' && keyword !== 'macro') {
      throw new ParseError(`Expected 'graph' or 'macro', got '${keyword}'`, this.peek());
    }
    this.advance();

    // Parse parameter names (identifiers until newline/end of line)
    const params = [];
    while (!this.isEof() && !this.check(TOKEN_TYPES.NEWLINE) && !this.check(TOKEN_TYPES.COMMENT)) {
      if (this.check(TOKEN_TYPES.IDENTIFIER)) {
        params.push(this.advance().value);
      } else if (this.check(TOKEN_TYPES.AT)) {
        throw new ParseError(
          "Multiple '@' tokens on a single line are not allowed. Graph parameters must be identifiers, and references must use '$name'.",
          this.peek()
        );
      } else {
        break;
      }
    }

    let headerCommentText = null;
    let headerCommentToken = null;
    if (this.check(TOKEN_TYPES.COMMENT)) {
      headerCommentToken = this.advance();
      headerCommentText = String(headerCommentToken.value || '').trim();
    }

    // Skip newline after graph header
    this.skipNewlines();

    // Parse body statements until 'end' keyword
    const body = [];
    let returnExpr = null;
    let returnComment = null;
    let returnTokenForWarnings = null;

    while (!this.isEof()) {
      // Check for 'end' keyword
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'end') {
        this.advance(); // consume 'end'
        break;
      }

      // Check for 'return' keyword
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'return') {
        returnTokenForWarnings = this.advance(); // consume 'return'
        returnExpr = this.parseReturnExpression();
        if (this.check(TOKEN_TYPES.COMMENT)) {
          const t = this.advance();
          returnComment = String(t.value || '').trim();
        }
        this.warnMissingOrWeakComment('graph return', returnTokenForWarnings, returnComment);
        this.skipNewlines();
        continue;
      }

      // Parse normal statement as part of graph body
      const startPos = this.pos;
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      if (this.pos === startPos && !this.isEof()) {
        const badToken = this.peek();
        throw new ParseError(
          `Unexpected token '${badToken.value || badToken.type}' in graph body`,
          badToken
        );
      }
      this.skipNewlines();
    }

    const graph = new GraphDeclaration(
      destination,
      persistName,
      params,
      body,
      returnExpr,
      line,
      column
    );
    graph.source = { file: this.sourceName || null, line, column };
    graph.comment = headerCommentText;
    graph.commentColumn = headerCommentToken?.column ?? null;
    graph.returnComment = returnComment;
    graph.returnSource = returnExpr ? { file: this.sourceName || null, line: returnExpr.line, column: returnExpr.column } : null;
    this.warnMissingOrWeakComment('graph header', headerTokenForWarnings, headerCommentText);
    return graph;
  }

  /**
   * Parse graph return expression.
   *
   * Historically, return lines were written either as:
   *   return $x
   * or (in many generated stress theories):
   *   return And $x (And $y ...)
   *
   * The latter uses the statement-style prefix call syntax without parentheses.
   * In graph bodies we allow that form specifically for `return`, by parsing
   * the entire remainder of the line as a single Compound expression.
   */
  parseReturnExpression() {
    const first = this.parseExpression();
    if (!first) return null;

    const args = [];
    while (!this.isStatementEnd() && !this.isEof()) {
      if (this.check(TOKEN_TYPES.AT)) {
        throw new ParseError(
          "Multiple '@' tokens on a single line are not allowed. Use '$name' to reference bindings in return expressions.",
          this.peek()
        );
      }
      const arg = this.parseExpression();
      if (!arg) break;
      args.push(arg);
    }

    if (args.length === 0) return first;
    return new Compound(first, args, first.line, first.column);
  }

  /**
   * Parse expression
   */
  parseExpression() {
    const token = this.peek();

    if (this.isEof()) return null;

    switch (token.type) {
      case TOKEN_TYPES.IDENTIFIER:
        return this.parseIdentifier();

      case TOKEN_TYPES.HOLE:
        return this.parseHole();

      case TOKEN_TYPES.REFERENCE:
        return this.parseReference();

      case TOKEN_TYPES.NUMBER:
        return this.parseNumber();

      case TOKEN_TYPES.STRING:
        return this.parseString();

      case TOKEN_TYPES.LBRACKET:
        return this.parseList();

      case TOKEN_TYPES.LPAREN:
        // Parenthesized expression: (operator arg1 arg2 ...)
        // Used for nested graph calls in Core theories
        return this.parseCompound();

      default:
        return null;
    }
  }

  /**
   * Parse identifier
   */
  parseIdentifier() {
    const token = this.expect(TOKEN_TYPES.IDENTIFIER);
    const node = new Identifier(token.value, token.line, token.column);
    node.source = { file: this.sourceName || null, line: token.line, column: token.column };
    return node;
  }

  /**
   * Parse hole (?variable)
   */
  parseHole() {
    const token = this.expect(TOKEN_TYPES.HOLE);
    const node = new Hole(token.value, token.line, token.column);
    node.source = { file: this.sourceName || null, line: token.line, column: token.column };
    return node;
  }

  /**
   * Parse reference ($name)
   */
  parseReference() {
    const token = this.expect(TOKEN_TYPES.REFERENCE);
    const node = new Reference(token.value, token.line, token.column);
    node.source = { file: this.sourceName || null, line: token.line, column: token.column };
    return node;
  }

  /**
   * Parse number literal
   */
  parseNumber() {
    const token = this.expect(TOKEN_TYPES.NUMBER);
    const node = new Literal(token.value, 'number', token.line, token.column);
    node.source = { file: this.sourceName || null, line: token.line, column: token.column };
    return node;
  }

  /**
   * Parse string literal
   */
  parseString() {
    const token = this.expect(TOKEN_TYPES.STRING);
    const node = new Literal(token.value, 'string', token.line, token.column);
    node.source = { file: this.sourceName || null, line: token.line, column: token.column };
    return node;
  }

  /**
   * Parse list
   * [item1, item2, ...]
   */
  parseList() {
    const startToken = this.expect(TOKEN_TYPES.LBRACKET);

    const items = [];
    while (!this.check(TOKEN_TYPES.RBRACKET) && !this.isEof()) {
      // Allow multi-line lists:
      // [
      //   (a b),
      //   (c d)
      // ]
      this.skipNewlines();
      if (this.check(TOKEN_TYPES.RBRACKET) || this.isEof()) break;

      const item = this.parseExpression();
      if (!item) break;
      items.push(item);

      this.skipNewlines();
      if (this.check(TOKEN_TYPES.COMMA)) {
        this.advance();
      }
    }

    this.expect(TOKEN_TYPES.RBRACKET);
    const node = new List(items, startToken.line, startToken.column);
    node.source = { file: this.sourceName || null, line: startToken.line, column: startToken.column };
    return node;
  }

  /**
   * Parse compound expression (nested graph call)
   * (operator arg1 arg2 ...)
   * Used for nested graph calls like (__Pair $cause $effect)
   */
  parseCompound() {
    const startToken = this.expect(TOKEN_TYPES.LPAREN);

    // First element is the operator
    const operator = this.parseExpression();
    if (!operator) {
      // Empty parens - skip to closing
      while (!this.check(TOKEN_TYPES.RPAREN) && !this.isEof()) {
        this.advance();
      }
      if (this.check(TOKEN_TYPES.RPAREN)) {
        this.advance();
      }
      return null;
    }

    // Parse remaining arguments
    const args = [];
    while (!this.check(TOKEN_TYPES.RPAREN) && !this.isEof()) {
      const arg = this.parseExpression();
      if (!arg) break;
      args.push(arg);
    }

    this.expect(TOKEN_TYPES.RPAREN);
    const node = new Compound(operator, args, startToken.line, startToken.column);
    node.source = { file: this.sourceName || null, line: startToken.line, column: startToken.column };
    return node;
  }

  /**
   * Check if at statement boundary
   */
  isStatementEnd() {
    const token = this.peek();
    return token.type === TOKEN_TYPES.EOF ||
           token.type === TOKEN_TYPES.NEWLINE ||
           token.type === TOKEN_TYPES.COMMENT ||
           token.type === TOKEN_TYPES.KEYWORD ||
           token.type === TOKEN_TYPES.RBRACKET;
  }

  /**
   * Skip any newline tokens
   */
  skipNewlines() {
    while (this.check(TOKEN_TYPES.NEWLINE) || this.check(TOKEN_TYPES.COMMENT)) {
      this.advance();
    }
  }

  // Token navigation helpers

  peek() {
    return this.tokens[this.pos] || new Token(TOKEN_TYPES.EOF, null, 0, 0);
  }

  advance() {
    const token = this.peek();
    if (!this.isEof()) this.pos++;
    return token;
  }

  check(type, value = null) {
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    return true;
  }

  expect(type, value = null) {
    const token = this.advance();
    if (token.type !== type) {
      throw new ParseError(
        `Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value}'`,
        token
      );
    }
    if (value !== null && token.value !== value) {
      throw new ParseError(`Expected '${value}', got '${token.value}'`, token);
    }
    return token;
  }

  /**
   * Parse solve block: @dest solve ProblemType ... end
   */
  parseSolveBlock() {
    const startLine = this.peek().line;
    const startColumn = this.peek().column;

    // Consume @destination (AT token already contains the destination name)
    const destToken = this.expect(TOKEN_TYPES.AT);
    const destinationRaw = destToken.value;
    if (typeof destinationRaw !== 'string' || destinationRaw.trim().length === 0) {
      throw new ParseError('Expected destination after @ in solve block', destToken);
    }
    // Solve blocks do not support the @:name or @var:name persistence syntax (they emit their own outputs).
    if (destinationRaw.includes(':')) {
      throw new ParseError('Solve blocks do not support @:name or @var:name destinations', destToken);
    }
    const destination = destinationRaw;

    // Consume 'solve' (currently lexed as IDENTIFIER; accept either for compatibility)
    const solveToken = this.advance();
    const isSolve =
      (solveToken.type === TOKEN_TYPES.IDENTIFIER && solveToken.value === 'solve') ||
      (solveToken.type === TOKEN_TYPES.KEYWORD && solveToken.value === 'solve');
    if (!isSolve) {
      throw new ParseError("Expected 'solve' in solve block", solveToken);
    }

    // Get problem type
    const problemTypeToken = this.expect(TOKEN_TYPES.IDENTIFIER);
    const problemType = problemTypeToken.value;

    this.skipNewlines();

    // Parse declarations until 'end'
    const declarations = [];
    while (!this.isEof()) {
      this.skipNewlines();
      
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'end') {
        this.advance(); // consume 'end'
        break;
      }

      const decl = this.parseSolveDeclaration();
      if (decl) declarations.push(decl);
    }

    return new SolveBlock(destination, problemType, declarations, startLine, startColumn);
  }

  /**
   * Parse solve declaration: varName kind source
   * e.g., "guests from Guest" or "noConflict conflictsWith"
   */
  parseSolveDeclaration() {
    const line = this.peek().line;
    const column = this.peek().column;

    const solveKeywords = new Set(['from', 'noConflict', 'allDifferent']);
    const isSolveKeywordToken = (token) => {
      if (!token) return false;
      if (token.type !== TOKEN_TYPES.KEYWORD && token.type !== TOKEN_TYPES.IDENTIFIER) {
        return false;
      }
      return solveKeywords.has(token.value);
    };

    let varName, kind, source;
    const firstToken = this.peek();

    if (firstToken.type === TOKEN_TYPES.IDENTIFIER && !isSolveKeywordToken(firstToken)) {
      // Pattern: identifier 'from' Identifier (e.g., "guests from Guest")
      const varNameToken = this.advance();
      varName = varNameToken.value;

      const kindToken = this.advance();
      if (!isSolveKeywordToken(kindToken) || kindToken.value !== 'from') {
        throw new ParseError("Expected 'from' in solve declaration", kindToken || varNameToken);
      }
      kind = kindToken.value;

      const sourceToken = this.advance();
      if (sourceToken.type !== TOKEN_TYPES.IDENTIFIER && sourceToken.type !== TOKEN_TYPES.NUMBER) {
        throw new ParseError("Expected identifier or number in solve declaration", sourceToken);
      }
      source = sourceToken.value;
    } else if (isSolveKeywordToken(firstToken)) {
      // Pattern: solve keyword identifier (e.g., "noConflict conflictsWith")
      const kindToken = this.advance();
      kind = kindToken.value;

      const sourceToken = this.expect(TOKEN_TYPES.IDENTIFIER);
      source = sourceToken.value;

      // For constraint declarations, varName mirrors the keyword kind
      varName = kind;
    } else {
      throw new ParseError('Expected identifier or solve keyword in solve declaration', firstToken);
    }

    return new SolveDeclaration(varName, kind, source, line, column);
  }

  isEof() {
    return this.pos >= this.tokens.length || this.peek().type === TOKEN_TYPES.EOF;
  }
}

/**
 * Parse DSL string into AST
 * @param {string} input - DSL source code
 * @returns {Program} AST
 */
export function parse(input) {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Parse DSL string into AST with optional source metadata.
 * @param {string} input - DSL source code
 * @param {object} options
 * @param {string|null} options.sourceName
 * @param {'off'|'warn'|'require'|null} options.commentPolicy
 * @param {number} options.maxWarnings
 */
export function parseWithOptions(input, options = {}) {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, options);
  return parser.parse();
}

export default { Parser, parse, parseWithOptions, ParseError };
