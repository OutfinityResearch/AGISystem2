const BoundedDiamond = require('../core/bounded_diamond');

class ConceptStore {
  constructor(dimensions) {
    this.dimensions = dimensions;
    this._concepts = new Map();
    this._facts = [];
  }

  ensureConcept(label) {
    let entry = this._concepts.get(label);
    if (!entry) {
      const diamond = new BoundedDiamond(label, label, this.dimensions);
      const vector = new Int8Array(this.dimensions);
      diamond.initialiseFromVector(vector);
      entry = {
        label,
        diamonds: [diamond]
      };
      this._concepts.set(label, entry);
    }
    return entry;
  }

  addFact(triple) {
    this._facts.push({ ...triple });
  }

  getConcept(label) {
    return this._concepts.get(label) || null;
  }

  getFacts() {
    return this._facts.map((f) => ({ ...f }));
  }
}

module.exports = ConceptStore;
