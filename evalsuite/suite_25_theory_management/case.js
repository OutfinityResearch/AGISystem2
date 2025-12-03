/**
 * Test Case: Comprehensive Theory Management - Company Access Control
 * Tests organizational hierarchy, budget analysis, and access control inheritance
 * Version: 5.0 - Complex proofs with access inheritance and budget comparison
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
    "manager IS_A employee", "Engineering IS_A department", "Sales IS_A department"
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
@inherit $c2 DERIVES Carol_access
@result $inherit IS_A access_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Carol→manager→employee→department_files. Transitive access inheritance."
    },
    {
      id: "q2", TASK_NL: "Compare Alice vs Carol access",
      TASK_DSL: "@q2 access_comparison DONE",
      ANSWEAR_NL: "Alice (employee): department files only. Carol (manager): all files + department files.",
      PROOF_DSL: `@p1 Alice IS_A employee
@p2 Carol IS_A manager
@p3 employee CAN_ACCESS department_files
@p4 manager CAN_ACCESS all_files
@p5 manager IS_A employee
@alice_access $p1 GRANTS $p3
@carol_direct $p2 GRANTS $p4
@carol_inherited $p2 THROUGH $p5 GRANTS $p3
@carol_total $carol_direct AND $carol_inherited
@compare $carol_total SUPERSET_OF $alice_access
@result $compare IS_A access_comparison_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Carol has all_files (direct) + department_files (inherited). Alice only department."
    },
    {
      id: "q3", TASK_NL: "What is total company budget?",
      TASK_DSL: "@q3 total_budget CALCULATED",
      ANSWEAR_NL: "Engineering 100k + Sales 80k = 180k total.",
      PROOF_DSL: `@p1 Engineering HAS_BUDGET 100000
@p2 Sales HAS_BUDGET 80000
@p3 Engineering IS_A department
@p4 Sales IS_A department
@sum 100000 PLUS 80000
@total $sum EQUALS 180000
@departments $p3 AND $p4
@complete $departments COVERS all_departments
@result $total IS_A budget_sum_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Sum departments: 100k + 80k = 180k total budget."
    },
    {
      id: "q4", TASK_NL: "Which department has bigger budget?",
      TASK_DSL: "@q4 budget_comparison DONE",
      ANSWEAR_NL: "Engineering (100k) > Sales (80k). Engineering has 25% more.",
      PROOF_DSL: `@p1 Engineering HAS_BUDGET 100000
@p2 Sales HAS_BUDGET 80000
@compare 100000 GREATER_THAN 80000
@diff 100000 MINUS 80000 EQUALS 20000
@ratio 20000 DIVIDED_BY 80000 EQUALS 0.25
@percent $ratio IS 25_percent_more
@winner Engineering HIGHER_THAN Sales
@result $winner IS_A budget_comparison_proof
@proof $result PROVES $q4`,
      PROOF_NL: "100k > 80k. Engineering is 25% higher budget than Sales."
    },
    {
      id: "q5", TASK_NL: "Compare all salaries",
      TASK_DSL: "@q5 salary_ranking ORDERED",
      ANSWEAR_NL: "Carol (90k) > Alice (70k) > Bob (60k). Manager highest.",
      PROOF_DSL: `@p1 Carol HAS_SALARY 90000
@p2 Alice HAS_SALARY 70000
@p3 Bob HAS_SALARY 60000
@o1 90000 GREATER_THAN 70000
@o2 70000 GREATER_THAN 60000
@chain $o1 THEN $o2
@rank Carol Alice Bob
@top Carol IS manager
@result $rank IS_A salary_ranking_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Carol (90k) > Alice (70k) > Bob (60k). Manager earns most."
    },
    {
      id: "q6", TASK_NL: "What can Bob access?",
      TASK_DSL: "@q6 Bob ACCESS_RIGHTS listed",
      ANSWEAR_NL: "Bob IS_A employee → department_files. Not manager → no all_files.",
      PROOF_DSL: `@p1 Bob IS_A employee
@p2 employee CAN_ACCESS department_files
@p3 manager CAN_ACCESS all_files
@bob_type $p1 ESTABLISHES employee_role
@check_manager Bob IS_A manager
@not_manager $check_manager NOT_FOUND
@has_access $p1 GRANTS $p2
@no_all $not_manager BLOCKS $p3
@access department_files ONLY
@result $has_access IS_A access_derivation_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Bob→employee→department_files. Not manager, so no all_files access."
    },
    {
      id: "q7", TASK_NL: "What is salary-to-budget ratio per department?",
      TASK_DSL: "@q7 salary_budget_ratio ANALYZED",
      ANSWEAR_NL: "Alice: 70k/100k = 70%. Bob: 60k/80k = 75%. Sales has higher ratio.",
      PROOF_DSL: `@p1 Alice HAS_SALARY 70000
@p2 Engineering HAS_BUDGET 100000
@p3 Bob HAS_SALARY 60000
@p4 Sales HAS_BUDGET 80000
@ratio1 70000 DIVIDED_BY 100000 EQUALS 0.70
@ratio2 60000 DIVIDED_BY 80000 EQUALS 0.75
@compare $ratio2 GREATER_THAN $ratio1
@higher Sales HAS higher_ratio
@result $compare IS_A ratio_analysis_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Engineering: 70%. Sales: 75%. Sales uses more budget % on salary."
    },
    {
      id: "q8", TASK_NL: "List all employees with their departments",
      TASK_DSL: "@q8 employee_departments ENUMERATED",
      ANSWEAR_NL: "Alice→Engineering, Bob→Sales, Carol→Management. 3 employee-department pairs.",
      PROOF_DSL: `@p1 Alice WORKS_IN Engineering
@p2 Bob WORKS_IN Sales
@p3 Carol WORKS_IN Management
@pair1 Alice WITH Engineering
@pair2 Bob WITH Sales
@pair3 Carol WITH Management
@all $pair1 AND $pair2 AND $pair3
@count 3 PAIRS
@result $all IS_A enumeration_proof
@proof $result PROVES $q8`,
      PROOF_NL: "3 pairs: (Alice,Engineering), (Bob,Sales), (Carol,Management)."
    }
  ]
};
