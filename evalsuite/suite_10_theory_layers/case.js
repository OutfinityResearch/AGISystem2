/**
 * Test Case: Comprehensive Theory Layering & Counterfactual Worlds
 * Tests nested hypothetical contexts, belief revision, world branching, and context isolation
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_10_theory_layers",
  name: "Comprehensive Theory Layering & Counterfactual Worlds",

  theory_NL: "Base reality with physics and history. Physics: Water boils at 100°C, freezes at 0°C. Fire requires oxygen. Gravity causes falling. Metal expands when heated. Pressure increases with depth. Sound requires medium. Light travels at c. History: Napoleon lost Waterloo (1815). French Empire ended after Waterloo. WW1 before WW2. Roman Empire fell 476 AD. Counterfactual contexts: What if Napoleon won? What if no gravity? What if water boiled at 50°C? Each creates isolated theory layer. Changes in layer don't affect base. Nested counterfactuals: Within 'Napoleon won', ask 'what if he then lost at next battle?' Technology chains: electricity enables computers, computers enable internet, internet enables smartphones. Alternative history: Steam power before electricity would change the sequence.",

  theory_DSL: [
    "water BOILS_AT 100_celsius",
    "water FREEZES_AT 0_celsius",
    "room_temperature IS 20_celsius",
    "20_celsius LESS_THAN 100_celsius",
    "fire REQUIRES oxygen",
    "gravity CAUSES falling",
    "falling CAUSES impact",
    "metal EXPANDS_WHEN heated",
    "expansion CAUSES pressure_increase",
    "sound REQUIRES medium",
    "light TRAVELS_AT speed_c",
    "vacuum HAS_NO medium",
    "Napoleon LOST Waterloo",
    "Waterloo HAPPENED_IN 1815",
    "French_Empire ENDED_AFTER Waterloo",
    "WW1 BEFORE WW2",
    "Roman_Empire FELL_IN 476_AD",
    "Renaissance ENABLED Scientific_Revolution",
    "Scientific_Revolution ENABLED Industrial_Revolution",
    "Industrial_Revolution ENABLED Information_Age",
    "electricity ENABLES computers",
    "computers ENABLE internet",
    "internet ENABLES smartphones",
    "electricity DISCOVERED_IN 1800s",
    "base_reality IS current_world",
    "counterfactual CREATES isolated_context",
    "nested_counterfactual INHERITS parent_context",
    "layer_pop RESTORES previous_context"
  ],

  tasks: [
    {
      id: "q1",
      TASK_NL: "If there was no oxygen, what happens to fire→heat→expansion chain?",
      TASK_DSL: "@q1 no_oxygen BREAKS fire_chain",
      ANSWEAR_NL: "No oxygen → no fire → no heat → no expansion. Entire chain collapses.",
      PROOF_DSL: `@p1 fire REQUIRES oxygen
@p2 metal EXPANDS_WHEN heated
@p3 expansion CAUSES pressure_increase
@p4 base_reality IS current_world
@c1 no_oxygen VIOLATES $p1
@c2 $c1 BLOCKS fire
@c3 $c2 BLOCKS heat
@c4 $c3 BLOCKS expansion
@c5 $c4 BLOCKS pressure_increase
@chain $c2 LEADS_TO $c5
@result $chain IS_A counterfactual_cascade_proof
@proof $result PROVES $q1`,
      PROOF_NL: "Counterfactual cascade: Remove oxygen → fire fails → no heat → no expansion → chain broken."
    },
    {
      id: "q2",
      TASK_NL: "If Napoleon won Waterloo, would French Empire have ended?",
      TASK_DSL: "@q2 Napoleon_won PREVENTS empire_end",
      ANSWEAR_NL: "No - the causal link (lost Waterloo → empire ended) would be broken",
      PROOF_DSL: `@p1 Napoleon LOST Waterloo
@p2 French_Empire ENDED_AFTER Waterloo
@p3 base_reality IS current_world
@c1 Napoleon_won CONTRADICTS $p1
@c2 $p2 DEPENDS_ON $p1
@c3 $c1 BREAKS $c2
@c4 $c3 IMPLIES empire_continues
@chain $c1 LEADS_TO $c4
@result $chain IS_A historical_counterfactual_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Historical counterfactual: Napoleon won contradicts lost → breaks causal chain → empire would continue."
    },
    {
      id: "q3",
      TASK_NL: "In world where Napoleon won, what if he then lost the next battle?",
      TASK_DSL: "@q3 nested_counterfactual COMPUTES outcome",
      ANSWEAR_NL: "Nested layer: Empire continues initially but then collapses after second defeat",
      PROOF_DSL: `@p1 Napoleon LOST Waterloo
@p2 French_Empire ENDED_AFTER Waterloo
@layer1 Napoleon WON Waterloo
@c1 $layer1 CONTRADICTS $p1
@c2 $c1 IMPLIES empire_continues
@layer2 Napoleon LOST next_battle
@c3 $layer2 WITHIN $layer1
@c4 $c2 THEN empire_continues
@c5 $layer2 CAUSES empire_collapse
@nested $c4 FOLLOWED_BY $c5
@result $nested IS_A nested_counterfactual_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Nested counterfactual: Layer 1: Napoleon won → empire continues. Layer 2: loses next → empire falls."
    },
    {
      id: "q4",
      TASK_NL: "If water boiled at 50°C, would room temperature (20°C) water be liquid?",
      TASK_DSL: "@q4 altered_physics EVALUATES water_state",
      ANSWEAR_NL: "Yes, 20°C < 50°C so water would still be liquid (below new boiling point)",
      PROOF_DSL: `@p1 water BOILS_AT 100_celsius
@p2 room_temperature IS 20_celsius
@p3 20_celsius LESS_THAN 100_celsius
@hyp water BOILS_AT 50_celsius
@c1 $hyp MODIFIES boiling_point
@c2 20_celsius LESS_THAN 50_celsius
@c3 $c2 PROVES below_boiling
@c4 $c3 IMPLIES water_liquid
@chain $c1 LEADS_TO $c4
@result $chain IS_A physics_counterfactual_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Physics counterfactual: Boiling at 50°C → 20°C < 50°C → below boiling → still liquid."
    },
    {
      id: "q5",
      TASK_NL: "If computers were never invented, would smartphones exist?",
      TASK_DSL: "@q5 no_computers PREVENTS smartphones",
      ANSWEAR_NL: "No - computers enable internet, internet enables smartphones. Chain broken.",
      PROOF_DSL: `@p1 electricity ENABLES computers
@p2 computers ENABLE internet
@p3 internet ENABLES smartphones
@hyp computers WERE_NOT invented
@c1 $hyp BLOCKS $p2
@c2 $c1 BLOCKS internet
@c3 $c2 BLOCKS $p3
@c4 $c3 BLOCKS smartphones
@chain $c1 LEADS_TO $c4
@result $chain IS_A technology_chain_proof
@proof $result PROVES $q5`,
      PROOF_NL: "Technology chain: No computers → no internet → no smartphones. Chain broken."
    },
    {
      id: "q6",
      TASK_NL: "Can sound travel through vacuum? (Physics constraint evaluation)",
      TASK_DSL: "@q6 sound_in_vacuum IS impossible",
      ANSWEAR_NL: "No - sound requires medium, vacuum has no medium",
      PROOF_DSL: `@p1 sound REQUIRES medium
@p2 vacuum HAS_NO medium
@p3 light TRAVELS_AT speed_c
@c1 $p2 ESTABLISHES no_medium
@c2 $p1 REQUIRES medium
@c3 $c1 FAILS $c2
@c4 $c3 PROVES impossible
@contrast light CAN vacuum
@result $c4 IS_A physics_constraint_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Physics constraint: Sound requires medium, vacuum has none → impossible."
    },
    {
      id: "q7",
      TASK_NL: "Compare outcomes: World A (no gravity) vs World B (no oxygen)",
      TASK_DSL: "@q7 world_comparison EVALUATES differences",
      ANSWEAR_NL: "World A: no falling, no impact. World B: no fire, no heat-driven expansion.",
      PROOF_DSL: `@p1 gravity CAUSES falling
@p2 falling CAUSES impact
@p3 fire REQUIRES oxygen
@p4 metal EXPANDS_WHEN heated
@worldA no_gravity BLOCKS $p1
@cA1 $worldA BLOCKS falling
@cA2 $cA1 BLOCKS impact
@worldB no_oxygen BLOCKS $p3
@cB1 $worldB BLOCKS fire
@cB2 $cB1 BLOCKS heat
@cB3 $cB2 BLOCKS expansion
@compare $cA2 DIFFERS $cB3
@result $compare IS_A multi_world_comparison
@proof $result PROVES $q7`,
      PROOF_NL: "World A: no gravity → no falling → no impact. World B: no oxygen → no fire → no expansion."
    },
    {
      id: "q8",
      TASK_NL: "Prove that counterfactual changes don't leak to base reality",
      TASK_DSL: "@q8 context_isolation IS verified",
      ANSWEAR_NL: "After all counterfactual explorations, base facts remain unchanged",
      PROOF_DSL: `@p1 Napoleon LOST Waterloo
@p2 water BOILS_AT 100_celsius
@p3 gravity CAUSES falling
@hyp1 Napoleon WON Waterloo
@hyp2 water BOILS_AT 50_celsius
@hyp3 gravity DOES_NOT exist
@c1 $hyp1 CONTRADICTS $p1
@c2 $hyp2 CONTRADICTS $p2
@c3 $hyp3 CONTRADICTS $p3
@iso1 $p1 UNCHANGED after_hyp1
@iso2 $p2 UNCHANGED after_hyp2
@iso3 $p3 UNCHANGED after_hyp3
@all $iso1 CONFIRMS $iso3
@result $all IS_A context_isolation_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Context isolation: Hypotheticals contradict base but don't change it. Base facts remain unchanged."
    }
  ]
};
