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
    input_nl: 'Deep taxonomy: GoldenRetriever->Retriever->Sporting->Dog->Canine->Carnivore->Mammal->Vertebrate->Animal->LivingThing->Entity',
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
    input_nl: 'Is GoldenRetriever an Entity? (9-step chain)',
    input_dsl: '@goal isA GoldenRetriever Entity',
    expected_nl: 'True: GoldenRetriever is an entity. Proof: GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity.'
  },

  // === PROVE: 9-level property inheritance (Exists from Entity) ===
  {
    action: 'prove',
    input_nl: 'Does GoldenRetriever exist? (9-level inheritance from Entity)',
    input_dsl: '@goal hasProperty GoldenRetriever Exists',
    expected_nl: 'True: GoldenRetriever has Exists. Proof: GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity. Entity hasProperty Exists. Applied inheritance rule. Therefore GoldenRetriever hasProperty Exists.'
  },

  // === PROVE: 8-level property inheritance (Metabolizes from LivingThing) ===
  {
    action: 'prove',
    input_nl: 'Does GoldenRetriever metabolize? (8-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever Metabolizes',
    expected_nl: 'True: GoldenRetriever has Metabolizes. Proof: GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing hasProperty Metabolizes. Applied inheritance rule. Therefore GoldenRetriever hasProperty Metabolizes.'
  },

  // === PROVE: 7-level property inheritance (Sentient from Animal) ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever sentient? (7-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever Sentient',
    expected_nl: 'True: GoldenRetriever has Sentient. Proof: GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal hasProperty Sentient. Applied inheritance rule. Therefore GoldenRetriever hasProperty Sentient.'
  },

  // === PROVE: 5-level property inheritance (WarmBlooded from Mammal) ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever warm-blooded? (5-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever WarmBlooded',
    expected_nl: 'True: GoldenRetriever has WarmBlooded. Proof: GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal hasProperty WarmBlooded. Applied inheritance rule. Therefore GoldenRetriever hasProperty WarmBlooded.'
  },

  // === PROVE: Chained rule (can Grow via Metabolizes + WarmBlooded) ===
  {
    action: 'prove',
    input_nl: 'Can GoldenRetriever grow? (chained rule: inheritance + And rule)',
    input_dsl: '@goal can GoldenRetriever Grow',
    expected_nl: 'True: GoldenRetriever can Grow. Proof: Verified GoldenRetriever hasProperty Metabolizes (8-level inheritance from LivingThing). Verified GoldenRetriever hasProperty WarmBlooded (5-level inheritance from Mammal). And(Metabolizes, WarmBlooded) satisfied. Applied rule: (Metabolizes AND WarmBlooded) implies can Grow. Therefore GoldenRetriever can Grow.'
  },

  // === PROVE: Deep chained rule (Intelligent via Sentient + can Grow) ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever intelligent? (deep chained rules)',
    input_dsl: '@goal hasProperty GoldenRetriever Intelligent',
    expected_nl: 'True: GoldenRetriever has Intelligent. Proof: Verified GoldenRetriever hasProperty Sentient (7-level inheritance from Animal). Verified GoldenRetriever can Grow (chained rule via Metabolizes+WarmBlooded). And(Sentient, can Grow) satisfied. Applied rule: (Sentient AND can Grow) implies hasProperty Intelligent. Therefore GoldenRetriever hasProperty Intelligent.'
  },

  // === SETUP: Deep multi-role composition ===
  {
    action: 'learn',
    input_nl: 'Sarah is ResearchScientist AND ClinicianDoctor. Deep hierarchies for both roles.',
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
    expected_nl: 'Learned 26 facts'
  },

  // === PROVE: 5-step isA via Scientist role (Sarah->Educated) ===
  {
    action: 'prove',
    input_nl: 'Is Sarah educated? (5-step via Scientist hierarchy)',
    input_dsl: '@goal isA Sarah Educated',
    expected_nl: 'True: Sarah is educated. Proof: Sarah isA ResearchScientist. ResearchScientist isA Scientist. Scientist isA Researcher. Researcher isA Academic. Academic isA Intellectual. Intellectual isA Educated.'
  },

  // === PROVE: 5-step isA via Doctor role (Sarah->Caregiver) ===
  {
    action: 'prove',
    input_nl: 'Is Sarah a Caregiver? (5-step via Doctor hierarchy)',
    input_dsl: '@goal isA Sarah Caregiver',
    expected_nl: 'True: Sarah is a caregiver. Proof: Sarah isA ClinicianDoctor. ClinicianDoctor isA Physician. Physician isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Healer. Healer isA Caregiver.'
  },

  // === PROVE: Combined role capability (can Innovate via both hierarchies) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah innovate? (combined role properties)',
    input_dsl: '@goal can Sarah Innovate',
    expected_nl: 'True: Sarah can Innovate. Proof: Sarah isA ResearchScientist isA Scientist isA Researcher isA Academic isA Intellectual isA Educated. Educated hasProperty Analytical. Sarah hasProperty Analytical (5-level inheritance). Sarah isA ResearchScientist isA Scientist isA Researcher. Researcher hasProperty Methodical. Sarah hasProperty Methodical (3-level inheritance). And(Analytical, Methodical) satisfied. Applied rule. Therefore Sarah can Innovate.'
  },

  // === PROVE: Deep chained multi-role (can ClinicalTrials) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah do clinical trials? (chained multi-role)',
    input_dsl: '@goal can Sarah ClinicalTrials',
    expected_nl: 'True: Sarah can ClinicalTrials. Proof: Verified Sarah can Innovate (via Analytical+Methodical rule). Sarah isA ClinicianDoctor isA Physician isA Doctor isA MedicalProfessional isA Healer. Healer hasProperty Compassionate. Sarah hasProperty Compassionate (5-level inheritance). And(can Innovate, Compassionate) satisfied. Applied rule: (Innovate AND Compassionate) implies can ClinicalTrials. Therefore Sarah can ClinicalTrials.'
  },

  // === NEGATIVE: Rock cannot do clinical trials with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Rock do clinical trials? (not in KB)',
    input_dsl: '@goal can Rock ClinicalTrials',
    expected_nl: 'Cannot prove: Rock can ClinicalTrials. Search: Searched isA Rock ?type in KB. Not found. Searched can Rock Innovate. Not found. Searched hasProperty Rock Analytical. Not found. Searched hasProperty Rock Methodical. Not found. Checked rule: (Analytical AND Methodical) implies can Innovate. Rock has no type assertions. Entity unknown. No applicable rules.'
  },

  // === QUERY: What is Sarah ===
  {
    action: 'query',
    input_nl: 'What is Sarah?',
    input_dsl: '@q isA Sarah ?what',
    expected_nl: 'Sarah is a ResearchScientist. Sarah is a ClinicianDoctor.'
  }
];

export default { name, description, theories, steps };
