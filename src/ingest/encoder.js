/**
 * Encoder - Transforms parsed facts into geometric vectors
 *
 * Uses permutation binding to encode relations geometrically.
 * The relation permutes the object vector before adding to subject.
 *
 * DS: DS(/ingest/encoder.js)
 */

const VectorSpace = require('../core/vector_space');
const MathEngine = require('../core/math_engine');
const DimensionRegistry = require('../core/dimension_registry');

class Encoder {
  /**
   * Create an encoder
   * @param {Object} deps - Dependencies
   * @param {Config} deps.config - Configuration
   * @param {VectorSpace} [deps.vspace] - Vector space instance
   * @param {MathEngine} [deps.math] - Math engine
   * @param {RelationPermuter} [deps.permuter] - Relation permuter for geometric binding
   * @param {ConceptStore} deps.store - Concept store
   * @param {ClusterManager} [deps.cluster] - Cluster manager
   * @param {DimensionRegistry} [deps.dimensionRegistry] - Dimension registry for semantic mappings
   */
  constructor({ config, vspace, math, permuter, store, cluster, dimensionRegistry }) {
    this.config = config;
    this.vspace = vspace || new VectorSpace(config);
    this.math = math || MathEngine;
    this.permuter = permuter;
    this.store = store;
    this.cluster = cluster;
    this.horizon = config.get('recursionHorizon');
    this.dimensions = config.get('dimensions');
    this.dimRegistry = dimensionRegistry || DimensionRegistry.getShared();
  }

  /**
   * Encode a fact node into a vector
   * Uses permutation binding: vec = subject_vec + permute(object_vec, relation)
   *
   * @param {Object} node - Parsed fact {subject, relation, object}
   * @param {number} [depth=0] - Recursion depth
   * @returns {Int8Array} Encoded vector
   */
  encodeNode(node, depth = 0) {
    if (depth > this.horizon) {
      return this.vspace.createVector();
    }

    // Create base vector from subject
    const subjectVec = this._encodeToken(node.subject);

    // If no relation or object, return subject vector
    if (!node.relation || !node.object) {
      return subjectVec;
    }

    // Encode the object
    const objectVec = this._encodeToken(node.object);

    // Apply relation permutation if permuter is available
    let boundObject = objectVec;
    if (this.permuter && node.relation) {
      try {
        const permTable = this.permuter.get(node.relation);
        boundObject = this.math.permute
          ? this.math.permute(objectVec, permTable)
          : MathEngine.permute(objectVec, permTable);
      } catch (e) {
        // Relation not registered - try to register it dynamically
        try {
          this.permuter.register(node.relation);
          const permTable = this.permuter.get(node.relation);
          boundObject = this.math.permute
            ? this.math.permute(objectVec, permTable)
            : MathEngine.permute(objectVec, permTable);
        } catch (e2) {
          // Fall back to unpermuted object
          boundObject = objectVec;
        }
      }
    }

    // Combine subject and permuted object using saturated addition
    const result = this.math.addSaturated
      ? this.math.addSaturated(subjectVec, boundObject)
      : MathEngine.addSaturated(subjectVec, boundObject);

    // Handle special property encodings (legacy support for HAS_PROPERTY)
    if (node.relation === 'HAS_PROPERTY') {
      this._encodePropertyObject(node.object, result);
    }

    // Handle specific relation-based dimension activation
    this._activateRelationDimensions(node, result);

    return result;
  }

  /**
   * Encode a token (concept name) into a vector
   * Uses deterministic hashing to spread across dimensions
   *
   * @param {string} token - Token to encode
   * @returns {Int8Array} Token vector
   */
  _encodeToken(token) {
    const vec = this.vspace.createVector();

    if (!token || typeof token !== 'string') {
      return vec;
    }

    // Use multiple hash functions to spread the token across dimensions
    const dims = this.dimensions;

    // Primary hash: determines main activation dimensions
    let hash1 = 0;
    let hash2 = 0;
    for (let i = 0; i < token.length; i++) {
      const c = token.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1 + c) | 0;
      hash2 = ((hash2 << 7) + hash2 + c) | 0;
    }

    // Activate several dimensions based on hashes
    const numActivations = Math.min(8, Math.ceil(dims / 64));
    for (let i = 0; i < numActivations; i++) {
      const dim = Math.abs((hash1 + i * hash2) % dims);
      const sign = ((hash1 >> i) & 1) === 0 ? 1 : -1;
      const magnitude = 20 + (Math.abs(hash2 >> (i * 4)) % 40); // 20-60 range

      let value = sign * magnitude;
      if (value > 127) value = 127;
      if (value < -127) value = -127;

      // Saturated add to handle collisions
      const current = vec[dim];
      let newVal = current + value;
      if (newVal > 127) newVal = 127;
      if (newVal < -127) newVal = -127;
      vec[dim] = newVal;
    }

