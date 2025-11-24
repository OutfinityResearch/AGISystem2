const Config = require('../../src/support/config');
const BiasController = require('../../src/reason/bias_control');

async function run() {
  const config = new Config().load({ profile: 'auto_test' });
  const bias = new BiasController({ config, audit: null });

  const dims = config.get('dimensions');
  const maskBytes = Math.ceil(dims / 8);
  const relevanceMask = new Uint8Array(maskBytes);
  relevanceMask.fill(0xff);

  const diamond = {
    id: 'd1',
    minValues: new Int8Array(dims),
    maxValues: new Int8Array(dims),
    center: new Int8Array(dims),
    relevanceMask
  };

  const masked = bias.applyBiasMode('veil_of_ignorance', diamond);
  const origMask = diamond.relevanceMask;
  const okOriginalUnchanged = origMask.some((b) => b !== 0) &&
    origMask[0] === 0xff;

  const ax = config.getPartition('axiology');
  const bitSetOrig = (mask, index) => {
    const byteIndex = (index / 8) | 0;
    const bitIndex = index % 8;
    return (mask[byteIndex] & (1 << bitIndex)) !== 0;
  };
  const anyAxiologyBitCleared = !bitSetOrig(masked.relevanceMask, ax.start) ||
    !bitSetOrig(masked.relevanceMask, ax.end);

  const vec = new Int8Array([1, 2, 3, 4]);
  const maskedVec = bias.maskVector(vec, [{ start: 1, end: 2 }]);
  const okVec = maskedVec[0] === 1 && maskedVec[1] === 0 && maskedVec[2] === 0 && maskedVec[3] === 4;

  return { ok: okOriginalUnchanged && anyAxiologyBitCleared && okVec };
}

module.exports = { run };

