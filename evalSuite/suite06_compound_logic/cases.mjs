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
    expected_nl: 'True: John is guilty. Proof: John has Motive. John has Opportunity. And(Motive, Opportunity) satisfied. John has Means. And(And(M,O), Means) satisfied. Applied rule: 3-way And implies isGuilty. Therefore John is guilty.'
  },

  // === NEGATIVE: Mary missing Means ===
  {
    action: 'prove',
    input_nl: 'Is Mary guilty? (missing Means)',
    input_dsl: '@goal isGuilty Mary',
    expected_nl: 'Cannot prove: Mary is guilty. Search: Mary isA Civilian. Civilian isA Citizen. Citizen isA Person. Checked rule: (Motive AND Opportunity AND Means) implies isGuilty. Mary has Motive. Mary has Opportunity. Searched: has Mary Means. Not found. 3-way And not satisfied.'
  },

  // === NEGATIVE: Charlie missing two conditions ===
  {
    action: 'prove',
    input_nl: 'Is Charlie guilty? (only has Motive)',
    input_dsl: '@goal isGuilty Charlie',
    expected_nl: 'Cannot prove: Charlie is guilty. Search: Charlie isA Outsider. Outsider isA Unknown. Unknown isA Entity. Checked rule: (Motive AND Opportunity AND Means) implies isGuilty. Charlie has Motive. Searched: has Charlie Opportunity. Not found. Searched: has Charlie Means. Not found. 3-way And not satisfied.'
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
    expected_nl: 'Learned 24 facts'
  },

  // === PROVE: Alice can pay via Cash (Or branch 1) ===
  {
    action: 'prove',
    input_nl: 'Can Alice pay? (has Cash)',
    input_dsl: '@goal can Alice Pay',
    expected_nl: 'True: Alice can Pay. Proof: Alice isA Customer. Customer isA Buyer. Buyer isA Participant. Alice has Cash. Or(Cash, Card) satisfied via Cash. Or(Or(Cash,Card), Crypto) satisfied. Applied rule: 3-way Or implies can Pay. Therefore Alice can Pay.'
  },

  // === PROVE: Bob can pay via Card (Or branch 2) ===
  {
    action: 'prove',
    input_nl: 'Can Bob pay? (has Card)',
    input_dsl: '@goal can Bob Pay',
    expected_nl: 'True: Bob can Pay. Proof: Bob isA Member. Member isA Subscriber. Subscriber isA User. User isA Participant. Bob has Card. Or(Cash, Card) satisfied via Card. Or(Or(Cash,Card), Crypto) satisfied. Applied rule: 3-way Or implies can Pay. Therefore Bob can Pay.'
  },

  // === PROVE: Eve can pay via Crypto (Or branch 3) ===
  {
    action: 'prove',
    input_nl: 'Can Eve pay? (has Crypto)',
    input_dsl: '@goal can Eve Pay',
    expected_nl: 'True: Eve can Pay. Proof: Eve isA Trader. Trader isA Investor. Investor isA Participant. Eve has Crypto. Or(Or(Cash,Card), Crypto) satisfied via Crypto. Applied rule: 3-way Or implies can Pay. Therefore Eve can Pay.'
  },

  // === NEGATIVE: Dan has Nothing (Or not satisfied) ===
  {
    action: 'prove',
    input_nl: 'Can Dan pay? (has Nothing)',
    input_dsl: '@goal can Dan Pay',
    expected_nl: 'Cannot prove: Dan can Pay. Search: Dan isA Guest. Guest isA Visitor. Visitor isA Participant. Checked rule: (Cash OR Card OR Crypto) implies can Pay. Searched: has Dan Cash. Not found. Searched: has Dan Card. Not found. Searched: has Dan Crypto. Not found. 3-way Or not satisfied.'
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
    expected_nl: 'Learned 24 facts'
  },

  // === PROVE: Voter can vote (mixed And+Or satisfied) ===
  {
    action: 'prove',
    input_nl: 'Can Voter vote? (Citizen AND Adult AND (ID OR Passport))',
    input_dsl: '@goal can Voter Vote',
    expected_nl: 'True: Voter can Vote. Proof: Voter isA Resident. Resident isA Inhabitant. Voter hasProperty Citizen. Voter hasProperty Adult. And(Citizen, Adult) satisfied. Voter has ID. Or(ID, Passport) satisfied via ID. And(And(C,A), Or) satisfied. Applied rule. Therefore Voter can Vote.'
  },

  // === NEGATIVE: Minor cannot vote (not Adult) ===
  {
    action: 'prove',
    input_nl: 'Can Minor vote? (Citizen but not Adult)',
    input_dsl: '@goal can Minor Vote',
    expected_nl: 'Cannot prove: Minor can Vote. Search: Minor isA Child. Child isA Dependent. Dependent isA Person. Checked rule: (Citizen AND Adult) AND (ID OR Passport). Minor hasProperty Citizen. Searched: hasProperty Minor Adult. Not found. And(Citizen, Adult) not satisfied. Rule condition fails.'
  },

  // === QUERY: Who can pay ===
  {
    action: 'query',
    input_nl: 'Who can pay?',
    input_dsl: '@q can ?who Pay',
    expected_nl: 'Alice can Pay. Bob can Pay. Eve can Pay.'
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
    expected_nl: 'True: Dave is at leadershiplvl. Proof: Dave isA Junior. Junior isA AssociateLvl. AssociateLvl isA SeniorLvl. SeniorLvl isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl.'
  },

  // === PROVE: 5-step Sally→LeadershipLvl ===
  {
    action: 'prove',
    input_nl: 'Is Sally at LeadershipLvl? (5-step chain)',
    input_dsl: '@goal isA Sally LeadershipLvl',
    expected_nl: 'True: Sally is at leadershiplvl. Proof: Sally isA LeadLvl. LeadLvl isA ManagerLvl. ManagerLvl isA DirectorLvl. DirectorLvl isA VPLvl. VPLvl isA CTOLvl. CTOLvl isA ExecutiveLvl. ExecutiveLvl isA LeadershipLvl.'
  },

  // === PROVE: Dave can get promoted (And rule satisfied) ===
  {
    action: 'prove',
    input_nl: 'Can Dave get promoted? (Performance AND Tenure)',
    input_dsl: '@goal can Dave GetPromoted',
    expected_nl: 'True: Dave can GetPromoted. Proof: Dave isA Junior (position verified). Dave has Performance. Dave has Tenure. And(Performance, Tenure) satisfied. Applied rule: (Performance AND Tenure) implies can GetPromoted. Therefore Dave can GetPromoted.'
  },

  // === NEGATIVE: Sally cannot get promoted (missing Tenure) ===
  {
    action: 'prove',
    input_nl: 'Can Sally get promoted? (missing Tenure)',
    input_dsl: '@goal can Sally GetPromoted',
    expected_nl: 'Cannot prove: Sally can GetPromoted. Search: Sally isA LeadLvl. LeadLvl isA ManagerLvl (5+ levels verified). Checked rule: (Performance AND Tenure) implies can GetPromoted. Sally has Performance. Searched: has Sally Tenure. Not found. And condition not satisfied.'
  }
];

export default { name, description, theories, steps };
