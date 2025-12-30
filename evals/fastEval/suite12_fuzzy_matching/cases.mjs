/**
 * Suite 12 - Fuzzy Matching & Anonymous Concepts (Deep Chains)
 *
 * Approximate matching with deep hierarchies for validation.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Fuzzy Matching';
export const description = 'Approximate matching with deep chains and complete proofs';

export const theories = ['05-logic.sys2'];

// Custom flag to indicate this suite tests experimental features
export const experimental = true;

export const steps = [
  // === SETUP: Deep animal hierarchy with synonyms ===
  {
    action: 'learn',
    input_nl: 'Rex is a GermanShepherd. GermanShepherd is a Shepherd. Shepherd is a WorkingDog. WorkingDog is a Dog. Dog is a Canine. Canine is a Carnivore. Carnivore is a Mammal. Mammal is a Vertebrate. Vertebrate is an Animal. Animal is a LivingThing. Dog synonym Canine. Cat synonym Feline. Mittens is a PersianCat. PersianCat is a LongHair. LongHair is a DomesticCat. DomesticCat is a Cat. Cat is a Feline. Feline is a Mammal.',
    input_dsl: `
      isA Rex GermanShepherd
      isA GermanShepherd Shepherd
      isA Shepherd WorkingDog
      isA WorkingDog Dog
      isA Dog Canine
      isA Canine Carnivore
      isA Carnivore Mammal
      isA Mammal Vertebrate
      isA Vertebrate Animal
      isA Animal LivingThing
      synonym Dog Canine
      synonym Cat Feline
      isA Mittens PersianCat
      isA PersianCat LongHair
      isA LongHair DomesticCat
      isA DomesticCat Cat
      isA Cat Feline
      isA Feline Mammal
    `,
    expected_nl: 'Learned 18 facts'
  },

  // === PROVE: 9-step isA chain (Rex->Animal) ===
  {
    action: 'prove',
    input_nl: 'Rex is an Animal.',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal.',
    proof_nl: 'Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Transitive chain verified (9 hops). Therefore Rex is an animal.'
  },

  // === PROVE: 10-step isA chain (Rex->LivingThing) ===
  {
    action: 'prove',
    input_nl: 'Rex is a LivingThing.',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing.',
    proof_nl: 'Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. Transitive chain verified (10 hops). Therefore Rex is a livingthing.'
  },

  // === PROVE: Synonym-based query (Rex is Canine via Dog synonym) ===
  {
    action: 'prove',
    input_nl: 'Rex is a Canine.',
    input_dsl: '@goal isA Rex Canine',
    expected_nl: 'True: Rex is a canine.',
    proof_nl: 'Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Transitive chain verified (5 hops). Therefore Rex is a canine.'
  },

  // === PROVE: 7-step isA chain (Mittens->Mammal) ===
  {
    action: 'prove',
    input_nl: 'Mittens is a Mammal.',
    input_dsl: '@goal isA Mittens Mammal',
    expected_nl: 'True: Mittens is a mammal.',
    proof_nl: 'Mittens is a persiancat. PersianCat is a longhair. LongHair is a domesticcat. DomesticCat is a cat. Cat is a mammal. Transitive chain verified (5 hops). Therefore Mittens is a mammal.'
  },

  // === SETUP: Deep geographic hierarchy ===
  {
    action: 'learn',
    input_nl: 'Paris is in IleDeFrance. IleDeFrance is in France. France is in WesternEurope. WesternEurope is in Europe. Europe is in Eurasia. Eurasia is in Earth. Earth is in SolarSystem. Berlin is in Brandenburg. Brandenburg is in Germany. Germany is in CentralEurope. CentralEurope is in Europe.',
    input_dsl: `
      locatedIn Paris IleDeFrance
      locatedIn IleDeFrance France
      locatedIn France WesternEurope
      locatedIn WesternEurope Europe
      locatedIn Europe Eurasia
      locatedIn Eurasia Earth
      locatedIn Earth SolarSystem
      locatedIn Berlin Brandenburg
      locatedIn Brandenburg Germany
      locatedIn Germany CentralEurope
      locatedIn CentralEurope Europe
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: 7-step locatedIn chain (Paris->SolarSystem) ===
  {
    action: 'prove',
    input_nl: 'Paris is in SolarSystem.',
    input_dsl: '@goal locatedIn Paris SolarSystem',
    expected_nl: 'True: Paris is in SolarSystem.',
    proof_nl: 'Paris is in IleDeFrance. IleDeFrance is in France. France is in WesternEurope. WesternEurope is in Europe. Europe is in Eurasia. Eurasia is in Earth. Earth is in SolarSystem. Transitive chain verified (7 hops). Therefore Paris is in SolarSystem.'
  },

  // === PROVE: 5-step locatedIn chain (Paris->Europe) ===
  {
    action: 'prove',
    input_nl: 'Paris is in Europe.',
    input_dsl: '@goal locatedIn Paris Europe',
    expected_nl: 'True: Paris is in Europe.',
    proof_nl: 'Paris is in IleDeFrance. IleDeFrance is in France. France is in WesternEurope. WesternEurope is in Europe. Transitive chain verified (4 hops). Therefore Paris is in Europe.'
  },

  // === PROVE: 5-step locatedIn chain (Berlin->Europe) ===
  {
    action: 'prove',
    input_nl: 'Berlin is in Europe.',
    input_dsl: '@goal locatedIn Berlin Europe',
    expected_nl: 'True: Berlin is in Europe.',
    proof_nl: 'Berlin is in Brandenburg. Brandenburg is in Germany. Germany is in CentralEurope. CentralEurope is in Europe. Transitive chain verified (4 hops). Therefore Berlin is in Europe.'
  },

  // === NEGATIVE: Cross-hierarchy fails with search trace ===
  {
    action: 'prove',
    input_nl: 'Rex is in Europe.',
    input_dsl: '@goal locatedIn Rex Europe',
    expected_nl: 'Cannot prove: Rex is in Europe.',
    proof_nl: [
      'No locatedIn facts for Rex exist in KB',
      'cannot be derived'
    ]
  },

  // === QUERY: What is in Europe ===
  {
    action: 'query',
    input_nl: '?X is in Europe.',
    input_dsl: '@q locatedIn ?X Europe',
    expected_nl: [
      'WesternEurope is in Europe.',
      'CentralEurope is in Europe.',
      'France is in Europe.',
      'Germany is in Europe.',
      'IleDeFrance is in Europe.',
      'Brandenburg is in Europe.',
      'Paris is in Europe.',
      'Berlin is in Europe.'
    ],
    proof_nl: [
      'Fact in KB: WesternEurope is in Europe',
      'Fact in KB: CentralEurope is in Europe',
      'Therefore France is in Europe',
      'Therefore Germany is in Europe',
      'Therefore IleDeFrance is in Europe',
      'Therefore Brandenburg is in Europe',
      'Therefore Paris is in Europe',
      'Therefore Berlin is in Europe'
    ]
  },

  // === SETUP: Similarity relationships ===
  {
    action: 'learn',
    input_nl: 'Car is a Vehicle. Vehicle is a Transport. Transport is a Mobility. Mobility is a Service. Service is an Utility. Utility is a Concept. Truck is a Vehicle. Bicycle is a Vehicle. Car has Wheels. Car has Engine. Car has Seats. Car has Steering. Truck has Wheels. Truck has Engine. Truck has Cargo. Bicycle has Wheels. Bicycle has Pedals.',
    input_dsl: `
      isA Car Vehicle
      isA Vehicle Transport
      isA Transport Mobility
      isA Mobility Service
      isA Service Utility
      isA Utility Concept
      isA Truck Vehicle
      isA Bicycle Vehicle
      has Car Wheels
      has Car Engine
      has Car Seats
      has Car Steering
      has Truck Wheels
      has Truck Engine
      has Truck Cargo
      has Bicycle Wheels
      has Bicycle Pedals
    `,
    expected_nl: 'Learned 17 facts'
  },

  // === PROVE: 6-step isA chain (Car->Concept) ===
  {
    action: 'prove',
    input_nl: 'Car is a Concept.',
    input_dsl: '@goal isA Car Concept',
    expected_nl: 'True: Car is a concept.',
    proof_nl: 'Car isA Vehicle. Vehicle isA Transport. Transport isA Mobility. Mobility isA Service. Service isA Utility. Utility isA Concept.'
  },

  // === QUERY: What does Car have ===
  {
    action: 'query',
    input_nl: 'Car has ?property.',
    input_dsl: '@q has Car ?property',
    expected_nl: [
      'Car has a steering.',
      'Car has a wheels.',
      'Car has an engine.',
      'Car has a seats.'
    ],
    proof_nl: [
      'Fact in KB: Car has a steering',
      'Fact in KB: Car has a wheels',
      'Fact in KB: Car has an engine',
      'Fact in KB: Car has a seats'
    ]
  }
];

export default { name, description, theories, steps };
