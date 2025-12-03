/**
 * DirectDSLExecutor - Execute DSL directly via AGISystem2 API
 *
 * Bypasses LLM translation, tests pure reasoning engine.
 * Creates session, loads theory, executes queries.
 *
 * IMPORTANT: Returns POINTS (DSL format), not JSON!
 * Results are semantic points expressible as Sys2DSL triples.
 *
 * @module evalsuite/lib/executors/direct_dsl_executor
 */

const path = require('path');

// Lazy-load AGISystem2 modules
let AgentSystem2 = null;

/**
 * DirectDSLExecutor class
 * Executes DSL statements directly against AGISystem2
 */
class DirectDSLExecutor {
  /**
   * Create executor instance
   * @param {Object} options - Executor options
   * @param {number} [options.timeout] - Query timeout in ms
   * @param {boolean} [options.verbose] - Enable verbose logging
   * @param {boolean} [options.executeProofs] - Execute PROOF_DSL for validation
   */
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.executeProofs = options.executeProofs !== false;
    this.session = null;
    this.agent = null;
  }

  /**
   * Start the executor - initialize AGISystem2
   */
  async start() {
    // Lazy load AgentSystem2
    if (!AgentSystem2) {
      // From evalsuite/lib/executors/ up 3 levels to AGISystem2
      const basePath = path.resolve(__dirname, '../../..');
      AgentSystem2 = require(path.join(basePath, 'src/interface/agent_system2'));
    }

    // Create agent and session
    this.agent = new AgentSystem2({ profile: 'auto_test' });
    this.session = this.agent.createSession({ skipPreload: true });

    if (this.verbose) {
      console.log('  DirectDSLExecutor: AGI system initialized');
    }
  }

  /**
   * Load theory facts into the session
   * @param {string[]} facts - Array of DSL facts
   */
  loadTheory(facts) {
    if (!this.session) {
      throw new Error('Executor not started');
    }

    if (!facts || facts.length === 0) return;

    const lines = facts.map((fact, idx) => {
      // Convert bare facts to @f<idx> declarations
      if (!fact.trim().startsWith('@')) {
        return `@f${idx} ${fact.trim()}`;
      }
      return fact.trim();
    }).filter(l => l && !l.startsWith('#'));

    this.session.run(lines);

    if (this.verbose) {
      console.log(`  DirectDSLExecutor: Loaded ${lines.length} theory facts`);
    }
  }

  /**
   * Send DSL statements for execution
   * Returns a POINT (DSL format), not JSON!
   *
   * @param {string} message - DSL statements to execute
   * @param {string} [queryId] - Optional query identifier
   * @returns {Promise<string>} DSL point representation
   */
  async send(message, queryId = null) {
    if (!this.session) {
      throw new Error('Executor not started');
    }

    try {
      const trimmed = message.trim();

      // Check if message looks like DSL (starts with @)
      if (trimmed.startsWith('@') || trimmed.includes('ASSERT') || trimmed.includes('ASK')) {
        // Direct DSL execution
        const lines = trimmed.split('\n').filter(l => l.trim());
        this.session.run(lines);

        // Extract result variable and original triple
        const varMatch = trimmed.match(/@(\w+)/g);
        if (varMatch) {
          let targetVar;
          if (queryId) {
            targetVar = queryId;
          } else {
            targetVar = varMatch[0].slice(1);
          }

          const result = this.session.getVar(targetVar);

          // Parse original triple from message to preserve it in response
          const tripleMatch = trimmed.match(/^@\w+\s+(\S+)\s+(\w+)\s+(\S+)/);
          const originalTriple = tripleMatch ? {
            subject: tripleMatch[1],
            relation: tripleMatch[2],
            object: tripleMatch[3]
          } : null;

          // Return as DSL POINT with truth value
          return this.formatAsPoint(targetVar, result, originalTriple);
        }

        return '@ok execution_completed IS_A success';
      }

      // For natural language, we can't process - return placeholder
      return '@error natural_language_not_supported IS_A failure';
    } catch (err) {
      // Return error as DSL point
      return `@error ${err.message.replace(/\s+/g, '_').substring(0, 50)} IS_A execution_error`;
    }
  }

  /**
   * Execute a query with its proof and return the result point
   *
   * @param {Object} task - Task object with TASK_DSL, PROOF_DSL
   * @returns {Promise<Object>} Result with point and validation info
   */
  async executeWithProof(task) {
    if (!this.session) {
      throw new Error('Executor not started');
    }

    const result = {
      taskId: task.id,
      queryPoint: null,
      proofResult: null,
      valid: false,
      issues: []
    };

    try {
      // Execute TASK_DSL (the query)
      if (task.TASK_DSL) {
        this.session.run([task.TASK_DSL]);
        const queryVar = task.id;
        const queryResult = this.session.getVar(queryVar);

        // Parse original triple from TASK_DSL
        const tripleMatch = task.TASK_DSL.trim().match(/^@\w+\s+(\S+)\s+(\w+)\s+(\S+)/);
        const originalTriple = tripleMatch ? {
          subject: tripleMatch[1],
          relation: tripleMatch[2],
          object: tripleMatch[3]
        } : null;

        result.queryPoint = this.formatAsPoint(queryVar, queryResult, originalTriple);
      }

      // Execute PROOF_DSL if enabled
      if (this.executeProofs && task.PROOF_DSL) {
        const proofLines = task.PROOF_DSL.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

        try {
          this.session.run(proofLines);

          // Get result and proof points
          const resultPoint = this.session.getVar('result');
          const proofPoint = this.session.getVar('proof');

          result.proofResult = {
            result: this.formatAsPoint('result', resultPoint),
            proof: this.formatAsPoint('proof', proofPoint)
          };

          // Validation: proof should exist and connect to query
          if (resultPoint && proofPoint) {
            result.valid = true;
          } else {
            if (!resultPoint) result.issues.push('No @result point produced');
            if (!proofPoint) result.issues.push('No @proof point produced');
          }
        } catch (proofErr) {
          result.issues.push(`Proof execution error: ${proofErr.message}`);
        }
      } else if (!task.PROOF_DSL) {
        result.issues.push('No PROOF_DSL provided');
      }

    } catch (err) {
      result.issues.push(`Task execution error: ${err.message}`);
    }

    return result;
  }

  /**
   * Format a result as a DSL point (not JSON!)
   *
   * Returns the original triple with truth value indicator.
   * Format: @varName subject RELATION object [truth:TRUTH_VALUE]
   *
   * @param {string} varName - Variable name
   * @param {*} value - The value from session (contains truth, resolved, etc.)
   * @param {Object} [originalTriple] - The original query triple {subject, relation, object}
   * @returns {string} DSL point representation with truth value
   */
  formatAsPoint(varName, value, originalTriple = null) {
    // Extract truth value from result
    const truth = this._extractTruth(value);

    // If we have the original triple, use it with truth indicator
    if (originalTriple && originalTriple.subject && originalTriple.relation && originalTriple.object) {
      const { subject, relation, object } = originalTriple;
      return `@${varName} ${subject} ${relation} ${object} [truth:${truth}]`;
    }

    // If no value at all
    if (!value) {
      return `@${varName} unknown IS_A unresolved [truth:UNKNOWN]`;
    }

    // Try to extract triple from value object
    if (value && typeof value === 'object') {
      // If value has s, r, o structure
      if (value.s && value.r && value.o) {
        return `@${varName} ${value.s} ${value.r} ${value.o} [truth:${truth}]`;
      }

      // If value has subject, relation, object
      if (value.subject && value.relation && value.object) {
        return `@${varName} ${value.subject} ${value.relation} ${value.object} [truth:${truth}]`;
      }

      // If value has resolved flag and the fact structure
      if (value.fact) {
        const f = value.fact;
        if (f.s && f.r && f.o) {
          return `@${varName} ${f.s} ${f.r} ${f.o} [truth:${truth}]`;
        }
      }

      // If value is a fact with triple structure
      if (value.triple) {
        const [s, r, o] = value.triple;
        return `@${varName} ${s} ${r} ${o} [truth:${truth}]`;
      }

      // For arrays (multiple results)
      if (Array.isArray(value)) {
        return `@${varName} result_set IS_A query_result [truth:${truth}]`;
      }
    }

    // For primitive values
    if (typeof value === 'string') {
      return `@${varName} ${value} IS_A value [truth:${truth}]`;
    }

    if (typeof value === 'boolean') {
      return `@${varName} ${value ? 'true' : 'false'} IS_A boolean_result [truth:${truth}]`;
    }

    if (typeof value === 'number') {
      return `@${varName} ${value} IS_A numeric_result [truth:${truth}]`;
    }

    // Fallback: use originalTriple if available, else unknown
    if (originalTriple) {
      const { subject, relation, object } = originalTriple;
      return `@${varName} ${subject} ${relation} ${object} [truth:${truth}]`;
    }

    return `@${varName} unknown_structure IS_A result [truth:${truth}]`;
  }

  /**
   * Extract truth value from a session result
   * @param {*} value - The value from session
   * @returns {string} Truth value (TRUE_CERTAIN, TRUE_LIKELY, FALSE, UNKNOWN)
   */
  _extractTruth(value) {
    if (!value) return 'UNKNOWN';

    // Direct truth property
    if (value.truth) return value.truth;

    // Check resolved flag
    if (value.resolved === true) return 'TRUE_CERTAIN';
    if (value.resolved === false) return 'FALSE';

    // Check if it's a boolean
    if (typeof value === 'boolean') return value ? 'TRUE_CERTAIN' : 'FALSE';

    // Default to UNKNOWN
    return 'UNKNOWN';
  }

  /**
   * Reset the session (clear env)
   */
  reset() {
    if (this.session) {
      this.session.reset();
    }
  }

  /**
   * Stop the executor
   */
  async stop() {
    this.session = null;
    this.agent = null;
  }
}

module.exports = DirectDSLExecutor;
