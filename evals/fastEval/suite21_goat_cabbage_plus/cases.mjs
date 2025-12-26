/**
 * Suite 21 - Multi-Entity River Crossing Problem
 *
 * Models the classic wolf-goat-cabbage puzzle using facts and rules.
 * Uses isA hierarchy and conflicts relations for constraint modeling.
 */

export const name = 'Wolf-Goat-Cabbage Plus';
export const description = 'River crossing puzzle with conflict rules and state reasoning';

export const theories = ['05-logic.sys2', 'Constraints/01-relations.sys2'];

export const steps = [
  // === SETUP: Entities and conflict rules ===
  {
    action: 'learn',
    input_nl: 'Define river crossing entities and conflict relationships.',
    input_dsl: `
      # Entity types
      isA Farmer Agent
      isA Wolf Animal
      isA Goat Animal
      isA Cabbage Plant

      # Conflict rules: predator eats prey if alone
      conflicts Wolf Goat
      conflicts Goat Cabbage

      # Initial locations (all on Left bank)
      location Farmer Left
      location Wolf Left
      location Goat Left
      location Cabbage Left

      # Banks
      isA Left Bank
      isA Right Bank
    `,
    expected_nl: 'Learned 12 facts'
  },

  {
    action: 'learn',
    input_nl: 'Add safety rules for river crossing.',
    input_dsl: `
      # Rule: if X conflicts with Y and both at same location -> unsafe location
      @safe1 conflicts ?X ?Y
      @safe2 location ?X ?loc
      @safe3 location ?Y ?loc
      @safeCond And $safe1 $safe2
      @safeCond2 And $safeCond $safe3
      @safeConseq unsafe ?loc
      Implies $safeCond2 $safeConseq

      # Rule: presence of Farmer makes location safe
      @pres1 location Farmer ?loc
      @pres2 safe ?loc
      Implies $pres1 $pres2

      # Boat capacity
      boatCapacity Boat Two
      mustBe Farmer InBoat
    `,
    expected_nl: 'Learned 12 facts'
  },

  // === PROVE: Wolf conflicts with Goat ===
  {
    action: 'prove',
    input_nl: 'Does Wolf conflict with Goat?',
    input_dsl: '@goal conflicts Wolf Goat',
    expected_nl: 'True: Wolf conflicts Goat.',
    proof_nl: 'Fact in KB: Wolf conflicts Goat'
  },

  // === PROVE: Initial unsafe state (all on Left without move) ===
  {
    action: 'prove',
    input_nl: 'Is Left bank currently safe?',
    input_dsl: '@goal safe Left',
    expected_nl: 'True: Left is safe.',
    proof_nl: [
      'Applied rule: IF (Farmer is at Left) THEN (Left is safe)',
      'Therefore Left is safe'
    ]
  },

  // === QUERY: What is on the Left bank? ===
  {
    action: 'query',
    input_nl: 'What is on the Left bank?',
    input_dsl: '@q location ?x Left',
    expected_nl: [
      'Farmer is at Left.',
      'Wolf is at Left.',
      'Goat is at Left.',
      'Cabbage is at Left.'
    ],
    proof_nl: [
      'Fact in KB: Farmer is at Left',
      'Fact in KB: Wolf is at Left',
      'Fact in KB: Goat is at Left',
      'Fact in KB: Cabbage is at Left'
    ]
  },

  // === QUERY: What conflict pairs exist? ===
  {
    action: 'query',
    input_nl: 'What conflict pairs exist?',
    input_dsl: '@q conflicts ?x ?y',
    expected_nl: [
      'Wolf conflicts Goat.',
      'Goat conflicts Cabbage.'
    ],
    proof_nl: [
      'Fact in KB: Wolf conflicts Goat',
      'Fact in KB: Goat conflicts Cabbage'
    ]
  },

  // === PROVE: Goat conflicts with Cabbage ===
  {
    action: 'prove',
    input_nl: 'Does Goat conflict with Cabbage?',
    input_dsl: '@goal conflicts Goat Cabbage',
    expected_nl: 'True: Goat conflicts Cabbage.',
    proof_nl: 'Fact in KB: Goat conflicts Cabbage'
  },

  // === PROVE: Boat capacity ===
  {
    action: 'prove',
    input_nl: 'What is the boat capacity?',
    input_dsl: '@goal boatCapacity Boat Two',
    expected_nl: 'True: Boat boatCapacity Two.',
    proof_nl: 'Fact in KB: Boat boatCapacity Two'
  },

  // === QUERY: What animals are there? ===
  {
    action: 'query',
    input_nl: 'What animals are in the puzzle?',
    input_dsl: '@q isA ?x Animal',
    expected_nl: [
      'Wolf is an animal.',
      'Goat is an animal.'
    ],
    proof_nl: [
      'Fact in KB: Wolf is an animal',
      'Fact in KB: Goat is an animal'
    ]
  },

  // === PROVE: Farmer must be in boat ===
  {
    action: 'prove',
    input_nl: 'Must Farmer be in the boat to cross?',
    input_dsl: '@goal mustBe Farmer InBoat',
    expected_nl: 'True: Farmer mustBe InBoat.',
    proof_nl: 'Fact in KB: Farmer mustBe InBoat'
  },

  // === DEMONSTRATE: Solve check (like suite 11) ===
  {
    action: 'prove',
    input_nl: 'Demonstrate the solution logic: Is the initial state safe?',
    input_dsl: '@goal safe Left',
    expected_nl: 'True: Left is safe.',
    proof_nl: [
      'Applied rule: IF (Farmer is at Left) THEN (Left is safe)',
      'Therefore Left is safe'
    ]
  },

  // === PLANNING: Solve the puzzle with constraints ===
  {
    action: 'learn',
    input_nl: 'Define river crossing actions and compute a valid plan (constraint-aware).',
    input_dsl: `
      # Action model: Farmer crosses alone or with one passenger
      # (Location is the state predicate; Conflicts are state constraints guarded by Farmer)

      requires CrossGoatLR location Farmer Left
      requires CrossGoatLR location Goat Left
      causes CrossGoatLR location Farmer Right
      causes CrossGoatLR location Goat Right
      prevents CrossGoatLR location Farmer Left
      prevents CrossGoatLR location Goat Left

      requires CrossGoatRL location Farmer Right
      requires CrossGoatRL location Goat Right
      causes CrossGoatRL location Farmer Left
      causes CrossGoatRL location Goat Left
      prevents CrossGoatRL location Farmer Right
      prevents CrossGoatRL location Goat Right

      requires CrossWolfLR location Farmer Left
      requires CrossWolfLR location Wolf Left
      causes CrossWolfLR location Farmer Right
      causes CrossWolfLR location Wolf Right
      prevents CrossWolfLR location Farmer Left
      prevents CrossWolfLR location Wolf Left

      requires CrossWolfRL location Farmer Right
      requires CrossWolfRL location Wolf Right
      causes CrossWolfRL location Farmer Left
      causes CrossWolfRL location Wolf Left
      prevents CrossWolfRL location Farmer Right
      prevents CrossWolfRL location Wolf Right

      requires CrossCabbageLR location Farmer Left
      requires CrossCabbageLR location Cabbage Left
      causes CrossCabbageLR location Farmer Right
      causes CrossCabbageLR location Cabbage Right
      prevents CrossCabbageLR location Farmer Left
      prevents CrossCabbageLR location Cabbage Left

      requires CrossCabbageRL location Farmer Right
      requires CrossCabbageRL location Cabbage Right
      causes CrossCabbageRL location Farmer Left
      causes CrossCabbageRL location Cabbage Left
      prevents CrossCabbageRL location Farmer Right
      prevents CrossCabbageRL location Cabbage Right

      requires CrossAloneLR location Farmer Left
      causes CrossAloneLR location Farmer Right
      prevents CrossAloneLR location Farmer Left

      requires CrossAloneRL location Farmer Right
      causes CrossAloneRL location Farmer Left
      prevents CrossAloneRL location Farmer Right

      # Goals (non-persistent refs)
      @gFarmer location Farmer Right
      @gWolf location Wolf Right
      @gGoat location Goat Right
      @gCabbage location Cabbage Right

      # Start state for planning (refs)
      @sFarmer location Farmer Left
      @sWolf location Wolf Left
      @sGoat location Goat Left
      @sCabbage location Cabbage Left

      @crossingPlan solve planning
        start from sFarmer
        start from sWolf
        start from sGoat
        start from sCabbage
        goal from gFarmer
        goal from gWolf
        goal from gGoat
        goal from gCabbage
        guard from Farmer
        conflictOp from conflicts
        locationOp from location
        maxDepth from 8
      end
    `,
    expected_nl: 'Found 1 plan.'
  },

  {
    action: 'query',
    input_nl: 'How many steps are in the computed plan?',
    input_dsl: '@q plan crossingPlan ?len',
    maxResults: 1,
    expected_nl: [
      'Plan crossingPlan has 7 steps.'
    ],
    proof_nl: [
      'Found 7 plan steps for crossingPlan'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 1 of the computed plan?',
    input_dsl: '@q planStep crossingPlan 1 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan crossingPlan is CrossGoatLR.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan crossingPlan is CrossGoatLR'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 7 of the computed plan?',
    input_dsl: '@q planStep crossingPlan 7 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 7 of plan crossingPlan is CrossGoatLR.'
    ],
    proof_nl: [
      'Fact in KB: Step 7 of plan crossingPlan is CrossGoatLR'
    ]
  },

  {
    action: 'query',
    input_nl: 'Verify the computed plan by simulating it over requires/causes/prevents.',
    input_dsl: '@q verifyPlan crossingPlan ?ok',
    maxResults: 1,
    expected_nl: [
      'Plan crossingPlan is valid.'
    ],
    proof_nl: [
      'Goals satisfied'
    ]
  },

  // === PLANNING: Next-step guidance from intermediate states ("instances") ===
  {
    action: 'learn',
    input_nl: 'From the state after taking Goat to Right, compute the next best action.',
    input_dsl: `
      @i1Farmer location Farmer Right
      @i1Goat location Goat Right
      @i1Wolf location Wolf Left
      @i1Cabbage location Cabbage Left

      @nextAfterGoatRight solve planning
        start from i1Farmer
        start from i1Goat
        start from i1Wolf
        start from i1Cabbage
        goal from gFarmer
        goal from gWolf
        goal from gGoat
        goal from gCabbage
        guard from Farmer
        conflictOp from conflicts
        locationOp from location
        maxDepth from 8
      end
    `,
    expected_nl: 'Found 1 plan.'
  },

  {
    action: 'query',
    input_nl: 'How many steps are in the intermediate-state plan?',
    input_dsl: '@q plan nextAfterGoatRight ?len',
    maxResults: 1,
    expected_nl: [
      'Plan nextAfterGoatRight has 6 steps.'
    ],
    proof_nl: [
      'Found 6 plan steps for nextAfterGoatRight'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 1 of the intermediate-state plan?',
    input_dsl: '@q planStep nextAfterGoatRight 1 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan nextAfterGoatRight is CrossAloneRL.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan nextAfterGoatRight is CrossAloneRL'
    ]
  },

  {
    action: 'query',
    input_nl: 'Verify that the intermediate-state plan is valid.',
    input_dsl: '@q verifyPlan nextAfterGoatRight ?ok',
    maxResults: 1,
    expected_nl: [
      'Plan nextAfterGoatRight is valid.'
    ],
    proof_nl: [
      'Goals satisfied'
    ]
  },

  {
    action: 'learn',
    input_nl: 'From the state after taking Wolf to Right (with Farmer), compute the next best action.',
    input_dsl: `
      @i3Farmer location Farmer Right
      @i3Goat location Goat Right
      @i3Wolf location Wolf Right
      @i3Cabbage location Cabbage Left

      @nextAfterWolfRight solve planning
        start from i3Farmer
        start from i3Goat
        start from i3Wolf
        start from i3Cabbage
        goal from gFarmer
        goal from gWolf
        goal from gGoat
        goal from gCabbage
        guard from Farmer
        conflictOp from conflicts
        locationOp from location
        maxDepth from 8
      end
    `,
    expected_nl: 'Found 1 plan.'
  },

  {
    action: 'query',
    input_nl: 'How many steps are in the later intermediate-state plan?',
    input_dsl: '@q plan nextAfterWolfRight ?len',
    maxResults: 1,
    expected_nl: [
      'Plan nextAfterWolfRight has 4 steps.'
    ],
    proof_nl: [
      'Found 4 plan steps for nextAfterWolfRight'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 1 of the later intermediate-state plan?',
    input_dsl: '@q planStep nextAfterWolfRight 1 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan nextAfterWolfRight is CrossGoatRL.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan nextAfterWolfRight is CrossGoatRL'
    ]
  },

  {
    action: 'query',
    input_nl: 'Verify that the intermediate-state plan is valid.',
    input_dsl: '@q verifyPlan nextAfterWolfRight ?ok',
    maxResults: 1,
    expected_nl: [
      'Plan nextAfterWolfRight is valid.'
    ],
    proof_nl: [
      'Goals satisfied'
    ]
  }
];

export default { name, description, theories, steps };
