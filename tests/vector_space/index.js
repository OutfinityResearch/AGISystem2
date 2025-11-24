const Config = require('../../src/support/config');
const VectorSpace = require('../../src/core/vector_space');

async function run() {
  const config = new Config().load({ profile: 'auto_test' });
  const vspace = new VectorSpace(config);

  const v = vspace.createVector();
  const okLength = v.length === config.get('dimensions');
  let allZero = true;
  for (let i = 0; i < v.length; i += 1) {
    if (v[i] !== 0) {
      allZero = false;
      break;
    }
  }

  const source = vspace.createVector();
  source[0] = 10;
  const clone = vspace.cloneVector(source);
  const okClone = clone.length === source.length && clone[0] === 10;
  source[0] = 0;
  const okIndependence = clone[0] === 10;

  const a = new Int8Array([120, -120]);
  const b = new Int8Array([20, -20]);
  const sum = vspace.addSaturated(a, b);
  const okClamp = sum[0] === 127 && sum[1] === -127;

  return { ok: okLength && allZero && okClone && okIndependence && okClamp };
}

module.exports = { run };

