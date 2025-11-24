class BiasController {
  constructor({ config, audit }) {
    this.config = config;
    this.audit = audit;
    this.ontology = config.getPartition('ontology');
    this.axiology = config.getPartition('axiology');
  }

  listModes() {
    return [
      { name: 'none', description: 'No additional masking' },
      { name: 'veil_of_ignorance', description: 'Mask axiology and protected ontology attributes' }
    ];
  }

  applyBiasMode(mode, diamond) {
    if (mode === 'none' || !mode) {
      return diamond;
    }
    const copy = {
      ...diamond,
      minValues: new Int8Array(diamond.minValues),
      maxValues: new Int8Array(diamond.maxValues),
      center: new Int8Array(diamond.center),
      relevanceMask: new Uint8Array(diamond.relevanceMask)
    };
    if (mode === 'veil_of_ignorance') {
      this._maskRange(copy.relevanceMask, this.axiology.start, this.axiology.end);
    }
    if (this.audit) {
      this.audit.write({ kind: 'biasMode', mode, diamondId: diamond.id });
    }
    return copy;
  }

  maskVector(vec, partitions) {
    const masked = new Int8Array(vec);
    for (const part of partitions) {
      const { start, end } = part;
      for (let i = start; i <= end && i < masked.length; i += 1) {
        masked[i] = 0;
      }
    }
    return masked;
  }

  _maskRange(mask, start, end) {
    for (let i = start; i <= end; i += 1) {
      const byteIndex = (i / 8) | 0;
      const bitIndex = i % 8;
      mask[byteIndex] &= ~(1 << bitIndex);
    }
  }
}

module.exports = BiasController;

