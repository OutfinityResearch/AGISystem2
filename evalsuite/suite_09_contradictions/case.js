/**
 * Test Case: Comprehensive Contradiction Detection & Constraint Reasoning
 * Tests DISJOINT detection, constraint propagation, conflict resolution, and impossibility proofs
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_09_contradictions",
  name: "Comprehensive Contradiction Detection & Constraint Reasoning",

  theory_NL: "Medical system with complex constraints. Patient states: alive, deceased, critical, stable, recovering. alive DISJOINT_WITH deceased. critical DISJOINT_WITH stable. Patients have status chains: admitted→diagnosed→treated→discharged OR admitted→diagnosed→deceased. John is alive, admitted, diagnosed with diabetes and hypertension. Treatment requires diagnosis. Discharge requires treatment complete. Critical patients cannot be discharged. Mary is critical and has incomplete treatment. Medications: aspirin thins blood, warfarin thins blood. Taking both is contraindicated. Bob takes aspirin. Surgery requires blood not thinned OR reversal agent. Age constraints: child is 0-12, teen is 13-19, adult is 20-64, senior is 65+. These are disjoint. Temperature: normal 36-37.5, fever 37.6-40, hypothermia below 35. These are disjoint. Uniqueness: each person has exactly one biological mother, one biological father. Functional constraints: each diagnosis has exactly one status (confirmed, suspected, ruled_out).",

  theory_DSL: [
    // Patient status hierarchy
    "alive DISJOINT_WITH deceased",
    "critical DISJOINT_WITH stable",
    "stable DISJOINT_WITH critical",
    "recovering COMPATIBLE_WITH stable",
    // Status chains
    "discharge REQUIRES treatment_complete",
    "treatment REQUIRES diagnosis",
    "diagnosis REQUIRES admission",
    "treatment_complete REQUIRES all_conditions_treated",
    // Patient John
    "John IS_A patient",
    "John IS_A alive",
    "John STATUS admitted",
    "John STATUS diagnosed",
    "John HAS_DIAGNOSIS diabetes",
    "John HAS_DIAGNOSIS hypertension",
    "diabetes STATUS confirmed",
    "hypertension STATUS confirmed",
    "John BIOLOGICAL_MOTHER Mary_Sr",
    "John BIOLOGICAL_FATHER Robert",
    // Patient Mary
    "Mary IS_A patient",
    "Mary IS_A critical",
    "Mary HAS treatment_incomplete",
    "critical BLOCKS discharge",
    "treatment_incomplete BLOCKS discharge",
    // Medication constraints
    "aspirin THINS blood",
    "warfarin THINS blood",
    "aspirin CONTRAINDICATED_WITH warfarin",
    "contraindicated CAUSES adverse_interaction",
    "Bob TAKES aspirin",
    "surgery REQUIRES blood_not_thinned",
    "blood_thinned BLOCKS surgery",
    // Age categories
    "child DISJOINT_WITH teen",
    "child DISJOINT_WITH adult",
    "child DISJOINT_WITH senior",
    "teen DISJOINT_WITH adult",
    "teen DISJOINT_WITH senior",
    "adult DISJOINT_WITH senior",
    // Temperature
    "normal_temp DISJOINT_WITH fever",
    "normal_temp DISJOINT_WITH hypothermia",
    "fever DISJOINT_WITH hypothermia",
    // Functional constraints
    "biological_mother HAS cardinality_1",
    "biological_father HAS cardinality_1",
    "diagnosis_status HAS cardinality_1"
  ],

  tasks: [
    // Q1: Deep disjointness proof - can John be deceased?
    {
      id: "q1",
      TASK_NL: "Can John be deceased? (Multi-step contradiction detection)",
      TASK_DSL: "@q1 alive DISJOINT_WITH deceased",
      ANSWEAR_NL: "No - John is alive, alive DISJOINT_WITH deceased, therefore impossible",
      PROOF_DSL: `@p1 John IS_A alive
@p2 alive DISJOINT_WITH deceased
@p3 John IS_A patient
@p4 John STATUS admitted
@c1 $p1 ESTABLISHES john_alive
@c2 $p2 DEFINES exclusion_rule
@c3 John HYPOTHESIZES deceased
@c4 $c1 CONFLICTS $c3
@c5 $c2 APPLIES $c4
@c6 $c5 PROVES contradiction
@c7 $c6 BLOCKS $c3
@c8 alternative_paths MISSING search
@result $c7 IS_A impossibility_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Contradiction proof: 1) John is alive (fact) 2) alive DISJOINT_WITH deceased (constraint) 3) Hypothesize John deceased 4) Detect conflict with step 1 5) Apply disjointness rule 6) Prove impossibility."
    },

    // Q2: Constraint chain - can Mary be discharged?
    {
      id: "q2",
      TASK_NL: "Can Mary be discharged? (Multiple blocking constraints)",
      TASK_DSL: "@q2 critical BLOCKS discharge",
      ANSWEAR_NL: "No - blocked by both critical status AND incomplete treatment",
      PROOF_DSL: `@p1 Mary IS_A critical
@p2 Mary HAS treatment_incomplete
@p3 critical BLOCKS discharge
@p4 treatment_incomplete BLOCKS discharge
@p5 discharge REQUIRES treatment_complete
@c1 $p1 LEADS_TO $p3
@c2 $c1 ESTABLISHES first_block
@c3 $p2 LEADS_TO $p4
@c4 $c3 ESTABLISHES second_block
@c5 $p2 CONTRADICTS $p5
@c6 $c5 IS missing_requirement
@c7 $c2 COMBINES $c4
@c8 $c7 COMBINES $c6
@c9 workaround_paths MISSING search
@c10 $c8 PROVES no_discharge
@result $c10 IS_A multi_block_impossibility
@proof $result PROVES $q2`,
      PROOF_NL: "Multiple blocking: 1) Critical status blocks discharge 2) Incomplete treatment also blocks 3) Treatment_complete requirement not met 4) All three constraints prevent discharge."
    },

    // Q3: Medication contraindication - can Bob have surgery?
    {
      id: "q3",
      TASK_NL: "Can Bob have surgery now? (Drug interaction constraint)",
      TASK_DSL: "@q3 blood_thinned BLOCKS surgery",
      ANSWEAR_NL: "No - Bob takes aspirin which thins blood, surgery requires blood not thinned",
      PROOF_DSL: `@p1 Bob TAKES aspirin
@p2 aspirin THINS blood
@p3 surgery REQUIRES blood_not_thinned
@p4 blood_thinned BLOCKS surgery
@c1 $p1 LEADS_TO $p2
@c2 $c1 ESTABLISHES blood_thinned
@c3 $c2 CONTRADICTS $p3
@c4 $c2 TRIGGERS $p4
@c5 $c4 PREVENTS surgery
@c6 reversal_agent COULD $c5
@c7 reversal MISSING administered
@c8 $c7 MAINTAINS $c5
@result $c8 IS_A blocked_action_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Constraint chain: 1) Bob takes aspirin 2) Aspirin thins blood 3) Surgery requires blood not thinned 4) Blood thinned blocks surgery 5) No reversal agent → still blocked."
    },

    // Q4: Age category exclusivity - can someone be both child and adult?
    {
      id: "q4",
      TASK_NL: "Can someone be both a child and an adult? (Category exclusivity)",
      TASK_DSL: "@q4 child DISJOINT_WITH adult",
      ANSWEAR_NL: "No - child DISJOINT_WITH adult, categories are mutually exclusive",
      PROOF_DSL: `@p1 child DISJOINT_WITH adult
@p2 child DISJOINT_WITH teen
@p3 teen DISJOINT_WITH adult
@p4 child DISJOINT_WITH senior
@p5 adult DISJOINT_WITH senior
@c1 person HYPOTHESIZES child
@c2 person HYPOTHESIZES adult
@c3 $c1 ESTABLISHES child_claim
@c4 $c2 ESTABLISHES adult_claim
@c5 $c3 CONFLICTS $c4
@c6 $p1 APPLIES $c5
@c7 $c6 PROVES exclusive_categories
@c8 $p1 COMBINES $p2
@c9 $c8 COMBINES $p3
@c10 $c9 PROVES complete_partition
@result $c7 IS_A category_exclusivity_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Category exclusivity: 1) All age categories are pairwise disjoint 2) child vs adult specifically disjoint 3) Asserting both creates contradiction 4) Categories form complete partition."
    },

    // Q5: Functional constraint violation - two mothers
    {
      id: "q5",
      TASK_NL: "Can John have two biological mothers? (Functional constraint)",
      TASK_DSL: "@q5 biological_mother HAS cardinality_1",
      ANSWEAR_NL: "No - biological_mother has cardinality 1 (exactly one)",
      PROOF_DSL: `@p1 John BIOLOGICAL_MOTHER Mary_Sr
@p2 biological_mother HAS cardinality_1
@c1 John HYPOTHESIZES second_mother
@c2 $p1 ESTABLISHES first_mother
@c3 $c1 PROPOSES second_mother
@c4 $p2 DEFINES uniqueness_constraint
@c5 $c2 COMBINES $c3
@c6 $c5 HAS value_2
@c7 $c6 EXCEEDS $c4
@c8 $c7 PROVES constraint_violated
@c9 replace_first COULD $c4
@c10 $p1 IS established
@c11 $c10 PREVENTS $c1
@result $c11 IS_A functional_constraint_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Functional constraint: 1) John already has biological mother Mary_Sr 2) biological_mother has cardinality 1 3) Adding second mother would create count 2 4) Violates uniqueness constraint."
    },

    // Q6: Temperature contradiction - fever and hypothermia
    {
      id: "q6",
      TASK_NL: "Can a patient have both fever and hypothermia? (Physiological impossibility)",
      TASK_DSL: "@q6 fever DISJOINT_WITH hypothermia",
      ANSWEAR_NL: "No - fever (high temp) and hypothermia (low temp) are disjoint states",
      PROOF_DSL: `@p1 fever DISJOINT_WITH hypothermia
@p2 normal_temp DISJOINT_WITH fever
@p3 normal_temp DISJOINT_WITH hypothermia
@c1 patient HYPOTHESIZES fever
@c2 patient HYPOTHESIZES hypothermia
@c3 $c1 ESTABLISHES high_temp_state
@c4 $c2 ESTABLISHES low_temp_state
@c5 fever IMPLIES temp_above_37_5
@c6 hypothermia IMPLIES temp_below_35
@c7 $c5 INCOMPATIBLE $c6
@c8 $p1 APPLIES $c7
@c9 $c8 PROVES physical_impossibility
@c10 $p1 COMBINES $p2
@c11 $c10 COMBINES $p3
@c12 $c11 PROVES complete_partition
@result $c9 IS_A physiological_impossibility_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Physiological impossibility: 1) Fever = temp > 37.5°C 2) Hypothermia = temp < 35°C 3) Temperature is single value 4) Cannot be both high AND low 5) Categories are disjoint."
    },

    // Q7: Reductio ad absurdum - stable and critical
    {
      id: "q7",
      TASK_NL: "Prove by contradiction: if Mary is stable, derive absurdity",
      TASK_DSL: "@q7 critical DISJOINT_WITH stable",
      ANSWEAR_NL: "Assume Mary stable → but Mary is critical → critical DISJOINT stable → contradiction",
      PROOF_DSL: `@p1 Mary IS_A critical
@p2 critical DISJOINT_WITH stable
@p3 stable DISJOINT_WITH critical
@c1 Mary ASSUMES stable
@c2 $p1 ESTABLISHES known_critical
@c3 $c1 PROPOSES stability
@c4 $c2 CONFLICTS $c3
@c5 $p2 APPLIES $c4
@c6 $c5 DERIVES false
@c7 $c1 LEADS_TO $c6
@c8 $c7 PROVES NOT_stable
@c9 $p1 CONFIRMS critical_status
@c10 $c9 COMPATIBLE $c8
@result $c7 IS_A reductio_ad_absurdum
@proof $result PROVES $q7`,
      PROOF_NL: "Reductio ad absurdum: 1) Assume Mary is stable 2) Known: Mary is critical 3) critical DISJOINT stable 4) Both true → contradiction 5) Therefore Mary is NOT stable."
    },

    // Q8: Requirement chain impossibility
    {
      id: "q8",
      TASK_NL: "What is required for John to be discharged? (Deep requirement chain)",
      TASK_DSL: "@q8 discharge REQUIRES treatment_complete",
      ANSWEAR_NL: "discharge→treatment_complete→all_conditions_treated→each diagnosis treated",
      PROOF_DSL: `@p1 discharge REQUIRES treatment_complete
@p2 treatment_complete REQUIRES all_conditions_treated
@p3 treatment REQUIRES diagnosis
@p4 diagnosis REQUIRES admission
@p5 John HAS_DIAGNOSIS diabetes
@p6 John HAS_DIAGNOSIS hypertension
@p7 diabetes STATUS confirmed
@p8 hypertension STATUS confirmed
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 COMPUTES requirement_chain
@c5 $p5 COMBINES $p6
@c6 $c5 ESTABLISHES two_conditions
@c7 $c6 REQUIRES treatment_for_each
@c8 diabetes NEEDS treatment_plan
@c9 hypertension NEEDS treatment_plan
@c10 $c8 COMBINES $c9
@c11 $c10 SATISFIES $p2
@c12 John STATUS admitted
@c13 $c12 SATISFIES $p4
@result $c4 IS_A requirement_chain_analysis
@proof $result PROVES $q8`,
      PROOF_NL: "Requirement chain: 1) Discharge requires treatment_complete 2) Treatment_complete requires all_conditions_treated 3) John has 2 diagnoses 4) Each needs treatment plan 5) Then treatment_complete possible 6) Then discharge possible."
    }
  ]
};
