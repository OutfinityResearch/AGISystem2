/**
 * Test Case: Comprehensive Causation & Abduction
 * Tests CAUSES, CAUSED_BY, causal chains, and abductive reasoning for diagnosis
 * Version: 3.0
 */

module.exports = {
  id: "suite_02_causation",
  name: "Comprehensive Causation & Abduction",
  description: "Tests CAUSES, CAUSED_BY, causal chains, and abductive reasoning for diagnosis",
  theory: {
    natural_language: "In medicine: Infections cause fever. Inflammation causes fever. Fever causes sweating. Respiratory infections cause coughing. Allergies cause coughing. Smoking causes coughing. Dehydration causes headaches. Stress causes headaches. High blood pressure causes headaches. When someone has fever AND coughing together, respiratory infection is most likely. When someone has fever, coughing AND fatigue, influenza is likely. Food poisoning causes stomach pain, nausea, and vomiting. In physics: Heat causes expansion. Friction causes heat. Electricity causes magnetism. Magnetism can cause electricity. In environment: Pollution causes health problems. Deforestation causes climate change. Climate change causes extreme weather. Patient John has fever and coughing. Patient Mary has stomach pain and nausea.",
    expected_facts: [
          "infection CAUSES fever",
          "inflammation CAUSES fever",
          "fever CAUSES sweating",
          "respiratory_infection CAUSES coughing",
          "allergies CAUSES coughing",
          "smoking CAUSES coughing",
          "dehydration CAUSES headache",
          "stress CAUSES headache",
          "high_blood_pressure CAUSES headache",
          "fever_and_coughing INDICATES respiratory_infection",
          "fever_coughing_fatigue INDICATES influenza",
          "food_poisoning CAUSES stomach_pain",
          "food_poisoning CAUSES nausea",
          "food_poisoning CAUSES vomiting",
          "heat CAUSES expansion",
          "friction CAUSES heat",
          "electricity CAUSES magnetism",
          "magnetism CAUSES electricity",
          "pollution CAUSES health_problems",
          "deforestation CAUSES climate_change",
          "climate_change CAUSES extreme_weather",
          "John HAS fever",
          "John HAS coughing",
          "Mary HAS stomach_pain",
          "Mary HAS nausea"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "Does infection cause fever?",
      expected_dsl: `@q1 infection CAUSES fever`,
      expected_answer: {
        natural_language: "Yes, infection causes fever.",
        truth: "TRUE_CERTAIN",
        explanation: "Direct CAUSES fact",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "Does friction cause expansion?",
      expected_dsl: `@q2 friction CAUSES expansion`,
      expected_answer: {
        natural_language: "Yes, friction causes heat and heat causes expansion.",
        truth: "TRUE_CERTAIN",
        explanation: "Transitive CAUSES chain",
        existence: "positive"
      }
    },
    {
      id: "q3",
      natural_language: "What could cause John's symptoms?",
      expected_dsl: `@q3 ABDUCT fever`,
      expected_answer: {
        natural_language: "John has fever and coughing, so respiratory infection is most likely.",
        truth: "PLAUSIBLE",
        explanation: "Abductive reasoning from symptoms",
        existence: undefined
      }
    },
    {
      id: "q4",
      natural_language: "Could Mary have food poisoning?",
      expected_dsl: `@q4 ABDUCT stomach_pain`,
      expected_answer: {
        natural_language: "Yes, Mary has stomach pain and nausea which are caused by food poisoning.",
        truth: "PLAUSIBLE",
        explanation: "Abductive: symptoms match food poisoning",
        existence: undefined
      }
    },
    {
      id: "q5",
      natural_language: "Does deforestation cause extreme weather?",
      expected_dsl: `@q5 deforestation CAUSES extreme_weather`,
      expected_answer: {
        natural_language: "Yes, deforestation causes climate change which causes extreme weather.",
        truth: "TRUE_CERTAIN",
        explanation: "Transitive CAUSES",
        existence: "positive"
      }
    },
    {
      id: "q6",
      natural_language: "Can electricity cause magnetism?",
      expected_dsl: `@q6 electricity CAUSES magnetism`,
      expected_answer: {
        natural_language: "Yes, electricity causes magnetism.",
        truth: "TRUE_CERTAIN",
        explanation: "Direct CAUSES",
        existence: "positive"
      }
    },
    {
      id: "q7",
      natural_language: "Does John have influenza?",
      expected_dsl: `@q7 John HAS influenza`,
      expected_answer: {
        natural_language: "Not certain - John has fever and coughing but we don't know about fatigue.",
        truth: "UNKNOWN",
        explanation: "Missing fatigue symptom for influenza diagnosis",
        existence: "zero"
      }
    },
    {
      id: "q8",
      natural_language: "What causes headaches?",
      expected_dsl: `@q8 dehydration CAUSES headache`,
      expected_answer: {
        natural_language: "Headaches can be caused by dehydration, stress, or high blood pressure.",
        truth: "TRUE_CERTAIN",
        explanation: "Multiple causes enumeration",
        existence: "positive"
      }
    }
  ],
  version: "3.0"
};
