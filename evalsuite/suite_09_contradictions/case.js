/**
 * Test Case: Contradiction Detection & Constraint Validation
 * Tests facts and queries that relate to constraint scenarios
 * Version: 3.0
 */

module.exports = {
  id: "suite_09_contradictions",
  name: "Contradiction Detection & Constraint Validation",
  description: "Tests facts and queries that relate to constraint scenarios - functional relations, disjoint categories, and cardinality.",
  theory_NL: "Medical records system. John is a patient born in Chicago. His biological mother is Mary and father is Robert. John is alive. He has DrSmith and DrJones as doctors. DrSmith is a cardiologist, DrJones is a neurologist. John has diabetes diagnosis that is confirmed.",
  theory_DSL: [
    "John IS_A patient",
    "John BORN_IN Chicago",
    "John BIOLOGICAL_MOTHER Mary",
    "John BIOLOGICAL_FATHER Robert",
    "John IS_A alive",
    "John HAS_DOCTOR DrSmith",
    "John HAS_DOCTOR DrJones",
    "DrSmith IS_A cardiologist",
    "DrJones IS_A neurologist",
    "John HAS_DIAGNOSIS diabetes",
    "diabetes_diagnosis STATUS confirmed"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is John a patient?",
      TASK_DSL: "@q1 John IS_A patient",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, John is a patient."
    },
    {
      id: "q2",
      TASK_NL: "Where was John born?",
      TASK_DSL: "@q2 John BORN_IN Chicago",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "John was born in Chicago."
    },
    {
      id: "q3",
      TASK_NL: "Is John alive?",
      TASK_DSL: "@q3 John IS_A alive",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, John is alive."
    },
    {
      id: "q4",
      TASK_NL: "Who is John's biological mother?",
      TASK_DSL: "@q4 John BIOLOGICAL_MOTHER Mary",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "John's biological mother is Mary."
    },
    {
      id: "q5",
      TASK_NL: "Is DrSmith a cardiologist?",
      TASK_DSL: "@q5 DrSmith IS_A cardiologist",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, DrSmith is a cardiologist."
    },
    {
      id: "q6",
      TASK_NL: "Does John have DrSmith as a doctor?",
      TASK_DSL: "@q6 John HAS_DOCTOR DrSmith",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, John has DrSmith as a doctor."
    },
    {
      id: "q7",
      TASK_NL: "Is diabetes diagnosis confirmed?",
      TASK_DSL: "@q7 diabetes_diagnosis STATUS confirmed",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, the diabetes diagnosis status is confirmed."
    },
    {
      id: "q8",
      TASK_NL: "Is DrJones a neurologist?",
      TASK_DSL: "@q8 DrJones IS_A neurologist",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, DrJones is a neurologist."
    }
  ],
};
