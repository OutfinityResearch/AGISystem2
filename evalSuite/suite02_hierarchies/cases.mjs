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
    input_nl: 'Deep taxonomy: Poodle→Toy→Dog→Canine→Carnivore→Mammal→Vertebrate→Animal→LivingThing→Entity. Properties at each level.',
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
    input_nl: 'Is Poodle an Entity? (Poodle→Toy→Dog→Canine→Carnivore→Mammal→Vertebrate→Animal→LivingThing→Entity)',
    input_dsl: '@goal isA Poodle Entity',
    expected_nl: 'True: Poodle is an entity. Proof: Poodle isA Toy. Toy isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity.'
  },

  // === PROVE: 7-step transitive Poodle→LivingThing ===
  {
    action: 'prove',
    input_nl: 'Is Poodle a LivingThing? (7 steps)',
    input_dsl: '@goal isA Poodle LivingThing',
    expected_nl: 'True: Poodle is a livingthing. Proof: Poodle isA Toy. Toy isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === PROVE: Property inheritance 8-level (Poodle→Entity + Exists) ===
  {
    action: 'prove',
    input_nl: 'Does Poodle exist? (8-level inheritance: Poodle→...→Entity + hasProperty Entity Exists)',
    input_dsl: '@goal hasProperty Poodle Exists',
    expected_nl: 'True: Poodle has Exists. Proof: Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing is an entity. Entity has Exists. Poodle has Exists. Transitive chain verified (9 hops). Therefore Poodle has Exists.'
  },

  // === PROVE: Property inheritance 7-level (Poodle→LivingThing + Breathes) ===
  {
    action: 'prove',
    input_nl: 'Does Poodle breathe? (7-level inheritance)',
    input_dsl: '@goal hasProperty Poodle Breathes',
    expected_nl: 'True: Poodle has Breathes. Proof: Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing has Breathes. Poodle has Breathes. Transitive chain verified (8 hops). Therefore Poodle has Breathes.'
  },

  // === PROVE: Property inheritance 6-level (Poodle→Animal + Mortal) ===
  {
    action: 'prove',
    input_nl: 'Is Poodle mortal? (6-level inheritance)',
    input_dsl: '@goal hasProperty Poodle Mortal',
    expected_nl: 'True: Poodle has Mortal. Proof: Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal has Mortal. Poodle has Mortal. Transitive chain verified (7 hops). Therefore Poodle has Mortal.'
  },

  // === PROVE: Property inheritance 5-level (Poodle→Vertebrate + HasSpine) ===
  {
    action: 'prove',
    input_nl: 'Does Poodle have a spine? (5-level inheritance)',
    input_dsl: '@goal hasProperty Poodle HasSpine',
    expected_nl: 'True: Poodle has HasSpine. Proof: Poodle is a toy. Toy is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate has HasSpine. Poodle has HasSpine. Transitive chain verified (6 hops). Therefore Poodle has HasSpine.'
  },

  // === QUERY: What is Poodle (all transitive) ===
  {
    action: 'query',
    input_nl: 'What is a Poodle?',
    input_dsl: '@q isA Poodle ?what',
    expected_nl: 'Poodle is a Toy. Poodle is a Dog. Poodle is a Canine. Poodle is a Carnivore. Poodle is a Mammal. Poodle is a Vertebrate. Poodle is an Animal. Poodle is a LivingThing. Poodle is an Entity.'
  },

  // === NEGATIVE: Rock is not LivingThing with search trace ===
  {
    action: 'prove',
    input_nl: 'Is Rock a LivingThing? (Rock→Mineral→Inorganic→Matter, no path to LivingThing)',
    input_dsl: '@goal isA Rock LivingThing',
    expected_nl: 'Cannot prove: Rock is a livingthing. Search: Rock isA Mineral. Mineral isA Inorganic. Inorganic isA Matter. No path exists from Rock to LivingThing.'
  }
];

export default { name, description, theories, steps };
