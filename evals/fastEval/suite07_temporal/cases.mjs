/**
 * Suite 07 - Temporal & Causal Reasoning (Deep Chains)
 *
 * Deep before/causes transitive chains with prevention rules.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Temporal & Causal';
export const description = 'Deep temporal and causal transitive chains with complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep historical timeline (8 steps) ===
  {
    action: 'learn',
    input_nl: 'AncientRome before Byzantine. Byzantine before Medieval. Medieval before Renaissance. Renaissance before Enlightenment. Enlightenment before Industrial. Industrial before ModernAge. ModernAge before InfoAge. InfoAge before AIAge.',
    input_dsl: `
      before AncientRome Byzantine
      before Byzantine Medieval
      before Medieval Renaissance
      before Renaissance Enlightenment
      before Enlightenment Industrial
      before Industrial ModernAge
      before ModernAge InfoAge
      before InfoAge AIAge
    `,
    expected_nl: 'Learned 8 facts'
  },

  // === PROVE: 8-step temporal (AncientRome->AIAge) ===
  {
    action: 'prove',
    input_nl: 'AncientRome before AIAge.',
    input_dsl: '@goal before AncientRome AIAge',
    expected_nl: 'True: AncientRome is before AIAge.',
    proof_nl: 'AncientRome is before Byzantine. Byzantine is before Medieval. Medieval is before Renaissance. Renaissance is before Enlightenment. Enlightenment is before Industrial. Industrial is before ModernAge. ModernAge is before InfoAge. InfoAge is before AIAge.'
  },

  // === PROVE: 6-step temporal (Medieval->InfoAge) ===
  {
    action: 'prove',
    input_nl: 'Medieval before InfoAge.',
    input_dsl: '@goal before Medieval InfoAge',
    expected_nl: 'True: Medieval is before InfoAge.',
    proof_nl: 'Medieval is before Renaissance. Renaissance is before Enlightenment. Enlightenment is before Industrial. Industrial is before ModernAge. ModernAge is before InfoAge.'
  },

  // === PROVE: 5-step temporal (Byzantine->Industrial) ===
  {
    action: 'prove',
    input_nl: 'Byzantine before Industrial.',
    input_dsl: '@goal before Byzantine Industrial',
    expected_nl: 'True: Byzantine is before Industrial.',
    proof_nl: 'Byzantine is before Medieval. Medieval is before Renaissance. Renaissance is before Enlightenment. Enlightenment is before Industrial. Transitive chain verified (4 hops). Therefore Byzantine is before Industrial.'
  },

  // === SETUP: Deep causal chain (7 steps) + entity hierarchy ===
  {
    action: 'learn',
    input_nl: 'Deforestation causes Erosion. Erosion causes Flooding. Flooding causes CropLoss. CropLoss causes FoodShortage. FoodShortage causes Malnutrition. Malnutrition causes HealthCrisis. HealthCrisis causes SocialUnrest. Deforestation is an EnvironmentalDamage. EnvironmentalDamage is a HumanImpact. HumanImpact is a GlobalIssue. GlobalIssue is a Problem. Problem is a Concern. Concern is an AbstractConcept.',
    input_dsl: `
      causes Deforestation Erosion
      causes Erosion Flooding
      causes Flooding CropLoss
      causes CropLoss FoodShortage
      causes FoodShortage Malnutrition
      causes Malnutrition HealthCrisis
      causes HealthCrisis SocialUnrest
      isA Deforestation EnvironmentalDamage
      isA EnvironmentalDamage HumanImpact
      isA HumanImpact GlobalIssue
      isA GlobalIssue Problem
      isA Problem Concern
      isA Concern AbstractConcept
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === PROVE: 7-step causal (Deforestation->SocialUnrest) ===
  {
    action: 'prove',
    input_nl: 'Deforestation causes SocialUnrest.',
    input_dsl: '@goal causes Deforestation SocialUnrest',
    expected_nl: 'True: Deforestation causes SocialUnrest.',
    proof_nl: 'Deforestation causes Erosion. Erosion causes Flooding. Flooding causes CropLoss. CropLoss causes FoodShortage. FoodShortage causes Malnutrition. Malnutrition causes HealthCrisis. HealthCrisis causes SocialUnrest.'
  },

  // === PROVE: 5-step causal (Flooding->HealthCrisis) ===
  {
    action: 'prove',
    input_nl: 'Flooding causes HealthCrisis.',
    input_dsl: '@goal causes Flooding HealthCrisis',
    expected_nl: 'True: Flooding causes HealthCrisis.',
    proof_nl: 'Flooding causes CropLoss. CropLoss causes FoodShortage. FoodShortage causes Malnutrition. Malnutrition causes HealthCrisis. Causal chain verified (4 hops). Therefore Flooding causes HealthCrisis.'
  },

  // === PROVE: 6-step isA (Deforestation->AbstractConcept) ===
  {
    action: 'prove',
    input_nl: 'Deforestation is an AbstractConcept.',
    input_dsl: '@goal isA Deforestation AbstractConcept',
    expected_nl: 'True: Deforestation is an abstractconcept.',
    proof_nl: 'Deforestation isA EnvironmentalDamage. EnvironmentalDamage isA HumanImpact. HumanImpact isA GlobalIssue. GlobalIssue isA Problem. Problem isA Concern. Concern isA AbstractConcept.'
  },

  // === SETUP: Deep prevention reasoning ===
  {
    action: 'learn',
    input_nl: 'IF ((?a causes ?b) AND (?b causes ?c)) THEN (?a wouldPrevent ?c).',
    input_dsl: `
      @causeAB causes ?a ?b
      @causeBC causes ?b ?c
      @causeAnd And $causeAB $causeBC
      @indirectConc wouldPrevent ?a ?c
      Implies $causeAnd $indirectConc
    `,
    expected_nl: 'Learned 5 facts'
  },

  // === PROVE: Prevention via rule (5+ step reasoning) ===
  {
    action: 'prove',
    input_nl: 'Deforestation wouldPrevent Flooding.',
    input_dsl: '@goal wouldPrevent Deforestation Flooding',
    expected_nl: 'True: Preventing Deforestation would prevent Flooding.',
    proof_nl: [
      'Deforestation causes Erosion',
      'Erosion causes Flooding',
      'Causal chain verified',
      'Applied rule: IF ((Deforestation causes Erosion) AND (Erosion causes Flooding)) THEN (Preventing Deforestation would prevent Flooding)',
      'Therefore Preventing Deforestation would prevent Flooding'
    ]
  },

  // === PROVE: Deeper prevention (5+ step reasoning) ===
  {
    action: 'prove',
    input_nl: 'Erosion wouldPrevent FoodShortage.',
    input_dsl: '@goal wouldPrevent Erosion FoodShortage',
    expected_nl: 'True: Preventing Erosion would prevent FoodShortage.',
    proof_nl: [
      'Erosion causes Flooding',
      'Flooding causes FoodShortage',
      'Causal chain verified',
      'Applied rule: IF ((Erosion causes Flooding) AND (Flooding causes FoodShortage)) THEN (Preventing Erosion would prevent FoodShortage)',
      'Therefore Preventing Erosion would prevent FoodShortage'
    ]
  },

  // === NEGATIVE: Reverse temporal fails with search trace ===
  {
    action: 'prove',
    input_nl: 'AIAge before AncientRome.',
    input_dsl: '@goal before AIAge AncientRome',
    expected_nl: 'Cannot prove: AIAge is before AncientRome.',
    proof_nl: [
      'No before facts for AIAge exist in KB',
      'cannot be derived'
    ]
  },

  // === NEGATIVE: Reverse causal fails with search trace ===
  {
    action: 'prove',
    input_nl: 'SocialUnrest causes Deforestation.',
    input_dsl: '@goal causes SocialUnrest Deforestation',
    expected_nl: 'Cannot prove: SocialUnrest causes Deforestation.',
    proof_nl: [
      'No causes facts for SocialUnrest exist in KB',
      'cannot be derived'
    ]
  },

  // === QUERY: What does Deforestation cause ===
  {
    action: 'query',
    input_nl: 'Deforestation causes ?effect.',
    input_dsl: '@q causes Deforestation ?effect',
    expected_nl: [
      'Deforestation causes Erosion.'
    ],
    proof_nl: ['Fact in KB: Deforestation causes Erosion']
  }
];

export default { name, description, theories, steps };
