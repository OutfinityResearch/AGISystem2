/**
 * Test Case: Default Reasoning with Exceptions (Non-Monotonic Logic)
 * Tests DEFINE_DEFAULT for defeasible reasoning, exception handling, and non-monotonic inference where conclusions can be overridden
 * Version: 3.0
 */
module.exports = {
  id: "suite_08_default_reasoning",
  name: "Default Reasoning with Exceptions (Non-Monotonic Logic)",
  theory_NL: "Biological defaults with exceptions. Default rule: Birds can fly, with exceptions being penguins, ostriches, kiwis, and emus. Default rule: Mammals give birth to live young, with exceptions being platypus and echidna which lay eggs. Default rule: Fish live in water, with exceptions being mudskippers and lungfish which can survive on land. Default rule: Reptiles are cold-blooded, with no known exceptions. Instances: Tweety is a bird (regular). Opus is a penguin, and penguins are birds. Speedy is an ostrich, and ostriches are birds. Rex is a dog, and dogs are mammals. Perry is a platypus, and platypuses are mammals. Nemo is a goldfish, and goldfish are fish. Muddy is a mudskipper, and mudskippers are fish. Scales is a lizard, and lizards are reptiles.",
  // NOTE: v3 syntax uses simple triples. EXCEPTION_TO is modeled as CANNOT.
  theory_DSL: [
    "bird CAN fly",
    "penguin IS_A bird",
    "penguin CANNOT fly",
    "ostrich IS_A bird",
    "ostrich CANNOT fly",
    "kiwi IS_A bird",
    "kiwi CANNOT fly",
    "emu IS_A bird",
    "emu CANNOT fly",
    "mammal GIVES_BIRTH live_young",
    "platypus IS_A mammal",
    "platypus LAYS eggs",
    "echidna IS_A mammal",
    "echidna LAYS eggs",
    "fish LIVES_IN water",
    "mudskipper IS_A fish",
    "mudskipper SURVIVES_ON land",
    "lungfish IS_A fish",
    "lungfish SURVIVES_ON land",
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
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Can Tweety fly?",
      TASK_DSL: `@q1 Tweety CAN fly`,
      ANSWEAR_DSL: `{"truth": "TRUE_DEFAULT"}`,
      ANSWEAR_NL: "Yes, Tweety can fly. Tweety is a bird, and birds can fly by default. Tweety is not one of the exceptions (penguin, ostrich, kiwi, emu).",
      PROOF_DSL: `@p1 Tweety IS_A bird\n@p2 bird CAN fly\n@proof $p1 AND $p2`,
      PROOF_NL: "This is proven because Tweety is a bird and there is a default rule that birds can fly. Tweety is not listed as an exception."
    },
    {
      id: "q2",
      TASK_NL: "Can Opus fly?",
      TASK_DSL: `@q2 penguin CANNOT fly`,
      ANSWEAR_DSL: `{"truth": "TRUE_CERTAIN"}`,
      ANSWEAR_NL: "No, Opus cannot fly. Although Opus is a bird (penguins are birds), penguins cannot fly.",
      PROOF_DSL: `@p1 Opus IS_A penguin\n@p2 penguin CANNOT fly\n@proof $p1 AND $p2`,
      PROOF_NL: "This is proven because Opus is a penguin, and penguins cannot fly."
    }
  ]
};
