class MathEngine {
  static distanceMaskedL1(pointVector, concept, maskOverride) {
    const minValues = concept.minValues;
    const maxValues = concept.maxValues;
    const center = concept.center;
    const relevanceMask = maskOverride || concept.relevanceMask;
    const dims = center.length;

    let distance = 0;
    for (let i = 0; i < dims; i += 1) {
      const byteIndex = (i / 8) | 0;
      const bitIndex = i % 8;
      const maskByte = relevanceMask[byteIndex];
      const relevant = (maskByte & (1 << bitIndex)) !== 0;
      if (!relevant) {
        continue;
      }
      const value = pointVector[i];
      if (value < minValues[i] || value > maxValues[i]) {
        return Infinity;
      }
      const diff = value - center[i];
      distance += diff >= 0 ? diff : -diff;
    }
    return distance;
  }

  static addSaturated(vecA, vecB) {
    const result = new Int8Array(vecA.length);
    for (let i = 0; i < vecA.length; i += 1) {
      let value = vecA[i] + vecB[i];
      if (value > 127) {
        value = 127;
      } else if (value < -127) {
        value = -127;
      }
      result[i] = value;
    }
    return result;
  }

  static permute(vector, permutationTable) {
    const dims = vector.length;
    const result = new Int8Array(dims);
    for (let i = 0; i < dims; i += 1) {
      const sourceIndex = permutationTable[i];
      result[i] = vector[sourceIndex];
    }
    return result;
  }

  static inversePermute(vector, permutationTable) {
    const dims = vector.length;
    const result = new Int8Array(dims);
    for (let i = 0; i < dims; i += 1) {
      const sourceIndex = permutationTable[i];
      result[sourceIndex] = vector[i];
    }
    return result;
  }
}

module.exports = MathEngine;
