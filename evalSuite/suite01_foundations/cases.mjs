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
    input_nl: 'Deep chain: Carbon→Atom→Molecule→Cell→Tissue→Organ→Organism→Species→Ecosystem. Animals: Rex→Dog→Canine→Mammal→Vertebrate→Animal→LivingThing.',
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
    input_nl: 'Is Rex a LivingThing? (Rex→Dog→Canine→Mammal→Vertebrate→Animal→LivingThing)',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing. Proof: Rex isA Dog. Dog isA Canine. Canine isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === PROVE: 5-step Rex→Animal ===
  {
    action: 'prove',
    input_nl: 'Is Rex an Animal? (Rex→Dog→Canine→Mammal→Vertebrate→Animal)',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal. Proof: Rex isA Dog. Dog isA Canine. Canine isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal.'
  },

  // === PROVE: 6-step Carbon→Organ ===
  {
    action: 'prove',
    input_nl: 'Is Carbon an Organ? (Carbon→Atom→Molecule→Cell→Tissue→Organ)',
    input_dsl: '@goal isA Carbon Organ',
    expected_nl: 'True: Carbon is an organ. Proof: Carbon isA Atom. Atom isA Molecule. Molecule isA Cell. Cell isA Tissue. Tissue isA Organ.'
  },

  // === NEGATIVE: Negation blocks with search trace ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (Opus→Penguin→FlightlessBird→Bird but negation blocks)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly. Search: Opus isA Penguin. Penguin isA FlightlessBird. FlightlessBird isA Bird. Bird isA FlyingAnimal. FlyingAnimal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing. Found explicit negation: Not(can Opus Fly). Negation blocks inference.'
  },

  // === PROVE: 7-step Carbon→Organism ===
  {
    action: 'prove',
    input_nl: 'Is Carbon an Organism? (Carbon→Atom→Molecule→Cell→Tissue→Organ→Organism)',
    input_dsl: '@goal isA Carbon Organism',
    expected_nl: 'True: Carbon is an organism. Proof: Carbon isA Atom. Atom isA Molecule. Molecule isA Cell. Cell isA Tissue. Tissue isA Organ. Organ isA Organism.'
  },

  // === QUERY: Multiple bird results ===
  {
    action: 'query',
    input_nl: 'What is a Bird?',
    input_dsl: '@q isA ?x Bird',
    expected_nl: 'Songbird is a bird. FlightlessBird is a bird. Sparrow is a bird. Proof: isA Sparrow Songbird. isA Songbird Bird. Penguin is a bird. Proof: isA Penguin FlightlessBird. isA FlightlessBird Bird. Tweety is a bird. Proof: isA Tweety Sparrow. isA Sparrow Songbird. isA Songbird Bird. Opus is a bird. Proof: isA Opus Penguin. isA Penguin FlightlessBird. isA FlightlessBird Bird.'
  },

  // === PROVE: 6-step Tweety→LivingThing ===
  {
    action: 'prove',
    input_nl: 'Is Tweety a LivingThing? (Tweety→Sparrow→Songbird→Bird→FlyingAnimal→Vertebrate→Animal→LivingThing)',
    input_dsl: '@goal isA Tweety LivingThing',
    expected_nl: 'True: Tweety is a livingthing. Proof: Tweety isA Sparrow. Sparrow isA Songbird. Songbird isA Bird. Bird isA FlyingAnimal. FlyingAnimal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === NEGATIVE: Unknown entity with search trace ===
  {
    action: 'prove',
    input_nl: 'Is Charlie a Dog? (Charlie not in KB)',
    input_dsl: '@goal isA Charlie Dog',
    expected_nl: 'Cannot prove: Charlie is a dog. Search: Searched isA Charlie ?type in KB. Not found. Entity unknown. No applicable inheritance paths.'
  },

  // === PROVE: 8-step Carbon→Ecosystem ===
  {
    action: 'prove',
    input_nl: 'Is Carbon an Ecosystem? (Carbon→Atom→Molecule→Cell→Tissue→Organ→Organism→Species→Ecosystem)',
    input_dsl: '@goal isA Carbon Ecosystem',
    expected_nl: 'True: Carbon is an ecosystem. Proof: Carbon isA Atom. Atom isA Molecule. Molecule isA Cell. Cell isA Tissue. Tissue isA Organ. Organ isA Organism. Organism isA Species. Species isA Ecosystem.'
  }
];

export default { name, description, theories, steps };
