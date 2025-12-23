/**
 * Suite 1: CWA and Modus Ponens Tests
 *
 * Based on RuleTaker benchmark learnings.
 * Uses learn/prove pattern from fastEval suite25.
 *
 * NOTE: prove() only reads the @goal statement.
 * Facts must be learned FIRST with action: 'learn'.
 */

export const name = 'CWA and Modus Ponens Tests';
export const description = 'Tests for Closed World Assumption negation and ground-term rule application';

export const theories = ['05-logic.sys2'];
export const sessionOptions = { closedWorldAssumption: true };

export const steps = [
  // ========================================================================
  // Direct Facts Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Bob is big',
    input_dsl: 'hasProperty Bob big',
    expected_nl: 'Learned 1 fact'
  },

  {
    action: 'prove',
    input_nl: 'Direct Fact: Bob is big (should prove)',
    input_dsl: '@goal hasProperty Bob big',
    expected_nl: 'True: Bob has big.',
    proof_nl: 'Direct fact in KB'
  },

  {
    action: 'learn',
    input_nl: 'Setup: Anne is quiet and young',
    input_dsl: `
      hasProperty Anne quiet
      hasProperty Anne young
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'prove',
    input_nl: 'Direct Fact: Anne is quiet (should prove)',
    input_dsl: '@goal hasProperty Anne quiet',
    expected_nl: 'True: Anne has quiet.',
    proof_nl: 'Direct fact in KB'
  },

  {
    action: 'prove',
    input_nl: 'Absent Fact: Harry is round (should NOT prove)',
    input_dsl: '@goal hasProperty Harry round',
    expected_nl: 'Cannot prove: Harry round not in KB',
    proof_nl: 'Not in KB'
  },

  // ========================================================================
  // CWA Tests - Negation-as-Failure
  // ========================================================================

  {
    action: 'prove',
    input_nl: 'CWA Test 1: Not(Harry big) should PROVE (Harry big absent)',
    input_dsl: '@goal Not (hasProperty Harry big)',
    expected_nl: 'True: Not(Harry big) by CWA',
    proof_nl: 'Closed world assumption'
  },

  {
    action: 'prove',
    input_nl: 'CWA Test 2: Not(Anne cold) should PROVE (Anne cold absent)',
    input_dsl: '@goal Not (hasProperty Anne cold)',
    expected_nl: 'True: Not(Anne cold) by CWA',
    proof_nl: 'Closed world assumption'
  },

  {
    action: 'prove',
    input_nl: 'CWA Test 3: Not(Bob big) should NOT prove (Bob IS big)',
    input_dsl: '@goal Not (hasProperty Bob big)',
    expected_nl: 'Cannot prove: Bob IS big',
    proof_nl: 'Bob big is in KB, so Not(Bob big) is false'
  },

  // ========================================================================
  // Ground-Term Modus Ponens Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Charlie is quiet, quiet->round rule (ground terms)',
    input_dsl: `
      hasProperty Charlie quiet
      @ant hasProperty Charlie quiet
      @cons hasProperty Charlie round
      Implies $ant $cons
    `,
    expected_nl: 'Learned facts and rule'
  },

  {
    action: 'prove',
    input_nl: 'Verify antecedent: Charlie is quiet',
    input_dsl: '@goal hasProperty Charlie quiet',
    expected_nl: 'True: Charlie has quiet.',
    proof_nl: 'Direct fact'
  },

  {
    action: 'prove',
    input_nl: 'Modus Ponens (ground): Charlie is round via quiet->round',
    input_dsl: '@goal hasProperty Charlie round',
    expected_nl: 'True: Charlie has round via modus ponens.',
    proof_nl: 'Applied Implies rule'
  },

  // ========================================================================
  // Variable Rules (Universal Quantification)
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Elephant is big, big->heavy rule (variable)',
    input_dsl: `
      hasProperty Elephant big
      @cond hasProperty ?x big
      @cons hasProperty ?x heavy
      Implies $cond $cons
    `,
    expected_nl: 'Learned facts and universal rule'
  },

  {
    action: 'prove',
    input_nl: 'Universal Rule: Elephant is heavy via big->heavy',
    input_dsl: '@goal hasProperty Elephant heavy',
    expected_nl: 'True: Elephant has heavy via universal rule.',
    proof_nl: 'Applied Implies with variable binding'
  },

  // ========================================================================
  // Chain Rule Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Fox is fast, fast->agile, agile->skilled chain',
    input_dsl: `
      hasProperty Fox fast
      @a1 hasProperty Fox fast
      @c1 hasProperty Fox agile
      Implies $a1 $c1
      @a2 hasProperty Fox agile
      @c2 hasProperty Fox skilled
      Implies $a2 $c2
    `,
    expected_nl: 'Learned facts and chain rules'
  },

  {
    action: 'prove',
    input_nl: 'Chain Rule: Fox is skilled via fast->agile->skilled',
    input_dsl: '@goal hasProperty Fox skilled',
    expected_nl: 'True: Fox has skilled via chained rules.',
    proof_nl: 'Applied chain of Implies rules'
  },

  // ========================================================================
  // isA Hierarchy Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Dog and Cat are Mammals',
    input_dsl: `
      isA Dog Mammal
      isA Cat Mammal
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'prove',
    input_nl: 'isA Test: Dog is a Mammal (direct)',
    input_dsl: '@goal isA Dog Mammal',
    expected_nl: 'True: Dog isA Mammal.',
    proof_nl: 'Direct fact'
  },

  {
    action: 'prove',
    input_nl: 'isA Test: Cat is NOT a Dog',
    input_dsl: '@goal isA Cat Dog',
    expected_nl: 'Cannot prove: Cat isA Dog',
    proof_nl: 'Not in KB'
  }
];
