/**
 * Test Case: Comprehensive Counterfactual & Temporal
 * Tests what-if scenarios, temporal ordering, and hypothetical reasoning
 * Version: 3.0
 */

module.exports = {
  id: "suite_04_counterfactual",
  name: "Comprehensive Counterfactual & Temporal",
  description: "Tests what-if scenarios, temporal ordering, and hypothetical reasoning",
  theory: {
    natural_language: "Physical facts: Water boils at 100 degrees Celsius at sea level. Ice melts at 0 degrees. Room temperature is about 20 degrees. Water is liquid between 0 and 100 degrees. Humans need water to survive. Fire requires oxygen to burn. Gravity pulls objects down. Metal expands when heated. Temporal facts: World War 1 happened before World War 2. The Renaissance came before the Industrial Revolution. The Internet was invented after television. Smartphones came after personal computers. Process sequences: Design comes before manufacturing. Testing comes after development. Planning is required before execution. Approval is needed before implementation.",
    expected_facts: [
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
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "If water boiled at 50 degrees, would it still be liquid at room temperature?",
      expected_dsl: `@q1 celsius_20 LESS_THAN celsius_50`,
      expected_answer: {
        natural_language: "Yes, if water boiled at 50 degrees and room temperature is 20 degrees, water would still be liquid since 20 < 50.",
        truth: "TRUE_CERTAIN",
        explanation: "20 < 50, so water stays liquid at room temp",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "What if there was no oxygen? Could fire exist?",
      expected_dsl: `@q2 fire REQUIRES oxygen`,
      expected_answer: {
        natural_language: "No, fire requires oxygen to burn. Without oxygen, fire cannot exist.",
        truth: "TRUE_CERTAIN",
        explanation: "The fact that fire REQUIRES oxygen is TRUE_CERTAIN; the counterfactual 'no fire without oxygen' follows from this",
        existence: "positive"
      }
    },
    {
      id: "q3",
      natural_language: "Did World War 1 happen before World War 2?",
      expected_dsl: `@q3 world_war_1 BEFORE world_war_2`,
      expected_answer: {
        natural_language: "Yes, World War 1 happened before World War 2.",
        truth: "TRUE_CERTAIN",
        explanation: "Direct BEFORE fact",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "Did smartphones exist before personal computers?",
      expected_dsl: `@q4 smartphone BEFORE personal_computer`,
      expected_answer: {
        natural_language: "No, smartphones came after personal computers.",
        truth: "FALSE",
        explanation: "AFTER relationship implies not BEFORE",
        existence: "negative"
      }
    },
    {
      id: "q5",
      natural_language: "Can you manufacture before designing?",
      expected_dsl: `@q5 manufacturing BEFORE design`,
      expected_answer: {
        natural_language: "No, design must come before manufacturing.",
        truth: "FALSE",
        explanation: "BEFORE constraint",
        existence: "negative"
      }
    },
    {
      id: "q6",
      natural_language: "Is approval needed before implementation?",
      expected_dsl: `@q6 approval BEFORE implementation`,
      expected_answer: {
        natural_language: "Yes, approval is required before implementation.",
        truth: "TRUE_CERTAIN",
        explanation: "Direct BEFORE fact",
        existence: "positive"
      }
    },
    {
      id: "q7",
      natural_language: "If humans had no water, could they survive?",
      expected_dsl: `@q7 human REQUIRES water`,
      expected_answer: {
        natural_language: "No, humans require water to survive.",
        truth: "TRUE_CERTAIN",
        explanation: "The fact that human REQUIRES water is TRUE_CERTAIN; the counterfactual 'no survival without water' follows from this",
        existence: "positive"
      }
    },
    {
      id: "q8",
      natural_language: "Does testing come before or after development?",
      expected_dsl: `@q8 testing AFTER development`,
      expected_answer: {
        natural_language: "Testing comes after development.",
        truth: "TRUE_CERTAIN",
        explanation: "Direct AFTER fact",
        existence: "positive"
      }
    }
  ],
  version: "3.0"
};
