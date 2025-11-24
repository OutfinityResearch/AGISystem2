const VectorSpace = require('../core/vector_space');
const MathEngine = require('../core/math_engine');
const RelationPermuter = require('../core/relation_permuter');

class TemporalMemory {
  constructor({ config, math, permuter, vspace }) {
    this.config = config;
    this.math = math || MathEngine;
    this.vspace = vspace || new VectorSpace(config);
    const dims = this.vspace.dimensions;
    this.permuter = permuter || new RelationPermuter(config);
    try {
      this.permuter.register('time_tick');
      this._tickPerm = this.permuter.get('time_tick');
      this._tickInv = this.permuter.inverse('time_tick');
    } catch {
      this._tickPerm = this._identityPermutation(dims);
      this._tickInv = this._buildInverse(this._tickPerm);
    }
  }

  initState() {
    return this.vspace.createVector();
  }

  advance(state, eventVector) {
    const rotated = this.math.permute(state, this._tickPerm);
    const combined = this.math.addSaturated(rotated, eventVector);
    return combined;
  }

  rewind(state, steps) {
    const maxSteps = this.config && this.config.get('maxTemporalRewindSteps')
      ? this.config.get('maxTemporalRewindSteps')
      : steps;
    const iterations = Math.min(steps, maxSteps);
    let current = state;
    for (let s = 0; s < iterations; s += 1) {
      current = this.math.permute(current, this._tickInv);
    }
    return current;
  }

  diff(a, b) {
    const dims = this.vspace.dimensions;
    let distance = 0;
    for (let i = 0; i < dims; i += 1) {
      const diff = a[i] - b[i];
      distance += diff >= 0 ? diff : -diff;
    }
    return distance;
  }

  _identityPermutation(dimensions) {
    const arr = new Array(dimensions);
    for (let i = 0; i < dimensions; i += 1) {
      arr[i] = i;
    }
    return arr;
  }

  _buildInverse(table) {
    const dims = table.length;
    const inverse = new Array(dims);
    for (let i = 0; i < dims; i += 1) {
      const t = table[i];
      inverse[t] = i;
    }
    return inverse;
  }
}

module.exports = TemporalMemory;
