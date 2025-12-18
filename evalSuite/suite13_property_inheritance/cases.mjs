/**
 * Suite 13 - Property Inheritance (Deep Chains)
 *
 * Cross-relation inheritance through deep isA hierarchies.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Property Inheritance';
export const description = 'Cross-relation inheritance through deep isA hierarchies with complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep animal hierarchy (10 levels) with properties at each level ===
  {
    action: 'learn',
    input_nl: 'Deep animal taxonomy: Rex->GermanShepherd->Shepherd->WorkingDog->Dog->Canine->Carnivore->Mammal->Vertebrate->Animal->LivingThing->Entity',
    input_dsl: `
      isA Entity Thing
      isA LivingThing Entity
      isA Animal LivingThing
      isA Vertebrate Animal
      isA Mammal Vertebrate
      isA Carnivore Mammal
      isA Canine Carnivore
      isA Dog Canine
      isA WorkingDog Dog
      isA Shepherd WorkingDog
      isA GermanShepherd Shepherd
      isA Rex GermanShepherd

      isA Bird Vertebrate
      isA Songbird Bird
      isA Sparrow Songbird
      isA HouseSparrow Sparrow
      isA Tweety HouseSparrow

      isA Cat Carnivore
      isA DomesticCat Cat
      isA PersianCat DomesticCat
      isA Whiskers PersianCat

      can Bird Fly
      can Dog Bark
      can Cat Meow
      can Carnivore Hunt
      has Mammal Fur
      has Bird Feathers
      has Vertebrate Spine
      has Animal Cells
      has LivingThing DNA
      knows Animal Fear
      likes Dog Treats
      likes Cat Fish
      likes Bird Seeds
    `,
    expected_nl: 'Learned 35 facts'
  },

  // === PROVE: 11-step isA chain (Rex->Thing) ===
  {
    action: 'prove',
    input_nl: 'Is Rex a Thing? (11-step deep chain)',
    input_dsl: '@goal isA Rex Thing',
    expected_nl: 'True: Rex is a thing. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity. Entity isA Thing.'
  },

  // === PROVE: Property inheritance (can Bark via 5-step Dog chain) ===
  {
    action: 'prove',
    input_nl: 'Can Rex bark? (5-step inheritance from Dog)',
    input_dsl: '@goal can Rex Bark',
    expected_nl: 'True: Rex can Bark. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog can Bark. Property inherited through 4-step chain. Therefore Rex can Bark.'
  },

  // === PROVE: Property inheritance (can Hunt via 7-step Carnivore chain) ===
  {
    action: 'prove',
    input_nl: 'Can Rex hunt? (7-step inheritance from Carnivore)',
    input_dsl: '@goal can Rex Hunt',
    expected_nl: 'True: Rex can Hunt. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore can Hunt. Property inherited through 6-step chain. Therefore Rex can Hunt.'
  },

  // === PROVE: Property inheritance (has Fur via 8-step Mammal chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have fur? (8-step inheritance from Mammal)',
    input_dsl: '@goal has Rex Fur',
    expected_nl: 'True: Rex has Fur. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal has Fur. Property inherited through 7-step chain. Therefore Rex has Fur.'
  },

  // === PROVE: Property inheritance (has Spine via 9-step Vertebrate chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have a spine? (9-step inheritance from Vertebrate)',
    input_dsl: '@goal has Rex Spine',
    expected_nl: 'True: Rex has Spine. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate has Spine. Property inherited through 8-step chain. Therefore Rex has Spine.'
  },

  // === PROVE: Property inheritance (has Cells via 10-step Animal chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have cells? (10-step inheritance from Animal)',
    input_dsl: '@goal has Rex Cells',
    expected_nl: 'True: Rex has Cells. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal has Cells. Property inherited through 9-step chain. Therefore Rex has Cells.'
  },

  // === PROVE: Property inheritance (has DNA via 11-step LivingThing chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have DNA? (11-step inheritance from LivingThing)',
    input_dsl: '@goal has Rex DNA',
    expected_nl: 'True: Rex has DNA. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing has DNA. Property inherited through 10-step chain. Therefore Rex has DNA.'
  },

  // === PROVE: Property inheritance (likes Treats via 5-step Dog chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex like treats? (5-step inheritance from Dog)',
    input_dsl: '@goal likes Rex Treats',
    expected_nl: 'True: Rex likes Treats. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog likes Treats. Property inherited through 4-step chain. Therefore Rex likes Treats.'
  },

  // === PROVE: Property inheritance (knows Fear via 10-step Animal chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex know fear? (10-step inheritance from Animal)',
    input_dsl: '@goal knows Rex Fear',
    expected_nl: 'True: Rex knows Fear. Proof: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal knows Fear. Property inherited through 9-step chain. Therefore Rex knows Fear.'
  },

  // === PROVE: 6-step isA chain (Tweety->Vertebrate) ===
  {
    action: 'prove',
    input_nl: 'Is Tweety a Vertebrate? (6-step chain)',
    input_dsl: '@goal isA Tweety Vertebrate',
    expected_nl: 'True: Tweety is a vertebrate. Proof: Tweety isA HouseSparrow. HouseSparrow isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. Bird isA Vertebrate.'
  },

  // === PROVE: Property inheritance (can Fly via 5-step Bird chain) ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly? (5-step inheritance from Bird)',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly. Proof: Tweety isA HouseSparrow. HouseSparrow isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. Bird can Fly. Property inherited through 4-step chain. Therefore Tweety can Fly.'
  },

  // === PROVE: Property inheritance (has Feathers via 5-step Bird chain) ===
  {
    action: 'prove',
    input_nl: 'Does Tweety have feathers? (5-step inheritance from Bird)',
    input_dsl: '@goal has Tweety Feathers',
    expected_nl: 'True: Tweety has Feathers. Proof: Tweety isA HouseSparrow. HouseSparrow isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. Bird has Feathers. Property inherited through 4-step chain. Therefore Tweety has Feathers.'
  },

  // === PROVE: Property inheritance (likes Seeds via 5-step Bird chain) ===
  {
    action: 'prove',
    input_nl: 'Does Tweety like seeds? (5-step inheritance from Bird)',
    input_dsl: '@goal likes Tweety Seeds',
    expected_nl: 'True: Tweety likes Seeds. Proof: Tweety isA HouseSparrow. HouseSparrow isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. Bird likes Seeds. Property inherited through 4-step chain. Therefore Tweety likes Seeds.'
  },

  // === PROVE: 5-step isA chain (Whiskers->Carnivore) ===
  {
    action: 'prove',
    input_nl: 'Is Whiskers a Carnivore? (5-step chain)',
    input_dsl: '@goal isA Whiskers Carnivore',
    expected_nl: 'True: Whiskers is a carnivore. Proof: Whiskers isA PersianCat. PersianCat isA DomesticCat. DomesticCat isA Cat. Cat isA Carnivore. Transitive chain verified (4 hops). Therefore Whiskers isA Carnivore.'
  },

  // === PROVE: Property inheritance (can Meow via 4-step Cat chain) ===
  {
    action: 'prove',
    input_nl: 'Can Whiskers meow? (4-step inheritance from Cat)',
    input_dsl: '@goal can Whiskers Meow',
    expected_nl: 'True: Whiskers can Meow. Proof: Whiskers isA PersianCat. PersianCat isA DomesticCat. DomesticCat isA Cat. Cat can Meow. Property inherited through 3-step chain. Therefore Whiskers can Meow.'
  },

  // === PROVE: Property inheritance (can Hunt via 5-step Carnivore chain) ===
  {
    action: 'prove',
    input_nl: 'Can Whiskers hunt? (5-step inheritance from Carnivore)',
    input_dsl: '@goal can Whiskers Hunt',
    expected_nl: 'True: Whiskers can Hunt. Proof: Whiskers isA PersianCat. PersianCat isA DomesticCat. DomesticCat isA Cat. Cat isA Carnivore. Carnivore can Hunt. Property inherited through 4-step chain. Therefore Whiskers can Hunt.'
  },

  // === PROVE: Property inheritance (likes Fish via 4-step Cat chain) ===
  {
    action: 'prove',
    input_nl: 'Does Whiskers like fish? (4-step inheritance from Cat)',
    input_dsl: '@goal likes Whiskers Fish',
    expected_nl: 'True: Whiskers likes Fish. Proof: Whiskers isA PersianCat. PersianCat isA DomesticCat. DomesticCat isA Cat. Cat likes Fish. Property inherited through 3-step chain. Therefore Whiskers likes Fish.'
  },

  // === SETUP: Deep penguin hierarchy with flight exception ===
  {
    action: 'learn',
    input_nl: 'Add flightless birds: Penguin->Antarctic->Seabird->Bird. Opus is a penguin that cannot fly.',
    input_dsl: `
      isA Penguin Antarctic
      isA Antarctic Seabird
      isA Seabird Bird
      isA EmperorPenguin Penguin
      isA Opus EmperorPenguin
      @negPenguinFly can Penguin Fly
      Not $negPenguinFly
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === PROVE: 6-step isA chain (Opus->Vertebrate) ===
  {
    action: 'prove',
    input_nl: 'Is Opus a Vertebrate? (6-step chain through Bird)',
    input_dsl: '@goal isA Opus Vertebrate',
    expected_nl: 'True: Opus is a vertebrate. Proof: Opus isA EmperorPenguin. EmperorPenguin isA Penguin. Penguin isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird isA Vertebrate.'
  },

  // === NEGATIVE: Negation blocks flight for penguin with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (negation blocks despite 5-step Bird inheritance)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly. Search: Opus isA EmperorPenguin. EmperorPenguin isA Penguin. Penguin isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird can Fly would apply via inheritance. Found explicit negation: Not(can Penguin Fly). Opus isA Penguin (2-step chain). Negation applies. Inheritance blocked.'
  },

  // === PROVE: Penguin still has feathers (no exception) ===
  {
    action: 'prove',
    input_nl: 'Does Opus have feathers? (5-step inheritance, no exception)',
    input_dsl: '@goal has Opus Feathers',
    expected_nl: 'True: Opus has Feathers. Proof: Opus isA EmperorPenguin. EmperorPenguin isA Penguin. Penguin isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird has Feathers. No negation found. Property inherited through 5-step chain. Therefore Opus has Feathers.'
  },

  // === NEGATIVE: Dogs cannot fly (no inheritance path) ===
  {
    action: 'prove',
    input_nl: 'Can Rex fly? (no path to Bird, should fail)',
    input_dsl: '@goal can Rex Fly',
    expected_nl: 'Cannot prove: Rex can Fly. Search: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. No path to Bird found. Checked: Bird can Fly. Rex is not a Bird. Property not inheritable.'
  },

  // === NEGATIVE: Unknown entity fails with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Rock fly? (unknown entity)',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove: Rock can Fly. Search: Searched isA Rock ?type in KB. Not found. Searched can Rock Fly direct. Not found. Checked rule: Bird can Fly. Rock has no type assertions. Entity unknown. No applicable inheritance paths.'
  },

  // === QUERY: What can Rex do ===
  {
    action: 'query',
    input_nl: 'What can Rex do?',
    input_dsl: '@q can Rex ?ability',
    expected_nl: 'Rex can Bark. Rex can Hunt.'
  }
];

export default { name, description, theories, steps };
