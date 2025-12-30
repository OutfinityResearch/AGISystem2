/**
 * Suite 02 - Type Hierarchies (Deep Chains)
 *
 * Deep isA chains (6-8 steps) with property inheritance.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Type Hierarchies';
export const description = 'Deep isA chains with property inheritance and complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy (8 levels) + properties + inheritance rule ===
  {
    action: 'learn',
    input_nl: 'Poodle is a Toy. Toy is a Dog. Dog is a Canine. Canine is a Carnivore. Carnivore is a Mammal. Mammal is a Vertebrate. Vertebrate is an Animal. Animal is a LivingThing. LivingThing is an Entity. Entity hasProperty Exists. LivingThing hasProperty Breathes. Animal hasProperty Mortal. Vertebrate hasProperty HasSpine. Mammal hasProperty WarmBlooded. Carnivore hasProperty EatsMeat. Canine hasProperty HasFangs. Dog hasProperty Loyal. IF ((?sub is a ?super) AND (?super hasProperty ?prop)) THEN (?sub hasProperty ?prop). Rock is a Mineral. Mineral is an Inorganic. Inorganic is a Matter.',
    input_dsl: `
      isA Poodle Toy
      isA Toy Dog
      isA Dog Canine
      isA Canine Carnivore
      isA Carnivore Mammal
      isA Mammal Vertebrate
      isA Vertebrate Animal
      isA Animal LivingThing
      isA LivingThing Entity
      hasProperty Entity Exists
      hasProperty LivingThing Breathes
      hasProperty Animal Mortal
      hasProperty Vertebrate HasSpine
      hasProperty Mammal WarmBlooded
      hasProperty Carnivore EatsMeat
      hasProperty Canine HasFangs
      hasProperty Dog Loyal
      @inhBase isA ?sub ?super
      @inhProp hasProperty ?super ?prop
      @inhAnd And $inhBase $inhProp
      @inhConc hasProperty ?sub ?prop
      Implies $inhAnd $inhConc
      isA Rock Mineral
      isA Mineral Inorganic
      isA Inorganic Matter
    `,
    expected_nl: 'Learned 25 facts'
  },

  // === PROVE: 8-step transitive Poodle→Entity ===
  {
    action: 'prove',
    input_nl: 'Poodle is an Entity.',
    input_dsl: '@goal isA Poodle Entity',
    expected_nl: 'True: Poodle is an entity.',
    proof_nl: 'Poodle isA Toy. Toy isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity.'
  },

  // === PROVE: 7-step transitive Poodle→LivingThing ===
  {
    action: 'prove',
    input_nl: 'Poodle is a LivingThing.',
    input_dsl: '@goal isA Poodle LivingThing',
    expected_nl: 'True: Poodle is a livingthing.',
    proof_nl: 'Poodle isA Toy. Toy isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === PROVE: Property inheritance 8-level (Poodle→Entity + Exists) ===
  {
    action: 'prove',
    input_nl: 'Poodle hasProperty Exists.',
    input_dsl: '@goal hasProperty Poodle Exists',
    expected_nl: 'True: Poodle has Exists.',
    proof_nl: 'Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing is an entity. Entity has Exists. Poodle has Exists. Transitive chain verified (9 hops). Therefore Poodle has Exists.'
  },

  // === PROVE: Property inheritance 7-level (Poodle→LivingThing + Breathes) ===
  {
    action: 'prove',
    input_nl: 'Poodle hasProperty Breathes.',
    input_dsl: '@goal hasProperty Poodle Breathes',
    expected_nl: 'True: Poodle has Breathes.',
    proof_nl: 'Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing has Breathes. Poodle has Breathes. Transitive chain verified (8 hops). Therefore Poodle has Breathes.'
  },

  // === PROVE: Property inheritance 6-level (Poodle→Animal + Mortal) ===
  {
    action: 'prove',
    input_nl: 'Poodle hasProperty Mortal.',
    input_dsl: '@goal hasProperty Poodle Mortal',
    expected_nl: 'True: Poodle has Mortal.',
    proof_nl: 'Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal has Mortal. Poodle has Mortal. Transitive chain verified (7 hops). Therefore Poodle has Mortal.'
  },

  // === PROVE: Property inheritance 5-level (Poodle→Vertebrate + HasSpine) ===
  {
    action: 'prove',
    input_nl: 'Poodle hasProperty HasSpine.',
    input_dsl: '@goal hasProperty Poodle HasSpine',
    expected_nl: 'True: Poodle has HasSpine.',
    proof_nl: 'Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate has HasSpine. Poodle has HasSpine. Transitive chain verified (6 hops). Therefore Poodle has HasSpine.'
  },

  // === QUERY: What is Poodle (all transitive) ===
  {
    action: 'query',
    input_nl: 'Poodle is a ?what.',
    input_dsl: '@q isA Poodle ?what',
    expected_nl: [
      'Poodle is a toy.',
      'Poodle is a dog.',
      'Poodle is a canine.',
      'Poodle is a carnivore.',
      'Poodle is a mammal.',
      'Poodle is a vertebrate.',
      'Poodle is an animal.',
      'Poodle is a livingthing.',
      'Poodle is an entity.'
    ],
    proof_nl: [
      'Fact in KB: Poodle is a toy',
      'Therefore Poodle is a dog',
      'Therefore Poodle is a canine',
      'Therefore Poodle is a carnivore',
      'Therefore Poodle is a mammal',
      'Therefore Poodle is a vertebrate',
      'Therefore Poodle is an animal',
      'Therefore Poodle is a livingthing',
      'Therefore Poodle is an entity'
    ]
  },

  // === NEGATIVE: Rock is not LivingThing with search trace ===
  {
    action: 'prove',
    input_nl: 'Rock is a LivingThing.',
    input_dsl: '@goal isA Rock LivingThing',
    expected_nl: 'Cannot prove: Rock is a livingthing.',
    proof_nl: 'No proof found for Rock is a livingthing'
  }
];

export default { name, description, theories, steps };
