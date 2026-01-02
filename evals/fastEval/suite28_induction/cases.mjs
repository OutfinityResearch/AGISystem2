/**
 * Suite 28 - Induction (bAbI-style)
 *
 * Tests lightweight type-to-property induction used in bAbI16:
 * infer a missing property value for an entity from its type peers.
 */

export const name = 'Induction';
export const description = 'Type-level induction for missing hasProperty queries';

export const theories = [];

export const steps = [
  {
    action: 'learn',
    input_nl: 'Lily is a Frog. Lily hasProperty gray. Julius is a Frog. Julius hasProperty gray. Greg is a Frog.',
    input_dsl: `
      isA Lily Frog
      hasProperty Lily gray
      isA Julius Frog
      hasProperty Julius gray
      isA Greg Frog
    `,
    expected_nl: 'Learned 5 facts'
  },
  {
    action: 'query',
    input_nl: 'Greg hasProperty ?x.',
    input_dsl: '@q hasProperty Greg ?x',
    expected_nl: [
      'Greg has gray.'
    ],
    proof_nl: [
      'induction: among Frog peers, observed 2/2 with gray'
    ]
  },
  {
    action: 'learn',
    input_nl: 'Bernhard is a Swan. Brian is a Swan. Bernhard hasProperty yellow.',
    input_dsl: `
      isA Bernhard Swan
      isA Brian Swan
      hasProperty Bernhard yellow
    `,
    expected_nl: 'Learned 3 facts'
  },
  {
    action: 'query',
    input_nl: 'Brian hasProperty ?x.',
    input_dsl: '@q hasProperty Brian ?x',
    expected_nl: [
      'Brian has yellow.'
    ],
    proof_nl: [
      'induction: among Swan peers, observed 1/1 with yellow'
    ]
  }
];

export default { name, description, theories, steps };
