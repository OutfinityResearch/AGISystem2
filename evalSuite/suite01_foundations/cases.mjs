/**
 * Suite 01 - Foundations
 *
 * Basic learn/query/prove with modal, negation, and diverse operators.
 * Tests: direct facts, simple queries, negation blocking, modal facts.
 */

export const name = 'Foundations';
export const description = 'Basic operations with modal and negation';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Diverse facts with modal and negation + deep chain ===
  {
    action: 'learn',
    input_nl: 'Basic facts: Rex is a Dog. Dogs are Animals. Tweety can fly. Penguins cannot fly. Opus is a Penguin. Deep chain: Atom->Molecule->Cell->Tissue->Organ->Organism->Species->Ecosystem.',
    input_dsl: `
      isA Rex Dog
      isA Dog Animal
      isA Animal LivingThing
      can Tweety Fly
      isA Tweety Bird
      isA Penguin Bird
      isA Opus Penguin
      @negOpusFly can Opus Fly
      Not $negOpusFly
      before Morning Noon
      before Noon Evening
      causes Rain WetGround
      isA Atom Molecule
      isA Molecule Cell
      isA Cell Tissue
      isA Tissue Organ
      isA Organ Organism
      isA Organism Species
      isA Species Ecosystem
      isA Carbon Atom
    `,
    expected_nl: 'Learned 20 facts'
  },

  // === PROVE: 3-step transitive ===
  {
    action: 'prove',
    input_nl: 'Is Rex a LivingThing?',
    input_dsl: '@goal isA Rex LivingThing',
    expected_nl: 'True: Rex is a livingthing'
  },

  // === PROVE: 4-step (Carbon -> Tissue) ===
  {
    action: 'prove',
    input_nl: 'Is Carbon a Tissue?',
    input_dsl: '@goal isA Carbon Tissue',
    expected_nl: 'True: Carbon is a tissue'
  },

  // === PROVE: 5-step (Carbon -> Organ) ===
  {
    action: 'prove',
    input_nl: 'Is Carbon an Organ?',
    input_dsl: '@goal isA Carbon Organ',
    expected_nl: 'True: Carbon is an organ'
  },

  // === PROVE: Negation blocks ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly?',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly'
  },

  // === PROVE: 6-step transitive (Carbon -> Organism) ===
  {
    action: 'prove',
    input_nl: 'Is Carbon an Organism?',
    input_dsl: '@goal isA Carbon Organism',
    expected_nl: 'True: Carbon is an organism'
  },

  // === QUERY: Multiple results ===
  {
    action: 'query',
    input_nl: 'What is a Bird?',
    input_dsl: '@q isA ?x Bird',
    expected_nl: 'Tweety is a Bird. Penguin is a Bird. Opus is a Bird.'
  },

  // === QUERY: Temporal pairs ===
  {
    action: 'query',
    input_nl: 'What comes before what?',
    input_dsl: '@q before ?x ?y',
    expected_nl: 'Morning is before Noon. Noon is before Evening.'
  },

  // === NEGATIVE: Unknown entity ===
  {
    action: 'prove',
    input_nl: 'Is Charlie a Dog?',
    input_dsl: '@goal isA Charlie Dog',
    expected_nl: 'Cannot prove: Charlie is a dog'
  },

  // === PROVE: Deep transitive chain (8-step) ===
  {
    action: 'prove',
    input_nl: 'Is Carbon an Ecosystem? (requires 8-step transitive)',
    input_dsl: '@goal isA Carbon Ecosystem',
    expected_nl: 'True: Carbon is an ecosystem. Proof: Carbon is an atom. Atom is a molecule. Molecule is a cell. Cell is a tissue. Tissue is an organ. Organ is an organism. Organism is a species. Species is an ecosystem.'
  }
];

export default { name, description, theories, steps };
