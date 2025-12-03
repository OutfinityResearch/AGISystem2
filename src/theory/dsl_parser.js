/**
 * DS(/theory/dsl_parser.js) - Sys2DSL Parser and Topological Sorter
 *
 * Handles parsing of Sys2DSL v3.0 strict triple syntax.
 *
 * v3.0 Syntax: Every statement is exactly 4 tokens:
 *   @variable Subject VERB Object
 *
 * Key concepts:
 * - Statements: @varName Subject VERB Object (exactly 4 tokens)
 * - VERB is the command (position 2)
 * - Subject/Object are arguments (positions 1 and 3)
 * - Variables: $varName references
 * - Topological ordering: Kahn's algorithm for dependency resolution
 *
 * Semantic interpretation:
 * - @_ prefix: Assertion (add fact or execute effectful command)
 * - @varName prefix: Query (capture result in variable)
 *
 * @module theory/dsl_parser
 */

class DSLParser {
  /**
   * Split input lines into statement objects.
   * v3.0 Syntax: @variable Subject VERB Object (exactly 4 tokens)
   * @param {string[]} lines - Raw Sys2DSL lines
   * @returns {Array<{varName: string, command: string, subject: string, object: string, args: string[], raw: string}>}
   */
  splitIntoStatements(lines) {
    const statements = [];

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const flushSegment = (segment) => {
        const seg = segment.trim();
        if (!seg) {
          return;
        }
        // Smart tokenize: preserve quoted strings as single tokens
        const tokens = this._tokenizeArgs(seg);

        // v3.0 strict: exactly 4 tokens required
        if (tokens.length !== 4) {
          throw new Error(
            `Invalid Sys2DSL v3 statement: '${seg}'. ` +
            `Expected exactly 4 tokens: @variable Subject VERB Object. ` +
            `Got ${tokens.length} tokens: [${tokens.join(', ')}]`
          );
        }
        if (!tokens[0].startsWith('@')) {
          throw new Error(`Invalid Sys2DSL statement: '${seg}'. Must start with @variable`);
        }

        const varName = tokens[0].slice(1);     // Position 0: @variable
        const subject = tokens[1];               // Position 1: Subject
        const command = tokens[2].toUpperCase(); // Position 2: VERB (command)
        const object = tokens[3];                // Position 3: Object

        // Args include subject and object for command handlers
        statements.push({
          varName,
          command,
          subject,
          object,
          args: [subject, object],
          raw: seg
        });
      };

      // Within each line, if additional '@' appear, treat them as new statements.
      let current = '';
      for (let pos = 0; pos < trimmed.length; pos += 1) {
        const ch = trimmed[pos];
        if (ch === '@' && current.trim().length > 0) {
          flushSegment(current);
          current = '@';
        } else {
          current += ch;
        }
      }
      if (current.trim().length > 0) {
        flushSegment(current);
      }
    }

