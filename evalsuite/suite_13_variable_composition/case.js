/**
 * Test Case: Comprehensive Variable Composition & Multi-Domain Reasoning
 * Tests cross-domain inference, eligibility chains, access control derivation, and diagnostic reasoning
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_13_variable_composition",
  name: "Comprehensive Variable Composition & Multi-Domain Reasoning",

  theory_NL: "Academic domain: Students Alice, Bob, Carol with various enrollments. Course prerequisites form chains: Math101→Math201→Math301. Physics201→Physics301→Physics401. Chemistry101→Chemistry201. To take an advanced course, must have all prerequisites satisfied transitively. GPA requirements: Math301 requires GPA 3.0+, Physics401 requires GPA 3.5+. Alice has GPA 3.2, Bob has GPA 3.8, Carol has GPA 2.5. Access control: Roles Manager, Engineer, Intern with hierarchical permissions. Manager accesses finance_data, hr_data, and inherits Engineer access. Engineer accesses tech_data, code_repo. Intern only accesses public_data. Employee_1 is Manager, Employee_2 is Engineer, Employee_3 is Intern. Medical diagnosis: Symptoms fever, cough, fatigue, sore_throat, runny_nose. Flu causes fever+cough+fatigue. Cold causes runny_nose+sore_throat+cough. COVID causes fever+cough+fatigue+sore_throat. Patient_A has fever+cough+fatigue (matches Flu). Patient_B has all 5 symptoms (matches COVID best). Diagnosis requires matching majority of symptoms.",

  theory_DSL: [
    // Academic - extended prerequisites
    "Alice ENROLLED_IN Math101",
    "Alice ENROLLED_IN Math201",
    "Alice ENROLLED_IN Physics201",
    "Alice HAS_GPA 3_2",
    "Bob ENROLLED_IN Math101",
    "Bob ENROLLED_IN Math201",
    "Bob ENROLLED_IN Math301",
    "Bob ENROLLED_IN Physics201",
    "Bob ENROLLED_IN Physics301",
    "Bob HAS_GPA 3_8",
    "Carol ENROLLED_IN Math101",
    "Carol ENROLLED_IN Chemistry101",
    "Carol HAS_GPA 2_5",
    // Prerequisite chains
    "Math101 PREREQUISITE_FOR Math201",
    "Math201 PREREQUISITE_FOR Math301",
    "Physics201 PREREQUISITE_FOR Physics301",
    "Physics301 PREREQUISITE_FOR Physics401",
    "Chemistry101 PREREQUISITE_FOR Chemistry201",
    // GPA requirements
    "Math301 REQUIRES_GPA 3_0",
    "Physics401 REQUIRES_GPA 3_5",
    "Math301 IS_A advanced_course",
    "Physics401 IS_A advanced_course",
    "3_2 GREATER_THAN 3_0",
    "3_8 GREATER_THAN 3_5",
    "2_5 LESS_THAN 3_0",
    // Access control hierarchy
    "Employee_1 HAS_ROLE Manager",
    "Employee_2 HAS_ROLE Engineer",
    "Employee_3 HAS_ROLE Intern",
    "Manager CAN_ACCESS finance_data",
    "Manager CAN_ACCESS hr_data",
    "Manager INHERITS_FROM Engineer",
    "Engineer CAN_ACCESS tech_data",
    "Engineer CAN_ACCESS code_repo",
    "Intern CAN_ACCESS public_data",
    "public_data IS_A unrestricted",
    // Medical symptoms and diseases
    "Patient_A HAS_SYMPTOM fever",
    "Patient_A HAS_SYMPTOM cough",
    "Patient_A HAS_SYMPTOM fatigue",
    "Patient_B HAS_SYMPTOM fever",
    "Patient_B HAS_SYMPTOM cough",
    "Patient_B HAS_SYMPTOM fatigue",
    "Patient_B HAS_SYMPTOM sore_throat",
    "Patient_B HAS_SYMPTOM runny_nose",
    "Flu CAUSES fever",
    "Flu CAUSES cough",
    "Flu CAUSES fatigue",
    "Cold CAUSES runny_nose",
    "Cold CAUSES sore_throat",
    "Cold CAUSES cough",
    "COVID CAUSES fever",
    "COVID CAUSES cough",
    "COVID CAUSES fatigue",
    "COVID CAUSES sore_throat",
    "Flu MATCHES 3_of_3_symptoms",
    "COVID MATCHES 4_of_4_symptoms",
    "Cold MATCHES 3_of_3_symptoms",
    "parsimony PREFERS single_diagnosis"
  ],

  tasks: [
    {
      id: "q1",
      TASK_NL: "Can Alice take Math301? (Prerequisite chain + GPA check)",
      TASK_DSL: "@q1 Alice ELIGIBLE_FOR Math301",
      ANSWEAR_NL: "Yes - Alice has Math101→Math201 (prerequisites) and GPA 3.2 ≥ 3.0 (requirement)",
      PROOF_DSL: `@p1 Alice ENROLLED_IN Math101
@p2 Alice ENROLLED_IN Math201
@p3 Math101 PREREQUISITE_FOR Math201
@p4 Math201 PREREQUISITE_FOR Math301
@p5 Alice HAS_GPA 3_2
@p6 Math301 REQUIRES_GPA 3_0
@p7 3_2 GREATER_THAN 3_0
@c1 $p1 SATISFIES first_prereq
@c2 $p2 SATISFIES second_prereq
@c3 $p3 LINKS $c1
@c4 $c3 LEADS_TO $c2
@c5 $p4 EXTENDS chain
@c6 $c4 VALIDATES prerequisites
@c7 $p5 COMPARED_TO $p6
@c8 $c7 USES $p7
@c9 $c8 SATISFIES gpa_requirement
@c10 $c6 COMBINES $c9
@result $c10 IS_A multi_criteria_eligibility
@proof $result PROVES $q1`,
      PROOF_NL: "Multi-criteria eligibility: 1) Has Math101 2) Has Math201 3) Chain satisfied 4) GPA 3.2 ≥ 3.0 5) All criteria met."
    },
    {
      id: "q2",
      TASK_NL: "Can Carol take Math301? (Missing intermediate + GPA failure)",
      TASK_DSL: "@q2 Carol INELIGIBLE_FOR Math301",
      ANSWEAR_NL: "No - missing Math201 AND GPA 2.5 < 3.0",
      PROOF_DSL: `@p1 Carol ENROLLED_IN Math101
@p2 Math101 PREREQUISITE_FOR Math201
@p3 Math201 PREREQUISITE_FOR Math301
@p4 Math301 REQUIRES_GPA 3_0
@p5 Carol HAS_GPA 2_5
@p6 2_5 LESS_THAN 3_0
@c1 $p1 SATISFIES first_prereq
@c2 Carol MISSING Math201
@c3 $c2 BLOCKS $p2
@c4 $c3 BREAKS chain
@c5 $p5 COMPARED_TO $p4
@c6 $c5 USES $p6
@c7 $c6 FAILS gpa_requirement
@c8 $c4 COMBINES $c7
@c9 $c8 PROVES dual_failure
@result $c9 IS_A multi_failure_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Dual failure: 1) Has Math101 but missing Math201 2) Chain breaks 3) GPA 2.5 < 3.0 4) Both criteria fail."
    },
    {
      id: "q3",
      TASK_NL: "What data can Employee_1 (Manager) access? (Role inheritance)",
      TASK_DSL: "@q3 Employee_1 ACCESSES all_data",
      ANSWEAR_NL: "finance_data, hr_data (direct) + tech_data, code_repo (inherited from Engineer)",
      PROOF_DSL: `@p1 Employee_1 HAS_ROLE Manager
@p2 Manager CAN_ACCESS finance_data
@p3 Manager CAN_ACCESS hr_data
@p4 Manager INHERITS_FROM Engineer
@p5 Engineer CAN_ACCESS tech_data
@p6 Engineer CAN_ACCESS code_repo
@c1 $p1 LEADS_TO $p2
@c2 $p1 LEADS_TO $p3
@c3 $c1 COMBINES $c2
@c4 $p1 LEADS_TO $p4
@c5 $c4 LEADS_TO $p5
@c6 $c4 LEADS_TO $p6
@c7 $c5 COMBINES $c6
@c8 $c3 COMBINES $c7
@c9 $c8 TOTALS 4_resources
@result $c9 IS_A access_enumeration_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Access enumeration: 1) Manager has finance, hr 2) Inherits from Engineer 3) Gets tech, code 4) Total: 4 resources."
    },
    {
      id: "q4",
      TASK_NL: "Can Employee_3 (Intern) access finance_data?",
      TASK_DSL: "@q4 Employee_3 DENIED finance_data",
      ANSWEAR_NL: "No - Interns only access public_data, no inheritance chain to finance_data",
      PROOF_DSL: `@p1 Employee_3 HAS_ROLE Intern
@p2 Intern CAN_ACCESS public_data
@p3 Manager CAN_ACCESS finance_data
@p4 Manager INHERITS_FROM Engineer
@c1 $p1 LEADS_TO $p2
@c2 $c1 LIMITS access
@c3 Intern LACKS inheritance
@c4 $c3 BLOCKS escalation
@c5 Intern LACKS finance_access
@c6 $c5 CONFIRMS denial
@c7 $c4 COMBINES $c6
@c8 $c7 PROVES no_access
@result $c8 IS_A access_denial_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Access denial: 1) Intern has only public_data 2) No inheritance relation 3) Cannot escalate 4) Denied."
    },
    {
      id: "q5",
      TASK_NL: "What disease best explains Patient_A's symptoms? (Abductive diagnosis)",
      TASK_DSL: "@q5 Flu MATCHES 3_of_3_symptoms",
      ANSWEAR_NL: "Flu - matches all 3 symptoms (fever, cough, fatigue). COVID matches 3/4, Cold matches 1/3.",
      PROOF_DSL: `@p1 Patient_A HAS_SYMPTOM fever
@p2 Patient_A HAS_SYMPTOM cough
@p3 Patient_A HAS_SYMPTOM fatigue
@p4 Flu CAUSES fever
@p5 Flu CAUSES cough
@p6 Flu CAUSES fatigue
@p7 COVID CAUSES fever
@p8 COVID CAUSES cough
@p9 COVID CAUSES fatigue
@p10 COVID CAUSES sore_throat
@c1 $p1 EXPLAINED_BY $p4
@c2 $p2 EXPLAINED_BY $p5
@c3 $p3 EXPLAINED_BY $p6
@c4 $c1 COMBINES $c2
@c5 $c4 COMBINES $c3
@c6 $c5 SCORES 3_of_3
@c7 $p1 EXPLAINED_BY $p7
@c8 COVID SCORES 3_of_4
@c9 $c6 BETTER_THAN $c8
@c10 Flu IS best_match
@result $c10 IS_A abductive_diagnosis_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Abductive diagnosis: 1) Flu explains 3/3 2) COVID explains 3/4 3) Flu has perfect coverage."
    },
    {
      id: "q6",
      TASK_NL: "Patient_B has all 5 symptoms - which disease is most likely?",
      TASK_DSL: "@q6 COVID MATCHES 4_of_4_symptoms",
      ANSWEAR_NL: "COVID (4/4) or Flu+Cold combination. COVID is single best explanation.",
      PROOF_DSL: `@p1 Patient_B HAS_SYMPTOM fever
@p2 Patient_B HAS_SYMPTOM cough
@p3 Patient_B HAS_SYMPTOM fatigue
@p4 Patient_B HAS_SYMPTOM sore_throat
@p5 Patient_B HAS_SYMPTOM runny_nose
@p6 COVID CAUSES fever
@p7 COVID CAUSES cough
@p8 COVID CAUSES fatigue
@p9 COVID CAUSES sore_throat
@p10 parsimony PREFERS single_diagnosis
@c1 $p1 EXPLAINED_BY $p6
@c2 $p2 EXPLAINED_BY $p7
@c3 $p3 EXPLAINED_BY $p8
@c4 $p4 EXPLAINED_BY $p9
@c5 $c1 COMBINES $c2
@c6 $c5 COMBINES $c3
@c7 $c6 COMBINES $c4
@c8 COVID SCORES 4_of_4
@c9 $p5 UNEXPLAINED_BY COVID
@c10 $p10 FAVORS $c8
@result $c10 IS_A differential_diagnosis_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Differential diagnosis: 1) COVID explains 4/4 2) runny_nose unexplained 3) Parsimony prefers single disease."
    },
    {
      id: "q7",
      TASK_NL: "Can Bob take Physics401? (3-level prereq chain + GPA 3.5+)",
      TASK_DSL: "@q7 Bob ELIGIBLE_FOR Physics401",
      ANSWEAR_NL: "Yes - Bob has Physics201→Physics301 and GPA 3.8 ≥ 3.5",
      PROOF_DSL: `@p1 Bob ENROLLED_IN Physics201
@p2 Bob ENROLLED_IN Physics301
@p3 Physics201 PREREQUISITE_FOR Physics301
@p4 Physics301 PREREQUISITE_FOR Physics401
@p5 Bob HAS_GPA 3_8
@p6 Physics401 REQUIRES_GPA 3_5
@p7 3_8 GREATER_THAN 3_5
@c1 $p1 SATISFIES level_1
@c2 $p2 SATISFIES level_2
@c3 $p3 LINKS $c1
@c4 $c3 LEADS_TO $c2
@c5 $p4 EXTENDS chain
@c6 $c4 VALIDATES prerequisites
@c7 $p5 COMPARED_TO $p6
@c8 $c7 USES $p7
@c9 $c8 SATISFIES gpa_requirement
@c10 $c6 COMBINES $c9
@result $c10 IS_A advanced_eligibility_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Advanced eligibility: 1) Has Physics201, Physics301 2) Chain validates 3) GPA 3.8 > 3.5 4) Eligible."
    },
    {
      id: "q8",
      TASK_NL: "Which employees can access code_repo? (Role-based search)",
      TASK_DSL: "@q8 code_repo ACCESSED_BY employees",
      ANSWEAR_NL: "Employee_1 (via Manager→Engineer inheritance) and Employee_2 (directly as Engineer)",
      PROOF_DSL: `@p1 Engineer CAN_ACCESS code_repo
@p2 Manager INHERITS_FROM Engineer
@p3 Employee_1 HAS_ROLE Manager
@p4 Employee_2 HAS_ROLE Engineer
@p5 Employee_3 HAS_ROLE Intern
@c1 $p3 LEADS_TO $p2
@c2 $c1 LEADS_TO $p1
@c3 $c2 GRANTS Employee_1
@c4 $p4 LEADS_TO $p1
@c5 $c4 GRANTS Employee_2
@c6 $p5 LACKS code_access
@c7 $c6 DENIES Employee_3
@c8 $c3 COMBINES $c5
@c9 $c8 EXCLUDES $c7
@result $c9 IS_A reverse_access_search
@proof $result PROVES $q8`,
      PROOF_NL: "Reverse access: 1) Engineer has code_repo 2) Manager inherits 3) Employee_1 ✓ 4) Employee_2 ✓ 5) Employee_3 ✗"
    }
  ]
};
