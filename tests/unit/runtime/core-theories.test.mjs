/**
 * Core Theories Loading Tests
 * Tests for loading and using Core theories
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../../../src/runtime/session.mjs';
import fs from 'fs';
import path from 'path';

describe('Core Theories Loading', () => {

  function loadCoreTheories(session) {
    const corePath = './config/Core';
    const files = fs.readdirSync(corePath)
      .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(corePath, file), 'utf8');
      session.learn(content);
    }
  }

  describe('Loading', () => {
    test('should load all Core theories without errors', () => {
      const session = new Session({ geometry: 2048 });
      const corePath = './config/Core';
      const files = fs.readdirSync(corePath)
        .filter(f => f.endsWith('.sys2') && f !== 'index.sys2')
        .sort();

      let errors = [];
      for (const file of files) {
        const content = fs.readFileSync(path.join(corePath, file), 'utf8');
        const result = session.learn(content);
        if (!result.success) {
          errors.push({ file, errors: result.errors });
        }
      }

      assert.equal(errors.length, 0, `Core theories had errors: ${JSON.stringify(errors)}`);
    });

    test('should load facts from Core theories', () => {
      const session = new Session({ geometry: 2048 });
      loadCoreTheories(session);

      assert.ok(session.kbFacts.length > 50, 'should have loaded many facts');
    });

    test('should load macros from Core theories', () => {
      const session = new Session({ geometry: 2048 });
      loadCoreTheories(session);

      assert.ok(session.macros?.size > 0, 'should have loaded macros');
    });

    test('should complete loading in reasonable time', () => {
      const start = Date.now();
      const session = new Session({ geometry: 2048 });
      loadCoreTheories(session);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 1000, `Core loading took too long: ${elapsed}ms`);
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
      const content = fs.readFileSync('./config/Core/00-types.sys2', 'utf8');
      const result = session.learn(content);

      assert.equal(result.success, true);
      assert.ok(result.facts > 0);
    });

    test('05-logic.sys2 should load without Implies execution', () => {
      const session = new Session({ geometry: 2048 });
      const content = fs.readFileSync('./config/Core/05-logic.sys2', 'utf8');
      const result = session.learn(content);

      assert.equal(result.success, true);
    });

    test('12-reasoning.sys2 should load macros', () => {
      const session = new Session({ geometry: 2048 });
      const content = fs.readFileSync('./config/Core/12-reasoning.sys2', 'utf8');
      const result = session.learn(content);

      assert.equal(result.success, true);
      assert.ok(session.macros?.size > 0, 'should have macros from reasoning theory');
    });
  });
});
