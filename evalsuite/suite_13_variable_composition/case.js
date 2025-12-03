/**
 * Test Case: Variable Composition & Multi-Domain Reasoning
 * Tests composing queries across multiple domains: education, inventory, access control, medical
 * Version: 3.0
 */

module.exports = {
  id: "suite_13_variable_composition",
  name: "Variable Composition & Multi-Domain Reasoning",
  description: "Tests composing queries across multiple domains: education, inventory, access control, medical diagnosis.",
  theory_NL: "Student enrollment: Alice is enrolled in Math101 and Physics201. Bob is enrolled in Math101 and Chemistry101. Course prerequisites: Math101 is prerequisite for Math201, Physics201 for Physics301, Chemistry101 for Chemistry201. Advanced courses: Math201, Physics301, Chemistry201. Employee roles: Employee_1 is Manager, Employee_2 is Engineer. Manager can access finance_data and hr_data. Engineer can access tech_data and code_repo. Medical: Patient_A has symptoms fever, cough, fatigue. Flu causes fever, cough, fatigue. Cold causes cough and mild_fever.",
  theory_DSL: [
    "Alice ENROLLED_IN Math101",
    "Alice ENROLLED_IN Physics201",
    "Bob ENROLLED_IN Math101",
    "Bob ENROLLED_IN Chemistry101",
    "Math101 PREREQUISITE_FOR Math201",
    "Physics201 PREREQUISITE_FOR Physics301",
    "Chemistry101 PREREQUISITE_FOR Chemistry201",
    "Math201 IS_A advanced_course",
    "Physics301 IS_A advanced_course",
    "Chemistry201 IS_A advanced_course",
    "Employee_1 HAS_ROLE Manager",
    "Employee_2 HAS_ROLE Engineer",
    "Manager CAN_ACCESS finance_data",
    "Manager CAN_ACCESS hr_data",
    "Engineer CAN_ACCESS tech_data",
    "Engineer CAN_ACCESS code_repo",
    "Patient_A HAS_SYMPTOM fever",
    "Patient_A HAS_SYMPTOM cough",
    "Patient_A HAS_SYMPTOM fatigue",
    "Flu CAUSES fever",
    "Flu CAUSES cough",
    "Flu CAUSES fatigue",
    "Cold CAUSES cough",
    "Cold CAUSES mild_fever"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Alice enrolled in Math101?",
      TASK_DSL: "@q1 Alice ENROLLED_IN Math101",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Alice is enrolled in Math101."
    },
    {
      id: "q2",
      TASK_NL: "Is Alice enrolled in Physics201?",
      TASK_DSL: "@q2 Alice ENROLLED_IN Physics201",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Alice is enrolled in Physics201."
    },
    {
      id: "q3",
      TASK_NL: "Is Bob enrolled in Math101?",
      TASK_DSL: "@q3 Bob ENROLLED_IN Math101",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Bob is enrolled in Math101."
    },
    {
      id: "q4",
      TASK_NL: "Is Math101 a prerequisite for Math201?",
      TASK_DSL: "@q4 Math101 PREREQUISITE_FOR Math201",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Math101 is a prerequisite for Math201."
    },
    {
      id: "q5",
      TASK_NL: "Is Physics201 a prerequisite for Physics301?",
      TASK_DSL: "@q5 Physics201 PREREQUISITE_FOR Physics301",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Physics201 is a prerequisite for Physics301."
    },
    {
      id: "q6",
      TASK_NL: "Is Employee_1 a Manager?",
      TASK_DSL: "@q6 Employee_1 HAS_ROLE Manager",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Employee_1 has the role of Manager."
    },
    {
      id: "q7",
      TASK_NL: "Can Manager access finance_data?",
      TASK_DSL: "@q7 Manager CAN_ACCESS finance_data",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Manager can access finance_data."
    },
    {
      id: "q8",
      TASK_NL: "Can Engineer access tech_data?",
      TASK_DSL: "@q8 Engineer CAN_ACCESS tech_data",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Engineer can access tech_data."
    },
    {
      id: "q9",
      TASK_NL: "Does Patient_A have fever?",
      TASK_DSL: "@q9 Patient_A HAS_SYMPTOM fever",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Patient_A has the symptom fever."
    },
    {
      id: "q10",
      TASK_NL: "Does Flu cause fever?",
      TASK_DSL: "@q10 Flu CAUSES fever",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Flu causes fever."
    },
    {
      id: "q11",
      TASK_NL: "Does Flu cause cough?",
      TASK_DSL: "@q11 Flu CAUSES cough",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Flu causes cough."
    },
    {
      id: "q12",
      TASK_NL: "Does Flu cause fatigue?",
      TASK_DSL: "@q12 Flu CAUSES fatigue",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Flu causes fatigue."
    }
  ],
};
