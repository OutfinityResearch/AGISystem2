/**
 * Suite 24 - Contradictions & Atomic Learn
 *
 * Highlights theory-driven contradiction rejection (constraints) and verifies
 * learn() atomicity (rollback: all-or-nothing).
 */

export const name = 'Contradictions & Atomic Learn';
export const description = 'Reject hard contradictions with proof + keep session unpolluted (transaction rollback)';

// Core is always loaded; no extra domain theories needed.
export const theories = [];

export const steps = [
  {
    action: 'learn',
    input_nl: 'Door hasState Open.',
    input_dsl: 'hasState Door Open',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'Door is in Kitchen. Door hasState Closed.',
    input_dsl: `
      locatedIn Door Kitchen
      hasState Door Closed
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - Door is both Closed and Open',
    proof_nl: [
      'mutuallyExclusive hasState Open Closed',
      'Therefore reject hasState Door Closed'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Door hasState Open.',
    input_dsl: '@goal hasState Door Open',
    expected_nl: 'True: Door is Open.',
    proof_nl: 'Door is Open'
  },
  {
    action: 'prove',
    input_nl: 'Door is in Kitchen.',
    input_dsl: '@goal locatedIn Door Kitchen',
    expected_nl: 'Cannot prove: Door is in Kitchen.',
    proof_nl: [
      'No locatedIn facts for Door exist in KB',
      'Door is in Kitchen cannot be derived'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Portal alias Door. Shut alias Closed.',
    input_dsl: `
      alias Portal Door
      alias Shut Closed
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Portal is in Attic. Portal hasState Shut.',
    input_dsl: `
      locatedIn Portal Attic
      hasState Portal Shut
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - Door is both Closed and Open',
    proof_nl: [
      'mutuallyExclusive hasState Open Closed',
      'Therefore reject hasState Door Closed'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Door is in Attic.',
    input_dsl: '@goal locatedIn Door Attic',
    expected_nl: 'Cannot prove: Door is in Attic.',
    proof_nl: [
      'No locatedIn facts for Door exist in KB',
      'Door is in Attic cannot be derived'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Water hasProperty Hot.',
    input_dsl: 'hasProperty Water Hot',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'Freezing alias Cold. Icy synonym Freezing.',
    input_dsl: `
      alias Freezing Cold
      synonym Icy Freezing
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Water is in Lake. Water hasProperty Icy.',
    input_dsl: `
      locatedIn Water Lake
      hasProperty Water Icy
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - Water is both Cold and Hot',
    proof_nl: [
      'mutuallyExclusive hasProperty Hot Cold',
      'Therefore reject hasProperty Water Cold'
    ]
  },
  {
    action: 'learn',
    input_nl: 'A before B.',
    input_dsl: 'before A B',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'X causes Y. A after B.',
    input_dsl: `
      causes X Y
      after A B
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - after and before with same args',
    proof_nl: [
      'contradictsSameArgs before after',
      'Therefore reject after A B'
    ]
  },
  {
    action: 'prove',
    input_nl: 'A before B.',
    input_dsl: '@goal before A B',
    expected_nl: 'True: A is before B.',
    proof_nl: 'A is before B'
  },
  {
    action: 'prove',
    input_nl: 'X causes Y.',
    input_dsl: '@goal causes X Y',
    expected_nl: 'Cannot prove: X causes Y.',
    proof_nl: [
      'No causes facts for X exist in KB',
      'X causes Y cannot be derived'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Alpha alias A. Beta alias B.',
    input_dsl: `
      alias Alpha A
      alias Beta B
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Alpha is in Nowhere. Alpha after Beta.',
    input_dsl: `
      locatedIn Alpha Nowhere
      after Alpha Beta
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - after and before with same args',
    proof_nl: [
      'contradictsSameArgs before after',
      'Therefore reject after A B'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Start before Middle. Middle before End.',
    input_dsl: `
      before Start Middle
      before Middle End
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Foo causes Bar. Start after End.',
    input_dsl: `
      causes Foo Bar
      after Start End
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - after and before with same args',
    proof_nl: [
      'before Start Middle',
      'before Middle End',
      'Transitive chain verified',
      'contradictsSameArgs before after',
      'Therefore reject after Start End'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Foo causes Bar.',
    input_dsl: '@goal causes Foo Bar',
    expected_nl: 'Cannot prove: Foo causes Bar.',
    proof_nl: [
      'No causes facts for Foo exist in KB',
      'Foo causes Bar cannot be derived'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Tea is a Beverage. Beverage is a Liquid. Liquid hasProperty Cold.',
    input_dsl: `
      isA Tea Beverage
      isA Beverage Liquid
      hasProperty Liquid Cold
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'learn',
    input_nl: 'Tea is in Cupboard. Tea hasProperty Hot.',
    input_dsl: `
      locatedIn Tea Cupboard
      hasProperty Tea Hot
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - Tea is both Hot and Cold',
    proof_nl: [
      'isA Tea Beverage',
      'isA Beverage Liquid',
      'hasProperty Liquid Cold',
      'Therefore hasProperty Tea Cold',
      'mutuallyExclusive hasProperty Hot Cold',
      'Therefore reject hasProperty Tea Hot'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Tea is in Cupboard.',
    input_dsl: '@goal locatedIn Tea Cupboard',
    expected_nl: 'Cannot prove: Tea is in Cupboard.',
    proof_nl: [
      'No locatedIn facts for Tea exist in KB',
      'Tea is in Cupboard cannot be derived'
    ]
  },
  {
    action: 'learn',
    input_nl: 'earlier alias before. later alias after. Sun earlier Moon.',
    input_dsl: `
      @earlier:earlier __Relation
      @later:later __Relation
      alias earlier before
      alias later after
      earlier Sun Moon
    `,
    expected_nl: 'Learned 5 facts'
  },
  {
    action: 'learn',
    input_nl: 'Foo is in Bar. Sun later Moon.',
    input_dsl: `
      locatedIn Foo Bar
      later Sun Moon
    `,
    expect_success: false,
    assert_state_unchanged: true,
    expect_error_includes: 'Contradiction rejected',
    expected_nl: 'Warning: contradiction - after and before with same args',
    proof_nl: [
      'contradictsSameArgs before after',
      'Therefore reject after Sun Moon'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Foo is in Bar.',
    input_dsl: '@goal locatedIn Foo Bar',
    expected_nl: 'Cannot prove: Foo is in Bar.',
    proof_nl: [
      'No locatedIn facts for Foo exist in KB',
      'Foo is in Bar cannot be derived'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Tea does not hasProperty Cold.',
    input_dsl: 'Not hasProperty Tea Cold',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'Tea is in Cupboard2. Tea hasProperty Hot.',
    input_dsl: `
      locatedIn Tea Cupboard2
      hasProperty Tea Hot
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'prove',
    input_nl: 'Tea is in Cupboard2.',
    input_dsl: '@goal locatedIn Tea Cupboard2',
    expected_nl: 'True: Tea is in Cupboard2.',
    proof_nl: 'Tea is in Cupboard2'
  },
  {
    action: 'prove',
    input_nl: 'Tea hasProperty Hot.',
    input_dsl: '@goal hasProperty Tea Hot',
    expected_nl: 'True: Tea has Hot.',
    proof_nl: 'Tea has Hot'
  }
];

export default { name, description, theories, steps };
