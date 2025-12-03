/**
 * Test Case: Comprehensive Default Reasoning with Exceptions (Non-Monotonic Logic)
 * Tests defeasible reasoning, exception handling, specificity ordering, and belief revision
 * Version: 5.0 - Complex proofs with exception hierarchies, conflict resolution, and multi-level defaults
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
      TASK_DSL: "@q1 Junior CAN swim",
      ANSWEAR_NL: "No - baby penguins can't swim yet, even though adult penguins can",
      PROOF_DSL: `@p1 Junior IS_A baby_penguin
@p2 baby_penguin IS_A penguin
@p3 penguin CAN swim
@p4 baby_penguin CANNOT swim
@p5 CANNOT OVERRIDES CAN
@p6 specific_class OVERRIDES general_class
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@default_path $c2 ESTABLISHES default_inference
@c3 $p1 LEADS_TO $p4
@exception_path $c3 ESTABLISHES exception
@specificity baby_penguin MORE_SPECIFIC_THAN penguin
@c4 $p6 APPLIES $specificity
@override $c4 TRIGGERS $p5
@resolve $override CHOOSES $exception_path
@block $resolve BLOCKS $default_path
@result $block IS_A nested_exception_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Nested exception: 1) Junior IS_A baby_penguin IS_A penguin 2) Default: penguins CAN swim 3) Exception: baby_penguins CANNOT swim 4) More specific class wins 5) CANNOT blocks CAN."
    },

    // Q2: Positive exception - bat flies despite being mammal (unexpected capability)
    {
      id: "q2",
      TASK_NL: "Can Bruce (bat) fly? (Positive exception to mammal defaults)",
      TASK_DSL: "@q2 Bruce CAN fly",
      ANSWEAR_NL: "Yes - bats are the exception among mammals that can fly",
      PROOF_DSL: `@p1 Bruce IS_A bat
@p2 bat IS_A mammal
@p3 bat CAN fly
@p4 mammal LIVES_ON land
@p5 bird CAN fly
@c1 $p1 LEADS_TO $p3
@direct $c1 ESTABLISHES direct_capability
@c2 $p1 LEADS_TO $p2
@mammal_check $c2 CONFIRMS mammal_status
@no_flight_default mammals_no_default_fly
@c3 $p3 IS_A positive_exception
@exception_type $c3 CONTRASTS $p5
@not_bird bat IS_NOT bird
@unique $not_bird AND $c3
@capability $direct PROVIDES fly_ability
@result $capability IS_A positive_exception_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Positive exception: Bats have explicit CAN fly fact. Unlike birds (where fly is default), bats are mammals with an exceptional capability."
    },

    // Q3: Chain with environment exception - dolphin lives in water
    {
      id: "q3",
      TASK_NL: "Where does Flipper (dolphin) live? (Exception inheritance chain)",
      TASK_DSL: "@q3 Flipper LIVES_IN water",
      ANSWEAR_NL: "Water - dolphins are whales, whales live in water (exception to mammal land default)",
      PROOF_DSL: `@p1 Flipper IS_A dolphin
@p2 dolphin IS_A whale
@p3 whale IS_A mammal
@p4 whale LIVES_IN water
@p5 mammal LIVES_ON land
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p4
@whale_exception $c2 ESTABLISHES water_habitat
@c3 $c1 LEADS_TO $p3
@c4 $c3 LEADS_TO $p5
@mammal_default $c4 ESTABLISHES land_default
@specificity whale MORE_SPECIFIC_THAN mammal
@override $specificity APPLIES_TO $mammal_default
@resolve $override CHOOSES $whale_exception
@inherit $p1 INHERITS $resolve
@result $inherit IS_A exception_inheritance_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Exception inheritance: 1) Flipper IS_A dolphin IS_A whale IS_A mammal 2) Mammal default: land 3) Whale exception: water 4) Dolphin inherits whale's exception."
    },

    // Q4: Multiple defaults same instance - warm-blooded verification
    {
      id: "q4",
      TASK_NL: "Is Opus (penguin) warm-blooded? (Multiple default paths)",
      TASK_DSL: "@q4 Opus IS warm_blooded",
      ANSWEAR_NL: "Yes - birds are warm-blooded, penguins are birds, this is not overridden",
      PROOF_DSL: `@p1 Opus IS_A penguin
@p2 penguin IS_A bird
@p3 bird IS warm_blooded
@p4 penguin CANNOT fly
@p5 bird CAN fly
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@warm_path $c2 ESTABLISHES warm_blooded_default
@c3 $c1 LEADS_TO $p5
@c4 $p4 OVERRIDES $c3
@flight_blocked $c4 IS_A blocked_default
@check_override warm_blooded HAS_NO exception_for_penguin
@no_conflict $check_override CONFIRMS no_exception
@inherit $warm_path APPLIES $no_conflict
@result $inherit IS_A multiple_default_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Multiple defaults: 1) Penguin overrides bird's flight default 2) But warm-blooded is not overridden 3) Each property tracked independently 4) No penguin exception for warm-blooded."
    },

    // Q5: Cross-class comparison - fish vs mammal in water
    {
      id: "q5",
      TASK_NL: "Both Nemo (goldfish) and Flipper (dolphin) live in water - but why differently?",
      TASK_DSL: "@q5 Nemo_Flipper BOTH_IN water_different_reason",
      ANSWEAR_NL: "Nemo: fish default. Flipper: whale exception to mammal default.",
      PROOF_DSL: `@p1 Nemo IS_A goldfish
@p2 goldfish IS_A fish
@p3 fish LIVES_IN water
@p4 Flipper IS_A dolphin
@p5 dolphin IS_A whale
@p6 whale LIVES_IN water
@p7 whale IS_A mammal
@p8 mammal LIVES_ON land
@nemo_chain $p1 LEADS_TO $p2
@nemo_water $nemo_chain LEADS_TO $p3
@nemo_default $nemo_water IS_A class_default
@flipper_chain $p4 LEADS_TO $p5
@flipper_water $flipper_chain LEADS_TO $p6
@flipper_mammal $flipper_chain LEADS_TO $p7
@flipper_override $p6 OVERRIDES $p8
@flipper_exception $flipper_water IS_A class_exception
@compare $nemo_default DIFFERS_FROM $flipper_exception
@same_outcome both RESULT_IN water
@different_paths $compare EXPLAINS $same_outcome
@result $different_paths IS_A reasoning_comparison_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Comparison proof: Same outcome (water), different reasoning paths. Nemo: fish→water (default). Flipper: dolphin→whale→water (exception to mammal→land)."
    },

    // Q6: Belief revision - what if we learn Tweety is an ostrich?
    {
      id: "q6",
      TASK_NL: "If Tweety were actually an ostrich, would it fly? (Belief revision)",
      TASK_DSL: "@q6 Tweety_as_ostrich CANNOT fly",
      ANSWEAR_NL: "No - reclassifying as ostrich would trigger the no-fly exception",
      PROOF_DSL: `@p1 Tweety IS_A bird
@p2 bird CAN fly
@p3 ostrich IS_A bird
@p4 ostrich CANNOT fly
@p5 CANNOT OVERRIDES CAN
@current $p1 LEADS_TO $p2
@current_belief $current INFERS Tweety_flies
@revise Tweety IS_A ostrich
@new_chain $revise LEADS_TO $p4
@c1 $revise LEADS_TO $p3
@c2 $c1 LEADS_TO $p2
@conflict $c2 CONFLICTS $p4
@apply_override $p5 RESOLVES $conflict
@new_belief $apply_override CHOOSES $p4
@compare $current_belief DIFFERS $new_belief
@revision $compare IS_A belief_revision
@result $revision IS_A counterfactual_exception_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Belief revision: 1) Current: Tweety IS_A bird → CAN fly 2) Hypothetical: Tweety IS_A ostrich 3) ostrich→bird→CAN fly conflicts with ostrich→CANNOT fly 4) Exception wins 5) Revised belief: cannot fly."
    },

    // Q7: Exception search - find all flightless birds
    {
      id: "q7",
      TASK_NL: "Which birds cannot fly? (Exception enumeration search)",
      TASK_DSL: "@q7 flightless_birds SEARCH all_exceptions",
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
@default $p1 ESTABLISHES flight_default
@search find_overrides_of $default
@e1 $p2 OVERRIDES $p1
@e2 $p3 OVERRIDES $p1
@e3 $p4 OVERRIDES $p1
@e4 $p5 OVERRIDES $p1
@verify1 $p6 CONFIRMS bird_status
@verify2 $p7 CONFIRMS bird_status
@verify3 $p8 CONFIRMS bird_status
@verify4 $p9 CONFIRMS bird_status
@collect $e1 AND $e2
@collect2 $collect AND $e3
@collect3 $collect2 AND $e4
@count $collect3 HAS count_4
@result $count IS_A exception_search_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Exception search: 1) Find default: bird CAN fly 2) Search for CANNOT fly overrides 3) Verify each is IS_A bird 4) Collect: penguin, ostrich, kiwi, emu."
    },

    // Q8: Complex inheritance - platypus properties
    {
      id: "q8",
      TASK_NL: "List all of Perry's (platypus) properties with default/exception classification",
      TASK_DSL: "@q8 Perry PROPERTIES classified",
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
@prop1 $c2 CLASSIFIES warm_blooded_default
@c3 $c1 LEADS_TO $p4
@c4 $p1 LEADS_TO $p5
@override $c4 OVERRIDES $c3
@prop2 $override CLASSIFIES eggs_exception
@c5 $c1 LEADS_TO $p6
@no_exception land HAS_NO platypus_override
@prop3 $c5 CLASSIFIES land_default
@c6 $c1 LEADS_TO $p8
@c7 $c6 LEADS_TO $p7
@prop4 $c7 CLASSIFIES oxygen_default
@collect $prop1 AND $prop2
@collect2 $collect AND $prop3
@collect3 $collect2 AND $prop4
@result $collect3 IS_A property_classification_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Property classification: 1) warm_blooded: mammal default, not overridden 2) eggs: platypus exception to mammal live_young 3) land: mammal default, not overridden 4) oxygen: inherited from animal via mammal."
    }
  ]
};
