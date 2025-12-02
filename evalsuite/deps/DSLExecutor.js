/**
 * DSLExecutor - Executes Sys2DSL v3.0 scripts
 *
 * Simplified executor for test validation.
 * No LLM dependencies - pure DSL execution.
 */

class DSLExecutor {
  constructor(options = {}) {
    this.engine = null;
    this.profile = options.profile || 'test';
    this.verbose = options.verbose || false;
  }

  /**
   * Initialize the DSL engine
   */
  async init() {
    try {
      // Load the DSL engine
      const TheoryDSLEngine = require('../../src/theory/dsl_engine');
      const ConceptStore = require('../../src/knowledge/concept_store');

      const store = new ConceptStore(64);
      this.store = store;

      // Create a mock API that uses the concept store directly
      const mockApi = this._createMockApi(store);

      this.engine = new TheoryDSLEngine({
        api: mockApi,
        conceptStore: store,
        config: this._createConfig()
      });

      return true;
    } catch (err) {
      console.error('Failed to init DSLExecutor:', err.message);
      return false;
    }
  }

  /**
   * Create a mock API for DSL execution
   */
  _createMockApi(store) {
    const self = this;  // Capture reference for closures

    return {
      // Ingest a fact (Subject VERB Object)
      ingest: (sentence) => {
        const parts = sentence.trim().split(/\s+/);
        if (parts.length >= 3) {
          const subject = parts[0];
          const relation = parts[1];
          const object = parts.slice(2).join(' ');
          store.addFact({ subject, relation, object });
          return { ok: true, subject, relation, object };
        }
        throw new Error(`Invalid sentence: ${sentence}`);
      },

      // Ask a question (Subject VERB Object?)
      ask: (question) => {
        const clean = question.replace(/[?"]/g, '').trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 3) {
          const subject = parts[0];
          const relation = parts[1];
          const object = parts.slice(2).join(' ');

          // Check if the fact exists
          const facts = store.getFacts();
          const match = facts.find(f =>
            f.subject === subject &&
            f.relation === relation &&
            f.object === object
          );

          if (match) {
            return { truth: 'TRUE_CERTAIN', kind: 'assertion', subject, relation, object };
          }

          // Check for transitive IS_A
          if (relation === 'IS_A') {
            const chain = self._findIsAChain(store, subject, object);
            if (chain) {
              return { truth: 'TRUE_CERTAIN', kind: 'transitive', chain };
            }
          }

          // Check for disjoint
          const disjoint = facts.find(f =>
            f.relation === 'DISJOINT_WITH' &&
            ((f.subject === subject && f.object === object) ||
             (f.subject === object && f.object === subject))
          );
          if (disjoint) {
            return { truth: 'FALSE', kind: 'disjoint' };
          }

          return { truth: 'UNKNOWN', kind: 'not_found' };
        }
        return { truth: 'ERROR', kind: 'invalid_question' };
      },

      // Abduct (find causes for an observation)
      abduct: (observation, relation) => {
        const facts = store.getFacts();
        const related = facts.filter(f => f.object === observation || f.subject === observation);
        return { hypotheses: related, observation };
      },

      // Counterfactual ask
      counterfactualAsk: (question, cfFacts) => {
        // Simple implementation: temporarily add facts, ask, then rollback
        return { truth: 'UNKNOWN', kind: 'counterfactual' };
      }
    };
  }

  /**
   * Find IS_A chain using BFS
   */
  _findIsAChain(store, from, to) {
    const facts = store.getFacts();
    const visited = new Set();
    const queue = [{ node: from, path: [from] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift();
      if (node === to) {
        return path;
      }
      if (visited.has(node)) continue;
      visited.add(node);

      // Find IS_A edges
      const edges = facts.filter(f => f.subject === node && f.relation === 'IS_A');
      for (const edge of edges) {
        if (!visited.has(edge.object)) {
          queue.push({ node: edge.object, path: [...path, edge.object] });
        }
      }
    }
    return null;
  }

  /**
   * Create a minimal config object
   */
  _createConfig() {
    const settings = {
      profile: this.profile,
      dimensions: 64
    };
    return {
      get: (key) => settings[key],
      set: (key, value) => { settings[key] = value; }
    };
  }

  /**
   * Execute a single Sys2DSL statement
   * @param {string} dsl - The DSL statement (e.g., "@r Dog IS_A animal")
   * @returns {Object} Result with variable bindings
   */
  execute(dsl) {
    if (!this.engine) {
      throw new Error('DSLExecutor not initialized');
    }

    const lines = Array.isArray(dsl) ? dsl : dsl.split('\n').filter(l => l.trim());

    try {
      const env = this.engine.runScript(lines);
      return {
        success: true,
        env,
        error: null
      };
    } catch (err) {
      return {
        success: false,
        env: {},
        error: err.message
      };
    }
  }

  /**
   * Load facts into the engine (theory setup)
   * @param {string[]} facts - Array of fact strings (e.g., ["dog IS_A mammal"])
   */
  loadFacts(facts) {
    if (!facts || facts.length === 0) return;

    // v3.0: Use @_ prefix for assertions (discards result)
    // Each fact must be a valid triple: Subject VERB Object
    for (const fact of facts) {
      const parts = fact.trim().split(/\s+/);
      if (parts.length >= 3) {
        // Directly use the mock API to add facts
        // This avoids parser issues with multiple @_ declarations
        this.store.addFact({
          subject: parts[0],
          relation: parts[1],
          object: parts.slice(2).join(' ')
        });
      }
    }
  }

  /**
   * Execute query and return the result for a specific variable
   * @param {string} dsl - DSL query
   * @param {string} varName - Variable to extract (default: last declared)
   */
  query(dsl, varName = null) {
    const result = this.execute(dsl);

    if (!result.success) {
      return {
        success: false,
        truth: 'ERROR',
        error: result.error,
        raw: null
      };
    }

    // Find the variable to return
    const env = result.env;
    let targetVar = varName;

    if (!targetVar) {
      // Extract from DSL (first @varName that's not @_)
      const match = dsl.match(/@(\w+)\s/);
      if (match && match[1] !== '_') {
        targetVar = match[1];
      }
    }

    const value = targetVar ? env[targetVar] : Object.values(env)[0];

    return {
      success: true,
      truth: value?.truth || 'UNKNOWN',
      kind: value?.kind || 'unknown',
      raw: value,
      env
    };
  }

  /**
   * Reset the engine state
   */
  reset() {
    if (this.engine) {
      // Re-initialize for clean state
      this.init();
    }
  }
}

module.exports = DSLExecutor;
