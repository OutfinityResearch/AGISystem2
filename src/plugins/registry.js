/**
 * Compute Plugin Registry
 *
 * Manages external computation plugins (math, physics, chemistry, logic, datetime)
 * that handle formal operations on computable concepts.
 *
 * Key principle: Concepts remain in the vector space, but some have numeric values
 * encoded in the computable dimensions (16-31). When a relation marked as "computable"
 * is evaluated, the registry delegates to the appropriate plugin.
 */

const fs = require('fs');
const path = require('path');

class PluginRegistry {
  constructor(config = {}) {
    this.plugins = new Map();
    this.relationToPlugin = new Map();
    this.dimensionConfig = null;

    // Load dimension config to get plugin definitions
    this._loadDimensionConfig();
  }

  _loadDimensionConfig() {
    const configPath = path.resolve(__dirname, '../../data/init/dimensions.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      this.dimensionConfig = JSON.parse(raw);

      // Build relation -> plugin mapping from config
      if (this.dimensionConfig.relationProperties) {
        for (const [relation, props] of Object.entries(this.dimensionConfig.relationProperties)) {
          if (props.computable) {
            this.relationToPlugin.set(relation, props.computable);
          }
        }
      }
    }
  }

  /**
   * Register a compute plugin
   * @param {string} name - Plugin name (math, physics, etc.)
   * @param {Object} plugin - Plugin implementation
   */
  register(name, plugin) {
    if (!plugin.evaluate || typeof plugin.evaluate !== 'function') {
      throw new Error(`Plugin ${name} must implement evaluate(relation, subject, object) method`);
    }

    this.plugins.set(name, plugin);

    // Register all relations this plugin handles
    if (plugin.relations) {
      for (const relation of plugin.relations) {
        this.relationToPlugin.set(relation, name);
      }
    }
  }

  /**
   * Check if a relation is computable (handled by a plugin)
   * @param {string} relation - Relation name
   * @returns {boolean}
   */
  isComputable(relation) {
    return this.relationToPlugin.has(relation);
  }

  /**
   * Get the plugin that handles a relation
   * @param {string} relation - Relation name
   * @returns {Object|null} Plugin instance or null
   */
  getPluginForRelation(relation) {
    const pluginName = this.relationToPlugin.get(relation);
    return pluginName ? this.plugins.get(pluginName) : null;
  }

  /**
   * Evaluate a computable relation
   *
   * @param {string} relation - The relation to evaluate
   * @param {Object} subject - Subject concept with numeric metadata
   * @param {Object} object - Object concept with numeric metadata
   * @returns {Object} Result with truth, confidence, and optional computed value
   */
  evaluate(relation, subject, object) {
    const plugin = this.getPluginForRelation(relation);

    if (!plugin) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        method: 'no_plugin',
        error: `No plugin registered for relation ${relation}`
      };
    }

    try {
      const result = plugin.evaluate(relation, subject, object);
      return {
        ...result,
        method: 'computed',
        plugin: this.relationToPlugin.get(relation)
      };
    } catch (err) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        method: 'compute_error',
        error: err.message
      };
    }
  }

  /**
   * Extract numeric value from a concept
   * Looks for HAS_VALUE facts or encoded dimensions
   *
   * @param {Object} concept - Concept object
   * @param {Object} store - ConceptStore to query facts
   * @returns {Object|null} { value: number, unit: string } or null
   */
  extractNumericValue(conceptLabel, store) {
    // Try to get from facts first
    const facts = store.getFactsBySubject(conceptLabel);

    for (const fact of facts) {
      if (fact.relation === 'HAS_VALUE') {
        const numMatch = fact.object.match(/^(-?\d+\.?\d*)/);
        if (numMatch) {
          return { value: parseFloat(numMatch[1]), raw: fact.object };
        }
      }
      if (fact.relation === 'HAS_UNIT') {
        // Store unit for later use
      }
    }

    // Try to parse from label (e.g., "celsius_20" -> 20)
    const labelMatch = conceptLabel.match(/_(-?\d+\.?\d*)$/);
    if (labelMatch) {
      return { value: parseFloat(labelMatch[1]), raw: conceptLabel };
    }

    // Try to parse pure numeric label
    const numericLabel = parseFloat(conceptLabel);
    if (!isNaN(numericLabel)) {
      return { value: numericLabel, raw: conceptLabel };
    }

    return null;
  }

  /**
   * List all registered plugins
   * @returns {Array} Plugin names
   */
  listPlugins() {
    return Array.from(this.plugins.keys());
  }

  /**
   * List all computable relations
   * @returns {Array} Relation names with their plugins
   */
  listComputableRelations() {
    const result = [];
    for (const [relation, plugin] of this.relationToPlugin) {
      result.push({ relation, plugin });
    }
    return result;
  }
}

module.exports = PluginRegistry;
