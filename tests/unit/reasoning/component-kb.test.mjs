/**
 * Unit tests for ComponentKB - Component-based Knowledge Base
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ComponentKB } from '../../../src/reasoning/component-kb.mjs';

describe('ComponentKB', () => {
  describe('addFact', () => {
    test('should add facts with metadata indexing', () => {
      const kb = new ComponentKB(null);

      kb.addFact({
        vector: null,
        metadata: { operator: 'isA', args: ['Rex', 'Dog'] }
      });

      const stats = kb.getStats();
      assert.strictEqual(stats.totalFacts, 1);
      assert.strictEqual(stats.operators, 1);
      assert.strictEqual(stats.arg0Values, 1);
      assert.strictEqual(stats.arg1Values, 1);
    });

    test('should index facts by operator', () => {
      const kb = new ComponentKB(null);

      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } });
      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Fido', 'Dog'] } });
      kb.addFact({ vector: null, metadata: { operator: 'likes', args: ['Alice', 'Bob'] } });

      const isAFacts = kb.findByOperator('isA');
      assert.strictEqual(isAFacts.length, 2);

      const likesFacts = kb.findByOperator('likes');
      assert.strictEqual(likesFacts.length, 1);
    });

    test('should index facts by arg0', () => {
      const kb = new ComponentKB(null);

      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } });
      kb.addFact({ vector: null, metadata: { operator: 'likes', args: ['Rex', 'Food'] } });

      const rexFacts = kb.findByArg0('Rex');
      assert.strictEqual(rexFacts.length, 2);
    });

    test('should index facts by arg1', () => {
      const kb = new ComponentKB(null);

      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } });
      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Fido', 'Dog'] } });

      const dogFacts = kb.findByArg1('Dog');
      assert.strictEqual(dogFacts.length, 2);
    });
  });

  describe('synonyms', () => {
    test('should register bidirectional synonyms', () => {
      const kb = new ComponentKB(null);

      kb.addSynonym('Dog', 'Canine');

      const dogSyns = kb.expandSynonyms('Dog');
      const canineSyns = kb.expandSynonyms('Canine');

      assert.ok(dogSyns.has('Dog'));
      assert.ok(dogSyns.has('Canine'));
      assert.ok(canineSyns.has('Dog'));
      assert.ok(canineSyns.has('Canine'));
    });

    test('should expand synonyms in searches', () => {
      const kb = new ComponentKB(null);

      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } });
      kb.addSynonym('Dog', 'Canine');

      // Search using synonym should find fact with original term
      const results = kb.findByArg1('Canine');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].args[1], 'Dog');
    });

    test('should find by operator and arg0 with synonyms', () => {
      const kb = new ComponentKB(null);

      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } });
      kb.addSynonym('isA', 'kindOf');

      // Should find fact using synonym operator
      const results = kb.findByOperatorAndArg0('kindOf', 'Rex');
      assert.strictEqual(results.length, 1);
    });

    test('should auto-register synonyms from synonym facts', () => {
      const kb = new ComponentKB(null);

      // Building from facts that include synonym declarations
      kb.buildFromKBFacts([
        { vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } },
        { vector: null, metadata: { operator: 'synonym', args: ['Dog', 'Canine'] } }
      ]);

      // Synonym should be registered
      const dogSyns = kb.expandSynonyms('Dog');
      assert.ok(dogSyns.has('Canine'));
    });

    test('should expand synonyms using transitive closure', () => {
      const kb = new ComponentKB(null);

      kb.addSynonym('Car', 'Automobile');
      kb.addSynonym('Automobile', 'Vehicle');

      const expanded = kb.expandSynonyms('Car');
      assert.ok(expanded.has('Car'));
      assert.ok(expanded.has('Automobile'));
      assert.ok(expanded.has('Vehicle'));
    });

    test('should return deterministic canonical representative', () => {
      const kb = new ComponentKB(null);

      kb.addSynonym('zTerm', 'aTerm');
      kb.addSynonym('aTerm', 'mTerm');

      assert.strictEqual(kb.canonicalizeName('zTerm'), 'aTerm');
      assert.strictEqual(kb.canonicalizeName('mTerm'), 'aTerm');
    });

    test('canonical representative overrides lexicographic fallback (and propagates via synonyms)', () => {
      const kb = new ComponentKB(null);

      kb.addSynonym('Car', 'Automobile');
      kb.addCanonical('Car', 'Automobile');

      // Even though "Automobile" < "Car" lexicographically, canonical mapping forces it.
      assert.strictEqual(kb.canonicalizeName('Car'), 'Automobile');
      // Propagates through synonyms closure.
      assert.strictEqual(kb.canonicalizeName('Automobile'), 'Automobile');
    });
  });

  describe('matchesWithSynonyms', () => {
    test('should match exact operator and args', () => {
      const kb = new ComponentKB(null);

      const fact = { operator: 'isA', args: ['Rex', 'Dog'] };
      assert.ok(kb.matchesWithSynonyms(fact, 'isA', 'Rex', 'Dog'));
    });

    test('should match with synonym expansion', () => {
      const kb = new ComponentKB(null);
      kb.addSynonym('Dog', 'Canine');

      const fact = { operator: 'isA', args: ['Rex', 'Dog'] };
      assert.ok(kb.matchesWithSynonyms(fact, 'isA', 'Rex', 'Canine'));
    });

    test('should not match when no synonym exists', () => {
      const kb = new ComponentKB(null);

      const fact = { operator: 'isA', args: ['Rex', 'Dog'] };
      assert.ok(!kb.matchesWithSynonyms(fact, 'isA', 'Rex', 'Cat'));
    });

    test('should allow null wildcards', () => {
      const kb = new ComponentKB(null);

      const fact = { operator: 'isA', args: ['Rex', 'Dog'] };
      assert.ok(kb.matchesWithSynonyms(fact, 'isA', null, null));
      assert.ok(kb.matchesWithSynonyms(fact, null, 'Rex', null));
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      const kb = new ComponentKB(null);

      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Rex', 'Dog'] } });
      kb.addFact({ vector: null, metadata: { operator: 'isA', args: ['Fido', 'Dog'] } });
      kb.addFact({ vector: null, metadata: { operator: 'likes', args: ['Alice', 'Bob'] } });
      kb.addSynonym('Dog', 'Canine');

      const stats = kb.getStats();

      assert.strictEqual(stats.totalFacts, 3);
      assert.strictEqual(stats.operators, 2);   // isA, likes
      assert.strictEqual(stats.arg0Values, 3);  // Rex, Fido, Alice
      assert.strictEqual(stats.arg1Values, 2);  // Dog, Bob
      assert.strictEqual(stats.synonymPairs, 2); // Dog->Canine, Canine->Dog
    });
  });
});
