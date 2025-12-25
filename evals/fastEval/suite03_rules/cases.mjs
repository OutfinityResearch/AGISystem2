/**
 * Suite 03 - Rule Inference (Deep Chains)
 *
 * Implies rules with deep hierarchies and chained rules.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Rule Inference';
export const description = 'Implies rules with deep hierarchies and complete proof traces';

export const theories = ['05-logic.sys2', 'Law/01-relations.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy for flying (6 levels) ===
  {
    action: 'learn',
    input_nl: 'Deep hierarchy: Opus→Penguin→AntarcticBird→Seabird→Bird→FlyingAnimal→Vertebrate→Animal',
    input_dsl: `
      isA Opus Penguin
      isA Penguin AntarcticBird
      isA AntarcticBird Seabird
      isA Seabird Bird
      isA Bird FlyingAnimal
      isA FlyingAnimal Vertebrate
      isA Vertebrate Animal
      isA Tweety Sparrow
      isA Sparrow Songbird
      isA Songbird Passerine
      isA Passerine Bird
      @birdCond isA ?x Bird
      @birdFly can ?x Fly
      Implies $birdCond $birdFly
    `,
    expected_nl: 'Learned 14 facts'
  },

  // === PROVE: 6-step (Opus→Bird via 4 intermediates + rule) ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (Opus→Penguin→AntarcticBird→Seabird→Bird + rule→canFly)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'True: Opus can Fly.',
    proof_nl: [
      'Opus is a penguin',
      'Opus is a bird',
      'Applied rule: IF (Opus is a bird) THEN (Opus can Fly)',
      'Therefore Opus can Fly'
    ]
  },

  // === PROVE: 5-step (Tweety→Bird via 3 intermediates + rule) ===
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

  // === SETUP: Deep suspect chain (7 levels for roles + And rule) ===
  {
    action: 'learn',
    input_nl: 'Deep role hierarchy: Detective→Investigator→LawEnforcer→PublicServant→Professional→Person→Entity',
    input_dsl: `
      isA John Detective
      isA Detective Investigator
      isA Investigator LawEnforcer
      isA LawEnforcer PublicServant
      isA PublicServant Professional
      isA Professional Person
      isA Person Entity
      has John Motive
      has John Opportunity
      has John Alibi
      has Mary Motive
      isA Mary Civilian
      isA Civilian Person
      @Suspect:isSuspect __Relation
      @susCond1 has ?x Motive
      @susCond2 has ?x Opportunity
      @susAnd And $susCond1 $susCond2
      @susConc isSuspect ?x
      Implies $susAnd $susConc
    `,
    expected_nl: 'Learned 18 facts'
  },

  // === PROVE: 5-step And rule (has Motive + has Opportunity + rule application) ===
  {
    action: 'prove',
    input_nl: 'Is John a suspect? (has Motive AND has Opportunity, both verified)',
    input_dsl: '@goal isSuspect John',
    expected_nl: 'True: John is suspect.',
    proof_nl: [
      'John has a motive',
      'John has an opportunity',
      'And condition satisfied: John has a motive, John has an opportunity',
      'Applied rule: IF ((John has a motive) AND (John has an opportunity)) THEN (John is suspect)',
      'Therefore John is suspect'
    ]
  },

  // === NEGATIVE: 6-step search showing what failed ===
  {
    action: 'prove',
    input_nl: 'Is Mary a suspect? (has Motive but NOT Opportunity)',
    input_dsl: '@goal isSuspect Mary',
    expected_nl: 'Cannot prove: Mary is suspect.',
    proof_nl: [
      'Checked rule: IF ((Mary has a motive) AND (Mary has an opportunity)) THEN (Mary is suspect)',
      'Found: Mary has a motive',
      'Missing: Mary has an opportunity',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === SETUP: Deep payment chain (6 levels Or rule + chained rules) ===
  {
    action: 'learn',
    input_nl: 'Payment hierarchy: CreditCard→Card→PaymentMethod. Chain: canPay→canPurchase→canOwn→canUse→isCapable',
    input_dsl: `
      isA Alice Customer
      isA Customer Buyer
      isA Buyer Participant
      isA Participant Actor
      isA Actor Entity
      has Alice CreditCard
      isA CreditCard Card
      isA Card PaymentMethod
      has Bob DebitCard
      isA DebitCard Card
      has Eve Cash
      isA Cash PaymentMethod
      @payCond has ?x PaymentMethod
      @payConc can ?x Pay
      Implies $payCond $payConc
      @chainPay can ?x Pay
      @chainPurch can ?x Purchase
      Implies $chainPay $chainPurch
      @chainPurch2 can ?x Purchase
      @chainOwn can ?x Own
      Implies $chainPurch2 $chainOwn
      @chainOwn2 can ?x Own
      @chainUse can ?x Use
      Implies $chainOwn2 $chainUse
      @chainUse2 can ?x Use
      @chainCapable isCapable ?x
      Implies $chainUse2 $chainCapable
    `,
    expected_nl: 'Learned 27 facts'
  },

  // === PROVE: 6-step (Alice has CreditCard→Card→PaymentMethod + rule) ===
  {
    action: 'prove',
    input_nl: 'Can Alice pay? (CreditCard→Card→PaymentMethod + rule)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay.',
    proof_nl: [
      'Alice has a creditcard',
      'Card is a paymentmethod',
      'Value-type inheritance: inferred Alice has a paymentmethod',
      'Applied rule: IF (Alice has a paymentmethod) THEN (Alice can Pay)',
      'Therefore Alice can Pay'
    ]
  },

  // === PROVE: 5-step chained rules (Pay→Purchase→Own→Use→Capable) ===
  {
    action: 'prove',
    input_nl: 'Is Alice capable? (canPay→canPurchase→canOwn→canUse→isCapable)',
    input_dsl: '@goal isCapable Alice',
    expected_nl: 'True: Alice is isCapable.',
    proof_nl: [
      'Value-type inheritance: inferred Alice has a paymentmethod',
      'Applied rule: IF (Alice has a paymentmethod) THEN (Alice can Pay)',
      'Applied rule: IF (Alice can Use) THEN (Alice is isCapable)',
      'Therefore Alice is isCapable'
    ]
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: [
      'Alice can Pay.',
      'Bob can Pay.',
      'Eve can Pay.'
    ],
    proof_nl: [
      'Therefore Alice can Pay',
      'Therefore Bob can Pay',
      'Therefore Eve can Pay'
    ]
  },

  // === NEGATIVE: Deep search failure (5+ steps) ===
  {
    action: 'prove',
    input_nl: 'Can Charlie pay? (has no payment method)',
    input_dsl: '@goal can Charlie Pay',
    expected_nl: 'Cannot prove: Charlie can Pay.',
    proof_nl: [
      'Checked rule: IF (Charlie has a paymentmethod) THEN (Charlie can Pay)',
      'Missing: Charlie has a paymentmethod',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === SETUP: Negation with deep hierarchy ===
  {
    action: 'learn',
    input_nl: 'Dan had his account frozen (negated payment capability)',
    input_dsl: `
      isA Dan Customer
      isA Dan Buyer
      isA Dan Participant
      has Dan ExpiredCard
      isA ExpiredCard Card
      @negDanPay can Dan Pay
      Not $negDanPay
    `,
    expected_nl: 'Learned 7 facts'
  },

  // === NEGATIVE: Negation blocks inference despite having card ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (has ExpiredCard but payment is negated)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay.',
    proof_nl: 'Found explicit negation: NOT (Dan can Pay)'
  },

  // === PROVE: 5-step Bob payment (different path) ===
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (DebitCard→Card→PaymentMethod + rule)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay.',
    proof_nl: [
      'Value-type inheritance: inferred Bob has a paymentmethod',
      'Applied rule: IF (Bob has a paymentmethod) THEN (Bob can Pay)',
      'Therefore Bob can Pay'
    ]
  },

  // === PROVE: 5-step Eve payment (Cash path) ===
  {
    action: 'prove',
    input_nl: 'Can Eve pay? (Cash→PaymentMethod + rule)',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay.',
    proof_nl: [
      'Value-type inheritance: inferred Eve has a paymentmethod',
      'Applied rule: IF (Eve has a paymentmethod) THEN (Eve can Pay)',
      'Therefore Eve can Pay'
    ]
  }
];

export default { name, description, theories, steps };
