/**
 * Test Case: Essay Composition - The Evolution and Impact of Artificial Intelligence
 * Tests structured essay composition using DSL to gather and validate facts. Each section requires multi-statement proof chains that demonstrate the reasoning. Explanations are DSL scripts that can be validated without LLM.
 * Version: 3.0
 */

module.exports = {
  id: "suite_24_expand_essay",
  name: "Essay Composition - The Evolution and Impact of Artificial Intelligence",
  description: "Tests structured essay composition using DSL to gather and validate facts. Each section requires multi-statement proof chains that demonstrate the reasoning. Explanations are DSL scripts that can be validated without LLM.",
  theory: {
    natural_language: "HISTORICAL FOUNDATIONS: Alan Turing proposed the Turing test in 1950. The term artificial intelligence was coined at Dartmouth in 1956. The first expert systems emerged in the 1970s. The AI winter occurred in the 1980s due to funding cuts. Machine learning revival began in the 1990s. Deep learning breakthrough happened in 2012 with ImageNet. Transformers architecture was introduced in 2017. ChatGPT launched in November 2022. TECHNICAL CONCEPTS: Neural networks are inspired by biological brains. Deep learning uses multiple hidden layers. Backpropagation enables network training. GPUs accelerate matrix computations. Attention mechanism enables transformers. Large language models learn from text corpora. Reinforcement learning uses reward signals. Computer vision processes visual data. CURRENT APPLICATIONS: AI powers recommendation systems. AI enables autonomous navigation. AI assists medical diagnosis. AI detects fraud. AI translates languages. AI generates art. AI writes code. AI moderates content. SOCIETAL IMPLICATIONS: AI automation may displace jobs. AI bias can perpetuate discrimination. AI surveillance raises privacy concerns. AI decisions lack transparency. AI weapons pose ethical dilemmas. AI can spread misinformation. AI requires energy resources. AI benefits are not equally distributed. FUTURE DIRECTIONS: AGI remains a long-term research goal. AI safety research is growing rapidly. AI regulation is being developed globally. AI augmentation may enhance human capabilities. AI in education could personalize learning. AI in healthcare could revolutionize treatment. Quantum computing may accelerate AI. Neuromorphic chips may improve efficiency.",
    expected_facts: [
          "Turing_test PROPOSED_BY Alan_Turing",
          "Turing_test PROPOSED_IN 1950",
          "artificial_intelligence COINED_AT Dartmouth",
          "artificial_intelligence COINED_IN 1956",
          "expert_systems EMERGED_IN 1970s",
          "AI_winter OCCURRED_IN 1980s",
          "AI_winter CAUSED_BY funding_cuts",
          "machine_learning REVIVED_IN 1990s",
          "deep_learning_breakthrough HAPPENED_IN 2012",
          "transformers INTRODUCED_IN 2017",
          "ChatGPT LAUNCHED_IN 2022",
          "neural_networks INSPIRED_BY biological_brains",
          "deep_learning USES multiple_hidden_layers",
          "backpropagation ENABLES network_training",
          "GPUs ACCELERATE matrix_computations",
          "attention_mechanism ENABLES transformers",
          "large_language_models LEARN_FROM text_corpora",
          "reinforcement_learning USES reward_signals",
          "computer_vision PROCESSES visual_data",
          "AI POWERS recommendation_systems",
          "AI ENABLES autonomous_navigation",
          "AI ASSISTS medical_diagnosis",
          "AI DETECTS fraud",
          "AI TRANSLATES languages",
          "AI GENERATES art",
          "AI WRITES code",
          "AI MODERATES content",
          "AI_automation MAY_DISPLACE jobs",
          "AI_bias CAN_PERPETUATE discrimination",
          "AI_surveillance RAISES privacy_concerns",
          "AI_decisions LACK transparency",
          "AI_weapons POSE ethical_dilemmas",
          "AI CAN_SPREAD misinformation",
          "AI REQUIRES energy_resources",
          "AI_benefits NOT_EQUALLY distributed",
          "AGI IS_A long_term_goal",
          "AI_safety_research GROWING rapidly",
          "AI_regulation BEING_DEVELOPED globally",
          "AI_augmentation MAY_ENHANCE human_capabilities",
          "AI_education COULD_PERSONALIZE learning",
          "AI_healthcare COULD_REVOLUTIONIZE treatment",
          "quantum_computing MAY_ACCELERATE AI",
          "neuromorphic_chips MAY_IMPROVE efficiency"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "INTRODUCTION - Historical Timeline: What are the key milestones in AI history?",
      expected_dsl: `
        @milestone1 Turing_test PROPOSED_IN 1950
        @milestone2 artificial_intelligence COINED_IN 1956
        @milestone3 deep_learning_breakthrough HAPPENED_IN 2012
        @milestone4 transformers INTRODUCED_IN 2017
        @milestone5 ChatGPT LAUNCHED_IN 2022
        @early $milestone1 AND $milestone2
        @modern $milestone3 AND $milestone4
        @timeline $early AND $modern
        @q1 $timeline AND $milestone5
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q2",
      natural_language: "INTRODUCTION - Origins: When and where did AI formally begin?",
      expected_dsl: `
        @coined_at artificial_intelligence COINED_AT Dartmouth
        @coined_in artificial_intelligence COINED_IN 1956
        @q2 $coined_at AND $coined_in
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q3",
      natural_language: "BODY PARAGRAPH 1 - Technical Foundations: What enables modern AI systems?",
      expected_dsl: `
        @enable1 backpropagation ENABLES network_training
        @enable2 attention_mechanism ENABLES transformers
        @inspired neural_networks INSPIRED_BY biological_brains
        @accel GPUs ACCELERATE matrix_computations
        @foundations1 $enable1 AND $enable2
        @foundations2 $inspired AND $accel
        @q3 $foundations1 AND $foundations2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q4",
      natural_language: "BODY PARAGRAPH 1 - Learning Methods: How do AI systems acquire knowledge?",
      expected_dsl: `
        @method1 deep_learning USES multiple_hidden_layers
        @method2 reinforcement_learning USES reward_signals
        @method3 large_language_models LEARN_FROM text_corpora
        @learn1 $method1 AND $method2
        @q4 $learn1 AND $method3
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q5",
      natural_language: "BODY PARAGRAPH 2 - Current Applications: What practical tasks does AI perform?",
      expected_dsl: `
        @app1 AI ASSISTS medical_diagnosis
        @app2 AI DETECTS fraud
        @app3 AI TRANSLATES languages
        @app4 AI GENERATES art
        @app5 AI WRITES code
        @apps1 $app1 AND $app2
        @apps2 $app3 AND $app4
        @apps3 $apps1 AND $apps2
        @q5 $apps3 AND $app5
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q6",
      natural_language: "BODY PARAGRAPH 3 - Societal Concerns: What risks and ethical issues does AI raise?",
      expected_dsl: `
        @risk1 AI_surveillance RAISES privacy_concerns
        @risk2 AI_decisions LACK transparency
        @risk3 AI_weapons POSE ethical_dilemmas
        @risk4 AI_bias CAN_PERPETUATE discrimination
        @ethical1 $risk1 AND $risk2
        @ethical2 $risk3 AND $risk4
        @q6 $ethical1 AND $ethical2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q7",
      natural_language: "BODY PARAGRAPH 3 - Negative Impacts: What harms might AI cause?",
      expected_dsl: `
        @harm1 AI_automation MAY_DISPLACE jobs
        @harm2 AI CAN_SPREAD misinformation
        @harm3 AI REQUIRES energy_resources
        @harm4 AI_benefits NOT_EQUALLY distributed
        @neg1 $harm1 AND $harm2
        @neg2 $harm3 AND $harm4
        @q7 $neg1 AND $neg2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q8",
      natural_language: "CONCLUSION - Future Outlook: What developments might transform AI?",
      expected_dsl: `
        @future1 quantum_computing MAY_ACCELERATE AI
        @future2 neuromorphic_chips MAY_IMPROVE efficiency
        @future3 AI_augmentation MAY_ENHANCE human_capabilities
        @future4 AGI IS_A long_term_goal
        @tech_future $future1 AND $future2
        @human_future $future3 AND $future4
        @q8 $tech_future AND $human_future
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    }
  ],
  version: "3.0"
};
