import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Session } from '../../../src/runtime/session.mjs';
import { bind, unbind, topKSimilar } from '../../../src/core/operations.mjs';
import { getPositionVector } from '../../../src/core/position.mjs';

describe('EXACT strategy (DS25)', () => {
  test('session-local createFromName is deterministic within a session', () => {
    const session = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'symbolicPriority' });
    const a1 = session.vocabulary.getOrCreate('Alice');
    const a2 = session.vocabulary.getOrCreate('Alice');
    assert.equal(session.hdc.equals(a1, a2), true);
    session.close();
  });

  test('appearance-index dictionaries are isolated per session instance', () => {
    const s1 = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'symbolicPriority' });
    const s2 = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'symbolicPriority' });

    // Force different declaration orders.
    const s1Alice = s1.vocabulary.getOrCreate('Alice');
    s1.vocabulary.getOrCreate('Bob');

    const s2Bob = s2.vocabulary.getOrCreate('Bob');
    const s2Alice = s2.vocabulary.getOrCreate('Alice');

    assert.equal(s1.hdc.equals(s1Alice, s2Alice), false);
    assert.equal(s1.hdc.equals(s2Bob, s1.vocabulary.getOrCreate('Bob')), false);

    s1.close();
    s2.close();
  });

  test('unbind retrieves exact hole value from a bundled KB', () => {
    const session = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'symbolicPriority' });

    const op = session.vocabulary.getOrCreate('SAT_OP');
    const book = session.vocabulary.getOrCreate('BOOK01');
    const key = session.vocabulary.getOrCreate('Topic');
    const idea = session.vocabulary.getOrCreate('IdeaX');

    const pos1 = getPositionVector(1, session.geometry, session.hdcStrategy, session);
    const pos2 = getPositionVector(2, session.geometry, session.hdcStrategy, session);
    const pos3 = getPositionVector(3, session.geometry, session.hdcStrategy, session);

    let fact = op;
    fact = bind(fact, bind(book, pos1));
    fact = bind(fact, bind(key, pos2));
    fact = bind(fact, bind(idea, pos3));

    const kb = session.hdc.bundle([fact]);

    let partial = op;
    partial = bind(partial, bind(book, pos1));
    partial = bind(partial, bind(key, pos2));

    const answer = unbind(kb, partial);
    const ideaVec = unbind(answer, pos3);

    const candidates = new Map([
      ['IdeaX', idea],
      ['IdeaY', session.vocabulary.getOrCreate('IdeaY')]
    ]);

    const ranked = topKSimilar(ideaVec, candidates, 2, session);
    assert.equal(ranked[0].name, 'IdeaX');
    assert.equal(ranked[0].similarity, 1);

    session.close();
  });

  test('topKSimilar can retrieve multiple answers from a superposed candidate', () => {
    const session = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'symbolicPriority' });

    const op = session.vocabulary.getOrCreate('SAT_OP');
    const book = session.vocabulary.getOrCreate('BOOK01');
    const key = session.vocabulary.getOrCreate('Topic');
    const ideaA = session.vocabulary.getOrCreate('IdeaA');
    const ideaB = session.vocabulary.getOrCreate('IdeaB');

    const pos1 = getPositionVector(1, session.geometry, session.hdcStrategy, session);
    const pos2 = getPositionVector(2, session.geometry, session.hdcStrategy, session);
    const pos3 = getPositionVector(3, session.geometry, session.hdcStrategy, session);

    const makeFact = (idea) => {
      let f = op;
      f = bind(f, bind(book, pos1));
      f = bind(f, bind(key, pos2));
      f = bind(f, bind(idea, pos3));
      return f;
    };

    const kb = session.hdc.bundle([makeFact(ideaA), makeFact(ideaB)]);

    let partial = op;
    partial = bind(partial, bind(book, pos1));
    partial = bind(partial, bind(key, pos2));

    const answer = unbind(kb, partial);
    const ideaVec = unbind(answer, pos3);

    const candidates = new Map([
      ['IdeaA', ideaA],
      ['IdeaB', ideaB],
      ['IdeaC', session.vocabulary.getOrCreate('IdeaC')]
    ]);

    const ranked = topKSimilar(ideaVec, candidates, 3, session);
    const topNames = ranked.filter(r => r.similarity === 1).map(r => r.name).sort();
    assert.deepEqual(topNames, ['IdeaA', 'IdeaB']);

    session.close();
  });

  test('decodeUnboundCandidates can project residuals to entity atoms', () => {
    const session = new Session({ hdcStrategy: 'exact', geometry: 256, reasoningPriority: 'symbolicPriority' });

    const op = session.vocabulary.getOrCreate('SAT_OP');
    const book = session.vocabulary.getOrCreate('BOOK01');
    const key = session.vocabulary.getOrCreate('Topic');
    const ideaA = session.vocabulary.getOrCreate('IdeaA');
    const ideaB = session.vocabulary.getOrCreate('IdeaB');

    const pos1 = getPositionVector(1, session.geometry, session.hdcStrategy, session);
    const pos2 = getPositionVector(2, session.geometry, session.hdcStrategy, session);
    const pos3 = getPositionVector(3, session.geometry, session.hdcStrategy, session);

    const makeFact = (idea) => {
      let f = op;
      f = bind(f, bind(book, pos1));
      f = bind(f, bind(key, pos2));
      f = bind(f, bind(idea, pos3));
      return f;
    };

    const kb = session.hdc.bundle([makeFact(ideaA), makeFact(ideaB)]);

    let partial = op;
    partial = bind(partial, bind(book, pos1));
    partial = bind(partial, bind(key, pos2));

    // Equivalent to the holographic engine's per-hole extraction:
    // unboundVec = unbind(unbind(KB, partial), Pos3)
    const unboundVec = unbind(unbind(kb, partial), pos3);

    const decoded = session.hdc.strategy.decodeUnboundCandidates(unboundVec, {
      session,
      maxCandidates: 10,
      domain: ['IdeaA', 'IdeaB'],
      knowns: []
    });

    const names = decoded.map(d => d.name).sort();
    assert.deepEqual(names, ['IdeaA', 'IdeaB']);

    session.close();
  });
});
