/**
 * Suite 15 - Reasoning Macros & Non-Monotonic Patterns (DS06/DS07h)
 *
 * Abduction, counterfactuals, defaults/exceptions, and deduce/analogy macros.
 * These cases intentionally mix negations, And/Or, and cross-check evidence.
 */

export const name = 'Reasoning Macros & Defaults';
export const description = 'Abduction, counterfactual, default/exception, deduce/analogy stress cases';

export const theories = ['05-logic.sys2', 'Physics/01-relations.sys2'];

export const steps = [
  // === SETUP: Causal KB with conflicting explanations ===
  {
    action: 'learn',
    input_nl: 'Rain causes WetGrass. Rain causes WetSidewalk. Sprinkler causes WetGrass. Sprinkler causes DryPath. PowerOutage causes SprinklerOff. Storm causes Rain. WetGrass observed. WetSidewalk observed. DryPath observed. Storm observed.',
    input_dsl: `
      causes Rain WetGrass
      causes Rain WetSidewalk
      causes Sprinkler WetGrass
      causes Sprinkler DryPath
      causes PowerOutage SprinklerOff
      causes Storm Rain
      observed WetGrass
      observed WetSidewalk
      observed DryPath
      observed Storm
    `,
    expected_nl: 'Learned 10 facts'
  },

  // === ABDUCE: Both Rain and Sprinkler can explain WetGrass ===
  {
    action: 'query',
    input_nl: 'WetGrass abduce ?cause.',
    input_dsl: '@q abduce WetGrass ?cause',
    expected_nl: [
      'WetGrass is explained by Rain.',
      'WetGrass is explained by Sprinkler.'
    ],
    proof_nl: [
      'Causal path: Rain → WetGrass',
      'Causal path: Sprinkler → WetGrass'
    ]
  },

  // === COUNTERFACTUAL: remove Rain, keep Sprinkler evidence ===
  {
    action: 'query',
    input_nl: 'Rain whatif WetGrass ?outcome.',
    input_dsl: '@q whatif Rain WetGrass ?outcome',
    expected_nl: [
      'If Rain did not occur, WetGrass would be uncertain.'
    ],
    proof_nl: [
      'Rain → WetGrass'
    ]
  },

  // === COUNTERFACTUAL DEEP: remove PowerOutage to activate Sprinkler ===
  {
    action: 'query',
    input_nl: 'PowerOutage whatif SprinklerOff ?outcome.',
    input_dsl: '@q whatif PowerOutage SprinklerOff ?outcome',
    expected_nl: [
      'If PowerOutage did not occur, SprinklerOff would not occur.'
    ],
    proof_nl: [
      'PowerOutage → SprinklerOff'
    ]
  },

  // === DEFAULT / EXCEPTION: Birds fly unless exceptions ===
  {
    action: 'learn',
    input_nl: 'can Default Bird Fly. can Exception Penguin Fly. can Exception FlightlessBird Fly. Opus is a Penguin. Penguin is a Bird. Hawk is a Bird. FlightlessBird is a Bird. Penguin is a FlightlessBird.',
    input_dsl: `
      Default can Bird Fly
      Exception can Penguin Fly
      Exception can FlightlessBird Fly
      isA Opus Penguin
      isA Penguin Bird
      isA Hawk Bird
      isA FlightlessBird Bird
      isA Penguin FlightlessBird
    `,
    expected_nl: 'Learned 8 facts'
  },

  {
    action: 'prove',
    input_nl: 'Hawk can Fly.',
    input_dsl: '@goal can Hawk Fly',
    expected_nl: 'True: Hawk can Fly.',
    proof_nl: 'Default can Bird Fly applies. Hawk inherits via default. Therefore Hawk can Fly.'
  },

  {
    action: 'prove',
    input_nl: 'Opus can Fly.',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly.',
    proof_nl: [
      'No can facts for Opus exist in KB',
      'cannot be derived'
    ]
  },

  // === ANALOGY: Orbital system proportional reasoning ===
  {
    action: 'learn',
    input_nl: 'Planet orbits Sun. Electron orbits Nucleus.',
    input_dsl: `
      @Orbits:orbits __Relation
      orbits Planet Sun
      orbits Electron Nucleus
    `,
    expected_nl: 'Learned 3 facts'
  },

  {
    action: 'query',
    input_nl: 'Planet analogy Sun Electron ?center.',
    input_dsl: '@q analogy Planet Sun Electron ?center',
    expected_nl: [
      'Planet is to Sun as Electron is to Nucleus.'
    ],
    proof_nl: [
      'Planet orbits Sun maps to Electron orbits Nucleus'
    ]
  },

  // === NEGATION + AND: Abduce with missing evidence should fail softly ===
  {
    action: 'query',
    input_nl: 'DryPath abduce ?cause.',
    input_dsl: '@q abduce DryPath ?cause',
    expected_nl: [
      'DryPath is explained by Sprinkler.'
    ],
    proof_nl: [
      'Causal path: Sprinkler → DryPath'
    ]
  }
];

export default { name, description, theories, steps };
