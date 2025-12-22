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
    input_nl: 'Setup: Door is Open',
    input_dsl: 'hasState Door Open',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'Contradiction: Door is Closed (should be rejected; atomic rollback keeps Door Open and does not learn Door in Kitchen)',
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
    input_nl: 'Door is still Open (the rejected learn did not change KB)',
    input_dsl: '@goal hasState Door Open',
    expected_nl: 'True: Door is Open.',
    proof_nl: 'Door is Open'
  },
  {
    action: 'prove',
    input_nl: 'Door is not in Kitchen (the rejected learn did not partially apply)',
    input_dsl: '@goal locatedIn Door Kitchen',
    expected_nl: 'Cannot prove: Door is in Kitchen.',
    proof_nl: 'Door is in Kitchen'
  },
  {
    action: 'learn',
    input_nl: 'Setup: Indirect naming (Portal→Door, Shut→Closed)',
    input_dsl: `
      alias Portal Door
      alias Shut Closed
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Indirect contradiction: hasState Portal Shut contradicts hasState Door Open (after canonicalization)',
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
    input_nl: 'Door is not in Attic (the rejected indirect learn did not partially apply)',
    input_dsl: '@goal locatedIn Door Attic',
    expected_nl: 'Cannot prove: Door is in Attic.',
    proof_nl: 'Door is in Attic'
  },
  {
    action: 'learn',
    input_nl: 'Setup: Water is Hot',
    input_dsl: 'hasProperty Water Hot',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'Setup: Indirect value mapping (Icy ↔ Freezing → Cold)',
    input_dsl: `
      alias Freezing Cold
      synonym Icy Freezing
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Indirect contradiction: hasProperty Water Icy contradicts hasProperty Water Hot (via synonym+alias canonicalization)',
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
    input_nl: 'Setup: A is before B',
    input_dsl: 'before A B',
    expected_nl: 'Learned 1 facts'
  },
  {
    action: 'learn',
    input_nl: 'Contradiction: after A B (should be rejected by contradictsSameArgs)',
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
    input_nl: 'A is still before B (the rejected learn did not change KB)',
    input_dsl: '@goal before A B',
    expected_nl: 'True: A is before B.',
    proof_nl: 'A is before B'
  },
  {
    action: 'prove',
    input_nl: 'X does not cause Y (the rejected learn did not partially apply)',
    input_dsl: '@goal causes X Y',
    expected_nl: 'Cannot prove: X causes Y.',
    proof_nl: 'X causes Y'
  },
  {
    action: 'learn',
    input_nl: 'Setup: Indirect temporal naming (Alpha→A, Beta→B)',
    input_dsl: `
      alias Alpha A
      alias Beta B
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Indirect temporal contradiction: after Alpha Beta contradicts before A B (after canonicalization)',
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
    input_nl: 'Setup: temporal chain Start -> Middle -> End',
    input_dsl: `
      before Start Middle
      before Middle End
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'learn',
    input_nl: 'Indirect contradiction (transitive): after Start End contradicts derived before Start End (rollback keeps Foo causes Bar unlearned)',
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
    input_nl: 'Foo does not cause Bar (the rejected learn did not partially apply)',
    input_dsl: '@goal causes Foo Bar',
    expected_nl: 'Cannot prove: Foo causes Bar.',
    proof_nl: 'Foo causes Bar'
  },
  {
    action: 'learn',
    input_nl: 'Setup: derived property via inheritance (Tea is a Beverage, Beverage is a Liquid, Liquids are Cold)',
    input_dsl: `
      isA Tea Beverage
      isA Beverage Liquid
      hasProperty Liquid Cold
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'learn',
    input_nl: 'Indirect contradiction (inherited): hasProperty Tea Hot contradicts derived hasProperty Tea Cold (rollback keeps Tea in Cupboard unlearned)',
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
    input_nl: 'Tea is not in Cupboard (the rejected inherited-contradiction learn did not partially apply)',
    input_dsl: '@goal locatedIn Tea Cupboard',
    expected_nl: 'Cannot prove: Tea is in Cupboard.',
    proof_nl: 'Tea is in Cupboard'
  }
];

export default { name, description, theories, steps };
