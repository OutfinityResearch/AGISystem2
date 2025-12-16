/**
 * Suite 02 - Type Hierarchies
 *
 * Deep isA chains (4-6 steps) with property inheritance rules.
 * Tests: transitive isA, property inheritance via And+Implies.
 */

export const name = 'Type Hierarchies';
export const description = 'Deep isA chains with property inheritance';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy + properties + inheritance rule ===
  {
    action: 'learn',
    input_nl: 'Deep taxonomy: Poodle->Dog->Mammal->Animal->LivingThing->Entity. Properties at each level.',
    input_dsl: `
      isA Poodle Dog
      isA Dog Mammal
      isA Mammal Animal
      isA Animal LivingThing
      isA LivingThing Entity
      hasProperty Entity Exists
      hasProperty LivingThing Breathes
      hasProperty Animal Mortal
      hasProperty Mammal WarmBlooded
      hasProperty Dog Loyal
      @inhBase isA ?sub ?super
      @inhProp hasProperty ?super ?prop
      @inhAnd And $inhBase $inhProp
      @inhConc hasProperty ?sub ?prop
      Implies $inhAnd $inhConc
    `,
    expected_nl: 'Learned 15 facts'
  },

  // === PROVE: 5-step transitive ===
  {
    action: 'prove',
    input_nl: 'Is Poodle an Entity?',
    input_dsl: '@goal isA Poodle Entity',
    expected_nl: 'True: Poodle is an entity. Proof: Poodle is a dog. Dog is a mammal. Mammal is an animal. Animal is a livingthing. LivingThing is an entity.'
  },

  // === PROVE: 4-step transitive ===
  {
    action: 'prove',
    input_nl: 'Is Poodle a LivingThing?',
    input_dsl: '@goal isA Poodle LivingThing',
    expected_nl: 'True: Poodle is a livingthing. Proof: Poodle is a dog. Dog is a mammal. Mammal is an animal. Animal is a livingthing.'
  },

  // === PROVE: Property inheritance 5-level (Poodle->...->Entity + Exists) ===
  {
    action: 'prove',
    input_nl: 'Does Poodle exist? (5-level inheritance)',
    input_dsl: '@goal hasProperty Poodle Exists',
    expected_nl: 'True: Poodle is exists'
  },

  // === PROVE: Property inheritance 4-level (Poodle->...->LivingThing + Breathes) ===
  {
    action: 'prove',
    input_nl: 'Does Poodle breathe? (4-level inheritance)',
    input_dsl: '@goal hasProperty Poodle Breathes',
    expected_nl: 'True: Poodle is breathes'
  },

  // === PROVE: Property inheritance 3-level ===
  {
    action: 'prove',
    input_nl: 'Is Poodle mortal? (3-level inheritance)',
    input_dsl: '@goal hasProperty Poodle Mortal',
    expected_nl: 'True: Poodle is mortal'
  },

  // === PROVE: Property inheritance 2-level ===
  {
    action: 'prove',
    input_nl: 'Is Poodle warm-blooded? (2-level inheritance)',
    input_dsl: '@goal hasProperty Poodle WarmBlooded',
    expected_nl: 'True: Poodle is warmblooded'
  },

  // === QUERY: What is Poodle (all transitive) ===
  {
    action: 'query',
    input_nl: 'What is a Poodle?',
    input_dsl: '@q isA Poodle ?what',
    expected_nl: 'Poodle is a Dog. Poodle is a Mammal. Poodle is an Animal. Poodle is a LivingThing. Poodle is an Entity.'
  },

  // === NEGATIVE ===
  {
    action: 'prove',
    input_nl: 'Is Rock a LivingThing?',
    input_dsl: '@goal isA Rock LivingThing',
    expected_nl: 'Cannot prove: Rock is a livingthing'
  }
];

export default { name, description, theories, steps };
