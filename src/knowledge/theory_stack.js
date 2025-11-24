const TheoryLayer = require('./theory_layer');

class TheoryStack {
  constructor(dimensions) {
    this.dimensions = dimensions;
    this.layers = [];
  }

  push(layer) {
    if (!(layer instanceof TheoryLayer)) {
      throw new Error('Only TheoryLayer instances can be pushed onto TheoryStack');
    }
    this.layers.push(layer);
  }

  clear() {
    this.layers = [];
  }

  getActiveLayers() {
    return this.layers.slice();
  }
}

module.exports = TheoryStack;

