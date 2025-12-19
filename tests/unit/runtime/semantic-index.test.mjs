import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SEMANTIC_INDEX, SemanticIndex } from '../../../src/runtime/semantic-index.mjs';

describe('SemanticIndex', () => {
  test('DEFAULT_SEMANTIC_INDEX exposes relation properties', () => {
    assert.equal(DEFAULT_SEMANTIC_INDEX.isTransitive('isA'), true);
    assert.equal(DEFAULT_SEMANTIC_INDEX.isTransitive('locatedIn'), true);

    assert.equal(DEFAULT_SEMANTIC_INDEX.isSymmetric('marriedTo'), true);
    assert.equal(DEFAULT_SEMANTIC_INDEX.isReflexive('equals'), true);

    assert.equal(DEFAULT_SEMANTIC_INDEX.isInheritableProperty('hasProperty'), true);
  });

  test('fromCoreRelationsFile returns a SemanticIndex instance', () => {
    const idx = SemanticIndex.fromCoreRelationsFile();
    assert.ok(idx instanceof SemanticIndex);
    assert.ok(idx.transitiveRelations instanceof Set);
  });
});

