/**
 * Suite 05 - Negation & Exceptions (Deep Chains)
 *
 * Not operator blocking proofs with deep hierarchies.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Negation & Exceptions';
export const description = 'Negation blocking with deep chains and complete proofs';

export const theories = ['05-logic.sys2', 'Law/01-relations.sys2'];

export const steps = [
  // === SETUP: Deep bird hierarchy (6 levels) with negation exceptions ===
  {
    action: 'learn',
    input_nl: 'Deep bird taxonomy with flight exceptions: Opus→Penguin→Flightless→Antarctic→Seabird→Bird→Vertebrate→Animal→LivingThing',
    input_dsl: `
      isA Opus Penguin
      isA Penguin Flightless
      isA Flightless Antarctic
      isA Antarctic Seabird
      isA Seabird Bird
      isA Bird Vertebrate
      isA Vertebrate Animal
      isA Animal LivingThing
      isA LivingThing Entity
      isA Tweety Sparrow
      isA Sparrow Songbird
      isA Songbird Passerine
      isA Passerine Bird
      isA Oscar Ostrich
      isA Ostrich Ratite
      isA Ratite Flightless
      @birdCond isA ?x Bird
      @birdFly can ?x Fly
      Implies $birdCond $birdFly
      @negOpusFly can Opus Fly
      Not $negOpusFly
      @negOscarFly can Oscar Fly
      Not $negOscarFly
    `,
    expected_nl: 'Learned 23 facts'
  },

  // === PROVE: 7-step Opus→LivingThing ===
  {
    action: 'prove',
    input_nl: 'Is Opus a LivingThing? (Opus→Penguin→Flightless→Antarctic→Seabird→Bird→Vertebrate→Animal→LivingThing)',
    input_dsl: '@goal isA Opus LivingThing',
    expected_nl: 'True: Opus is a livingthing.',
    proof_nl: 'Opus isA Penguin. Penguin isA Flightless. Flightless isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  },

  // === PROVE: 5-step Tweety→Vertebrate ===
  {
    action: 'prove',
    input_nl: 'Is Tweety a Vertebrate? (Tweety→Sparrow→Songbird→Passerine→Bird→Vertebrate)',
    input_dsl: '@goal isA Tweety Vertebrate',
    expected_nl: 'True: Tweety is a vertebrate.',
    proof_nl: 'Tweety isA Sparrow. Sparrow isA Songbird. Songbird isA Passerine. Passerine isA Bird. Bird isA Vertebrate.'
  },

  // === NEGATIVE: Opus cannot fly (negation blocks with search trace) ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (negation blocks despite being a Bird)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'Cannot prove: Opus can Fly.',
    proof_nl: [
      'Found explicit negation: NOT (Opus can Fly)',
      'Negation blocks inference'
    ]
  },

  // === NEGATIVE: Oscar cannot fly (negation blocks) ===
  {
    action: 'prove',
    input_nl: 'Can Oscar fly? (negation blocks)',
    input_dsl: '@goal can Oscar Fly',
    expected_nl: 'Cannot prove: Oscar can Fly.',
    proof_nl: [
      'Found explicit negation: NOT (Oscar can Fly)',
      'Negation blocks inference'
    ]
  },

  // === PROVE: 6-step Oscar→Animal ===
  {
    action: 'prove',
    input_nl: 'Is Oscar an Animal? (Oscar→Ostrich→Ratite→Flightless→Antarctic→Seabird→Bird→Vertebrate→Animal)',
    input_dsl: '@goal isA Oscar Animal',
    expected_nl: 'True: Oscar is an animal.',
    proof_nl: 'Oscar isA Ostrich. Ostrich isA Ratite. Ratite isA Flightless. Flightless isA Antarctic. Antarctic isA Seabird. Seabird isA Bird. Bird isA Vertebrate. Vertebrate isA Animal.'
  },

  // === SETUP: Driver license with deep role hierarchy ===
  {
    action: 'learn',
    input_nl: 'Good driver rule with deep role hierarchy.',
    input_dsl: `
      isA Alice Professional
      isA Professional Worker
      isA Worker Adult
      isA Adult Person
      isA Person Human
      isA Human Entity
      has Alice License
      @negAliceViol has Alice Violations
      Not $negAliceViol
      isA Bob Professional
      has Bob License
      has Bob Violations
      @gdLic has ?x License
      @gdViol has ?x Violations
      @gdNot Not $gdViol
      @gdAnd And $gdLic $gdNot
      @gdConc hasStatus ?x GoodDriver
      Implies $gdAnd $gdConc
    `,
    expected_nl: 'Learned 18 facts'
  },

  // === PROVE: 5-step Alice→Human ===
  {
    action: 'prove',
    input_nl: 'Is Alice a Human? (Alice→Professional→Worker→Adult→Person→Human)',
    input_dsl: '@goal isA Alice Human',
    expected_nl: 'True: Alice is a human.',
    proof_nl: 'Alice isA Professional. Professional isA Worker. Worker isA Adult. Adult isA Person. Person isA Human.'
  },

  // === NEGATIVE: Bob not good driver (has violations) ===
  {
    action: 'prove',
    input_nl: 'Is Bob a good driver? (has violations, And condition fails)',
    input_dsl: '@goal hasStatus Bob GoodDriver',
    expected_nl: 'Cannot prove: Bob is gooddriver.',
    proof_nl: [
      'Checked rule: IF ((Bob has a license) AND (NOT (Bob has a violations))) THEN (Bob is gooddriver)',
      'Found: Bob has a license',
      'Blocked: NOT (Bob has a violations) is false because Bob has a violations is true',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === PROVE: Tweety can fly (via rule: Bird implies can Fly) ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly? (Tweety→Sparrow→Songbird→Passerine→Bird + rule)',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly.',
    proof_nl: [
      'Tweety is a sparrow',
      'Tweety is a bird',
      'Applied rule: IF (Tweety is a bird) THEN (Tweety can Fly)',
      'Therefore Tweety can Fly'
    ]
  },

  // === NEGATIVE: Rock cannot fly (no type assertions) ===
  {
    action: 'prove',
    input_nl: 'Can a Rock fly? (not in KB)',
    input_dsl: '@goal can Rock Fly',
    expected_nl: 'Cannot prove: Rock can Fly.',
    proof_nl: [
      'Checked rule: IF (Rock is a bird) THEN (Rock can Fly)',
      'Missing: Rock is a bird',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === PROVE: 6-step Tweety→Animal ===
  {
    action: 'prove',
    input_nl: 'Is Tweety an Animal? (Tweety→Sparrow→Songbird→Passerine→Bird→Vertebrate→Animal)',
    input_dsl: '@goal isA Tweety Animal',
    expected_nl: 'True: Tweety is an animal.',
    proof_nl: 'Tweety isA Sparrow. Sparrow isA Songbird. Songbird isA Passerine. Passerine isA Bird. Bird isA Vertebrate. Vertebrate isA Animal.'
  }
];

export default { name, description, theories, steps };
