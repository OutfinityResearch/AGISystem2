class BoundedDiamond {
  constructor(id, label, dimensions) {
    this.id = id;
    this.label = label;
    this.minValues = new Int8Array(dimensions);
    this.maxValues = new Int8Array(dimensions);
    this.center = new Int8Array(dimensions);
    this.l1Radius = 0;
    const maskBytes = Math.ceil(dimensions / 8);
    this.relevanceMask = new Uint8Array(maskBytes);
    this.lshFingerprint = BigInt(0);
  }

  initialiseFromVector(vector) {
    this.minValues.set(vector);
    this.maxValues.set(vector);
    this.center.set(vector);
    this.l1Radius = 0;
    for (let i = 0; i < vector.length; i += 1) {
      const value = vector[i];
      if (value !== 0) {
        const byteIndex = (i / 8) | 0;
        const bitIndex = i % 8;
        this.relevanceMask[byteIndex] |= 1 << bitIndex;
      }
    }
  }
}

module.exports = BoundedDiamond;

