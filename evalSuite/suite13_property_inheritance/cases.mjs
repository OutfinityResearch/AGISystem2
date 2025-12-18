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
    expected_nl: 'Learned 34 facts'
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
    expected_nl: 'True: Rex can Bark. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog can Bark. Rex can Bark. Transitive chain verified (4 hops). Therefore Rex can Bark.'
  },

  // === PROVE: Property inheritance (can Hunt via 7-step Carnivore chain) ===
  {
    action: 'prove',
    input_nl: 'Can Rex hunt? (7-step inheritance from Carnivore)',
    input_dsl: '@goal can Rex Hunt',
    expected_nl: 'True: Rex can Hunt. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore can Hunt. Rex can Hunt. Transitive chain verified (6 hops). Therefore Rex can Hunt.'
  },

  // === PROVE: Property inheritance (has Fur via 8-step Mammal chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have fur? (8-step inheritance from Mammal)',
    input_dsl: '@goal has Rex Fur',
    expected_nl: 'True: Rex has a fur. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal has a fur. Rex has a fur. Transitive chain verified (7 hops). Therefore Rex has a fur.'
  },

  // === PROVE: Property inheritance (has Spine via 9-step Vertebrate chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have a spine? (9-step inheritance from Vertebrate)',
    input_dsl: '@goal has Rex Spine',
    expected_nl: 'True: Rex has a spine. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate has a spine. Rex has a spine. Transitive chain verified (8 hops). Therefore Rex has a spine.'
  },

  // === PROVE: Property inheritance (has Cells via 10-step Animal chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have cells? (10-step inheritance from Animal)',
    input_dsl: '@goal has Rex Cells',
    expected_nl: 'True: Rex has a cells. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal has a cells. Rex has a cells. Transitive chain verified (9 hops). Therefore Rex has a cells.'
  },

  // === PROVE: Property inheritance (has DNA via 11-step LivingThing chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have DNA? (11-step inheritance from LivingThing)',
    input_dsl: '@goal has Rex DNA',
    expected_nl: 'True: Rex has a dna. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal is a livingthing. LivingThing has a dna. Rex has a dna. Transitive chain verified (10 hops). Therefore Rex has a dna.'
  },

  // === PROVE: Property inheritance (likes Treats via 5-step Dog chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex like treats? (5-step inheritance from Dog)',
    input_dsl: '@goal likes Rex Treats',
    expected_nl: 'True: Rex likes Treats. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog likes Treats. Rex likes Treats. Transitive chain verified (4 hops). Therefore Rex likes Treats.'
  },

  // === PROVE: Property inheritance (knows Fear via 10-step Animal chain) ===
  {
    action: 'prove',
    input_nl: 'Does Rex know fear? (10-step inheritance from Animal)',
    input_dsl: '@goal knows Rex Fear',
    expected_nl: 'True: Rex knows Fear. Proof: Rex is a germanshepherd. GermanShepherd is a shepherd. Shepherd is a workingdog. WorkingDog is a dog. Dog is a canine. Canine is a carnivore. Carnivore is a mammal. Mammal is a vertebrate. Vertebrate is an animal. Animal knows Fear. Rex knows Fear. Transitive chain verified (9 hops). Therefore Rex knows Fear.'
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
    expected_nl: 'True: Tweety can Fly. Proof: Tweety is a housesparrow. HouseSparrow is a sparrow. Sparrow is a songbird. Songbird is a bird. Bird can Fly. Tweety can Fly. Transitive chain verified (4 hops). Therefore Tweety can Fly.'
  },

  // === PROVE: Property inheritance (has Feathers via 5-step Bird chain) ===
  {
    action: 'prove',
    input_nl: 'Does Tweety have feathers? (5-step inheritance from Bird)',
    input_dsl: '@goal has Tweety Feathers',
    expected_nl: 'True: Tweety has a feathers. Proof: Tweety is a housesparrow. HouseSparrow is a sparrow. Sparrow is a songbird. Songbird is a bird. Bird has a feathers. Tweety has a feathers. Transitive chain verified (4 hops). Therefore Tweety has a feathers.'
  },

  // === PROVE: Property inheritance (likes Seeds via 5-step Bird chain) ===
  {
    action: 'prove',
    input_nl: 'Does Tweety like seeds? (5-step inheritance from Bird)',
    input_dsl: '@goal likes Tweety Seeds',
    expected_nl: 'True: Tweety likes Seeds. Proof: Tweety is a housesparrow. HouseSparrow is a sparrow. Sparrow is a songbird. Songbird is a bird. Bird likes Seeds. Tweety likes Seeds. Transitive chain verified (4 hops). Therefore Tweety likes Seeds.'
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
    expected_nl: 'True: Whiskers can Meow. Proof: Whiskers is a persiancat. PersianCat is a domesticcat. DomesticCat is a cat. Cat can Meow. Whiskers can Meow. Transitive chain verified (3 hops). Therefore Whiskers can Meow.'
  },

  // === PROVE: Property inheritance (can Hunt via 5-step Carnivore chain) ===
  {
    action: 'prove',
    input_nl: 'Can Whiskers hunt? (5-step inheritance from Carnivore)',
    input_dsl: '@goal can Whiskers Hunt',
    expected_nl: 'True: Whiskers can Hunt. Proof: Whiskers is a persiancat. PersianCat is a domesticcat. DomesticCat is a cat. Cat is a carnivore. Carnivore can Hunt. Whiskers can Hunt. Transitive chain verified (4 hops). Therefore Whiskers can Hunt.'
  },

  // === PROVE: Property inheritance (likes Fish via 4-step Cat chain) ===
  {
    action: 'prove',
    input_nl: 'Does Whiskers like fish? (4-step inheritance from Cat)',
    input_dsl: '@goal likes Whiskers Fish',
    expected_nl: 'True: Whiskers likes Fish. Proof: Whiskers is a persiancat. PersianCat is a domesticcat. DomesticCat is a cat. Cat likes Fish. Whiskers likes Fish. Transitive chain verified (3 hops). Therefore Whiskers likes Fish.'
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
    expected_nl: 'Cannot prove: Opus can Fly. Search: Opus isA EmperorPenguin. EmperorPenguin isA Penguin. Penguin isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity. Entity isA Thing.'
  },

  // === PROVE: Penguin still has feathers (no exception) ===
  {
    action: 'prove',
    input_nl: 'Does Opus have feathers? (5-step inheritance, no exception)',
    input_dsl: '@goal has Opus Feathers',
    expected_nl: 'True: Opus has a feathers. Proof: Opus is an emperorpenguin. EmperorPenguin is a penguin. Penguin is an antarctic. Antarctic is a seabird. Seabird is a bird. Bird has a feathers. Opus has a feathers. Transitive chain verified (5 hops). Therefore Opus has a feathers.'
  },

  // === NEGATIVE: Dogs cannot fly (no inheritance path) ===
  {
    action: 'prove',
    input_nl: 'Can Rex fly? (no path to Bird, should fail)',
    input_dsl: '@goal can Rex Fly',
    expected_nl: 'Cannot prove: Rex can Fly. Search: Rex isA GermanShepherd. GermanShepherd isA Shepherd. Shepherd isA WorkingDog. WorkingDog isA Dog. Dog isA Canine. Canine isA Carnivore. Carnivore isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. LivingThing isA Entity. Entity isA Thing. Checked: Bird can Fly. Rex is not a Bird. Property not inheritable.'
  },

  // === NEGATIVE: Unknown entity fails with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Rock fly? (unknown entity)',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove: Rock can Fly. Search: Searched isA Rock ?type in KB. Not found. Entity unknown. No applicable inheritance paths.'
  },

  // === QUERY: What can Rex do ===
  {
    action: 'query',
    input_nl: 'What can Rex do?',
    input_dsl: '@q can Rex ?ability',
    expected_nl: 'Answer: Bark. Hunt. Proof: Rex isA GermanShepherd -> Shepherd -> WorkingDog -> Dog -> Canine -> Carnivore. Dog can Bark. Carnivore can Hunt. Both inherited down to Rex.'
  },

  // === QUERY: What does Tweety inherit? (expect Fly and Feathers) ===
  {
    action: 'query',
    input_nl: 'What can Tweety do or have from birds?',
    input_dsl: '@q can Tweety ?ability',
    expected_nl: 'Answer: Fly. Proof: Tweety isA HouseSparrow -> Sparrow -> Songbird -> Bird. Bird can Fly inherited.'
  },

  // === QUERY: What properties does Whiskers inherit deeply? ===
  {
    action: 'query',
    input_nl: 'List inherited likes for Whiskers.',
    input_dsl: '@q likes Whiskers ?thing',
    expected_nl: 'Answer: Fish. Proof: Whiskers isA PersianCat -> DomesticCat -> Cat. Cat likes Fish inherited.'
  }
];

export default { name, description, theories, steps };
