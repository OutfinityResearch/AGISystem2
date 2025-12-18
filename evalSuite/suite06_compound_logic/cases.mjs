/**
 * Suite 06 - Compound Logic (Deep Chains)
 *
 * Complex And/Or/Not with deep hierarchies.
 * Every proof must have 5+ steps with complete demonstration.
 */

export const name = 'Compound Logic';
export const description = 'Complex And/Or/Not with deep chains and complete proofs';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Deep hierarchy + 3-way And rule ===
  {
    action: 'learn',
    input_nl: 'Guilt requires motive AND opportunity AND means. Deep suspect hierarchy.',
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
      @guiltM has ?x Motive
      @guiltO has ?x Opportunity
      @guiltMe has ?x Means
      @guiltAnd1 And $guiltM $guiltO
      @guiltAnd2 And $guiltAnd1 $guiltMe
      @guiltConc isGuilty ?x
      Implies $guiltAnd2 $guiltConc
    `,
    expected_nl: 'Learned 25 facts'
  },

  // === PROVE: 5-step John is guilty (3-way And satisfied) ===
  {
    action: 'prove',
    input_nl: 'Is John guilty? (has Motive AND Opportunity AND Means)',
    input_dsl: '@goal isGuilty John',
    expected_nl: 'True: John is guilty. Proof: Applied rule: Implies @guiltAnd2 @guiltConc. John has a motive. John has an opportunity. And condition satisfied: has John Motive, has John Opportunity. John has a means. And condition satisfied: has John Means. Therefore John is guilty.'
  },

  // === NEGATIVE: Mary missing Means ===
  {
    action: 'prove',
    input_nl: 'Is Mary guilty? (missing Means)',
    input_dsl: '@goal isGuilty Mary',
    expected_nl: 'Cannot prove: Mary is guilty. Searched @goal isGuilty Mary in KB. Not found.'
  },

  // === NEGATIVE: Charlie missing two conditions ===
  {
    action: 'prove',
    input_nl: 'Is Charlie guilty? (only has Motive)',
    input_dsl: '@goal isGuilty Charlie',
    expected_nl: 'Cannot prove: Charlie is guilty. Searched @goal isGuilty Charlie in KB. Not found.'
  },

  // === SETUP: Deep payment hierarchy + 3-way Or rule ===
  {
    action: 'learn',
    input_nl: 'Payment: deep hierarchy + Cash OR Card OR Crypto.',
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
    input_nl: 'Can Alice pay? (has Cash)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay. Proof: Applied rule: Implies @payOr2 @payConc. Alice has a cash. Or condition satisfied via has Alice Cash. Or condition satisfied. Therefore Alice can Pay.'
  },

  // === PROVE: Bob can pay via Card (Or branch 2) ===
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (has Card)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay. Proof: Applied rule: Implies @payOr2 @payConc. Bob has a card. Or condition satisfied via has Bob Card. Or condition satisfied. Therefore Bob can Pay.'
  },

  // === PROVE: Eve can pay via Crypto (Or branch 3) ===
  {
    action: 'prove',
    input_nl: 'Can Eve pay? (has Crypto)',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay. Proof: Applied rule: Implies @payOr2 @payConc. Eve has a crypto. Or condition satisfied via has Eve Crypto. Therefore Eve can Pay.'
  },

  // === NEGATIVE: Dan has Nothing (Or not satisfied) ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (has Nothing)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay. Search: Dan isA Guest. Guest isA Visitor. Visitor isA Participant. Participant isA Actor. Actor isA Entity. Checked rule: Implies @payOr2 @payConc. Missing: has Dan Cash, has Dan Card, has Dan Crypto.. No can Pay facts found in KB.'
  },

  // === SETUP: Deep voting hierarchy + mixed And+Or ===
  {
    action: 'learn',
    input_nl: 'Voting: (Citizen AND Adult) AND (ID OR Passport). Deep hierarchy.',
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
    input_nl: 'Can Voter vote? (Citizen AND Adult AND (ID OR Passport))',
    input_dsl: '@goal can Voter Vote',
    expected_nl: 'True: Voter can Vote. Proof: Applied rule: Implies @vAnd2 @vConc. Voter has Citizen. Voter has Adult. And condition satisfied: hasProperty Voter Citizen, hasProperty Voter Adult. Voter has an id. Or condition satisfied via has Voter ID. And condition satisfied. Therefore Voter can Vote.'
  },

  // === NEGATIVE: Minor cannot vote (not Adult) ===
  {
    action: 'prove',
    input_nl: 'Can Minor vote? (Citizen but not Adult)',
    input_dsl: '@goal can Minor Vote',
    expected_nl: 'Cannot prove: Minor can Vote. Search: Minor isA Child. Child isA Dependent. Dependent isA Person. Person isA Human. Human isA Entity. Checked rule: Implies @payOr2 @payConc. Missing: has Minor Cash, has Minor Card, has Minor Crypto.. No can Vote facts found in KB.'
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: 'Alice can Pay. Eve can Pay. Bob can Pay.',
    
  },

  // === SETUP: Deep corporate hierarchy + promotion rule ===
  {
    action: 'learn',
    input_nl: 'Corporate: Junior→Associate→Senior→Lead→Manager→Director→VP→CTO→Executive→Leadership.',
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
    input_nl: 'Is Dave at LeadershipLvl? (9-step chain)',
    input_dsl: '@goal isA Dave LeadershipLvl',
    expected_nl: 'True: Dave is a leadershiplvl. Proof: Dave isA Junior. Junior isA AssociateLvl. AssociateLvl isA SeniorLvl. SeniorLvl isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl.'
  },

  // === PROVE: 5-step Sally→LeadershipLvl ===
  {
    action: 'prove',
    input_nl: 'Is Sally at LeadershipLvl? (5-step chain)',
    input_dsl: '@goal isA Sally LeadershipLvl',
    expected_nl: 'True: Sally is a leadershiplvl. Proof: Sally isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl.'
  },

  // === PROVE: Dave can get promoted (And rule satisfied) ===
  {
    action: 'prove',
    input_nl: 'Can Dave get promoted? (Performance AND Tenure)',
    input_dsl: '@goal can Dave GetPromoted',
    expected_nl: 'True: Dave can GetPromoted. Proof: Applied rule: Implies @promAnd @promConc. Dave has a performance. Dave has a tenure. And condition satisfied: has Dave Performance, has Dave Tenure. Therefore Dave can GetPromoted.'
  },

  // === NEGATIVE: Sally cannot get promoted (missing Tenure) ===
  {
    action: 'prove',
    input_nl: 'Can Sally get promoted? (missing Tenure)',
    input_dsl: '@goal can Sally GetPromoted',
    expected_nl: 'Cannot prove: Sally can GetPromoted. Search: Sally isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl. Checked rule: Implies @payOr2 @payConc. Missing: has Sally Cash, has Sally Card, has Sally Crypto.. No can GetPromoted facts found in KB.'
  }
];

export default { name, description, theories, steps };
