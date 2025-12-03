/**
 * Test Case: Comprehensive Recursive Computation at Scale
 * Tests recursive complexity analysis, exponential growth reasoning, and computational bounds
 * Version: 5.0 - Complex proofs with recurrence relations, complexity classes, and feasibility analysis
 */
module.exports = {
  id: "suite_12_recursive_large",
  name: "Comprehensive Recursive Computation at Scale",

  theory_NL: "Large-scale recursive analysis. Towers of Hanoi: T(n) = 2^n - 1. For n=20: over 1 million moves. For n=64 (legend): 18 quintillion moves. At 1 move/second, n=64 takes 585 billion years. Fibonacci: F(n) = F(n-1) + F(n-2). Naive recursion is O(2^n). Memoized is O(n). F(45) = 1,134,903,170. Factorial: n! grows faster than exponential. 20! = 2.4 quintillion. Computational complexity classes: P (polynomial), NP (nondeterministic polynomial), EXPTIME (exponential). Hanoi is in P for fixed n but total work is exponential in n. Traveling Salesman with n cities has n!/2 tours. For 20 cities: 60 quadrillion tours. Recursive divide-and-conquer: Merge sort O(n log n), Binary search O(log n). Master theorem for recurrence solving.",

  theory_DSL: [
    // Hanoi complexity
    "hanoi_formula IS 2_power_n_minus_1",
    "hanoi_15 REQUIRES 32767_moves",
    "hanoi_20 REQUIRES 1048575_moves",
    "hanoi_30 REQUIRES 1073741823_moves",
    "hanoi_64 REQUIRES 18446744073709551615_moves",
    "hanoi_complexity IS O_of_2_power_n",
    // Time calculations
    "hanoi_20_seconds EQUALS 1048575",
    "hanoi_20_days EQUALS 12_days",
    "hanoi_64_years EQUALS 585_billion_years",
    "universe_age IS 13_8_billion_years",
    // Fibonacci
    "fibonacci_formula IS F_n_equals_F_n1_plus_F_n2",
    "fib_naive_complexity IS O_2_power_n",
    "fib_memoized_complexity IS O_n",
    "fibonacci_45 EQUALS 1134903170",
    "golden_ratio APPROXIMATES 1_618",
    // Factorial
    "factorial_formula IS n_times_n_minus_1_factorial",
    "factorial_20 EQUALS 2432902008176640000",
    "factorial_growth IS faster_than_exponential",
    "stirling_approximation IS n_power_n_times_e_power_neg_n",
    // Complexity classes
    "P CLASS polynomial_time",
    "NP CLASS nondeterministic_polynomial",
    "EXPTIME CLASS exponential_time",
    "TSP IS NP_hard",
    // TSP
    "tsp_tours IS n_factorial_over_2",
    "tsp_20_cities HAS 60822550204416000_tours",
    // Efficient algorithms
    "merge_sort IS O_n_log_n",
    "binary_search IS O_log_n",
    "master_theorem SOLVES divide_conquer_recurrences"
  ],

  tasks: [
    // Q1: Hanoi exponential growth proof
    {
      id: "q1",
      TASK_NL: "Prove that Hanoi(n+1) requires approximately twice as many moves as Hanoi(n)",
      TASK_DSL: "@q1 hanoi_doubling PROVEN",
      ANSWEAR_NL: "T(n+1) = 2^(n+1) - 1 = 2×2^n - 1 = 2×(2^n - 1) + 1 = 2×T(n) + 1 ≈ 2×T(n)",
      PROOF_DSL: `@p1 hanoi_formula IS 2_power_n_minus_1
@p2 hanoi_20 REQUIRES 1048575_moves
@p3 hanoi_complexity IS O_of_2_power_n
@T_n 2_power_n MINUS 1
@T_n_plus_1 2_power_n_plus_1 MINUS 1
@expand $T_n_plus_1 EQUALS 2_times_2_power_n MINUS 1
@factor $expand EQUALS 2_times_T_n PLUS 1
@c1 $factor ESTABLISHES recurrence
@ratio T_n_plus_1 DIVIDED_BY T_n
@compute $ratio APPROACHES 2 AS n_grows
@example hanoi_19 REQUIRES 524287
@example2 hanoi_20 REQUIRES 1048575
@verify $example2 DIVIDED_BY $example
@check $verify EQUALS 2_point_000002
@asymptotic $check CONFIRMS doubling
@result $asymptotic IS_A exponential_growth_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Exponential doubling: 1) T(n) = 2^n - 1 2) T(n+1) = 2×T(n) + 1 3) Ratio T(n+1)/T(n) → 2 as n grows 4) Example: T(20)/T(19) ≈ 2.000002."
    },

    // Q2: Hanoi 64 feasibility analysis
    {
      id: "q2",
      TASK_NL: "Is solving Hanoi with 64 disks physically possible? (Feasibility analysis)",
      TASK_DSL: "@q2 hanoi_64 IS physically_impossible",
      ANSWEAR_NL: "585 billion years > 13.8 billion years (universe age). Physically impossible.",
      PROOF_DSL: `@p1 hanoi_64 REQUIRES 18446744073709551615_moves
@p2 hanoi_64_years EQUALS 585_billion_years
@p3 universe_age IS 13_8_billion_years
@convert $p1 AT 1_second_per_move
@seconds $convert EQUALS 18446744073709551615
@minutes $seconds DIVIDED_BY 60
@hours $minutes DIVIDED_BY 60
@days $hours DIVIDED_BY 24
@years $days DIVIDED_BY 365
@compute $years EQUALS 585_billion
@compare $p2 GREATER_THAN $p3
@ratio 585_billion DIVIDED_BY 13_8_billion
@factor $ratio EQUALS 42_times_universe_age
@even_faster 1_million_moves_per_second
@still_too_long $even_faster STILL_REQUIRES 585_thousand_years
@conclusion $compare PROVES infeasible
@physical_limit energy_available FINITE
@result $conclusion IS_A feasibility_analysis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Feasibility: 1) 2^64 - 1 ≈ 18 quintillion moves 2) At 1/sec = 585 billion years 3) Universe age = 13.8 billion years 4) Would take 42× age of universe 5) Physically impossible."
    },

    // Q3: Fibonacci complexity comparison
    {
      id: "q3",
      TASK_NL: "Compare naive vs memoized Fibonacci for n=45 (Complexity analysis)",
      TASK_DSL: "@q3 memoization EXPONENTIALLY_FASTER",
      ANSWEAR_NL: "Naive: O(2^45) ≈ 35 trillion operations. Memoized: O(45) = 45 operations. 700 billion times faster.",
      PROOF_DSL: `@p1 fib_naive_complexity IS O_2_power_n
@p2 fib_memoized_complexity IS O_n
@p3 fibonacci_45 EQUALS 1134903170
@naive_ops 2_power_45 APPROXIMATELY
@compute_naive $naive_ops EQUALS 35_trillion
@memo_ops 45 OPERATIONS
@ratio $compute_naive DIVIDED_BY $memo_ops
@speedup $ratio EQUALS 700_billion_times
@naive_time $compute_naive AT 1_billion_ops_per_sec
@naive_duration $naive_time EQUALS 35_seconds
@memo_time $memo_ops AT 1_billion_ops_per_sec
@memo_duration $memo_time EQUALS 0_000000045_seconds
@practical $memo_duration IS instant
@impractical $naive_duration IS noticeable
@exponential_vs_linear $speedup GROWS_WITH n
@result $speedup IS_A complexity_comparison_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Complexity comparison: 1) Naive Fib(45): O(2^45) ≈ 35T ops 2) Memoized: O(45) = 45 ops 3) Speedup: 700 billion× 4) Naive: 35 sec, Memo: instant."
    },

    // Q4: Factorial vs exponential growth
    {
      id: "q4",
      TASK_NL: "Prove factorial grows faster than exponential (n! >> 2^n for large n)",
      TASK_DSL: "@q4 factorial DOMINATES exponential",
      ANSWEAR_NL: "20! = 2.4 quintillion, 2^20 = 1 million. Ratio: 2.4 trillion. Factorial wins.",
      PROOF_DSL: `@p1 factorial_20 EQUALS 2432902008176640000
@p2 2_power_20 EQUALS 1048576
@p3 factorial_growth IS faster_than_exponential
@ratio $p1 DIVIDED_BY $p2
@compute $ratio EQUALS 2_3_trillion
@at_n_10 factorial_10 EQUALS 3628800
@at_n_10_exp 2_power_10 EQUALS 1024
@ratio_10 $at_n_10 DIVIDED_BY $at_n_10_exp
@compute_10 $ratio_10 EQUALS 3544
@growth $compute MUCH_GREATER_THAN $compute_10
@reason n_factorial MULTIPLIES n_terms
@reason2 2_power_n MULTIPLIES 2_n_times
@stirling n_power_n DOMINATES 2_power_n
@crossover n_GREATER_THAN_3 IMPLIES factorial_wins
@verify 4_factorial EQUALS 24
@verify2 2_power_4 EQUALS 16
@cross $verify GREATER_THAN $verify2
@result $growth IS_A growth_rate_comparison
@proof $result PROVES $q4`,
      PROOF_NL: "Growth comparison: 1) 20!/2^20 = 2.4 quintillion/1 million = 2.3 trillion 2) n! multiplies n decreasing terms 3) 2^n multiplies 2 n times 4) Factorial dominates after n=3."
    },

    // Q5: TSP combinatorial explosion
    {
      id: "q5",
      TASK_NL: "How many tours for 20-city TSP? Why is this computationally hard?",
      TASK_DSL: "@q5 tsp_20 IS computationally_intractable",
      ANSWEAR_NL: "Tours = 19!/2 ≈ 60 quadrillion. Even at 1 billion/sec, would take 2 years to enumerate all.",
      PROOF_DSL: `@p1 tsp_tours IS n_factorial_over_2
@p2 tsp_20_cities HAS 60822550204416000_tours
@p3 TSP IS NP_hard
@formula n_minus_1_factorial DIVIDED_BY 2
@for_20 19_factorial DIVIDED_BY 2
@compute $for_20 EQUALS 60_8_quadrillion
@enumerate_rate 1_billion_per_second
@total_time $p2 DIVIDED_BY $enumerate_rate
@seconds $total_time EQUALS 60_8_million
@days $seconds DIVIDED_BY 86400
@years $days DIVIDED_BY 365
@duration $years EQUALS 1_93_years
@np_hard_means no_polynomial_algorithm_known
@heuristics approximate_in_polynomial
@gap optimal_vs_heuristic MAY_BE_LARGE
@practical branch_and_bound HELPS
@still_exponential worst_case EXPONENTIAL
@result $duration IS_A combinatorial_explosion_proof
@proof $result PROVES $q5`,
      PROOF_NL: "TSP explosion: 1) (n-1)!/2 = 19!/2 ≈ 60 quadrillion tours 2) At 1B/sec = 1.93 years to enumerate 3) NP-hard: no known poly-time algorithm 4) Must use heuristics for large n."
    },

    // Q6: Master theorem application
    {
      id: "q6",
      TASK_NL: "Apply master theorem to merge sort recurrence T(n) = 2T(n/2) + n",
      TASK_DSL: "@q6 merge_sort COMPLEXITY O_n_log_n",
      ANSWEAR_NL: "a=2, b=2, f(n)=n. log_b(a)=1. f(n)=Θ(n^1). Case 2: T(n)=Θ(n log n).",
      PROOF_DSL: `@p1 merge_sort IS O_n_log_n
@p2 master_theorem SOLVES divide_conquer_recurrences
@recurrence T_n EQUALS 2_T_n_div_2 PLUS n
@identify_a a EQUALS 2
@identify_b b EQUALS 2
@identify_f f_n EQUALS n
@compute_critical log_base_b_of_a
@critical_exp $compute_critical EQUALS 1
@compare f_n WITH n_power_1
@case_check $compare IS_EQUAL
@case2 f_n EQUALS Theta_n_power_critical
@apply_case2 T_n EQUALS Theta_n_log_n
@verify $apply_case2 MATCHES $p1
@example n_1024 SORTED_IN 10240_steps
@linear_would_be 1024_steps
@log_factor log_1024 EQUALS 10
@total 1024_times_10 EQUALS 10240
@result $apply_case2 IS_A master_theorem_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Master theorem: 1) T(n)=2T(n/2)+n 2) a=2, b=2, f(n)=n 3) log₂(2)=1, f(n)=Θ(n¹) 4) Case 2 applies 5) T(n)=Θ(n log n)."
    },

    // Q7: Binary search optimality
    {
      id: "q7",
      TASK_NL: "Prove binary search is optimal for sorted array search (Θ(log n) lower bound)",
      TASK_DSL: "@q7 binary_search IS optimal",
      ANSWEAR_NL: "Decision tree must have n leaves. Binary tree with n leaves has height ≥ log₂(n). Therefore Ω(log n).",
      PROOF_DSL: `@p1 binary_search IS O_log_n
@tree_model comparison_based_search
@leaves_needed n POSSIBLE_ANSWERS
@binary_tree_property height_h HAS_AT_MOST 2_power_h_leaves
@constraint 2_power_h GREATER_THAN_OR_EQUAL n
@solve_h h GREATER_THAN_OR_EQUAL log_base_2_n
@lower_bound $solve_h IS Omega_log_n
@upper_bound binary_search ACHIEVES O_log_n
@match $lower_bound EQUALS $upper_bound
@optimal $match PROVES tight_bound
@example n_1024 REQUIRES at_least_10_comparisons
@achieve binary_search USES 10_comparisons
@exact $example MATCHES $achieve
@information_theoretic log_n BITS_NEEDED
@result $optimal IS_A optimality_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Binary search optimality: 1) Decision tree has n leaves 2) Binary tree height h ≥ log₂(n) 3) Lower bound Ω(log n) 4) Binary search achieves O(log n) 5) Bounds match → optimal."
    },

    // Q8: Recursive vs iterative equivalence
    {
      id: "q8",
      TASK_NL: "Prove recursive and iterative Fibonacci compute same values (Correctness proof)",
      TASK_DSL: "@q8 recursive_iterative EQUIVALENT",
      ANSWEAR_NL: "Both compute F(n)=F(n-1)+F(n-2) with F(0)=0, F(1)=1. Same recurrence, same base cases → same results.",
      PROOF_DSL: `@p1 fibonacci_formula IS F_n_equals_F_n1_plus_F_n2
@base_cases F_0 EQUALS 0
@base_cases2 F_1 EQUALS 1
@recursive_def F_n COMPUTES F_n_1 PLUS F_n_2
@iterative_def loop MAINTAINS prev AND current
@invariant after_i_iterations current EQUALS F_i
@base_check iteration_0 HAS current_0
@base_check2 iteration_1 HAS current_1
@inductive_step current_i_plus_1 EQUALS current_i PLUS prev_i
@recurrence $inductive_step MATCHES $recursive_def
@by_induction $invariant HOLDS_FOR_ALL n
@termination both_terminate_at_n
@same_base $base_cases AND $base_cases2
@same_recurrence $recursive_def EQUALS $iterative_def
@equivalence $same_base AND $same_recurrence
@verify F_10 EQUALS 55
@recursive_55 recursive COMPUTES 55
@iterative_55 iterative COMPUTES 55
@match $recursive_55 EQUALS $iterative_55
@result $equivalence IS_A equivalence_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Equivalence proof: 1) Same base cases F(0)=0, F(1)=1 2) Same recurrence F(n)=F(n-1)+F(n-2) 3) Iterative maintains invariant: current=F(i) 4) Induction proves invariant 5) Same computation."
    }
  ]
};
