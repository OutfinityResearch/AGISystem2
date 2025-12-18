/**
 * Suite 21 - Multi-Entity River Crossing Problem
 *
 * Models the classic wolf-goat-cabbage puzzle using facts and rules.
 * Uses isA hierarchy and conflicts relations for constraint modeling.
 */

export const name = 'Wolf-Goat-Cabbage Plus';
export const description = 'River crossing puzzle with conflict rules and state reasoning';

export const theories = ['05-logic.sys2'];

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
      # Rule: if X conflicts with Y and both at same location without Farmer -> unsafe
      @safe1 conflicts ?X ?Y
      @safe2 location ?X ?loc
      @safe3 location ?Y ?loc
      @safeCond And $safe1 $safe2
      @safeCond2 And $safeCond $safe3
      @safeConseq unsafe ?loc ?X ?Y
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
    expected_nl: 'True: Wolf conflicts Goat. Proof: Wolf conflicts Goat. Therefore Wolf conflicts Goat.'
  },

  // === PROVE: Initial unsafe state (all on Left without move) ===
  {
    action: 'prove',
    input_nl: 'Is Left bank currently safe?',
    input_dsl: '@goal safe Left',
    expected_nl: 'True: Left is safe. Proof: Applied rule: implies @pres1 @pres2. Farmer is at Left. Therefore Left is safe.'
  },

  // === QUERY: What is on the Left bank? ===
  {
    action: 'query',
    input_nl: 'What is on the Left bank?',
    input_dsl: '@q location ?x Left',
    expected_nl: 'Farmer is at Left. Wolf is at Left. Goat is at Left. Cabbage is at Left.'
  },

  // === QUERY: What conflict pairs exist? ===
  {
    action: 'query',
    input_nl: 'What conflict pairs exist?',
    input_dsl: '@q conflicts ?x ?y',
    expected_nl: 'Wolf conflicts Goat. Goat conflicts Cabbage.'
  },

  // === PROVE: Goat conflicts with Cabbage ===
  {
    action: 'prove',
    input_nl: 'Does Goat conflict with Cabbage?',
    input_dsl: '@goal conflicts Goat Cabbage',
    expected_nl: 'True: Goat conflicts Cabbage. Proof: Goat conflicts Cabbage. Therefore Goat conflicts Cabbage.'
  },

  // === PROVE: Boat capacity ===
  {
    action: 'prove',
    input_nl: 'What is the boat capacity?',
    input_dsl: '@goal boatCapacity Boat Two',
    expected_nl: 'True: Boat boatCapacity Two. Proof: Boat boatCapacity Two. Therefore Boat boatCapacity Two.'
  },

  // === QUERY: What animals are there? ===
  {
    action: 'query',
    input_nl: 'What animals are in the puzzle?',
    input_dsl: '@q isA ?x Animal',
    expected_nl: 'Wolf is an animal. Goat is an animal.'
  },

  // === PROVE: Farmer must be in boat ===
  {
    action: 'prove',
    input_nl: 'Must Farmer be in the boat to cross?',
    input_dsl: '@goal mustBe Farmer InBoat',
    expected_nl: 'True: Farmer mustBe InBoat. Proof: Farmer mustBe InBoat. Therefore Farmer mustBe InBoat.'
  },

  // === DEMONSTRATE: Solve check (like suite 11) ===
  {
    action: 'prove',
    input_nl: 'Demonstrate the solution logic: Is the initial state safe?',
    input_dsl: '@goal safe Left',
    expected_nl: 'True: Left is safe. Proof: Applied rule: implies @pres1 @pres2. Farmer is at Left. Therefore Left is safe.'
  }
];

export default { name, description, theories, steps };
