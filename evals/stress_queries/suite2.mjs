/**
 * Suite 2: AND/OR Condition Satisfaction Tests
 *
 * Based on RuleTaker benchmark learnings.
 * Uses learn/prove pattern from fastEval suite25.
 *
 * Tests:
 * - AND conditions require all parts to be true
 * - OR conditions require at least one part
 * - Simple implication (modus ponens)
 */

export const name = 'AND/OR Condition Tests';
export const description = 'Tests for AND/OR condition handling in rules';

export const theories = ['05-logic.sys2'];
export const sessionOptions = { closedWorldAssumption: true };

export const steps = [
  // ========================================================================
  // AND Condition Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Fiona is furry (but NOT cold), AND rule',
    input_dsl: `
      hasProperty Fiona furry
      @c1 hasProperty Fiona furry
      @c2 hasProperty Fiona cold
      @and And $c1 $c2
      @cons hasProperty Fiona blue
      Implies $and $cons
    `,
    expected_nl: 'Learned fact and AND rule'
  },

  {
    action: 'prove',
    input_nl: 'AND Test 1: Fiona is NOT blue (cold is missing)',
    input_dsl: '@goal hasProperty Fiona blue',
    expected_nl: 'Cannot prove: Fiona cold is missing',
    proof_nl: 'AND requires both conditions'
  },

  {
    action: 'learn',
    input_nl: 'Setup: Bob is both furry AND cold',
    input_dsl: `
      hasProperty Bob furry
      hasProperty Bob cold
      @c1b hasProperty Bob furry
      @c2b hasProperty Bob cold
      @andb And $c1b $c2b
      @consb hasProperty Bob blue
      Implies $andb $consb
    `,
    expected_nl: 'Learned facts and AND rule for Bob'
  },

  {
    action: 'prove',
    input_nl: 'AND Test 2: Bob IS blue (both conditions satisfied)',
    input_dsl: '@goal hasProperty Bob blue',
    expected_nl: 'True: Bob has blue via AND rule.',
    proof_nl: 'Both furry AND cold are true'
  },

  // ========================================================================
  // Triple AND Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Dave is big and red (but NOT round)',
    input_dsl: `
      hasProperty Dave big
      hasProperty Dave red
      @d1 hasProperty Dave big
      @d2 hasProperty Dave red
      @d3 hasProperty Dave round
      @and1 And $d1 $d2
      @and2 And $and1 $d3
      @consd hasProperty Dave special
      Implies $and2 $consd
    `,
    expected_nl: 'Learned facts and triple AND rule'
  },

  {
    action: 'prove',
    input_nl: 'Triple AND: Dave is NOT special (round is missing)',
    input_dsl: '@goal hasProperty Dave special',
    expected_nl: 'Cannot prove: Dave round is missing',
    proof_nl: 'Triple AND requires all three'
  },

  {
    action: 'learn',
    input_nl: 'Setup: Eve has all three properties',
    input_dsl: `
      hasProperty Eve big
      hasProperty Eve red
      hasProperty Eve round
      @e1 hasProperty Eve big
      @e2 hasProperty Eve red
      @e3 hasProperty Eve round
      @and1e And $e1 $e2
      @and2e And $and1e $e3
      @conse hasProperty Eve special
      Implies $and2e $conse
    `,
    expected_nl: 'Learned facts and triple AND rule for Eve'
  },

  {
    action: 'prove',
    input_nl: 'Triple AND: Eve IS special (all three conditions met)',
    input_dsl: '@goal hasProperty Eve special',
    expected_nl: 'True: Eve has special via triple AND.',
    proof_nl: 'All three conditions true'
  },

  // ========================================================================
  // OR Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Fox is big (but NOT green), OR rule',
    input_dsl: `
      hasProperty Fox big
      @f1 hasProperty Fox big
      @f2 hasProperty Fox green
      @orf Or $f1 $f2
      @consf hasProperty Fox special
      Implies $orf $consf
    `,
    expected_nl: 'Learned fact and OR rule'
  },

  {
    action: 'prove',
    input_nl: 'OR Test 1: Fox IS special (big is true)',
    input_dsl: '@goal hasProperty Fox special',
    expected_nl: 'True: Fox has special via OR (big branch).',
    proof_nl: 'OR satisfied via first branch'
  },

  {
    action: 'learn',
    input_nl: 'Setup: Gina is green (but NOT big), OR rule',
    input_dsl: `
      hasProperty Gina green
      @g1 hasProperty Gina big
      @g2 hasProperty Gina green
      @org Or $g1 $g2
      @consg hasProperty Gina special
      Implies $org $consg
    `,
    expected_nl: 'Learned fact and OR rule for Gina'
  },

  {
    action: 'prove',
    input_nl: 'OR Test 2: Gina IS special (green is true)',
    input_dsl: '@goal hasProperty Gina special',
    expected_nl: 'True: Gina has special via OR (green branch).',
    proof_nl: 'OR satisfied via second branch'
  },

  {
    action: 'learn',
    input_nl: 'Setup: Harry is cold (neither big nor green), OR rule',
    input_dsl: `
      hasProperty Harry cold
      @h1 hasProperty Harry big
      @h2 hasProperty Harry green
      @orh Or $h1 $h2
      @consh hasProperty Harry special
      Implies $orh $consh
    `,
    expected_nl: 'Learned fact and OR rule for Harry'
  },

  {
    action: 'prove',
    input_nl: 'OR Test 3: Harry is NOT special (neither branch true)',
    input_dsl: '@goal hasProperty Harry special',
    expected_nl: 'Cannot prove: neither big nor green',
    proof_nl: 'OR requires at least one branch'
  },

  // ========================================================================
  // Simple Implication Tests
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Ice is cold, cold->frozen rule',
    input_dsl: `
      hasProperty Ice cold
      @anti hasProperty Ice cold
      @consi hasProperty Ice frozen
      Implies $anti $consi
    `,
    expected_nl: 'Learned fact and rule'
  },

  {
    action: 'prove',
    input_nl: 'Simple Implies: Ice IS frozen (cold->frozen)',
    input_dsl: '@goal hasProperty Ice frozen',
    expected_nl: 'True: Ice has frozen via implication.',
    proof_nl: 'Modus ponens: cold is true'
  },

  {
    action: 'learn',
    input_nl: 'Setup: Water is liquid (not cold), cold->frozen rule',
    input_dsl: `
      hasProperty Water liquid
      @antw hasProperty Water cold
      @consw hasProperty Water frozen
      Implies $antw $consw
    `,
    expected_nl: 'Learned fact and rule for Water'
  },

  {
    action: 'prove',
    input_nl: 'Simple Implies: Water is NOT frozen (not cold)',
    input_dsl: '@goal hasProperty Water frozen',
    expected_nl: 'Cannot prove: Water is not cold',
    proof_nl: 'Antecedent not satisfied'
  },

  // ========================================================================
  // NOT Tests (CWA)
  // ========================================================================

  {
    action: 'learn',
    input_nl: 'Setup: Sun is hot',
    input_dsl: 'hasProperty Sun hot',
    expected_nl: 'Learned 1 fact'
  },

  {
    action: 'prove',
    input_nl: 'NOT Test 1: Not(Sun cold) should PROVE by CWA',
    input_dsl: '@goal Not (hasProperty Sun cold)',
    expected_nl: 'True: Not(Sun cold) by CWA',
    proof_nl: 'Sun cold is absent'
  },

  {
    action: 'prove',
    input_nl: 'NOT Test 2: Not(Sun hot) should NOT prove',
    input_dsl: '@goal Not (hasProperty Sun hot)',
    expected_nl: 'Cannot prove: Sun IS hot',
    proof_nl: 'Sun hot is in KB'
  }
];
