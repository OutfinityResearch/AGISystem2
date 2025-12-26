import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { metadataToCanonicalDsl } from '../../../src/runtime/metadata-to-dsl.mjs';

describe('DS19: metadata -> canonical DSL', () => {
  test('renders plain facts', () => {
    assert.equal(metadataToCanonicalDsl({ operator: 'isA', args: ['Socrates', 'Human'] }), 'isA Socrates Human');
  });

  test('renders And/Or with nested parts', () => {
    const dsl = metadataToCanonicalDsl({
      operator: 'And',
      parts: [
        { operator: 'isA', args: ['Socrates', 'Human'] },
        { operator: 'isA', args: ['Socrates', 'Mortal'] }
      ]
    });
    assert.equal(dsl, 'And (isA Socrates Human) (isA Socrates Mortal)');
  });

  test('renders Implies with nested condition/conclusion', () => {
    const dsl = metadataToCanonicalDsl({
      operator: 'Implies',
      condition: { operator: 'isA', args: ['Socrates', 'Human'] },
      conclusion: { operator: 'isA', args: ['Socrates', 'Mortal'] }
    });
    assert.equal(dsl, 'Implies (isA Socrates Human) (isA Socrates Mortal)');
  });

  test('renders Not using canonical inner fields', () => {
    const dsl = metadataToCanonicalDsl({
      operator: 'Not',
      innerOperator: 'isA',
      innerArgs: ['Socrates', 'Human']
    });
    assert.equal(dsl, 'Not (isA Socrates Human)');
  });

  test('renders Not from flat args when inner fields missing', () => {
    const dsl = metadataToCanonicalDsl({
      operator: 'Not',
      args: ['can', 'Penguin', 'Fly']
    });
    assert.equal(dsl, 'Not (can Penguin Fly)');
  });
});
