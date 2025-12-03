/**
 * Test Case: Comprehensive Bias Control & Masking
 * Tests fair candidate selection with constraint satisfaction, multi-criteria search, and bias elimination
 * Version: 5.0 - Complex proofs with search-based selection, constraint checking, and comparative reasoning
 */
module.exports = {
  id: "suite_05_bias_masking",
  name: "Comprehensive Bias Control & Masking",

  theory_NL: "Company hiring policy with complex requirements: Candidates are evaluated on skills, experience, and certifications. Senior roles require PMP certification AND 5+ years experience. Junior roles require either certification OR 3+ years. Candidate Alice has 5 years experience and PMP and Python skills. Candidate Bob has 8 years experience, no PMP, but has Java and leadership skills. Candidate Carol has 3 years, PMP, and Python skills. Candidate Dave has 2 years, no certification, but exceptional skills. Gender, age, and ethnicity must NEVER affect decisions - these are masked attributes. Pay equity: Level determines pay band. Performance modifies within band. Dan is level 2 with excellent performance. Eve is level 2 with good performance. Frank is level 3 with good performance. Content evaluation: Factual claims must be evaluated independently of political framing and emotional language. Source credibility affects weight but not truth.",

  theory_DSL: [
    // Candidate evaluation criteria
    "candidate EVALUATED_ON skills",
    "candidate EVALUATED_ON experience",
    "candidate EVALUATED_ON certifications",
    // Role requirements (complex)
    "senior_role REQUIRES PMP_certification",
    "senior_role REQUIRES experience_5plus",
    "junior_role REQUIRES certification_OR_experience",
    // Candidate attributes
    "Alice HAS experience_5_years",
    "Alice HAS PMP_certification",
    "Alice HAS skill_Python",
    "experience_5_years SATISFIES experience_5plus",
    "Bob HAS experience_8_years",
    "Bob HAS skill_Java",
    "Bob HAS skill_leadership",
    "experience_8_years SATISFIES experience_5plus",
    "Carol HAS experience_3_years",
    "Carol HAS PMP_certification",
    "Carol HAS skill_Python",
    "experience_3_years SATISFIES experience_3plus",
    "Dave HAS experience_2_years",
    "Dave HAS skill_exceptional",
    // Masked attributes (bias control)
    "gender MASKED_IN evaluation",
    "age MASKED_IN evaluation",
    "ethnicity MASKED_IN evaluation",
    "masked_attribute EXCLUDED_FROM decision",
    // Pay structure
    "level_2 HAS pay_band_B",
    "level_3 HAS pay_band_C",
    "excellent_performance ADDS bonus_tier_1",
    "good_performance ADDS bonus_tier_2",
    "Dan IS_A level_2_employee",
    "Dan HAS excellent_performance",
    "Eve IS_A level_2_employee",
    "Eve HAS good_performance",
    "Frank IS_A level_3_employee",
    "Frank HAS good_performance",
    "level_2_employee EARNS pay_band_B",
    "level_3_employee EARNS pay_band_C",
    // Content evaluation
    "factual_claim INDEPENDENT_OF political_framing",
    "factual_claim INDEPENDENT_OF emotional_language",
    "city_council APPROVED budget",
    "approval IS_A factual_claim",
    "Team_Delta DEPLOYED v2",
    "deployment IS_A factual_claim"
  ],

  tasks: [
    // Q1: Search for senior role candidates (constraint satisfaction)
    {
      id: "q1",
      TASK_NL: "Find all candidates who qualify for senior role (need PMP AND 5+ years)",
      TASK_DSL: "@q1 candidate_search FINDS senior_qualified",
      ANSWEAR_NL: "Only Alice qualifies: has PMP AND 5+ years. Bob has experience but no PMP. Carol has PMP but only 3 years.",
      PROOF_DSL: `@p1 senior_role REQUIRES PMP_certification
@p2 senior_role REQUIRES experience_5plus
@p3 Alice HAS PMP_certification
@p4 Alice HAS experience_5_years
@p5 experience_5_years SATISFIES experience_5plus
@p6 Bob HAS experience_8_years
@p7 experience_8_years SATISFIES experience_5plus
@p8 Carol HAS PMP_certification
@p9 Carol HAS experience_3_years
@c1 $p3 SATISFIES $p1
@c2 $p4 LEADS_TO $p5
@c3 $c2 SATISFIES $p2
@c4 $c1 AND $c3
@alice_check $c4 VALIDATES Alice_qualified
@c5 $p7 SATISFIES $p2
@bob_check $p6 FAILS $p1
@carol_check $p8 SATISFIES $p1
@carol_exp $p9 FAILS $p2
@search $alice_check FINDS qualified_candidate
@eliminate $bob_check EXCLUDES Bob
@eliminate2 $carol_exp EXCLUDES Carol
@result $search IS_A constraint_satisfaction_search
@proof $result PROVES $q1`,
      PROOF_NL: "Constraint satisfaction search: Check each candidate against both requirements (PMP AND 5+ years). Only Alice satisfies both constraints."
    },

    // Q2: Verify bias masking prevents gender consideration
    {
      id: "q2",
      TASK_NL: "Prove that gender cannot affect hiring decision (bias masking)",
      TASK_DSL: "@q2 gender EXCLUDED_FROM hiring_decision",
      ANSWEAR_NL: "Gender is masked in evaluation, masked attributes are excluded from decisions.",
      PROOF_DSL: `@p1 gender MASKED_IN evaluation
@p2 masked_attribute EXCLUDED_FROM decision
@p3 candidate EVALUATED_ON skills
@p4 candidate EVALUATED_ON experience
@p5 candidate EVALUATED_ON certifications
@c1 $p1 CLASSIFIES gender_as_masked
@c2 $c1 TRIGGERS $p2
@c3 $p3 DEFINES valid_criterion
@c4 $p4 DEFINES valid_criterion
@c5 $p5 DEFINES valid_criterion
@valid_only $c3 AND $c4
@valid_all $valid_only AND $c5
@exclude $c2 REMOVES gender_from_criteria
@result $exclude IS_A bias_elimination_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Bias elimination: Gender is masked → masked attributes excluded → only skills/experience/certifications are valid criteria."
    },

    // Q3: Compare Dan and Eve pay (same level, different performance)
    {
      id: "q3",
      TASK_NL: "Compare pay for Dan (level 2, excellent) vs Eve (level 2, good)",
      TASK_DSL: "@q3 Dan_Eve PAY_COMPARISON different_bonus",
      ANSWEAR_NL: "Same base pay (level 2 = band B), but Dan gets bonus_tier_1 (excellent) vs Eve bonus_tier_2 (good).",
      PROOF_DSL: `@p1 Dan IS_A level_2_employee
@p2 Eve IS_A level_2_employee
@p3 level_2_employee EARNS pay_band_B
@p4 Dan HAS excellent_performance
@p5 Eve HAS good_performance
@p6 excellent_performance ADDS bonus_tier_1
@p7 good_performance ADDS bonus_tier_2
@c1 $p1 LEADS_TO $p3
@c2 $p2 LEADS_TO $p3
@base_equal $c1 EQUALS $c2
@c3 $p4 LEADS_TO $p6
@c4 $p5 LEADS_TO $p7
@bonus_diff $c3 DIFFERS $c4
@combine $base_equal AND $bonus_diff
@result $combine IS_A comparative_pay_analysis
@proof $result PROVES $q3`,
      PROOF_NL: "Comparative analysis: Both at level 2 (same base), but performance modifier differs - Dan gets tier 1, Eve gets tier 2."
    },

    // Q4: Search for junior role candidates (OR constraint)
    {
      id: "q4",
      TASK_NL: "Find candidates who qualify for junior role (certification OR 3+ years)",
      TASK_DSL: "@q4 junior_search FINDS all_junior_qualified",
      ANSWEAR_NL: "Alice (has PMP), Bob (has 8 years), Carol (has both) all qualify. Dave doesn't (2 years, no cert).",
      PROOF_DSL: `@p1 junior_role REQUIRES certification_OR_experience
@p2 Alice HAS PMP_certification
@p3 Bob HAS experience_8_years
@p4 Carol HAS PMP_certification
@p5 Carol HAS experience_3_years
@p6 Dave HAS experience_2_years
@c1 $p2 SATISFIES certification_requirement
@c2 $p3 SATISFIES experience_requirement
@c3 $p4 SATISFIES certification_requirement
@c4 $p5 SATISFIES experience_requirement
@c5 $p6 FAILS experience_3plus
@alice_ok $c1 QUALIFIES Alice
@bob_ok $c2 QUALIFIES Bob
@carol_ok $c3 OR $c4
@dave_fail $c5 DISQUALIFIES Dave
@search $alice_ok COLLECTS qualified
@search2 $bob_ok COLLECTS qualified
@search3 $carol_ok COLLECTS qualified
@result $search3 IS_A or_constraint_search
@proof $result PROVES $q4`,
      PROOF_NL: "OR constraint search: Any candidate with certification OR 3+ years qualifies. Alice/Bob/Carol pass, Dave fails both."
    },

    // Q5: Factual claim independence from political framing
    {
      id: "q5",
      TASK_NL: "Is 'city council approved budget' factual regardless of political framing?",
      TASK_DSL: "@q5 budget_approval IS_FACTUAL independent",
      ANSWEAR_NL: "Yes - factual claims are independent of political framing by policy.",
      PROOF_DSL: `@p1 city_council APPROVED budget
@p2 approval IS_A factual_claim
@p3 factual_claim INDEPENDENT_OF political_framing
@p4 factual_claim INDEPENDENT_OF emotional_language
@c1 $p1 ESTABLISHES fact
@c2 $p2 CLASSIFIES $c1
@c3 $c2 LEADS_TO $p3
@c4 $c2 LEADS_TO $p4
@independence $c3 AND $c4
@result $independence IS_A factual_independence_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Factual independence: The approval is a factual claim, and factual claims are independent of both political framing and emotional language."
    },

    // Q6: Rank candidates by experience (search with ordering)
    {
      id: "q6",
      TASK_NL: "Rank candidates by experience (most to least)",
      TASK_DSL: "@q6 experience_ranking ORDERS candidates",
      ANSWEAR_NL: "Bob (8y) > Alice (5y) > Carol (3y) > Dave (2y)",
      PROOF_DSL: `@p1 Bob HAS experience_8_years
@p2 Alice HAS experience_5_years
@p3 Carol HAS experience_3_years
@p4 Dave HAS experience_2_years
@c1 experience_8_years GREATER_THAN experience_5_years
@c2 experience_5_years GREATER_THAN experience_3_years
@c3 experience_3_years GREATER_THAN experience_2_years
@rank1 $p1 RANKS first
@rank2 $c1 LEADS_TO $p2
@rank3 $c2 LEADS_TO $p3
@rank4 $c3 LEADS_TO $p4
@order $rank1 THEN $rank2
@order2 $order THEN $rank3
@order3 $order2 THEN $rank4
@result $order3 IS_A ordered_search_result
@proof $result PROVES $q6`,
      PROOF_NL: "Ordered search: Compare experience values and rank. Bob(8) > Alice(5) > Carol(3) > Dave(2)."
    },

    // Q7: Cross-level pay comparison
    {
      id: "q7",
      TASK_NL: "Compare Eve (level 2) vs Frank (level 3) - who earns more base?",
      TASK_DSL: "@q7 Eve_Frank PAY_COMPARISON level_difference",
      ANSWEAR_NL: "Frank earns more - level 3 (band C) > level 2 (band B), despite same performance rating.",
      PROOF_DSL: `@p1 Eve IS_A level_2_employee
@p2 Frank IS_A level_3_employee
@p3 level_2_employee EARNS pay_band_B
@p4 level_3_employee EARNS pay_band_C
@p5 Eve HAS good_performance
@p6 Frank HAS good_performance
@p7 pay_band_C GREATER_THAN pay_band_B
@c1 $p1 LEADS_TO $p3
@c2 $p2 LEADS_TO $p4
@c3 $p5 EQUALS $p6
@c4 $c1 DETERMINES eve_pay
@c5 $c2 DETERMINES frank_pay
@compare $p7 APPLIES $c4
@compare2 $compare APPLIES $c5
@result $compare2 IS_A cross_level_comparison
@proof $result PROVES $q7`,
      PROOF_NL: "Cross-level comparison: Both have good performance (equal), but Frank's level 3 (band C) > Eve's level 2 (band B)."
    },

    // Q8: Find best candidate overall (multi-criteria search)
    {
      id: "q8",
      TASK_NL: "Find best overall candidate for senior role (PMP + experience + skills)",
      TASK_DSL: "@q8 best_candidate SEARCH multi_criteria",
      ANSWEAR_NL: "Alice is best: meets all senior requirements (PMP + 5y) and has Python skills.",
      PROOF_DSL: `@p1 Alice HAS PMP_certification
@p2 Alice HAS experience_5_years
@p3 Alice HAS skill_Python
@p4 experience_5_years SATISFIES experience_5plus
@p5 senior_role REQUIRES PMP_certification
@p6 senior_role REQUIRES experience_5plus
@p7 Bob HAS experience_8_years
@p8 Carol HAS experience_3_years
@c1 $p1 SATISFIES $p5
@c2 $p2 LEADS_TO $p4
@c3 $c2 SATISFIES $p6
@c4 $p3 ADDS skill_value
@alice_score $c1 AND $c3
@alice_full $alice_score AND $c4
@bob_fail Bob LACKS PMP_certification
@carol_fail $p8 FAILS experience_5plus
@compare $alice_full BEATS $bob_fail
@compare2 $alice_full BEATS $carol_fail
@result $compare2 IS_A multi_criteria_search_winner
@proof $result PROVES $q8`,
      PROOF_NL: "Multi-criteria search: Alice meets both requirements AND has skills. Bob fails PMP, Carol fails experience - Alice wins."
    }
  ]
};
