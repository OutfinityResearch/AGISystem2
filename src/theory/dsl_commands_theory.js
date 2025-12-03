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
const TheoryStack = require('../knowledge/theory_stack');
const TheoryLayer = require('../knowledge/theory_layer');

class DSLCommandsTheory {
  /**
   * @param {Object} deps
   * @param {Object} deps.conceptStore - ConceptStore instance
   * @param {Object} deps.parser - DSL parser instance
   * @param {Object} [deps.storage] - TheoryStorage instance (optional)
   * @param {Object} [deps.metaRegistry] - MetaTheoryRegistry instance (optional)
   * @param {string} [deps.theoriesDir] - Custom theories directory
   * @param {Object} [deps.theoryStack] - Shared TheoryStack instance (FS-02 integration)
   * @param {Object} [deps.config] - Config instance
   */
  constructor({ conceptStore, parser, storage, metaRegistry, theoriesDir, theoryStack, config }) {
    this.conceptStore = conceptStore;
    this.parser = parser;
    this.config = config;

    // Pluggable storage - default to file storage
    this.storage = storage || new TheoryStorage({ theoriesDir });

    // Meta-theory registry for tracking theory usage
    this.metaRegistry = metaRegistry || MetaTheoryRegistry.getShared();

    // =========================================================================
    // FS-02 Integration: Unified Theory Stack
    // =========================================================================
    // Use shared TheoryStack if provided (from EngineAPI), otherwise create local
    // This ensures diamond composition and fact management are coordinated
    const dimensions = config ? config.get('dimensions') : 512;
    this.theoryStack = theoryStack || new TheoryStack({ config, dimensions });

    // Unified context stack for counterfactual reasoning (facts + diamonds)
    // Each entry contains both fact snapshot and theory layer snapshot
    this._contextStack = [];

    // Track currently loaded theory
    this._currentTheory = null;
  }

