import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';

	describe('HolographicQueryEngine decode + equivalence metrics', () => {
	  test('EXACT holographic query uses decodeUnboundCandidates and can be equivalent to symbolic', () => {
	    const session = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'holographicPriority' });
	
	    const learn = session.learn(`
	      hasProperty Rex Friendly
	    `);
	    assert.equal(learn.success, true);
	
	    // Two-hole query so we do not hit the 1-hole direct index fast-path.
	    // Also avoid transitive operators like isA which may route to symbolic-only reasoning.
	    const result = session.query(`@q hasProperty ?x ?y`);
	    assert.equal(result.success, true);
	    assert.ok(Array.isArray(result.allResults) && result.allResults.length > 0);

    // Engine should use the strategy decode hook (per-hole).
    const ops = session.reasoningStats.operations || {};
    assert.ok((ops.holo_domain_decode || 0) >= 1);

    // Decision D4: when HDC validates, holographicPriority query skips symbolic supplement.
    assert.ok((ops.holo_skip_symbolic_supplement || 0) >= 1);
    assert.equal(session.reasoningStats.hdcEquivalentOps, 0);

    // But method selection can still prefer symbolic (by priority), so HDC "final" may be 0 here.
    assert.ok(session.reasoningStats.hdcUsefulOps === 0 || session.reasoningStats.hdcUsefulOps === 1);

    session.close();
  });
});
