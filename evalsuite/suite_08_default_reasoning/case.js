/**
 * Test Case: Default Reasoning with Exceptions (Non-Monotonic Logic)
 * Tests DEFINE_DEFAULT for defeasible reasoning, exception handling, and non-monotonic inference where conclusions can be overridden
 * Version: 3.0
 */

module.exports = {
  id: "suite_08_default_reasoning",
  name: "Default Reasoning with Exceptions (Non-Monotonic Logic)",
  description: "Tests DEFINE_DEFAULT for defeasible reasoning, exception handling, and non-monotonic inference where conclusions can be overridden",
  theory: {
    natural_language: "Biological defaults with exceptions. Default rule: Birds can fly, with exceptions being penguins, ostriches, kiwis, and emus. Default rule: Mammals give birth to live young, with exceptions being platypus and echidna which lay eggs. Default rule: Fish live in water, with exceptions being mudskippers and lungfish which can survive on land. Default rule: Reptiles are cold-blooded, with no known exceptions. Instances: Tweety is a bird (regular). Opus is a penguin, and penguins are birds. Speedy is an ostrich, and ostriches are birds. Rex is a dog, and dogs are mammals. Perry is a platypus, and platypuses are mammals. Nemo is a goldfish, and goldfish are fish. Muddy is a mudskipper, and mudskippers are fish. Scales is a lizard, and lizards are reptiles.",
    expected_facts: [
          "bird CAN fly",
          "penguin IS_A bird",
          "penguin EXCEPTION_TO bird CAN fly",
          "ostrich IS_A bird",
          "ostrich EXCEPTION_TO bird CAN fly",
          "kiwi IS_A bird",
          "kiwi EXCEPTION_TO bird CAN fly",
          "emu IS_A bird",
          "emu EXCEPTION_TO bird CAN fly",
          "mammal GIVES_BIRTH_TO live_young",
          "platypus IS_A mammal",
          "platypus EXCEPTION_TO mammal GIVES_BIRTH_TO live_young",
          "echidna IS_A mammal",
          "echidna EXCEPTION_TO mammal GIVES_BIRTH_TO live_young",
          "fish LIVES_IN water",
          "mudskipper IS_A fish",
          "mudskipper EXCEPTION_TO fish LIVES_IN water",
          "lungfish IS_A fish",
          "lungfish EXCEPTION_TO fish LIVES_IN water",
          "reptile IS cold_blooded",
          "Tweety IS_A bird",
          "Opus IS_A penguin",
          "Speedy IS_A ostrich",
          "Rex IS_A dog",
          "dog IS_A mammal",
          "Perry IS_A platypus",
          "Nemo IS_A goldfish",
          "goldfish IS_A fish",
          "Muddy IS_A mudskipper",
          "Scales IS_A lizard",
          "lizard IS_A reptile"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "Can Tweety fly?",
      expected_dsl: `@q1 Tweety CAN fly`,
      expected_answer: {
        natural_language: "Yes, Tweety can fly. Tweety is a bird, and birds can fly by default. Tweety is not one of the exceptions (penguin, ostrich, kiwi, emu).",
        truth: "TRUE_DEFAULT",
        explanation: "Default reasoning: bird -> CAN fly, no exception applies",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "Can Opus fly?",
      expected_dsl: `@q2 Opus CAN fly`,
      expected_answer: {
        natural_language: "No, Opus cannot fly. Although Opus is a bird (penguins are birds), penguins are an exception to the flying rule.",
        truth: "FALSE",
        explanation: "Exception overrides default: penguin is exception to birds flying",
        existence: "negative"
      }
    },
    {
      id: "q3",
      natural_language: "Does Rex give birth to live young?",
      expected_dsl: `@q3 Rex GIVES_BIRTH_TO live_young`,
      expected_answer: {
        natural_language: "Yes, Rex gives birth to live young. Rex is a dog, dogs are mammals, and mammals give birth to live young by default. Dogs are not an exception.",
        truth: "TRUE_DEFAULT",
        explanation: "Default through IS_A chain: Rex->dog->mammal->live birth",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "Does Perry give birth to live young?",
      expected_dsl: `@q4 Perry GIVES_BIRTH_TO live_young`,
      expected_answer: {
        natural_language: "No, Perry does not give birth to live young. Perry is a platypus, and platypuses are an exception - they lay eggs despite being mammals.",
        truth: "FALSE",
        explanation: "Exception: platypus overrides mammal default",
        existence: "negative"
      }
    },
    {
      id: "q5",
      natural_language: "Does Nemo live in water?",
      expected_dsl: `@q5 Nemo LIVES_IN water`,
      expected_answer: {
        natural_language: "Yes, Nemo lives in water. Nemo is a goldfish, goldfish are fish, and fish live in water by default.",
        truth: "TRUE_DEFAULT",
        explanation: "Default applies: goldfish is not an exception",
        existence: "positive"
      }
    },
    {
      id: "q6",
      natural_language: "Does Muddy live in water?",
      expected_dsl: `@q6 Muddy LIVES_IN water`,
      expected_answer: {
        natural_language: "No, or at least not exclusively. Muddy is a mudskipper, and mudskippers are an exception - they can survive on land.",
        truth: "FALSE",
        explanation: "Exception: mudskipper can live outside water",
        existence: "negative"
      }
    },
    {
      id: "q7",
      natural_language: "Is Scales cold-blooded?",
      expected_dsl: `@q7 Scales IS cold_blooded`,
      expected_answer: {
        natural_language: "Yes, Scales is cold-blooded. Scales is a lizard, lizards are reptiles, and all reptiles are cold-blooded with no exceptions.",
        truth: "TRUE_DEFAULT",
        explanation: "Default with no exceptions always applies",
        existence: "positive"
      }
    },
    {
      id: "q8",
      natural_language: "Can Speedy fly?",
      expected_dsl: `@q8 Speedy CAN fly`,
      expected_answer: {
        natural_language: "No, Speedy cannot fly. Speedy is an ostrich, and ostriches are an exception to the birds-can-fly rule.",
        truth: "FALSE",
        explanation: "Exception: ostrich overrides bird flying default",
        existence: "negative"
      }
    }
  ],
  version: "3.0"
};
