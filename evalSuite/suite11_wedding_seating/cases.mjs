/**
 * Suite 11 - Wedding Seating Problem (Holographic Constraint Satisfaction)
 *
 * Equivalent to Graph Coloring, but with human characters for intuitive understanding.
 * Tests: constraint encoding, conflict detection, validity verification.
 *
 * Complexity progression:
 *   Case 1: 4 guests, 2 tables, 1 conflict   (trivial)
 *   Case 2: 6 guests, 2 tables, 3 conflicts  (simple)
 *   Case 3: 8 guests, 3 tables, 5 conflicts  (medium)
 *   Case 4: 12 guests, 4 tables, 8 conflicts (hard)
 *   Case 5: 16 guests, 4 tables, 12 conflicts (stress test)
 */

export const name = 'Wedding Seating Problem';
export const description = 'Holographic constraint satisfaction - detecting conflicts at tables';

export const theories = ['05-logic.sys2'];

export const steps = [

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CASE 1: TRIVIAL - 4 guests, 2 tables, 1 conflict                        ║
  // ║  Uncle Vasile and Aunt Maria are feuding.                                ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  {
    action: 'learn',
    input_nl: `
      CASE 1 - Small wedding (4 guests, 2 tables)
      Guests: Vasile, Maria, Ion, Elena
      Tables: Table1, Table2
      Conflict: Vasile and Maria are feuding
      Proposed seating: Vasile+Ion at Table1, Maria+Elena at Table2 (VALID)
    `,
    input_dsl: `
      // Guests
      isA Vasile Guest
      isA Maria Guest
      isA Ion Guest
      isA Elena Guest

      // Tables
      isA Table1 Table
      isA Table2 Table

      // CONFLICT: Vasile and Maria hate each other
      conflictsWith Vasile Maria
      conflictsWith Maria Vasile

      // Seating (VALID - enemies at different tables)
      seatedAt Vasile Table1
      seatedAt Ion Table1
      seatedAt Maria Table2
      seatedAt Elena Table2

      // Rule: detect table conflict
      // If P1 and P2 at same table AND they conflict => tableConflict
      @tc1_c1 seatedAt ?p1 ?table
      @tc1_c2 seatedAt ?p2 ?table
      @tc1_c3 conflictsWith ?p1 ?p2
      @tc1_and1 And $tc1_c1 $tc1_c2
      @tc1_and2 And $tc1_and1 $tc1_c3
      @tc1_conc tableConflict ?table ?p1 ?p2
      Implies $tc1_and2 $tc1_conc
    `,
    expected_nl: 'Learned facts about 4 guests, 2 tables, 1 conflict, and seating rule'
  },

  // Verify: NO conflict at Table1 (valid arrangement)
  {
    action: 'query',
    input_nl: 'Is there a conflict at Table1?',
    input_dsl: '@q tableConflict Table1 ?p1 ?p2',
    expected_nl: 'No conflicts found at Table1'
  },

  // Verify: NO conflict at Table2 either
  {
    action: 'query',
    input_nl: 'Is there a conflict at Table2?',
    input_dsl: '@q tableConflict Table2 ?p1 ?p2',
    expected_nl: 'No conflicts found at Table2'
  },

  // Direct query: who conflicts with whom?
  {
    action: 'query',
    input_nl: 'Who does Vasile conflict with?',
    input_dsl: '@q conflictsWith Vasile ?enemy',
    expected_nl: 'Vasile conflicts with Maria'
  },

  // Who is seated at Table1?
  {
    action: 'query',
    input_nl: 'Who is at Table1?',
    input_dsl: '@q seatedAt ?person Table1',
    expected_nl: 'Vasile and Ion are at Table1'
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CASE 2: SIMPLE - 6 guests, 2 tables, 3 conflicts (INVALID arrangement)  ║
  // ║  Corporate party with office drama.                                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  {
    action: 'learn',
    input_nl: `
      CASE 2 - Corporate party (6 guests, 2 tables)
      Guests: Andrei (CEO), Bogdan (CFO), Cristina (CTO), Dana (HR), Emil (Dev), Florin (Sales)
      Office conflicts:
        - Andrei vs Bogdan (budget fight)
        - Cristina vs Dana (old dispute)
        - Emil vs Florin (competition)
      INVALID seating: Andrei and Bogdan at same table!
    `,
    input_dsl: `
      // Corporate guests
      isA Andrei Guest
      isA Bogdan Guest
      isA Cristina Guest
      isA Dana Guest
      isA Emil Guest
      isA Florin Guest

      // Tables
      isA TableA Table
      isA TableB Table

      // 3 CONFLICTS
      conflictsWith Andrei Bogdan
      conflictsWith Bogdan Andrei
      conflictsWith Cristina Dana
      conflictsWith Dana Cristina
      conflictsWith Emil Florin
      conflictsWith Florin Emil

      // INVALID seating - Andrei and Bogdan at same table!
      seatedAt Andrei TableA
      seatedAt Bogdan TableA
      seatedAt Cristina TableA
      seatedAt Dana TableB
      seatedAt Emil TableB
      seatedAt Florin TableB

      // Conflict detection rule
      @tc2_c1 seatedAt ?p1 ?table
      @tc2_c2 seatedAt ?p2 ?table
      @tc2_c3 conflictsWith ?p1 ?p2
      @tc2_and1 And $tc2_c1 $tc2_c2
      @tc2_and2 And $tc2_and1 $tc2_c3
      @tc2_conc tableConflict ?table ?p1 ?p2
      Implies $tc2_and2 $tc2_conc
    `,
    expected_nl: 'Learned facts about 6 guests with 3 conflicts'
  },

  // Detect conflict at TableA (Andrei-Bogdan)
  {
    action: 'prove',
    input_nl: 'Is there Andrei-Bogdan conflict at TableA?',
    input_dsl: '@goal tableConflict TableA Andrei Bogdan',
    expected_nl: 'True: there is a conflict between Andrei and Bogdan at TableA'
  },

  // TableB also has conflict (Emil-Florin)
  {
    action: 'prove',
    input_nl: 'Is there Emil-Florin conflict at TableB?',
    input_dsl: '@goal tableConflict TableB Emil Florin',
    expected_nl: 'True: there is a conflict between Emil and Florin at TableB'
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CASE 3: MEDIUM - 8 guests, 3 tables, 5 conflicts (VALID arrangement)    ║
  // ║  Extended family with multiple personal dramas.                          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  {
    action: 'learn',
    input_nl: `
      CASE 3 - Family wedding (8 guests, 3 tables)
      Guests: Gicu, Horia, Ileana, Jana, Kira, Liviu, Marin, Nina
      Family drama (5 conflicts):
        - Gicu vs Horia (divorced)
        - Ileana vs Jana (sisters fighting over inheritance)
        - Kira vs Liviu (ex-lovers)
        - Marin vs Nina (sports rivals)
        - Gicu vs Ileana (money dispute)
      VALID seating: enemies at different tables
    `,
    input_dsl: `
      // 8 guests
      isA Gicu Guest
      isA Horia Guest
      isA Ileana Guest
      isA Jana Guest
      isA Kira Guest
      isA Liviu Guest
      isA Marin Guest
      isA Nina Guest

      // 3 tables
      isA TableOne Table
      isA TableTwo Table
      isA TableThree Table

      // 5 CONFLICTS (10 facts - symmetric)
      conflictsWith Gicu Horia
      conflictsWith Horia Gicu
      conflictsWith Ileana Jana
      conflictsWith Jana Ileana
      conflictsWith Kira Liviu
      conflictsWith Liviu Kira
      conflictsWith Marin Nina
      conflictsWith Nina Marin
      conflictsWith Gicu Ileana
      conflictsWith Ileana Gicu

      // VALID seating
      seatedAt Gicu TableOne
      seatedAt Jana TableOne
      seatedAt Marin TableOne
      seatedAt Horia TableTwo
      seatedAt Kira TableTwo
      seatedAt Nina TableTwo
      seatedAt Ileana TableThree
      seatedAt Liviu TableThree

      // Conflict rule
      @tc3_c1 seatedAt ?p1 ?table
      @tc3_c2 seatedAt ?p2 ?table
      @tc3_c3 conflictsWith ?p1 ?p2
      @tc3_and1 And $tc3_c1 $tc3_c2
      @tc3_and2 And $tc3_and1 $tc3_c3
      @tc3_conc tableConflict ?table ?p1 ?p2
      Implies $tc3_and2 $tc3_conc
    `,
    expected_nl: 'Learned facts about 8 guests with 5 conflicts'
  },

  // Verify TableOne is conflict-free (Gicu not with Horia or Ileana)
  {
    action: 'prove',
    input_nl: 'Is there any Gicu-Jana conflict at TableOne?',
    input_dsl: '@goal tableConflict TableOne Gicu Jana',
    expected_nl: 'Cannot prove: Gicu and Jana are not in conflict'
  },

  // Who is at TableTwo?
  {
    action: 'query',
    input_nl: 'Who is at TableTwo?',
    input_dsl: '@q seatedAt ?person TableTwo',
    expected_nl: 'Horia, Kira, and Nina are at TableTwo'
  },

  // How many conflicts does Gicu have?
  {
    action: 'query',
    input_nl: 'Who does Gicu conflict with?',
    input_dsl: '@q conflictsWith Gicu ?enemy',
    expected_nl: 'Gicu conflicts with Horia and Ileana'
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CASE 4: HARD - 12 guests, 4 tables, 8 conflicts (1 invalid placement)   ║
  // ║  Large wedding with complex inter-family constraints.                    ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  {
    action: 'learn',
    input_nl: `
      CASE 4 - Big wedding (12 guests, 4 tables)
      Groom's family: Ovidiu, Paula, Radu, Sanda
      Bride's family: Toma, Ursula, Victor, Wanda
      Mutual friends: Xena, Yannis, Zoe, Adrian
      8 conflicts between branches...
      ONE invalid placement: Ovidiu and Xena at same table!
    `,
    input_dsl: `
      // 12 guests
      isA Ovidiu Guest
      isA Paula Guest
      isA Radu Guest
      isA Sanda Guest
      isA Toma Guest
      isA Ursula Guest
      isA Victor Guest
      isA Wanda Guest
      isA Xena Guest
      isA Yannis Guest
      isA Zoe Guest
      isA Adrian Guest

      // 4 tables
      isA RedTable Table
      isA BlueTable Table
      isA GreenTable Table
      isA YellowTable Table

      // 8 CONFLICTS
      conflictsWith Ovidiu Toma
      conflictsWith Toma Ovidiu
      conflictsWith Paula Ursula
      conflictsWith Ursula Paula
      conflictsWith Radu Victor
      conflictsWith Victor Radu
      conflictsWith Sanda Wanda
      conflictsWith Wanda Sanda
      conflictsWith Xena Yannis
      conflictsWith Yannis Xena
      conflictsWith Zoe Adrian
      conflictsWith Adrian Zoe
      conflictsWith Ovidiu Xena
      conflictsWith Xena Ovidiu
      conflictsWith Toma Zoe
      conflictsWith Zoe Toma

      // Seating with ONE conflict (Ovidiu-Xena at RedTable)
      seatedAt Ovidiu RedTable
      seatedAt Xena RedTable
      seatedAt Radu RedTable
      seatedAt Paula BlueTable
      seatedAt Toma BlueTable
      seatedAt Adrian BlueTable
      seatedAt Sanda GreenTable
      seatedAt Victor GreenTable
      seatedAt Yannis GreenTable
      seatedAt Ursula YellowTable
      seatedAt Wanda YellowTable
      seatedAt Zoe YellowTable

      // Rule
      @tc4_c1 seatedAt ?p1 ?table
      @tc4_c2 seatedAt ?p2 ?table
      @tc4_c3 conflictsWith ?p1 ?p2
      @tc4_and1 And $tc4_c1 $tc4_c2
      @tc4_and2 And $tc4_and1 $tc4_c3
      @tc4_conc tableConflict ?table ?p1 ?p2
      Implies $tc4_and2 $tc4_conc
    `,
    expected_nl: 'Learned facts about 12 guests with 8 conflicts'
  },

  // Detect the conflict at RedTable
  {
    action: 'prove',
    input_nl: 'Is there Ovidiu-Xena conflict at RedTable?',
    input_dsl: '@goal tableConflict RedTable Ovidiu Xena',
    expected_nl: 'True: Ovidiu and Xena are in conflict at RedTable'
  },

  // BlueTable should be OK (Paula-Toma not in conflict)
  {
    action: 'prove',
    input_nl: 'Is there Paula-Toma conflict at BlueTable?',
    input_dsl: '@goal tableConflict BlueTable Paula Toma',
    expected_nl: 'Cannot prove: Paula and Toma are not in conflict'
  },

  // Who is at RedTable?
  {
    action: 'query',
    input_nl: 'Who is at RedTable?',
    input_dsl: '@q seatedAt ?person RedTable',
    expected_nl: 'Ovidiu, Xena, and Radu are at RedTable'
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CASE 5: STRESS TEST - 16 guests, 4 tables, 12 conflicts                 ║
  // ║  Maximum complexity to test holographic retrieval capabilities.          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  {
    action: 'learn',
    input_nl: `
      CASE 5 - Corporate gala (16 guests, 4 tables)
      Greek-named employees: Alpha through Pi
      12 conflicts between departments/hierarchies
      PROBLEMATIC seating with MULTIPLE conflicts per table
    `,
    input_dsl: `
      // 16 guests (Greek letters)
      isA Alpha Guest
      isA Beta Guest
      isA Gamma Guest
      isA Delta Guest
      isA Epsilon Guest
      isA Zeta Guest
      isA Eta Guest
      isA Theta Guest
      isA Iota Guest
      isA Kappa Guest
      isA Lambda Guest
      isA Mu Guest
      isA Nu Guest
      isA Xi Guest
      isA Omicron Guest
      isA Pi Guest

      // 4 large tables
      isA NorthTable Table
      isA SouthTable Table
      isA EastTable Table
      isA WestTable Table

      // 12 CONFLICTS (24 facts)
      conflictsWith Alpha Beta
      conflictsWith Beta Alpha
      conflictsWith Gamma Delta
      conflictsWith Delta Gamma
      conflictsWith Epsilon Zeta
      conflictsWith Zeta Epsilon
      conflictsWith Eta Theta
      conflictsWith Theta Eta
      conflictsWith Iota Kappa
      conflictsWith Kappa Iota
      conflictsWith Lambda Mu
      conflictsWith Mu Lambda
      conflictsWith Nu Xi
      conflictsWith Xi Nu
      conflictsWith Omicron Pi
      conflictsWith Pi Omicron
      conflictsWith Alpha Gamma
      conflictsWith Gamma Alpha
      conflictsWith Beta Delta
      conflictsWith Delta Beta
      conflictsWith Epsilon Eta
      conflictsWith Eta Epsilon
      conflictsWith Iota Lambda
      conflictsWith Lambda Iota

      // PROBLEMATIC seating (conflicts at every table!)
      seatedAt Alpha NorthTable
      seatedAt Beta NorthTable
      seatedAt Gamma NorthTable
      seatedAt Delta NorthTable
      seatedAt Epsilon SouthTable
      seatedAt Zeta SouthTable
      seatedAt Eta SouthTable
      seatedAt Theta SouthTable
      seatedAt Iota EastTable
      seatedAt Kappa EastTable
      seatedAt Lambda EastTable
      seatedAt Mu EastTable
      seatedAt Nu WestTable
      seatedAt Xi WestTable
      seatedAt Omicron WestTable
      seatedAt Pi WestTable

      // Rule
      @tc5_c1 seatedAt ?p1 ?table
      @tc5_c2 seatedAt ?p2 ?table
      @tc5_c3 conflictsWith ?p1 ?p2
      @tc5_and1 And $tc5_c1 $tc5_c2
      @tc5_and2 And $tc5_and1 $tc5_c3
      @tc5_conc tableConflict ?table ?p1 ?p2
      Implies $tc5_and2 $tc5_conc
    `,
    expected_nl: 'Learned facts about 16 guests with 12 conflicts'
  },

  // NorthTable: Alpha-Beta conflict
  {
    action: 'prove',
    input_nl: 'Is there Alpha-Beta conflict at NorthTable?',
    input_dsl: '@goal tableConflict NorthTable Alpha Beta',
    expected_nl: 'True: Alpha and Beta are in conflict at NorthTable'
  },

  // NorthTable: Alpha-Gamma conflict
  {
    action: 'prove',
    input_nl: 'Is there Alpha-Gamma conflict at NorthTable?',
    input_dsl: '@goal tableConflict NorthTable Alpha Gamma',
    expected_nl: 'True: Alpha and Gamma are in conflict at NorthTable'
  },

  // SouthTable: Epsilon-Zeta conflict
  {
    action: 'prove',
    input_nl: 'Is there Epsilon-Zeta conflict at SouthTable?',
    input_dsl: '@goal tableConflict SouthTable Epsilon Zeta',
    expected_nl: 'True: Epsilon and Zeta are in conflict at SouthTable'
  },

  // WestTable: Nu-Xi conflict
  {
    action: 'prove',
    input_nl: 'Is there Nu-Xi conflict at WestTable?',
    input_dsl: '@goal tableConflict WestTable Nu Xi',
    expected_nl: 'True: Nu and Xi are in conflict at WestTable'
  },

  // Test holographic retrieval: all enemies of Alpha
  {
    action: 'query',
    input_nl: 'Who does Alpha conflict with?',
    input_dsl: '@q conflictsWith Alpha ?enemy',
    expected_nl: 'Alpha conflicts with Beta and Gamma'
  },

  // Count guests at NorthTable
  {
    action: 'query',
    input_nl: 'Who is at NorthTable?',
    input_dsl: '@q seatedAt ?person NorthTable',
    expected_nl: 'Alpha, Beta, Gamma, and Delta are at NorthTable'
  }
];

export default { name, description, theories, steps };
