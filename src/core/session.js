/**
 * Session - API entry point for AGISystem2 with LEARNING/QUERY modes
 *
 * Implements DS-EXI and FS-OWS specifications:
 * - session.run(dsl) -> starts in LEARNING mode, executes DSL, creates facts
 * - session.ask(query) -> starts in QUERY mode, read-only, derives facts
 *
 * Session modes can be switched during execution via DSL relations:
 *   @m1 session SET_MODE learning
 *   @m2 session SET_MODE query
 *
 * @module src/core/session
 * @see docs/specs/trustworthy_ai/DS_existence_dimension.md
 * @see docs/specs/trustworthy_ai/FS_open_world_semantics.md
 */

const EXISTENCE = {
  IMPOSSIBLE: -127,
  UNPROVEN: -64,
  POSSIBLE: 0,
  DEMONSTRATED: 64,
  CERTAIN: 127
};

/**
 * Session modes
 */
const SessionMode = {
  LEARNING: 'learning',   // Creates facts with CERTAIN existence (trusted input)
  QUERY: 'query'          // Read-only, derives facts, returns existence
};

/**
 * IS_A variant relations with explicit existence levels
 */
const IS_A_EXISTENCE_MAP = {
  'IS_A_CERTAIN': EXISTENCE.CERTAIN,
  'IS_A_DEMONSTRATED': EXISTENCE.DEMONSTRATED,
  'IS_A_POSSIBLE': EXISTENCE.POSSIBLE,
  'IS_A_UNPROVEN': EXISTENCE.UNPROVEN
};

class Session {
  /**
   * Create a new session
   * @param {Object} options - Session options
   * @param {Object} options.store - ConceptStore instance
   * @param {Object} options.reasoner - Reasoner instance
   * @param {Object} [options.dslEngine] - DSL engine for parsing
   * @param {Object} [options.inferenceEngine] - InferenceEngine for advanced reasoning
   * @param {string} [options.mode='learning'] - Initial mode
   */
  constructor(options = {}) {
    this.store = options.store;
    this.reasoner = options.reasoner;
    this.dslEngine = options.dslEngine || null;
    this.inferenceEngine = options.inferenceEngine || null;
    this.mode = options.mode || SessionMode.LEARNING;
    this._contextStack = [];

    // Validate required dependencies
    if (!this.store) {
      throw new Error('Session requires a ConceptStore');
    }
    if (!this.reasoner) {
      throw new Error('Session requires a Reasoner');
    }
  }

  /**
   * Factory method to create session with dependencies
   * @param {Object} options - Creation options
   * @returns {Promise<Session>} Initialized session
   */
  static async create(options = {}) {
    // Lazy load dependencies if not provided
    if (!options.store) {
      const ConceptStore = require('../knowledge/concept_store');
      options.store = new ConceptStore({ dimensions: options.dimensions || 32 });
    }
    if (!options.reasoner) {
      const Reasoner = require('../reason/reasoner');
      options.reasoner = new Reasoner({ store: options.store });
    }

    return new Session(options);
  }

  // =========================================================================
  // API Entry Points (DS-EXI Section 3.1)
  // =========================================================================

  /**
   * Execute DSL statements in LEARNING mode
   *
   * Facts created are trusted and receive CERTAIN existence level.
   * This is the "teaching" entry point.
   *
   * @param {string|string[]} dsl - DSL statement(s) to execute
   * @returns {Promise<Object>} Execution result
   */
  async run(dsl) {
    // Set mode to LEARNING
    this.mode = SessionMode.LEARNING;

    // Execute DSL
    return this._executeDsl(dsl);
  }

