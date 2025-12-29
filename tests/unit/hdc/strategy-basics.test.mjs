import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';
import { topKSimilar } from '../../../src/core/operations.mjs';

describe('HDC strategy basics (beyond isVector)', () => {
  test('metric-affine is deterministic across sessions', () => {
    const s1 = new Session({ hdcStrategy: 'metric-affine', geometry: 32, reasoningPriority: 'symbolicPriority', autoLoadCore: false });
    const s2 = new Session({ hdcStrategy: 'metric-affine', geometry: 32, reasoningPriority: 'symbolicPriority', autoLoadCore: false });

    const a1 = s1.vocabulary.getOrCreate('Alice');
    const a2 = s2.vocabulary.getOrCreate('Alice');

    assert.equal(s1.hdc.equals(a1, a2), true);

    const candidates = new Map([
      ['Alice', a1],
      ['Bob', s1.vocabulary.getOrCreate('Bob')]
    ]);
    const ranked = topKSimilar(a1, candidates, 2, s1);
    assert.equal(ranked[0].name, 'Alice');
    assert.ok(ranked[0].similarity >= 0.99);

    s1.close();
    s2.close();
  });

  test('sparse-polynomial is deterministic across sessions', () => {
    const s1 = new Session({ hdcStrategy: 'sparse-polynomial', geometry: 4, reasoningPriority: 'symbolicPriority', autoLoadCore: false });
    const s2 = new Session({ hdcStrategy: 'sparse-polynomial', geometry: 4, reasoningPriority: 'symbolicPriority', autoLoadCore: false });

    const a1 = s1.vocabulary.getOrCreate('Alice');
    const a2 = s2.vocabulary.getOrCreate('Alice');

    assert.equal(s1.hdc.equals(a1, a2), true);

    const candidates = new Map([
      ['Alice', a1],
      ['Bob', s1.vocabulary.getOrCreate('Bob')]
    ]);
    const ranked = topKSimilar(a1, candidates, 2, s1);
    assert.equal(ranked[0].name, 'Alice');
    assert.ok(ranked[0].similarity >= 0.99);

    s1.close();
    s2.close();
  });
});

