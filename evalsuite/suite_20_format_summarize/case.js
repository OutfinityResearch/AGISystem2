/**
 * Test Case: Format & Summarize - Category Classification
 * Tests basic category classification queries for fruits, vehicles, and animals
 * Version: 3.0
 */

module.exports = {
  id: "suite_20_format_summarize",
  name: "Format & Summarize - Category Classification",
  description: "Tests basic category classification queries for fruits, vehicles, and animals.",
  theory_NL: "We have fruits (Apple, Banana, Orange, Mango), vehicles (Car, Bike, Bus), and animals (Dog, Cat).",
  theory_DSL: [
    "Apple IS_A fruit",
    "Banana IS_A fruit",
    "Orange IS_A fruit",
    "Mango IS_A fruit",
    "Car IS_A vehicle",
    "Bike IS_A vehicle",
    "Bus IS_A vehicle",
    "Dog IS_A animal",
    "Cat IS_A animal"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is Apple a fruit?",
      TASK_DSL: "@q1 Apple IS_A fruit",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Apple is a fruit."
    },
    {
      id: "q2",
      TASK_NL: "Is Banana a fruit?",
      TASK_DSL: "@q2 Banana IS_A fruit",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Banana is a fruit."
    },
    {
      id: "q3",
      TASK_NL: "Is Car a vehicle?",
      TASK_DSL: "@q3 Car IS_A vehicle",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Car is a vehicle."
    },
    {
      id: "q4",
      TASK_NL: "Is Bike a vehicle?",
      TASK_DSL: "@q4 Bike IS_A vehicle",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Bike is a vehicle."
    },
    {
      id: "q5",
      TASK_NL: "Is Dog an animal?",
      TASK_DSL: "@q5 Dog IS_A animal",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Dog is an animal."
    },
    {
      id: "q6",
      TASK_NL: "Is Cat an animal?",
      TASK_DSL: "@q6 Cat IS_A animal",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Cat is an animal."
    },
    {
      id: "q7",
      TASK_NL: "Is Orange a fruit?",
      TASK_DSL: "@q7 Orange IS_A fruit",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Orange is a fruit."
    },
    {
      id: "q8",
      TASK_NL: "Is Bus a vehicle?",
      TASK_DSL: "@q8 Bus IS_A vehicle",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Bus is a vehicle."
    }
  ],
};
