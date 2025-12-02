/**
 * Sys2DSL Core Tests - v3.0 Strict Triple Syntax
 *
 * Tests fundamental DSL execution:
 * - Topological evaluation (order independence)
 * - Cycle detection
 * - Masking
 * - Variable chaining
 *
 * All DSL follows: @variable Subject VERB Object (exactly 4 tokens)
 * Results are points in conceptual space with truth dimension.
 *
 * NOTE: Tests use multiline strings to simulate real-world usage.
 * The @ character indicates where a new statement begins.
 */

const AgentSystem2 = require('../../src/interface/agent_system2');

async function run({ profile }) {
  const agent = new AgentSystem2({ profile });
  const session = agent.createSession();

  let passed = 0;
  let failed = 0;
  const errors = [];

  function test(name, dsl, check) {
    try {
      const env = session.run(dsl);
      const result = check(env);
      if (result) {
        passed++;
      } else {
        failed++;
        errors.push({ name, error: 'Check failed', env });
      }
    } catch (err) {
      failed++;
      errors.push({ name, error: err.message });
    }
  }

  // ===========================================================================
  // SECTION 1: Basic Fact Assertion and Query
  // ===========================================================================

  test('Relation creates point with TRUE_CERTAIN truth', `
    @f1 dog IS_A animal
    @result dog IS_A animal
  `, env => {
    // Both f1 and result should have truth = TRUE_CERTAIN
    const truth = env.result?.truth || '';
    return truth.startsWith('TRUE');
  });

  test('Relation creates fact if not exists (v3 behavior)', `
    @result unicorn IS_A fish
  `, env => {
    // In v3, all relations automatically create facts if they don't exist
    // The result should show created: true
    return env.result?.truth === 'TRUE_CERTAIN' && env.result?.created === true;
  });

  // ===========================================================================
  // SECTION 2: Topological Evaluation (order independence)
  // ===========================================================================

  test('Topological eval - dependencies resolve regardless of order', `
    @final $checked AND $checked
    @checked $list NONEMPTY any
    @list mammal FACTS any
    @f1 mammal IS_A animal
  `, env => {
    // final should have existence based on AND of checked with itself
    return env.final !== undefined;
  });

  test('Topological eval - parallel independent statements', `
		@f1 cat IS_A mammal
		@f2 bird IS_A animal
		@r1 cat IS_A mammal
		@r2 bird IS_A animal
		@both $r1 AND $r2
  `, env => {
    // Both queries should result in truth starting with TRUE
    const truth = env.both?.truth || '';
    return truth.startsWith('TRUE') || env.both?.ok;
  });

  // ===========================================================================
  // SECTION 3: Cycle Detection
  // ===========================================================================

  // Cycle detection test - handled specially since we expect an error
  // Don't use test() function since it would record failure for expected error
  try {
    session.run(`
      @a $b NONEMPTY any
      @b $a NONEMPTY any
    `);
    // Should not reach here - cycle should be detected
    failed++;
    errors.push({ name: 'Cycle detection - circular dependency', error: 'Should have thrown error' });
  } catch (e) {
    // Expected - cycle was detected
    if (e.message.includes('Cyclic')) {
      passed++;
    } else {
      failed++;
      errors.push({ name: 'Cycle detection - circular dependency', error: `Wrong error: ${e.message}` });
    }
  }

  // ===========================================================================
  // SECTION 4: Masking
  // ===========================================================================

  test('Mask creation returns mask point', `
    @mask ontology MASK ontology
  `, env => {
    // MASK creates a mask object with partition spec
    return env.mask !== undefined;
  });

  test('Mask object contains partition spec', `
    @f1 ethical_action IS_A action
    @mask axiology MASK axiology
    @result $mask INSPECT any
  `, env => {
    // Mask should have spec property with partition names
    return env.mask !== undefined && env.mask.spec !== undefined;
  });

  // ===========================================================================
  // SECTION 5: Variable Chaining (DIM_PAIR pattern)
  // ===========================================================================

  test('DIM_PAIR creates compound point', `
    @pair existence DIM_PAIR positive
    @result $pair INSPECT any
  `, env => {
    return env.result !== undefined;
  });

  test('SET_DIM applies pair to point', `
    @f1 test_point IS_A thing
    @pair existence DIM_PAIR positive
    @modified test_point SET_DIM $pair
    @result $modified INSPECT any
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 6: Variable Resolution in Commands
  // ===========================================================================

  test('Variable references resolve correctly across statements', `
    @src source_fact IS_A thing
    @query source_fact IS_A thing
    @result $query INSPECT any
  `, env => {
    // INSPECT returns details about the query result
    return env.result !== undefined;
  });

  // ===========================================================================
  // Results
  // ===========================================================================

  return {
    ok: failed === 0,
    passed,
    failed,
    total: passed + failed,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = { run };
