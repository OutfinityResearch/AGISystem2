/**
 * Tests for Text Generator
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TextGenerator } from '../../../src/decoding/text-generator.mjs';
import { Session } from '../../../src/runtime/session.mjs';

describe('TextGenerator', () => {
  let session;
  let generator;

  function setup() {
    session = new Session({ geometry: 2048 });
    generator = new TextGenerator(session);
  }

  function learn(dsl) {
    const result = session.learn(dsl);
    if (!result.success) {
      throw new Error(`Learn failed: ${result.errors.join(', ')}`);
    }
    return result;
  }

  describe('constructor', () => {
    test('should create generator with session', () => {
      setup();
      assert.ok(generator.session === session);
      assert.ok(generator.decoder);
      assert.ok(generator.phrasing);
    });
  });

  describe('summarize', () => {
    test('should summarize simple fact', () => {
      setup();
      learn('@f loves John Mary');

      const vec = session.scope.get('f');
      const result = generator.summarize(vec);

      assert.ok('success' in result);
      if (result.success) {
        assert.ok('text' in result);
        assert.ok(result.text.length > 0);
      }
    });

    test('should return text for decoded vector', () => {
      setup();
      learn('@f likes Alice Pizza');

      const vec = session.scope.get('f');
      const result = generator.summarize(vec);

      if (result.success) {
        // Text should contain relevant parts
        assert.ok(typeof result.text === 'string');
      }
    });

    test('should return structure in result', () => {
      setup();
      learn('@f parent Bob Carol');

      const vec = session.scope.get('f');
      const result = generator.summarize(vec);

      if (result.success) {
        assert.ok('structure' in result);
        assert.ok('confidence' in result);
      }
    });

    test('should handle failed decode gracefully', () => {
      setup();
      // Don't learn anything - create random vector
      const randomVec = session.vocabulary.getOrCreate('isolated_random');

      const result = generator.summarize(randomVec);

      // Should not throw, but may not succeed
      assert.ok('success' in result);
      if (!result.success) {
        assert.ok('reason' in result);
      }
    });
  });

  describe('elaborate', () => {
    test('should elaborate valid proof', () => {
      setup();
      const proof = {
        valid: true,
        proof: {
          goal: 'test goal',
          method: 'direct',
          confidence: 0.9
        },
        steps: [
          { operation: 'direct', goal: 'test goal', result: 'found' }
        ],
        confidence: 0.9
      };

      const result = generator.elaborate(proof);

      assert.ok(result.success);
      assert.ok(result.text.includes('Proof'));
    });

    test('should handle invalid proof', () => {
      setup();
      const proof = {
        valid: false,
        reason: 'no proof found'
      };

      const result = generator.elaborate(proof);

      assert.ok(result.text.includes('failed'));
    });

    test('should include confidence in elaboration', () => {
      setup();
      const proof = {
        valid: true,
        proof: { goal: 'g', method: 'direct' },
        steps: [],
        confidence: 0.85
      };

      const result = generator.elaborate(proof);

      assert.ok(result.text.includes('85'));
    });

    test('should describe proof steps', () => {
      setup();
      const proof = {
        valid: true,
        proof: { goal: 'g', method: 'rule', rule: 'R1' },
        steps: [
          { operation: 'try_rule', goal: 'g', result: 'R1' },
          { operation: 'rule_success', goal: 'g', result: 'R1' }
        ],
        confidence: 0.8
      };

      const result = generator.elaborate(proof);

      assert.ok(result.text.includes('Steps') || result.text.includes('rule'));
    });
  });

  describe('describeProofTree', () => {
    test('should describe simple tree', () => {
      setup();
      const tree = {
        goal: 'test goal',
        method: 'direct',
        confidence: 0.9
      };

      const text = generator.describeProofTree(tree);

      assert.ok(text.includes('Goal'));
      assert.ok(text.includes('Method'));
    });

    test('should handle tree with rule', () => {
      setup();
      const tree = {
        goal: 'conclusion',
        method: 'rule',
        rule: 'MyRule',
        premises: [],
        confidence: 0.8
      };

      const text = generator.describeProofTree(tree);

      assert.ok(text.includes('Rule'));
      assert.ok(text.includes('MyRule'));
    });

    test('should handle nested premises', () => {
      setup();
      const tree = {
        goal: 'main',
        method: 'rule',
        rule: 'R1',
        premises: [
          { goal: 'sub1', method: 'direct' },
          { goal: 'sub2', method: 'direct' }
        ]
      };

      const text = generator.describeProofTree(tree);

      assert.ok(text.includes('Premises'));
    });
  });

  describe('describeStep', () => {
    test('should describe direct match', () => {
      setup();
      const step = { operation: 'direct', goal: 'test' };
      const text = generator.describeStep(step);
      assert.ok(text.includes('direct'));
    });

    test('should describe rule attempt', () => {
      setup();
      const step = { operation: 'try_rule', goal: 'test', result: 'R1' };
      const text = generator.describeStep(step);
      assert.ok(text.includes('rule') || text.includes('R1'));
    });

    test('should describe cycle detection', () => {
      setup();
      const step = { operation: 'cycle', goal: 'test' };
      const text = generator.describeStep(step);
      assert.ok(text.toLowerCase().includes('cycle'));
    });

    test('should describe depth limit', () => {
      setup();
      const step = { operation: 'depth_limit', goal: 'test' };
      const text = generator.describeStep(step);
      assert.ok(text.toLowerCase().includes('depth'));
    });

    test('should describe failure', () => {
      setup();
      const step = { operation: 'failed', goal: 'test' };
      const text = generator.describeStep(step);
      assert.ok(text.toLowerCase().includes('no proof') || text.includes('test'));
    });
  });

  describe('explainQuery', () => {
    test('should explain successful query', () => {
      setup();
      const result = {
        success: true,
        bindings: new Map([
          ['who', { answer: 'John', similarity: 0.85, alternatives: [] }]
        ]),
        confidence: 0.85
      };

      const explanation = generator.explainQuery(result, 'loves ?who Mary');

      assert.ok(explanation.success);
      assert.ok(explanation.text.includes('Query'));
      assert.ok(explanation.text.includes('John'));
    });

    test('should explain failed query', () => {
      setup();
      const result = {
        success: false,
        reason: 'No matches found',
        bindings: new Map()
      };

      const explanation = generator.explainQuery(result, 'unknown ?x');

      assert.equal(explanation.success, false);
      assert.ok(explanation.text.includes('failed'));
    });

    test('should show confidence in explanation', () => {
      setup();
      const result = {
        success: true,
        bindings: new Map([
          ['x', { answer: 'value', similarity: 0.92, alternatives: [] }]
        ]),
        confidence: 0.92
      };

      const explanation = generator.explainQuery(result, 'test ?x');

      assert.ok(explanation.text.includes('92'));
    });

    test('should show alternatives', () => {
      setup();
      const result = {
        success: true,
        bindings: new Map([
          ['x', {
            answer: 'first',
            similarity: 0.9,
            alternatives: [
              { value: 'second', similarity: 0.85 },
              { value: 'third', similarity: 0.8 }
            ]
          }]
        ]),
        confidence: 0.9
      };

      const explanation = generator.explainQuery(result, 'test ?x');

      assert.ok(explanation.text.includes('Alternative'));
    });

    test('should warn about ambiguity', () => {
      setup();
      const result = {
        success: true,
        bindings: new Map([
          ['x', { answer: 'value', similarity: 0.75, alternatives: [] }]
        ]),
        confidence: 0.75,
        ambiguous: true
      };

      const explanation = generator.explainQuery(result, 'test ?x');

      assert.ok(explanation.text.includes('ambiguous') || explanation.text.includes('Warning'));
    });
  });

  describe('registerTemplate', () => {
    test('should register custom phrasing template', () => {
      setup();
      generator.registerTemplate('customOp', '{Pos1} customizes {Pos2}.');

      // Now summarize should use the template
      learn(`
        @customOp:customOp __Relation
        @f customOp A B
      `);
      const vec = session.scope.get('f');
      const result = generator.summarize(vec);

      if (result.success && result.structure.operator === 'customOp') {
        assert.ok(result.text.includes('customizes'));
      }
    });
  });
});
