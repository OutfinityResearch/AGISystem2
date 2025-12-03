/**
 * Test Case: Masking & Dimension Registry - Fact Queries
 * Tests basic ontology and axiology fact queries
 * Version: 3.0
 */

module.exports = {
  id: "suite_15_masks",
  name: "Masking & Dimension Registry - Fact Queries",
  description: "Tests basic ontology and axiology fact queries across different categories.",
  theory_NL: "We know Tiger is a mammal, Bonsai is a plant, Eagle is a bird, Rock is a mineral. We also have axiology facts: Honesty is a virtue, Theft is prohibited by universal ethics, Helping is a good action, Water has property liquid.",
  theory_DSL: [
    "Tiger IS_A mammal",
    "Bonsai IS_A plant",
    "Eagle IS_A bird",
    "Rock IS_A mineral",
    "Honesty IS_A virtue",
    "Theft PROHIBITED_BY universal_ethics",
    "Helping IS_A good_action",
    "Water HAS_PROPERTY liquid"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Tiger a mammal?",
      TASK_DSL: "@q1 Tiger IS_A mammal",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Tiger is a mammal."
    },
    {
      id: "q2",
      TASK_NL: "Is Bonsai a plant?",
      TASK_DSL: "@q2 Bonsai IS_A plant",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Bonsai is a plant."
    },
    {
      id: "q3",
      TASK_NL: "Is Eagle a bird?",
      TASK_DSL: "@q3 Eagle IS_A bird",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Eagle is a bird."
    },
    {
      id: "q4",
      TASK_NL: "Is Theft prohibited by universal ethics?",
      TASK_DSL: "@q4 Theft PROHIBITED_BY universal_ethics",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Theft is prohibited by universal ethics."
    },
    {
      id: "q5",
      TASK_NL: "Is Honesty a virtue?",
      TASK_DSL: "@q5 Honesty IS_A virtue",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Honesty is a virtue."
    },
    {
      id: "q6",
      TASK_NL: "Is Rock a mineral?",
      TASK_DSL: "@q6 Rock IS_A mineral",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Rock is a mineral."
    },
    {
      id: "q7",
      TASK_NL: "Is Helping a good action?",
      TASK_DSL: "@q7 Helping IS_A good_action",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Helping is a good action."
    },
    {
      id: "q8",
      TASK_NL: "Does Water have property liquid?",
      TASK_DSL: "@q8 Water HAS_PROPERTY liquid",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Water has property liquid."
    }
  ],
};
