import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';

test('runtime-reserved atoms are created before user atoms (EXACT invariant)', () => {
  const session = new Session({
    hdcStrategy: 'exact',
    geometry: 256,
    reasoningPriority: 'symbolicPriority',
    autoLoadCore: false
  });

  const reserved = session.runtimeReserved?.names || [];
  assert.ok(reserved.length > 0);

  // Force a user atom after reserved init.
  session.vocabulary.getOrCreate('Alice');

  const alloc = session.hdc?.strategy?._allocator;
  assert.ok(alloc && alloc.atomToIndex && alloc.indexToAtom);

  // All reserved atoms must have indices < any newly created non-reserved atom.
  const reservedIdx = reserved
    .map(name => alloc.atomToIndex.get(name))
    .filter(v => Number.isInteger(v));
  assert.equal(reservedIdx.length, reserved.length);

  const maxReserved = Math.max(...reservedIdx);
  const aliceIdx = alloc.atomToIndex.get('Alice');
  assert.ok(Number.isInteger(aliceIdx));
  assert.ok(aliceIdx > maxReserved);

  session.close();
});

