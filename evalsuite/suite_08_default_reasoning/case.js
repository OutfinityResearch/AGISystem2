/**
 * Test Case: Comprehensive Default Reasoning with Exceptions (Non-Monotonic Logic)
 * Tests defeasible reasoning, exception handling, specificity ordering, and belief revision
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_08_default_reasoning",
  name: "Comprehensive Default Reasoning with Exceptions (Non-Monotonic Logic)",

  theory_NL: "Biological defaults with complex exception hierarchies: Birds can fly by default. Penguins are birds but cannot fly. Emperor penguins are penguins. Baby penguins cannot swim yet (exception to penguin default). Ostriches are birds but cannot fly and are fast runners. Kiwis are birds but cannot fly and are nocturnal. Bats are mammals but can fly (exception to mammal flight default). Flying fish are fish but can glide in air. Mammals give live birth by default. Platypus and echidna are mammals but lay eggs. Whales are mammals and give live birth but live in water (exception to land default). Dolphins are whales. Fish live in water by default. Mudskippers are fish but can survive on land. Lungfish can survive drought on land. Reptiles are cold-blooded by default with no exceptions. Birds are warm-blooded. Mammals are warm-blooded. Animals need oxygen. Plants produce oxygen. Default inheritance: More specific exceptions override general defaults. Instance-level facts override class-level defaults.",

  theory_DSL: [
    // Bird hierarchy with flight exceptions
    "bird CAN fly",
    "bird IS warm_blooded",
    "penguin IS_A bird",
    "penguin CANNOT fly",
    "penguin CAN swim",
    "emperor_penguin IS_A penguin",
    "baby_penguin IS_A penguin",
    "baby_penguin CANNOT swim",
    "ostrich IS_A bird",
    "ostrich CANNOT fly",
    "ostrich CAN run_fast",
    "kiwi IS_A bird",
    "kiwi CANNOT fly",
    "kiwi IS nocturnal",
    "emu IS_A bird",
    "emu CANNOT fly",
    // Mammal hierarchy with exceptions
    "mammal GIVES_BIRTH live_young",
    "mammal IS warm_blooded",
    "mammal LIVES_ON land",
    "platypus IS_A mammal",
    "platypus LAYS eggs",
    "echidna IS_A mammal",
    "echidna LAYS eggs",
    "bat IS_A mammal",
    "bat CAN fly",
    "whale IS_A mammal",
    "whale LIVES_IN water",
    "whale GIVES_BIRTH live_young",
    "dolphin IS_A whale",
    // Fish hierarchy
    "fish LIVES_IN water",
    "fish IS cold_blooded",
    "mudskipper IS_A fish",
    "mudskipper SURVIVES_ON land",
    "lungfish IS_A fish",
    "lungfish SURVIVES drought",
    "flying_fish IS_A fish",
    "flying_fish CAN glide",
    "goldfish IS_A fish",
    // Reptile and other
    "reptile IS cold_blooded",
    "lizard IS_A reptile",
    "snake IS_A reptile",
    // Animal hierarchy
    "mammal IS_A animal",
    "bird IS_A animal",
    "fish IS_A animal",
    "reptile IS_A animal",
    "animal NEEDS oxygen",
    "plant PRODUCES oxygen",
    // Instances
    "Tweety IS_A bird",
    "Opus IS_A penguin",
    "Speedy IS_A ostrich",
    "Rex IS_A dog",
    "dog IS_A mammal",
    "Perry IS_A platypus",
    "Nemo IS_A goldfish",
    "Muddy IS_A mudskipper",
    "Scales IS_A lizard",
    "Flipper IS_A dolphin",
    "Bruce IS_A bat",
    "Junior IS_A baby_penguin",
    // Override rules
    "CANNOT OVERRIDES CAN",
    "instance_fact OVERRIDES class_default",
    "specific_class OVERRIDES general_class"
  ],

  tasks: [
    // Q1: Multi-level exception - baby penguin can't swim (exception to exception)
    {
      id: "q1",
      TASK_NL: "Can Junior (baby penguin) swim? (Exception to an exception)",
      TASK_DSL: "@q1 baby_penguin CANNOT swim",
      ANSWEAR_NL: "No - baby penguins can't swim yet, even though adult penguins can",
      PROOF_DSL: `@p1 Junior IS_A baby_penguin
@p2 baby_penguin IS_A penguin
@p3 penguin CAN swim
@p4 baby_penguin CANNOT swim
@p5 CANNOT OVERRIDES CAN
@p6 specific_class OVERRIDES general_class
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 ESTABLISHES default_inference
@c4 $p1 LEADS_TO $p4
@c5 $c4 ESTABLISHES exception
@c6 baby_penguin MORE_SPECIFIC_THAN penguin
@c7 $p6 APPLIES $c6
@c8 $c7 TRIGGERS $p5
@c9 $c8 CHOOSES $c5
@c10 $c9 BLOCKS $c3
@result $c10 IS_A nested_exception_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Nested exception: 1) Junior IS_A baby_penguin IS_A penguin 2) Default: penguins CAN swim 3) Exception: baby_penguins CANNOT swim 4) More specific class wins 5) CANNOT blocks CAN."
    },

    // Q2: Positive exception - bat flies despite being mammal (unexpected capability)
    {
      id: "q2",
      TASK_NL: "Can Bruce (bat) fly? (Positive exception to mammal defaults)",
      TASK_DSL: "@q2 bat CAN fly",
      ANSWEAR_NL: "Yes - bats are the exception among mammals that can fly",
      PROOF_DSL: `@p1 Bruce IS_A bat
@p2 bat IS_A mammal
@p3 bat CAN fly
@p4 mammal LIVES_ON land
@p5 bird CAN fly
@c1 $p1 LEADS_TO $p3
@c2 $c1 ESTABLISHES direct_capability
@c3 $p1 LEADS_TO $p2
@c4 $c3 CONFIRMS mammal_status
@c5 mammals_have_no_flight IS default
@c6 $p3 IS positive_exception
@c7 $c6 CONTRASTS $p5
@c8 bat IS_NOT bird
@c9 $c8 COMBINES $c6
@c10 $c2 PROVIDES fly_ability
@result $c10 IS_A positive_exception_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Positive exception: Bats have explicit CAN fly fact. Unlike birds (where fly is default), bats are mammals with an exceptional capability."
    },

    // Q3: Chain with environment exception - dolphin lives in water
    {
      id: "q3",
      TASK_NL: "Where does Flipper (dolphin) live? (Exception inheritance chain)",
      TASK_DSL: "@q3 whale LIVES_IN water",
      ANSWEAR_NL: "Water - dolphins are whales, whales live in water (exception to mammal land default)",
      PROOF_DSL: `@p1 Flipper IS_A dolphin
@p2 dolphin IS_A whale
@p3 whale IS_A mammal
@p4 whale LIVES_IN water
@p5 mammal LIVES_ON land
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p4
@c3 $c2 ESTABLISHES water_habitat
@c4 $c1 LEADS_TO $p3
@c5 $c4 LEADS_TO $p5
@c6 $c5 ESTABLISHES land_default
@c7 whale MORE_SPECIFIC_THAN mammal
@c8 $c7 APPLIES $c6
@c9 $c8 CHOOSES $c3
@c10 $p1 INHERITS $c9
@result $c10 IS_A exception_inheritance_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Exception inheritance: 1) Flipper IS_A dolphin IS_A whale IS_A mammal 2) Mammal default: land 3) Whale exception: water 4) Dolphin inherits whale's exception."
    },

    // Q4: Multiple defaults same instance - warm-blooded verification
    {
      id: "q4",
      TASK_NL: "Is Opus (penguin) warm-blooded? (Multiple default paths)",
      TASK_DSL: "@q4 bird IS warm_blooded",
      ANSWEAR_NL: "Yes - birds are warm-blooded, penguins are birds, this is not overridden",
      PROOF_DSL: `@p1 Opus IS_A penguin
@p2 penguin IS_A bird
@p3 bird IS warm_blooded
@p4 penguin CANNOT fly
@p5 bird CAN fly
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 ESTABLISHES warm_blooded_default
@c4 $c1 LEADS_TO $p5
@c5 $p4 OVERRIDES $c4
@c6 $c5 IS blocked_default
@c7 warm_blooded HAS_NO penguin_exception
@c8 $c7 CONFIRMS no_exception
@c9 $c3 APPLIES $c8
@result $c9 IS_A multiple_default_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Multiple defaults: 1) Penguin overrides bird's flight default 2) But warm-blooded is not overridden 3) Each property tracked independently 4) No penguin exception for warm-blooded."
    },

    // Q5: Cross-class comparison - fish vs mammal in water
    {
      id: "q5",
      TASK_NL: "Both Nemo (goldfish) and Flipper (dolphin) live in water - but why differently?",
      TASK_DSL: "@q5 fish LIVES_IN water",
      ANSWEAR_NL: "Nemo: fish default. Flipper: whale exception to mammal default.",
      PROOF_DSL: `@p1 Nemo IS_A goldfish
@p2 goldfish IS_A fish
@p3 fish LIVES_IN water
@p4 Flipper IS_A dolphin
@p5 dolphin IS_A whale
@p6 whale LIVES_IN water
@p7 whale IS_A mammal
@p8 mammal LIVES_ON land
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 IS class_default
@c4 $p4 LEADS_TO $p5
@c5 $c4 LEADS_TO $p6
@c6 $c4 LEADS_TO $p7
@c7 $p6 OVERRIDES $p8
@c8 $c5 IS class_exception
@c9 $c3 DIFFERS $c8
@c10 both RESULT_IN water
@c11 $c9 EXPLAINS $c10
@result $c11 IS_A reasoning_comparison_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Comparison proof: Same outcome (water), different reasoning paths. Nemo: fish→water (default). Flipper: dolphin→whale→water (exception to mammal→land)."
    },

    // Q6: Belief revision - what if we learn Tweety is an ostrich?
    {
      id: "q6",
      TASK_NL: "If Tweety were actually an ostrich, would it fly? (Belief revision)",
      TASK_DSL: "@q6 ostrich CANNOT fly",
      ANSWEAR_NL: "No - reclassifying as ostrich would trigger the no-fly exception",
      PROOF_DSL: `@p1 Tweety IS_A bird
@p2 bird CAN fly
@p3 ostrich IS_A bird
@p4 ostrich CANNOT fly
@p5 CANNOT OVERRIDES CAN
@c1 $p1 LEADS_TO $p2
@c2 $c1 INFERS Tweety_flies
@c3 Tweety IS_A ostrich
@c4 $c3 LEADS_TO $p4
@c5 $c3 LEADS_TO $p3
@c6 $c5 LEADS_TO $p2
@c7 $c6 CONFLICTS $p4
@c8 $p5 RESOLVES $c7
@c9 $c8 CHOOSES $p4
@c10 $c2 DIFFERS $c9
@c11 $c10 IS belief_revision
@result $c11 IS_A counterfactual_exception_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Belief revision: 1) Current: Tweety IS_A bird → CAN fly 2) Hypothetical: Tweety IS_A ostrich 3) ostrich→bird→CAN fly conflicts with ostrich→CANNOT fly 4) Exception wins 5) Revised belief: cannot fly."
    },

    // Q7: Exception search - find all flightless birds
    {
      id: "q7",
      TASK_NL: "Which birds cannot fly? (Exception enumeration search)",
      TASK_DSL: "@q7 penguin CANNOT fly",
      ANSWEAR_NL: "Penguin, ostrich, kiwi, emu - all have CANNOT fly exceptions",
      PROOF_DSL: `@p1 bird CAN fly
@p2 penguin CANNOT fly
@p3 ostrich CANNOT fly
@p4 kiwi CANNOT fly
@p5 emu CANNOT fly
@p6 penguin IS_A bird
@p7 ostrich IS_A bird
@p8 kiwi IS_A bird
@p9 emu IS_A bird
@c1 $p1 ESTABLISHES flight_default
@c2 $c1 HAS overrides
@c3 $p2 OVERRIDES $p1
@c4 $p3 OVERRIDES $p1
@c5 $p4 OVERRIDES $p1
@c6 $p5 OVERRIDES $p1
@c7 $p6 CONFIRMS bird_status
@c8 $p7 CONFIRMS bird_status
@c9 $p8 CONFIRMS bird_status
@c10 $p9 CONFIRMS bird_status
@c11 $c3 COMBINES $c4
@c12 $c11 COMBINES $c5
@c13 $c12 COMBINES $c6
@c14 $c13 HAS count_4
@result $c14 IS_A exception_search_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Exception search: 1) Find default: bird CAN fly 2) Search for CANNOT fly overrides 3) Verify each is IS_A bird 4) Collect: penguin, ostrich, kiwi, emu."
    },

    // Q8: Complex inheritance - platypus properties
    {
      id: "q8",
      TASK_NL: "List all of Perry's (platypus) properties with default/exception classification",
      TASK_DSL: "@q8 platypus LAYS eggs",
      ANSWEAR_NL: "warm_blooded (mammal default), lays eggs (platypus exception), lives on land (mammal default), needs oxygen (animal default)",
      PROOF_DSL: `@p1 Perry IS_A platypus
@p2 platypus IS_A mammal
@p3 mammal IS warm_blooded
@p4 mammal GIVES_BIRTH live_young
@p5 platypus LAYS eggs
@p6 mammal LIVES_ON land
@p7 animal NEEDS oxygen
@p8 mammal IS_A animal
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 CLASSIFIES warm_blooded_default
@c4 $c1 LEADS_TO $p4
@c5 $p1 LEADS_TO $p5
@c6 $c5 OVERRIDES $c4
@c7 $c6 CLASSIFIES eggs_exception
@c8 $c1 LEADS_TO $p6
@c9 land HAS_NO platypus_override
@c10 $c8 CLASSIFIES land_default
@c11 $c1 LEADS_TO $p8
@c12 $c11 LEADS_TO $p7
@c13 $c12 CLASSIFIES oxygen_default
@c14 $c3 COMBINES $c7
@c15 $c14 COMBINES $c10
@c16 $c15 COMBINES $c13
@result $c16 IS_A property_classification_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Property classification: 1) warm_blooded: mammal default, not overridden 2) eggs: platypus exception to mammal live_young 3) land: mammal default, not overridden 4) oxygen: inherited from animal via mammal."
    }
  ]
};
