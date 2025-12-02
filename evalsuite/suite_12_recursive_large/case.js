/**
 * Test Case: Recursive Planning Problems - Large Scale
 * Tests recursive reasoning at scale with Towers of Hanoi 15-20 disks and complex recursive Fibonacci/factorial computations. Tests if the reasoner can handle exponential growth in solution space and apply mathematical formulas correctly.
 * Version: 3.0
 */

module.exports = {
  id: "suite_12_recursive_large",
  name: "Recursive Planning Problems - Large Scale",
  description: "Tests recursive reasoning at scale with Towers of Hanoi 15-20 disks and complex recursive Fibonacci/factorial computations. Tests if the reasoner can handle exponential growth in solution space and apply mathematical formulas correctly.",
  theory: {
    natural_language: "Towers of Hanoi at scale. The minimum number of moves for n disks follows the formula: moves(n) = 2^n - 1. For 15 disks: 32,767 moves. For 20 disks: 1,048,575 moves. The recursive structure remains: to move n disks, first move n-1 disks to auxiliary, move largest to target, then move n-1 from auxiliary to target. Time complexity is O(2^n) - exponential growth. Fibonacci sequence: F(n) = F(n-1) + F(n-2), with F(0)=0, F(1)=1. F(15) = 610. F(20) = 6765. Factorial: n! = n × (n-1)!. 15! = 1,307,674,368,000. 20! = 2,432,902,008,176,640,000. These problems test recursive depth and large number handling.",
    expected_facts: [
          "hanoi_formula IS 2_power_n_minus_1",
          "hanoi_15_disks REQUIRES 32767_moves",
          "hanoi_16_disks REQUIRES 65535_moves",
          "hanoi_17_disks REQUIRES 131071_moves",
          "hanoi_18_disks REQUIRES 262143_moves",
          "hanoi_19_disks REQUIRES 524287_moves",
          "hanoi_20_disks REQUIRES 1048575_moves",
          "hanoi_complexity IS exponential",
          "hanoi_complexity IS O_2_power_n",
          "fibonacci_formula IS F_n_equals_F_n1_plus_F_n2",
          "fibonacci_0 EQUALS 0",
          "fibonacci_1 EQUALS 1",
          "fibonacci_15 EQUALS 610",
          "fibonacci_20 EQUALS 6765",
          "factorial_formula IS n_times_n_minus_1_factorial",
          "factorial_0 EQUALS 1",
          "factorial_15 EQUALS 1307674368000",
          "factorial_20 EQUALS 2432902008176640000",
          "hanoi_20_time_seconds EQUALS 1048575",
          "hanoi_20_time_days APPROXIMATELY 12",
          "hanoi_20 IS impractical",
          "exponential_growth DOUBLES_WITH each_additional_disk"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "How many moves are needed for Towers of Hanoi with 15 disks?",
      expected_dsl: `@q1 hanoi_15_disks REQUIRES 32767_moves`,
      expected_answer: {
        natural_language: "32,767 moves are needed. Using 2^15 - 1 = 32768 - 1 = 32767.",
        truth: "TRUE_CERTAIN",
        explanation: "Formula application: 2^15 - 1 = 32767",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "How many moves are needed for Towers of Hanoi with 20 disks?",
      expected_dsl: `@q2 hanoi_20_disks REQUIRES 1048575_moves`,
      expected_answer: {
        natural_language: "1,048,575 moves are needed. Using 2^20 - 1 = 1048576 - 1 = 1048575. This is over 1 million moves!",
        truth: "TRUE_CERTAIN",
        explanation: "Formula application: 2^20 - 1 = 1048575",
        existence: "positive"
      }
    },
    {
      id: "q3",
      natural_language: "If each Hanoi move takes 1 second, how long would 20 disks take?",
      expected_dsl: `@q3 hanoi_20_time_seconds EQUALS 1048575`,
      expected_answer: {
        natural_language: "1,048,575 seconds, which is approximately 12.1 days (1048575 / 86400 ≈ 12.14 days).",
        truth: "TRUE_CERTAIN",
        explanation: "Time calculation: 1048575 seconds ≈ 12.14 days",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "What is the 15th Fibonacci number?",
      expected_dsl: `@q4 fibonacci_15 EQUALS 610`,
      expected_answer: {
        natural_language: "The 15th Fibonacci number (F(15)) is 610. Sequence: ...233, 377, 610...",
        truth: "TRUE_CERTAIN",
        explanation: "Fibonacci computation: F(15) = 610",
        existence: "positive"
      }
    },
    {
      id: "q5",
      natural_language: "What is the 20th Fibonacci number?",
      expected_dsl: `@q5 fibonacci_20 EQUALS 6765`,
      expected_answer: {
        natural_language: "The 20th Fibonacci number (F(20)) is 6765.",
        truth: "TRUE_CERTAIN",
        explanation: "Fibonacci computation: F(20) = 6765",
        existence: "positive"
      }
    },
    {
      id: "q6",
      natural_language: "What is 15 factorial?",
      expected_dsl: `@q6 factorial_15 EQUALS 1307674368000`,
      expected_answer: {
        natural_language: "15! = 1,307,674,368,000 (over 1.3 trillion).",
        truth: "TRUE_CERTAIN",
        explanation: "Factorial computation: 15! = 1307674368000",
        existence: "positive"
      }
    },
    {
      id: "q7",
      natural_language: "How does the number of Hanoi moves grow when we add one more disk?",
      expected_dsl: `@q7 exponential_growth DOUBLES_WITH each_additional_disk`,
      expected_answer: {
        natural_language: "The number of moves approximately doubles with each additional disk. Specifically, moves(n+1) = 2 × moves(n) + 1. This is exponential growth O(2^n).",
        truth: "TRUE_CERTAIN",
        explanation: "Growth analysis: exponential doubling",
        existence: "positive"
      }
    },
    {
      id: "q8",
      natural_language: "Is it feasible to physically solve Towers of Hanoi with 20 disks?",
      expected_dsl: `@q8 hanoi_20 IS impractical`,
      expected_answer: {
        natural_language: "No, it is not practically feasible. At 1 move per second, it would take over 12 days of continuous operation. At a more realistic 1 move per 5 seconds, it would take about 60 days. The exponential nature makes large instances impractical.",
        truth: "TRUE_CERTAIN",
        explanation: "Practical infeasibility due to exponential time",
        existence: "positive"
      }
    }
  ],
  version: "3.0"
};
