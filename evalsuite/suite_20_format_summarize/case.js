/**
 * Test Case: FORMAT & SUMMARIZE with FACTS_MATCHING
 * Exercises FORMAT variable expansion, SUMMARIZE list rendering, and NONEMPTY checks. Tests various fact matching and summarization scenarios.
 * Version: 3.0
 */

module.exports = {
  id: "suite_20_format_summarize",
  name: "FORMAT & SUMMARIZE with FACTS_MATCHING",
  description: "Exercises FORMAT variable expansion, SUMMARIZE list rendering, and NONEMPTY checks. Tests various fact matching and summarization scenarios.",
  theory: {
    natural_language: "We have fruits (Apple, Banana, Orange, Mango), vehicles (Car, Bike, Bus), and animals (Dog, Cat). We test matching, summarizing, and formatting operations on these categories.",
    expected_facts: [
          "Apple IS_A fruit",
          "Banana IS_A fruit",
          "Orange IS_A fruit",
          "Mango IS_A fruit",
          "Car IS_A vehicle",
          "Bike IS_A vehicle",
          "Bus IS_A vehicle",
          "Dog IS_A animal",
          "Cat IS_A animal"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "Summarize known fruits and format the result status.",
      expected_dsl: `
        @fruitFacts any IS_A fruit
        @summary $fruitFacts SUMMARIZE any maxItems=2
        @q1 $fruitFacts NONEMPTY any
      `,
      expected_answer: {
        natural_language: "There are fruits; the list is non-empty.",
        truth: "TRUE_CERTAIN",
        explanation: "NONEMPTY on matched fruits returns TRUE_CERTAIN; SUMMARIZE is exercised but result truth comes from NONEMPTY.",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "Check a missing category and format the negative outcome.",
      expected_dsl: `
        @missing any IS_A spaceship
        @q2 $missing NONEMPTY any
      `,
      expected_answer: {
        natural_language: "There are no spaceships in the facts.",
        truth: "FALSE",
        explanation: "NONEMPTY on an empty match list returns FALSE.",
        existence: "negative"
      }
    },
    {
      id: "q3",
      natural_language: "Count all vehicles and check if non-empty.",
      expected_dsl: `
        @vehicleFacts any IS_A vehicle
        @count $vehicleFacts COUNT any
        @q3 $vehicleFacts NONEMPTY any
      `,
      expected_answer: {
        natural_language: "There are vehicles in the KB.",
        truth: "TRUE_CERTAIN",
        explanation: "Three vehicles exist; NONEMPTY returns TRUE_CERTAIN.",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "Summarize vehicles with maxItems=1.",
      expected_dsl: `
        @vSummary $vehicleFacts SUMMARIZE any maxItems=1
        @q4 $vehicleFacts NONEMPTY any
      `,
      expected_answer: {
        natural_language: "Vehicle summary created; list is non-empty.",
        truth: "TRUE_CERTAIN",
        explanation: "SUMMARIZE limits output; NONEMPTY still true.",
        existence: "positive"
      }
    },
    {
      id: "q5",
      natural_language: "Match all animals and verify non-empty.",
      expected_dsl: `
        @animalFacts any IS_A animal
        @q5 $animalFacts NONEMPTY any
      `,
      expected_answer: {
        natural_language: "Animals exist in the KB.",
        truth: "TRUE_CERTAIN",
        explanation: "Dog and Cat are animals; list is non-empty.",
        existence: "positive"
      }
    },
    {
      id: "q6",
      natural_language: "Check for non-existent robots category.",
      expected_dsl: `
        @robots any IS_A robot
        @q6 $robots NONEMPTY any
      `,
      expected_answer: {
        natural_language: "No robots in the KB.",
        truth: "FALSE",
        explanation: "No robot facts exist; NONEMPTY returns FALSE.",
        existence: "negative"
      }
    },
    {
      id: "q7",
      natural_language: "Summarize fruits with maxItems=4 (all of them).",
      expected_dsl: `
        @allFruits any IS_A fruit
        @fullSummary $allFruits SUMMARIZE any maxItems=4
        @q7 $allFruits NONEMPTY any
      `,
      expected_answer: {
        natural_language: "All 4 fruits summarized; list is non-empty.",
        truth: "TRUE_CERTAIN",
        explanation: "All fruits included in summary; NONEMPTY true.",
        existence: "positive"
      }
    },
    {
      id: "q8",
      natural_language: "Match specific subject Apple and check.",
      expected_dsl: `
        @appleFacts Apple FACTS any IS_A
        @q8 $appleFacts NONEMPTY any
      `,
      expected_answer: {
        natural_language: "Apple has at least one IS_A fact.",
        truth: "TRUE_CERTAIN",
        explanation: "Apple IS_A fruit exists; NONEMPTY returns TRUE_CERTAIN.",
        existence: "positive"
      }
    }
  ],
  version: "3.0"
};
