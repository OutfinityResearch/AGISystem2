/**
 * DS(/theory/dsl_commands_theory.js) - Theory Management DSL Commands
 *
 * Implements Sys2DSL commands for theory/context management:
 * - LIST_THEORIES, LOAD_THEORY, SAVE_THEORY, MERGE_THEORY
 * - THEORY_PUSH, THEORY_POP (counterfactual layers)
 * - RESET_SESSION
 *
 * Theory layers enable "what-if" reasoning by creating isolated
 * contexts where hypothetical facts can be asserted without
 * affecting the base knowledge.
 *
 * Storage is pluggable - default uses file system, but can be
 * replaced with custom adapters (database, cloud, memory, etc.)
 *
 * @module theory/dsl_commands_theory
 */

const TheoryStorage = require('./theory_storage');
const MetaTheoryRegistry = require('./meta_theory_registry');

class DSLCommandsTheory {
  /**
   * @param {Object} deps
   * @param {Object} deps.conceptStore - ConceptStore instance
   * @param {Object} deps.parser - DSL parser instance
   * @param {Object} [deps.storage] - TheoryStorage instance (optional)
   * @param {Object} [deps.metaRegistry] - MetaTheoryRegistry instance (optional)
   * @param {string} [deps.theoriesDir] - Custom theories directory
   */
  constructor({ conceptStore, parser, storage, metaRegistry, theoriesDir }) {
    this.conceptStore = conceptStore;
    this.parser = parser;

    // Pluggable storage - default to file storage
    this.storage = storage || new TheoryStorage({ theoriesDir });

    // Meta-theory registry for tracking theory usage
    this.metaRegistry = metaRegistry || MetaTheoryRegistry.getShared();

    // Theory layer stack for counterfactual reasoning
    this._theoryStack = [];
    this._factSnapshots = [];

    // Track currently loaded theory
    this._currentTheory = null;
  }

  /**
   * LIST_THEORIES: List available and active theories
   * Syntax: @var LIST_THEORIES
   *
   * Returns both persisted theories and active theory stack
   */
  cmdListTheories() {
    const available = this.storage.listTheories();
    const active = this._theoryStack.map((t) => t.name);

    return {
      available,
      active,
      current: this._currentTheory,
      depth: this._theoryStack.length
    };
  }

