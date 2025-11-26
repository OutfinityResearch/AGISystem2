/**
 * Test Suite: Sys2DSL Extended Commands
 * DS(/tests/sys2dsl_commands/runSuite)
 *
 * Tests newly implemented DSL commands including:
 * - Boolean: BOOL_OR, BOOL_NOT
 * - List: PICK_LAST, COUNT, FILTER
 * - Theory: LIST_THEORIES, THEORY_PUSH, THEORY_POP, RESET_SESSION
 * - Reasoning: VALIDATE, PROVE
 * - Output: TO_NATURAL, TO_JSON, LITERAL
 */

const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  let passed = 0;
  let failed = 0;
  const errors = [];

  function test(name, testFn) {
    try {
      const result = testFn();
      if (!result) {
        errors.push({ name, error: 'Test returned false' });
        failed++;
      } else {
        passed++;
      }
    } catch (err) {
      errors.push({ name, error: err.message });
      failed++;
    }
  }

  // =========================================================================
  // LITERAL Command Tests
  // =========================================================================

  test('LITERAL creates string value', () => {
    const env = session.run(['@val LITERAL hello']);
    return env.val === 'hello';
  });

  test('LITERAL parses JSON array', () => {
    const env = session.run(['@arr LITERAL ["a", "b", "c"]']);
    return Array.isArray(env.arr) && env.arr.length === 3;
  });

  // =========================================================================
  // Boolean Operation Tests
  // =========================================================================

  test('BOOL_OR returns TRUE_CERTAIN when first is true', () => {
    const env = session.run([
      '@fact ASSERT TrueTest IS_A Thing',
      '@a ASK "TrueTest IS_A Thing"',
      '@b LITERAL {"truth": "FALSE"}',
      '@result BOOL_OR $a $b'
    ]);
    return env.result && env.result.truth === 'TRUE_CERTAIN';
  });

  test('BOOL_NOT inverts truth values', () => {
    const env = session.run([
      '@a LITERAL {"truth": "FALSE"}',
      '@result BOOL_NOT $a'
    ]);
    return env.result && env.result.truth === 'TRUE_CERTAIN';
  });

  // =========================================================================
  // List Operation Tests
  // =========================================================================

  test('PICK_LAST returns last element', () => {
    const env = session.run([
      '@list LITERAL ["first", "middle", "last"]',
      '@result PICK_LAST $list'
    ]);
    return env.result === 'last';
  });

  test('COUNT returns list length', () => {
    const env = session.run([
      '@list LITERAL [1, 2, 3, 4, 5]',
      '@result COUNT $list'
    ]);
    return env.result && env.result.count === 5;
  });

  test('FILTER filters by field value', () => {
    const env = session.run([
      '@list LITERAL [{"type": "A", "val": 1}, {"type": "B", "val": 2}, {"type": "A", "val": 3}]',
      '@result FILTER $list type=A'
    ]);
    return Array.isArray(env.result) && env.result.length === 2;
  });

  // =========================================================================
  // Theory Management Tests
  // =========================================================================

  test('LIST_THEORIES returns theory list', () => {
    const env = session.run(['@result LIST_THEORIES']);
    return env.result && Array.isArray(env.result.active);
  });

  test('THEORY_PUSH creates new layer', () => {
    const env = session.run([
      '@push1 THEORY_PUSH name="test_layer"'
    ]);
    return env.push1 && env.push1.ok === true && env.push1.depth >= 1;
  });

  test('THEORY_POP removes layer', () => {
    const env = session.run([
      '@push2 THEORY_PUSH name="layer1"',
      '@pop THEORY_POP'
    ]);
    return env.pop && env.pop.ok === true;
  });

  test('RESET_SESSION clears all state', () => {
    const env = session.run([
      '@reset RESET_SESSION',
      '@list LIST_THEORIES'
    ]);
    return env.list && env.list.count === 0;
  });

  // =========================================================================
  // Reasoning Tests
  // =========================================================================

  test('VALIDATE checks theory consistency', () => {
    const env = session.run(['@result VALIDATE']);
    return env.result && env.result.consistent !== undefined;
  });

  test('PROVE with direct fact returns proven', () => {
    const env = session.run([
      '@fact1 ASSERT BirdProve IS_A Animal',
      '@result PROVE BirdProve IS_A Animal'
    ]);
    return env.result && env.result.proven === true;
  });

  test('PROVE with missing fact returns not proven', () => {
    const env = session.run([
      '@result PROVE UnknownX123 IS_A UnknownY456'
    ]);
    return env.result && env.result.proven === false;
  });

  // =========================================================================
  // Output Tests
  // =========================================================================

  test('TO_JSON converts result to JSON', () => {
    const env = session.run([
      '@data LITERAL {"test": true}',
      '@result TO_JSON $data'
    ]);
    if (!env.result || !env.result.json) return false;
    const parsed = JSON.parse(env.result.json);
    return parsed.test === true;
  });

  test('TO_NATURAL converts truth to text', () => {
    const env = session.run([
      '@truth LITERAL {"truth": "TRUE_CERTAIN"}',
      '@result TO_NATURAL $truth'
    ]);
    return env.result && env.result.text && env.result.text.includes('true');
  });

  // =========================================================================
  // Concept Management Tests
  // =========================================================================

  test('DEFINE_CONCEPT creates concept', () => {
    const env = session.run(['@result DEFINE_CONCEPT TestConceptXYZ']);
    return env.result && env.result.ok === true;
  });

  test('INSPECT returns concept snapshot', () => {
    const env = session.run([
      '@def1 DEFINE_CONCEPT InspectTest123',
      '@result INSPECT InspectTest123'
    ]);
    return env.result && env.result.label === 'InspectTest123';
  });

  test('BIND_RELATION returns relation ref', () => {
    const env = session.run(['@rel BIND_RELATION IS_A']);
    return env.rel && env.rel.kind === 'relationRef';
  });

  // =========================================================================
  // RETRACT Tests
  // =========================================================================

  test('RETRACT removes existing fact', () => {
    const env = session.run([
      '@assert1 ASSERT CatRetract IS_A Animal',
      '@before FACTS_MATCHING CatRetract IS_A Animal',
      '@retract1 RETRACT CatRetract IS_A Animal',
      '@after FACTS_MATCHING CatRetract IS_A Animal'
    ]);
    return env.before.length > 0 && env.after.length === 0;
  });

  return {
    ok: failed === 0,
    passed,
    failed,
    total: passed + failed,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = { run };
