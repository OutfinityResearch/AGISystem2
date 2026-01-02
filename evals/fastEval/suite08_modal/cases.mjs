/**
 * Suite 08 - Modal Reasoning (Deep Chains)
 *
 * Deep can/cannot/must modal reasoning with type hierarchies.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Modal Reasoning';
export const description = 'Deep modal operators with type hierarchies and complete proofs';

export const theories = [];

export const steps = [
  // === SETUP: Deep biological taxonomy (11 levels) with modal abilities ===
  {
    action: 'learn',
    input_nl: 'Socrates is a Philosopher. Philosopher is a Thinker. Thinker is an Intellectual. Intellectual is a Human. Human is a Primate. Primate is a Mammal. Mammal is a Vertebrate. Vertebrate is an Animal. Animal is an Organism. Organism is a LivingThing. LivingThing is an Entity. IF (?x is a Human) THEN (?x can Think). IF (?x is an Animal) THEN (?x can Feel). IF (?x is an Organism) THEN (?x can Respire).',
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
    input_nl: 'Socrates is an Animal.',
    input_dsl: '@goal isA Socrates Animal',
    expected_nl: 'True: Socrates is an animal.',
    proof_nl: 'Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Human isA Primate. Primate isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal.'
  },

  // === PROVE: 9-step isA (Socrates->LivingThing) ===
  {
    action: 'prove',
    input_nl: 'Socrates is a LivingThing.',
    input_dsl: '@goal isA Socrates LivingThing',
    expected_nl: 'True: Socrates is a livingthing.',
    proof_nl: 'Socrates isA Philosopher. Philosopher isA Thinker. Thinker isA Intellectual. Intellectual isA Human. Human isA Primate. Primate isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA Organism. Organism isA LivingThing.'
  },

  // === PROVE: Modal via 5-step rule (can Think via Human) ===
  {
    action: 'prove',
    input_nl: 'Socrates can Think.',
    input_dsl: '@goal can Socrates Think',
    expected_nl: 'True: Socrates can Think.',
    proof_nl: [
      'Socrates is a philosopher',
      'Socrates is a human',
      'Applied rule: IF (Socrates is a human) THEN (Socrates can Think)',
      'Therefore Socrates can Think'
    ]
  },

  // === PROVE: Modal via 8-step rule (can Feel via Animal) ===
  {
    action: 'prove',
    input_nl: 'Socrates can Feel.',
    input_dsl: '@goal can Socrates Feel',
    expected_nl: 'True: Socrates can Feel.',
    proof_nl: [
      'Socrates is a philosopher',
      'Socrates is an animal',
      'Applied rule: IF (Socrates is an animal) THEN (Socrates can Feel)',
      'Therefore Socrates can Feel'
    ]
  },

  // === PROVE: Modal via 9-step rule (can Respire via Organism) ===
  {
    action: 'prove',
    input_nl: 'Socrates can Respire.',
    input_dsl: '@goal can Socrates Respire',
    expected_nl: 'True: Socrates can Respire.',
    proof_nl: [
      'Socrates is a philosopher',
      'Socrates is an organism',
      'Applied rule: IF (Socrates is an organism) THEN (Socrates can Respire)',
      'Therefore Socrates can Respire'
    ]
  },

  // === SETUP: Deep obligation hierarchy (6 levels) ===
  {
    action: 'learn',
    input_nl: 'DrJones is a Surgeon. Surgeon is a Specialist. Specialist is a Doctor. Doctor is a MedicalProfessional. MedicalProfessional is a Professional. Professional is a Worker. Worker is an Adult. Adult is a Person. IF (?x is a Doctor) THEN (?x must HelpPatients). IF (?x is a Professional) THEN (?x must FollowEthics). IF (?x is an Adult) THEN (?x must FollowLaw).',
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
    input_nl: 'DrJones is an Adult.',
    input_dsl: '@goal isA DrJones Adult',
    expected_nl: 'True: DrJones is an adult.',
    proof_nl: 'DrJones isA Surgeon. Surgeon isA Specialist. Specialist isA Doctor. Doctor isA MedicalProfessional. MedicalProfessional isA Professional. Professional isA Worker. Worker isA Adult.'
  },

  // === PROVE: Obligation via 4-step rule (must HelpPatients via Doctor) ===
  {
    action: 'prove',
    input_nl: 'DrJones must HelpPatients.',
    input_dsl: '@goal must DrJones HelpPatients',
    expected_nl: 'True: DrJones must HelpPatients.',
    proof_nl: [
      'DrJones is a surgeon',
      'DrJones is a doctor',
      'Applied rule: IF (DrJones is a doctor) THEN (DrJones must HelpPatients)',
      'Therefore DrJones must HelpPatients'
    ]
  },

  // === PROVE: Obligation via 5-step rule (must FollowEthics via Professional) ===
  {
    action: 'prove',
    input_nl: 'DrJones must FollowEthics.',
    input_dsl: '@goal must DrJones FollowEthics',
    expected_nl: 'True: DrJones must FollowEthics.',
    proof_nl: [
      'DrJones is a surgeon',
      'DrJones is a professional',
      'Applied rule: IF (DrJones is a professional) THEN (DrJones must FollowEthics)',
      'Therefore DrJones must FollowEthics'
    ]
  },

  // === PROVE: Obligation via 7-step rule (must FollowLaw via Adult) ===
  {
    action: 'prove',
    input_nl: 'DrJones must FollowLaw.',
    input_dsl: '@goal must DrJones FollowLaw',
    expected_nl: 'True: DrJones must FollowLaw.',
    proof_nl: [
      'DrJones is a surgeon',
      'DrJones is an adult',
      'Applied rule: IF (DrJones is an adult) THEN (DrJones must FollowLaw)',
      'Therefore DrJones must FollowLaw'
    ]
  },

  // === SETUP: Explicit negation blocking modal in deep hierarchy ===
  {
    action: 'learn',
    input_nl: 'Opus is a Penguin. Penguin is a Flightless. Flightless is an Antarctic. Antarctic is a Seabird. Seabird is a Bird. Bird is a FlyingAnimal. FlyingAnimal is a Vertebrate. IF (?x is a Bird) THEN (?x can Fly). Opus cannot Fly.',
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
    input_nl: 'Opus is a Vertebrate.',
    input_dsl: '@goal isA Opus Vertebrate',
    expected_nl: 'True: Opus is a vertebrate.',
    proof_nl: 'Opus isA Penguin. Penguin isA Flightless. Flightless isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird isA FlyingAnimal. FlyingAnimal isA Vertebrate.'
  },

  // === NEGATIVE: Negation blocks modal rule with search trace ===
  {
    action: 'prove',
    input_nl: 'Opus can Fly.',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly.',
    proof_nl: [
      'Found explicit negation: NOT (Opus can Fly)',
      'Negation blocks inference'
    ]
  },

  // === NEGATIVE: Non-entity has no obligations ===
  {
    action: 'prove',
    input_nl: 'Rock must FollowLaw.',
    input_dsl: '@goal must Rock FollowLaw',
    expected_nl: 'Cannot prove: Rock must FollowLaw.',
    proof_nl: [
      'Checked rule: IF (Rock is an adult) THEN (Rock must FollowLaw)',
      'Missing: Rock is an adult',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === NEGATIVE: Cross-category modal fails ===
  {
    action: 'prove',
    input_nl: 'DrJones can Fly.',
    input_dsl: '@goal can DrJones Fly',
    expected_nl: 'Cannot prove: DrJones can Fly.',
    proof_nl: [
      'Checked rule: IF (DrJones is a bird) THEN (DrJones can Fly)',
      'Missing: DrJones is a bird',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === QUERY: Who can think ===
  {
    action: 'query',
    input_nl: '?x can Think.',
    input_dsl: '@q can ?x Think',
    expected_nl: [
      'Socrates can Think.'
    ],
    proof_nl: [
      'Applied rule: IF (Socrates is a human) THEN (Socrates can Think)'
    ]
  }
];

export default { name, description, theories, steps };
