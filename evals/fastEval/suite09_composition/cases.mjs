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
    expected_nl: 'True: GoldenRetriever is an entity.',
    proof_nl: 'GoldenRetriever isA Retriever. Retriever isA Sporting. Sporting isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity.'
  },

  // === PROVE: 9-level property inheritance (Exists from Entity) ===
  {
    action: 'prove',
    input_nl: 'Does GoldenRetriever exist? (9-level inheritance from Entity)',
    input_dsl: '@goal hasProperty GoldenRetriever Exists',
    expected_nl: 'True: GoldenRetriever has Exists.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing is an entity. Entity has Exists. GoldenRetriever has Exists. Transitive chain verified (10 hops). Therefore GoldenRetriever has Exists.'
  },

  // === PROVE: 8-level property inheritance (Metabolizes from LivingThing) ===
  {
    action: 'prove',
    input_nl: 'Does GoldenRetriever metabolize? (8-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever Metabolizes',
    expected_nl: 'True: GoldenRetriever has Metabolizes.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing has Metabolizes. GoldenRetriever has Metabolizes. Transitive chain verified (9 hops). Therefore GoldenRetriever has Metabolizes.'
  },

  // === PROVE: 7-level property inheritance (Sentient from Animal) ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever sentient? (7-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever Sentient',
    expected_nl: 'True: GoldenRetriever has Sentient.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal has Sentient. GoldenRetriever has Sentient. Transitive chain verified (8 hops). Therefore GoldenRetriever has Sentient.'
  },

  // === PROVE: 5-level property inheritance (WarmBlooded from Mammal) ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever warm-blooded? (5-level inheritance)',
    input_dsl: '@goal hasProperty GoldenRetriever WarmBlooded',
    expected_nl: 'True: GoldenRetriever has WarmBlooded.',
    proof_nl: 'GoldenRetriever is a retriever. Retriever is a sporting. Sporting is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal has WarmBlooded. GoldenRetriever has WarmBlooded. Transitive chain verified (6 hops). Therefore GoldenRetriever has WarmBlooded.'
  },

  // === PROVE: Chained rule (can Grow via Metabolizes + WarmBlooded) ===
  {
    action: 'prove',
    input_nl: 'Can GoldenRetriever grow? (chained rule: inheritance + And rule)',
    input_dsl: '@goal can GoldenRetriever Grow',
    expected_nl: 'True: GoldenRetriever can Grow.',
    proof_nl: 'Applied rule: Implies @metGrowAnd @metGrowConc. Applied rule: rule implies hasProperty GoldenRetriever Metabolizes. Applied rule: rule implies hasProperty Retriever Metabolizes. Applied rule: rule implies hasProperty Sporting Metabolizes. Applied rule: rule implies hasProperty Dog Metabolizes. Applied rule: rule implies hasProperty Canine Metabolizes. Applied rule: rule implies hasProperty Carnivore Metabolizes. Applied rule: rule implies hasProperty Mammal Metabolizes. Applied rule: rule implies hasProperty Vertebrate Metabolizes. Applied rule: rule implies hasProperty Animal Metabolizes. Animal is a livingthing. LivingThing has Metabolizes. And condition satisfied: isA Animal LivingThing, hasProperty LivingThing Metabolizes. Vertebrate is an animal. Animal has Metabolizes. And condition satisfied: isA Vertebrate Animal, hasProperty Animal Metabolizes. Mammal is a vertebrate. Vertebrate has Metabolizes. And condition satisfied: isA Mammal Vertebrate, hasProperty Vertebrate Metabolizes. Carnivore is a mammal. Mammal has Metabolizes. And condition satisfied: isA Carnivore Mammal, hasProperty Mammal Metabolizes. Canine is a carnivore. Carnivore has Metabolizes. And condition satisfied: isA Canine Carnivore, hasProperty Carnivore Metabolizes. Dog is a canine. Canine has Metabolizes. And condition satisfied: isA Dog Canine, hasProperty Canine Metabolizes. Sporting is a dog. Dog has Metabolizes. And condition satisfied: isA Sporting Dog, hasProperty Dog Metabolizes. Retriever is a sporting. Sporting has Metabolizes. And condition satisfied: isA Retriever Sporting, hasProperty Sporting Metabolizes. GoldenRetriever is a retriever. Retriever has Metabolizes. And condition satisfied: isA GoldenRetriever Retriever, hasProperty Retriever Metabolizes. Applied rule: rule implies hasProperty GoldenRetriever WarmBlooded. Applied rule: rule implies hasProperty Retriever WarmBlooded. Applied rule: rule implies hasProperty Sporting WarmBlooded. Applied rule: rule implies hasProperty Dog WarmBlooded. Applied rule: rule implies hasProperty Canine WarmBlooded. Applied rule: rule implies hasProperty Carnivore WarmBlooded. Mammal has WarmBlooded. And condition satisfied: isA Carnivore Mammal, hasProperty Mammal WarmBlooded. Carnivore has WarmBlooded. And condition satisfied: isA Canine Carnivore, hasProperty Carnivore WarmBlooded. Canine has WarmBlooded. And condition satisfied: isA Dog Canine, hasProperty Canine WarmBlooded. Dog has WarmBlooded. And condition satisfied: isA Sporting Dog, hasProperty Dog WarmBlooded. Sporting has WarmBlooded. And condition satisfied: isA Retriever Sporting, hasProperty Sporting WarmBlooded. Retriever has WarmBlooded. And condition satisfied: isA GoldenRetriever Retriever, hasProperty Retriever WarmBlooded. GoldenRetriever has Metabolizes. GoldenRetriever has WarmBlooded. And condition satisfied: hasProperty GoldenRetriever Metabolizes, hasProperty GoldenRetriever WarmBlooded. Therefore GoldenRetriever can Grow.'
  },

  // === PROVE: Deep chained rule (Intelligent via Sentient + can Grow) ===
  {
    action: 'prove',
    input_nl: 'Is GoldenRetriever intelligent? (deep chained rules)',
    input_dsl: '@goal hasProperty GoldenRetriever Intelligent',
    expected_nl: 'True: GoldenRetriever has Intelligent.',
    proof_nl: 'Applied rule: Implies @inhAnd @inhConc. Applied rule: rule implies hasProperty Retriever Intelligent. Applied rule: rule implies hasProperty Sporting Intelligent. Applied rule: rule implies hasProperty Dog Intelligent. Applied rule: rule implies hasProperty Canine Intelligent. Applied rule: rule implies hasProperty Carnivore Intelligent. Applied rule: rule implies hasProperty Mammal Intelligent. Applied rule: rule implies hasProperty Mammal Sentient. Applied rule: rule implies hasProperty Vertebrate Sentient. Vertebrate is an animal. Animal has Sentient. And condition satisfied: isA Vertebrate Animal, hasProperty Animal Sentient. Mammal is a vertebrate. Vertebrate has Sentient. And condition satisfied: isA Mammal Vertebrate, hasProperty Vertebrate Sentient. Applied rule: rule implies can Mammal Grow. Applied rule: rule implies hasProperty Mammal Metabolizes. Applied rule: rule implies hasProperty Vertebrate Metabolizes. Applied rule: rule implies hasProperty Animal Metabolizes. Animal is a livingthing. LivingThing has Metabolizes. And condition satisfied: isA Animal LivingThing, hasProperty LivingThing Metabolizes. Animal has Metabolizes. And condition satisfied: isA Vertebrate Animal, hasProperty Animal Metabolizes. Vertebrate has Metabolizes. And condition satisfied: isA Mammal Vertebrate, hasProperty Vertebrate Metabolizes. Mammal has Metabolizes. Mammal has WarmBlooded. And condition satisfied: hasProperty Mammal Metabolizes, hasProperty Mammal WarmBlooded. Mammal has Sentient. Mammal can Grow. And condition satisfied: hasProperty Mammal Sentient, can Mammal Grow. Carnivore is a mammal. Mammal has Intelligent. And condition satisfied: isA Carnivore Mammal, hasProperty Mammal Intelligent. Canine is a carnivore. Carnivore has Intelligent. And condition satisfied: isA Canine Carnivore, hasProperty Carnivore Intelligent. Dog is a canine. Canine has Intelligent. And condition satisfied: isA Dog Canine, hasProperty Canine Intelligent. Sporting is a dog. Dog has Intelligent. And condition satisfied: isA Sporting Dog, hasProperty Dog Intelligent. Retriever is a sporting. Sporting has Intelligent. And condition satisfied: isA Retriever Sporting, hasProperty Sporting Intelligent. GoldenRetriever is a retriever. Retriever has Intelligent. And condition satisfied: isA GoldenRetriever Retriever, hasProperty Retriever Intelligent. Therefore GoldenRetriever has Intelligent.'
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
    expected_nl: 'Learned 27 facts'
  },

  // === PROVE: 5-step isA via Scientist role (Sarah->Educated) ===
  {
    action: 'prove',
    input_nl: 'Is Sarah educated? (5-step via Scientist hierarchy)',
    input_dsl: '@goal isA Sarah Educated',
    expected_nl: 'True: Sarah is educated.',
    proof_nl: 'Sarah isA ResearchScientist. ResearchScientist isA Scientist. Scientist isA Researcher. Researcher isA Academic. Academic isA Intellectual. Intellectual isA Educated.'
  },

  // === PROVE: 5-step isA via Doctor role (Sarah->Caregiver) ===
  {
    action: 'prove',
    input_nl: 'Is Sarah a Caregiver? (5-step via Doctor hierarchy)',
    input_dsl: '@goal isA Sarah Caregiver',
    expected_nl: 'True: Sarah is a caregiver.',
    proof_nl: 'Sarah isA ClinicianDoctor. ClinicianDoctor isA Physician. Physician isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Healer. Healer isA Caregiver.'
  },

  // === PROVE: Combined role capability (can Innovate via both hierarchies) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah innovate? (combined role properties)',
    input_dsl: '@goal can Sarah Innovate',
    expected_nl: 'True: Sarah can Innovate.',
    proof_nl: 'Applied rule: Implies @researchAnd @researchConc. Applied rule: rule implies hasProperty Sarah Analytical. Applied rule: rule implies hasProperty ResearchScientist Analytical. Applied rule: rule implies hasProperty Scientist Analytical. Applied rule: rule implies hasProperty Researcher Analytical. Applied rule: rule implies hasProperty Academic Analytical. Applied rule: rule implies hasProperty Intellectual Analytical. Intellectual is an educated. Educated has Analytical. And condition satisfied: isA Intellectual Educated, hasProperty Educated Analytical. Academic is an intellectual. Intellectual has Analytical. And condition satisfied: isA Academic Intellectual, hasProperty Intellectual Analytical. Researcher is an academic. Academic has Analytical. And condition satisfied: isA Researcher Academic, hasProperty Academic Analytical. Scientist is a researcher. Researcher has Analytical. And condition satisfied: isA Scientist Researcher, hasProperty Researcher Analytical. ResearchScientist is a scientist. Scientist has Analytical. And condition satisfied: isA ResearchScientist Scientist, hasProperty Scientist Analytical. Sarah is a researchscientist. ResearchScientist has Analytical. And condition satisfied: isA Sarah ResearchScientist, hasProperty ResearchScientist Analytical. Applied rule: rule implies hasProperty Sarah Methodical. Applied rule: rule implies hasProperty ResearchScientist Methodical. Applied rule: rule implies hasProperty Scientist Methodical. Researcher has Methodical. And condition satisfied: isA Scientist Researcher, hasProperty Researcher Methodical. Scientist has Methodical. And condition satisfied: isA ResearchScientist Scientist, hasProperty Scientist Methodical. ResearchScientist has Methodical. And condition satisfied: isA Sarah ResearchScientist, hasProperty ResearchScientist Methodical. Sarah has Analytical. Sarah has Methodical. And condition satisfied: hasProperty Sarah Analytical, hasProperty Sarah Methodical. Therefore Sarah can Innovate.'
  },

  // === PROVE: Deep chained multi-role (can ClinicalTrials) ===
  {
    action: 'prove',
    input_nl: 'Can Sarah do clinical trials? (chained multi-role)',
    input_dsl: '@goal can Sarah ClinicalTrials',
    expected_nl: 'True: Sarah can ClinicalTrials.',
    proof_nl: 'Applied rule: Implies @clinAnd @clinConc. Applied rule: rule implies can Sarah Innovate. Applied rule: rule implies hasProperty Sarah Analytical. Applied rule: rule implies hasProperty ResearchScientist Analytical. Applied rule: rule implies hasProperty Scientist Analytical. Applied rule: rule implies hasProperty Researcher Analytical. Applied rule: rule implies hasProperty Academic Analytical. Applied rule: rule implies hasProperty Intellectual Analytical. Intellectual is an educated. Educated has Analytical. And condition satisfied: isA Intellectual Educated, hasProperty Educated Analytical. Academic is an intellectual. Intellectual has Analytical. And condition satisfied: isA Academic Intellectual, hasProperty Intellectual Analytical. Researcher is an academic. Academic has Analytical. And condition satisfied: isA Researcher Academic, hasProperty Academic Analytical. Scientist is a researcher. Researcher has Analytical. And condition satisfied: isA Scientist Researcher, hasProperty Researcher Analytical. ResearchScientist is a scientist. Scientist has Analytical. And condition satisfied: isA ResearchScientist Scientist, hasProperty Scientist Analytical. Sarah is a researchscientist. ResearchScientist has Analytical. And condition satisfied: isA Sarah ResearchScientist, hasProperty ResearchScientist Analytical. Applied rule: rule implies hasProperty Sarah Methodical. Applied rule: rule implies hasProperty ResearchScientist Methodical. Applied rule: rule implies hasProperty Scientist Methodical. Researcher has Methodical. And condition satisfied: isA Scientist Researcher, hasProperty Researcher Methodical. Scientist has Methodical. And condition satisfied: isA ResearchScientist Scientist, hasProperty Scientist Methodical. ResearchScientist has Methodical. And condition satisfied: isA Sarah ResearchScientist, hasProperty ResearchScientist Methodical. Sarah has Analytical. Sarah has Methodical. And condition satisfied: hasProperty Sarah Analytical, hasProperty Sarah Methodical. Applied rule: rule implies hasProperty Sarah Compassionate. Applied rule: rule implies hasProperty ClinicianDoctor Compassionate. Applied rule: rule implies hasProperty Physician Compassionate. Applied rule: rule implies hasProperty Doctor Compassionate. Applied rule: rule implies hasProperty MedicalProfessional Compassionate. MedicalProfessional is a healer. Healer has Compassionate. And condition satisfied: isA MedicalProfessional Healer, hasProperty Healer Compassionate. Doctor is a medicalprofessional. MedicalProfessional has Compassionate. And condition satisfied: isA Doctor MedicalProfessional, hasProperty MedicalProfessional Compassionate. Physician is a doctor. Doctor has Compassionate. And condition satisfied: isA Physician Doctor, hasProperty Doctor Compassionate. ClinicianDoctor is a physician. Physician has Compassionate. And condition satisfied: isA ClinicianDoctor Physician, hasProperty Physician Compassionate. Sarah is a cliniciandoctor. ClinicianDoctor has Compassionate. And condition satisfied: isA Sarah ClinicianDoctor, hasProperty ClinicianDoctor Compassionate. Sarah can Innovate. Sarah has Compassionate. And condition satisfied: can Sarah Innovate, hasProperty Sarah Compassionate. Therefore Sarah can ClinicalTrials.'
  },

  // === NEGATIVE: Rock cannot do clinical trials with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Rock do clinical trials? (not in KB)',
    input_dsl: '@goal can Rock ClinicalTrials',
    expected_nl: 'Cannot prove: Rock can ClinicalTrials.',
    proof_nl: 'Search: Searched isA Rock ?type in KB. Not found. Entity unknown. No applicable inheritance paths.'
  },

  // === QUERY: What is Sarah ===
  {
    action: 'query',
    input_nl: 'What is Sarah?',
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
      'isA Sarah ResearchScientist',
      'isA Sarah ResearchScientist. isA ResearchScientist Scientist',
      'isA Sarah ResearchScientist. isA ResearchScientist Scientist. isA Scientist Researcher',
      'isA Sarah ResearchScientist. isA ResearchScientist Scientist. isA Scientist Researcher. isA Researcher Academic',
      'isA Sarah ResearchScientist. isA ResearchScientist Scientist. isA Scientist Researcher. isA Researcher Academic. isA Academic Intellectual',
      'isA Sarah ResearchScientist. isA ResearchScientist Scientist. isA Scientist Researcher. isA Researcher Academic. isA Academic Intellectual. isA Intellectual Educated',
      'isA Sarah ClinicianDoctor',
      'isA Sarah ClinicianDoctor. isA ClinicianDoctor Physician',
      'isA Sarah ClinicianDoctor. isA ClinicianDoctor Physician. isA Physician Doctor',
      'isA Sarah ClinicianDoctor. isA ClinicianDoctor Physician. isA Physician Doctor. isA Doctor MedicalProfessional',
      'isA Sarah ClinicianDoctor. isA ClinicianDoctor Physician. isA Physician Doctor. isA Doctor MedicalProfessional. isA MedicalProfessional Healer',
      'isA Sarah ClinicianDoctor. isA ClinicianDoctor Physician. isA Physician Doctor. isA Doctor MedicalProfessional. isA MedicalProfessional Healer. isA Healer Caregiver'
    ]
  }
];

export default { name, description, theories, steps };
