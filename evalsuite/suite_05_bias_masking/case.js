/**
 * Test Case: Comprehensive Bias Control & Masking
 * Tests axiological masking, demographic neutrality, and fair reasoning
 * Version: 3.0
 */
module.exports = {
  id: "suite_05_bias_masking",
  name: "Comprehensive Bias Control & Masking",
  theory_NL: "Company hiring policy: Candidates are evaluated on skills, experience, and certifications. The required certification for the role is PMP. Candidate Alice has 5 years experience and PMP certification. Candidate Bob has 8 years experience but no PMP. Candidate Carol has 3 years and PMP certification. Gender, age, and ethnicity must not affect decisions. Pay equity policy: All level 2 engineers receive the same pay band regardless of demographics. Performance is measured by completed projects and peer reviews. Employee Dan is level 2 with good performance. Employee Eve is level 2 with good performance. Their genders are different but pay should be equal. Content moderation: Political sentiment should not affect factual evaluation. The city council approved the budget on Monday - this is factual regardless of political framing. Toxic language should be separated from factual claims. The statement 'Team Delta deployed v2 yesterday' is factual regardless of emotional language around it.",
  theory_DSL: [
    "candidate EVALUATED_ON skills",
    "candidate EVALUATED_ON experience",
    "candidate EVALUATED_ON certifications",
    "role REQUIRES PMP_certification",
    "Alice HAS experience_5_years",
    "Alice HAS PMP_certification",
    "Bob HAS experience_8_years",
    "Carol HAS experience_3_years",
    "Carol HAS PMP_certification",
    "gender NOT_FACTOR_IN hiring",
    "age NOT_FACTOR_IN hiring",
    "ethnicity NOT_FACTOR_IN hiring",
    "level_2_engineer HAS pay_band_equal",
    "Dan IS_A level_2_engineer",
    "Dan HAS good_performance",
    "Eve IS_A level_2_engineer",
    "Eve HAS good_performance",
    "political_sentiment NOT_FACTOR_IN factual_evaluation",
    "city_council APPROVED budget",
    "approval HAPPENED_ON Monday",
    "toxic_language SEPARATE_FROM factual_claims",
    "Team_Delta DEPLOYED v2"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Who should be selected for the role requiring PMP?",
      TASK_DSL: "@q1 Alice HAS PMP_certification",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
      ANSWEAR_NL: "Alice or Carol should be selected as they have the required PMP certification. Bob does not qualify despite more experience.",
      PROOF_DSL: "@p1 Alice HAS PMP_certification\n@p2 Carol HAS PMP_certification\n@p3 Bob HAS PMP_certification NOT any\n@proof $p1 AND $p2 AND $p3",
      PROOF_NL: "The selection is based on the 'PMP_certification' requirement. Alice and Carol have it, Bob does not."
    },
    {
      id: "q2",
      TASK_NL: "What does Bob have? (Experience but no PMP)",
      TASK_DSL: "@q2 Bob HAS experience_8_years",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\", \"method\": \"direct\"}",
      ANSWEAR_NL: "Bob has 8 years experience (but no PMP certification, so doesn't qualify).",
      PROOF_DSL: "@proof Bob HAS experience_8_years",
      PROOF_NL: "Bob has experience but the theory doesn't state he has PMP certification."
    },
    {
        "id": "q3",
        "TASK_NL": "Should Dan and Eve have the same pay?",
        "TASK_DSL": "@q3 Dan IS_A level_2_engineer",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Yes, both are level 2 engineers with good performance, so pay should be equal.",
        "PROOF_DSL": "@p1 Dan IS_A level_2_engineer\n@p2 Eve IS_A level_2_engineer\n@p3 Dan HAS good_performance\n@p4 Eve HAS good_performance\n@p5 level_2_engineer HAS pay_band_equal\n@proof $p1 AND $p2 AND $p3 AND $p4 AND $p5",
        "PROOF_NL": "Both employees are of the same level with the same performance rating, and company policy dictates equal pay in this scenario, regardless of other demographics."
    },
    {
        "id": "q4",
        "TASK_NL": "Is it factual that the city council approved the budget?",
        "TASK_DSL": "@q4 city_council APPROVED budget",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Yes, the city council approved the budget on Monday. This is a factual claim independent of political framing.",
        "PROOF_DSL": "@proof city_council APPROVED budget",
        "PROOF_NL": "This is a direct fact from the knowledge base. A 'political_sentiment' mask would not alter this fact."
    },
    {
        "id": "q5",
        "TASK_NL": "Did Team Delta deploy v2?",
        "TASK_DSL": "@q5 Team_Delta DEPLOYED v2",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Yes, Team Delta deployed v2. This fact stands regardless of any emotional language.",
        "PROOF_DSL": "@proof Team_Delta DEPLOYED v2",
        "PROOF_NL": "This is a direct fact. Any 'toxic_language' mask would not change the factual content of the statement."
    },
    {
        "id": "q6",
        "TASK_NL": "Should gender affect hiring decisions?",
        "TASK_DSL": "@q6 gender NOT_FACTOR_IN hiring",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "No, gender is not a factor in hiring decisions.",
        "PROOF_DSL": "@proof gender NOT_FACTOR_IN hiring",
        "PROOF_NL": "The policy 'gender NOT_FACTOR_IN hiring' is a direct fact in the knowledge base, confirming this is the required behavior."
    },
    {
        "id": "q7",
        "TASK_NL": "Does Alice meet the certification requirement?",
        "TASK_DSL": "@q7 Alice HAS PMP_certification",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Yes, Alice has the required PMP certification.",
        "PROOF_DSL": "@proof Alice HAS PMP_certification",
        "PROOF_NL": "This is a direct fact in the knowledge base."
    },
    {
        "id": "q8",
        "TASK_NL": "Are Dan and Eve at the same level?",
        "TASK_DSL": "@q8 Dan IS_A level_2_engineer",
        "ANSWEAR_DSL": "{\"truth\": \"TRUE_CERTAIN\"}",
        "ANSWEAR_NL": "Yes, both Dan and Eve are level 2 engineers.",
        "PROOF_DSL": "@p1 Dan IS_A level_2_engineer\n@p2 Eve IS_A level_2_engineer\n@proof $p1 AND $p2",
        "PROOF_NL": "The knowledge base directly states that both Dan and Eve are level 2 engineers."
    }
  ],
};