const Config = require('../../src/support/config');
const VectorSpace = require('../../src/core/vector_space');

async function run() {
  const config = new Config().load({ profile: 'auto_test' });
  const vspace = new VectorSpace(config);

  const v = vspace.allocVector();
  const okLength = v.length === config.get('dimensions');
  let allZero = true;
  for (let i = 0; i < v.length; i += 1) {
    if (v[i] !== 0) {
      allZero = false;
      break;
    }
  }

  const source = vspace.allocVector();
  source[0] = 10;
  const clone = vspace.allocVector();
  vspace.copy(clone, source);
  const okClone = clone.length === source.length && clone[0] === 10;
  source[0] = 0;
  const okIndependence = clone[0] === 10;

  const a = vspace.allocVector();
  const b = vspace.allocVector();
  a[0] = 120;
  a[1] = -120;
  b[0] = 20;
  b[1] = -20;
  const sum = vspace.addSaturated(a, b);
  const okClamp = sum[0] === 127 && sum[1] === -127;

  return { ok: okLength && allZero && okClone && okIndependence && okClamp };
}

module.exports = { run };
