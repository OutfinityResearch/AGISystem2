class TheoryLayer {
  constructor(id, dimensions) {
    this.id = id;
    const maskBytes = Math.ceil(dimensions / 8);
    this.definitionMask = new Uint8Array(maskBytes);
    this.overrideMin = new Int8Array(dimensions);
    this.overrideMax = new Int8Array(dimensions);
    this.overrideRadius = 0;
  }
}

module.exports = TheoryLayer;

