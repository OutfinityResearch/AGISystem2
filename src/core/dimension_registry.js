/**
 * DimensionRegistry - Central registry for dimension semantics
 *
 * Loads dimension definitions from dimensions.json and provides
 * lookup methods for property->axis and relation->axes mappings.
 * This eliminates hardcoded dimension indices throughout the codebase.
 *
 * DS: DS(/core/dimension_registry.js)
 */

const fs = require('fs');
const path = require('path');

class DimensionRegistry {
  /**
   * Create a dimension registry
   * @param {Object} options - Configuration options
   * @param {string} [options.dimensionsPath] - Path to dimensions.json
   * @param {Object} [options.spec] - Pre-loaded spec (for testing)
   */
  constructor(options = {}) {
    this.axes = new Map();           // name -> axis definition
    this.axesByIndex = new Map();    // index -> axis definition
    this.propertyMappings = {};      // property name -> axis name
    this.relationMappings = {};      // relation name -> [axis names]
    this.relationProperties = {};    // relation name -> { transitive, symmetric, inverse }
    this.partitions = {};            // partition name -> { start, end }

    if (options.spec) {
      this._loadFromSpec(options.spec);
    } else {
      // Find dimensions.json relative to project root, not cwd
      // __dirname is /path/to/AGISystem2/src/core
      // We need /path/to/AGISystem2/data/init/dimensions.json
      const projectRoot = path.resolve(__dirname, '..', '..');
      const dimensionsPath = options.dimensionsPath ||
        path.join(projectRoot, 'data', 'init', 'dimensions.json');
      this._loadFromFile(dimensionsPath);
    }
  }

