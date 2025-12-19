/**
 * Suite 15 - Reasoning Macros & Non-Monotonic Patterns (DS06/DS07h)
 *
 * Abduction, counterfactuals, defaults/exceptions, and deduce/analogy macros.
 * These cases intentionally mix negations, And/Or, and cross-check evidence.
 */

export const name = 'Reasoning Macros & Defaults';
export const description = 'Abduction, counterfactual, default/exception, deduce/analogy stress cases';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Causal KB with conflicting explanations ===
  {
    action: 'learn',
    input_nl: 'Causal world: Rain vs Sprinkler, plus side-effects to disambiguate.',
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

  // === ABDUCE: Explain WetGrass + WetSidewalk, reject Sprinkler by DryPath ===
  {
    action: 'query',
    input_nl: 'Why is the grass wet and the sidewalk wet?',
    input_dsl: '@q abduce WetGrass ?cause',
    expected_nl: 'WetGrass is explained by Rain. WetGrass is explained by Sprinkler. Proof: Causal chain: Rain → WetGrass. Causal chain: Sprinkler → WetGrass.'
  },

  // === COUNTERFACTUAL: remove Rain, keep Sprinkler evidence ===
  {
    action: 'query',
    input_nl: 'What if Rain did not occur?',
    input_dsl: '@q whatif Rain WetGrass ?outcome',
    expected_nl: 'If Rain did not occur, WetGrass would be uncertain. Proof: Rain → WetGrass'
  },

  // === COUNTERFACTUAL DEEP: remove PowerOutage to activate Sprinkler ===
  {
    action: 'query',
    input_nl: 'What if the power outage did not happen?',
    input_dsl: '@q whatif PowerOutage SprinklerOff ?outcome',
    expected_nl: 'If PowerOutage did not occur, SprinklerOff would not occur. Proof: PowerOutage → SprinklerOff'
  },

  // === DEFAULT / EXCEPTION: Birds fly unless exceptions ===
  {
    action: 'learn',
    input_nl: 'Default flight rule with exceptions and And condition.',
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
    input_nl: 'Can Hawk fly under default rule?',
    input_dsl: '@goal can Hawk Fly',
    expected_nl: 'True: Hawk can Fly. Proof: Default can Bird Fly applies. Hawk inherits via default. Therefore Hawk can Fly.'
  },

  {
    action: 'prove',
    input_nl: 'Can Opus fly (exception should block)?',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly. Search: Opus isA Penguin. Opus isA Bird. Default can Penguin Fly blocked by exception for Penguin.'
  },

  // === ANALOGY: Orbital system proportional reasoning ===
  {
    action: 'learn',
    input_nl: 'Orbital systems: Planet-Sun and Electron-Nucleus.',
    input_dsl: `
      orbits Planet Sun
      orbits Electron Nucleus
    `,
    expected_nl: 'Learned 2 facts'
  },

  {
    action: 'query',
    input_nl: 'Planet:Sun :: Electron: ?',
    input_dsl: '@q analogy Planet Sun Electron ?center',
    expected_nl: 'Planet is to Sun as Electron is to Nucleus. Proof: Planet orbits Sun maps to Electron orbits Nucleus'
  },

  // === NEGATION + AND: Abduce with missing evidence should fail softly ===
  {
    action: 'query',
    input_nl: 'Why is the path dry (should reject Rain)?',
    input_dsl: '@q abduce DryPath ?cause',
    expected_nl: 'DryPath is explained by Sprinkler. Proof: Causal chain: Sprinkler → DryPath'
  }
];

export default { name, description, theories, steps };
