/**
 * Test Case: Comprehensive AI Evolution - Timeline & Capability Analysis
 * Tests AI history chains, capability reasoning, and technology evolution
 * Version: 5.0 - Complex proofs with timeline analysis and capability inference
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
    "1950 BEFORE 1956", "1956 BEFORE 2012", "2012 BEFORE 2017", "2017 BEFORE 2022"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "What is the AI timeline in order?",
      TASK_DSL: "@q1 AI_timeline ORDERED",
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
@chain $o1 THEN $o2 THEN $o3 THEN $o4
@timeline 5 MILESTONES ordered
@result $timeline IS_A timeline_proof
@proof $result PROVES $q1`,
      PROOF_NL: "5 milestones ordered: 1950→1956→2012→2017→2022."
    },
    {
      id: "q2", TASK_NL: "How are neural networks related to biology?",
      TASK_DSL: "@q2 neural_networks BIOLOGICAL_BASIS explained",
      ANSWEAR_NL: "Neural networks inspired by biological brains. Uses layers like brain neurons.",
      PROOF_DSL: `@p1 neural_networks INSPIRED_BY biological_brains
@p2 deep_learning USES multiple_hidden_layers
@bio $p1 ESTABLISHES biological_analogy
@struct $p2 MIRRORS neuron_layers
@combine $bio AND $struct
@result $combine IS_A biological_basis_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Neural nets inspired by brains, use layered structure like neurons."
    },
    {
      id: "q3", TASK_NL: "What enables modern AI performance?",
      TASK_DSL: "@q3 AI_performance ENABLERS listed",
      ANSWEAR_NL: "GPUs accelerate computation + transformers use attention. Hardware + architecture.",
      PROOF_DSL: `@p1 GPUs ACCELERATE matrix_computations
@p2 transformers USE attention_mechanism
@hw $p1 IS hardware_enabler
@arch $p2 IS architecture_enabler
@both $hw AND $arch
@synergy $both ENABLES modern_performance
@result $synergy IS_A enabler_analysis_proof
@proof $result PROVES $q3`,
      PROOF_NL: "GPUs (hardware) + transformers (architecture) enable performance."
    },
    {
      id: "q4", TASK_NL: "What are all AI capabilities?",
      TASK_DSL: "@q4 AI_capabilities ENUMERATED",
      ANSWEAR_NL: "AI: assists diagnosis, translates, generates art, writes code. 4 capabilities.",
      PROOF_DSL: `@p1 AI ASSISTS medical_diagnosis
@p2 AI TRANSLATES languages
@p3 AI GENERATES art
@p4 AI WRITES code
@cap1 $p1 IS capability_1
@cap2 $p2 IS capability_2
@cap3 $p3 IS capability_3
@cap4 $p4 IS capability_4
@all $cap1 AND $cap2 AND $cap3 AND $cap4
@count $all HAS 4_capabilities
@result $count IS_A capability_enumeration_proof
@proof $result PROVES $q4`,
      PROOF_NL: "4 AI capabilities: diagnosis, translation, art, code."
    },
    {
      id: "q5", TASK_NL: "What is the gap between Dartmouth and deep learning?",
      TASK_DSL: "@q5 AI_winter GAP analyzed",
      ANSWEAR_NL: "Dartmouth 1956 → Deep learning 2012. 56-year gap (AI winters).",
      PROOF_DSL: `@p1 artificial_intelligence COINED_IN 1956
@p2 deep_learning_breakthrough HAPPENED_IN 2012
@gap 2012 MINUS 1956
@years $gap EQUALS 56
@period $years IS long_gap
@explanation AI_winters CAUSED stagnation
@result $period IS_A gap_analysis_proof
@proof $result PROVES $q5`,
      PROOF_NL: "1956 to 2012 = 56 years. Long gap due to AI winters."
    },
    {
      id: "q6", TASK_NL: "How fast did AI advance after 2012?",
      TASK_DSL: "@q6 recent_AI_acceleration ANALYZED",
      ANSWEAR_NL: "2012→2017→2022: Deep learning, transformers, ChatGPT in 10 years. Rapid acceleration.",
      PROOF_DSL: `@p1 deep_learning_breakthrough HAPPENED_IN 2012
@p2 transformers INTRODUCED_IN 2017
@p3 ChatGPT LAUNCHED_IN 2022
@span 2022 MINUS 2012 EQUALS 10
@milestones 3 IN 10_years
@rate $milestones IS rapid
@compare 56_years VS 10_years
@acceleration $compare SHOWS speedup
@result $acceleration IS_A acceleration_proof
@proof $result PROVES $q6`,
      PROOF_NL: "3 major breakthroughs in 10 years vs 56-year gap before. Massive acceleration."
    },
    {
      id: "q7", TASK_NL: "What are current AI concerns?",
      TASK_DSL: "@q7 AI_concerns IDENTIFIED",
      ANSWEAR_NL: "AGI is long-term goal, safety research growing. Balancing capability and safety.",
      PROOF_DSL: `@p1 AGI IS_A long_term_goal
@p2 AI_safety_research GROWING rapidly
@goal $p1 IS future_capability
@concern $p2 IS safety_focus
@balance $goal AND $concern
@tension capability VS safety
@result $balance IS_A concern_analysis_proof
@proof $result PROVES $q7`,
      PROOF_NL: "AGI goal + safety research = capability vs safety tension."
    },
    {
      id: "q8", TASK_NL: "Trace: Turing to ChatGPT (full evolution)",
      TASK_DSL: "@q8 AI_evolution FULL_TRACE",
      ANSWEAR_NL: "Turing test → AI coined → deep learning → transformers → ChatGPT. 72-year evolution.",
      PROOF_DSL: `@p1 Turing_test PROPOSED_IN 1950
@p2 artificial_intelligence COINED_IN 1956
@p3 deep_learning_breakthrough HAPPENED_IN 2012
@p4 transformers INTRODUCED_IN 2017
@p5 ChatGPT LAUNCHED_IN 2022
@total 2022 MINUS 1950 EQUALS 72
@chain $p1 THEN $p2 THEN $p3 THEN $p4 THEN $p5
@evolution 5 STAGES over 72_years
@result $evolution IS_A evolution_trace_proof
@proof $result PROVES $q8`,
      PROOF_NL: "72-year evolution: Turing(1950)→Dartmouth(1956)→DL(2012)→Transformers(2017)→ChatGPT(2022)."
    }
  ]
};
