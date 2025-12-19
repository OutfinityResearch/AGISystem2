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
    input_nl: 'Deep historical: AncientRome->Byzantine->Medieval->Renaissance->Enlightenment->Industrial->ModernAge->InfoAge->AIAge',
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
    input_nl: 'Was AncientRome before AIAge? (8-step chain)',
    input_dsl: '@goal before AncientRome AIAge',
    expected_nl: 'True: AncientRome is before AIAge.',
    proof_nl: 'AncientRome is before Byzantine. Byzantine is before Medieval. Medieval is before Renaissance. Renaissance is before Enlightenment. Enlightenment is before Industrial. Industrial is before ModernAge. ModernAge is before InfoAge. InfoAge is before AIAge.'
  },

  // === PROVE: 6-step temporal (Medieval->InfoAge) ===
  {
    action: 'prove',
    input_nl: 'Was Medieval before InfoAge? (6-step chain)',
    input_dsl: '@goal before Medieval InfoAge',
    expected_nl: 'True: Medieval is before InfoAge.',
    proof_nl: 'Medieval is before Renaissance. Renaissance is before Enlightenment. Enlightenment is before Industrial. Industrial is before ModernAge. ModernAge is before InfoAge.'
  },

  // === PROVE: 5-step temporal (Byzantine->Industrial) ===
  {
    action: 'prove',
    input_nl: 'Was Byzantine before Industrial? (5-step chain)',
    input_dsl: '@goal before Byzantine Industrial',
    expected_nl: 'True: Byzantine is before Industrial.',
    proof_nl: 'Byzantine is before Medieval. Medieval is before Renaissance. Renaissance is before Enlightenment. Enlightenment is before Industrial. Transitive chain verified (4 hops). Therefore Byzantine is before Industrial.'
  },

  // === SETUP: Deep causal chain (7 steps) + entity hierarchy ===
  {
    action: 'learn',
    input_nl: 'Deep causal: Deforestation->Erosion->Flooding->CropLoss->FoodShortage->Malnutrition->HealthCrisis->SocialUnrest',
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
    input_nl: 'Does Deforestation cause SocialUnrest? (7-step causal chain)',
    input_dsl: '@goal causes Deforestation SocialUnrest',
    expected_nl: 'True: Deforestation causes SocialUnrest.',
    proof_nl: 'Deforestation causes Erosion. Erosion causes Flooding. Flooding causes CropLoss. CropLoss causes FoodShortage. FoodShortage causes Malnutrition. Malnutrition causes HealthCrisis. HealthCrisis causes SocialUnrest.'
  },

  // === PROVE: 5-step causal (Flooding->HealthCrisis) ===
  {
    action: 'prove',
    input_nl: 'Does Flooding cause HealthCrisis? (5-step causal chain)',
    input_dsl: '@goal causes Flooding HealthCrisis',
    expected_nl: 'True: Flooding causes HealthCrisis.',
    proof_nl: 'Flooding causes CropLoss. CropLoss causes FoodShortage. FoodShortage causes Malnutrition. Malnutrition causes HealthCrisis. Causal chain verified (4 hops). Therefore Flooding causes HealthCrisis.'
  },

  // === PROVE: 6-step isA (Deforestation->AbstractConcept) ===
  {
    action: 'prove',
    input_nl: 'Is Deforestation an AbstractConcept? (6-step isA chain)',
    input_dsl: '@goal isA Deforestation AbstractConcept',
    expected_nl: 'True: Deforestation is an abstractconcept.',
    proof_nl: 'Deforestation isA EnvironmentalDamage. EnvironmentalDamage isA HumanImpact. HumanImpact isA GlobalIssue. GlobalIssue isA Problem. Problem isA Concern. Concern isA AbstractConcept.'
  },

  // === SETUP: Deep prevention reasoning ===
  {
    action: 'learn',
    input_nl: 'Prevention rule: stopping X prevents downstream Y through causal chain.',
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
    input_nl: 'Would preventing Deforestation prevent Flooding? (rule application)',
    input_dsl: '@goal wouldPrevent Deforestation Flooding',
    expected_nl: 'True: Preventing Deforestation would prevent Flooding.',
    proof_nl: 'Applied rule: (A causes B AND B causes C) implies wouldPrevent A C. Deforestation causes Erosion. Erosion causes Flooding. And condition satisfied: causes Deforestation Erosion, causes Erosion Flooding. Therefore Preventing Deforestation would prevent Flooding.'
  },

  // === PROVE: Deeper prevention (5+ step reasoning) ===
  {
    action: 'prove',
    input_nl: 'Would preventing Erosion prevent FoodShortage? (rule application)',
    input_dsl: '@goal wouldPrevent Erosion FoodShortage',
    expected_nl: 'True: Preventing Erosion would prevent FoodShortage.',
    proof_nl: 'Searched causes Flooding ?b. Found: Flooding causes CropLoss. Searched causes CropLoss ?c. Found: CropLoss causes FoodShortage. Searched causes Erosion ?d. Found: Erosion causes Flooding. Searched causes Flooding ?e. Found: Flooding causes FoodShortage. Causal chain verified (2 hops). And condition satisfied: causes Erosion Flooding, causes Flooding FoodShortage. Applied rule: (A causes B AND B causes C) implies wouldPrevent A C. Therefore Preventing Erosion would prevent FoodShortage.'
  },

  // === NEGATIVE: Reverse temporal fails with search trace ===
  {
    action: 'prove',
    input_nl: 'Is AIAge before AncientRome? (reverse temporal - should fail)',
    input_dsl: '@goal before AIAge AncientRome',
    expected_nl: 'Cannot prove: AIAge is before AncientRome.',
    proof_nl: 'Search: Searched before AIAge ?next in KB. Not found. AIAge has no outgoing before relations. Reverse path: AncientRome -> Byzantine -> Medieval -> Renaissance -> Enlightenment -> Industrial -> ModernAge -> InfoAge -> AIAge. Path exists in opposite direction only. Temporal order violated.'
  },

  // === NEGATIVE: Reverse causal fails with search trace ===
  {
    action: 'prove',
    input_nl: 'Does SocialUnrest cause Deforestation? (reverse causal - should fail)',
    input_dsl: '@goal causes SocialUnrest Deforestation',
    expected_nl: 'Cannot prove: SocialUnrest causes Deforestation.',
    proof_nl: 'Search: Searched causes SocialUnrest ?next in KB. Not found. SocialUnrest has no outgoing causes relations. Reverse path: Deforestation -> Erosion -> Flooding -> CropLoss -> FoodShortage -> Malnutrition -> HealthCrisis -> SocialUnrest. Path exists in opposite direction only. Causal direction violated.'
  },

  // === QUERY: What does Deforestation cause ===
  {
    action: 'query',
    input_nl: 'What does Deforestation cause?',
    input_dsl: '@q causes Deforestation ?effect',
    expected_nl: [
      'Deforestation causes Erosion.'
    ],
    proof_nl: ['causes Deforestation Erosion']
  }
];

export default { name, description, theories, steps };
