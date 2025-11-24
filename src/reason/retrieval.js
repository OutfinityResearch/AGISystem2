class Retriever {
  constructor({ config, math, store }) {
    this.config = config;
    this.math = math;
    this.store = store;
    this.strategy = config.getIndexStrategy().strategy;
  }

  setStrategy(strategyConfig) {
    if (strategyConfig && strategyConfig.strategy) {
      this.strategy = strategyConfig.strategy;
    }
  }

  indexConcept() {
  }

  nearest(vector, { k = 1 } = {}) {
    const results = [];
    const dims = [];
    for (const [label, concept] of this.store._concepts.entries()) {
      for (const d of concept.diamonds) {
        const dist = this.math.distanceMaskedL1(vector, d);
        if (Number.isFinite(dist)) {
          results.push({ label, diamond: d, distance: dist });
        }
      }
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  probe(vector) {
    return this.nearest(vector, { k: 1 });
  }

  refreshAll() {
  }
}

module.exports = Retriever;

