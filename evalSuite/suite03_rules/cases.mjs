/**
 * Suite 03 - Rule Inference
 *
 * Implies rules with And/Or conditions, backward chaining.
 * Tests: rule application, condition satisfaction, chained rules.
 */

export const name = 'Rule Inference';
export const description = 'Implies rules with And/Or and chained application';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Rules with And/Or conditions ===
  {
    action: 'learn',
    input_nl: 'Rules: Bird->canFly. (Motive AND Opportunity)->Suspect. (Cash OR Card)->canPay.',
    input_dsl: `
      isA Tweety Bird
      isA Penguin Bird
      isA Opus Penguin
      @birdCond isA ?x Bird
      @birdFly can ?x Fly
      Implies $birdCond $birdFly
      has John Motive
      has John Opportunity
      has Mary Motive
      @susCond1 has ?x Motive
      @susCond2 has ?x Opportunity
      @susAnd And $susCond1 $susCond2
      @susConc isSuspect ?x
      Implies $susAnd $susConc
      has Alice Cash
      has Bob Card
      @payCash has ?x Cash
      @payCard has ?x Card
      @payOr Or $payCash $payCard
      @payConc can ?x Pay
      Implies $payOr $payConc
    `,
    expected_nl: 'Learned 21 facts'
  },

  // === PROVE: 3-step (Opus->Penguin->Bird + rule) ===
  {
    action: 'prove',
    input_nl: 'Can Opus fly? (Opus->Penguin->Bird + Bird->canFly)',
    input_dsl: '@goal can Opus Fly',
    expected_nl: 'True: Opus can Fly'
  },

  // === PROVE: And condition with 3-step proof ===
  {
    action: 'prove',
    input_nl: 'Is John a suspect? (has Motive AND Opportunity)',
    input_dsl: '@goal isSuspect John',
    expected_nl: 'True: John is suspect'
  },

  // === PROVE: And condition fails -> counts as 5 ===
  {
    action: 'prove',
    input_nl: 'Is Mary a suspect? (only has Motive)',
    input_dsl: '@goal isSuspect Mary',
    expected_nl: 'Cannot prove: Mary is suspect'
  },

  // === PROVE: Or condition with 3-step proof ===
  {
    action: 'prove',
    input_nl: 'Can Alice pay? (has Cash -> Or rule)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay'
  },

  // === PROVE: Or condition second branch ===
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (has Card -> Or rule)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay'
  },

  // === SETUP: Chained rules (Pay->Purchase->Protected) ===
  {
    action: 'learn',
    input_nl: 'Chain: canPay->canPurchase. (canPurchase AND hasWarranty)->isProtected.',
    input_dsl: `
      has Product Warranty
      @chainPay can ?x Pay
      @chainPurch can ?x Purchase
      Implies $chainPay $chainPurch
      @chainP2 can ?x Purchase
      @chainW has Product Warranty
      @chainAnd And $chainP2 $chainW
      @chainProt hasStatus ?x Protected
      Implies $chainAnd $chainProt
    `,
    expected_nl: 'Learned 9 facts'
  },

  // === PROVE: 2-rule chain ===
  {
    action: 'prove',
    input_nl: 'Is Alice protected? (Pay->Purchase->Protected)',
    input_dsl: '@goal hasStatus Alice Protected',
    expected_nl: 'True: Alice is protected'
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: 'Alice can Pay. Bob can Pay.'
  },

  // === NEGATIVE ===
  {
    action: 'prove',
    input_nl: 'Is Charlie protected?',
    input_dsl: '@goal hasStatus Charlie Protected',
    expected_nl: 'Cannot prove: Charlie is protected'
  },

  // === SETUP: Negation blocking rule inference ===
  {
    action: 'learn',
    input_nl: 'Eve has motive but explicitly NOT opportunity. Frank has nothing.',
    input_dsl: `
      has Eve Motive
      @negEveOpp has Eve Opportunity
      Not $negEveOpp
    `,
    expected_nl: 'Learned 3 facts'
  },

  // === PROVE: Negation blocks And rule ===
  {
    action: 'prove',
    input_nl: 'Is Eve a suspect? (has Motive, but NOT Opportunity - should fail)',
    input_dsl: '@goal isSuspect Eve',
    expected_nl: 'Cannot prove: Eve is suspect'
  },

  // === PROVE: No facts at all blocks rule ===
  {
    action: 'prove',
    input_nl: 'Is Frank a suspect? (has nothing)',
    input_dsl: '@goal isSuspect Frank',
    expected_nl: 'Cannot prove: Frank is suspect'
  },

  // === SETUP: Negated payment method ===
  {
    action: 'learn',
    input_nl: 'Dan had his card blocked.',
    input_dsl: `
      @negDanCard has Dan Card
      Not $negDanCard
    `,
    expected_nl: 'Learned 2 facts'
  },

  // === PROVE: Negated payment blocks Or rule ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (Card is negated, no Cash)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay'
  }
];

export default { name, description, theories, steps };
