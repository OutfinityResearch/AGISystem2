/**
 * Suite 09 - Compositional Reasoning
 *
 * Property inheritance through deep hierarchies, multi-role composition.
 * Tests: 5-level inheritance + rule chains, multiple role inheritance.
 */

export const name = 'Compositional Reasoning';
export const description = 'Deep property inheritance and multi-role composition';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy with chained rules ===
  {
    action: 'learn',
    input_nl: 'Deep: GoldenRetriever->Retriever->Dog->Mammal->Animal->LivingThing. Properties + chained rules.',
    input_dsl: `
      isA GoldenRetriever Retriever
      isA Retriever Dog
      isA Dog Mammal
      isA Mammal Animal
      isA Animal LivingThing
      hasProperty LivingThing NeedsOxygen
      hasProperty Mammal WarmBlooded
      @inhBase isA ?sub ?super
      @inhProp hasProperty ?super ?prop
      @inhAnd And $inhBase $inhProp
      @inhConc hasProperty ?sub ?prop
      Implies $inhAnd $inhConc
      @metO hasProperty ?x NeedsOxygen
      @metW hasProperty ?x WarmBlooded
      @metAnd And $metO $metW
      @metConc hasProperty ?x Metabolizes
      Implies $metAnd $metConc
      @growCond hasProperty ?x Metabolizes
      @growConc can ?x Grow
      Implies $growCond $growConc
    `,
    expected_nl: 'Learned 20 facts'
  },

  // === PROVE: 5-level property inheritance ===
  {
    action: 'prove',
    input_nl: 'Does GoldenRetriever need oxygen? (5-level)',
    input_dsl: '@goal hasProperty GoldenRetriever NeedsOxygen',
    expected_nl: 'True: GoldenRetriever is needsoxygen'
  },

  // === PROVE: 3-level property inheritance ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever warm-blooded? (3-level)',
    input_dsl: '@goal hasProperty GoldenRetriever WarmBlooded',
    expected_nl: 'True: GoldenRetriever is warmblooded'
  },

  // === PROVE: Derived via And rule (5-level + rule) ===
  {
    action: 'prove',
    input_nl: 'Does GoldenRetriever metabolize? (inheritance + And)',
    input_dsl: '@goal hasProperty GoldenRetriever Metabolizes',
    expected_nl: 'True: GoldenRetriever is metabolizes'
  },

  // === PROVE: Chained rule (5-level + 2 rules) ===
  {
    action: 'prove',
    input_nl: 'Can GoldenRetriever grow? (deep + chained rules)',
    input_dsl: '@goal can GoldenRetriever Grow',
    expected_nl: 'True: GoldenRetriever can Grow'
  },

  // === SETUP: Multi-role composition ===
  {
    action: 'learn',
    input_nl: 'Sarah is Doctor AND Scientist. Combined role rules.',
    input_dsl: `
      isA Sarah Doctor
      isA Sarah Scientist
      hasProperty Doctor HelpsPatients
      hasProperty Doctor Educated
      hasProperty Scientist Discovers
      hasProperty Scientist Analytical
      @resCond1 hasProperty ?x Educated
      @resCond2 hasProperty ?x Analytical
      @resAnd And $resCond1 $resCond2
      @resConc can ?x Research
      Implies $resAnd $resConc
      @clinCond1 can ?x Research
      @clinCond2 hasProperty ?x HelpsPatients
      @clinAnd And $clinCond1 $clinCond2
      @clinConc can ?x ClinicalTrials
      Implies $clinAnd $clinConc
    `,
    expected_nl: 'Learned 16 facts'
  },

  // === PROVE: Role property (Doctor) ===
  {
    action: 'prove',
    input_nl: 'Does Sarah help patients?',
    input_dsl: '@goal hasProperty Sarah HelpsPatients',
    expected_nl: 'True: Sarah is helpspatients'
  },

  // === PROVE: Role property (Scientist) ===
  {
    action: 'prove',
    input_nl: 'Does Sarah discover?',
    input_dsl: '@goal hasProperty Sarah Discovers',
    expected_nl: 'True: Sarah is discovers'
  },

  // === PROVE: Combined role capability (Educated + Analytical -> Research) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah do research?',
    input_dsl: '@goal can Sarah Research',
    expected_nl: 'True: Sarah can Research'
  },

  // === PROVE: Deep combined (Research + HelpsPatients -> ClinicalTrials) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah do clinical trials? (5+ step)',
    input_dsl: '@goal can Sarah ClinicalTrials',
    expected_nl: 'True: Sarah can ClinicalTrials'
  },

  // === QUERY ===
  {
    action: 'query',
    input_nl: 'What is Sarah?',
    input_dsl: '@q isA Sarah ?what',
    expected_nl: 'Sarah is a Doctor. Sarah is a Scientist.'
  },

  // === NEGATIVE ===
  {
    action: 'prove',
    input_nl: 'Can Rock do clinical trials?',
    input_dsl: '@goal can Rock ClinicalTrials',
    expected_nl: 'Cannot prove: Rock can ClinicalTrials'
  }
];

export default { name, description, theories, steps };
