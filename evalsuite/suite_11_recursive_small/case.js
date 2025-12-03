/**
 * Test Case: Comprehensive Recursive Planning & State Space Search
 * Tests recursive problem solving, constraint propagation, backtracking search, and optimal path finding
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_11_recursive_small",
  name: "Comprehensive Recursive Planning & State Space Search",

  theory_NL: "Wolf-Goat-Cabbage problem with full state space. States: L=left bank, R=right bank. Each entity (farmer F, wolf W, goat G, cabbage C) has position. Constraints: W+G alone (no F) → G eaten. G+C alone (no F) → C eaten. W+C alone is safe. Boat capacity: F + one item. Goal: all on R. Solution requires 7 crossings. State space search with backtracking. Towers of Hanoi: 3 pegs, n disks. Rules: move one disk, top only, larger cannot go on smaller. Formula: 2^n-1 moves. Recursive pattern: move n-1 to auxiliary, move largest to target, move n-1 from auxiliary to target. Path planning: grid with obstacles, find shortest path using BFS. Backtrack on dead ends.",

  theory_DSL: [
    "wolf EATS goat",
    "goat EATS cabbage",
    "wolf NOT_EATS cabbage",
    "farmer REQUIRED_FOR crossing",
    "boat CAPACITY farmer_plus_one",
    "wolf_goat_alone CAUSES goat_eaten",
    "goat_cabbage_alone CAUSES cabbage_eaten",
    "wolf_cabbage_alone IS safe",
    "initial_state ALL_ON left_bank",
    "goal_state ALL_ON right_bank",
    "solution HAS 7_crossings",
    "crossing_1 IS take_goat_right",
    "crossing_2 IS return_alone",
    "crossing_3 IS take_wolf_right",
    "crossing_4 IS bring_goat_back",
    "crossing_5 IS take_cabbage_right",
    "crossing_6 IS return_alone",
    "crossing_7 IS take_goat_right",
    "valid_state HAS no_violations",
    "invalid_state HAS constraint_violation",
    "dead_end REQUIRES backtrack",
    "hanoi_3_disks REQUIRES 7_moves",
    "hanoi_formula IS 2_power_n_minus_1",
    "disk_small SMALLER_THAN disk_medium",
    "disk_medium SMALLER_THAN disk_large",
    "large_on_small IS forbidden",
    "BFS EXPLORES level_by_level",
    "DFS EXPLORES depth_first",
    "backtrack UNDOES last_move"
  ],

  tasks: [
    {
      id: "q1",
      TASK_NL: "Why must the farmer take the goat first? (Constraint-based reasoning)",
      TASK_DSL: "@q1 first_move MUST_BE take_goat",
      ANSWEAR_NL: "Taking wolf or cabbage first leaves goat with the other → violation. Goat is the only safe first choice.",
      PROOF_DSL: `@p1 wolf_goat_alone CAUSES goat_eaten
@p2 goat_cabbage_alone CAUSES cabbage_eaten
@p3 wolf_cabbage_alone IS safe
@try1 take_wolf LEAVES goat_cabbage
@c1 $try1 TRIGGERS $p2
@fail1 $c1 IS violation
@try2 take_cabbage LEAVES wolf_goat
@c2 $try2 TRIGGERS $p1
@fail2 $c2 IS violation
@try3 take_goat LEAVES wolf_cabbage
@c3 $try3 MATCHES $p3
@success $c3 IS valid
@only $success REMAINS option
@result $only IS_A exhaustive_search_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Try wolf → goat+cabbage → violation. Try cabbage → wolf+goat → violation. Try goat → wolf+cabbage → safe. Only goat works."
    },
    {
      id: "q2",
      TASK_NL: "Verify the complete 7-crossing solution is valid (no constraint violations)",
      TASK_DSL: "@q2 solution IS verified_valid",
      ANSWEAR_NL: "Each of 7 states is valid - no wolf+goat or goat+cabbage alone without farmer",
      PROOF_DSL: `@p1 crossing_1 IS take_goat_right
@p2 crossing_2 IS return_alone
@p3 crossing_3 IS take_wolf_right
@p4 crossing_4 IS bring_goat_back
@p5 crossing_5 IS take_cabbage_right
@p6 crossing_6 IS return_alone
@p7 crossing_7 IS take_goat_right
@s1 $p1 PRODUCES valid_state_1
@s2 $p2 PRODUCES valid_state_2
@s3 $p3 PRODUCES valid_state_3
@s4 $p4 PRODUCES valid_state_4
@s5 $p5 PRODUCES valid_state_5
@s6 $p6 PRODUCES valid_state_6
@s7 $p7 PRODUCES goal_state
@chain $s1 LEADS_TO $s7
@result $chain IS_A solution_verification_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Each of 7 crossings produces valid intermediate state. Final state reaches goal."
    },
    {
      id: "q3",
      TASK_NL: "After taking goat, what if we try bringing wolf next? (Backtracking needed)",
      TASK_DSL: "@q3 wrong_choice TRIGGERS backtrack",
      ANSWEAR_NL: "After goat→right, if we return and take wolf: wolf+goat on right while farmer returns → goat eaten → must backtrack",
      PROOF_DSL: `@p1 crossing_1 IS take_goat_right
@p2 wolf_goat_alone CAUSES goat_eaten
@state1 goat ON right_bank
@try farmer TAKES wolf_right
@state2 wolf_goat ON right_bank
@return farmer RETURNS alone
@state3 wolf_goat ALONE right_bank
@c1 $state3 MATCHES $p2
@violation $c1 IS constraint_violation
@detect $violation TRIGGERS backtrack
@restore backtrack RETURNS state1
@result $detect IS_A backtracking_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Take wolf → wolf+goat on right → farmer returns → wolf+goat alone → violation → backtrack."
    },
    {
      id: "q4",
      TASK_NL: "How does Hanoi recursion work for 3 disks? (Recursive pattern proof)",
      TASK_DSL: "@q4 hanoi_3 DECOMPOSES recursively",
      ANSWEAR_NL: "Move 2 disks A→B (recursively), move large A→C, move 2 disks B→C (recursively). T(3)=2×T(2)+1=7",
      PROOF_DSL: `@p1 hanoi_3_disks REQUIRES 7_moves
@p2 hanoi_formula IS 2_power_n_minus_1
@base hanoi_1 REQUIRES 1_move
@recurse_2 hanoi_2 REQUIRES 3_moves
@recurse_3 hanoi_3 REQUIRES 7_moves
@decomp1 move_2_to_B TAKES 3_moves
@decomp2 move_large_to_C TAKES 1_move
@decomp3 move_2_to_C TAKES 3_moves
@total 3_plus_1_plus_3 EQUALS 7
@verify $total MATCHES $p1
@result $verify IS_A recursive_decomposition_proof
@proof $result PROVES $q4`,
      PROOF_NL: "T(1)=1, T(2)=3, T(3)=2×3+1=7. Decompose: move 2 (3) + move large (1) + move 2 (3) = 7."
    },
    {
      id: "q5",
      TASK_NL: "How many possible states exist in WGC problem? (State space analysis)",
      TASK_DSL: "@q5 state_space HAS size_16",
      ANSWEAR_NL: "4 entities × 2 positions each = 2^4 = 16 states, but only 10 are valid (no violations)",
      PROOF_DSL: `@p1 initial_state ALL_ON left_bank
@p2 goal_state ALL_ON right_bank
@entities farmer_wolf_goat_cabbage HAS count_4
@positions left_or_right HAS count_2
@total 2_power_4 EQUALS 16
@c1 wolf_goat_alone IS invalid
@c2 goat_cabbage_alone IS invalid
@invalid 6_states VIOLATE constraints
@valid 16_minus_6 EQUALS 10
@reachable 8_states IN solution
@optimal 7_transitions IS minimum
@result $valid IS_A state_space_analysis
@proof $result PROVES $q5`,
      PROOF_NL: "4 entities × 2 positions = 16. 6 invalid. 10 valid. Solution uses 8 states, 7 transitions."
    },
    {
      id: "q6",
      TASK_NL: "Verify that placing large disk on small is always detected as forbidden",
      TASK_DSL: "@q6 large_on_small ALWAYS forbidden",
      ANSWEAR_NL: "Constraint: larger cannot go on smaller. Any attempt triggers violation.",
      PROOF_DSL: `@p1 disk_small SMALLER_THAN disk_medium
@p2 disk_medium SMALLER_THAN disk_large
@p3 large_on_small IS forbidden
@c1 $p1 ESTABLISHES size_order_1
@c2 $p2 ESTABLISHES size_order_2
@c3 $c1 COMBINES $c2
@try1 large_onto_small VIOLATES $p3
@try2 medium_onto_small VIOLATES $p3
@try3 large_onto_medium VIOLATES $p3
@all $try1 CONFIRMS $try3
@result $all IS_A constraint_verification_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Size order established. Large→small: forbidden. Medium→small: forbidden. Large→medium: forbidden."
    },
    {
      id: "q7",
      TASK_NL: "Prove 7 crossings is optimal for WGC (no shorter solution exists)",
      TASK_DSL: "@q7 7_crossings IS optimal",
      ANSWEAR_NL: "Goat must cross 3 times (there, back, there). Each other item crosses once. Minimum bound = 7.",
      PROOF_DSL: `@p1 wolf_goat_alone CAUSES goat_eaten
@p2 goat_cabbage_alone CAUSES cabbage_eaten
@c1 goat CONFLICTS_WITH wolf
@c2 goat CONFLICTS_WITH cabbage
@c3 goat MUST_CROSS 3_times
@c4 wolf MUST_CROSS 1_time
@c5 cabbage MUST_CROSS 1_time
@c6 farmer RETURNS 2_times
@sum 3_plus_2_plus_2 EQUALS 7
@achieved solution HAS 7_crossings
@match $sum EQUALS $achieved
@result $match IS_A optimality_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Goat: 3 crossings. Wolf+cabbage: 2 crossings. Farmer returns: 2. Total: 7 minimum."
    },
    {
      id: "q8",
      TASK_NL: "How does the solver detect and recover from dead-ends?",
      TASK_DSL: "@q8 dead_end_detection IS working",
      ANSWEAR_NL: "After each move, check constraints. Violation → mark as dead-end → backtrack → try alternative",
      PROOF_DSL: `@p1 valid_state HAS no_violations
@p2 invalid_state HAS constraint_violation
@p3 dead_end REQUIRES backtrack
@step1 make_move PRODUCES new_state
@step2 check_constraints ON $step1
@branch1 $step2 PASSES continue
@branch2 $step2 FAILS mark_dead_end
@c1 $branch2 TRIGGERS $p3
@c2 $c1 RESTORES previous_state
@c3 $c2 ENABLES try_alternative
@complete $branch1 OR $branch2
@result $complete IS_A dead_end_handling_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Make move → check constraints → if fail: mark dead-end → backtrack → try alternative."
    }
  ]
};