  /**
   * Query the knowledge base in QUERY mode
   *
   * Read-only operation - does NOT create facts.
   * Derives facts via transitive reasoning.
   * Returns existence level or UNKNOWN.
   *
   * @param {string} query - Query string "Subject RELATION Object"
   * @param {Object} [options] - Query options
   * @param {boolean} [options.explain] - Include explanation chain
   * @param {number} [options.minExistence] - Minimum existence level
   * @returns {Promise<Object>} Query result
   */
  async ask(query, options = {}) {
    // Set mode to QUERY
    this.mode = SessionMode.QUERY;

    // Parse query
    const parsed = this._parseTriple(query);
    if (!parsed) {
      return {
        found: false,
        status: 'PARSE_ERROR',
        query,
        error: 'Could not parse query as triple'
      };
    }

    const { subject, relation, object } = parsed;

    // Step 1: Direct lookup
    const directFact = this.store.getBestExistenceFact(subject, relation, object);
    if (directFact) {
      const result = {
        found: true,
        existence: directFact._existence,
        fact: directFact,
        source: 'direct'
      };

      if (options.explain) {
        result.explanation = {
          type: 'DIRECT_FACT',
          fact: directFact
        };
      }

      return result;
    }

    // Step 2: Check IS_A variants (umbrella behavior)
    if (relation === 'IS_A' || relation.startsWith('IS_A_')) {
      const isAResult = this.reasoner.deduceIsAWithExistence(subject, object, {
        minExistence: options.minExistence,
        contextStack: this._contextStack
      });

      if (isAResult.truth === 'TRUE_CERTAIN') {
        const result = {
          found: true,
          existence: Math.min(isAResult.existence, EXISTENCE.DEMONSTRATED), // Cap derived
          fact: null, // Virtual, not stored
          source: 'derived',
          chain: isAResult.path
        };

        if (options.explain) {
          result.explanation = {
            type: 'TRANSITIVE_CHAIN',
            ...isAResult.provenance
          };
        }

        return result;
      }

      // Check if impossible (DISJOINT_WITH)
      if (isAResult.truth === 'FALSE') {
        return {
          found: false,
          status: 'IMPOSSIBLE',
          reason: isAResult.provenance?.reason || 'DISJOINT_WITH relation exists',
          conflicts: isAResult.provenance
        };
      }
    }

    // Step 3: Try transitive reasoning for other relations
    const relProps = this.reasoner.dimRegistry?.getRelationProperties(relation);
    if (relProps?.transitive) {
      const transitiveResult = this.reasoner.deduceTransitive(subject, relation, object, this._contextStack);

      if (transitiveResult.truth === 'TRUE_CERTAIN') {
        return {
          found: true,
          existence: EXISTENCE.DEMONSTRATED, // Derived is capped
          fact: null,
          source: 'derived',
          method: transitiveResult.method,
          depth: transitiveResult.depth
        };
      }
    }

    // Step 4: Try inheritance reasoning
    const inheritResult = this.reasoner.deduceWithInheritance(subject, relation, object, this._contextStack);
    if (inheritResult.truth === 'TRUE_CERTAIN') {
      return {
        found: true,
        existence: EXISTENCE.DEMONSTRATED,
        fact: null,
        source: 'inherited',
        inheritedFrom: inheritResult.inheritedFrom,
        depth: inheritResult.depth
      };
    }

    // Step 5: Check impossibility
    const impossibility = this._checkImpossibility(subject, relation, object);
    if (impossibility) {
      return {
        found: false,
        status: 'IMPOSSIBLE',
        reason: impossibility.reason,
        conflicts: impossibility.facts
      };
    }

    // Step 6: Unknown (open-world semantics)
    return {
      found: false,
      status: 'UNKNOWN'
    };
  }

  // =========================================================================
  // Mode Management (DS-EXI Section 3.4)
  // =========================================================================

  /**
   * Set session mode
   * @param {string} mode - 'learning' or 'query'
   */
  setMode(mode) {
    if (mode !== SessionMode.LEARNING && mode !== SessionMode.QUERY) {
      throw new Error(`Invalid mode: ${mode}. Use 'learning' or 'query'`);
    }
    this.mode = mode;
  }

  /**
   * Get current session mode
   * @returns {string} Current mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Check if facts can be created in current mode
   * @returns {boolean}
   */
  canCreateFacts() {
    return this.mode === SessionMode.LEARNING;
  }

  /**
   * Get default existence level for current mode
   * @returns {number|null} Existence level or null if mode doesn't create facts
   */
  getDefaultExistence() {
    return this.mode === SessionMode.LEARNING ? EXISTENCE.CERTAIN : null;
  }

  // =========================================================================
  // Fact Operations
  // =========================================================================

  /**
   * Add a fact (respects current mode)
   *
   * @param {string} subject - Fact subject
   * @param {string} relation - Relation type
   * @param {string} object - Fact object
   * @param {Object} [options] - Options including explicit existence
   * @returns {Object} Result
   */
  addFact(subject, relation, object, options = {}) {
    if (!this.canCreateFacts()) {
      return {
        success: false,
        error: 'Cannot create facts in QUERY mode'
      };
    }

    // Determine existence level
    let existence;
    if (IS_A_EXISTENCE_MAP[relation] !== undefined) {
      // Explicit IS_A variant overrides mode
      existence = IS_A_EXISTENCE_MAP[relation];
    } else if (options.existence !== undefined) {
      // Explicit existence option
      existence = options.existence;
    } else {
      // Mode default
      existence = this.getDefaultExistence();
    }

    const factId = this.store.addFact({ subject, relation, object }, { existence });

    return {
      success: true,
      factId,
      existence,
      triple: { subject, relation, object }
    };
  }

  /**
   * Query for facts matching a pattern
   *
   * @param {string} pattern - Pattern string with wildcards (*)
   * @returns {Array} Matching facts
   */
  factsMatching(pattern) {
    const parts = pattern.trim().split(/\s+/);
    if (parts.length < 2) {
      return [];
    }

    const subject = parts[0] === '*' ? null : parts[0];
    const relation = parts.length > 1 && parts[1] !== '*' ? parts[1] : null;
    const object = parts.length > 2 && parts[2] !== '*' ? parts[2] : null;

    const allFacts = this.store.getFacts();

    return allFacts.filter(f => {
      if (subject && f.subject.toLowerCase() !== subject.toLowerCase()) return false;
      if (relation && f.relation !== relation) return false;
      if (object && f.object.toLowerCase() !== object.toLowerCase()) return false;
      return true;
    });
  }

