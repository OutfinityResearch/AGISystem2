/**
 * Test Case: Comprehensive Counterfactual & Temporal
 * Tests what-if scenarios, temporal ordering, and hypothetical reasoning
 * Version: 3.0
 */
module.exports = {
  id: "suite_04_counterfactual",
  name: "Comprehensive Counterfactual & Temporal",
  theory_NL: "Physical facts: Water boils at 100 degrees Celsius at sea level. Ice melts at 0 degrees. Room temperature is about 20 degrees. Water is liquid between 0 and 100 degrees. Humans need water to survive. Fire requires oxygen to burn. Gravity pulls objects down. Metal expands when heated. Temporal facts: World War 1 happened before World War 2. The Renaissance came before the Industrial Revolution. The Internet was invented after television. Smartphones came after personal computers. Process sequences: Design comes before manufacturing. Testing comes after development. Planning is required before execution. Approval is needed before implementation.",
  theory_DSL: [
    "water BOILS_AT celsius_100",
    "ice MELTS_AT celsius_0",
    "room_temperature IS celsius_20",
    "celsius_20 LESS_THAN celsius_50",
    "celsius_50 LESS_THAN celsius_100",
    "water IS_A liquid",
    "human REQUIRES water",
    "fire REQUIRES oxygen",
    "gravity PULLS_DOWN objects",
    "metal EXPANDS_WHEN heated",
    "world_war_1 BEFORE world_war_2",
    "renaissance BEFORE industrial_revolution",
    "internet AFTER television",
    "smartphone AFTER personal_computer",
    "design BEFORE manufacturing",
    "testing AFTER development",
    "planning BEFORE execution",
    "approval BEFORE implementation"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "If water boiled at 50 degrees, would it still be liquid at room temperature?",
      TASK_DSL: `@q1 celsius_20 LESS_THAN celsius_50`,
      ANSWEAR_DSL: `{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}`,
      ANSWEAR_NL: "Yes, if water boiled at 50 degrees and room temperature is 20 degrees, water would still be liquid since 20 < 50.",
      PROOF_DSL: `@p1 water BOILS_AT 50\n@p2 room_temperature IS 20\n@proof $p2 LESS_THAN $p1`,
      PROOF_NL: "In the counterfactual scenario, the boiling point is 50. Since room temperature (20) is less than 50, it remains liquid."
    },
    {
      id: "q2",
      TASK_NL: "What if there was no oxygen? Could fire exist?",
      TASK_DSL: `@q2 fire REQUIRES oxygen`,
      ANSWEAR_DSL: `{\"truth\": \"FALSE\", \"method\": \"contradiction\"}`,
      ANSWEAR_NL: "No, fire requires oxygen to burn. Without oxygen, fire cannot exist.",
      PROOF_DSL: `@p1 fire REQUIRES oxygen\n@p2 oxygen EXISTS false\n@proof $p1 AND $p2`,
      PROOF_NL: "This is proven false because of the contradiction between 'fire REQUIRES oxygen' and the counterfactual 'oxygen does not exist'."
    },
    {
        "id": "q3",
        "TASK_NL": "Did World War 1 happen before World War 2?",
        "TASK_DSL": "@q3 world_war_1 BEFORE world_war_2",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Yes, World War 1 happened before World War 2.",
        "PROOF_DSL": "@proof world_war_1 BEFORE world_war_2",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    },
    {
        "id": "q4",
        "TASK_NL": "Did smartphones exist before personal computers?",
        "TASK_DSL": "@q4 smartphone BEFORE personal_computer",
        "ANSWEAR_DSL": "{\"truth\": \"FALSE\", \"method\": \"contradiction\"}",
        "ANSWEAR_NL": "No, smartphones came after personal computers.",
        "PROOF_DSL": "@proof smartphone AFTER personal_computer",
        "PROOF_NL": "This is proven false because the knowledge base states that smartphones came AFTER personal computers, which is the opposite of BEFORE."
    },
    {
        "id": "q5",
        "TASK_NL": "Can you manufacture before designing?",
        "TASK_DSL": "@q5 manufacturing BEFORE design",
        "ANSWEAR_DSL": "{\"truth\": \"FALSE\", \"method\": \"contradiction\"}",
        "ANSWEAR_NL": "No, design must come before manufacturing.",
        "PROOF_DSL": "@proof design BEFORE manufacturing",
        "PROOF_NL": "This is proven false because the established process sequence is that design comes BEFORE manufacturing."
    },
    {
        "id": "q6",
        "TASK_NL": "Is approval needed before implementation?",
        "TASK_DSL": "@q6 approval BEFORE implementation",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Yes, approval is required before implementation.",
        "PROOF_DSL": "@proof approval BEFORE implementation",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    },
    {
        "id": "q7",
        "TASK_NL": "If humans had no water, could they survive?",
        "TASK_DSL": `@q7 human REQUIRES water`,
        "ANSWEAR_DSL": "{\"truth\": \"FALSE\", \"method\": \"contradiction\"}",
        "ANSWEAR_NL": "No, humans require water to survive.",
        "PROOF_DSL": `@p1 human REQUIRES water\n@p2 water EXISTS false\n@proof $p1 AND $p2`,
        "PROOF_NL": "This is proven false due to the contradiction between 'human REQUIRES water' and the counterfactual 'water does not exist'."
    },
    {
        "id": "q8",
        "TASK_NL": "Does testing come before or after development?",
        "TASK_DSL": "@q8 testing AFTER development",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Testing comes after development.",
        "PROOF_DSL": "@proof testing AFTER development",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    }
  ],
};