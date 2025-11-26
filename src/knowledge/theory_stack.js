/**
 * TheoryStack - Manage ordered layers for meta-rational context selection
 *
 * Synthesizes runtime concepts by applying relevant layers in order.
 * Detects conflicts between layers. Supports counterfactual reasoning.
 *
 * DS: DS(/knowledge/theory_stack.js)
 */

const TheoryLayer = require('./theory_layer');

class TheoryStack {
  /**
   * Create a new theory stack
   * @param {Object} deps - Dependencies
   * @param {Object} deps.config - Config instance
   * @param {Object} [deps.audit] - AuditLog instance
   */
  constructor(deps = {}) {
    if (typeof deps === 'number') {
      // Legacy: just dimensions
      this.dimensions = deps;
      this.config = null;
      this.audit = null;
    } else {
      this.config = deps.config || null;
      this.audit = deps.audit || null;
      this.dimensions = this.config ? this.config.get('dimensions') : (deps.dimensions || 512);
    }

    this.layers = [];
    this._snapshotStack = []; // For nested counterfactuals
  }

  /**
   * Push a layer onto the stack
   * @param {TheoryLayer} layer - Layer to add
   */
  push(layer) {
    if (!(layer instanceof TheoryLayer)) {
      throw new Error('Only TheoryLayer instances can be pushed onto TheoryStack');
    }

    // Validate dimensions compatibility
    if (layer.dimensions !== this.dimensions) {
      throw new Error(`Layer dimensions (${layer.dimensions}) don't match stack (${this.dimensions})`);
    }

    this.layers.push(layer);

    if (this.audit) {
      this.audit.log({
        event: 'THEORY_PUSH',
        layerId: layer.id,
        priority: layer.priority,
        depth: this.layers.length
      });
    }
  }

  /**
   * Pop the top layer from the stack
   * @returns {TheoryLayer|null} The removed layer, or null if empty
   */
  pop() {
    const layer = this.layers.pop() || null;

    if (this.audit && layer) {
      this.audit.log({
        event: 'THEORY_POP',
        layerId: layer.id,
        depth: this.layers.length
      });
    }

    return layer;
  }

  /**
   * Get current stack depth
   * @returns {number} Number of layers
   */
  depth() {
    return this.layers.length;
  }

  /**
   * Replace the entire stack with a new set of layers
   * @param {TheoryLayer[]} layers - Ordered array of layers (base to top)
   */
  setActive(layers) {
    if (!Array.isArray(layers)) {
      throw new Error('setActive requires an array of TheoryLayer instances');
    }

    // Validate all layers
    for (const layer of layers) {
      if (!(layer instanceof TheoryLayer)) {
        throw new Error('All items must be TheoryLayer instances');
      }
      if (layer.dimensions !== this.dimensions) {
        throw new Error(`Layer ${layer.id} dimensions mismatch`);
      }
    }

    const oldIds = this.layers.map(l => l.id);
    this.layers = [...layers];

    if (this.audit) {
      this.audit.log({
        event: 'THEORY_SET_ACTIVE',
        oldLayers: oldIds,
        newLayers: this.layers.map(l => l.id)
      });
    }
  }

  /**
   * Clear all layers from the stack
   */
  clear() {
    const oldIds = this.layers.map(l => l.id);
    this.layers = [];

    if (this.audit) {
      this.audit.log({
        event: 'THEORY_CLEAR',
        clearedLayers: oldIds
      });
    }
  }

  /**
   * Get a copy of the active layers (base to top order)
   * @returns {TheoryLayer[]} Copy of layers array
   */
  getActiveLayers() {
    return this.layers.slice();
  }

  /**
   * Compose a base diamond with all active layers
   * Applies layers in order (base first, then each override)
   * @param {BoundedDiamond} baseDiamond - The base diamond to compose
   * @returns {BoundedDiamond} New diamond with all layers applied
   */
  compose(baseDiamond) {
    if (!baseDiamond) {
      return null;
    }

    let result = baseDiamond;

    // Sort layers by priority (lower first, so higher priority applies last)
    const sortedLayers = [...this.layers].sort((a, b) => a.priority - b.priority);

    for (const layer of sortedLayers) {
      result = layer.applyTo(result);
    }

    return result;
  }

  /**
   * Get all facts from all layers combined with base facts
   * @param {Array} baseFacts - Base facts array
   * @returns {Array} Combined facts from all layers
   */
  getAllFacts(baseFacts = []) {
    const allFacts = [...baseFacts];
    for (const layer of this.layers) {
      if (layer.facts && layer.facts.length > 0) {
        allFacts.push(...layer.getFacts());
      }
    }
    return allFacts;
  }

