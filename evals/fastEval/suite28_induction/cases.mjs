/**
 * Suite 28 - Induction (bAbI-style)
 *
 * Tests lightweight type-to-property induction used in bAbI16:
 * infer a missing property value for an entity from its type peers.
 */

export const name = 'Induction';
export const description = 'Type-level induction for missing hasProperty queries';

export const theories = ['05-logic.sys2'];

export const steps = [
  {
    action: 'learn',
    input_nl: 'bAbI16-style colors: two frogs are gray; Greg is a frog',
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
    input_dsl: '@q hasProperty Greg ?x',
    expected_nl: [
      'Greg has gray.'
    ],
    proof_nl: [
      'induction: among Frog peers, observed 2/2 with gray'
    ]
  }
];

export default { name, description, theories, steps };
