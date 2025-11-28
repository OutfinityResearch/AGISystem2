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
      const dimensionsPath = options.dimensionsPath ||
        path.join(process.cwd(), 'data', 'init', 'dimensions.json');
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
   * @param {string} property - Property to check ('transitive', 'symmetric')
   * @returns {boolean}
   */
  isRelation(relationName, property) {
    const props = this.relationProperties[relationName];
    if (!props) return false;
    return props[property] === true;
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
