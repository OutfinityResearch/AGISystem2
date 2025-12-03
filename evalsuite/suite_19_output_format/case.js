/**
 * Test Case: Output Format - Property and Classification Queries
 * Tests various fact queries about properties and classifications
 * Version: 3.0
 */

module.exports = {
  id: "suite_19_output_format",
  name: "Output Format - Property and Classification Queries",
  description: "Tests various fact queries about properties and classifications to verify correct retrieval.",
  theory_NL: "We have various facts: Sky is blue, Grass is green, Sun is hot, Ice is cold, Fire burns, Water flows, Birds fly, Fish swim.",
  theory_DSL: [
    "Sky IS_A blue_thing",
    "Grass IS_A green_thing",
    "Sun HAS_PROPERTY hot",
    "Ice HAS_PROPERTY cold",
    "Fire CAN burn",
    "Water CAN flow",
    "Bird CAN fly",
    "Fish CAN swim"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is the sky blue?",
      TASK_DSL: "@q1 Sky IS_A blue_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, the sky is blue."
    },
    {
      id: "q2",
      TASK_NL: "Is the grass green?",
      TASK_DSL: "@q2 Grass IS_A green_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, the grass is green."
    },
    {
      id: "q3",
      TASK_NL: "Is the sun hot?",
      TASK_DSL: "@q3 Sun HAS_PROPERTY hot",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, the sun is hot."
    },
    {
      id: "q4",
      TASK_NL: "Is ice cold?",
      TASK_DSL: "@q4 Ice HAS_PROPERTY cold",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, ice is cold."
    },
    {
      id: "q5",
      TASK_NL: "Can fire burn?",
      TASK_DSL: "@q5 Fire CAN burn",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, fire can burn."
    },
    {
      id: "q6",
      TASK_NL: "Can water flow?",
      TASK_DSL: "@q6 Water CAN flow",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, water can flow."
    },
    {
      id: "q7",
      TASK_NL: "Can birds fly?",
      TASK_DSL: "@q7 Bird CAN fly",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, birds can fly."
    },
    {
      id: "q8",
      TASK_NL: "Can fish swim?",
      TASK_DSL: "@q8 Fish CAN swim",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, fish can swim."
    }
  ],
};
