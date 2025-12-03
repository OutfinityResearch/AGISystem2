/**
 * Test Case: Theory Stack Management - Company Structure
 * Tests company structure facts: employees, departments, budgets, and access policies
 * Version: 3.0
 */

module.exports = {
  id: "suite_25_theory_management",
  name: "Theory Stack Management - Company Structure",
  description: "Tests company structure facts: employees, departments, budgets, and access policies.",
  theory_NL: "Base facts about a company: Alice is an employee. Bob is an employee. Alice works in Engineering. Bob works in Sales. Engineering budget is 100000. Sales budget is 80000. Managers can access all files. Employees can access department files.",
  theory_DSL: [
    "Alice IS_A employee",
    "Bob IS_A employee",
    "Alice WORKS_IN Engineering",
    "Bob WORKS_IN Sales",
    "Engineering HAS_BUDGET 100000",
    "Sales HAS_BUDGET 80000",
    "Alice HAS_SALARY 70000",
    "Bob HAS_SALARY 60000",
    "employee CAN_ACCESS department_files",
    "manager CAN_ACCESS all_files"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Alice an employee?",
      TASK_DSL: "@q1 Alice IS_A employee",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Alice is an employee."
    },
    {
      id: "q2",
      TASK_NL: "Does Bob work in Sales?",
      TASK_DSL: "@q2 Bob WORKS_IN Sales",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Bob works in Sales."
    },
    {
      id: "q3",
      TASK_NL: "Is Bob an employee?",
      TASK_DSL: "@q3 Bob IS_A employee",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Bob is an employee."
    },
    {
      id: "q4",
      TASK_NL: "Does Engineering have budget 100000?",
      TASK_DSL: "@q4 Engineering HAS_BUDGET 100000",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Engineering has a budget of 100000."
    },
    {
      id: "q5",
      TASK_NL: "Does Alice work in Engineering?",
      TASK_DSL: "@q5 Alice WORKS_IN Engineering",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Alice works in Engineering."
    },
    {
      id: "q6",
      TASK_NL: "Does Alice have salary 70000?",
      TASK_DSL: "@q6 Alice HAS_SALARY 70000",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Alice has a salary of 70000."
    },
    {
      id: "q7",
      TASK_NL: "Can managers access all files?",
      TASK_DSL: "@q7 manager CAN_ACCESS all_files",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, managers can access all files."
    },
    {
      id: "q8",
      TASK_NL: "Can employees access department files?",
      TASK_DSL: "@q8 employee CAN_ACCESS department_files",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, employees can access department files."
    }
  ],
};
