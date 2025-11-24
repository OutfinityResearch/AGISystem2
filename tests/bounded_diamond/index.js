const Config = require('../../src/support/config');
const BoundedDiamond = require('../../src/core/bounded_diamond');

async function run() {
  const config = new Config().load({ profile: 'auto_test' });
  const dims = config.get('dimensions');
  const diamond = new BoundedDiamond('c1', 'Concept1', dims);

  const vec = new Int8Array(dims);
  vec[0] = 10;
  vec[10] = -5;
  diamond.initialiseFromVector(vec);

  const okMin = diamond.minValues[0] === 10 && diamond.minValues[10] === -5;
  const okMax = diamond.maxValues[0] === 10 && diamond.maxValues[10] === -5;
  const okCenter = diamond.center[0] === 10 && diamond.center[10] === -5;
  const okRadius = diamond.l1Radius === 0;

  const mask = diamond.relevanceMask;
  const bitSet = (index) => {
    const byteIndex = (index / 8) | 0;
    const bitIndex = index % 8;
    return (mask[byteIndex] & (1 << bitIndex)) !== 0;
  };
  const okMask = bitSet(0) && bitSet(10);

  const okFingerprint = diamond.lshFingerprint === BigInt(0);

  return { ok: okMin && okMax && okCenter && okRadius && okMask && okFingerprint };
}

module.exports = { run };

