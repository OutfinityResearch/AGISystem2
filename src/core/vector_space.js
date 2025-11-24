const Config = require('../support/config');

class VectorSpace {
  constructor(config) {
    this.config = config instanceof Config ? config : new Config().load(config || {});
    this.dimensions = this.config.get('dimensions');
    this.blockSize = this.config.get('blockSize') || 8;
  }

  allocVector() {
    return new Int8Array(this.dimensions);
  }

  allocMask() {
    return new Uint8Array(Math.ceil(this.dimensions / 8));
  }

  clampAdd(dst, srcA, srcB) {
    const dims = this.dimensions;
    for (let i = 0; i < dims; i += 1) {
      let value = srcA[i] + srcB[i];
      if (value > 127) {
        value = 127;
      } else if (value < -127) {
        value = -127;
      }
      dst[i] = value;
    }
    return dst;
  }

  copy(dst, src) {
    const dims = this.dimensions;
    for (let i = 0; i < dims; i += 1) {
      dst[i] = src[i];
    }
    return dst;
  }

  blockReduce(vec, reducerFn, initial) {
    const dims = this.dimensions;
    const block = this.blockSize || 8;
    let acc = initial;
    let i = 0;
    for (; i + block <= dims; i += block) {
      for (let j = 0; j < block; j += 1) {
        acc = reducerFn(acc, vec[i + j]);
      }
    }
    for (; i < dims; i += 1) {
      acc = reducerFn(acc, vec[i]);
    }
    return acc;
  }

  createVector() {
    return this.allocVector();
  }

  cloneVector(source) {
    const result = this.allocVector();
    return this.copy(result, source);
  }

  addSaturated(target, other) {
    const result = this.allocVector();
    return this.clampAdd(result, target, other);
  }
}

module.exports = VectorSpace;
