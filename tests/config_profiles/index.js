const Config = require('../../src/support/config');

async function run() {
  let ok = true;

  const auto = new Config().load({ profile: 'auto_test' });
  ok = ok && auto.get('dimensions') === 512;
  ok = ok && auto.get('recursionHorizon') === 2;
  ok = ok && auto.getIndexStrategy().strategy === 'simhash';
  ok = ok && auto.getPersistenceStrategy().strategy === 'memory';

  const manual = new Config().load({ profile: 'manual_test' });
  ok = ok && manual.get('dimensions') === 1024;
  ok = ok && manual.get('recursionHorizon') === 3;
  const manualIdx = manual.getIndexStrategy();
  ok = ok && manualIdx.strategy === 'lsh_pstable';
  ok = ok && manualIdx.params.lshHashes === 32;

  const prod = new Config().load({ profile: 'prod' });
  ok = ok && prod.get('dimensions') === 2048;
  const prodIdx = prod.getIndexStrategy();
  ok = ok && prodIdx.strategy === 'lsh_pstable';

  let threw = false;
  try {
    // @ts-ignore
    new Config().load({ dimensions: 128 });
  } catch (e) {
    threw = true;
  }
  ok = ok && threw;

  return { ok };
}

module.exports = { run };

