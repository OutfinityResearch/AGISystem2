/**
 * Test Case: Comprehensive AI Evolution - Timeline & Capability Analysis
 * Tests AI history chains, capability reasoning, and technology evolution
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_24_expand_essay",
  name: "Comprehensive AI Evolution - Timeline & Capability Analysis",

  theory_NL: "AI timeline: Turing test (1950) → Dartmouth (1956) → deep learning (2012) → transformers (2017) → ChatGPT (2022). Technical: neural nets inspired by brains, deep learning uses layers, GPUs accelerate computation. Capabilities: AI assists diagnosis, translates, generates art, writes code. Goals: AGI is long-term, safety research growing.",

  theory_DSL: [
    "Turing_test PROPOSED_IN 1950", "artificial_intelligence COINED_AT Dartmouth",
    "artificial_intelligence COINED_IN 1956", "deep_learning_breakthrough HAPPENED_IN 2012",
    "transformers INTRODUCED_IN 2017", "ChatGPT LAUNCHED_IN 2022",
    "neural_networks INSPIRED_BY biological_brains", "deep_learning USES multiple_hidden_layers",
    "GPUs ACCELERATE matrix_computations", "transformers USE attention_mechanism",
    "AI ASSISTS medical_diagnosis", "AI TRANSLATES languages", "AI GENERATES art", "AI WRITES code",
    "AGI IS_A long_term_goal", "AI_safety_research GROWING rapidly",
    "1950 BEFORE 1956", "1956 BEFORE 2012", "2012 BEFORE 2017", "2017 BEFORE 2022",
    "timeline_gap EQUALS 56_years", "recent_span EQUALS 10_years", "total_evolution EQUALS 72_years"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "What is the AI timeline in order?",
      TASK_DSL: "@q1 AI_timeline HAS 5_milestones",
      ANSWEAR_NL: "1950 (Turing) → 1956 (Dartmouth) → 2012 (deep learning) → 2017 (transformers) → 2022 (ChatGPT)",
      PROOF_DSL: `@p1 Turing_test PROPOSED_IN 1950
@p2 artificial_intelligence COINED_IN 1956
@p3 deep_learning_breakthrough HAPPENED_IN 2012
@p4 transformers INTRODUCED_IN 2017
@p5 ChatGPT LAUNCHED_IN 2022
@o1 1950 BEFORE 1956
@o2 1956 BEFORE 2012
@o3 2012 BEFORE 2017
@o4 2017 BEFORE 2022
@c1 $o1 LEADS_TO $o2
@c2 $c1 LEADS_TO $o3
@c3 $c2 LEADS_TO $o4
@c4 $c3 ORDERS timeline
@c5 $c4 HAS 5_milestones
@result $c5 IS_A timeline_proof
@proof $result PROVES $q1`,
      PROOF_NL: "5 milestones ordered: 1950→1956→2012→2017→2022."
    },
    {
      id: "q2", TASK_NL: "How are neural networks related to biology?",
      TASK_DSL: "@q2 neural_networks INSPIRED_BY biological_brains",
      ANSWEAR_NL: "Neural networks inspired by biological brains. Uses layers like brain neurons.",
      PROOF_DSL: `@p1 neural_networks INSPIRED_BY biological_brains
@p2 deep_learning USES multiple_hidden_layers
@c1 $p1 ESTABLISHES biological_analogy
@c2 $p2 MIRRORS neuron_layers
@c3 $c1 COMBINES $c2
@c4 $c3 EXPLAINS design_basis
@result $c4 IS_A biological_basis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Neural nets inspired by brains, use layered structure like neurons."
    },
    {
      id: "q3", TASK_NL: "What enables modern AI performance?",
      TASK_DSL: "@q3 GPUs ACCELERATE matrix_computations",
      ANSWEAR_NL: "GPUs accelerate computation + transformers use attention. Hardware + architecture.",
      PROOF_DSL: `@p1 GPUs ACCELERATE matrix_computations
@p2 transformers USE attention_mechanism
@c1 $p1 IS hardware_enabler
@c2 $p2 IS architecture_enabler
@c3 $c1 COMBINES $c2
@c4 $c3 ENABLES modern_performance
@result $c4 IS_A enabler_analysis_proof
@proof $result PROVES $q3`,
      PROOF_NL: "GPUs (hardware) + transformers (architecture) enable performance."
    },
    {
      id: "q4", TASK_NL: "What are all AI capabilities?",
      TASK_DSL: "@q4 AI HAS 4_capabilities",
      ANSWEAR_NL: "AI: assists diagnosis, translates, generates art, writes code. 4 capabilities.",
      PROOF_DSL: `@p1 AI ASSISTS medical_diagnosis
@p2 AI TRANSLATES languages
@p3 AI GENERATES art
@p4 AI WRITES code
@c1 $p1 IS capability_1
@c2 $p2 IS capability_2
@c3 $p3 IS capability_3
@c4 $p4 IS capability_4
@c5 $c1 COMBINES $c2
@c6 $c5 COMBINES $c3
@c7 $c6 COMBINES $c4
@c8 $c7 TOTALS 4_capabilities
@result $c8 IS_A capability_enumeration_proof
@proof $result PROVES $q4`,
      PROOF_NL: "4 AI capabilities: diagnosis, translation, art, code."
    },
    {
      id: "q5", TASK_NL: "What is the gap between Dartmouth and deep learning?",
      TASK_DSL: "@q5 timeline_gap EQUALS 56_years",
      ANSWEAR_NL: "Dartmouth 1956 → Deep learning 2012. 56-year gap (AI winters).",
      PROOF_DSL: `@p1 artificial_intelligence COINED_IN 1956
@p2 deep_learning_breakthrough HAPPENED_IN 2012
@p3 timeline_gap EQUALS 56_years
@c1 $p1 ESTABLISHES start_point
@c2 $p2 ESTABLISHES end_point
@c3 $c1 LEADS_TO $c2
@c4 2012 MINUS 1956
@c5 $c4 EQUALS 56_years
@c6 $c5 MATCHES $p3
@c7 AI_winters CAUSED stagnation
@c8 $c7 EXPLAINS $c6
@result $c8 IS_A gap_analysis_proof
@proof $result PROVES $q5`,
      PROOF_NL: "1956 to 2012 = 56 years. Long gap due to AI winters."
    },
    {
      id: "q6", TASK_NL: "How fast did AI advance after 2012?",
      TASK_DSL: "@q6 recent_span EQUALS 10_years",
      ANSWEAR_NL: "2012→2017→2022: Deep learning, transformers, ChatGPT in 10 years. Rapid acceleration.",
      PROOF_DSL: `@p1 deep_learning_breakthrough HAPPENED_IN 2012
@p2 transformers INTRODUCED_IN 2017
@p3 ChatGPT LAUNCHED_IN 2022
@p4 recent_span EQUALS 10_years
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 SPANS 10_years
@c4 $c3 HAS 3_milestones
@c5 $c4 MATCHES $p4
@c6 timeline_gap CONTRASTS $c5
@c7 $c6 SHOWS acceleration
@result $c7 IS_A acceleration_proof
@proof $result PROVES $q6`,
      PROOF_NL: "3 major breakthroughs in 10 years vs 56-year gap before. Massive acceleration."
    },
    {
      id: "q7", TASK_NL: "What are current AI concerns?",
      TASK_DSL: "@q7 AI_safety_research GROWING rapidly",
      ANSWEAR_NL: "AGI is long-term goal, safety research growing. Balancing capability and safety.",
      PROOF_DSL: `@p1 AGI IS_A long_term_goal
@p2 AI_safety_research GROWING rapidly
@c1 $p1 IS future_capability
@c2 $p2 IS safety_focus
@c3 $c1 CONTRASTS $c2
@c4 $c3 CREATES tension
@c5 capability VERSUS safety
@c6 $c5 REQUIRES balance
@result $c6 IS_A concern_analysis_proof
@proof $result PROVES $q7`,
      PROOF_NL: "AGI goal + safety research = capability vs safety tension."
    },
    {
      id: "q8", TASK_NL: "Trace: Turing to ChatGPT (full evolution)",
      TASK_DSL: "@q8 total_evolution EQUALS 72_years",
      ANSWEAR_NL: "Turing test → AI coined → deep learning → transformers → ChatGPT. 72-year evolution.",
      PROOF_DSL: `@p1 Turing_test PROPOSED_IN 1950
@p2 artificial_intelligence COINED_IN 1956
@p3 deep_learning_breakthrough HAPPENED_IN 2012
@p4 transformers INTRODUCED_IN 2017
@p5 ChatGPT LAUNCHED_IN 2022
@p6 total_evolution EQUALS 72_years
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@c5 $c4 SPANS 72_years
@c6 $c5 HAS 5_stages
@c7 $c6 MATCHES $p6
@result $c7 IS_A evolution_trace_proof
@proof $result PROVES $q8`,
      PROOF_NL: "72-year evolution: Turing(1950)→Dartmouth(1956)→DL(2012)→Transformers(2017)→ChatGPT(2022)."
    }
  ]
};
