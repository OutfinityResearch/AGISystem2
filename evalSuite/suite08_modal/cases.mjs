/**
 * Suite 08 - Modal Reasoning (Deep Chains)
 *
 * Deep can/cannot/must modal reasoning with type hierarchies.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Modal Reasoning';
export const description = 'Deep modal operators with type hierarchies and complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep biological taxonomy (11 levels) with modal abilities ===
  {
    action: 'learn',
    input_nl: 'Deep biological: Socrates->Philosopher->Thinker->Intellectual->Human->Primate->Mammal->Vertebrate->Animal->Organism->LivingThing->Entity',
    input_dsl: `
      isA Socrates Philosopher
      isA Philosopher Thinker
      isA Thinker Intellectual
      isA Intellectual Human
      isA Human Primate
      isA Primate Mammal
      isA Mammal Vertebrate
      isA Vertebrate Animal
      isA Animal Organism
      isA Organism LivingThing
      isA LivingThing Entity
      @humanThink isA ?x Human
      @humanThinkC can ?x Think
      Implies $humanThink $humanThinkC
      @sentFeel isA ?x Animal
      @sentFeelC can ?x Feel
      Implies $sentFeel $sentFeelC
      @livingResp isA ?x Organism
      @livingRespC can ?x Respire
      Implies $livingResp $livingRespC
    `,
    expected_nl: 'Learned 20 facts'
  },

  // === PROVE: 7-step isA (Socrates->Animal) + modal ===
  {
    action: 'prove',
    input_nl: 'Is Socrates an Animal? (7-step chain)',
    input_dsl: '@goal isA Socrates Animal',
    expected_nl: 'True: Socrates is an animal. Proof: Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Human isA Primate. Primate isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal.'
  },

  // === PROVE: 9-step isA (Socrates->LivingThing) ===
  {
    action: 'prove',
    input_nl: 'Is Socrates a LivingThing? (9-step chain)',
    input_dsl: '@goal isA Socrates LivingThing',
    expected_nl: 'True: Socrates is a livingthing. Proof: Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Human isA Primate. Primate isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA Organism. Organism isA LivingThing.'
  },

  // === PROVE: Modal via 5-step rule (can Think via Human) ===
  {
    action: 'prove',
    input_nl: 'Can Socrates think? (modal via 5-step Human inheritance)',
    input_dsl: '@goal can Socrates Think',
    expected_nl: 'True: Socrates can Think. Proof: Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Checked rule: isA Human implies can Think. Socrates is Human (4-step chain). Applied rule. Therefore Socrates can Think.'
  },

  // === PROVE: Modal via 8-step rule (can Feel via Animal) ===
  {
    action: 'prove',
    input_nl: 'Can Socrates feel? (modal via 8-step Animal inheritance)',
    input_dsl: '@goal can Socrates Feel',
    expected_nl: 'True: Socrates can Feel. Proof: Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Human isA Primate. Primate isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Checked rule: isA Animal implies can Feel. Applied rule. Therefore Socrates can Feel.'
  },

  // === PROVE: Modal via 9-step rule (can Respire via Organism) ===
  {
    action: 'prove',
    input_nl: 'Can Socrates respire? (modal via 9-step Organism inheritance)',
    input_dsl: '@goal can Socrates Respire',
    expected_nl: 'True: Socrates can Respire. Proof: Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Human isA Primate. Primate isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA Organism. Checked rule: isA Organism implies can Respire. Applied rule. Therefore Socrates can Respire.'
  },

  // === SETUP: Deep obligation hierarchy (6 levels) ===
  {
    action: 'learn',
    input_nl: 'Deep obligation: DrJones->Surgeon->Specialist->Doctor->MedicalProfessional->Professional->Worker->Adult',
    input_dsl: `
      isA DrJones Surgeon
      isA Surgeon Specialist
      isA Specialist Doctor
      isA Doctor MedicalProfessional
      isA MedicalProfessional Professional
      isA Professional Worker
      isA Worker Adult
      isA Adult Person
      @docHelp isA ?x Doctor
      @docHelpC must ?x HelpPatients
      Implies $docHelp $docHelpC
      @profEthic isA ?x Professional
      @profEthicC must ?x FollowEthics
      Implies $profEthic $profEthicC
      @adultLaw isA ?x Adult
      @adultLawC must ?x FollowLaw
      Implies $adultLaw $adultLawC
    `,
    expected_nl: 'Learned 17 facts'
  },

  // === PROVE: 6-step isA (DrJones->Adult) ===
  {
    action: 'prove',
    input_nl: 'Is DrJones an Adult? (6-step chain)',
    input_dsl: '@goal isA DrJones Adult',
    expected_nl: 'True: DrJones is an adult. Proof: DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Professional. Professional isA Worker. Worker isA Adult.'
  },

  // === PROVE: Obligation via 4-step rule (must HelpPatients via Doctor) ===
  {
    action: 'prove',
    input_nl: 'Must DrJones help patients? (obligation via 4-step Doctor inheritance)',
    input_dsl: '@goal must DrJones HelpPatients',
    expected_nl: 'True: DrJones must HelpPatients. Proof: DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Checked rule: isA Doctor implies must HelpPatients. DrJones is Doctor (3-step chain). Applied rule. Therefore DrJones must HelpPatients.'
  },

  // === PROVE: Obligation via 5-step rule (must FollowEthics via Professional) ===
  {
    action: 'prove',
    input_nl: 'Must DrJones follow ethics? (obligation via 5-step Professional inheritance)',
    input_dsl: '@goal must DrJones FollowEthics',
    expected_nl: 'True: DrJones must FollowEthics. Proof: DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Professional. Checked rule: isA Professional implies must FollowEthics. Applied rule. Therefore DrJones must FollowEthics.'
  },

  // === PROVE: Obligation via 7-step rule (must FollowLaw via Adult) ===
  {
    action: 'prove',
    input_nl: 'Must DrJones follow law? (obligation via 7-step Adult inheritance)',
    input_dsl: '@goal must DrJones FollowLaw',
    expected_nl: 'True: DrJones must FollowLaw. Proof: DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Professional. Professional isA Worker. Worker isA Adult. Checked rule: isA Adult implies must FollowLaw. Applied rule. Therefore DrJones must FollowLaw.'
  },

  // === SETUP: Explicit negation blocking modal in deep hierarchy ===
  {
    action: 'learn',
    input_nl: 'Bird taxonomy with flight exceptions. Opus is a penguin that cannot fly.',
    input_dsl: `
      isA Opus Penguin
      isA Penguin Flightless
      isA Flightless Antarctic
      isA Antarctic Seabird
      isA Seabird Bird
      isA Bird FlyingAnimal
      isA FlyingAnimal Vertebrate
      @birdFly isA ?x Bird
      @birdFlyC can ?x Fly
      Implies $birdFly $birdFlyC
      @negOpusFly can Opus Fly
      Not $negOpusFly
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PROVE: 6-step isA (Opus->Vertebrate) ===
  {
    action: 'prove',
    input_nl: 'Is Opus a Vertebrate? (6-step chain)',
    input_dsl: '@goal isA Opus Vertebrate',
    expected_nl: 'True: Opus is a vertebrate. Proof: Opus isA Penguin. Penguin isA Flightless. Flightless isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird isA FlyingAnimal. FlyingAnimal isA Vertebrate.'
  },

  // === NEGATIVE: Negation blocks modal rule with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (negation blocks despite 5-step Bird inheritance)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly. Search: Opus isA Penguin. Penguin isA Flightless. Flightless isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Rule: isA Bird implies can Fly would apply. Found explicit negation: Not(can Opus Fly). Negation blocks inference.'
  },

  // === NEGATIVE: Non-entity has no obligations ===
  {
    action: 'prove',
    input_nl: 'Must Rock follow law? (Rock not in KB)',
    input_dsl: '@goal must Rock FollowLaw',
    expected_nl: 'Cannot prove: Rock must FollowLaw. Search: Searched isA Rock ?type in KB. Not found. Searched must Rock FollowLaw direct. Not found. Checked rule: isA Adult implies must FollowLaw. Rock has no type assertions. Entity unknown. No applicable rules.'
  },

  // === NEGATIVE: Cross-category modal fails ===
  {
    action: 'prove',
    input_nl: 'Can DrJones fly? (Human cannot fly without explicit fact)',
    input_dsl: '@goal can DrJones Fly',
    expected_nl: 'Cannot prove: DrJones can Fly. Search: DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Professional. Professional isA Worker. Worker isA Adult. Adult isA Person. No path to Bird found. Checked rule: isA Bird implies can Fly. DrJones is not a Bird. Rule not applicable.'
  },

  // === QUERY: Who can think ===
  {
    action: 'query',
    input_nl: 'Who can think?',
    input_dsl: '@q can ?x Think',
    expected_nl: 'Socrates can Think.'
  }
];

export default { name, description, theories, steps };
