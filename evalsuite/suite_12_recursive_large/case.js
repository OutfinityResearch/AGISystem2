/**
 * Test Case: Comprehensive Recursive Computation at Scale
 * Tests recursive complexity analysis, exponential growth reasoning, and computational bounds
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
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
    "hanoi_19 REQUIRES 524287_moves",
    "hanoi_30 REQUIRES 1073741823_moves",
    "hanoi_64 REQUIRES 18446744073709551615_moves",
    "hanoi_complexity IS O_of_2_power_n",
    "exponential_growth DOUBLES each_increment",
    // Time calculations
    "hanoi_20_seconds EQUALS 1048575",
    "hanoi_20_days EQUALS 12_days",
    "hanoi_64_years EQUALS 585_billion_years",
    "universe_age IS 13_8_billion_years",
    "585_billion GREATER_THAN 13_8_billion",
    "physical_computation HAS energy_limit",
    // Fibonacci
    "fibonacci_formula IS F_n_equals_F_n1_plus_F_n2",
    "fib_naive_complexity IS O_2_power_n",
    "fib_memoized_complexity IS O_n",
    "fibonacci_45 EQUALS 1134903170",
    "golden_ratio APPROXIMATES 1_618",
    "O_2_power_n SLOWER_THAN O_n",
    "memoization REDUCES complexity",
    // Factorial
    "factorial_formula IS n_times_n_minus_1_factorial",
    "factorial_20 EQUALS 2432902008176640000",
    "2_power_20 EQUALS 1048576",
    "factorial_growth IS faster_than_exponential",
    "stirling_approximation IS n_power_n_times_e_power_neg_n",
    "factorial_dominates_exponential AFTER n_3",
    // Complexity classes
    "P CLASS polynomial_time",
    "NP CLASS nondeterministic_polynomial",
    "EXPTIME CLASS exponential_time",
    "TSP IS NP_hard",
    "NP_hard MEANS no_poly_algorithm_known",
    // TSP
    "tsp_tours IS n_factorial_over_2",
    "tsp_20_cities HAS 60822550204416000_tours",
    "enumeration_rate IS 1_billion_per_second",
    "tsp_20_duration EQUALS 1_93_years",
    // Efficient algorithms
    "merge_sort IS O_n_log_n",
    "binary_search IS O_log_n",
    "master_theorem SOLVES divide_conquer_recurrences",
    "decision_tree HAS n_leaves",
    "binary_tree_height BOUNDS log_n",
    // Fibonacci equivalence
    "recursive_fib USES same_formula",
    "iterative_fib USES same_formula",
    "same_base_cases IMPLIES same_results",
    "F_0 EQUALS 0",
    "F_1 EQUALS 1",
    "F_10 EQUALS 55"
  ],

  tasks: [
    {
      id: "q1",
      TASK_NL: "Prove that Hanoi(n+1) requires approximately twice as many moves as Hanoi(n)",
      TASK_DSL: "@q1 exponential_growth PROVES doubling",
      ANSWEAR_NL: "T(n+1) = 2^(n+1) - 1 = 2×2^n - 1 = 2×(2^n - 1) + 1 = 2×T(n) + 1 ≈ 2×T(n)",
      PROOF_DSL: `@p1 hanoi_formula IS 2_power_n_minus_1
@p2 hanoi_complexity IS O_of_2_power_n
@p3 exponential_growth DOUBLES each_increment
@p4 hanoi_19 REQUIRES 524287_moves
@p5 hanoi_20 REQUIRES 1048575_moves
@c1 $p2 IMPLIES $p3
@c2 $p5 DIVIDED_BY $p4
@c3 $c2 EQUALS 2_point_000002
@c4 $c3 CONFIRMS doubling
@c5 $p1 GENERATES $c4
@c6 $c1 LEADS_TO $c5
@c7 $c6 ESTABLISHES recurrence
@chain $c7 PROVES exponential
@result $chain IS_A exponential_growth_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Exponential doubling: 1) T(n) = 2^n - 1 2) T(n+1)/T(n) → 2 3) Example: 1048575/524287 ≈ 2.000002."
    },
    {
      id: "q2",
      TASK_NL: "Is solving Hanoi with 64 disks physically possible? (Feasibility analysis)",
      TASK_DSL: "@q2 hanoi_64 EXCEEDS universe_age",
      ANSWEAR_NL: "585 billion years > 13.8 billion years (universe age). Physically impossible.",
      PROOF_DSL: `@p1 hanoi_64 REQUIRES 18446744073709551615_moves
@p2 hanoi_64_years EQUALS 585_billion_years
@p3 universe_age IS 13_8_billion_years
@p4 585_billion GREATER_THAN 13_8_billion
@p5 physical_computation HAS energy_limit
@c1 $p1 CONVERTS_TO $p2
@c2 $p2 COMPARES_WITH $p3
@c3 $c2 USES $p4
@c4 $c3 PROVES infeasible
@c5 $p5 CONFIRMS $c4
@c6 $c4 ESTABLISHES impossibility
@c7 585_billion DIVIDED_BY 13_8_billion
@c8 $c7 EQUALS 42_times_universe
@chain $c6 COMPLETES analysis
@result $chain IS_A feasibility_analysis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Feasibility: 1) 2^64 - 1 ≈ 18 quintillion moves 2) = 585 billion years 3) Universe = 13.8 billion years 4) 42× age of universe."
    },
    {
      id: "q3",
      TASK_NL: "Compare naive vs memoized Fibonacci for n=45 (Complexity analysis)",
      TASK_DSL: "@q3 memoization REDUCES complexity",
      ANSWEAR_NL: "Naive: O(2^45) ≈ 35 trillion operations. Memoized: O(45) = 45 operations. 700 billion times faster.",
      PROOF_DSL: `@p1 fib_naive_complexity IS O_2_power_n
@p2 fib_memoized_complexity IS O_n
@p3 fibonacci_45 EQUALS 1134903170
@p4 O_2_power_n SLOWER_THAN O_n
@p5 memoization REDUCES complexity
@c1 $p1 APPLIES_TO n_45
@c2 $c1 COMPUTES 35_trillion_ops
@c3 $p2 APPLIES_TO n_45
@c4 $c3 COMPUTES 45_ops
@c5 $c2 DIVIDED_BY $c4
@c6 $c5 EQUALS 700_billion_speedup
@c7 $p4 CONFIRMS $c6
@c8 $p5 ENABLES $c7
@chain $c8 COMPLETES comparison
@result $chain IS_A complexity_comparison_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Complexity comparison: 1) Naive Fib(45): O(2^45) ≈ 35T ops 2) Memoized: O(45) = 45 ops 3) Speedup: 700 billion×."
    },
    {
      id: "q4",
      TASK_NL: "Prove factorial grows faster than exponential (n! >> 2^n for large n)",
      TASK_DSL: "@q4 factorial_growth IS faster_than_exponential",
      ANSWEAR_NL: "20! = 2.4 quintillion, 2^20 = 1 million. Ratio: 2.4 trillion. Factorial wins.",
      PROOF_DSL: `@p1 factorial_20 EQUALS 2432902008176640000
@p2 2_power_20 EQUALS 1048576
@p3 factorial_growth IS faster_than_exponential
@p4 factorial_dominates_exponential AFTER n_3
@c1 $p1 DIVIDED_BY $p2
@c2 $c1 EQUALS 2_3_trillion_ratio
@c3 $c2 CONFIRMS $p3
@c4 factorial_10 DIVIDED_BY 2_power_10
@c5 $c4 EQUALS 3544_ratio
@c6 $c2 MUCH_GREATER_THAN $c5
@c7 $c6 SHOWS growth_acceleration
@c8 $p4 EXPLAINS $c7
@chain $c8 PROVES dominance
@result $chain IS_A growth_rate_comparison
@proof $result PROVES $q4`,
      PROOF_NL: "Growth comparison: 1) 20!/2^20 = 2.4 quintillion/1 million = 2.3 trillion 2) Factorial dominates after n=3."
    },
    {
      id: "q5",
      TASK_NL: "How many tours for 20-city TSP? Why is this computationally hard?",
      TASK_DSL: "@q5 tsp_20_cities HAS 60822550204416000_tours",
      ANSWEAR_NL: "Tours = 19!/2 ≈ 60 quadrillion. Even at 1 billion/sec, would take 2 years to enumerate all.",
      PROOF_DSL: `@p1 tsp_tours IS n_factorial_over_2
@p2 tsp_20_cities HAS 60822550204416000_tours
@p3 TSP IS NP_hard
@p4 NP_hard MEANS no_poly_algorithm_known
@p5 enumeration_rate IS 1_billion_per_second
@p6 tsp_20_duration EQUALS 1_93_years
@c1 $p1 COMPUTES $p2
@c2 $p2 DIVIDED_BY $p5
@c3 $c2 EQUALS $p6
@c4 $p3 EXPLAINS $c3
@c5 $p4 CONFIRMS $c4
@c6 $c3 PROVES intractability
@chain $c6 COMPLETES analysis
@result $chain IS_A combinatorial_explosion_proof
@proof $result PROVES $q5`,
      PROOF_NL: "TSP explosion: 1) (n-1)!/2 = 19!/2 ≈ 60 quadrillion tours 2) At 1B/sec = 1.93 years 3) NP-hard."
    },
    {
      id: "q6",
      TASK_NL: "Apply master theorem to merge sort recurrence T(n) = 2T(n/2) + n",
      TASK_DSL: "@q6 merge_sort IS O_n_log_n",
      ANSWEAR_NL: "a=2, b=2, f(n)=n. log_b(a)=1. f(n)=Θ(n^1). Case 2: T(n)=Θ(n log n).",
      PROOF_DSL: `@p1 merge_sort IS O_n_log_n
@p2 master_theorem SOLVES divide_conquer_recurrences
@c1 recurrence HAS a_equals_2
@c2 recurrence HAS b_equals_2
@c3 recurrence HAS f_equals_n
@c4 log_base_2_of_2 EQUALS 1
@c5 f_n MATCHES n_power_1
@c6 $c5 TRIGGERS case_2
@c7 $c6 YIELDS n_log_n
@c8 $c7 CONFIRMS $p1
@c9 $p2 APPLIES_TO $c8
@chain $c9 COMPLETES derivation
@result $chain IS_A master_theorem_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Master theorem: 1) T(n)=2T(n/2)+n 2) a=2, b=2, f(n)=n 3) Case 2 applies 4) T(n)=Θ(n log n)."
    },
    {
      id: "q7",
      TASK_NL: "Prove binary search is optimal for sorted array search (Θ(log n) lower bound)",
      TASK_DSL: "@q7 binary_search IS O_log_n",
      ANSWEAR_NL: "Decision tree must have n leaves. Binary tree with n leaves has height ≥ log₂(n). Therefore Ω(log n).",
      PROOF_DSL: `@p1 binary_search IS O_log_n
@p2 decision_tree HAS n_leaves
@p3 binary_tree_height BOUNDS log_n
@c1 comparison_search REQUIRES $p2
@c2 $p2 IMPLIES $p3
@c3 $p3 GIVES lower_bound
@c4 $c3 EQUALS Omega_log_n
@c5 $p1 ACHIEVES upper_bound
@c6 $c4 MATCHES $c5
@c7 $c6 PROVES optimality
@c8 n_1024 REQUIRES 10_comparisons
@c9 binary_search USES 10_for_1024
@c10 $c9 CONFIRMS $c7
@result $c10 IS_A optimality_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Binary search optimality: 1) Decision tree has n leaves 2) Height ≥ log₂(n) 3) Bounds match → optimal."
    },
    {
      id: "q8",
      TASK_NL: "Prove recursive and iterative Fibonacci compute same values (Correctness proof)",
      TASK_DSL: "@q8 same_base_cases IMPLIES same_results",
      ANSWEAR_NL: "Both compute F(n)=F(n-1)+F(n-2) with F(0)=0, F(1)=1. Same recurrence, same base cases → same results.",
      PROOF_DSL: `@p1 fibonacci_formula IS F_n_equals_F_n1_plus_F_n2
@p2 F_0 EQUALS 0
@p3 F_1 EQUALS 1
@p4 recursive_fib USES same_formula
@p5 iterative_fib USES same_formula
@p6 same_base_cases IMPLIES same_results
@p7 F_10 EQUALS 55
@c1 $p4 SHARES $p1
@c2 $p5 SHARES $p1
@c3 $c1 MATCHES $c2
@c4 $p2 SHARED_BY both
@c5 $p3 SHARED_BY both
@c6 $c4 COMBINES $c5
@c7 $c3 COMBINES $c6
@c8 $c7 TRIGGERS $p6
@c9 $p7 VERIFIES $c8
@result $c9 IS_A equivalence_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Equivalence proof: 1) Same base cases F(0)=0, F(1)=1 2) Same recurrence 3) By induction: same results."
    }
  ]
};
