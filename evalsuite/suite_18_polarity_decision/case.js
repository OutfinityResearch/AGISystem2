/**
 * Test Case: Polarity Decision - Regulatory Status Queries
 * Tests querying positive and negative regulatory facts (PERMITTED_IN, PROHIBITED_IN)
 * Version: 3.0
 */

module.exports = {
  id: "suite_18_polarity_decision",
  name: "Polarity Decision - Regulatory Status Queries",
  description: "Tests querying positive and negative regulatory facts to determine compliance status across regions.",
  theory_NL: "Multiple drugs and products with different regulatory statuses across regions. DrugA is prohibited in EU but permitted in US. DrugB is permitted everywhere. DrugC is prohibited everywhere. ProductX has mixed status.",
  theory_DSL: [
    "drugA PROHIBITED_IN eu",
    "drugA PERMITTED_IN us",
    "drugB PERMITTED_IN eu",
    "drugB PERMITTED_IN us",
    "drugC PROHIBITED_IN eu",
    "drugC PROHIBITED_IN us",
    "productX PERMITTED_IN us",
    "productX PROHIBITED_IN asia"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is drugA prohibited in the EU?",
      TASK_DSL: "@q1 drugA PROHIBITED_IN eu",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, drugA is prohibited in the EU."
    },
    {
      id: "q2",
      TASK_NL: "Is drugA permitted in the US?",
      TASK_DSL: "@q2 drugA PERMITTED_IN us",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, drugA is permitted in the US."
    },
    {
      id: "q3",
      TASK_NL: "Is drugB permitted in EU?",
      TASK_DSL: "@q3 drugB PERMITTED_IN eu",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, drugB is permitted in the EU."
    },
    {
      id: "q4",
      TASK_NL: "Is drugB permitted in US?",
      TASK_DSL: "@q4 drugB PERMITTED_IN us",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, drugB is permitted in the US."
    },
    {
      id: "q5",
      TASK_NL: "Is drugC prohibited in EU?",
      TASK_DSL: "@q5 drugC PROHIBITED_IN eu",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, drugC is prohibited in the EU."
    },
    {
      id: "q6",
      TASK_NL: "Is drugC prohibited in US?",
      TASK_DSL: "@q6 drugC PROHIBITED_IN us",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, drugC is prohibited in the US."
    },
    {
      id: "q7",
      TASK_NL: "Is productX permitted in US?",
      TASK_DSL: "@q7 productX PERMITTED_IN us",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, productX is permitted in the US."
    },
    {
      id: "q8",
      TASK_NL: "Is productX prohibited in Asia?",
      TASK_DSL: "@q8 productX PROHIBITED_IN asia",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, productX is prohibited in Asia."
    }
  ],
};
