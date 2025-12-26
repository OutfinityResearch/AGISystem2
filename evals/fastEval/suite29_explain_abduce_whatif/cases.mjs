/**
 * Suite 29 - Explain + Abduce + Whatif (Multi-step, Proof-Real)
 *
 * Goals:
 * - Ensure transitive causal chains are used (4+ steps).
 * - Ensure `explain` is not a trivial wrapper: prove-first, abduce fallback.
 * - Ensure `whatif` reports multi-step causal paths and alternative causes.
 * - Ensure meta-operator proofs include confidence text.
 */

export const name = 'Explain + Abduce + Whatif';
export const description = 'Multi-step causal chain with explain/abduce/whatif outputs and proof text.';

export const theories = ['05-logic.sys2'];

export const steps = [
  {
    action: 'learn',
    input_nl: 'Setup a multi-step causal chain and an alternative independent cause.',
    input_dsl: `
      causes Storm Rain
      causes Rain WetGrass
      causes WetGrass SlipHazard
      causes SlipHazard Injury

      # Alternative cause for Injury (independent of Storm)
      causes Accident Injury
    `,
    expected_nl: 'Learned'
  },

  {
    action: 'query',
    input_nl: 'Explain why Storm causes Injury (requires multi-step transitive reasoning).',
    input_dsl: '@q explain (causes Storm Injury) ?why',
    maxResults: 1,
    expected_nl: [
      'Explanation for causes Storm Injury.'
    ],
    proof_nl: [
      'Therefore Storm causes Injury'
    ]
  },

  {
    action: 'query',
    input_nl: 'Counterfactual: if Storm did not occur, would Injury still occur?',
    input_dsl: '@q whatif Storm Injury ?outcome',
    maxResults: 1,
    expected_nl: [
      'If Storm did not occur, Injury would be uncertain.'
    ],
    proof_nl: [
      'Storm → Rain → WetGrass'
    ]
  },

  {
    action: 'query',
    input_nl: 'Abduce plausible explanations for Injury (should include direct and upstream causes).',
    input_dsl: '@q abduce Injury ?cause',
    maxResults: 5,
    expected_nl: [
      'Injury is explained by SlipHazard.',
      'Injury is explained by Accident.'
    ],
    proof_nl: [
      'Causal path: SlipHazard → Injury',
      'Causal path: Accident → Injury'
    ]
  }
];

export default { name, description, theories, steps };

