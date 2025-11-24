class ValidationEngine {
  constructor({ stack, store, math, bias, config, audit }) {
    this.stack = stack;
    this.store = store;
    this.math = math;
    this.bias = bias;
    this.config = config;
    this.audit = audit;
  }

  checkConsistency(conceptId) {
    const concept = this.store.getConcept(conceptId);
    if (!concept) {
      return { consistent: true, details: 'No concept' };
    }
    for (const d of concept.diamonds) {
      for (let i = 0; i < d.minValues.length; i += 1) {
        if (d.minValues[i] > d.maxValues[i]) {
          return { consistent: false, details: `min>max at dim ${i}` };
        }
      }
    }
    return { consistent: true, details: 'OK' };
  }

  proveInclusion(point, conceptId) {
    const concept = this.store.getConcept(conceptId);
    if (!concept) {
      return { result: false, reason: 'Unknown concept' };
    }
    const diamond = concept.diamonds[0];
    const dist = this.math.distanceMaskedL1(point, diamond);
    const result = Number.isFinite(dist);
    return { result, distance: dist };
  }

  abstractQuery(spec) {
    return { spec, result: 'UNIMPLEMENTED' };
  }

  findCounterexample() {
    return null;
  }
}

module.exports = ValidationEngine;

