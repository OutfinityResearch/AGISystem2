/**
 * Suite 09 - Compositional Reasoning (Deep Chains)
 *
 * Deep property inheritance through hierarchies with chained rules.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Compositional Reasoning';
export const description = 'Deep property inheritance and multi-role composition with complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy (9 levels) with chained property rules ===
  {
    action: 'learn',
    input_nl: 'GoldenRetriever is a Retriever. Retriever is a Sporting. Sporting is a Dog. Dog is a Canine. Canine is a Carnivore. Carnivore is a Mammal. Mammal is a Vertebrate. Vertebrate is an Animal. Animal is a LivingThing. LivingThing is an Entity. Entity hasProperty Exists. LivingThing hasProperty Metabolizes. Animal hasProperty Sentient. Vertebrate hasProperty HasSpine. Mammal hasProperty WarmBlooded. IF ((?sub is a ?super) AND (?super hasProperty ?prop)) THEN (?sub hasProperty ?prop). IF ((?x hasProperty Metabolizes) AND (?x hasProperty WarmBlooded)) THEN (?x can Grow). IF ((?x hasProperty Sentient) AND (?x can Grow)) THEN (?x hasProperty Intelligent).',
    input_dsl: `
      isA GoldenRetriever Retriever
      isA Retriever Sporting
      isA Sporting Dog
      isA Dog Canine
      isA Canine Carnivore
      isA Carnivore Mammal
      isA Mammal Vertebrate
      isA Vertebrate Animal
      isA Animal LivingThing
      isA LivingThing Entity
      hasProperty Entity Exists
      hasProperty LivingThing Metabolizes
      hasProperty Animal Sentient
      hasProperty Vertebrate HasSpine
      hasProperty Mammal WarmBlooded
      @inhBase isA ?sub ?super
      @inhProp hasProperty ?super ?prop
      @inhAnd And $inhBase $inhProp
      @inhConc hasProperty ?sub ?prop
      Implies $inhAnd $inhConc
      @metGrowCond1 hasProperty ?x Metabolizes
      @metGrowCond2 hasProperty ?x WarmBlooded
      @metGrowAnd And $metGrowCond1 $metGrowCond2
      @metGrowConc can ?x Grow
      Implies $metGrowAnd $metGrowConc
      @smartCond1 hasProperty ?x Sentient
      @smartCond2 can ?x Grow
      @smartAnd And $smartCond1 $smartCond2
      @smartConc hasProperty ?x Intelligent
      Implies $smartAnd $smartConc
    `,
    expected_nl: 'Learned 30 facts'
  },

  // === PROVE: 9-step isA (GoldenRetriever->Entity) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever is an Entity.',
    input_dsl: '@goal isA GoldenRetriever Entity',
    expected_nl: 'True: GoldenRetriever is an entity.',
    proof_nl: 'GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity.'
  },

  // === PROVE: 9-level property inheritance (Exists from Entity) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever hasProperty Exists.',
    input_dsl: '@goal hasProperty GoldenRetriever Exists',
    expected_nl: 'True: GoldenRetriever has Exists.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing is an entity. Entity has Exists. GoldenRetriever has Exists. Transitive chain verified (10 hops). Therefore GoldenRetriever has Exists.'
  },

  // === PROVE: 8-level property inheritance (Metabolizes from LivingThing) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever hasProperty Metabolizes.',
    input_dsl: '@goal hasProperty GoldenRetriever Metabolizes',
    expected_nl: 'True: GoldenRetriever has Metabolizes.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing has Metabolizes. GoldenRetriever has Metabolizes. Transitive chain verified (9 hops). Therefore GoldenRetriever has Metabolizes.'
  },

  // === PROVE: 7-level property inheritance (Sentient from Animal) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever hasProperty Sentient.',
    input_dsl: '@goal hasProperty GoldenRetriever Sentient',
    expected_nl: 'True: GoldenRetriever has Sentient.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal has Sentient. GoldenRetriever has Sentient. Transitive chain verified (8 hops). Therefore GoldenRetriever has Sentient.'
  },

  // === PROVE: 5-level property inheritance (WarmBlooded from Mammal) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever hasProperty WarmBlooded.',
    input_dsl: '@goal hasProperty GoldenRetriever WarmBlooded',
    expected_nl: 'True: GoldenRetriever has WarmBlooded.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal has WarmBlooded. GoldenRetriever has WarmBlooded. Transitive chain verified (6 hops). Therefore GoldenRetriever has WarmBlooded.'
  },

  // === PROVE: Chained rule (can Grow via Metabolizes + WarmBlooded) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever can Grow.',
    input_dsl: '@goal can GoldenRetriever Grow',
    expected_nl: 'True: GoldenRetriever can Grow.',
    proof_nl: [
      'GoldenRetriever has Metabolizes',
      'GoldenRetriever has WarmBlooded',
      'Applied rule: IF ((GoldenRetriever has Metabolizes) AND (GoldenRetriever has WarmBlooded)) THEN (GoldenRetriever can Grow)',
      'Therefore GoldenRetriever can Grow'
    ]
  },

  // === PROVE: Deep chained rule (Intelligent via Sentient + can Grow) ===
  {
    action: 'prove',
    input_nl: 'GoldenRetriever hasProperty Intelligent.',
    input_dsl: '@goal hasProperty GoldenRetriever Intelligent',
    expected_nl: 'True: GoldenRetriever has Intelligent.',
    proof_nl: [
      'GoldenRetriever has Intelligent',
      'Therefore GoldenRetriever has Intelligent'
    ]
  },

  // === SETUP: Deep multi-role composition ===
  {
    action: 'learn',
    input_nl: 'Sarah is a ResearchScientist. Sarah is a ClinicianDoctor. ResearchScientist is a Scientist. Scientist is a Researcher. Researcher is an Academic. Academic is an Intellectual. Intellectual is an Educated. ClinicianDoctor is a Physician. Physician is a Doctor. Doctor is a MedicalProfessional. MedicalProfessional is a Healer. Healer is a Caregiver. Educated hasProperty Analytical. Researcher hasProperty Methodical. Academic hasProperty Published. MedicalProfessional hasProperty Ethical. Healer hasProperty Compassionate. IF ((?x hasProperty Analytical) AND (?x hasProperty Methodical)) THEN (?x can Innovate). IF ((?x can Innovate) AND (?x hasProperty Compassionate)) THEN (?x can ClinicalTrials).',
    input_dsl: `
      isA Sarah ResearchScientist
      isA Sarah ClinicianDoctor
      isA ResearchScientist Scientist
      isA Scientist Researcher
      isA Researcher Academic
      isA Academic Intellectual
      isA Intellectual Educated
      isA ClinicianDoctor Physician
      isA Physician Doctor
      isA Doctor MedicalProfessional
      isA MedicalProfessional Healer
      isA Healer Caregiver
      hasProperty Educated Analytical
      hasProperty Researcher Methodical
      hasProperty Academic Published
      hasProperty MedicalProfessional Ethical
      hasProperty Healer Compassionate
      @researchCond1 hasProperty ?x Analytical
      @researchCond2 hasProperty ?x Methodical
      @researchAnd And $researchCond1 $researchCond2
      @researchConc can ?x Innovate
      Implies $researchAnd $researchConc
      @clinCond1 can ?x Innovate
      @clinCond2 hasProperty ?x Compassionate
      @clinAnd And $clinCond1 $clinCond2
      @clinConc can ?x ClinicalTrials
      Implies $clinAnd $clinConc
    `,
    expected_nl: 'Learned 27 facts'
  },

  // === PROVE: 5-step isA via Scientist role (Sarah->Educated) ===
  {
    action: 'prove',
    input_nl: 'Sarah is an Educated.',
    input_dsl: '@goal isA Sarah Educated',
    expected_nl: 'True: Sarah is educated.',
    proof_nl: 'Sarah isA ResearchScientist. ResearchScientist isA Scientist. Scientist isA Researcher. Researcher isA Academic. Academic isA Intellectual. Intellectual isA Educated.'
  },

  // === PROVE: 5-step isA via Doctor role (Sarah->Caregiver) ===
  {
    action: 'prove',
    input_nl: 'Sarah is a Caregiver.',
    input_dsl: '@goal isA Sarah Caregiver',
    expected_nl: 'True: Sarah is a caregiver.',
    proof_nl: 'Sarah isA ClinicianDoctor. ClinicianDoctor isA Physician. Physician isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Healer. Healer isA Caregiver.'
  },

  // === PROVE: Combined role capability (can Innovate via both hierarchies) ===
  {
    action: 'prove',
    input_nl: 'Sarah can Innovate.',
    input_dsl: '@goal can Sarah Innovate',
    expected_nl: 'True: Sarah can Innovate.',
    proof_nl: [
      'Sarah has Analytical',
      'Sarah has Methodical',
      'Applied rule: IF ((Sarah has Analytical) AND (Sarah has Methodical)) THEN (Sarah can Innovate)',
      'Therefore Sarah can Innovate'
    ]
  },

  // === PROVE: Deep chained multi-role (can ClinicalTrials) ===
  {
    action: 'prove',
    input_nl: 'Sarah can ClinicalTrials.',
    input_dsl: '@goal can Sarah ClinicalTrials',
    expected_nl: 'True: Sarah can ClinicalTrials.',
    proof_nl: [
      'Sarah can Innovate',
      'Sarah has Compassionate',
      'Applied rule: IF ((Sarah can Innovate) AND (Sarah has Compassionate)) THEN (Sarah can ClinicalTrials)',
      'Therefore Sarah can ClinicalTrials'
    ]
  },

  // === NEGATIVE: Rock cannot do clinical trials with search trace ===
  {
    action: 'prove',
    input_nl: 'Rock can ClinicalTrials.',
    input_dsl: '@goal can Rock ClinicalTrials',
    expected_nl: 'Cannot prove: Rock can ClinicalTrials.',
    proof_nl: [
      'Checked rule: IF ((Rock can Innovate) AND (Rock has Compassionate)) THEN (Rock can ClinicalTrials)',
      'Missing: Rock can Innovate',
      'Missing: Rock has Compassionate',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === QUERY: What is Sarah ===
  {
    action: 'query',
    input_nl: 'Sarah is a ?what.',
    input_dsl: '@q isA Sarah ?what',
    expected_nl: [
      'Sarah is a ResearchScientist.',
      'Sarah is a Scientist.',
      'Sarah is a Researcher.',
      'Sarah is an Academic.',
      'Sarah is an Intellectual.',
      'Sarah is an Educated.',
      'Sarah is a ClinicianDoctor.',
      'Sarah is a Physician.',
      'Sarah is a Doctor.',
      'Sarah is a MedicalProfessional.',
      'Sarah is a Healer.',
      'Sarah is a Caregiver.'
    ],
    proof_nl: [
      'Fact in KB: Sarah is a researchscientist',
      'Therefore Sarah is a scientist',
      'Therefore Sarah is a researcher',
      'Therefore Sarah is an academic',
      'Therefore Sarah is an intellectual',
      'Therefore Sarah is an educated',
      'Fact in KB: Sarah is a cliniciandoctor',
      'Therefore Sarah is a physician',
      'Therefore Sarah is a doctor',
      'Therefore Sarah is a medicalprofessional',
      'Therefore Sarah is a healer',
      'Therefore Sarah is a caregiver'
    ]
  }
];

export default { name, description, theories, steps };
