/**
 * Test Case: Comprehensive Polarity Decision & Regulatory Conflict Resolution
 * Tests regulatory status reasoning, jurisdiction conflicts, and approval chains
 * Version: 5.0 - Complex proofs with conflict detection and harmonization analysis
 */
module.exports = {
  id: "suite_18_polarity_decision",
  name: "Comprehensive Polarity Decision & Regulatory Conflict Resolution",

  theory_NL: "Regulatory system with jurisdiction-based approvals. DrugA prohibited in EU but permitted in US - conflict. DrugB permitted globally. DrugC prohibited globally. Conflict resolution: stricter rule prevails. Import requires both source AND destination approval.",

  theory_DSL: [
    "drugA PROHIBITED_IN eu", "drugA PERMITTED_IN us",
    "drugB PERMITTED_IN eu", "drugB PERMITTED_IN us", "drugB PERMITTED_IN asia",
    "drugC PROHIBITED_IN eu", "drugC PROHIBITED_IN us", "drugC PROHIBITED_IN asia",
    "productX PERMITTED_IN us", "productX PROHIBITED_IN asia", "productX UNDER_REVIEW_IN eu",
    "FDA REGULATES us", "EMA REGULATES eu", "WHO ADVISES globally",
    "conflicting_status REQUIRES stricter_rule", "stricter_rule IS prohibition",
    "PROHIBITED STRICTER_THAN PERMITTED",
    "import REQUIRES source_permitted", "import REQUIRES destination_permitted",
    "drugA HAS_STATUS conflicting", "drugB HAS_STATUS harmonized", "drugC HAS_STATUS universal_ban",
    "drugA APPROVED_BY FDA", "drugA REJECTED_BY EMA", "drugB APPROVED_BY WHO", "drugC REJECTED_BY WHO"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "What is DrugA's regulatory conflict?",
      TASK_DSL: "@q1 drugA CONFLICT detected",
      ANSWEAR_NL: "DrugA: prohibited EU, permitted US. Conflicting status.",
      PROOF_DSL: `@p1 drugA PROHIBITED_IN eu
@p2 drugA PERMITTED_IN us
@p3 drugA HAS_STATUS conflicting
@c1 $p1 DIFFERS $p2
@conflict PROHIBITED NOT_EQUALS PERMITTED
@verify $conflict MATCHES $p3
@result $conflict IS_A conflict_detection_proof
@proof $result PROVES $q1`,
      PROOF_NL: "EU prohibits, US permits → conflict detected."
    },
    {
      id: "q2", TASK_NL: "Prove DrugB is globally harmonized",
      TASK_DSL: "@q2 drugB HARMONIZED verified",
      ANSWEAR_NL: "DrugB permitted in EU, US, Asia. WHO approved. Harmonized.",
      PROOF_DSL: `@p1 drugB PERMITTED_IN eu
@p2 drugB PERMITTED_IN us
@p3 drugB PERMITTED_IN asia
@p4 drugB APPROVED_BY WHO
@all_same $p1 AND $p2 AND $p3
@harmony $all_same PROVES no_conflict
@global $p4 CONFIRMS who_endorsement
@result $harmony IS_A harmonization_proof
@proof $result PROVES $q2`,
      PROOF_NL: "All regions permit + WHO approved = harmonized."
    },
    {
      id: "q3", TASK_NL: "Why is DrugC banned everywhere?",
      TASK_DSL: "@q3 drugC UNIVERSAL_BAN explained",
      ANSWEAR_NL: "DrugC prohibited EU, US, Asia. WHO rejected. Universal ban.",
      PROOF_DSL: `@p1 drugC PROHIBITED_IN eu
@p2 drugC PROHIBITED_IN us
@p3 drugC PROHIBITED_IN asia
@p4 drugC REJECTED_BY WHO
@all_banned $p1 AND $p2 AND $p3
@who_cause $p4 EXPLAINS safety_concerns
@cascade $who_cause LEADS_TO $all_banned
@result $cascade IS_A universal_prohibition_proof
@proof $result PROVES $q3`,
      PROOF_NL: "WHO rejected → all regulators banned."
    },
    {
      id: "q4", TASK_NL: "Can DrugA be imported US→EU?",
      TASK_DSL: "@q4 drugA IMPORT_US_EU blocked",
      ANSWEAR_NL: "No. US permits but EU prohibits. Import requires both.",
      PROOF_DSL: `@p1 import REQUIRES source_permitted
@p2 import REQUIRES destination_permitted
@p3 drugA PERMITTED_IN us
@p4 drugA PROHIBITED_IN eu
@source_ok $p3 SATISFIES $p1
@dest_fail $p4 VIOLATES $p2
@both $p1 AND $p2
@eval TRUE AND FALSE
@blocked $eval EQUALS FALSE
@result $blocked IS_A import_analysis_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Source OK but destination blocks → import illegal."
    },
    {
      id: "q5", TASK_NL: "Which rule applies in conflict?",
      TASK_DSL: "@q5 stricter_rule APPLIES",
      ANSWEAR_NL: "Prohibition prevails. PROHIBITED > PERMITTED.",
      PROOF_DSL: `@p1 conflicting_status REQUIRES stricter_rule
@p2 stricter_rule IS prohibition
@p3 PROHIBITED STRICTER_THAN PERMITTED
@conflict drugA HAS conflicting_status
@apply $conflict TRIGGERS $p1
@select $p1 CHOOSES $p2
@verify $p3 CONFIRMS hierarchy
@result $select IS_A conflict_resolution_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Conflict → stricter rule → prohibition wins."
    },
    {
      id: "q6", TASK_NL: "What is ProductX's fragmented status?",
      TASK_DSL: "@q6 productX FRAGMENTATION analyzed",
      ANSWEAR_NL: "US=permitted, Asia=prohibited, EU=under review. Three different statuses.",
      PROOF_DSL: `@p1 productX PERMITTED_IN us
@p2 productX PROHIBITED_IN asia
@p3 productX UNDER_REVIEW_IN eu
@s1 $p1 IS final_positive
@s2 $p2 IS final_negative
@s3 $p3 IS pending
@count 3 DIFFERENT_STATUSES
@fragment $count PROVES regulatory_divergence
@result $fragment IS_A status_analysis_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Three regions, three different statuses = fragmentation."
    },
    {
      id: "q7", TASK_NL: "How did FDA and EMA decide differently on DrugA?",
      TASK_DSL: "@q7 drugA REGULATORY_SPLIT explained",
      ANSWEAR_NL: "FDA approved (US permits), EMA rejected (EU prohibits). Independent decisions.",
      PROOF_DSL: `@p1 drugA APPROVED_BY FDA
@p2 drugA REJECTED_BY EMA
@p3 FDA REGULATES us
@p4 EMA REGULATES eu
@fda_decision $p1 LEADS_TO drugA PERMITTED_IN us
@ema_decision $p2 LEADS_TO drugA PROHIBITED_IN eu
@independent $fda_decision DIFFERS $ema_decision
@result $independent IS_A regulatory_split_proof
@proof $result PROVES $q7`,
      PROOF_NL: "FDA approved, EMA rejected → independent regional decisions."
    },
    {
      id: "q8", TASK_NL: "What role does WHO play?",
      TASK_DSL: "@q8 WHO ROLE advisory",
      ANSWEAR_NL: "WHO advises globally. WHO approval (DrugB) correlates with global permit. WHO rejection (DrugC) correlates with global ban.",
      PROOF_DSL: `@p1 WHO ADVISES globally
@p2 drugB APPROVED_BY WHO
@p3 drugB PERMITTED_IN eu
@p4 drugC REJECTED_BY WHO
@p5 drugC PROHIBITED_IN eu
@positive $p2 CORRELATES $p3
@negative $p4 CORRELATES $p5
@influence $positive AND $negative
@advisory $p1 EXPLAINS $influence
@result $advisory IS_A who_role_proof
@proof $result PROVES $q8`,
      PROOF_NL: "WHO advises → regions often follow. Approval correlates with permit, rejection with ban."
    }
  ]
};
