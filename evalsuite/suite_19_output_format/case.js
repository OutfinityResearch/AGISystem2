/**
 * Test Case: Comprehensive Output Format & Physical Property Reasoning
 * Tests property inheritance, causal chains, and capability reasoning
 * Version: 5.0 - Complex proofs with property chains and capability inference
 */
module.exports = {
  id: "suite_19_output_format",
  name: "Comprehensive Output Format & Physical Property Reasoning",

  theory_NL: "Physical properties and capabilities. Sky is blue (color). Grass is green. Sun is hot, radiates light, causes warmth. Ice is cold, melts when heated. Fire burns, needs oxygen, produces heat and light. Water flows, can extinguish fire. Birds fly (most), fish swim. Properties: hot OPPOSITE cold. Burn REQUIRES oxygen. Extinguish PREVENTS burn.",

  theory_DSL: [
    "Sky IS_A blue_thing", "Sky HAS_COLOR blue",
    "Grass IS_A green_thing", "Grass HAS_COLOR green",
    "Sun HAS_PROPERTY hot", "Sun RADIATES light", "Sun CAUSES warmth",
    "Ice HAS_PROPERTY cold", "Ice MELTS_WHEN heated",
    "Fire CAN burn", "Fire REQUIRES oxygen", "Fire PRODUCES heat", "Fire PRODUCES light",
    "Water CAN flow", "Water CAN extinguish", "Water PREVENTS burn",
    "Bird CAN fly", "Fish CAN swim",
    "hot OPPOSITE cold", "blue_thing IS_A colored_thing", "green_thing IS_A colored_thing",
    "colored_thing HAS_PROPERTY visible", "burn REQUIRES oxygen", "extinguish PREVENTS burn"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Is Sky visible? (Property inheritance chain)",
      TASK_DSL: "@q1 Sky HAS_PROPERTY visible",
      ANSWEAR_NL: "Yes. Sky IS_A blue_thing IS_A colored_thing HAS_PROPERTY visible.",
      PROOF_DSL: `@p1 Sky IS_A blue_thing
@p2 blue_thing IS_A colored_thing
@p3 colored_thing HAS_PROPERTY visible
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@inherit $c2 DERIVES Sky HAS visible
@result $inherit IS_A property_inheritance_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Sky→blue_thing→colored_thing→visible. Property inherited through chain."
    },
    {
      id: "q2", TASK_NL: "Why can't fire burn without oxygen?",
      TASK_DSL: "@q2 Fire REQUIRES oxygen",
      ANSWEAR_NL: "Fire CAN burn, burn REQUIRES oxygen. Remove oxygen → no burning.",
      PROOF_DSL: `@p1 Fire CAN burn
@p2 burn REQUIRES oxygen
@p3 Fire REQUIRES oxygen
@link $p1 IMPLIES $p2
@trans $link DERIVES $p3
@counter NO_oxygen BLOCKS burn
@consequence $counter PREVENTS Fire_burning
@result $trans IS_A requirement_chain_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Fire CAN burn + burn REQUIRES oxygen → Fire REQUIRES oxygen."
    },
    {
      id: "q3", TASK_NL: "Can water stop fire? How?",
      TASK_DSL: "@q3 Water STOPS Fire",
      ANSWEAR_NL: "Water CAN extinguish, extinguish PREVENTS burn, Fire CAN burn → Water stops Fire.",
      PROOF_DSL: `@p1 Water CAN extinguish
@p2 extinguish PREVENTS burn
@p3 Fire CAN burn
@c1 $p1 ENABLES $p2
@c2 $p3 TARGET_OF $p2
@apply $c1 TO $c2
@effect $apply STOPS Fire_burning
@result $effect IS_A causal_prevention_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Water extinguishes + extinguish prevents burn + Fire burns → Water stops Fire."
    },
    {
      id: "q4", TASK_NL: "What happens when Sun shines?",
      TASK_DSL: "@q4 Sun EFFECTS derived",
      ANSWEAR_NL: "Sun radiates light AND causes warmth. Dual effect.",
      PROOF_DSL: `@p1 Sun RADIATES light
@p2 Sun CAUSES warmth
@p3 Sun HAS_PROPERTY hot
@effect1 $p1 PRODUCES illumination
@effect2 $p2 PRODUCES heating
@combine $effect1 AND $effect2
@source $p3 EXPLAINS both_effects
@result $combine IS_A multi_effect_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Sun hot → radiates light (illumination) + causes warmth (heating)."
    },
    {
      id: "q5", TASK_NL: "Are hot and cold opposites?",
      TASK_DSL: "@q5 hot_cold OPPOSITE verified",
      ANSWEAR_NL: "Yes. hot OPPOSITE cold. Sun is hot, Ice is cold → opposite properties.",
      PROOF_DSL: `@p1 hot OPPOSITE cold
@p2 Sun HAS_PROPERTY hot
@p3 Ice HAS_PROPERTY cold
@example1 $p2 INSTANCE_OF hot
@example2 $p3 INSTANCE_OF cold
@contrast $example1 DIFFERS $example2
@verify $contrast MATCHES $p1
@result $verify IS_A opposition_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Axiom: hot OPPOSITE cold. Examples: Sun (hot) vs Ice (cold)."
    },
    {
      id: "q6", TASK_NL: "What does Fire produce?",
      TASK_DSL: "@q6 Fire PRODUCTS listed",
      ANSWEAR_NL: "Fire produces heat AND light. Dual output.",
      PROOF_DSL: `@p1 Fire PRODUCES heat
@p2 Fire PRODUCES light
@p3 Fire CAN burn
@output1 $p1 DERIVES heat_output
@output2 $p2 DERIVES light_output
@from $p3 AS source_process
@multi $output1 AND $output2
@count $multi HAS 2_products
@result $multi IS_A enumeration_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Fire burns → produces heat + produces light. Two outputs."
    },
    {
      id: "q7", TASK_NL: "What happens to ice when heated?",
      TASK_DSL: "@q7 Ice WHEN_HEATED melts",
      ANSWEAR_NL: "Ice is cold, melts when heated. Phase transition.",
      PROOF_DSL: `@p1 Ice HAS_PROPERTY cold
@p2 Ice MELTS_WHEN heated
@p3 hot OPPOSITE cold
@initial $p1 ESTABLISHES cold_state
@apply_heat heating INTRODUCED
@c1 $apply_heat TRIGGERS $p2
@transition $c1 CAUSES phase_change
@result $transition IS_A state_change_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Ice is cold + apply heat → melts. Cold→hot transition causes melting."
    },
    {
      id: "q8", TASK_NL: "Compare Bird and Fish capabilities",
      TASK_DSL: "@q8 Bird_Fish COMPARISON done",
      ANSWEAR_NL: "Bird CAN fly (air), Fish CAN swim (water). Different mediums, different capabilities.",
      PROOF_DSL: `@p1 Bird CAN fly
@p2 Fish CAN swim
@cap1 $p1 IN_MEDIUM air
@cap2 $p2 IN_MEDIUM water
@differ $cap1 DIFFERS $cap2
@reason fly REQUIRES air
@reason2 swim REQUIRES water
@exclusive $reason DISJOINT $reason2
@result $differ IS_A capability_comparison_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Bird flies (air medium), Fish swims (water medium). Complementary capabilities."
    }
  ]
};
