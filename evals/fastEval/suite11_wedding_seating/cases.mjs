/**
 * Suite 11: Wedding Seating CSP
 *
 * Tests the CSP solver with HDC compound solution storage:
 * 1. Learn facts + execute solve block → stores compound solution vectors
 * 2. Query with holes → reasoning layer extracts bindings from compound solutions
 *
 * HDC Compound Encoding:
 *   solution_vec = bundle([bind(relation,pos1(entity),pos2(value)), ...])
 *
 * Query via compound_csp method:
 *   - Searches compound solutions by similarity
 *   - Extracts bindings from solution metadata
 *   - Verifies extraction via HDC similarity check
 *
 * Tests verify:
 * - Solutions exist for solvable problems (NL shows "is at")
 * - No solutions exist for unsolvable problems
 * - Multiple arrangements enumerated coherently
 * - Two-hole queries return all valid combinations
 */

export const name = 'Wedding Seating CSP';
export const suiteName = 'suite11_wedding_seating';

export const suiteTheories = [];

export const timeouts = {
  nlToDsl: 100,
  reasoning: 2000,
  dslToNl: 500
};

export const cases = [
  // ========================================
  // SCENARIO 1: Simple solvable case
  // 2 guests (Alice, Bob) conflict → 2 tables → 2 valid solutions
  // Expected solutions:
  //   Solution 1: Alice at T1, Bob at T2
  //   Solution 2: Alice at T2, Bob at T1
  // ========================================

  {
    action: 'learn',
    input_dsl: `
      isA Alice GuestA
      isA Bob GuestA
      isA T1 TableA
      isA T2 TableA
      conflictsWith Alice Bob
      conflictsWith Bob Alice

      @seating solve WeddingSeating
        guests from GuestA
        tables from TableA
        noConflict conflictsWith
      end
    `,
    expected_nl: 'Found 2 seating: 1. Alice is at T1, Bob is at T2. 2. Alice is at T2, Bob is at T1.'
  },
  // List all solutions - Alice și Bob sunt mereu la mese diferite
  {
    action: 'listSolutions',
    input_dsl: 'seating',
    expected_nl: 'Found 2 solutions. Solution 1: Alice is at T1, Bob is at T2. Solution 2: Alice is at T2, Bob is at T1.'
  },
  // Single query - Alice can be at either table
  {
    action: 'query',
    input_dsl: `seating Alice ?table`,
    expected_nl: [
      'Alice is at T1.',
      'Alice is at T2.'
    ],
    proof_nl: [
      'Fact in KB: Alice is at T1',
      'Fact in KB: Alice is at T2'
    ]
  },

  // ========================================
  // SCENARIO 2: Multiple arrangements
  // 3 guests, 3 tables, 1 conflict pair → 18 valid arrangements
  // Carol-Dave conflict, Eve free to sit anywhere
  // Shows that Carol and Dave are NEVER in the same room
  // ========================================

  {
    action: 'learn',
    input_dsl: `
      isA Carol GuestB
      isA Dave GuestB
      isA Eve GuestB
      isA RoomX TableB
      isA RoomY TableB
      isA RoomZ TableB
      conflictsWith Carol Dave
      conflictsWith Dave Carol

      @arrangement solve WeddingSeating
        guests from GuestB
        tables from TableB
        noConflict conflictsWith
      end
    `,
    expected_nl: 'Found 18 arrangement: 1. Carol is at RoomX, Dave is at RoomY, Eve is at RoomX. 2. Carol is at RoomX, Dave is at RoomY, Eve is at RoomY. 3. Carol is at RoomX, Dave is at RoomY, Eve is at RoomZ. 4. Carol is at RoomX, Dave is at RoomZ, Eve is at RoomX. 5. Carol is at RoomX, Dave is at RoomZ, Eve is at RoomY. 6. Carol is at RoomX, Dave is at RoomZ, Eve is at RoomZ. 7. Carol is at RoomY, Dave is at RoomX, Eve is at RoomX. 8. Carol is at RoomY, Dave is at RoomX, Eve is at RoomY. 9. Carol is at RoomY, Dave is at RoomX, Eve is at RoomZ. 10. Carol is at RoomY, Dave is at RoomZ, Eve is at RoomX. 11. Carol is at RoomY, Dave is at RoomZ, Eve is at RoomY. 12. Carol is at RoomY, Dave is at RoomZ, Eve is at RoomZ. 13. Carol is at RoomZ, Dave is at RoomX, Eve is at RoomX. 14. Carol is at RoomZ, Dave is at RoomX, Eve is at RoomY. 15. Carol is at RoomZ, Dave is at RoomX, Eve is at RoomZ. 16. Carol is at RoomZ, Dave is at RoomY, Eve is at RoomX. 17. Carol is at RoomZ, Dave is at RoomY, Eve is at RoomY. 18. Carol is at RoomZ, Dave is at RoomY, Eve is at RoomZ.'
  },
  // List all 18 solutions - Carol și Dave sunt MEREU în camere diferite
  {
    action: 'listSolutions',
    input_dsl: 'arrangement',
    expected_nl: 'Found 18 solutions. Solution 1: Carol is at RoomX, Dave is at RoomY, Eve is at RoomX. Solution 2: Carol is at RoomX, Dave is at RoomY, Eve is at RoomY. Solution 3: Carol is at RoomX, Dave is at RoomY, Eve is at RoomZ. Solution 4: Carol is at RoomX, Dave is at RoomZ, Eve is at RoomX. Solution 5: Carol is at RoomX, Dave is at RoomZ, Eve is at RoomY. Solution 6: Carol is at RoomX, Dave is at RoomZ, Eve is at RoomZ. Solution 7: Carol is at RoomY, Dave is at RoomX, Eve is at RoomX. Solution 8: Carol is at RoomY, Dave is at RoomX, Eve is at RoomY. Solution 9: Carol is at RoomY, Dave is at RoomX, Eve is at RoomZ. Solution 10: Carol is at RoomY, Dave is at RoomZ, Eve is at RoomX. Solution 11: Carol is at RoomY, Dave is at RoomZ, Eve is at RoomY. Solution 12: Carol is at RoomY, Dave is at RoomZ, Eve is at RoomZ. Solution 13: Carol is at RoomZ, Dave is at RoomX, Eve is at RoomX. Solution 14: Carol is at RoomZ, Dave is at RoomX, Eve is at RoomY. Solution 15: Carol is at RoomZ, Dave is at RoomX, Eve is at RoomZ. Solution 16: Carol is at RoomZ, Dave is at RoomY, Eve is at RoomX. Solution 17: Carol is at RoomZ, Dave is at RoomY, Eve is at RoomY. Solution 18: Carol is at RoomZ, Dave is at RoomY, Eve is at RoomZ.'
  },

  // ========================================
  // SCENARIO 3: Unsatisfiable problem
  // 3 guests with triangle conflict, only 2 tables → no solution exists
  // Maria-Ion-Ana all conflict with each other, but only 2 tables available
  // ========================================

  {
    action: 'learn',
    input_dsl: `
      isA Maria GuestC
      isA Ion GuestC
      isA Ana GuestC
      isA MasaMare TableC
      isA MasaMica TableC
      conflictsWith Maria Ion
      conflictsWith Ion Maria
      conflictsWith Ion Ana
      conflictsWith Ana Ion
      conflictsWith Maria Ana
      conflictsWith Ana Maria

      @plasare solve WeddingSeating
        guests from GuestC
        tables from TableC
        noConflict conflictsWith
      end
    `,
    expected_nl: 'No valid solutions found.'
  },
  // Query the seating - should return no results because problem has no solution
  {
    action: 'listSolutions',
    input_dsl: 'plasare',
    expected_nl: 'No valid solutions found.'
  },

  // ========================================
  // SCENARIO 4: Larger CSP + multi-variable extraction
  // 4 guests, 5 rooms, complete conflict graph → all guests must be in different rooms.
  // Solver caps at 100 solutions (default). We also test:
  // - listSolutions truncation (show 2)
  // - multi-hole query extraction from a single solution via cspTuple
  // ========================================

  {
    action: 'learn',
    input_dsl: `
      isA Guest1 GuestD
      isA Guest2 GuestD
      isA Guest3 GuestD
      isA Guest4 GuestD
      isA Room1 RoomD
      isA Room2 RoomD
      isA Room3 RoomD
      isA Room4 RoomD
      isA Room5 RoomD

      conflictsWith Guest1 Guest2
      conflictsWith Guest2 Guest1
      conflictsWith Guest1 Guest3
      conflictsWith Guest3 Guest1
      conflictsWith Guest1 Guest4
      conflictsWith Guest4 Guest1
      conflictsWith Guest2 Guest3
      conflictsWith Guest3 Guest2
      conflictsWith Guest2 Guest4
      conflictsWith Guest4 Guest2
      conflictsWith Guest3 Guest4
      conflictsWith Guest4 Guest3

      @rooms solve WeddingSeating
        guests from GuestD
        tables from RoomD
        noConflict conflictsWith
      end
    `,
    expected_nl: 'Found 100 rooms:'
  },
  {
    action: 'listSolutions',
    input_dsl: 'rooms',
    maxSolutions: 2,
    expected_nl: 'Found 100 solutions (showing 2). Solution 1: Guest1 is at Room1, Guest2 is at Room2, Guest3 is at Room3, Guest4 is at Room4. Solution 2: Guest1 is at Room1, Guest2 is at Room2, Guest3 is at Room3, Guest4 is at Room5.'
  },
  {
    action: 'query',
    input_dsl: 'cspTuple rooms Guest1 ?r1 Guest2 ?r2 Guest3 ?r3 Guest4 Room4',
    maxResults: 1,
    expected_nl: [
      'Guest1 is at Room1, Guest2 is at Room2, Guest3 is at Room3, Guest4 is at Room4.'
    ],
    proof_nl: [
      'Fact in KB: Guest1 is at Room1, Guest2 is at Room2, Guest3 is at Room3, Guest4 is at Room4'
    ]
  }
];

export default { name, suiteName, suiteTheories, timeouts, cases };
