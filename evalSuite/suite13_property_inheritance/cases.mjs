/**
 * Suite 13 - Property Inheritance
 *
 * Tests property inheritance through isA hierarchies:
 * - If isA Child Parent and prop Parent Value, then prop Child Value
 * - Deep chain inheritance (multiple isA levels)
 * - Exception handling (Not blocks inheritance)
 * - Multiple inheritable properties (can, has, likes, knows, owns, uses)
 */

export const name = 'Property Inheritance';
export const description = 'Cross-relation inheritance through isA hierarchies';

export const theories = [];

export const steps = [
  // === SETUP: Basic animal hierarchy with properties ===
  {
    action: 'learn',
    input_nl: 'Define basic animal hierarchy with abilities.',
    input_dsl: `
      isA Animal LivingThing
      isA Bird Animal
      isA Mammal Animal
      isA Dog Mammal
      isA Cat Mammal
      isA Sparrow Bird
      isA Penguin Bird

      isA Rex Dog
      isA Whiskers Cat
      isA Tweety Sparrow
      isA Opus Penguin

      can Bird Fly
      can Dog Bark
      can Cat Meow
      has Mammal Fur
      has Bird Feathers
    `,
    expected_nl: 'Learned'
  },

  // === PROVE: Basic property inheritance (Bird -> can Fly) ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly? (Sparrow inherits from Bird)',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly'
  },

  // === PROVE: Direct property inheritance (Dog -> can Bark) ===
  {
    action: 'prove',
    input_nl: 'Can Rex bark? (Dog inherits bark ability)',
    input_dsl: '@goal can Rex Bark',
    expected_nl: 'True: Rex can Bark'
  },

  // === PROVE: Property inheritance for has relation (Mammal -> has Fur) ===
  {
    action: 'prove',
    input_nl: 'Does Rex have fur? (Dog inherits fur from Mammal)',
    input_dsl: '@goal has Rex Fur',
    expected_nl: 'True: Rex has Fur'
  },

  // === PROVE: Multiple inheritance depth (Cat -> Mammal -> has Fur) ===
  {
    action: 'prove',
    input_nl: 'Does Whiskers have fur? (Cat -> Mammal)',
    input_dsl: '@goal has Whiskers Fur',
    expected_nl: 'True: Whiskers has Fur'
  },

  // === PROVE: Bird property inheritance (Bird -> has Feathers) ===
  {
    action: 'prove',
    input_nl: 'Does Tweety have feathers? (Sparrow -> Bird)',
    input_dsl: '@goal has Tweety Feathers',
    expected_nl: 'True: Tweety has Feathers'
  },

  // === SETUP: Add exceptions for penguins ===
  {
    action: 'learn',
    input_nl: 'Penguins cannot fly (exception to bird default).',
    input_dsl: `
      Not can Penguin Fly
    `,
    expected_nl: 'Learned'
  },

  // === PROVE: Exception blocks inheritance (Penguin cannot fly) ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (Penguin exception blocks inheritance)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove'
  },

  // === PROVE: Penguin still has feathers (no exception) ===
  {
    action: 'prove',
    input_nl: 'Does Opus have feathers? (Penguin still a bird)',
    input_dsl: '@goal has Opus Feathers',
    expected_nl: 'True: Opus has Feathers'
  },

  // === SETUP: Deep hierarchy for property inheritance ===
  {
    action: 'learn',
    input_nl: 'Create deep hierarchy: HouseSparrow -> Sparrow -> Passerine -> Bird.',
    input_dsl: `
      isA Passerine Bird
      isA Sparrow Passerine
      isA HouseSparrow Sparrow
      isA Chirpy HouseSparrow
    `,
    expected_nl: 'Learned'
  },

  // === PROVE: Deep chain inheritance (4 levels for can Fly) ===
  {
    action: 'prove',
    input_nl: 'Can Chirpy fly? (HouseSparrow -> Sparrow -> Passerine -> Bird)',
    input_dsl: '@goal can Chirpy Fly',
    expected_nl: 'True: Chirpy can Fly'
  },

  // === PROVE: Deep chain inheritance (4 levels for has Feathers) ===
  {
    action: 'prove',
    input_nl: 'Does Chirpy have feathers? (deep chain inheritance)',
    input_dsl: '@goal has Chirpy Feathers',
    expected_nl: 'True: Chirpy has Feathers'
  },

  // === SETUP: Add likes and knows properties ===
  {
    action: 'learn',
    input_nl: 'Dogs like treats, cats like fish, birds like seeds.',
    input_dsl: `
      likes Dog Treats
      likes Cat Fish
      likes Bird Seeds
      knows Animal Fear
    `,
    expected_nl: 'Learned'
  },

  // === PROVE: likes property inheritance ===
  {
    action: 'prove',
    input_nl: 'Does Rex like treats? (Dog -> likes Treats)',
    input_dsl: '@goal likes Rex Treats',
    expected_nl: 'True: Rex likes Treats'
  },

  // === PROVE: likes property for bird ===
  {
    action: 'prove',
    input_nl: 'Does Tweety like seeds? (Sparrow -> Bird -> likes Seeds)',
    input_dsl: '@goal likes Tweety Seeds',
    expected_nl: 'True: Tweety likes Seeds'
  },

  // === PROVE: knows property inheritance through Animal ===
  {
    action: 'prove',
    input_nl: 'Does Rex know fear? (Dog -> Mammal -> Animal)',
    input_dsl: '@goal knows Rex Fear',
    expected_nl: 'True: Rex knows Fear'
  },

  // === NEGATIVE: Non-existent property ===
  {
    action: 'prove',
    input_nl: 'Can Rex fly? (Dogs cannot fly)',
    input_dsl: '@goal can Rex Fly',
    expected_nl: 'Cannot prove'
  },

  // === NEGATIVE: Non-existent entity ===
  {
    action: 'prove',
    input_nl: 'Can Rock fly? (Rock not in hierarchy)',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove'
  },

  // === SETUP: Flightless birds hierarchy ===
  {
    action: 'learn',
    input_nl: 'Add ostriches and emperor penguins (both flightless).',
    input_dsl: `
      isA Ostrich Bird
      isA EmperorPenguin Penguin
      isA Pingu EmperorPenguin
      isA BigBird Ostrich
      Not can Ostrich Fly
    `,
    expected_nl: 'Learned'
  },

  // === PROVE: Deep exception inheritance (EmperorPenguin -> Penguin exception) ===
  {
    action: 'prove',
    input_nl: 'Can Pingu fly? (EmperorPenguin -> Penguin exception)',
    input_dsl: '@goal can Pingu Fly',
    expected_nl: 'Cannot prove'
  },

  // === PROVE: Direct exception for ostrich ===
  {
    action: 'prove',
    input_nl: 'Can BigBird fly? (Ostrich exception)',
    input_dsl: '@goal can BigBird Fly',
    expected_nl: 'Cannot prove'
  },

  // === PROVE: Ostrich still has feathers ===
  {
    action: 'prove',
    input_nl: 'Does BigBird have feathers? (Ostrich -> Bird)',
    input_dsl: '@goal has BigBird Feathers',
    expected_nl: 'True: BigBird has Feathers'
  },

  // === SETUP: owns and uses properties ===
  {
    action: 'learn',
    input_nl: 'Add owns and uses properties.',
    input_dsl: `
      isA Human Mammal
      isA Programmer Human
      isA Alice Programmer
      owns Human Tools
      uses Programmer Computer
    `,
    expected_nl: 'Learned'
  },

  // === PROVE: owns property inheritance ===
  {
    action: 'prove',
    input_nl: 'Does Alice own tools? (Programmer -> Human)',
    input_dsl: '@goal owns Alice Tools',
    expected_nl: 'True: Alice owns Tools'
  },

  // === PROVE: uses property inheritance ===
  {
    action: 'prove',
    input_nl: 'Does Alice use a computer? (direct Programmer inheritance)',
    input_dsl: '@goal uses Alice Computer',
    expected_nl: 'True: Alice uses Computer'
  },

  // === PROVE: Human also has fur (from Mammal) ===
  {
    action: 'prove',
    input_nl: 'Does Alice have fur? (Human -> Mammal)',
    input_dsl: '@goal has Alice Fur',
    expected_nl: 'True: Alice has Fur'
  }
];

export default { name, description, theories, steps };
