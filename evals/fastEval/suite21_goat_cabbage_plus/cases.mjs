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
      implies $safeCond2 $safeConseq

      # Rule: presence of Farmer makes location safe
      @pres1 location Farmer ?loc
      @pres2 safe ?loc
      implies $pres1 $pres2

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
    proof_nl: 'Wolf conflicts Goat. Therefore Wolf conflicts Goat.'
  },

  // === PROVE: Initial unsafe state (all on Left without move) ===
  {
    action: 'prove',
    input_nl: 'Is Left bank currently safe?',
    input_dsl: '@goal safe Left',
    expected_nl: 'True: Left is safe.',
    proof_nl: 'Applied rule: implies @pres1 @pres2.'
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
      'location Farmer Left',
      'location Wolf Left',
      'location Goat Left',
      'location Cabbage Left'
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
      'conflicts Wolf Goat',
      'conflicts Goat Cabbage'
    ]
  },

  // === PROVE: Goat conflicts with Cabbage ===
  {
    action: 'prove',
    input_nl: 'Does Goat conflict with Cabbage?',
    input_dsl: '@goal conflicts Goat Cabbage',
    expected_nl: 'True: Goat conflicts Cabbage.',
    proof_nl: 'Goat conflicts Cabbage. Therefore Goat conflicts Cabbage.'
  },

  // === PROVE: Boat capacity ===
  {
    action: 'prove',
    input_nl: 'What is the boat capacity?',
    input_dsl: '@goal boatCapacity Boat Two',
    expected_nl: 'True: Boat boatCapacity Two.',
    proof_nl: 'Boat boatCapacity Two. Therefore Boat boatCapacity Two.'
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
      'isA Wolf Animal',
      'isA Goat Animal'
    ]
  },

  // === PROVE: Farmer must be in boat ===
  {
    action: 'prove',
    input_nl: 'Must Farmer be in the boat to cross?',
    input_dsl: '@goal mustBe Farmer InBoat',
    expected_nl: 'True: Farmer mustBe InBoat.',
    proof_nl: 'Farmer mustBe InBoat. Therefore Farmer mustBe InBoat.'
  },

  // === DEMONSTRATE: Solve check (like suite 11) ===
  {
    action: 'prove',
    input_nl: 'Demonstrate the solution logic: Is the initial state safe?',
    input_dsl: '@goal safe Left',
    expected_nl: 'True: Left is safe.',
    proof_nl: 'Applied rule: implies @pres1 @pres2.'
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
    expected_nl: [
      'Plan crossingPlan has 7 steps.'
    ],
    proof_nl: [
      'plan crossingPlan 7'
    ]
  },

  {
    action: 'query',
    input_nl: 'List the plan steps (shortest valid plan).',
    input_dsl: '@q planStep crossingPlan ?n ?action',
    expected_nl: [
      'Step 1 of plan crossingPlan is CrossGoatLR.',
      'Step 2 of plan crossingPlan is CrossAloneRL.',
      'Step 3 of plan crossingPlan is CrossWolfLR.',
      'Step 4 of plan crossingPlan is CrossGoatRL.',
      'Step 5 of plan crossingPlan is CrossCabbageLR.',
      'Step 6 of plan crossingPlan is CrossAloneRL.',
      'Step 7 of plan crossingPlan is CrossGoatLR.'
    ],
    proof_nl: [
      'planStep crossingPlan 1 CrossGoatLR',
      'planStep crossingPlan 2 CrossAloneRL',
      'planStep crossingPlan 3 CrossWolfLR',
      'planStep crossingPlan 4 CrossGoatRL',
      'planStep crossingPlan 5 CrossCabbageLR',
      'planStep crossingPlan 6 CrossAloneRL',
      'planStep crossingPlan 7 CrossGoatLR'
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
    input_nl: 'What is the next action from that intermediate state?',
    input_dsl: '@q planStep nextAfterGoatRight 1 ?action',
    expected_nl: [
      'Step 1 of plan nextAfterGoatRight is CrossAloneRL.'
    ],
    proof_nl: [
      'planStep nextAfterGoatRight 1 CrossAloneRL'
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
    input_nl: 'What is the next action from that intermediate state?',
    input_dsl: '@q planStep nextAfterWolfRight 1 ?action',
    expected_nl: [
      'Step 1 of plan nextAfterWolfRight is CrossGoatRL.'
    ],
    proof_nl: [
      'planStep nextAfterWolfRight 1 CrossGoatRL'
    ]
  }
];

export default { name, description, theories, steps };
