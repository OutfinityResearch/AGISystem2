/**
 * Core Theories Loading Tests
 * Tests for loading and using Core theories
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import fs from 'fs';

describe('Core Theories Loading', () => {

  function loadCoreTheories(session) {
    const res = session.loadPack('Kernel', { includeIndex: true, validate: false });
    assert.equal(res.success, true, `Kernel pack load failed: ${JSON.stringify(res.errors || [])}`);
  }

  describe('Loading', () => {
    test('should load all Core theories without errors', () => {
      const session = new Session({ geometry: 2048 });
      const res = session.loadPack('Kernel', { includeIndex: true, validate: false });
      assert.equal(res.success, true, `Kernel pack load failed: ${JSON.stringify(res.errors || [])}`);
    });

    test('should load facts from Core theories', () => {
      const session = new Session({ geometry: 2048 });
      loadCoreTheories(session);

      assert.ok(session.kbFacts.length > 50, 'should have loaded many facts');
    });

    test('should load macros from Core theories', () => {
      const session = new Session({ geometry: 2048 });
      loadCoreTheories(session);

      assert.ok(session.graphs?.size > 0, 'should have loaded macros');
    });

    test('should complete loading in reasonable time', { timeout: 10000 }, () => {
      const start = Date.now();
      const session = new Session({ geometry: 2048 });
      loadCoreTheories(session);
      const elapsed = Date.now() - start;

      console.log(`Core loading completed in ${elapsed}ms`);
      // Just verify it completes, don't enforce strict timing
      assert.ok(elapsed > 0, 'Loading should take some time');
    });
  });

  describe('Theory isolation', () => {
    test('theories should not interfere with each other', () => {
      const session1 = new Session({ geometry: 2048 });
      const session2 = new Session({ geometry: 2048 });

      loadCoreTheories(session1);
      // session2 has no Core

      assert.ok(session1.kbFacts.length > session2.kbFacts.length);
    });
  });

  describe('Specific theories', () => {
    test('00-types.sys2 should define base types', () => {
      const session = new Session({ geometry: 2048 });
      const content = fs.readFileSync('./config/Packs/Bootstrap/00-types.sys2', 'utf8');
      const result = session.learn(content);

      assert.equal(result.success, true);
      assert.ok(result.facts > 0);
    });

    test('05-logic.sys2 should load without Implies execution', () => {
      const session = new Session({ geometry: 2048 });
      const content = fs.readFileSync('./config/Packs/Logic/05-logic.sys2', 'utf8');
      const result = session.learn(content);

      assert.equal(result.success, true);
    });

    test('12-reasoning.sys2 should load macros', () => {
      const session = new Session({ geometry: 2048 });
      const content = fs.readFileSync('./config/Packs/Reasoning/12-reasoning.sys2', 'utf8');
      const result = session.learn(content);

      assert.equal(result.success, true);
      assert.ok(session.graphs?.size > 0, 'should have macros from reasoning theory');
    });
  });
});