    return statements;
  }

  /**
   * Tokenize a segment respecting quoted strings
   * Handles: key="value with spaces" key2=value
   * @param {string} segment - Raw segment to tokenize
   * @returns {string[]} - Array of tokens
   */
  _tokenizeArgs(segment) {
    const tokens = [];
    let current = '';
    let inQuote = false;
    let quoteChar = null;

    for (let i = 0; i < segment.length; i++) {
      const ch = segment[i];

      if (!inQuote && (ch === '"' || ch === "'")) {
        inQuote = true;
        quoteChar = ch;
        current += ch;
      } else if (inQuote && ch === quoteChar) {
        inQuote = false;
        current += ch;
        quoteChar = null;
      } else if (!inQuote && /\s/.test(ch)) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }

    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Sort statements in topological order based on variable dependencies.
   * Uses Kahn's algorithm.
   * @param {Array} statements - Parsed statements
   * @returns {Array} - Statements in execution order
   */
  topologicalOrder(statements) {
    const nameToStmt = new Map();

    for (const stmt of statements) {
      // @_ is a special "discard" variable that can be used multiple times
      // It means "execute this statement but don't capture the result"
      if (stmt.varName === '_') {
        stmt.deps = new Set();
        stmt.dependents = [];
        stmt.inDegree = 0;
        continue; // Don't add to nameToStmt - can appear multiple times
      }

      // All other variable names must be unique
      if (nameToStmt.has(stmt.varName)) {
        throw new Error(`Duplicate Sys2DSL variable '${stmt.varName}'`);
      }
      nameToStmt.set(stmt.varName, stmt);
      stmt.deps = new Set();
      stmt.dependents = [];
      stmt.inDegree = 0;
    }

    const varRefRegex = /\$([A-Za-z0-9_]+)/g;
    for (const stmt of statements) {
      const argsJoined = stmt.args.join(' ');
      let match;
      while ((match = varRefRegex.exec(argsJoined)) !== null) {
        const depName = match[1];
        if (depName === stmt.varName) {
          throw new Error(`Cyclic Sys2DSL dependency on variable '${depName}'`);
        }
        if (nameToStmt.has(depName)) {
          stmt.deps.add(depName);
        }
      }
    }

    for (const stmt of statements) {
      for (const depName of stmt.deps) {
        const depStmt = nameToStmt.get(depName);
        depStmt.dependents.push(stmt);
        stmt.inDegree += 1;
      }
    }

    // Kahn's algorithm
    const queue = [];
    for (const stmt of statements) {
      if (stmt.inDegree === 0) {
        queue.push(stmt);
      }
    }

    const ordered = [];
    while (queue.length > 0) {
      const stmt = queue.shift();
      ordered.push(stmt);
      for (const dep of stmt.dependents) {
        dep.inDegree -= 1;
        if (dep.inDegree === 0) {
          queue.push(dep);
        }
      }
    }

    if (ordered.length !== statements.length) {
      const unresolved = statements
        .filter((s) => s.inDegree > 0)
        .map((s) => s.varName);
      throw new Error(`Cyclic Sys2DSL dependencies detected for variables: ${unresolved.join(', ')}`);
    }

    return ordered;
  }

  /**
   * Expand variable references in a string.
   * @param {string} str - String with $varName references
   * @param {Object} env - Variable environment
   * @returns {string} - Expanded string
   */
  expandString(str, env) {
    if (!str) {
      return '';
    }
    const unquoted = this.stripQuotes(str);
    return unquoted.replace(/\$([A-Za-z0-9_]+)/g, (match, name) => {
      if (Object.prototype.hasOwnProperty.call(env, name)) {
        const v = env[name];
        if (v == null) {
          return '';
        }
        return String(v);
      }
      return '';
    });
  }

  /**
   * Strip surrounding quotes from a string.
   * @param {string} str - Input string
   * @returns {string} - Unquoted string
   */
  stripQuotes(str) {
    if (
      (str.startsWith('"') && str.endsWith('"'))
      || (str.startsWith('\'') && str.endsWith('\''))
    ) {
      return str.slice(1, -1);
    }
    return str;
  }

  /**
   * Resolve a variable from environment.
   * @param {string} token - Variable token ($name or name)
   * @param {Object} env - Variable environment
   * @returns {*} - Resolved value
   */
  resolveVar(token, env) {
    const name = token.startsWith('$') ? token.slice(1) : token;
    return Object.prototype.hasOwnProperty.call(env, name) ? env[name] : undefined;
  }

  /**
   * Resolve a variable as an array.
   * @param {string} token - Variable token
   * @param {Object} env - Variable environment
   * @returns {Array} - Array value (wraps non-arrays)
   */
  resolveVarAsArray(token, env) {
    const value = this.resolveVar(token, env);
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  }

  /**
   * Check if a pattern token matches a value.
   * Simple string equality - no wildcards needed.
   * Use polymorphic FACTS_MATCHING instead (1, 2, or 3 args).
   * @param {string} patternToken - Pattern to match
   * @param {string} value - Value to match
   * @returns {boolean}
   */
  tokenMatches(patternToken, value) {
    return String(patternToken) === String(value);
  }

  /**
   * Validate that a triplet argument does not contain property=value syntax.
   * @param {string} token - Token to validate
   * @param {string} position - Position name for error message
   */
  validateNoPropertyValue(token, position) {
    if (token && token.includes('=') && !token.startsWith('"')) {
      throw new Error(
        `Invalid ${position} '${token}': property=value syntax not allowed in triplets. ` +
        `Each value must be a separate concept. Example: Instead of 'HAS_PROPERTY temp=100', ` +
        `use 'HAS_TEMPERATURE Celsius100' or define a specific relation.`
      );
    }
  }
}

module.exports = DSLParser;
