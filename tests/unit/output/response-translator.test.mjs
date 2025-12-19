import { describe, test } from 'node:test';
import assert from 'node:assert';
import { ResponseTranslator } from '../../../src/output/response-translator.mjs';
import { Session } from '../../../src/runtime/session.mjs';

class FakeSession {
  constructor() {
    this.hdcStrategy = 'dense-binary';
    this.kbFacts = [];
    this.formatCalls = 0;
  }

  generateText(operator, args) {
    if (operator === 'can') {
      return `${args[0]} can ${args[1]}.`;
    }
    if (operator === 'locatedIn') {
      return `${args[0]} is located in ${args[1]}.`;
    }
    return `${operator} ${args.join(' ')}`;
  }

  formatResult() {
    this.formatCalls += 1;
    return 'formatted text';
  }

  elaborate(result) {
    return { text: `Elaborated ${result.topic || 'goal'}` };
  }
}

describe('ResponseTranslator', () => {
  test('learn translator summarizes facts', () => {
    const translator = new ResponseTranslator(new FakeSession());
    const output = translator.translate({
      action: 'learn',
      reasoningResult: { success: true, facts: 12 }
    });
    assert.strictEqual(output, 'Learned 12 facts');
  });

  test('query translator defers to formatResult for meta-ops', () => {
    const session = new FakeSession();
    const translator = new ResponseTranslator(session);
    const output = translator.translate({
      action: 'query',
      reasoningResult: {
        bindings: new Map(),
        allResults: [{ method: 'abduce', bindings: new Map([['x', { answer: 'Rain' }]]) }]
      }
    });
    assert.strictEqual(output, 'formatted text');
    assert.strictEqual(session.formatCalls, 1);
  });

  test('query translator renders bindings with proof steps', () => {
    const translator = new ResponseTranslator(new FakeSession());
    const bindings = new Map();
    bindings.set('x', { answer: 'Alice', steps: ['isA Alice Customer'] });
    const output = translator.translate({
      action: 'query',
      queryDsl: 'can ?x Pay',
      reasoningResult: {
        bindings,
        allResults: [{ method: 'direct', bindings }]
      }
    });
    assert.strictEqual(output, 'Alice can Pay. Proof: isA Alice Customer.');
  });

  test('prove translator emits negative proofs', () => {
    const translator = new ResponseTranslator(new FakeSession());
    const output = translator.translate({
      action: 'prove',
      reasoningResult: {
        valid: true,
        result: false,
        goal: 'locatedIn Tokyo Europe',
        steps: [{ operation: 'chain_step', from: 'Tokyo', to: 'Asia' }]
      }
    });
    assert.ok(output.startsWith('False: NOT'));
    assert.match(output, /Tokyo is located in Asia/);
  });
});
