/**
 * Suite 06 - Compound Logic
 *
 * Complex And/Or/Not combinations, 3-way conditions, mixed expressions.
 * Tests: nested And, nested Or, And+Or mixed, And+Not.
 */

export const name = 'Compound Logic';
export const description = 'Complex And/Or/Not combinations';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: 3-way And (Motive AND Opportunity AND Means -> Guilty) ===
  {
    action: 'learn',
    input_nl: 'Guilt requires motive AND opportunity AND means.',
    input_dsl: `
      has John Motive
      has John Opportunity
      has John Means
      has Mary Motive
      has Mary Opportunity
      has Charlie Motive
      @guiltM has ?x Motive
      @guiltO has ?x Opportunity
      @guiltMe has ?x Means
      @guiltAnd1 And $guiltM $guiltO
      @guiltAnd2 And $guiltAnd1 $guiltMe
      @guiltConc isGuilty ?x
      Implies $guiltAnd2 $guiltConc
    `,
    expected_nl: 'Learned 13 facts'
  },

  // === PROVE: 3-way And - all satisfied (rule derivation) ===
  {
    action: 'prove',
    input_nl: 'Is John guilty? (has all three)',
    input_dsl: '@goal isGuilty John',
    expected_nl: 'True: John is guilty'
  },

  // === PROVE: 3-way And - missing one (counts as 5 via full search) ===
  {
    action: 'prove',
    input_nl: 'Is Mary guilty? (missing Means)',
    input_dsl: '@goal isGuilty Mary',
    expected_nl: 'Cannot prove: Mary is guilty'
  },

  // === PROVE: 3-way And - missing two (counts as 5 via full search) ===
  {
    action: 'prove',
    input_nl: 'Is Charlie guilty? (only Motive)',
    input_dsl: '@goal isGuilty Charlie',
    expected_nl: 'Cannot prove: Charlie is guilty'
  },

  // === SETUP: 3-way Or (Cash OR Card OR Crypto -> canPay) ===
  {
    action: 'learn',
    input_nl: 'Payment accepts cash OR card OR crypto.',
    input_dsl: `
      has Alice Cash
      has Bob Card
      has Eve Crypto
      has Dan Nothing
      @payCash has ?x Cash
      @payCard has ?x Card
      @payCrypto has ?x Crypto
      @payOr1 Or $payCash $payCard
      @payOr2 Or $payOr1 $payCrypto
      @payConc can ?x Pay
      Implies $payOr2 $payConc
    `,
    expected_nl: 'Learned 11 facts'
  },

  // === PROVE: 3-way Or - branch 1, 2, 3 ===
  {
    action: 'prove',
    input_nl: 'Can Alice pay? (Cash)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay'
  },
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (Card)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay'
  },
  {
    action: 'prove',
    input_nl: 'Can Eve pay? (Crypto)',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay'
  },

  // === PROVE: 3-way Or - none satisfied ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (has Nothing)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay'
  },

  // === SETUP: Mixed And+Or ((Citizen AND Adult) AND (ID OR Passport) -> canVote) ===
  {
    action: 'learn',
    input_nl: 'Voting: (citizen AND adult) AND (ID OR passport).',
    input_dsl: `
      hasProperty Voter Citizen
      hasProperty Voter Adult
      has Voter ID
      hasProperty Minor Citizen
      has Minor ID
      @vCit hasProperty ?x Citizen
      @vAdult hasProperty ?x Adult
      @vAnd1 And $vCit $vAdult
      @vID has ?x ID
      @vPass has ?x Passport
      @vOr Or $vID $vPass
      @vAnd2 And $vAnd1 $vOr
      @vConc can ?x Vote
      Implies $vAnd2 $vConc
    `,
    expected_nl: 'Learned 14 facts'
  },

  // === PROVE: Mixed And+Or - all satisfied ===
  {
    action: 'prove',
    input_nl: 'Can Voter vote?',
    input_dsl: '@goal can Voter Vote',
    expected_nl: 'True: Voter can Vote'
  },

  // === PROVE: Mixed And+Or - And fails ===
  {
    action: 'prove',
    input_nl: 'Can Minor vote? (not Adult)',
    input_dsl: '@goal can Minor Vote',
    expected_nl: 'Cannot prove: Minor can Vote'
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: 'Alice can Pay. Bob can Pay. Eve can Pay.'
  },

  // === SETUP: Deep organization hierarchy with compound requirements ===
  {
    action: 'learn',
    input_nl: 'Corporate hierarchy with promotion rules: Junior->Associate->Senior->Lead->Manager->Director->VP->CTO.',
    input_dsl: `
      isA Junior AssociateLvl
      isA AssociateLvl SeniorLvl
      isA SeniorLvl LeadLvl
      isA LeadLvl ManagerLvl
      isA ManagerLvl DirectorLvl
      isA DirectorLvl VPLvl
      isA VPLvl CTOLvl
      isA CTOLvl ExecutiveLvl
      isA ExecutiveLvl LeadershipLvl
      isA Dave Junior
      isA Sally LeadLvl
      has Dave Performance
      has Dave Tenure
      has Sally Performance
      @promPerf has ?x Performance
      @promTen has ?x Tenure
      @promAnd And $promPerf $promTen
      @promConc can ?x GetPromoted
      Implies $promAnd $promConc
    `,
    expected_nl: 'Learned 19 facts'
  },

  // === PROVE: 9-step deep hierarchy (Junior -> LeadershipLvl) ===
  {
    action: 'prove',
    input_nl: 'Is Dave at LeadershipLvl? (requires 9-step chain)',
    input_dsl: '@goal isA Dave LeadershipLvl',
    expected_nl: 'True: Dave is a leadershiplvl'
  },

  // === PROVE: 6-step deep (Sally -> LeadershipLvl) ===
  {
    action: 'prove',
    input_nl: 'Is Sally at LeadershipLvl? (6-step chain)',
    input_dsl: '@goal isA Sally LeadershipLvl',
    expected_nl: 'True: Sally is a leadershiplvl'
  },

  // === PROVE: Compound rule with deep hierarchy ===
  {
    action: 'prove',
    input_nl: 'Can Dave get promoted? (needs Performance AND Tenure)',
    input_dsl: '@goal can Dave GetPromoted',
    expected_nl: 'True: Dave can GetPromoted'
  },

  // === PROVE: Missing condition in compound ===
  {
    action: 'prove',
    input_nl: 'Can Sally get promoted? (missing Tenure)',
    input_dsl: '@goal can Sally GetPromoted',
    expected_nl: 'Cannot prove: Sally can GetPromoted'
  },

  // === QUERY: Who is at LeadershipLvl (HDC query) ===
  {
    action: 'query',
    input_nl: 'Who is at LeadershipLvl?',
    input_dsl: '@q isA ?person LeadershipLvl',
    expected_nl: 'ExecutiveLvl is a leadershiplvl'
  }
];

export default { name, description, theories, steps };
