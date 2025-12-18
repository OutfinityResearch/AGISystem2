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
    expected_nl: 'Answer: Rain. Proof: Rain causes WetGrass and WetSidewalk; Sprinkler rejected because DryPath observed and Sprinkler would wet path unless SprinklerOff.'
  },

  // === COUNTERFACTUAL: remove Rain, keep Sprinkler evidence ===
  {
    action: 'query',
    input_nl: 'What if Rain did not occur?',
    input_dsl: '@q whatif Rain WetGrass ?outcome',
    expected_nl: 'Answer: WetGrass would fail. Proof: Without Rain, only Sprinkler could cause WetGrass; DryPath observation blocks Sprinkler path.'
  },

  // === COUNTERFACTUAL DEEP: remove PowerOutage to activate Sprinkler ===
  {
    action: 'query',
    input_nl: 'What if the power outage did not happen?',
    input_dsl: '@q whatif PowerOutage SprinklerOff ?outcome',
    expected_nl: 'Answer: Sprinkler would run, making WetGrass true and DryPath false. Proof: Removing PowerOutage removes SprinklerOff, enabling Sprinkler -> WetGrass and negating DryPath.'
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
    expected_nl: 'True: Hawk can Fly. Proof: Default Bird Fly applies. Hawk isA Bird. No exceptions triggered.'
  },

  {
    action: 'prove',
    input_nl: 'Can Opus fly (exception should block)?',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly. Search: Opus isA Penguin. Penguin isA Bird. Default Bird Fly blocked by exception Penguin/FlightlessBird.'
  },

  // === DEDUCE: bundle premises to derive conclusion ===
  {
    action: 'query',
    input_nl: 'Deduce warm-blooded from Mammal rule and Fox fact.',
    input_dsl: `
      @p1 implies (isA ?x Mammal) (has ?x WarmBlood)
      @p2 isA Fox Mammal
      @q deduce @p1 @p2 ?conclusion
    `,
    expected_nl: 'Answer: Fox has WarmBlood. Proof: isA Fox Mammal; rule implies Mammal -> WarmBlood; therefore Fox has WarmBlood.'
  },

  // === ANALOGY MACRO: proportional reasoning ===
  {
    action: 'query',
    input_nl: 'Planet:Sun :: Electron: ?',
    input_dsl: '@q analogy Planet Sun Electron ?center',
    expected_nl: 'Answer: Nucleus. Proof: Sun is center of Planet orbit; Nucleus is center of Electron orbit.'
  },

  // === NEGATION + AND: Abduce with missing evidence should fail softly ===
  {
    action: 'query',
    input_nl: 'Why is the path dry (should reject Rain)?',
    input_dsl: '@q abduce DryPath ?cause',
    expected_nl: 'Answer: SprinklerOff (via PowerOutage). Proof: DryPath observed; Rain would wet sidewalks; PowerOutage causes SprinklerOff preventing Sprinkler from wetting path.'
  }
];

export default { name, description, theories, steps };
