/**
 * Test Case: Comprehensive Causation & Abduction
 * Tests CAUSES chains, abductive diagnosis, counterfactual reasoning, and causal inference
 * Version: 5.0 - Complex proofs with genuine abduction, multi-cause analysis, intervention reasoning
 */
module.exports = {
  id: "suite_02_causation",
  name: "Comprehensive Causation & Abduction",

  theory_NL: `In medicine: Infections cause fever. Inflammation causes fever. Fever causes sweating. Sweating causes dehydration. Dehydration causes weakness. Respiratory infections cause coughing. Allergies cause coughing. Smoking causes coughing. Coughing causes throat_irritation. Dehydration causes headaches. Stress causes headaches. High blood pressure causes headaches. When someone has fever AND coughing together, respiratory infection is most likely. When someone has fever, coughing AND fatigue, influenza is likely. Food poisoning causes stomach pain. Stomach pain causes discomfort. Food poisoning causes nausea. Nausea causes loss of appetite. Food poisoning causes vomiting. In physics: Heat causes expansion. Expansion causes pressure. Friction causes heat. Electricity causes magnetism. Magnetism can cause electricity (bidirectional). In environment: Pollution causes health problems. Deforestation causes soil_erosion. Soil_erosion causes flooding. Deforestation causes CO2_increase. CO2_increase causes climate_change. Climate change causes extreme weather. Extreme weather causes crop_failure. Patient John has fever and coughing. Patient Mary has stomach pain and nausea.`,

  theory_DSL: [
    // Medical causal chains (extended)
    "infection CAUSES fever",
    "inflammation CAUSES fever",
    "fever CAUSES sweating",
    "sweating CAUSES dehydration",
    "dehydration CAUSES weakness",
    "respiratory_infection CAUSES coughing",
    "allergies CAUSES coughing",
    "smoking CAUSES coughing",
    "coughing CAUSES throat_irritation",
    "dehydration CAUSES headache",
    "stress CAUSES headache",
    "high_blood_pressure CAUSES headache",
    // Diagnostic indicators
    "fever_and_coughing INDICATES respiratory_infection",
    "fever_coughing_fatigue INDICATES influenza",
    "respiratory_infection IS_A infection",
    // Food poisoning chain
    "food_poisoning CAUSES stomach_pain",
    "stomach_pain CAUSES discomfort",
    "food_poisoning CAUSES nausea",
    "nausea CAUSES loss_of_appetite",
    "food_poisoning CAUSES vomiting",
    // Physics
    "heat CAUSES expansion",
    "expansion CAUSES pressure",
    "friction CAUSES heat",
    "electricity CAUSES magnetism",
    "magnetism CAUSES electricity",
    // Environment (long chain)
    "pollution CAUSES health_problems",
    "deforestation CAUSES soil_erosion",
    "soil_erosion CAUSES flooding",
    "deforestation CAUSES CO2_increase",
    "CO2_increase CAUSES climate_change",
    "climate_change CAUSES extreme_weather",
    "extreme_weather CAUSES crop_failure",
    // Patient symptoms
    "John HAS fever",
    "John HAS coughing",
    "Mary HAS stomach_pain",
    "Mary HAS nausea"
  ],

  tasks: [
    // Q1: Long causal chain (5 steps) - infection to weakness
    {
      id: "q1",
      TASK_NL: "Can infection ultimately cause weakness? (5-step causal chain)",
      TASK_DSL: "@q1 infection CAUSES weakness",
      ANSWEAR_NL: "Yes: infection→fever→sweating→dehydration→weakness",
      PROOF_DSL: `@p1 infection CAUSES fever
@p2 fever CAUSES sweating
@p3 sweating CAUSES dehydration
@p4 dehydration CAUSES weakness
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 ESTABLISHES causal_path
@result $chain IS_A long_causal_chain
@proof $result PROVES $q1`,
      PROOF_NL: "4-step causal chain: infection causes fever, fever causes sweating, sweating causes dehydration, dehydration causes weakness."
    },

    // Q2: Abductive diagnosis with ranking - What's causing John's symptoms?
    {
      id: "q2",
      TASK_NL: "What is the most likely cause of John's fever AND coughing? (Abductive diagnosis)",
      TASK_DSL: "@q2 John DIAGNOSIS respiratory_infection",
      ANSWEAR_NL: "Respiratory infection is most likely because it explains BOTH fever (via infection→fever) and coughing (directly).",
      PROOF_DSL: `@p1 John HAS fever
@p2 John HAS coughing
@p3 fever_and_coughing INDICATES respiratory_infection
@p4 respiratory_infection CAUSES coughing
@p5 infection CAUSES fever
@p6 respiratory_infection IS_A infection
@c1 $p1 JOINS $p2
@c2 $c1 MATCHES $p3
@c3 $p6 LEADS_TO $p5
@c4 $c3 EXPLAINS $p1
@c5 $p4 EXPLAINS $p2
@abduce $c4 COMBINES $c5
@rank $abduce SCORES highest
@result $rank IS_A abductive_diagnosis
@proof $result PROVES $q2`,
      PROOF_NL: "Abductive reasoning: John has fever+coughing. Respiratory infection explains both: it causes coughing directly, and as an infection, causes fever. This is the highest-ranked explanation."
    },

    // Q3: Multi-cause abduction - What could cause Mary's symptoms?
    {
      id: "q3",
      TASK_NL: "What single cause explains Mary's stomach pain AND nausea? (Hypothesis unification)",
      TASK_DSL: "@q3 Mary DIAGNOSIS food_poisoning",
      ANSWEAR_NL: "Food poisoning explains both symptoms with a single cause.",
      PROOF_DSL: `@p1 Mary HAS stomach_pain
@p2 Mary HAS nausea
@p3 food_poisoning CAUSES stomach_pain
@p4 food_poisoning CAUSES nausea
@c1 $p3 EXPLAINS $p1
@c2 $p4 EXPLAINS $p2
@unify $c1 UNIFIES_WITH $c2
@hypothesis food_poisoning IS_A single_cause
@c3 $hypothesis EXPLAINS_BOTH symptoms
@parsimony $c3 PREFERRED_OVER multiple_causes
@result $parsimony IS_A unified_abduction
@proof $result PROVES $q3`,
      PROOF_NL: "Hypothesis unification: Food poisoning is the most parsimonious explanation because it explains BOTH stomach_pain AND nausea with a single cause."
    },

    // Q4: Causal chain with branch - Deforestation causes both flooding and crop failure
    {
      id: "q4",
      TASK_NL: "How does deforestation cause crop failure? (Multi-path causal reasoning)",
      TASK_DSL: "@q4 deforestation CAUSES crop_failure",
      ANSWEAR_NL: "Through climate path: deforestation→CO2_increase→climate_change→extreme_weather→crop_failure",
      PROOF_DSL: `@p1 deforestation CAUSES CO2_increase
@p2 CO2_increase CAUSES climate_change
@p3 climate_change CAUSES extreme_weather
@p4 extreme_weather CAUSES crop_failure
@p5 deforestation CAUSES soil_erosion
@p6 soil_erosion CAUSES flooding
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@path1 $c3 IS_A climate_path
@c4 $p5 LEADS_TO $p6
@path2 $c4 IS_A erosion_path
@multi $path1 PARALLEL $path2
@result $path1 IS_A multi_path_causation
@proof $result PROVES $q4`,
      PROOF_NL: "4-step causal chain through climate: deforestation→CO2→climate change→extreme weather→crop failure. Alternative path through soil erosion exists but leads to flooding, not crop failure."
    },

    // Q5: Bidirectional causation - Electricity and magnetism
    {
      id: "q5",
      TASK_NL: "Can magnetism cause electricity? (Bidirectional causal reasoning)",
      TASK_DSL: "@q5 magnetism CAUSES electricity",
      ANSWEAR_NL: "Yes - the relationship is bidirectional (electromagnetic induction).",
      PROOF_DSL: `@p1 electricity CAUSES magnetism
@p2 magnetism CAUSES electricity
@c1 $p1 ESTABLISHES forward_causation
@c2 $p2 ESTABLISHES reverse_causation
@bidir $c1 SYMMETRIC_WITH $c2
@feedback $bidir FORMS feedback_loop
@result $feedback IS_A bidirectional_causation
@proof $result PROVES $q5`,
      PROOF_NL: "Bidirectional reasoning: Both electricity→magnetism and magnetism→electricity exist, forming a symmetric causal relationship (electromagnetic induction)."
    },

    // Q6: Intervention reasoning - If we stop deforestation, what changes?
    {
      id: "q6",
      TASK_NL: "If deforestation stops, would extreme weather decrease? (Intervention reasoning)",
      TASK_DSL: "@q6 stop_deforestation PREVENTS extreme_weather",
      ANSWEAR_NL: "Yes, because deforestation→CO2_increase→climate_change→extreme_weather, so stopping the cause stops the effect.",
      PROOF_DSL: `@p1 deforestation CAUSES CO2_increase
@p2 CO2_increase CAUSES climate_change
@p3 climate_change CAUSES extreme_weather
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@chain $c2 ESTABLISHES causal_dependency
@intervene stop_deforestation BLOCKS $p1
@propagate $intervene BREAKS $chain
@counterfactual $propagate IMPLIES reduced_weather
@result $counterfactual IS_A intervention_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Intervention reasoning: The causal chain deforestation→CO2→climate→weather means blocking deforestation blocks the entire downstream chain, reducing extreme weather."
    },

    // Q7: Competing causes - Multiple things cause headache
    {
      id: "q7",
      TASK_NL: "Given John has dehydration (from sweating), could that explain a headache? (Derived cause chain)",
      TASK_DSL: "@q7 infection CAUSES headache",
      ANSWEAR_NL: "Yes: infection→fever→sweating→dehydration→headache (5-step chain)",
      PROOF_DSL: `@p1 infection CAUSES fever
@p2 fever CAUSES sweating
@p3 sweating CAUSES dehydration
@p4 dehydration CAUSES headache
@p5 stress CAUSES headache
@p6 high_blood_pressure CAUSES headache
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@derived $c3 IS_A derived_causation
@alt1 $p5 IS_A direct_cause
@alt2 $p6 IS_A direct_cause
@compare $derived COMPETES_WITH $alt1
@compare2 $derived COMPETES_WITH $alt2
@result $derived IS_A competing_causes_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Long derived chain: infection→fever→sweating→dehydration→headache competes with direct causes (stress, high blood pressure). The derived chain is valid if infection is present."
    },

    // Q8: Friction to pressure (3-step physics chain)
    {
      id: "q8",
      TASK_NL: "Does friction cause pressure? (Physics causal chain)",
      TASK_DSL: "@q8 friction CAUSES pressure",
      ANSWEAR_NL: "Yes: friction→heat→expansion→pressure",
      PROOF_DSL: `@p1 friction CAUSES heat
@p2 heat CAUSES expansion
@p3 expansion CAUSES pressure
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@mechanism $c2 MODELS thermodynamic_process
@physics $mechanism VALIDATES chain
@result $physics IS_A physics_derivation
@proof $result PROVES $q8`,
      PROOF_NL: "3-step physics derivation: friction generates heat, heat causes expansion, expansion creates pressure - a thermodynamic causal chain."
    }
  ]
};
