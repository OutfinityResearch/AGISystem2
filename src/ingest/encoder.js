const VectorSpace = require('../core/vector_space');
const MathEngine = require('../core/math_engine');

class Encoder {
  constructor({ config, vspace, math, permuter, store, cluster }) {
    this.config = config;
    this.vspace = vspace || new VectorSpace(config);
    this.math = math || MathEngine;
    this.permuter = permuter;
    this.store = store;
    this.cluster = cluster;
    this.horizon = config.get('recursionHorizon');
  }

  encodeNode(node, depth = 0) {
    if (depth > this.horizon) {
      return this.vspace.createVector();
    }

    const vec = this.vspace.createVector();

    // Simple baseline: mark a couple of dimensions based on subject and object
    // so that vectors are not completely zero and concepts separate slightly.
    const dims = this.vspace.dimensions;
    const markSubject = 0;
    const markObject = 1 < dims ? 1 : 0;

    const subjectHash = this._hashToken(node.subject);
    const objectHash = this._hashToken(node.object);
    vec[markSubject] = subjectHash;
    vec[markObject] = objectHash;

    // Property-like objects under HAS_PROPERTY (e.g., boiling_point=100) can
    // project into specific ontology axes (such as Temperature) when the key
    // and value are recognised. This keeps the overall scheme simple while
    // allowing more interpretable dimensions for well-known physical properties.
    if (node && typeof node.relation === 'string' && node.relation === 'HAS_PROPERTY') {
      this._encodePropertyObject(node.object, vec);
    }

    return vec;
  }

  ingestFact(node, conceptId) {
    const vec = this.encodeNode(node, 0);
    const concept = this.store.ensureConcept(conceptId);
    if (this.cluster) {
      this.cluster.updateClusters(concept, vec);
    }
    return vec;
  }

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

  _encodePropertyObject(objectToken, vec) {
    if (!objectToken || typeof objectToken !== 'string') {
      return;
    }
    const parts = objectToken.split('=');
    if (parts.length !== 2) {
      return;
    }
    const key = parts[0].trim();
    const rawValue = parts[1].trim();

    // Numeric temperature mapping: boiling_point=NNN → Temperature axis (dimension 4).
    if (key === 'boiling_point') {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) {
        return;
      }
      const axis = 4; // Temperature axis, see DS[/knowledge/dimensions].
      if (axis >= 0 && axis < vec.length) {
        let v = Math.round(num);
        if (v > 127) {
          v = 127;
        } else if (v < -127) {
          v = -127;
        }
        vec[axis] = v;
      }
    }
  }
}

module.exports = Encoder;
