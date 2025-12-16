/**
 * Suite 05 - Negation & Exceptions
 *
 * Not operator blocking proofs, defaults with exceptions.
 * Tests: explicit negation, default rules, exception overrides.
 */

export const name = 'Negation & Exceptions';
export const description = 'Not blocking, defaults, exception overrides';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Default rule with exceptions (Birds fly, Penguins don't) ===
  {
    action: 'learn',
    input_nl: 'Birds fly by default. Penguins are birds but cannot fly. Ostriches cannot fly either.',
    input_dsl: `
      isA Bird Animal
      isA Penguin Bird
      isA Ostrich Bird
      isA Canary Bird
      isA Tweety Canary
      isA Opus Penguin
      isA Oscar Ostrich
      isA Robin Bird
      @birdCond isA ?x Bird
      @birdFly can ?x Fly
      Implies $birdCond $birdFly
      @negOpusFly can Opus Fly
      Not $negOpusFly
      @negOscarFly can Oscar Fly
      Not $negOscarFly
    `,
    expected_nl: 'Learned 15 facts'
  },

  // === PROVE: Opus is an Animal (3-step: Opus->Penguin->Bird->Animal) ===
  {
    action: 'prove',
    input_nl: 'Is Opus an Animal?',
    input_dsl: '@goal isA Opus Animal',
    expected_nl: 'True: Opus is an animal'
  },

  // === PROVE: Tweety is an Animal (3-step: Tweety->Canary->Bird->Animal) ===
  {
    action: 'prove',
    input_nl: 'Is Tweety an Animal?',
    input_dsl: '@goal isA Tweety Animal',
    expected_nl: 'True: Tweety is an animal'
  },

  // === PROVE: Exception blocks (Opus cannot fly) ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (exception blocks)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly'
  },

  // === PROVE: Exception blocks (Oscar cannot fly) ===
  {
    action: 'prove',
    input_nl: 'Can Oscar fly? (exception blocks)',
    input_dsl: '@goal can Oscar Fly',
    expected_nl: 'Cannot prove: Oscar can Fly'
  },

  // === PROVE: Oscar is an Animal (3-step: Oscar->Ostrich->Bird->Animal) ===
  {
    action: 'prove',
    input_nl: 'Is Oscar an Animal?',
    input_dsl: '@goal isA Oscar Animal',
    expected_nl: 'True: Oscar is an animal'
  },

  // === SETUP: Driver license with violations ===
  {
    action: 'learn',
    input_nl: 'Good driver needs license AND NOT violations.',
    input_dsl: `
      has Alice License
      @negAliceViol has Alice Violations
      Not $negAliceViol
      has Bob License
      has Bob Violations
      @gdLic has ?x License
      @gdViol has ?x Violations
      @gdNot Not $gdViol
      @gdAnd And $gdLic $gdNot
      @gdConc hasStatus ?x GoodDriver
      Implies $gdAnd $gdConc
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: Tweety is an Animal (3-step: Tweety->Canary->Bird->Animal) ===
  {
    action: 'prove',
    input_nl: 'Is Tweety an Animal?',
    input_dsl: '@goal isA Tweety Animal',
    expected_nl: 'True: Tweety is an animal'
  },

  // === PROVE: Has violations -> not good driver ===
  {
    action: 'prove',
    input_nl: 'Is Bob a good driver? (has violations)',
    input_dsl: '@goal hasStatus Bob GoodDriver',
    expected_nl: 'Cannot prove: Bob is gooddriver'
  },

  // === QUERY: Who can fly ===
  {
    action: 'query',
    input_nl: 'Who can fly?',
    input_dsl: '@q can ?who Fly',
    expected_nl: 'Tweety can Fly. Robin can Fly.'
  },

  // === NEGATIVE ===
  {
    action: 'prove',
    input_nl: 'Can a Rock fly?',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove: Rock can Fly'
  },

  // === SETUP: Deep taxonomy for animals with 6+ levels ===
  {
    action: 'learn',
    input_nl: 'Deep animal taxonomy: Sparrow->Passerine->Bird->Vertebrate->Animal->LivingThing->Entity.',
    input_dsl: `
      isA Passerine Bird
      isA Songbird Passerine
      isA Sparrow Songbird
      isA HouseSparrow Sparrow
      isA JackySparrow HouseSparrow
      isA Bird Vertebrate
      isA Vertebrate Chordate
      isA Chordate Animal
      isA Animal LivingThing
      isA LivingThing Entity
      can JackySparrow Fly
      @negJackSwim can JackySparrow Swim
      Not $negJackSwim
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === PROVE: 10-step deep proof (JackySparrow -> Entity) ===
  {
    action: 'prove',
    input_nl: 'Is JackySparrow an Entity? (requires 10-step chain)',
    input_dsl: '@goal isA JackySparrow Entity',
    expected_nl: 'True: JackySparrow is an entity'
  },

  // === PROVE: 6-step (JackySparrow -> Animal via full chain) ===
  {
    action: 'prove',
    input_nl: 'Is JackySparrow an Animal? (6-step chain)',
    input_dsl: '@goal isA JackySparrow Animal',
    expected_nl: 'True: JackySparrow is an animal'
  },
  {
    action: 'prove',
    input_nl: 'Can JackySparrow swim? (blocked by Not)',
    input_dsl: '@goal can JackySparrow Swim',
    expected_nl: 'Cannot prove: JackySparrow can Swim'
  }
];

export default { name, description, theories, steps };