  /**
   * LOAD_THEORY: Load a theory by name from storage
   * Syntax: @var LOAD_THEORY theoryName
   *
   * Loads theory facts into the concept store.
   * Tracks loading in meta-registry for statistics.
   */
  cmdLoadTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('LOAD_THEORY expects a theory name');
    }

    const name = this.parser.expandString(argTokens[0], env);

    // Check if theory exists
    if (!this.storage.theoryExists(name)) {
      return {
        ok: false,
        error: `Theory '${name}' not found`,
        available: this.storage.listTheories()
      };
    }

    // Load theory lines
    const lines = this.storage.loadTheoryLines(name);
    if (!lines || lines.length === 0) {
      return { ok: false, error: `Theory '${name}' is empty or invalid` };
    }

    // Execute each line to add facts
    let loaded = 0;
    let errors = [];

    for (const line of lines) {
      // Parse ASSERT statements
      const assertMatch = line.match(/@?\w*\s*ASSERT\s+(\S+)\s+(\S+)\s+(\S+)/);
      if (assertMatch) {
        const [, subject, relation, object] = assertMatch;
        try {
          // addFact expects an object, not separate arguments
          this.conceptStore.addFact({ subject, relation, object });
          loaded++;
        } catch (e) {
          errors.push(`${subject} ${relation} ${object}: ${e.message}`);
        }
      }
    }

    this._currentTheory = name;

    // Load metadata and register theory first (so recordLoad can find it)
    const data = this.storage.loadTheory(name);
    if (data && data.metadata) {
      this.metaRegistry.registerTheory({
        id: name,
        ...data.metadata
      });
    } else {
      // Register with minimal metadata if no metadata in file
      this.metaRegistry.registerTheory({ id: name });
    }

    // Now record the load (theory is guaranteed to exist)
    this.metaRegistry.recordLoad(name);

    return {
      ok: true,
      name,
      loaded,
      errors: errors.length > 0 ? errors : undefined,
      status: 'loaded'
    };
  }

  /**
   * SAVE_THEORY: Save current facts to storage
   * Syntax: @var SAVE_THEORY theoryName [metadata...]
   *
   * Persists current concept store facts to a theory file.
   * Supports optional metadata: domain="medical" version="1.0"
   */
  cmdSaveTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('SAVE_THEORY expects a theory name');
    }

    const name = this.parser.expandString(argTokens[0], env);

    // Parse optional metadata from remaining args
    const metadata = { name };
    for (let i = 1; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);
      const match = arg.match(/^(\w+)=["']?([^"']+)["']?$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }

    // Get current facts
    const facts = this.conceptStore.getFacts();

    // Build DSL content
    const lines = [
      `# Theory: ${name}`,
      `# Saved: ${new Date().toISOString()}`,
      `# Facts: ${facts.length}`,
      ''
    ];

    facts.forEach((f, i) => {
      lines.push(`@f${String(i + 1).padStart(3, '0')} ASSERT ${f.subject} ${f.relation} ${f.object}`);
    });

    // Save to storage
    const success = this.storage.saveTheory(name, lines.join('\n'), metadata);

    if (success) {
      // Register in meta-registry
      this.metaRegistry.registerTheory({
        id: name,
        ...metadata
      });
      this._currentTheory = name;
    }

    return {
      ok: success,
      name,
      factCount: facts.length,
      conceptCount: this.conceptStore.listConcepts().length,
      timestamp: new Date().toISOString(),
      status: success ? 'saved' : 'failed'
    };
  }

  /**
   * MERGE_THEORY: Merge another theory into current knowledge
   * Syntax: @var MERGE_THEORY theoryName
   *
   * Loads facts from another theory without clearing existing ones.
   */
  cmdMergeTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('MERGE_THEORY expects a theory name');
    }

    const name = this.parser.expandString(argTokens[0], env);

    // Check if theory exists
    if (!this.storage.theoryExists(name)) {
      return {
        ok: false,
        error: `Theory '${name}' not found`,
        available: this.storage.listTheories()
      };
    }

    // Get current fact count
    const beforeCount = this.conceptStore.getFacts().length;

    // Load theory (this adds facts without clearing)
    const result = this.cmdLoadTheory(argTokens, env);

    const afterCount = this.conceptStore.getFacts().length;

    return {
      ok: result.ok,
      name,
      merged: afterCount - beforeCount,
      totalFacts: afterCount,
      status: 'merged'
    };
  }

  /**
   * DELETE_THEORY: Delete a theory from storage
   * Syntax: @var DELETE_THEORY theoryName
   */
  cmdDeleteTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('DELETE_THEORY expects a theory name');
    }

    const name = this.parser.expandString(argTokens[0], env);

    const success = this.storage.deleteTheory(name);

    if (success) {
      this.metaRegistry.unregisterTheory(name);
      if (this._currentTheory === name) {
        this._currentTheory = null;
      }
    }

    return {
      ok: success,
      name,
      status: success ? 'deleted' : 'not_found'
    };
  }

  /**
   * THEORY_PUSH: Push new theory layer for counterfactual reasoning
   * Syntax: @var THEORY_PUSH [name="layerName"]
   *
   * Creates a new hypothetical context. Facts asserted in this
   * context are isolated from the base knowledge and will be
   * discarded when THEORY_POP is called.
   */
  cmdTheoryPush(argTokens, env) {
    const name = argTokens.length > 0
      ? this.parser.expandString(argTokens[0], env).replace(/^name=["']?|["']?$/g, '')
      : `layer_${this._theoryStack.length}`;

    // Use snapshotFacts() if available, otherwise getFacts()
    const snapshot = this.conceptStore.snapshotFacts
      ? this.conceptStore.snapshotFacts()
      : this.conceptStore.getFacts().map((f) => ({ ...f }));

    this._factSnapshots.push(snapshot);
    this._theoryStack.push({
      name,
      pushedAt: new Date().toISOString(),
      factCount: snapshot.length
    });

    return {
      ok: true,
      name,
      depth: this._theoryStack.length,
      snapshotFacts: snapshot.length
    };
  }

  /**
   * THEORY_POP: Pop theory layer, restoring previous state
   * Syntax: @var THEORY_POP
   *
   * Discards the current hypothetical context and restores
   * the knowledge base to its state before the corresponding
   * THEORY_PUSH.
   */
  cmdTheoryPop() {
    if (this._theoryStack.length === 0) {
      return { ok: false, error: 'No theory layer to pop' };
    }

    const popped = this._theoryStack.pop();
    const snapshot = this._factSnapshots.pop();

    // Restore facts to the snapshot state
    if (snapshot && this.conceptStore.restoreFacts) {
      this.conceptStore.restoreFacts(snapshot);
    }

    return {
      ok: true,
      popped: popped.name,
      depth: this._theoryStack.length,
      restoredFacts: snapshot ? snapshot.length : 0
    };
  }

  /**
   * RESET_SESSION: Clear all session state
   * Syntax: @var RESET_SESSION
   *
   * Resets all theory layers and session-specific data.
   * Does not affect persisted knowledge.
   */
  cmdResetSession() {
    this._theoryStack = [];
    this._factSnapshots = [];
    this._currentTheory = null;
    return { ok: true, status: 'session_reset' };
  }

  /**
   * THEORY_INFO: Get information about a theory
   * Syntax: @var THEORY_INFO theoryName
   */
  cmdTheoryInfo(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('THEORY_INFO expects a theory name');
    }

    const name = this.parser.expandString(argTokens[0], env);

    // Check storage
    const data = this.storage.loadTheory(name);
    if (!data) {
      return { ok: false, error: `Theory '${name}' not found` };
    }

    // Get meta-registry info
    const meta = this.metaRegistry.getTheory(name);

    return {
      ok: true,
      name,
      format: data.format,
      metadata: data.metadata,
      stats: meta ? meta.stats : null,
      successRate: meta ? this.metaRegistry.getSuccessRate(name) : null
    };
  }

  /**
   * Get current theory depth
   */
  getTheoryDepth() {
    return this._theoryStack.length;
  }

  /**
   * Check if in hypothetical context
   */
  isHypothetical() {
    return this._theoryStack.length > 0;
  }

  /**
   * Get current theory name
   */
  getCurrentTheory() {
    return this._currentTheory;
  }

  /**
   * Set storage adapter (for dependency injection)
   * @param {TheoryStorage} storage
   */
  setStorage(storage) {
    this.storage = storage;
  }

  /**
   * Set meta-registry (for dependency injection)
   * @param {MetaTheoryRegistry} registry
   */
  setMetaRegistry(registry) {
    this.metaRegistry = registry;
  }
}

module.exports = DSLCommandsTheory;