  // =========================================================================
  // Reasoning Operations
  // =========================================================================

  /**
   * Abductive reasoning - find explanations for an observation
   *
   * @param {string} observation - Observation to explain
   * @param {Object} [options] - Options
   * @returns {Object} Hypotheses
   */
  abduct(observation, options = {}) {
    return this.reasoner.abductCause(observation, this._contextStack, options);
  }

  /**
   * Register a composition rule
   *
   * @param {Object} rule - Rule definition
   */
  async registerRule(rule) {
    if (this.inferenceEngine) {
      this.inferenceEngine.registerRule(rule);
    }
  }

  /**
   * Register a default reasoning rule
   *
   * @param {Object} defaultRule - Default rule definition
   */
  async registerDefault(defaultRule) {
    if (this.inferenceEngine) {
      this.inferenceEngine.registerDefault(defaultRule);
    }
  }

  // =========================================================================
  // Theory/Context Stack
  // =========================================================================

  /**
   * Push a theory layer onto the context stack
   * @param {Object} layer - Theory layer
   */
  pushTheory(layer) {
    this._contextStack.push(layer);
  }

  /**
   * Pop the top theory layer
   * @returns {Object|null} Popped layer or null
   */
  popTheory() {
    return this._contextStack.pop() || null;
  }

  /**
   * Get current context stack
   * @returns {Array}
   */
  getContextStack() {
    return [...this._contextStack];
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Close the session and release resources
   */
  async close() {
    this._contextStack = [];
    // Additional cleanup as needed
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Parse a triple string
   * @private
   */
  _parseTriple(str) {
    if (!str || typeof str !== 'string') return null;

    const parts = str.trim().split(/\s+/);
    if (parts.length < 3) return null;

    return {
      subject: parts[0],
      relation: parts[1],
      object: parts.slice(2).join(' ')
    };
  }

  /**
   * Execute DSL statements
   * @private
   */
  async _executeDsl(dsl) {
    const statements = Array.isArray(dsl) ? dsl : [dsl];
    const results = [];

    for (const stmt of statements) {
      const lines = stmt.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

      for (const line of lines) {
        const result = await this._executeStatement(line);
        results.push(result);
      }
    }

    return {
      success: true,
      results,
      mode: this.mode
    };
  }

  /**
   * Execute a single DSL statement
   * @private
   */
  async _executeStatement(stmt) {
    // Handle mode switch
    if (stmt.includes(' SET_MODE ')) {
      const match = stmt.match(/SET_MODE\s+(\w+)/);
      if (match) {
        this.setMode(match[1]);
        return { type: 'mode_switch', mode: this.mode };
      }
    }

    // Handle GET_MODE
    if (stmt.includes(' GET_MODE ')) {
      return { type: 'mode_query', mode: this.mode };
    }

    // Parse as triple: @var Subject RELATION Object
    const tripleMatch = stmt.match(/@(\w+)\s+(\S+)\s+(\S+)\s+(.+)/);
    if (tripleMatch) {
      const [, varName, subject, relation, object] = tripleMatch;

      // Determine if this is an assertion or query
      if (relation === 'ASK') {
        // This is a query embedded in DSL
        const queryResult = await this.ask(`${subject} ${object}`);
        return { type: 'query', varName, result: queryResult };
      }

      // It's an assertion
      if (this.canCreateFacts()) {
        const factResult = this.addFact(subject, relation, object.trim());
        return { type: 'assertion', varName, ...factResult };
      } else {
        return { type: 'assertion', varName, blocked: true, reason: 'QUERY mode active' };
      }
    }

    return { type: 'unknown', statement: stmt };
  }

  /**
   * Check for impossibility via DISJOINT_WITH
   * @private
   */
  _checkImpossibility(subject, relation, object) {
    if (relation !== 'IS_A') return null;

    // Get what subject IS_A
    const subjectTypes = this.store.getFactsBySubject(subject)
      .filter(f => f.relation === 'IS_A' || f.relation.startsWith('IS_A_'));

    // Get what's disjoint with object
    const disjointFacts = this.store.getFactsBySubject(object)
      .filter(f => f.relation === 'DISJOINT_WITH');

    for (const typeF of subjectTypes) {
      for (const disjF of disjointFacts) {
        if (typeF.object.toLowerCase() === disjF.object.toLowerCase() ||
            typeF.object.toLowerCase() === object.toLowerCase()) {
          return {
            reason: `${subject} IS_A ${typeF.object}, ${typeF.object} DISJOINT_WITH ${object}`,
            facts: [typeF, disjF]
          };
        }
      }
    }

    return null;
  }
}

// Export class and constants
Session.EXISTENCE = EXISTENCE;
Session.Mode = SessionMode;
Session.IS_A_EXISTENCE_MAP = IS_A_EXISTENCE_MAP;

module.exports = Session;
