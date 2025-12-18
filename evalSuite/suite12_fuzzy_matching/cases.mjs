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
    input_nl: 'Deep animal taxonomy with synonyms: Rex->GermanShepherd->Shepherd->WorkingDog->Dog->Canine->Carnivore->Mammal->Vertebrate->Animal',
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
    input_nl: 'Is Rex an Animal? (9-step deep chain)',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal.'
  },

  // === PROVE: 10-step isA chain (Rex->LivingThing) ===
  {
    action: 'prove',
    input_nl: 'Is Rex a LivingThing? (10-step deep chain)',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === PROVE: Synonym-based query (Rex is Canine via Dog synonym) ===
  {
    action: 'prove',
    input_nl: 'Is Rex a Canine? (uses Dog=Canine synonym)',
    input_dsl: '@goal isA Rex Canine',
    expected_nl: 'True: Rex is a Canine. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Synonym Dog=Canine verified. Therefore Rex isA Canine.'
  },

  // === PROVE: 7-step isA chain (Mittens->Mammal) ===
  {
    action: 'prove',
    input_nl: 'Is Mittens a Mammal? (7-step deep chain)',
    input_dsl: '@goal isA Mittens Mammal',
    expected_nl: 'True: Mittens is a mammal. Proof: Mittens isA PersianCat. PersianCat isA LongHair. LongHair isA DomesticCat. DomesticCat isA Cat. Cat isA Feline. Feline isA Mammal.'
  },

  // === SETUP: Deep geographic hierarchy ===
  {
    action: 'learn',
    input_nl: 'Deep geographic: Paris->IleDeFrance->France->WesternEurope->Europe->Eurasia->Earth->SolarSystem',
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
    input_nl: 'Is Paris in SolarSystem? (7-step geographic chain via HDC)',
    input_dsl: '@goal locatedIn Paris SolarSystem',
    expected_nl: 'True: Paris is in SolarSystem. Proof: Paris locatedIn IleDeFrance. IleDeFrance locatedIn France. France locatedIn WesternEurope. WesternEurope locatedIn Europe. Europe locatedIn Eurasia. Eurasia locatedIn Earth. Earth locatedIn SolarSystem.'
  },

  // === PROVE: 5-step locatedIn chain (Paris->Europe) ===
  {
    action: 'prove',
    input_nl: 'Is Paris in Europe? (5-step geographic chain)',
    input_dsl: '@goal locatedIn Paris Europe',
    expected_nl: 'True: Paris is in Europe. Proof: Paris locatedIn IleDeFrance. IleDeFrance locatedIn France. France locatedIn WesternEurope. WesternEurope locatedIn Europe. Geographic chain verified (4 hops). Therefore Paris locatedIn Europe.'
  },

  // === PROVE: 5-step locatedIn chain (Berlin->Europe) ===
  {
    action: 'prove',
    input_nl: 'Is Berlin in Europe? (5-step geographic chain)',
    input_dsl: '@goal locatedIn Berlin Europe',
    expected_nl: 'True: Berlin is in Europe. Proof: Berlin locatedIn Brandenburg. Brandenburg locatedIn Germany. Germany locatedIn CentralEurope. CentralEurope locatedIn Europe. Geographic chain verified (4 hops). Therefore Berlin locatedIn Europe.'
  },

  // === NEGATIVE: Cross-hierarchy fails with search trace ===
  {
    action: 'prove',
    input_nl: 'Is Rex in Europe? (cross-hierarchy - should fail)',
    input_dsl: '@goal locatedIn Rex Europe',
    expected_nl: 'Cannot prove: Rex is in Europe. Search: Searched locatedIn Rex ?place in KB. Not found. Searched isA Rex for geographic type. Rex isA GermanShepherd isA Shepherd isA WorkingDog isA Dog isA Canine isA Carnivore isA Mammal isA Vertebrate isA Animal. No geographic type found. Rex is an animal, not a location. Domain mismatch.'
  },

  // === QUERY: What is in Europe ===
  {
    action: 'query',
    input_nl: 'What is in Europe?',
    input_dsl: '@q locatedIn ?X Europe',
    expected_nl: 'France is in Europe. WesternEurope is in Europe. CentralEurope is in Europe.'
  },

  // === SETUP: Similarity relationships ===
  {
    action: 'learn',
    input_nl: 'Vehicles with properties for similarity comparison',
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
    input_nl: 'Is Car a Concept? (6-step hierarchy)',
    input_dsl: '@goal isA Car Concept',
    expected_nl: 'True: Car is a concept. Proof: Car isA Vehicle. Vehicle isA Transport. Transport isA Mobility. Mobility isA Service. Service isA Utility. Utility isA Concept.'
  },

  // === QUERY: What does Car have ===
  {
    action: 'query',
    input_nl: 'What does Car have?',
    input_dsl: '@q has Car ?property',
    expected_nl: 'Car has Wheels. Car has Engine. Car has Seats. Car has Steering.'
  }
];

export default { name, description, theories, steps };
