/**
 * Suite 01 - Foundations (Deep Chains)
 *
 * Basic learn/query/prove with deep transitive chains.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Foundations';
export const description = 'Basic operations with deep chains and complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep chain organisms (8 levels) + animals (5 levels) ===
  {
    action: 'learn',
    input_nl: 'Carbon is an Atom. Atom is a Molecule. Molecule is a Cell. Cell is a Tissue. Tissue is an Organ. Organ is an Organism. Organism is a Species. Species is an Ecosystem. Rex is a Dog. Dog is a Canine. Canine is a Mammal. Mammal is a Vertebrate. Vertebrate is an Animal. Animal is a LivingThing. Tweety is a Sparrow. Sparrow is a Songbird. Songbird is a Bird. Bird is a FlyingAnimal. FlyingAnimal is a Vertebrate. Tweety can Fly. Penguin is a FlightlessBird. FlightlessBird is a Bird. Opus is a Penguin. Opus cannot Fly.',
    input_dsl: `
      isA Carbon Atom
      isA Atom Molecule
      isA Molecule Cell
      isA Cell Tissue
      isA Tissue Organ
      isA Organ Organism
      isA Organism Species
      isA Species Ecosystem
      isA Rex Dog
      isA Dog Canine
      isA Canine Mammal
      isA Mammal Vertebrate
      isA Vertebrate Animal
      isA Animal LivingThing
      isA Tweety Sparrow
      isA Sparrow Songbird
      isA Songbird Bird
      isA Bird FlyingAnimal
      isA FlyingAnimal Vertebrate
      can Tweety Fly
      isA Penguin FlightlessBird
      isA FlightlessBird Bird
      isA Opus Penguin
      @negOpusFly can Opus Fly
      Not $negOpusFly
    `,
    expected_nl: 'Learned 25 facts'
  },

  // === PROVE: 6-step Rex→LivingThing ===
  {
    action: 'prove',
    input_nl: 'Rex is a LivingThing.',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing.',
    proof_nl: 'Rex isA Dog. Dog isA Canine. Canine isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === PROVE: 5-step Rex→Animal ===
  {
    action: 'prove',
    input_nl: 'Rex is an Animal.',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal.',
    proof_nl: 'Rex isA Dog. Dog isA Canine. Canine isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal.'
  },

  // === PROVE: 6-step Carbon→Organ ===
  {
    action: 'prove',
    input_nl: 'Carbon is an Organ.',
    input_dsl: '@goal isA Carbon Organ',
    expected_nl: 'True: Carbon is an organ.',
    proof_nl: 'Carbon isA Atom. Atom isA Molecule. Molecule isA Cell. Cell isA Tissue. Tissue isA Organ.'
  },

  // === NEGATIVE: Negation blocks with search trace ===
  {
    action: 'prove',
    input_nl: 'Opus can Fly.',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly.',
    proof_nl: 'Found explicit negation: NOT (Opus can Fly). Negation blocks inference.'
  },

  // === PROVE: 7-step Carbon→Organism ===
  {
    action: 'prove',
    input_nl: 'Carbon is an Organism.',
    input_dsl: '@goal isA Carbon Organism',
    expected_nl: 'True: Carbon is an organism.',
    proof_nl: 'Carbon isA Atom. Atom isA Molecule. Molecule isA Cell. Cell isA Tissue. Tissue isA Organ. Organ isA Organism.'
  },

  // === QUERY: Multiple bird results ===
  {
    action: 'query',
    input_nl: 'What is a Bird?',
    input_dsl: '@q isA ?x Bird',
    expected_nl: [
      'Songbird is a bird.',
      'FlightlessBird is a bird.',
      'Sparrow is a bird.',
      'Penguin is a bird.',
      'Tweety is a bird.',
      'Opus is a bird.'
    ],
    proof_nl: [
      'Fact in KB: FlightlessBird is a bird',
      'Fact in KB: Songbird is a bird',
      'Therefore Sparrow is a bird',
      'Therefore Penguin is a bird',
      'Therefore Tweety is a bird',
      'Therefore Opus is a bird'
    ]
  },

  // === PROVE: 6-step Tweety→LivingThing ===
  {
    action: 'prove',
    input_nl: 'Tweety is a LivingThing.',
    input_dsl: '@goal isA Tweety LivingThing',
    expected_nl: 'True: Tweety is a livingthing.',
    proof_nl: 'Tweety isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. Bird isA FlyingAnimal. FlyingAnimal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === NEGATIVE: Unknown entity with search trace ===
  {
    action: 'prove',
    input_nl: 'Charlie is a Dog.',
    input_dsl: '@goal isA Charlie Dog',
    expected_nl: 'Cannot prove: Charlie is a dog.',
    proof_nl: 'No isA facts for Charlie exist in KB'
  },

  // === PROVE: 8-step Carbon→Ecosystem ===
  {
    action: 'prove',
    input_nl: 'Carbon is an Ecosystem.',
    input_dsl: '@goal isA Carbon Ecosystem',
    expected_nl: 'True: Carbon is an ecosystem.',
    proof_nl: 'Carbon isA Atom. Atom isA Molecule. Molecule isA Cell. Cell isA Tissue. Tissue isA Organ. Organ isA Organism. Organism isA Species. Species isA Ecosystem.'
  }
];

export default { name, description, theories, steps };
