/**
 * Suite 21 - Multi-Entity River Crossing (Backtracking CSP)
 *
 * Extends the classic wolf-goat-cabbage puzzle with multiple animals/vegetables
 * and incompatibility rules. Uses @dest solve blocks and queries for solutions.
 */

export const name = 'Wolf-Goat-Cabbage Plus';
export const description = 'Complex river crossing CSP with multiple incompatibilities';

export const theories = ['05-logic.sys2'];

export const steps = [
  // === SETUP: Entities and incompatibilities ===
  {
    action: 'learn',
    input_nl: 'Define river crossing puzzle with extra goats/cabbages and incompatibility rules.',
    input_dsl: `
      # Entities
      isA Farmer Agent
      isA Wolf1 Wolf
      isA Wolf2 Wolf
      isA Goat1 Goat
      isA Goat2 Goat
      isA Cabbage1 Cabbage
      isA Cabbage2 Cabbage

      # Boat constraints
      capacity Boat 2

      # Incompatibility: wolf eats goat if alone without farmer
      conflicts Wolf Goat

      # Incompatibility: goat eats cabbage if alone without farmer
      conflicts Goat Cabbage

      # Locations
      bank Left
      bank Right
    `,
    expected_nl: 'Learned 17 facts'
  },

  // === SOLVE: River crossing CSP (two trips allowed) ===
  {
    action: 'learn',
    input_nl: 'Solve river crossing with constraints (no conflicts when farmer absent).',
    input_dsl: `
      @solutions solve RiverCrossing
        @farmLoc location Farmer Left
        @wolf1Loc location Wolf1 Left
        @wolf2Loc location Wolf2 Left
        @goat1Loc location Goat1 Left
        @goat2Loc location Goat2 Left
        @cab1Loc location Cabbage1 Left
        @cab2Loc location Cabbage2 Left

        # Goal: all on Right
        goal location Farmer Right
        goal location Wolf1 Right
        goal location Wolf2 Right
        goal location Goat1 Right
        goal location Goat2 Right
        goal location Cabbage1 Right
        goal location Cabbage2 Right

        # Constraint: boat capacity 2
        constraint capacity Boat 2

        # Constraint: no conflicts if farmer absent on bank
        constraint notTogether Wolf Goat unless Farmer
        constraint notTogether Goat Cabbage unless Farmer

        # Allow multiple trips (stateful transitions modeled internally)
      end
    `,
    expected_nl: 'Learned 1 facts'
  },

  // === QUERY: List one valid solution ===
  {
    action: 'listSolutions',
    input_nl: 'List a valid river crossing solution.',
    input_dsl: '@solutions RiverCrossing',
    expected_nl: 'Found 2 solutions. Solution 1: Farmer+Goat1 cross Right, Farmer returns, Farmer+Wolf1 cross Right, Farmer+Goat1 return, Farmer+Goat2 cross Right, Farmer returns, Farmer+Cabbage1 cross Right, Farmer+Goat2 return, Farmer+Goat1 cross Right, Farmer returns, Farmer+Cabbage2 cross Right, Farmer returns alone, Farmer+Goat2 cross Right. Solution 2: Farmer+Goat2 cross Right, Farmer returns, Farmer+Wolf2 cross Right, Farmer+Goat2 return, Farmer+Goat1 cross Right, Farmer returns, Farmer+Cabbage1 cross Right, Farmer+Goat1 return, Farmer+Goat2 cross Right, Farmer returns, Farmer+Cabbage2 cross Right, Farmer returns alone, Farmer+Goat1 cross Right.'
  },

  // === QUERY: Check conflicts are avoided (proof) ===
  {
    action: 'query',
    input_nl: 'Are there any conflicting pairs left alone?',
    input_dsl: '@q conflicts ?pred ?prey',
    expected_nl: 'Answer: Wolf Goat. Goat Cabbage. Proof: Conflicts exist, but solver ensures Farmer presence prevents violation in solution.'
  }
];

export default { name, description, theories, steps };
