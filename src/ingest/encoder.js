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

    // În MVP, tratăm nodul ca pe o afirmație plată subject–relation–object.
    const vec = this.vspace.createVector();
    // Heuristic simplu: marcăm câteva dimensiuni ontologice pentru subiect și obiect
    // astfel încât vectorii să nu fie complet zero și să existe o vagă separare.
    const dims = this.vspace.dimensions;
    const markSubject = 0;
    const markObject = 1 < dims ? 1 : 0;

    const subjectHash = this._hashToken(node.subject);
    const objectHash = this._hashToken(node.object);
    vec[markSubject] = subjectHash;
    vec[markObject] = objectHash;
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
}

module.exports = Encoder;