  /**
   * Load dimensions from a file
   * @private
   */
  _loadFromFile(filePath) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const spec = JSON.parse(raw);
      this._loadFromSpec(spec);
    } catch (e) {
      // If file doesn't exist or is invalid, initialize with empty mappings
      // This allows the system to work without dimensions.json (degraded mode)
      console.warn(`DimensionRegistry: Could not load ${filePath}: ${e.message}`);
    }
  }

  /**
   * Load dimensions from a spec object
   * @private
   */
  _loadFromSpec(spec) {
    // Load axes
    if (Array.isArray(spec.axes)) {
      for (const axis of spec.axes) {
        this.axes.set(axis.name, axis);
        this.axesByIndex.set(axis.index, axis);
      }
    }

    // Load property mappings
    if (spec.propertyMappings && typeof spec.propertyMappings === 'object') {
      this.propertyMappings = { ...spec.propertyMappings };
    }

    // Load relation mappings
    if (spec.relationMappings && typeof spec.relationMappings === 'object') {
      this.relationMappings = { ...spec.relationMappings };
    }

    // Load relation properties (transitive, symmetric, inverse)
    if (spec.relationProperties && typeof spec.relationProperties === 'object') {
      this.relationProperties = { ...spec.relationProperties };
    }

    // Load partitions
    if (spec.partitions && typeof spec.partitions === 'object') {
      this.partitions = { ...spec.partitions };
    }
  }

  /**
   * Get axis index by name
   * @param {string} name - Axis name (e.g., "Temperature")
   * @returns {number|undefined} Axis index or undefined if not found
   */
  getAxisIndex(name) {
    const axis = this.axes.get(name);
    return axis ? axis.index : undefined;
  }

  /**
   * Get axis definition by index
   * @param {number} index - Axis index
   * @returns {Object|undefined} Axis definition or undefined
   */
  getAxisByIndex(index) {
    return this.axesByIndex.get(index);
  }

  /**
   * Get axis definition by name
   * @param {string} name - Axis name
   * @returns {Object|undefined} Axis definition or undefined
   */
  getAxis(name) {
    return this.axes.get(name);
  }

  /**
   * Get axis index for a property name
   * Maps property names like "boiling_point" to their axis index
   *
   * @param {string} propertyName - Property name (e.g., "temperature", "mass")
   * @returns {number|undefined} Axis index or undefined if not mapped
   */
  getPropertyAxis(propertyName) {
    const axisName = this.propertyMappings[propertyName];
    if (!axisName) {
      return undefined;
    }
    return this.getAxisIndex(axisName);
  }

  /**
   * Get axis indices for a relation
   * Maps relation names like "IS_A" to their axis indices
   *
   * @param {string} relationName - Relation name (e.g., "IS_A", "PART_OF")
   * @returns {number[]} Array of axis indices (empty if not mapped)
   */
  getRelationAxes(relationName) {
    const axisNames = this.relationMappings[relationName];
    if (!Array.isArray(axisNames)) {
      return [];
    }

    const indices = [];
    for (const name of axisNames) {
      const index = this.getAxisIndex(name);
      if (index !== undefined) {
        indices.push(index);
      }
    }
    return indices;
  }

  /**
   * Get logical properties for a relation
   * Returns transitive, symmetric, and inverse properties
   *
   * @param {string} relationName - Relation name (e.g., "IS_A", "CAUSES")
   * @returns {Object} { transitive: boolean, symmetric: boolean, inverse: string|null }
   */
  getRelationProperties(relationName) {
    const props = this.relationProperties[relationName];
    if (!props) {
      // Return default properties for unknown relations
      return { transitive: false, symmetric: false, inverse: null };
    }
    return {
      transitive: props.transitive || false,
      symmetric: props.symmetric || false,
      inverse: props.inverse || null
    };
  }

  /**
   * Get partition boundaries by name
   * @param {string} name - Partition name (e.g., "ontology", "axiology")
   * @returns {Object|undefined} { start, end } or undefined if not found
   */
  getPartition(name) {
    return this.partitions[name] ? { ...this.partitions[name] } : undefined;
  }

  /**
   * Check if a relation has a specific property
   * @param {string} relationName - Relation name
   * @param {string} property - Property to check ('transitive', 'symmetric', 'inheritable')
   * @returns {boolean}
   */
  isRelation(relationName, property) {
    const props = this.relationProperties[relationName];
    if (!props) return false;
    return props[property] === true;
  }

  /**
   * Check if a relation is transitive (FS-SR-03)
   * @param {string} relationName - Relation name
   * @returns {boolean}
   */
  isTransitive(relationName) {
    return this.isRelation(relationName, 'transitive');
  }

  /**
   * Check if a relation is inheritable via IS_A chains (FS-SR-03)
   * @param {string} relationName - Relation name
   * @returns {boolean}
   */
  isInheritable(relationName) {
    return this.isRelation(relationName, 'inheritable');
  }

  /**
   * Get all transitive relations (FS-SR-03)
   * @returns {string[]}
   */
  getTransitiveRelations() {
    return Object.entries(this.relationProperties)
      .filter(([_, props]) => props.transitive === true)
      .map(([name, _]) => name);
  }

  /**
   * Get all inheritable relations (FS-SR-03)
   * @returns {string[]}
   */
  getInheritableRelations() {
    return Object.entries(this.relationProperties)
      .filter(([_, props]) => props.inheritable === true)
      .map(([name, _]) => name);
  }

  /**
   * Get the inverse of a relation if defined
   * @param {string} relationName - Relation name
   * @returns {string|null} Inverse relation name or null
   */
  getInverseRelation(relationName) {
    const props = this.relationProperties[relationName];
    return props?.inverse || null;
  }

  /**
   * Check if a property is mapped
   * @param {string} propertyName - Property name
   * @returns {boolean}
   */
  hasProperty(propertyName) {
    return propertyName in this.propertyMappings;
  }

  /**
   * Check if a relation is mapped
   * @param {string} relationName - Relation name
   * @returns {boolean}
   */
  hasRelation(relationName) {
    return relationName in this.relationMappings;
  }

  /**
   * Get all axis names
   * @returns {string[]}
   */
  getAxisNames() {
    return Array.from(this.axes.keys());
  }

  /**
   * Get all property names
   * @returns {string[]}
   */
  getPropertyNames() {
    return Object.keys(this.propertyMappings);
  }

  /**
   * Get all relation names
   * @returns {string[]}
   */
  getRelationNames() {
    return Object.keys(this.relationMappings);
  }

  /**
   * Add a new property mapping at runtime
   * @param {string} propertyName - Property name
   * @param {string} axisName - Axis name to map to
   * @returns {boolean} True if mapping was added, false if axis doesn't exist
   */
  addPropertyMapping(propertyName, axisName) {
    if (!this.axes.has(axisName)) {
      return false;
    }
    this.propertyMappings[propertyName] = axisName;
    return true;
  }

  /**
   * Add a new relation mapping at runtime
   * @param {string} relationName - Relation name
   * @param {string[]} axisNames - Axis names to map to
   * @returns {boolean} True if all axes exist and mapping was added
   */
  addRelationMapping(relationName, axisNames) {
    for (const name of axisNames) {
      if (!this.axes.has(name)) {
        return false;
      }
    }
    this.relationMappings[relationName] = axisNames;
    return true;
  }

  /**
   * Export current state as a spec object (for serialization)
   * @returns {Object}
   */
  toSpec() {
    return {
      axes: Array.from(this.axes.values()),
      propertyMappings: { ...this.propertyMappings },
      relationMappings: { ...this.relationMappings },
      relationProperties: { ...this.relationProperties },
      partitions: { ...this.partitions }
    };
  }

  /**
   * Get all defined relation names (from relationProperties)
   * @returns {string[]}
   */
  getRelationPropertyNames() {
    return Object.keys(this.relationProperties);
  }

  /**
   * Get all partition names
   * @returns {string[]}
   */
  getPartitionNames() {
    return Object.keys(this.partitions);
  }

  // =========================================================================
  // Existence Dimension Helpers (v3.0)
  // =========================================================================

  /**
   * Existence level constants
   */
  static get EXISTENCE() {
    return {
      IMPOSSIBLE: -127,   // Contradicted by facts
      UNPROVEN: -64,      // Asserted but not verified
      POSSIBLE: 0,        // Consistent but not established
      DEMONSTRATED: 64,   // Derived via reasoning
      CERTAIN: 127        // From theory/axioms
    };
  }

  /**
   * Get the index of the Existence dimension
   * @returns {number} Existence dimension index (24)
   */
  getExistenceIndex() {
    return this.getAxisIndex('Existence') || 24;
  }

  /**
   * Get the existence level for an IS_A variant relation
   * @param {string} relationName - Relation name (IS_A, IS_A_CERTAIN, etc.)
   * @returns {number|null} Existence level or null if not an IS_A variant
   */
  getRelationExistenceLevel(relationName) {
    const props = this.relationProperties[relationName];
    if (!props) {
      return null;
    }

    // Check if it has existenceLevel property
    if (props.existenceLevel !== undefined) {
      return props.existenceLevel;
    }

    // Check if it's an umbrella IS_A (no explicit level)
    if (props.umbrella && props.baseRelation === undefined) {
      return null; // Umbrella relations search all levels
    }

    return null;
  }

  /**
   * Check if a relation is an IS_A variant (has baseRelation: "IS_A")
   * @param {string} relationName - Relation name
   * @returns {boolean}
   */
  isIsAVariant(relationName) {
    if (relationName === 'IS_A') return true;
    const props = this.relationProperties[relationName];
    return props && props.baseRelation === 'IS_A';
  }

  /**
   * Get all IS_A variant relation names
   * @returns {string[]}
   */
  getIsAVariants() {
    const variants = ['IS_A'];
    for (const [name, props] of Object.entries(this.relationProperties)) {
      if (props.baseRelation === 'IS_A') {
        variants.push(name);
      }
    }
    return variants;
  }

  // =========================================================================
  // Positioning Relations Helpers (v3.0)
  // =========================================================================

  /**
   * Check if a relation is a positioning relation (sets dimension values)
   * @param {string} relationName - Relation name
   * @returns {boolean}
   */
  isPositioningRelation(relationName) {
    const props = this.relationProperties[relationName];
    return props && props.positioning === true;
  }

  /**
   * Get all positioning relation names
   * @returns {string[]}
   */
  getPositioningRelations() {
    return Object.entries(this.relationProperties)
      .filter(([_, props]) => props.positioning === true)
      .map(([name, _]) => name);
  }

  /**
   * Get the target value for a positioning relation
   * @param {string} relationName - Relation name
   * @returns {number|null} Target value or null if not defined
   */
  getPositioningTargetValue(relationName) {
    const props = this.relationProperties[relationName];
    if (!props || !props.positioning) {
      return null;
    }
    return props.targetValue !== undefined ? props.targetValue : null;
  }

  /**
   * Get the axis indices that a positioning relation affects
   * @param {string} relationName - Relation name
   * @returns {number[]} Array of axis indices
   */
  getPositioningAxes(relationName) {
    // First check relationMappings
    const axisNames = this.relationMappings[relationName];
    if (!Array.isArray(axisNames)) {
      return [];
    }

    const indices = [];
    for (const name of axisNames) {
      const index = this.getAxisIndex(name);
      if (index !== undefined) {
        indices.push(index);
      }
    }
    return indices;
  }

  /**
   * Get positioning info for a relation (axis + target value)
   * @param {string} relationName - Relation name
   * @returns {Object|null} { axes: number[], targetValue: number|null, inheritable: boolean }
   */
  getPositioningInfo(relationName) {
    const props = this.relationProperties[relationName];
    if (!props || !props.positioning) {
      return null;
    }

    return {
      axes: this.getPositioningAxes(relationName),
      targetValue: props.targetValue !== undefined ? props.targetValue : null,
      inheritable: props.inheritable === true
    };
  }

  /**
   * Get all positioning relations grouped by axis
   * @returns {Map<string, string[]>} Map of axis name -> relation names
   */
  getPositioningRelationsByAxis() {
    const result = new Map();

    for (const [relation, axisNames] of Object.entries(this.relationMappings)) {
      const props = this.relationProperties[relation];
      if (!props || !props.positioning) continue;

      for (const axisName of axisNames) {
        if (!result.has(axisName)) {
          result.set(axisName, []);
        }
        result.get(axisName).push(relation);
      }
    }

    return result;
  }
}

// Singleton instance for shared use
let _sharedInstance = null;

/**
 * Get or create the shared DimensionRegistry instance
 * @param {Object} [options] - Options for creating new instance
 * @returns {DimensionRegistry}
 */
DimensionRegistry.getShared = function(options) {
  if (!_sharedInstance) {
    _sharedInstance = new DimensionRegistry(options);
  }
  return _sharedInstance;
};

/**
 * Reset the shared instance (for testing)
 */
DimensionRegistry.resetShared = function() {
  _sharedInstance = null;
};

module.exports = DimensionRegistry;
