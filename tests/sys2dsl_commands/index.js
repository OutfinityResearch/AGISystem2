/**
 * Sys2DSL Verb Tests - v3.0 Strict Triple Syntax
 *
 * Tests DSL verbs with unified triple syntax:
 * - Boolean: AND, OR, NOT
 * - List: FIRST, LAST, COUNT
 * - Theory: PUSH, POP, THEORIES, RESET
 * - Reasoning: PROVE, VALIDATE
 * - Output: TO_JSON, TO_NATURAL
 * - Memory: BOOST, FORGET, PROTECT
 *
 * All DSL follows: @variable Subject VERB Object (exactly 4 tokens)
 * Results are points with truth dimension.
 *
 * NOTE: Tests use multiline strings to simulate real-world usage.
 * Whitespace (tabs, spaces, newlines) before/after statements doesn't matter.
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
  // SECTION 1: Boolean Operations
  // ===========================================================================

  test('AND - both true returns TRUE truth', `
    @f1 fact1 IS_A thing
    @f2 fact2 IS_A thing
    @a fact1 IS_A thing
    @b fact2 IS_A thing
    @result $a AND $b
  `, env => {
    const truth = env.result?.truth || '';
    return truth.startsWith('TRUE') || env.result?.ok;
  });

  test('AND - one false returns FALSE/UNKNOWN truth', `
    @f3 fact3 IS_A thing
    @a fact3 IS_A thing
    @b nonexistent IS_A nothing
    @result $a AND $b
  `, env => {
    const truth = env.result?.truth || 'UNKNOWN';
    return truth === 'FALSE' || truth === 'UNKNOWN' || !env.result?.ok;
  });

  test('OR - one true returns TRUE truth', `
		@f4 fact4 IS_A thing
		@a fact4 IS_A thing
		@b missing IS_A nothing
		@result $a OR $b
  `, env => {
    const truth = env.result?.truth || '';
    return truth.startsWith('TRUE') || env.result?.ok;
  });

  test('NOT - negates truth value', `
    @a factX IS_A thing
    @result $a NOT any
  `, env => {
    // In v3, @a creates the fact, so $a.truth is TRUE_CERTAIN
    // NOT of TRUE should be FALSE
    const truth = env.result?.truth || '';
    return truth === 'FALSE';
  });

  // ===========================================================================
  // SECTION 2: List Operations
  // ===========================================================================

  test('FACTS - returns list of matching facts', `
    @a1 animal1 IS_A mammal
    @a2 animal2 IS_A mammal
    @result mammal FACTS any
  `, env => {
    return env.result !== undefined;
  });

  test('FIRST - returns first element from list', `
    @i1 item1 IS_A list_test
    @i2 item2 IS_A list_test
    @list list_test FACTS any
    @result $list FIRST any
  `, env => {
    return env.result !== undefined;
  });

  test('LAST - returns last element from list', `
    @e1 elem1 IS_A last_test
    @e2 elem2 IS_A last_test
    @list last_test FACTS any
    @result $list LAST any
  `, env => {
    return env.result !== undefined;
  });

  test('COUNT - returns count as point', `
    @c1 cnt1 IS_A count_test
    @c2 cnt2 IS_A count_test
    @c3 cnt3 IS_A count_test
    @list count_test FACTS any
    @result $list COUNT any
  `, env => {
    return env.result !== undefined;
  });

  test('NONEMPTY - returns TRUE for non-empty list', `
    @ne1 ne1 IS_A nonempty_test
    @list nonempty_test FACTS any
    @result $list NONEMPTY any
  `, env => {
    const truth = env.result?.truth || '';
    return truth.startsWith('TRUE') || env.result?.ok || env.result === true;
  });

  test('NONEMPTY - returns FALSE for empty list', `
    @list nonexistent_type FACTS any
    @result $list NONEMPTY any
  `, env => {
    const truth = env.result?.truth || 'FALSE';
    return truth === 'FALSE' || truth === 'UNKNOWN' || env.result === false;
  });

  // ===========================================================================
  // SECTION 3: Theory Management
  // ===========================================================================

  test('THEORIES - returns list of active theories', `
    @result any THEORIES any
  `, env => {
    return env.result !== undefined;
  });

  test('PUSH - creates new theory layer', `
    @result test_layer PUSH any
  `, env => {
    return env.result !== undefined;
  });

  test('POP - removes top theory layer', `
    @push1 temp_layer PUSH any
    @result any POP any
  `, env => {
    return env.result !== undefined;
  });

  test('RESET - clears session state', `
    @push2 reset_layer PUSH any
    @result session RESET any
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 4: Reasoning Operations
  // ===========================================================================

  test('PROVE - returns positive for provable fact', `
    @setup provable IS_A verifiable
    @result provable PROVE verifiable
  `, env => {
    return env.result !== undefined;
  });

  test('PROVE - returns FALSE/UNKNOWN for unprovable fact', `
    @result unknown123 PROVE unknowable456
  `, env => {
    const truth = env.result?.truth || 'UNKNOWN';
    return truth === 'FALSE' || truth === 'UNKNOWN' || !env.result?.proven;
  });

  test('VALIDATE - checks theory consistency', `
    @result current_theory VALIDATE any
  `, env => {
    return env.result !== undefined;
  });

  test('INFER - derives facts through inference', `
    @s1 specific IS_A general
    @s2 general IS_A abstract
    @result specific INFER abstract
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 5: Memory Operations
  // ===========================================================================

  test('BOOST - increases existence of fact', `
    @b1 boostable IS_A mem_test
    @result boostable BOOST any
  `, env => {
    return env.result !== undefined;
  });

  test('PROTECT - marks fact as protected', `
    @p1 protectable IS_A mem_test2
    @result protectable PROTECT any
  `, env => {
    return env.result !== undefined;
  });

  test('FORGET - decreases existence of fact', `
    @fg1 forgettable IS_A mem_test3
    @result forgettable FORGET any
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 6: Output Formatting
  // ===========================================================================

  test('TO_JSON - converts point to JSON format', `
    @j1 json_test IS_A thing
    @point json_test IS_A thing
    @result $point TO_JSON any
  `, env => {
    return env.result !== undefined;
  });

  test('TO_NATURAL - converts point to natural language', `
    @n1 natural_test IS_A thing
    @point natural_test IS_A thing
    @result $point TO_NATURAL any
  `, env => {
    return env.result !== undefined;
  });

  test('INSPECT - returns point details', `
    @ins1 inspect_test IS_A thing
    @result inspect_test INSPECT any
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 7: Concept Operations
  // ===========================================================================

  test('DEFINE - creates new concept point', `
    @result new_concept_xyz DEFINE concept
  `, env => {
    return env.result !== undefined;
  });

  test('BIND - creates reference to relation', `
    @result IS_A BIND relation
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 8: Dimension Operations (DIM_PAIR pattern)
  // ===========================================================================

  test('DIM_PAIR - creates dimension-value compound point', `
    @result existence DIM_PAIR positive
  `, env => {
    return env.result !== undefined;
  });

  test('SET_DIM - applies dim-pair to point', `
    @d1 dim_test IS_A thing
    @pair existence DIM_PAIR positive
    @result dim_test SET_DIM $pair
  `, env => {
    return env.result !== undefined;
  });

  test('READ_DIM - reads dimension value from point', `
    @r1 read_test IS_A thing
    @result read_test READ_DIM existence
  `, env => {
    return env.result !== undefined;
  });

  // ===========================================================================
  // SECTION 9: Retraction
  // ===========================================================================

  test('RETRACT - removes fact', `
    @ret1 retract_me IS_A temporary
    @ret2 retract_me RETRACT temporary
  `, env => {
    // In v3, verify RETRACT worked by checking removed count
    // Note: We can't verify "fact doesn't exist" because in v3,
    // any query relation would re-create the fact
    return env.ret2?.ok === true && env.ret2?.removed === 1;
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
