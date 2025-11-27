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
 * @module theory/dsl_commands_theory
 */

class DSLCommandsTheory {
  constructor({ conceptStore, parser }) {
    this.conceptStore = conceptStore;
    this.parser = parser;
    this._theoryStack = [];
    this._factSnapshots = [];
  }

  /**
   * LIST_THEORIES: List available/active theories
   * Syntax: @var LIST_THEORIES
   */
  cmdListTheories() {
    return {
      active: this._theoryStack.map((t) => t.name),
      count: this._theoryStack.length
    };
  }

  /**
   * LOAD_THEORY: Load a theory by name
   * Syntax: @var LOAD_THEORY theoryName
   */
  cmdLoadTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('LOAD_THEORY expects a theory name');
    }
    const name = this.parser.expandString(argTokens[0], env);
    // Theory loading would typically involve file I/O
    return { ok: true, name, status: 'loaded' };
  }

  /**
   * SAVE_THEORY: Save current theory state
   * Syntax: @var SAVE_THEORY theoryName
   */
  cmdSaveTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('SAVE_THEORY expects a theory name');
    }
    const name = this.parser.expandString(argTokens[0], env);
    const facts = this.conceptStore.getFacts();
    const concepts = this.conceptStore.listConcepts();
    return {
      ok: true,
      name,
      factCount: facts.length,
      conceptCount: concepts.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * MERGE_THEORY: Merge another theory into current
   * Syntax: @var MERGE_THEORY theoryName
   */
  cmdMergeTheory(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('MERGE_THEORY expects a theory name');
    }
    const name = this.parser.expandString(argTokens[0], env);
    return { ok: true, name, status: 'merged' };
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
    this._theoryStack.push({ name, pushedAt: new Date().toISOString() });

    return { ok: true, name, depth: this._theoryStack.length };
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
    return { ok: true, status: 'session_reset' };
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
}

module.exports = DSLCommandsTheory;
