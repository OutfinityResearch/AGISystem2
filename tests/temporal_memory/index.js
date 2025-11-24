const Config = require('../../src/support/config');
const TemporalMemory = require('../../src/reason/temporal_memory');

async function run({ profile, timeoutMs }) {
  const config = new Config().load({ profile });
  const tm = new TemporalMemory({ config });

  const state0 = tm.initState();
  const okZero = state0.every((v) => v === 0);

  const dims = state0.length;
  const event = new Int8Array(dims);
  event[0] = 10;

  const state1 = tm.advance(state0, event);
  const okChanged = state1.some((v) => v !== 0);

  const rotated = tm.advance(state0, new Int8Array(dims));
  const rewound = tm.rewind(rotated, 1);
  let equal = true;
  for (let i = 0; i < dims; i += 1) {
    if (rotated[i] !== rewound[i]) {
      equal = false;
      break;
    }
  }
  const okRotation = equal;

  // Large rewind request should still complete quickly thanks to maxTemporalRewindSteps.
  const start = Date.now();
  const rewoundLarge = tm.rewind(state1, 1000000);
  const elapsed = Date.now() - start;
  const okLarge = rewoundLarge.length === state1.length && elapsed < (timeoutMs || 5000);

  return { ok: okZero && okChanged && okRotation && okLarge };
}

module.exports = { run };

