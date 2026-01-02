/**
 * Suite 06 - Compound Logic (Deep Chains)
 *
 * Complex And/Or/Not with deep hierarchies.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Compound Logic';
export const description = 'Complex And/Or/Not with deep chains and complete proofs';

export const theories = ['Law/01-relations.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy + 3-way And rule ===
  {
    action: 'learn',
    input_nl: 'John is a Detective. Detective is an Investigator. Investigator is a Professional. Professional is a Person. Person is a Human. Human is an Entity. John has Motive. John has Opportunity. John has Means. Mary is a Civilian. Civilian is a Citizen. Citizen is a Person. Mary has Motive. Mary has Opportunity. Charlie is an Outsider. Outsider is an Unknown. Unknown is an Entity. Charlie has Motive. IF (((?x has Motive) AND (?x has Opportunity)) AND (?x has Means)) THEN (?x isGuilty).',
    input_dsl: `
      isA John Detective
      isA Detective Investigator
      isA Investigator Professional
      isA Professional Person
      isA Person Human
      isA Human Entity
      has John Motive
      has John Opportunity
      has John Means
      isA Mary Civilian
      isA Civilian Citizen
      isA Citizen Person
      has Mary Motive
      has Mary Opportunity
      isA Charlie Outsider
      isA Outsider Unknown
      isA Unknown Entity
      has Charlie Motive
      @Guilty:isGuilty __Relation
      @guiltM has ?x Motive
      @guiltO has ?x Opportunity
      @guiltMe has ?x Means
      @guiltAnd1 And $guiltM $guiltO
      @guiltAnd2 And $guiltAnd1 $guiltMe
      @guiltConc isGuilty ?x
      Implies $guiltAnd2 $guiltConc
    `,
    expected_nl: 'Learned 26 facts'
  },

  // === PROVE: 5-step John is guilty (3-way And satisfied) ===
  {
    action: 'prove',
    input_nl: 'John isGuilty.',
    input_dsl: '@goal isGuilty John',
    expected_nl: 'True: John is guilty.',
    proof_nl: [
      'John has a motive',
      'John has an opportunity',
      'John has a means',
      'Applied rule: IF (((John has a motive) AND (John has an opportunity)) AND (John has a means)) THEN (John is guilty)',
      'Therefore John is guilty'
    ]
  },

  // === NEGATIVE: Mary missing Means ===
  {
    action: 'prove',
    input_nl: 'Mary isGuilty.',
    input_dsl: '@goal isGuilty Mary',
    expected_nl: 'Cannot prove: Mary is guilty.',
    proof_nl: [
      'Checked rule: IF (((Mary has a motive) AND (Mary has an opportunity)) AND (Mary has a means)) THEN (Mary is guilty)',
      'Found: Mary has a motive',
      'Found: Mary has an opportunity',
      'Missing: Mary has a means',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === NEGATIVE: Charlie missing two conditions ===
  {
    action: 'prove',
    input_nl: 'Charlie isGuilty.',
    input_dsl: '@goal isGuilty Charlie',
    expected_nl: 'Cannot prove: Charlie is guilty.',
    proof_nl: [
      'Checked rule: IF (((Charlie has a motive) AND (Charlie has an opportunity)) AND (Charlie has a means)) THEN (Charlie is guilty)',
      'Found: Charlie has a motive',
      'Missing: Charlie has an opportunity',
      'Missing: Charlie has a means',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === SETUP: Deep payment hierarchy + 3-way Or rule ===
  {
    action: 'learn',
    input_nl: 'Alice is a Customer. Customer is a Buyer. Buyer is a Participant. Participant is an Actor. Actor is an Entity. Alice has Cash. Bob is a Member. Member is a Subscriber. Subscriber is an User. User is a Participant. Bob has Card. Eve is a Trader. Trader is an Investor. Investor is a Participant. Eve has Crypto. Dan is a Guest. Guest is a Visitor. Visitor is a Participant. Dan has Nothing. IF (((?x has Cash) OR (?x has Card)) OR (?x has Crypto)) THEN (?x can Pay).',
    input_dsl: `
      isA Alice Customer
      isA Customer Buyer
      isA Buyer Participant
      isA Participant Actor
      isA Actor Entity
      has Alice Cash
      isA Bob Member
      isA Member Subscriber
      isA Subscriber User
      isA User Participant
      has Bob Card
      isA Eve Trader
      isA Trader Investor
      isA Investor Participant
      has Eve Crypto
      isA Dan Guest
      isA Guest Visitor
      isA Visitor Participant
      has Dan Nothing
      @payCash has ?x Cash
      @payCard has ?x Card
      @payCrypto has ?x Crypto
      @payOr1 Or $payCash $payCard
      @payOr2 Or $payOr1 $payCrypto
      @payConc can ?x Pay
      Implies $payOr2 $payConc
    `,
    expected_nl: 'Learned 26 facts'
  },

  // === PROVE: Alice can pay via Cash (Or branch 1) ===
  {
    action: 'prove',
    input_nl: 'Alice can Pay.',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay.',
    proof_nl: [
      'Alice has a cash',
      'Or condition satisfied via: Alice has a cash',
      'Applied rule: IF (((Alice has a cash) OR (Alice has a card)) OR (Alice has a crypto)) THEN (Alice can Pay)',
      'Therefore Alice can Pay'
    ]
  },

  // === PROVE: Bob can pay via Card (Or branch 2) ===
  {
    action: 'prove',
    input_nl: 'Bob can Pay.',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay.',
    proof_nl: [
      'Bob has a card',
      'Or condition satisfied via: Bob has a card',
      'Applied rule: IF (((Bob has a cash) OR (Bob has a card)) OR (Bob has a crypto)) THEN (Bob can Pay)',
      'Therefore Bob can Pay'
    ]
  },

  // === PROVE: Eve can pay via Crypto (Or branch 3) ===
  {
    action: 'prove',
    input_nl: 'Eve can Pay.',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay.',
    proof_nl: [
      'Eve has a crypto',
      'Or condition satisfied via: Eve has a crypto',
      'Applied rule: IF (((Eve has a cash) OR (Eve has a card)) OR (Eve has a crypto)) THEN (Eve can Pay)',
      'Therefore Eve can Pay'
    ]
  },

  // === NEGATIVE: Dan has Nothing (Or not satisfied) ===
  {
    action: 'prove',
    input_nl: 'Dan can Pay.',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay.',
    proof_nl: [
      'Checked rule: IF (((Dan has a cash) OR (Dan has a card)) OR (Dan has a crypto)) THEN (Dan can Pay)',
      'Missing: Dan has a cash',
      'Missing: Dan has a card',
      'Missing: Dan has a crypto',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === SETUP: Deep voting hierarchy + mixed And+Or ===
  {
    action: 'learn',
    input_nl: 'Voter is a Resident. Resident is an Inhabitant. Inhabitant is an Occupant. Occupant is a Person. Person is a Human. Human is an Entity. Voter hasProperty Citizen. Voter hasProperty Adult. Voter has ID. Minor is a Child. Child is a Dependent. Dependent is a Person. Minor hasProperty Citizen. Minor has ID. IF (((?x hasProperty Citizen) AND (?x hasProperty Adult)) AND ((?x has ID) OR (?x has Passport))) THEN (?x can Vote).',
    input_dsl: `
      isA Voter Resident
      isA Resident Inhabitant
      isA Inhabitant Occupant
      isA Occupant Person
      isA Person Human
      isA Human Entity
      hasProperty Voter Citizen
      hasProperty Voter Adult
      has Voter ID
      isA Minor Child
      isA Child Dependent
      isA Dependent Person
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
    expected_nl: 'Learned 23 facts'
  },

  // === PROVE: Voter can vote (mixed And+Or satisfied) ===
  {
    action: 'prove',
    input_nl: 'Voter can Vote.',
    input_dsl: '@goal can Voter Vote',
    expected_nl: 'True: Voter can Vote.',
    proof_nl: [
      'Voter has Citizen',
      'Voter has Adult',
      'Or condition satisfied via: Voter has an id',
      'Applied rule: IF (((Voter has Citizen) AND (Voter has Adult)) AND ((Voter has an id) OR (Voter has a passport))) THEN (Voter can Vote)',
      'Therefore Voter can Vote'
    ]
  },

  // === NEGATIVE: Minor cannot vote (not Adult) ===
  {
    action: 'prove',
    input_nl: 'Minor can Vote.',
    input_dsl: '@goal can Minor Vote',
    expected_nl: 'Cannot prove: Minor can Vote.',
    proof_nl: [
      'Checked rule: IF (((Minor has Citizen) AND (Minor has Adult)) AND ((Minor has an id) OR (Minor has a passport))) THEN (Minor can Vote)',
      'Found: Minor has Citizen',
      'Found: Minor has an id',
      'Missing: Minor has Adult',
      'Therefore the rule antecedent is not satisfied'
    ]
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: '?who can Pay.',
    input_dsl: '@q can ?who Pay',
    expected_nl: [
      'Alice can Pay.',
      'Bob can Pay.',
      'Eve can Pay.'
    ],
    proof_nl: [
      'Or condition satisfied via: Alice has a cash',
      'Or condition satisfied via: Bob has a card',
      'Or condition satisfied via: Eve has a crypto'
    ]
  },

  // === SETUP: Deep corporate hierarchy + promotion rule ===
  {
    action: 'learn',
    input_nl: 'Junior is an AssociateLvl. AssociateLvl is a SeniorLvl. SeniorLvl is a LeadLvl. LeadLvl is a ManagerLvl. ManagerLvl is a DirectorLvl. DirectorLvl is a VPLvl. VPLvl is a CTOLvl. CTOLvl is an ExecutiveLvl. ExecutiveLvl is a LeadershipLvl. Dave is a Junior. Sally is a LeadLvl. Dave has Performance. Dave has Tenure. Sally has Performance. IF ((?x has Performance) AND (?x has Tenure)) THEN (?x can GetPromoted).',
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

  // === PROVE: 9-step Dave→LeadershipLvl ===
  {
    action: 'prove',
    input_nl: 'Dave is a LeadershipLvl.',
    input_dsl: '@goal isA Dave LeadershipLvl',
    expected_nl: 'True: Dave is a leadershiplvl.',
    proof_nl: 'Dave isA Junior. Junior isA AssociateLvl. AssociateLvl isA SeniorLvl. SeniorLvl isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl.'
  },

  // === PROVE: 5-step Sally→LeadershipLvl ===
  {
    action: 'prove',
    input_nl: 'Sally is a LeadershipLvl.',
    input_dsl: '@goal isA Sally LeadershipLvl',
    expected_nl: 'True: Sally is a leadershiplvl.',
    proof_nl: 'Sally isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl.'
  },

  // === PROVE: Dave can get promoted (And rule satisfied) ===
  {
    action: 'prove',
    input_nl: 'Dave can GetPromoted.',
    input_dsl: '@goal can Dave GetPromoted',
    expected_nl: 'True: Dave can GetPromoted.',
    proof_nl: [
      'Dave has a performance',
      'Dave has a tenure',
      'And condition satisfied: Dave has a performance, Dave has a tenure',
      'Applied rule: IF ((Dave has a performance) AND (Dave has a tenure)) THEN (Dave can GetPromoted)',
      'Therefore Dave can GetPromoted'
    ]
  },

  // === NEGATIVE: Sally cannot get promoted (missing Tenure) ===
  {
    action: 'prove',
    input_nl: 'Sally can GetPromoted.',
    input_dsl: '@goal can Sally GetPromoted',
    expected_nl: 'Cannot prove: Sally can GetPromoted.',
    proof_nl: [
      'Checked rule: IF ((Sally has a performance) AND (Sally has a tenure)) THEN (Sally can GetPromoted)',
      'Found: Sally has a performance',
      'Missing: Sally has a tenure',
      'Therefore the rule antecedent is not satisfied'
    ]
  }
];

export default { name, description, theories, steps };
