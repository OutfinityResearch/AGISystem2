/**
 * Test Case: Comprehensive Causation & Abduction
 * Tests CAUSES, CAUSED_BY, causal chains, and abductive reasoning for diagnosis
 * Version: 3.0
 */
module.exports = {
  id: "suite_02_causation",
  name: "Comprehensive Causation & Abduction",
  theory_NL: `In medicine: Infections cause fever. Inflammation causes fever. Fever causes sweating. Respiratory infections cause coughing. Allergies cause coughing. Smoking causes coughing. Dehydration causes headaches. Stress causes headaches. High blood pressure causes headaches. When someone has fever AND coughing together, respiratory infection is most likely. When someone has fever, coughing AND fatigue, influenza is likely. Food poisoning causes stomach pain, nausea, and vomiting. In physics: Heat causes expansion. Friction causes heat. Electricity causes magnetism. Magnetism can cause electricity. In environment: Pollution causes health problems. Deforestation causes climate change. Climate change causes extreme weather. Patient John has fever and coughing. Patient Mary has stomach pain and nausea.`,
  theory_DSL: [
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
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Does infection cause fever?",
      TASK_DSL: "@q1 infection CAUSES fever",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
      ANSWEAR_NL: "Yes, infection causes fever.",
      PROOF_DSL: "@proof infection CAUSES fever",
      PROOF_NL: "This is a direct fact in the knowledge base."
    },
    {
      id: "q2",
      TASK_NL: "Does friction cause expansion?",
      TASK_DSL: "@q2 friction CAUSES expansion",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"transitive\", \"chain\": [\"friction\", \"heat\", \"expansion\"]}",
      ANSWEAR_NL: "Yes, friction causes heat and heat causes expansion.",
      PROOF_DSL: "@p1 friction CAUSES heat\n@p2 heat CAUSES expansion\n@proof $p1 AND $p2",
      PROOF_NL: "This is proven by the chain of causation: friction creates heat, and heat leads to expansion."
    },
    {
      id: "q3",
      TASK_NL: "What could cause John's symptoms?",
      // v3 ABDUCT syntax: effect ABDUCT any → finds causes (returns PLAUSIBLE)
      TASK_DSL: "@q3 fever ABDUCT any",
      ANSWEAR_DSL: "{\"truth\": \"PLAUSIBLE\"}",
      ANSWEAR_NL: "Fever can be caused by infection or inflammation.",
      PROOF_DSL: "@p1 infection CAUSES fever\n@p2 inflammation CAUSES fever\n@proof $p1 OR $p2",
      PROOF_NL: "Based on the knowledge base, fever can be caused by infection or inflammation."
    },
    {
      id: "q4",
      TASK_NL: "Could Mary have food poisoning?",
      // v3: Check if food_poisoning CAUSES Mary's symptoms
      TASK_DSL: "@q4 food_poisoning CAUSES stomach_pain",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, food poisoning causes stomach pain, which Mary has.",
      PROOF_DSL: "@p1 food_poisoning CAUSES stomach_pain\n@p2 Mary HAS stomach_pain\n@proof $p1 AND $p2",
      PROOF_NL: "Food poisoning is a known cause of stomach pain, and Mary has stomach pain."
    },
    {
        "id": "q5",
        "TASK_NL": "Does deforestation cause extreme weather?",
        "TASK_DSL": "@q5 deforestation CAUSES extreme_weather",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"transitive\"}",
        "ANSWEAR_NL": "Yes, deforestation causes climate change which causes extreme weather.",
        "PROOF_DSL": "@p1 deforestation CAUSES climate_change\n@p2 climate_change CAUSES extreme_weather\n@proof $p1 AND $p2",
        "PROOF_NL": "This is proven transitively: Deforestation leads to climate change, and climate change leads to extreme weather."
    },
    {
        "id": "q6",
        "TASK_NL": "Can electricity cause magnetism?",
        "TASK_DSL": "@q6 electricity CAUSES magnetism",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
        "ANSWEAR_NL": "Yes, electricity causes magnetism.",
        "PROOF_DSL": "@proof electricity CAUSES magnetism",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    },
    {
        "id": "q7",
        "TASK_NL": "Does John have influenza?",
        // v3: Query fever_coughing_fatigue INDICATES influenza
        // Since John has fever + coughing but not fatigue, we check the indicator
        "TASK_DSL": "@q7 fever_coughing_fatigue INDICATES influenza",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "The combination of fever, coughing, and fatigue indicates influenza, but we need to check if John has all three symptoms.",
        "PROOF_DSL": "@p1 fever_coughing_fatigue INDICATES influenza\n@proof $p1",
        "PROOF_NL": "The theory states that fever, coughing and fatigue together indicate influenza."
    },
    {
        "id": "q8",
        "TASK_NL": "What causes headaches?",
        // v3 query: headache ABDUCT any - find causes (returns PLAUSIBLE)
        "TASK_DSL": "@q8 headache ABDUCT any",
        "ANSWEAR_DSL": "{\"truth\": \"PLAUSIBLE\"}",
        "ANSWEAR_NL": "Headaches can be caused by dehydration, stress, or high blood pressure.",
        "PROOF_DSL": "@p1 dehydration CAUSES headache\n@p2 stress CAUSES headache\n@p3 high_blood_pressure CAUSES headache\n@proof $p1 OR $p2 OR $p3",
        "PROOF_NL": "The query finds all causes of headache from the knowledge base."
    }
  ],
};