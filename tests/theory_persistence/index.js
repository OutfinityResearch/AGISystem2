/**
 * Real End-to-End Tests for Theory Persistence
 *
 * These tests verify actual file system operations, not mocks.
 * They test the complete flow: save → reload → verify facts.
 */

const path = require('path');
const fs = require('fs');
const AgentSystem2 = require('../../src/interface/agent_system2');
const TheoryStorage = require('../../src/theory/theory_storage');
const MetaTheoryRegistry = require('../../src/theory/meta_theory_registry');

// Test directory for temporary theories
const TEST_THEORIES_DIR = path.join(__dirname, '..', 'fixtures', 'temp_theories');

function setup() {
  // Create clean test directory
  if (fs.existsSync(TEST_THEORIES_DIR)) {
    fs.rmSync(TEST_THEORIES_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_THEORIES_DIR, { recursive: true });

  // Reset shared registries
  MetaTheoryRegistry.resetShared();
}

function cleanup() {
  // Remove test directory
  if (fs.existsSync(TEST_THEORIES_DIR)) {
    fs.rmSync(TEST_THEORIES_DIR, { recursive: true });
  }
}

function runTests() {
  const results = [];

  // ============================================================
  // Test 1: Save Theory and Verify File Creation
  // ============================================================
  results.push((() => {
    const name = 'save_theory_creates_file';
    try {
      setup();

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });

      // Add some facts
      session.run([
        '@f1 ASSERT dog IS_A mammal',
        '@f2 ASSERT cat IS_A mammal',
        '@f3 ASSERT mammal IS_A animal'
      ]);

      // Configure storage to use test directory
      session.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      // Save theory
      const result = session.run(['@save SAVE_THEORY test_animals']);

      // Verify file was created
      const theoryPath = path.join(TEST_THEORIES_DIR, 'test_animals.sys2dsl');
      const fileExists = fs.existsSync(theoryPath);

      if (!fileExists) {
        throw new Error('Theory file was not created');
      }

      // Verify file content contains our facts
      const content = fs.readFileSync(theoryPath, 'utf8');
      if (!content.includes('dog IS_A mammal')) {
        throw new Error('Theory file missing expected fact');
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 2: Load Theory and Verify Facts in Store
  // ============================================================
  results.push((() => {
    const name = 'load_theory_restores_facts';
    try {
      setup();

      // Create a theory file manually
      const theoryContent = `# Test theory
@f001 ASSERT bird IS_A animal
@f002 ASSERT sparrow IS_A bird
@f003 ASSERT eagle IS_A bird
`;
      fs.writeFileSync(
        path.join(TEST_THEORIES_DIR, 'birds.sys2dsl'),
        theoryContent
      );

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });

      // Configure storage
      session.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      // Load theory
      const result = session.run(['@load LOAD_THEORY birds']);
      const loadResult = session.getVar('load');

      if (!loadResult.ok) {
        throw new Error(`Load failed: ${loadResult.error}`);
      }

      if (loadResult.loaded !== 3) {
        throw new Error(`Expected 3 facts loaded, got ${loadResult.loaded}`);
      }

      // Verify facts are queryable
      const askResult = session.run(['@q1 ASK sparrow IS_A bird']);
      const q1 = session.getVar('q1');

      if (q1.truth !== 'TRUE_CERTAIN') {
        throw new Error(`Query failed: expected TRUE_CERTAIN, got ${q1.truth}`);
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 3: Save and Reload Roundtrip
  // ============================================================
  results.push((() => {
    const name = 'save_reload_roundtrip';
    try {
      setup();

      const agent = new AgentSystem2({ profile: 'auto_test' });

      // Session 1: Create and save theory
      const session1 = agent.createSession({ skipPreload: true });
      session1.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      session1.run([
        '@f1 ASSERT Paris LOCATED_IN France',
        '@f2 ASSERT France LOCATED_IN Europe',
        '@f3 ASSERT Berlin LOCATED_IN Germany',
        '@f4 ASSERT Germany LOCATED_IN Europe'
      ]);

      session1.run(['@save SAVE_THEORY geography']);

      // Session 2: Fresh session, load theory
      const session2 = agent.createSession({ skipPreload: true });
      session2.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      session2.run(['@load LOAD_THEORY geography']);
      const loadResult = session2.getVar('load');

      if (loadResult.loaded !== 4) {
        throw new Error(`Expected 4 facts, got ${loadResult.loaded}`);
      }

      // Verify transitive query works
      session2.run(['@q1 ASK Paris LOCATED_IN France']);
      const q1 = session2.getVar('q1');

      if (q1.truth !== 'TRUE_CERTAIN') {
        throw new Error('Query failed after reload');
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 4: Delete Theory
  // ============================================================
  results.push((() => {
    const name = 'delete_theory_removes_file';
    try {
      setup();

      // Create a theory file
      fs.writeFileSync(
        path.join(TEST_THEORIES_DIR, 'to_delete.sys2dsl'),
        '@f1 ASSERT x IS_A y'
      );

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });
      session.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      // Delete theory
      session.run(['@del DELETE_THEORY to_delete']);
      const result = session.getVar('del');

      if (!result.ok) {
        throw new Error('Delete reported failure');
      }

      // Verify file is gone
      const stillExists = fs.existsSync(
        path.join(TEST_THEORIES_DIR, 'to_delete.sys2dsl')
      );

      if (stillExists) {
        throw new Error('File still exists after delete');
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 5: List Theories
  // ============================================================
  results.push((() => {
    const name = 'list_theories_shows_available';
    try {
      setup();

      // Create multiple theory files
      fs.writeFileSync(path.join(TEST_THEORIES_DIR, 'theory_a.sys2dsl'), '@f1 ASSERT a IS_A b');
      fs.writeFileSync(path.join(TEST_THEORIES_DIR, 'theory_b.sys2dsl'), '@f1 ASSERT c IS_A d');
      fs.writeFileSync(path.join(TEST_THEORIES_DIR, 'theory_c.theory.json'),
        JSON.stringify({ facts: [{ subject: 'e', relation: 'IS_A', object: 'f' }] }));

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });
      session.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      session.run(['@list LIST_THEORIES']);
      const result = session.getVar('list');

      if (!result.available || result.available.length !== 3) {
        throw new Error(`Expected 3 theories, got ${result.available?.length}`);
      }

      const hasA = result.available.includes('theory_a');
      const hasB = result.available.includes('theory_b');
      const hasC = result.available.includes('theory_c');

      if (!hasA || !hasB || !hasC) {
        throw new Error('Missing expected theories in list');
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 6: THEORY_PUSH/POP with Real Facts
  // ============================================================
  results.push((() => {
    const name = 'theory_push_pop_restores_state';
    try {
      setup();

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });

      // Add base facts
      session.run([
        '@f1 ASSERT Socrates IS_A human',
        '@f2 ASSERT human IS_A mortal'
      ]);

      // Push hypothetical layer
      session.run(['@push THEORY_PUSH name="what_if"']);

      // Add hypothetical fact
      session.run(['@f3 ASSERT Socrates IS_A god']);

      // Verify hypothetical fact exists
      session.run(['@q1 ASK Socrates IS_A god']);
      const q1 = session.getVar('q1');
      if (q1.truth !== 'TRUE_CERTAIN') {
        throw new Error('Hypothetical fact should exist');
      }

      // Pop layer
      session.run(['@pop THEORY_POP']);
      const popResult = session.getVar('pop');

      if (!popResult.ok) {
        throw new Error('Pop failed');
      }

      // Verify hypothetical fact is gone, but base facts remain
      session.run(['@q2 ASK Socrates IS_A god']);
      const q2 = session.getVar('q2');

      // Should be UNKNOWN (not TRUE) because hypothetical was popped
      if (q2.truth === 'TRUE_CERTAIN') {
        throw new Error('Hypothetical fact should be gone after pop');
      }

      // Base fact should still exist
      session.run(['@q3 ASK Socrates IS_A human']);
      const q3 = session.getVar('q3');
      if (q3.truth !== 'TRUE_CERTAIN') {
        throw new Error('Base fact should survive pop');
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 7: Merge Theory
  // ============================================================
  results.push((() => {
    const name = 'merge_theory_adds_facts';
    try {
      setup();

      // Create a theory to merge
      fs.writeFileSync(
        path.join(TEST_THEORIES_DIR, 'extra_facts.sys2dsl'),
        '@f1 ASSERT fish IS_A animal\n@f2 ASSERT whale IS_A mammal'
      );

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });
      session.dsl.theoryCommands.setStorage(new TheoryStorage({
        theoriesDir: TEST_THEORIES_DIR
      }));

      // Add initial facts
      session.run(['@f1 ASSERT dog IS_A mammal']);

      // Merge additional theory
      session.run(['@merge MERGE_THEORY extra_facts']);
      const result = session.getVar('merge');

      if (!result.ok) {
        throw new Error('Merge failed');
      }

      if (result.merged !== 2) {
        throw new Error(`Expected 2 merged facts, got ${result.merged}`);
      }

      // Verify both original and merged facts exist
      session.run(['@q1 ASK dog IS_A mammal']);
      session.run(['@q2 ASK whale IS_A mammal']);

      const q1 = session.getVar('q1');
      const q2 = session.getVar('q2');

      if (q1.truth !== 'TRUE_CERTAIN' || q2.truth !== 'TRUE_CERTAIN') {
        throw new Error('Facts missing after merge');
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  // ============================================================
  // Test 8: Meta-Registry Tracks Usage
  // ============================================================
  results.push((() => {
    const name = 'meta_registry_tracks_loads';
    try {
      setup();

      // Create a theory
      fs.writeFileSync(
        path.join(TEST_THEORIES_DIR, 'tracked.sys2dsl'),
        '@f1 ASSERT a IS_A b'
      );

      const agent = new AgentSystem2({ profile: 'auto_test' });
      const session = agent.createSession({ skipPreload: true });

      const storage = new TheoryStorage({ theoriesDir: TEST_THEORIES_DIR });
      const registry = new MetaTheoryRegistry({
        registryPath: path.join(TEST_THEORIES_DIR, 'meta.json')
      });

      session.dsl.theoryCommands.setStorage(storage);
      session.dsl.theoryCommands.setMetaRegistry(registry);

      // Load theory multiple times
      session.run(['@l1 LOAD_THEORY tracked']);
      session.run(['@l2 LOAD_THEORY tracked']);

      // Check registry
      const meta = registry.getTheory('tracked');

      if (!meta) {
        throw new Error('Theory not registered');
      }

      if (meta.stats.loadCount !== 2) {
        throw new Error(`Expected 2 loads, got ${meta.stats.loadCount}`);
      }

      cleanup();
      return { name, passed: true };
    } catch (e) {
      cleanup();
      return { name, passed: false, error: e.message };
    }
  })());

  return results;
}

/**
 * Run function expected by test runner
 */
async function run(options = {}) {
  const results = runTests();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const errors = results
    .filter(r => !r.passed)
    .map(r => `${r.name}: ${r.error}`);

  return {
    ok: failed === 0,
    passed,
    failed,
    total: results.length,
    errors
  };
}

module.exports = { run, runTests };
