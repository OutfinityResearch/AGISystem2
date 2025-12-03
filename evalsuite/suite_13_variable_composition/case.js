/**
 * Test Case: Comprehensive Variable Composition & Multi-Domain Reasoning
 * Tests cross-domain inference, eligibility chains, access control derivation, and diagnostic reasoning
 * Version: 5.0 - Complex proofs with multi-step eligibility, cross-domain composition, and abductive diagnosis
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
    "Alice HAS_GPA 3.2",
    "Bob ENROLLED_IN Math101",
    "Bob ENROLLED_IN Math201",
    "Bob ENROLLED_IN Math301",
    "Bob ENROLLED_IN Physics201",
    "Bob ENROLLED_IN Physics301",
    "Bob HAS_GPA 3.8",
    "Carol ENROLLED_IN Math101",
    "Carol ENROLLED_IN Chemistry101",
    "Carol HAS_GPA 2.5",
    // Prerequisite chains
    "Math101 PREREQUISITE_FOR Math201",
    "Math201 PREREQUISITE_FOR Math301",
    "Physics201 PREREQUISITE_FOR Physics301",
    "Physics301 PREREQUISITE_FOR Physics401",
    "Chemistry101 PREREQUISITE_FOR Chemistry201",
    // GPA requirements
    "Math301 REQUIRES_GPA 3.0",
    "Physics401 REQUIRES_GPA 3.5",
    "Math301 IS_A advanced_course",
    "Physics401 IS_A advanced_course",
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
    "COVID CAUSES sore_throat"
  ],

  tasks: [
    // Q1: Multi-step prerequisite chain - can Alice take Math301?
    {
      id: "q1",
      TASK_NL: "Can Alice take Math301? (Prerequisite chain + GPA check)",
      TASK_DSL: "@q1 Alice ELIGIBLE_FOR Math301",
      ANSWEAR_NL: "Yes - Alice has Math101→Math201 (prerequisites) and GPA 3.2 ≥ 3.0 (requirement)",
      PROOF_DSL: `@p1 Alice ENROLLED_IN Math101
@p2 Alice ENROLLED_IN Math201
@p3 Math101 PREREQUISITE_FOR Math201
@p4 Math201 PREREQUISITE_FOR Math301
@p5 Math301 REQUIRES_GPA 3.0
@p6 Alice HAS_GPA 3.2
@c1 $p1 SATISFIES first_prereq
@c2 $p2 SATISFIES second_prereq
@c3 $p3 LINKS $c1 TO $c2
@c4 $p4 EXTENDS chain
@prereq_chain $c3 THEN $c4
@check_prereqs $prereq_chain VALIDATES prerequisites
@c5 $p6 GREATER_THAN_OR_EQUAL $p5
@gpa_check $c5 SATISFIES gpa_requirement
@combine $check_prereqs AND $gpa_check
@eligible $combine PROVES eligibility
@result $eligible IS_A multi_criteria_eligibility
@proof $result PROVES $q1`,
      PROOF_NL: "Multi-criteria eligibility: 1) Has Math101 (first prereq) 2) Has Math201 (second prereq) 3) Chain: Math101→Math201→Math301 satisfied 4) GPA 3.2 ≥ 3.0 5) All criteria met."
    },

    // Q2: Transitive prerequisite failure - can Carol take Math301?
    {
      id: "q2",
      TASK_NL: "Can Carol take Math301? (Missing intermediate + GPA failure)",
      TASK_DSL: "@q2 Carol ELIGIBLE_FOR Math301",
      ANSWEAR_NL: "No - missing Math201 AND GPA 2.5 < 3.0",
      PROOF_DSL: `@p1 Carol ENROLLED_IN Math101
@p2 Math101 PREREQUISITE_FOR Math201
@p3 Math201 PREREQUISITE_FOR Math301
@p4 Math301 REQUIRES_GPA 3.0
@p5 Carol HAS_GPA 2.5
@check_201 Carol ENROLLED_IN Math201
@c1 $check_201 NOT_FOUND
@missing $c1 FAILS prereq_Math201
@c2 $p1 SATISFIES prereq_Math101
@c3 $p2 REQUIRES $check_201
@c4 $c3 BLOCKED_BY $missing
@prereq_fail $c4 BLOCKS chain
@c5 $p5 LESS_THAN $p4
@gpa_fail $c5 FAILS gpa_requirement
@both_fail $prereq_fail AND $gpa_fail
@ineligible $both_fail PROVES not_eligible
@result $ineligible IS_A multi_failure_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Dual failure: 1) Has Math101 but missing Math201 2) Prerequisite chain breaks 3) GPA 2.5 < 3.0 4) Both criteria fail independently."
    },

    // Q3: Access control with role inheritance - what can Manager access?
    {
      id: "q3",
      TASK_NL: "What data can Employee_1 (Manager) access? (Role inheritance)",
      TASK_DSL: "@q3 Employee_1 ACCESS_LIST complete",
      ANSWEAR_NL: "finance_data, hr_data (direct) + tech_data, code_repo (inherited from Engineer)",
      PROOF_DSL: `@p1 Employee_1 HAS_ROLE Manager
@p2 Manager CAN_ACCESS finance_data
@p3 Manager CAN_ACCESS hr_data
@p4 Manager INHERITS_FROM Engineer
@p5 Engineer CAN_ACCESS tech_data
@p6 Engineer CAN_ACCESS code_repo
@c1 $p1 LEADS_TO $p2
@c2 $p1 LEADS_TO $p3
@direct $c1 AND $c2
@c3 $p1 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@c5 $c3 LEADS_TO $p6
@inherited $c4 AND $c5
@combine $direct AND $inherited
@enumerate finance_data IN $combine
@enumerate2 hr_data IN $combine
@enumerate3 tech_data IN $combine
@enumerate4 code_repo IN $combine
@complete $enumerate AND $enumerate2
@complete2 $complete AND $enumerate3
@complete3 $complete2 AND $enumerate4
@result $complete3 IS_A access_enumeration_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Access enumeration with inheritance: 1) Manager has direct access (finance, hr) 2) Manager inherits from Engineer 3) Add Engineer access (tech, code) 4) Total: 4 resources."
    },

    // Q4: Access control failure - Intern restrictions
    {
      id: "q4",
      TASK_NL: "Can Employee_3 (Intern) access finance_data?",
      TASK_DSL: "@q4 Employee_3 CAN_ACCESS finance_data",
      ANSWEAR_NL: "No - Interns only access public_data, no inheritance chain to finance_data",
      PROOF_DSL: `@p1 Employee_3 HAS_ROLE Intern
@p2 Intern CAN_ACCESS public_data
@p3 Manager CAN_ACCESS finance_data
@p4 Manager INHERITS_FROM Engineer
@search Intern INHERITS_FROM anything
@c1 $search NOT_FOUND
@no_inheritance $c1 BLOCKS escalation
@c2 $p1 LEADS_TO $p2
@only_public $c2 IS_ONLY access
@check_direct Intern CAN_ACCESS finance_data
@c3 $check_direct NOT_FOUND
@no_direct $c3 FAILS direct_access
@check_inherit Intern INHERITS finance_access
@c4 $check_inherit NOT_FOUND
@no_indirect $c4 FAILS inherited_access
@combine $no_direct AND $no_indirect
@blocked $combine PROVES no_access
@result $blocked IS_A access_denial_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Access denial: 1) Intern role has no direct finance_data access 2) Intern has no INHERITS_FROM relation 3) Cannot escalate privileges 4) Access denied."
    },

    // Q5: Abductive diagnosis - Patient_A
    {
      id: "q5",
      TASK_NL: "What disease best explains Patient_A's symptoms? (Abductive diagnosis)",
      TASK_DSL: "@q5 Patient_A DIAGNOSIS best_match",
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
@p11 Cold CAUSES cough
@flu_match1 $p1 EXPLAINED_BY $p4
@flu_match2 $p2 EXPLAINED_BY $p5
@flu_match3 $p3 EXPLAINED_BY $p6
@flu_score $flu_match1 AND $flu_match2
@flu_total $flu_score AND $flu_match3
@flu_count 3_of_3 SYMPTOMS matched
@covid_match1 $p1 EXPLAINED_BY $p7
@covid_match2 $p2 EXPLAINED_BY $p8
@covid_match3 $p3 EXPLAINED_BY $p9
@covid_miss sore_throat NOT_PRESENT
@covid_count 3_of_4 SYMPTOMS matched
@cold_match $p2 EXPLAINED_BY $p11
@cold_count 1_of_3 SYMPTOMS matched
@compare $flu_count BETTER_THAN $covid_count
@compare2 $flu_count BETTER_THAN $cold_count
@best $compare AND $compare2
@result $best IS_A abductive_diagnosis_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Abductive diagnosis: 1) Flu explains 3/3 symptoms 2) COVID explains 3/4 (missing sore_throat) 3) Cold explains 1/3 4) Flu has best coverage ratio."
    },

    // Q6: Complex diagnosis with multiple matches - Patient_B
    {
      id: "q6",
      TASK_NL: "Patient_B has all 5 symptoms - which disease is most likely?",
      TASK_DSL: "@q6 Patient_B DIAGNOSIS best_match",
      ANSWEAR_NL: "COVID (4/4) or Flu+Cold combination. COVID is single best explanation.",
      PROOF_DSL: `@p1 Patient_B HAS_SYMPTOM fever
@p2 Patient_B HAS_SYMPTOM cough
@p3 Patient_B HAS_SYMPTOM fatigue
@p4 Patient_B HAS_SYMPTOM sore_throat
@p5 Patient_B HAS_SYMPTOM runny_nose
@covid_f COVID CAUSES fever
@covid_c COVID CAUSES cough
@covid_fa COVID CAUSES fatigue
@covid_s COVID CAUSES sore_throat
@cold_r Cold CAUSES runny_nose
@cold_s Cold CAUSES sore_throat
@cold_c Cold CAUSES cough
@flu_f Flu CAUSES fever
@flu_c Flu CAUSES cough
@flu_fa Flu CAUSES fatigue
@covid_matches 4_symptoms EXPLAINED_BY COVID
@flu_matches 3_symptoms EXPLAINED_BY Flu
@cold_matches 3_symptoms EXPLAINED_BY Cold
@unexplained runny_nose NOT_IN COVID
@parsimony single_disease PREFERRED
@covid_best $covid_matches HIGHEST single_coverage
@alternative Flu AND Cold TOGETHER
@alt_coverage $alternative EXPLAINS 5_symptoms
@complexity $parsimony PREFERS $covid_best
@final $complexity SELECTS COVID
@result $final IS_A differential_diagnosis_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Differential diagnosis: 1) COVID explains 4/4 of its symptoms 2) Flu+Cold together would explain all 5 3) Parsimony prefers single diagnosis 4) COVID is best single explanation."
    },

    // Q7: Can Bob take Physics401? (Deep chain + high GPA)
    {
      id: "q7",
      TASK_NL: "Can Bob take Physics401? (3-level prereq chain + GPA 3.5+)",
      TASK_DSL: "@q7 Bob ELIGIBLE_FOR Physics401",
      ANSWEAR_NL: "Yes - Bob has Physics201→Physics301 and GPA 3.8 ≥ 3.5",
      PROOF_DSL: `@p1 Bob ENROLLED_IN Physics201
@p2 Bob ENROLLED_IN Physics301
@p3 Physics201 PREREQUISITE_FOR Physics301
@p4 Physics301 PREREQUISITE_FOR Physics401
@p5 Physics401 REQUIRES_GPA 3.5
@p6 Bob HAS_GPA 3.8
@c1 $p1 SATISFIES level_1
@c2 $p2 SATISFIES level_2
@c3 $p3 VALIDATES $c1 TO $c2
@c4 $p4 EXTENDS to_level_3
@chain $c3 THEN $c4
@prereq_ok $chain PROVES all_prereqs
@c5 $p6 GREATER_THAN $p5
@gpa_ok $c5 SATISFIES gpa_requirement
@combine $prereq_ok AND $gpa_ok
@eligible $combine PROVES can_enroll
@result $eligible IS_A advanced_eligibility_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Advanced eligibility: 1) Has Physics201 (level 1) 2) Has Physics301 (level 2) 3) Chain validates 4) GPA 3.8 > 3.5 5) Fully eligible."
    },

    // Q8: Cross-domain query - who can access code_repo?
    {
      id: "q8",
      TASK_NL: "Which employees can access code_repo? (Role-based search)",
      TASK_DSL: "@q8 code_repo ACCESSIBLE_BY which_employees",
      ANSWEAR_NL: "Employee_1 (via Manager→Engineer inheritance) and Employee_2 (directly as Engineer)",
      PROOF_DSL: `@p1 Engineer CAN_ACCESS code_repo
@p2 Manager INHERITS_FROM Engineer
@p3 Employee_1 HAS_ROLE Manager
@p4 Employee_2 HAS_ROLE Engineer
@p5 Employee_3 HAS_ROLE Intern
@search_e1 $p3 LEADS_TO $p2
@e1_inherit $search_e1 LEADS_TO $p1
@e1_access $e1_inherit GRANTS access
@search_e2 $p4 LEADS_TO $p1
@e2_access $search_e2 GRANTS access
@search_e3 $p5 LEADS_TO Intern_access
@e3_check Intern CAN_ACCESS code_repo
@e3_missing $e3_check NOT_FOUND
@e3_denied $e3_missing BLOCKS access
@collect $e1_access AND $e2_access
@exclude $e3_denied NOT_IN result
@final Employee_1 AND Employee_2
@result $final IS_A reverse_access_search
@proof $result PROVES $q8`,
      PROOF_NL: "Reverse access search: 1) Who accesses code_repo? 2) Engineer has direct access 3) Manager inherits from Engineer 4) Employee_1=Manager ✓ 5) Employee_2=Engineer ✓ 6) Employee_3=Intern ✗"
    }
  ]
};