  /**
   * Compare two stack configurations for differences
   * @param {TheoryStack} stackA - First stack
   * @param {TheoryStack} stackB - Second stack
   * @param {BoundedDiamond} baseDiamond - Base diamond to compose
   * @returns {Object} Comparison report with deltas
   */
  static compareStacks(stackA, stackB, baseDiamond) {
    const composedA = stackA ? stackA.compose(baseDiamond) : baseDiamond;
    const composedB = stackB ? stackB.compose(baseDiamond) : baseDiamond;

    if (!composedA || !composedB) {
      return {
        comparable: false,
        reason: 'One or both compositions failed'
      };
    }

    const deltas = [];
    const dims = composedA.minValues.length;

    for (let i = 0; i < dims; i++) {
      const minDiff = composedB.minValues[i] - composedA.minValues[i];
      const maxDiff = composedB.maxValues[i] - composedA.maxValues[i];

      if (minDiff !== 0 || maxDiff !== 0) {
        deltas.push({
          dimension: i,
          minDelta: minDiff,
          maxDelta: maxDiff
        });
      }
    }

    return {
      comparable: true,
      diamondA: composedA,
      diamondB: composedB,
      deltas,
      radiusDelta: composedB.l1Radius - composedA.l1Radius
    };
  }

  /**
   * Detect conflicts in the composed diamond
   * A conflict occurs when min > max for any dimension
   * @param {BoundedDiamond} baseDiamond - Base diamond to check
   * @returns {Object} Conflict report
   */
  conflicts(baseDiamond) {
    const composed = this.compose(baseDiamond);
    if (!composed) {
      return {
        hasConflicts: false,
        reason: 'No diamond to check'
      };
    }

    const conflicts = [];
    const dims = composed.minValues.length;

    for (let i = 0; i < dims; i++) {
      if (composed.minValues[i] > composed.maxValues[i]) {
        conflicts.push({
          dimension: i,
          min: composed.minValues[i],
          max: composed.maxValues[i],
          reason: 'Empty intersection (min > max)'
        });
      }
    }

    // Check for layer-to-layer contradictions
    const layerConflicts = [];
    for (let i = 0; i < this.layers.length; i++) {
      for (let j = i + 1; j < this.layers.length; j++) {
        const layerA = this.layers[i];
        const layerB = this.layers[j];

        for (let d = 0; d < this.dimensions; d++) {
          if (layerA.covers(d) && layerB.covers(d)) {
            // Both layers have opinions - check for contradiction
            if (layerA.overrideMax[d] < layerB.overrideMin[d] ||
                layerB.overrideMax[d] < layerA.overrideMin[d]) {
              layerConflicts.push({
                dimension: d,
                layerA: layerA.id,
                layerB: layerB.id,
                reason: 'Non-overlapping ranges'
              });
            }
          }
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0 || layerConflicts.length > 0,
      dimensionConflicts: conflicts,
      layerConflicts,
      composed
    };
  }

  /**
   * Create a snapshot of the current stack state
   * Used for counterfactual reasoning - can be restored later
   * @returns {Object} Snapshot object
   */
  snapshot() {
    return {
      timestamp: new Date().toISOString(),
      layerCount: this.layers.length,
      layers: this.layers.map(l => l.toJSON()),
      layerIds: this.layers.map(l => l.id)
    };
  }

  /**
   * Save current state and start a new context (for nested counterfactuals)
   * @param {string} [name] - Optional name for the context
   * @returns {number} Context depth
   */
  pushContext(name) {
    this._snapshotStack.push({
      name: name || `context_${this._snapshotStack.length}`,
      snapshot: this.snapshot(),
      layers: [...this.layers]
    });
    return this._snapshotStack.length;
  }

  /**
   * Restore the previous context
   * @returns {boolean} True if a context was restored
   */
  popContext() {
    const ctx = this._snapshotStack.pop();
    if (!ctx) {
      return false;
    }
    this.layers = ctx.layers;
    return true;
  }

  /**
   * Restore stack from a snapshot
   * @param {Object} snapshot - Snapshot created by snapshot()
   */
  restore(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.layers)) {
      throw new Error('Invalid snapshot');
    }

    this.layers = snapshot.layers.map(json => TheoryLayer.fromJSON(json));

    if (this.audit) {
      this.audit.log({
        event: 'THEORY_RESTORE',
        layerIds: this.layers.map(l => l.id)
      });
    }
  }

  /**
   * Find a layer by ID
   * @param {string} layerId - Layer ID to find
   * @returns {TheoryLayer|null} The layer or null
   */
  findLayer(layerId) {
    return this.layers.find(l => l.id === layerId) || null;
  }
}

module.exports = TheoryStack;