  /**
   * LIST_THEORIES: List available and active theories
   * Syntax: @var LIST_THEORIES
   *
   * Returns both persisted theories and active theory stack
   * FS-02: Uses unified TheoryStack for layer management
   */
  cmdListTheories() {
    const available = this.storage.listTheories();
    const activeLayers = this.theoryStack.getActiveLayers();
    const active = activeLayers.map((l) => l.label || l.id);

    return {
      available,
      active,
      current: this._currentTheory,
      depth: this._contextStack.length,
      theoryStackDepth: this.theoryStack.depth()
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
      // Parse v2 ASSERT statements: @f001 ASSERT Subject Relation Object
      const assertMatch = line.match(/@?\w*\s*ASSERT\s+(\S+)\s+(\S+)\s+(\S+)/);
      if (assertMatch) {
        const [, subject, relation, object] = assertMatch;
        try {
          this.conceptStore.addFact({ subject, relation, object });
          loaded++;
        } catch (e) {
          errors.push(`${subject} ${relation} ${object}: ${e.message}`);
        }
        continue;
      }

      // Parse v3 statements: @_ Subject VERB Object (4 tokens)
      const v3Match = line.match(/^@\w*\s+(\S+)\s+(\S+)\s+(\S+)$/);
      if (v3Match) {
        const [, subject, relation, object] = v3Match;
        // Skip wildcard/any objects, they're not real facts
        if (object === 'any' || object === '*') {
          continue;
        }
        try {
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
   *
   * FS-02 Integration: Saves both:
   * - ConceptStore facts (for logical reasoning)
   * - TheoryStack layers (for geometric reasoning)
   */
  cmdTheoryPush(argTokens, env) {
    const name = argTokens.length > 0
      ? this.parser.expandString(argTokens[0], env).replace(/^name=["']?|["']?$/g, '')
      : `context_${this._contextStack.length}`;

    // Snapshot facts from ConceptStore
    const factSnapshot = this.conceptStore.snapshotFacts
      ? this.conceptStore.snapshotFacts()
      : this.conceptStore.getFacts().map((f) => ({ ...f }));

    // Snapshot TheoryStack layers (geometric state)
    const layerSnapshot = this.theoryStack.snapshot({ facts: factSnapshot });

    // Create new theory layer for this context
    const dimensions = this.config ? this.config.get('dimensions') : 512;
    const layer = new TheoryLayer(dimensions, {
      id: name,
      label: name,
      priority: this._contextStack.length,
      metadata: {
        source: 'counterfactual',
        timestamp: new Date().toISOString(),
        parentContext: this._contextStack.length > 0
          ? this._contextStack[this._contextStack.length - 1].name
          : null
      }
    });

    // Push to unified context stack
    this._contextStack.push({
      name,
      pushedAt: new Date().toISOString(),
      factSnapshot,
      layerSnapshot,
      layer
    });

    // Push layer to TheoryStack for geometric reasoning
    this.theoryStack.push(layer);

    return {
      ok: true,
      name,
      depth: this._contextStack.length,
      snapshotFacts: factSnapshot.length,
      theoryStackDepth: this.theoryStack.depth()
    };
  }

  /**
   * THEORY_POP: Pop theory layer, restoring previous state
   * Syntax: @var THEORY_POP
   *
   * Discards the current hypothetical context and restores
   * the knowledge base to its state before the corresponding
   * THEORY_PUSH.
   *
   * FS-02 Integration: Restores both:
   * - ConceptStore facts (for logical reasoning)
   * - TheoryStack layers (for geometric reasoning)
   */
  cmdTheoryPop() {
    if (this._contextStack.length === 0) {
      return { ok: false, error: 'No theory context to pop' };
    }

    const popped = this._contextStack.pop();

    // Pop from TheoryStack (geometric)
    this.theoryStack.pop();

    // Restore facts to the snapshot state (logical)
    if (popped.factSnapshot && this.conceptStore.restoreFacts) {
      this.conceptStore.restoreFacts(popped.factSnapshot);
    }

    return {
      ok: true,
      popped: popped.name,
      depth: this._contextStack.length,
      restoredFacts: popped.factSnapshot ? popped.factSnapshot.length : 0,
      theoryStackDepth: this.theoryStack.depth()
    };
  }

  /**
   * RESET_SESSION: Clear all session state
   * Syntax: @var RESET_SESSION
   *
   * Resets all theory layers and session-specific data.
   * Does not affect persisted knowledge.
   *
   * FS-02 Integration: Clears both context stack and TheoryStack
   */
  cmdResetSession() {
    this._contextStack = [];
    this.theoryStack.clear();
    this._currentTheory = null;
    return { ok: true, status: 'session_reset' };
  }

  /**
   * COMMIT: Commit current hypothetical context to base knowledge
   * Syntax: @var COMMIT
   *
   * Makes the current context permanent (cannot be popped after commit)
   */
  cmdCommit() {
    if (this._contextStack.length === 0) {
      return { ok: false, error: 'No context to commit' };
    }

    // Clear context stack but keep TheoryStack layers and current facts
    const committed = this._contextStack.length;
    this._contextStack = [];

    return {
      ok: true,
      committed,
      status: 'committed',
      currentFacts: this.conceptStore.getFacts().length
    };
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
   * Get current theory depth (context stack)
   */
  getTheoryDepth() {
    return this._contextStack.length;
  }

  /**
   * Check if in hypothetical context
   */
  isHypothetical() {
    return this._contextStack.length > 0;
  }

  /**
   * Get access to the shared TheoryStack (for FS-02 integration)
   * @returns {TheoryStack} The TheoryStack instance
   */
  getTheoryStack() {
    return this.theoryStack;
  }

  /**
   * Get active layers from TheoryStack
   * @returns {Array} Active theory layers
   */
  getActiveLayers() {
    return this.theoryStack.getActiveLayers();
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