    return vec;
  }

  /**
   * Ingest a fact into the concept store
   *
   * @param {Object} node - Parsed fact {subject, relation, object}
   * @param {string} conceptId - Target concept ID (usually the subject)
   * @returns {Int8Array} The encoded vector
   */
  ingestFact(node, conceptId) {
    const vec = this.encodeNode(node, 0);
    const concept = this.store.ensureConcept(conceptId);

    if (this.cluster) {
      this.cluster.updateClusters(concept, vec);
    }

    // Mark store as dirty for retriever
    if (this.store._dirty !== undefined) {
      this.store._dirty = true;
    }

    return vec;
  }

  /**
   * Decode a vector back to potential concepts (approximate)
   * Uses inverse permutation for relation unbinding
   *
   * @param {Int8Array} vec - Vector to decode
   * @param {string} relation - Relation to unbind
   * @returns {Int8Array} Unbound vector
   */
  decodeRelation(vec, relation) {
    if (!this.permuter || !relation) {
      return vec;
    }

    try {
      const invTable = this.permuter.inverse(relation);
      return this.math.permute
        ? this.math.permute(vec, invTable)
        : MathEngine.permute(vec, invTable);
    } catch (e) {
      return vec;
    }
  }

  /**
   * Legacy hash function for backwards compatibility
   * @private
   */
  _hashToken(token) {
    if (!token) {
      return 0;
    }
    let acc = 0;
    for (let i = 0; i < token.length; i += 1) {
      acc = (acc + token.charCodeAt(i)) | 0;
    }
    if (acc > 127) {
      acc = 127;
    }
    if (acc < -127) {
      acc = -127;
    }
    return acc;
  }

  /**
   * Encode property=value patterns into specific dimensions
   * Uses DimensionRegistry to lookup axis indices dynamically.
   * @private
   */
  _encodePropertyObject(objectToken, vec) {
    if (!objectToken || typeof objectToken !== 'string') {
      return;
    }
    const parts = objectToken.split('=');
    if (parts.length !== 2) {
      return;
    }
    const key = parts[0].trim().toLowerCase();
    const rawValue = parts[1].trim();

    // Use DimensionRegistry to get axis index for this property
    const axis = this.dimRegistry.getPropertyAxis(key);

    if (axis !== undefined && axis >= 0 && axis < vec.length) {
      const num = Number(rawValue);
      if (Number.isFinite(num)) {
        let v = Math.round(num);
        if (v > 127) v = 127;
        if (v < -127) v = -127;
        vec[axis] = v;
      }
    }
  }

  /**
   * Alias for encodeNode - encode a fact node into a vector
   * @param {Object} node - Parsed fact {subject, relation, object}
   * @returns {Int8Array} Encoded vector
   */
  encode(node) {
    return this.encodeNode(node, 0);
  }

  /**
   * Encode multiple nodes in batch
   * @param {Array<Object>} nodes - Array of parsed facts
   * @returns {Array<Int8Array>} Array of encoded vectors
   */
  encodeBatch(nodes) {
    if (!Array.isArray(nodes)) {
      return [];
    }
    return nodes.map(node => this.encodeNode(node, 0));
  }

  /**
   * Activate specific dimensions based on relation type
   * Uses DimensionRegistry to lookup axis indices dynamically.
   * @private
   */
  _activateRelationDimensions(node, vec) {
    if (!node.relation) return;

    // Use DimensionRegistry to get axis indices for this relation
    const dims = this.dimRegistry.getRelationAxes(node.relation);

    if (dims && dims.length > 0) {
      for (const dim of dims) {
        if (dim >= 0 && dim < vec.length) {
          // Add a small activation to mark this relation type
          let val = vec[dim] + 10;
          if (val > 127) val = 127;
          vec[dim] = val;
        }
      }
    }

    // Encode existence level for IS_A variants
    this._encodeExistence(node, vec);
  }

  /**
   * Encode existence level into the Existence dimension
   * For IS_A variants, uses the relation's defined existence level.
   * For facts with explicit _existence, uses that value.
   * @private
   */
  _encodeExistence(node, vec) {
    const existenceIndex = this.dimRegistry.getExistenceIndex();
    if (existenceIndex === undefined || existenceIndex >= vec.length) {
      return;
    }

    let existenceLevel = null;

    // Check if node has explicit _existence (from fact)
    if (node._existence !== undefined) {
      existenceLevel = node._existence;
    }
    // Check if relation has a defined existence level (IS_A variants)
    else if (this.dimRegistry.isIsAVariant && this.dimRegistry.isIsAVariant(node.relation)) {
      existenceLevel = this.dimRegistry.getRelationExistenceLevel(node.relation);
    }

    // Encode existence level if available
    if (existenceLevel !== null) {
      // Clamp to Int8 range
      let val = existenceLevel;
      if (val > 127) val = 127;
      if (val < -127) val = -127;
      vec[existenceIndex] = val;
    }
  }
}


module.exports = Encoder;
