/**
 * Suite 03 - Rule Inference (Deep Chains)
 *
 * Implies rules with deep hierarchies and chained rules.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Rule Inference';
export const description = 'Implies rules with deep hierarchies and complete proof traces';

export const theories = ['05-logic.sys2'];

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
    expected_nl: 'True: Opus can Fly. Proof: Opus isA Penguin. Penguin isA AntarcticBird. AntarcticBird isA Seabird. Seabird isA Bird. Applied rule: isA Bird implies can Fly. Therefore Opus can Fly.'
  },

  // === PROVE: 5-step (Tweety→Bird via 3 intermediates + rule) ===
  {
    action: 'prove',
    input_nl: 'Can Tweety fly? (Tweety→Sparrow→Songbird→Passerine→Bird + rule)',
    input_dsl: '@goal can Tweety Fly',
    expected_nl: 'True: Tweety can Fly. Proof: Tweety isA Sparrow. Sparrow isA Songbird. Songbird isA Passerine. Passerine isA Bird. Applied rule: isA Bird implies can Fly. Therefore Tweety can Fly.'
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
      @susCond1 has ?x Motive
      @susCond2 has ?x Opportunity
      @susAnd And $susCond1 $susCond2
      @susConc isSuspect ?x
      Implies $susAnd $susConc
    `,
    expected_nl: 'Learned 19 facts'
  },

  // === PROVE: 5-step And rule (has Motive + has Opportunity + rule application) ===
  {
    action: 'prove',
    input_nl: 'Is John a suspect? (has Motive AND has Opportunity, both verified)',
    input_dsl: '@goal isSuspect John',
    expected_nl: 'True: John is suspect. Proof: John has Motive. John has Opportunity. And condition satisfied. Applied rule: (has Motive AND has Opportunity) implies isSuspect. Therefore John is suspect.'
  },

  // === NEGATIVE: 6-step search showing what failed ===
  {
    action: 'prove',
    input_nl: 'Is Mary a suspect? (has Motive but NOT Opportunity)',
    input_dsl: '@goal isSuspect Mary',
    expected_nl: 'Cannot prove: Mary is suspect. Search: Checked rule (Motive AND Opportunity)->Suspect. Verified: Mary isA Civilian. Civilian isA Person. Found: Mary has Motive. Searched: has Mary Opportunity in KB. Missing: Mary has Opportunity. And condition not satisfied.'
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
    expected_nl: 'Learned 26 facts'
  },

  // === PROVE: 6-step (Alice has CreditCard→Card→PaymentMethod + rule) ===
  {
    action: 'prove',
    input_nl: 'Can Alice pay? (CreditCard→Card→PaymentMethod + rule)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay. Proof: Alice has CreditCard. CreditCard isA Card. Card isA PaymentMethod. Alice has PaymentMethod. Applied rule: has PaymentMethod implies can Pay. Therefore Alice can Pay.'
  },

  // === PROVE: 5-step chained rules (Pay→Purchase→Own→Use→Capable) ===
  {
    action: 'prove',
    input_nl: 'Is Alice capable? (canPay→canPurchase→canOwn→canUse→isCapable)',
    input_dsl: '@goal isCapable Alice',
    expected_nl: 'True: Alice is capable. Proof: Alice can Pay. Applied rule: can Pay implies can Purchase. Alice can Purchase. Applied rule: can Purchase implies can Own. Alice can Own. Applied rule: can Own implies can Use. Alice can Use. Applied rule: can Use implies isCapable. Therefore Alice is capable.'
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: 'Alice can Pay. Bob can Pay. Eve can Pay.'
  },

  // === NEGATIVE: Deep search failure (5+ steps) ===
  {
    action: 'prove',
    input_nl: 'Can Charlie pay? (has no payment method)',
    input_dsl: '@goal can Charlie Pay',
    expected_nl: 'Cannot prove: Charlie can Pay. Search: Checked rule: has PaymentMethod implies can Pay. Searched: has Charlie CreditCard. Not found. Searched: has Charlie DebitCard. Not found. Searched: has Charlie Cash. Not found. Searched: has Charlie Card. Not found. Charlie has no PaymentMethod. No applicable rule found.'
  },

  // === SETUP: Negation with deep hierarchy ===
  {
    action: 'learn',
    input_nl: 'Eve had her account frozen (negated payment capability)',
    input_dsl: `
      isA Dan Customer
      isA Dan Buyer
      isA Dan Participant
      has Dan ExpiredCard
      isA ExpiredCard Card
      @negDanPay can Dan Pay
      Not $negDanPay
    `,
    expected_nl: 'Learned 6 facts'
  },

  // === NEGATIVE: Negation blocks inference despite having card ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (has ExpiredCard but payment is negated)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay. Search: Dan has ExpiredCard. ExpiredCard isA Card. Card isA PaymentMethod. Rule would apply but found explicit negation: Not(can Dan Pay). Negation blocks inference.'
  },

  // === PROVE: 5-step Bob payment (different path) ===
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (DebitCard→Card→PaymentMethod + rule)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay. Proof: Bob has DebitCard. DebitCard isA Card. Card isA PaymentMethod. Bob has PaymentMethod. Applied rule: has PaymentMethod implies can Pay. Therefore Bob can Pay.'
  },

  // === PROVE: 5-step Eve payment (Cash path) ===
  {
    action: 'prove',
    input_nl: 'Can Eve pay? (Cash→PaymentMethod + rule)',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay. Proof: Eve has Cash. Cash isA PaymentMethod. Eve has PaymentMethod. Applied rule: has PaymentMethod implies can Pay. Therefore Eve can Pay.'
  }
];

export default { name, description, theories, steps };
