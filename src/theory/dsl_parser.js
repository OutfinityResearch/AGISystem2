/**
 * DS(/theory/dsl_parser.js) - Sys2DSL Parser and Topological Sorter
 *
 * Handles parsing of Sys2DSL scripts and dependency-based execution order.
 *
 * Key concepts:
 * - Statements: @varName COMMAND args...
 * - Variables: $varName references
 * - Topological ordering: Kahn's algorithm for dependency resolution
 *
 * @module theory/dsl_parser
 */

class DSLParser {
  /**
   * Split input lines into statement objects.
   * @param {string[]} lines - Raw Sys2DSL lines
   * @returns {Array<{varName: string, command: string, args: string[], raw: string}>}
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
        const parts = seg.split(/\s+/);
        if (parts.length < 2 || !parts[0].startsWith('@')) {
          throw new Error(`Invalid Sys2DSL statement: '${seg}'`);
        }
        const varName = parts[0].slice(1);
        const command = parts[1].toUpperCase();
        const args = parts.slice(2);
        statements.push({ varName, command, args, raw: seg });
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
   * Sort statements in topological order based on variable dependencies.
   * Uses Kahn's algorithm.
   * @param {Array} statements - Parsed statements
   * @returns {Array} - Statements in execution order
   */
  topologicalOrder(statements) {
    const nameToStmt = new Map();

    for (const stmt of statements) {
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
   * @param {string} patternToken - Pattern ('?' is wildcard)
   * @param {string} value - Value to match
   * @returns {boolean}
   */
  tokenMatches(patternToken, value) {
    if (patternToken === '?') {
      return true;
    }
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
