/**
 * Test Case: Comprehensive Theory Management - Company Access Control
 * Tests organizational hierarchy, budget analysis, and access control inheritance
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_25_theory_management",
  name: "Comprehensive Theory Management - Company Access Control",

  theory_NL: "Company structure: Alice and Bob are employees. Alice in Engineering (budget 100k, salary 70k). Bob in Sales (budget 80k, salary 60k). Access: employees access department files, managers access all. Role hierarchy: manager IS_A employee. Departments have budgets. Total budget = sum of departments.",

  theory_DSL: [
    "Alice IS_A employee", "Bob IS_A employee", "Carol IS_A manager",
    "Alice WORKS_IN Engineering", "Bob WORKS_IN Sales", "Carol WORKS_IN Management",
    "Engineering HAS_BUDGET 100000", "Sales HAS_BUDGET 80000",
    "Alice HAS_SALARY 70000", "Bob HAS_SALARY 60000", "Carol HAS_SALARY 90000",
    "employee CAN_ACCESS department_files", "manager CAN_ACCESS all_files",
    "manager IS_A employee", "Engineering IS_A department", "Sales IS_A department",
    "100000 GREATER_THAN 80000", "90000 GREATER_THAN 70000", "70000 GREATER_THAN 60000",
    "total_budget EQUALS 180000", "eng_ratio EQUALS 0_70", "sales_ratio EQUALS 0_75"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Can Carol access department files? (Inheritance)",
      TASK_DSL: "@q1 Carol CAN_ACCESS department_files",
      ANSWEAR_NL: "Carol IS_A manager IS_A employee, employee CAN_ACCESS department_files. Yes via inheritance.",
      PROOF_DSL: `@p1 Carol IS_A manager
@p2 manager IS_A employee
@p3 employee CAN_ACCESS department_files
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 DERIVES Carol_access
@result $c3 IS_A access_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Carol→manager→employee→department_files. Transitive access inheritance."
    },
    {
      id: "q2", TASK_NL: "Compare Alice vs Carol access",
      TASK_DSL: "@q2 Carol CAN_ACCESS all_files",
      ANSWEAR_NL: "Alice (employee): department files only. Carol (manager): all files + department files.",
      PROOF_DSL: `@p1 Alice IS_A employee
@p2 Carol IS_A manager
@p3 employee CAN_ACCESS department_files
@p4 manager CAN_ACCESS all_files
@p5 manager IS_A employee
@c1 $p1 GRANTS $p3
@c2 $p2 GRANTS $p4
@c3 $p2 LEADS_TO $p5
@c4 $c3 GRANTS $p3
@c5 $c2 COMBINES $c4
@c6 $c5 SUPERSET_OF $c1
@result $c6 IS_A access_comparison_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Carol has all_files (direct) + department_files (inherited). Alice only department."
    },
    {
      id: "q3", TASK_NL: "What is total company budget?",
      TASK_DSL: "@q3 total_budget EQUALS 180000",
      ANSWEAR_NL: "Engineering 100k + Sales 80k = 180k total.",
      PROOF_DSL: `@p1 Engineering HAS_BUDGET 100000
@p2 Sales HAS_BUDGET 80000
@p3 Engineering IS_A department
@p4 Sales IS_A department
@c1 $p1 PROVIDES 100000
@c2 $p2 PROVIDES 80000
@c3 $c1 PLUS $c2
@c4 $c3 EQUALS 180000
@c5 $p3 COMBINES $p4
@c6 $c5 COVERS all_departments
@result $c4 IS_A budget_sum_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Sum departments: 100k + 80k = 180k total budget."
    },
    {
      id: "q4", TASK_NL: "Which department has bigger budget?",
      TASK_DSL: "@q4 100000 GREATER_THAN 80000",
      ANSWEAR_NL: "Engineering (100k) > Sales (80k). Engineering has 25% more.",
      PROOF_DSL: `@p1 Engineering HAS_BUDGET 100000
@p2 Sales HAS_BUDGET 80000
@p3 100000 GREATER_THAN 80000
@c1 $p1 PROVIDES eng_budget
@c2 $p2 PROVIDES sales_budget
@c3 $c1 COMPARES $c2
@c4 $c3 USES $p3
@c5 100000 MINUS 80000
@c6 $c5 EQUALS 20000
@c7 Engineering HIGHER_THAN Sales
@result $c7 IS_A budget_comparison_proof
@proof $result PROVES $q4`,
      PROOF_NL: "100k > 80k. Engineering is 25% higher budget than Sales."
    },
    {
      id: "q5", TASK_NL: "Compare all salaries",
      TASK_DSL: "@q5 90000 GREATER_THAN 70000",
      ANSWEAR_NL: "Carol (90k) > Alice (70k) > Bob (60k). Manager highest.",
      PROOF_DSL: `@p1 Carol HAS_SALARY 90000
@p2 Alice HAS_SALARY 70000
@p3 Bob HAS_SALARY 60000
@p4 90000 GREATER_THAN 70000
@p5 70000 GREATER_THAN 60000
@c1 $p4 RANKS Carol_first
@c2 $p5 RANKS Alice_second
@c3 $c1 COMBINES $c2
@c4 Carol IS manager
@c5 $c4 EXPLAINS highest_salary
@result $c5 IS_A salary_ranking_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Carol (90k) > Alice (70k) > Bob (60k). Manager earns most."
    },
    {
      id: "q6", TASK_NL: "What can Bob access?",
      TASK_DSL: "@q6 Bob CAN_ACCESS department_files",
      ANSWEAR_NL: "Bob IS_A employee → department_files. Not manager → no all_files.",
      PROOF_DSL: `@p1 Bob IS_A employee
@p2 employee CAN_ACCESS department_files
@p3 manager CAN_ACCESS all_files
@c1 $p1 ESTABLISHES employee_role
@c2 Bob NOT manager
@c3 $c2 BLOCKS $p3
@c4 $p1 GRANTS $p2
@c5 $c4 LIMITS department_files
@c6 $c3 COMBINES $c5
@result $c6 IS_A access_derivation_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Bob→employee→department_files. Not manager, so no all_files access."
    },
    {
      id: "q7", TASK_NL: "What is salary-to-budget ratio per department?",
      TASK_DSL: "@q7 sales_ratio EQUALS 0_75",
      ANSWEAR_NL: "Alice: 70k/100k = 70%. Bob: 60k/80k = 75%. Sales has higher ratio.",
      PROOF_DSL: `@p1 Alice HAS_SALARY 70000
@p2 Engineering HAS_BUDGET 100000
@p3 Bob HAS_SALARY 60000
@p4 Sales HAS_BUDGET 80000
@p5 eng_ratio EQUALS 0_70
@p6 sales_ratio EQUALS 0_75
@c1 $p1 DIVIDED_BY $p2
@c2 $c1 EQUALS $p5
@c3 $p3 DIVIDED_BY $p4
@c4 $c3 EQUALS $p6
@c5 $p6 GREATER_THAN $p5
@c6 Sales HAS higher_ratio
@result $c6 IS_A ratio_analysis_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Engineering: 70%. Sales: 75%. Sales uses more budget % on salary."
    },
    {
      id: "q8", TASK_NL: "List all employees with their departments",
      TASK_DSL: "@q8 employees MAPPED_TO departments",
      ANSWEAR_NL: "Alice→Engineering, Bob→Sales, Carol→Management. 3 employee-department pairs.",
      PROOF_DSL: `@p1 Alice WORKS_IN Engineering
@p2 Bob WORKS_IN Sales
@p3 Carol WORKS_IN Management
@c1 $p1 ESTABLISHES pair_1
@c2 $p2 ESTABLISHES pair_2
@c3 $p3 ESTABLISHES pair_3
@c4 $c1 COMBINES $c2
@c5 $c4 COMBINES $c3
@c6 $c5 TOTALS 3_pairs
@result $c6 IS_A enumeration_proof
@proof $result PROVES $q8`,
      PROOF_NL: "3 pairs: (Alice,Engineering), (Bob,Sales), (Carol,Management)."
    }
  ]
};
