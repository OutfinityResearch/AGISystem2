const MathEngine = require('../../src/core/math_engine');

async function run() {
  const a = new Int8Array([120, 120]);
  const b = new Int8Array([20, 20]);
  const sum = MathEngine.addSaturated(a, b);
  const okClamp = sum[0] === 127 && sum[1] === 127;

  const dims = 8;
  const minValues = new Int8Array(dims);
  const maxValues = new Int8Array(dims);
  const center = new Int8Array(dims);
  const relevanceMask = new Uint8Array(1);
  minValues.fill(-10);
  maxValues.fill(10);
  center.fill(0);
  relevanceMask[0] = 0xff;
  const concept = { minValues, maxValues, center, relevanceMask };

  const pointInside = new Int8Array(dims);
  pointInside.fill(1);
  const distanceInside = MathEngine.distanceMaskedL1(pointInside, concept);
  const okInside = Number.isFinite(distanceInside) && distanceInside === dims;

  const pointOutside = new Int8Array(dims);
  pointOutside[0] = 100;
  const distanceOutside = MathEngine.distanceMaskedL1(pointOutside, concept);
  const okOutside = distanceOutside === Infinity;

  const perm = [2, 0, 1];
  const inv = [1, 2, 0];
  const vector = new Int8Array([1, 2, 3]);
  const permuted = MathEngine.permute(vector, perm);
  const restored = MathEngine.inversePermute(permuted, perm);
  const okPermute = restored[0] === 1 && restored[1] === 2 && restored[2] === 3;

  return { ok: okClamp && okInside && okOutside && okPermute };
}

module.exports = { run };

