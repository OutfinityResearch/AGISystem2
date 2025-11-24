const Config = require('../support/config');

class VectorSpace {
  constructor(config) {
    this.config = config instanceof Config ? config : new Config().load(config || {});
    this.dimensions = this.config.get('dimensions');
  }

  createVector() {
    return new Int8Array(this.dimensions);
  }

  cloneVector(source) {
    const result = new Int8Array(this.dimensions);
    result.set(source);
    return result;
  }

  addSaturated(target, other) {
    const dims = this.dimensions;
    for (let i = 0; i < dims; i += 1) {
      let value = target[i] + other[i];
      if (value > 127) {
        value = 127;
      } else if (value < -127) {
        value = -127;
      }
      target[i] = value;
    }
    return target;
  }
}

module.exports = VectorSpace;

