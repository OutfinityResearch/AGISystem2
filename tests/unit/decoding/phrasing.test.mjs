/**
 * Tests for Phrasing Engine
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PhrasingEngine } from '../../../src/decoding/phrasing.mjs';

describe('PhrasingEngine', () => {
  let phrasing;

  function setup() {
    phrasing = new PhrasingEngine();
  }

  describe('constructor', () => {
    test('should create phrasing engine with default templates', () => {
      setup();
      assert.ok(phrasing.templates.size > 0);
    });

    test('should have common operator templates', () => {
      setup();
      assert.ok(phrasing.templates.has('loves'));
      assert.ok(phrasing.templates.has('isA'));
      assert.ok(phrasing.templates.has('Implies'));
    });
  });

  describe('registerTemplate', () => {
    test('should register custom template', () => {
      setup();
      phrasing.registerTemplate('worksAt', '{Pos1} works at {Pos2}.');

      assert.ok(phrasing.customTemplates.has('worksAt'));
    });

    test('should extract positions from pattern', () => {
      setup();
      phrasing.registerTemplate('between', '{Pos1} is between {Pos2} and {Pos3}.');

      const template = phrasing.getTemplate('between');
      assert.deepEqual(template.positions.sort(), [1, 2, 3]);
    });

    test('should override built-in template', () => {
      setup();
      phrasing.registerTemplate('loves', 'Custom: {Pos1} adores {Pos2}.');

      const template = phrasing.getTemplate('loves');
      assert.ok(template.pattern.includes('Custom'));
    });
  });

  describe('getTemplate', () => {
    test('should return template for known operator', () => {
      setup();
      const template = phrasing.getTemplate('loves');

      assert.ok(template);
      assert.ok('pattern' in template);
      assert.ok('positions' in template);
    });

    test('should return null for unknown operator', () => {
      setup();
      const template = phrasing.getTemplate('unknownOperator');
      assert.equal(template, null);
    });

    test('should prefer custom template over built-in', () => {
      setup();
      phrasing.registerTemplate('test', 'Custom {Pos1}');

      const template = phrasing.getTemplate('test');
      assert.ok(template.pattern.includes('Custom'));
    });
  });

  describe('generateText', () => {
    test('should generate text for binary relation', () => {
      setup();
      const structure = {
        operator: 'loves',
        arguments: [
          { position: 1, value: 'Romeo' },
          { position: 2, value: 'Juliet' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('Romeo'));
      assert.ok(text.includes('Juliet'));
      assert.ok(text.includes('loves'));
    });

    test('should generate text for isA relation', () => {
      setup();
      const structure = {
        operator: 'isA',
        arguments: [
          { position: 1, value: 'Socrates' },
          { position: 2, value: 'Human' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('Socrates'));
      assert.ok(text.includes('Human'));
    });

    test('should generate text for ternary relation', () => {
      setup();
      const structure = {
        operator: 'sells',
        arguments: [
          { position: 1, value: 'Alice' },
          { position: 2, value: 'Book' },
          { position: 3, value: 'Bob' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('Alice'));
      assert.ok(text.includes('Book'));
      assert.ok(text.includes('Bob'));
    });

    test('should generate text for Implies', () => {
      setup();
      const structure = {
        operator: 'Implies',
        arguments: [
          { position: 1, value: 'condition' },
          { position: 2, value: 'conclusion' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('If'));
      assert.ok(text.includes('then'));
    });

    test('should handle missing arguments gracefully', () => {
      setup();
      const structure = {
        operator: 'loves',
        arguments: [
          { position: 1, value: 'Alice' }
          // Missing position 2
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('Alice'));
      assert.ok(text.includes('?'), 'missing arg should show placeholder');
    });

    test('should handle unknown operator with generic phrase', () => {
      setup();
      const structure = {
        operator: 'customRelation',
        arguments: [
          { position: 1, value: 'X' },
          { position: 2, value: 'Y' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('X'));
      assert.ok(text.includes('Y'));
      assert.ok(text.includes('customRelation'));
    });
  });

  describe('applyTemplate', () => {
    test('should replace position markers', () => {
      setup();
      const template = {
        pattern: '{Pos1} knows {Pos2}.',
        positions: [1, 2]
      };

      const args = [
        { position: 1, value: 'Alice' },
        { position: 2, value: 'Bob' }
      ];

      const text = phrasing.applyTemplate(template, args);
      assert.equal(text, 'Alice knows Bob.');
    });

    test('should handle nested structures', () => {
      setup();
      const template = {
        pattern: '{Pos1} implies {Pos2}.',
        positions: [1, 2]
      };

      const args = [
        { position: 1, nested: { operator: 'isA', arguments: [{ position: 1, value: 'X' }] } },
        { position: 2, value: 'result' }
      ];

      const text = phrasing.applyTemplate(template, args);
      // Should recursively generate text for nested
      assert.ok(text.includes('result'));
    });
  });

  describe('genericPhrase', () => {
    test('should handle zero arguments', () => {
      setup();
      const text = phrasing.genericPhrase('fact', []);
      assert.equal(text, 'fact.');
    });

    test('should handle single argument', () => {
      setup();
      const text = phrasing.genericPhrase('happy', [{ position: 1, value: 'Alice' }]);
      assert.ok(text.includes('Alice'));
      assert.ok(text.includes('happy'));
    });

    test('should handle two arguments', () => {
      setup();
      const text = phrasing.genericPhrase('relates', [
        { position: 1, value: 'A' },
        { position: 2, value: 'B' }
      ]);
      assert.ok(text.includes('A'));
      assert.ok(text.includes('relates'));
      assert.ok(text.includes('B'));
    });

    test('should handle many arguments', () => {
      setup();
      const text = phrasing.genericPhrase('complex', [
        { position: 1, value: 'A' },
        { position: 2, value: 'B' },
        { position: 3, value: 'C' },
        { position: 4, value: 'D' }
      ]);
      assert.ok(text.includes('A'));
      assert.ok(text.includes('D'));
    });

    test('should sort arguments by position', () => {
      setup();
      const text = phrasing.genericPhrase('rel', [
        { position: 3, value: 'C' },
        { position: 1, value: 'A' },
        { position: 2, value: 'B' }
      ]);
      // A should come before B which should come before C
      const posA = text.indexOf('A');
      const posB = text.indexOf('B');
      const posC = text.indexOf('C');
      assert.ok(posA < posB && posB < posC);
    });
  });

  describe('listOperators', () => {
    test('should return all operators', () => {
      setup();
      phrasing.registerTemplate('custom1', '{Pos1}');
      phrasing.registerTemplate('custom2', '{Pos1}');

      const operators = phrasing.listOperators();

      assert.ok(operators.includes('loves'));
      assert.ok(operators.includes('custom1'));
      assert.ok(operators.includes('custom2'));
    });

    test('should dedupe operators', () => {
      setup();
      phrasing.registerTemplate('loves', 'Override {Pos1} {Pos2}');

      const operators = phrasing.listOperators();
      const lovesCount = operators.filter(op => op === 'loves').length;

      assert.equal(lovesCount, 1);
    });
  });

  describe('logical operators', () => {
    test('should phrase And correctly', () => {
      setup();
      const structure = {
        operator: 'And',
        arguments: [
          { position: 1, value: 'A' },
          { position: 2, value: 'B' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('and'));
    });

    test('should phrase Or correctly', () => {
      setup();
      const structure = {
        operator: 'Or',
        arguments: [
          { position: 1, value: 'A' },
          { position: 2, value: 'B' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('or'));
    });

    test('should phrase Not correctly', () => {
      setup();
      const structure = {
        operator: 'Not',
        arguments: [
          { position: 1, value: 'proposition' }
        ]
      };

      const text = phrasing.generateText(structure);
      assert.ok(text.includes('Not'));
    });
  });
});
