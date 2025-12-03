/**
 * Test Case: Comprehensive Climate Policy - Causal Chain Analysis
 * Tests climate causal chains, intervention reasoning, and policy impact
 * Version: 5.0 - Complex proofs with multi-step causation and intervention analysis
 */
module.exports = {
  id: "suite_23_summarize_perspective",
  name: "Comprehensive Climate Policy - Causal Chain Analysis",

  theory_NL: "Climate causal chains. CO2→greenhouse effect→warming→ice melt→sea rise→coastal threat. Sources: deforestation and fossil fuels release CO2. Sinks: reforestation absorbs CO2. Mitigations: solar/wind generate clean energy, EVs/transit reduce emissions. Policy: Paris Agreement sets targets, carbon markets enable trading.",

  theory_DSL: [
    "carbon_dioxide IS_A greenhouse_gas", "greenhouse_gas TRAPS heat",
    "trapped_heat CAUSES temperature_rise", "temperature_rise CAUSES ice_cap_melting",
    "ice_cap_melting CAUSES sea_level_rise", "sea_level_rise THREATENS coastal_cities",
    "deforestation RELEASES carbon_dioxide", "fossil_fuel_burning RELEASES carbon_dioxide",
    "solar_power GENERATES clean_electricity", "wind_power GENERATES clean_electricity",
    "electric_vehicles REDUCE emissions", "public_transit REDUCES emissions",
    "reforestation ABSORBS carbon_dioxide", "carbon_dioxide ABSORBED_BY reforestation",
    "Paris_Agreement SETS emission_targets", "carbon_markets ENABLE trading",
    "clean_electricity REPLACES fossil_fuels", "reduce_emissions MITIGATES warming"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace the full chain: CO2 → coastal threat",
      TASK_DSL: "@q1 carbon_dioxide THREATENS coastal_cities",
      ANSWEAR_NL: "CO2→greenhouse→heat→warming→ice melt→sea rise→coastal threat. 6-step chain.",
      PROOF_DSL: `@p1 carbon_dioxide IS_A greenhouse_gas
@p2 greenhouse_gas TRAPS heat
@p3 trapped_heat CAUSES temperature_rise
@p4 temperature_rise CAUSES ice_cap_melting
@p5 ice_cap_melting CAUSES sea_level_rise
@p6 sea_level_rise THREATENS coastal_cities
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@c5 $c4 LEADS_TO $p6
@chain $c5 COMPLETES causal_chain
@result $chain IS_A transitive_causal_proof
@proof $result PROVES $q1`,
      PROOF_NL: "6-step causal chain: CO2→greenhouse→heat→temp→ice→sea→cities."
    },
    {
      id: "q2", TASK_NL: "What are all CO2 sources?",
      TASK_DSL: "@q2 carbon_dioxide SOURCES enumerated",
      ANSWEAR_NL: "Deforestation and fossil_fuel_burning both release CO2.",
      PROOF_DSL: `@p1 deforestation RELEASES carbon_dioxide
@p2 fossil_fuel_burning RELEASES carbon_dioxide
@source1 $p1 IDENTIFIES source_1
@source2 $p2 IDENTIFIES source_2
@all $source1 AND $source2
@count $all HAS 2_sources
@result $count IS_A source_enumeration_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Search X where X RELEASES CO2. Found: deforestation, fossil_fuel_burning."
    },
    {
      id: "q3", TASK_NL: "How does reforestation help?",
      TASK_DSL: "@q3 reforestation MITIGATES warming",
      ANSWEAR_NL: "Reforestation absorbs CO2, reducing greenhouse effect, breaking causal chain.",
      PROOF_DSL: `@p1 reforestation ABSORBS carbon_dioxide
@p2 carbon_dioxide IS_A greenhouse_gas
@p3 greenhouse_gas TRAPS heat
@p4 trapped_heat CAUSES temperature_rise
@absorb $p1 REDUCES carbon_dioxide
@reduce_ghg $absorb REDUCES $p2
@break_chain $reduce_ghg WEAKENS $p3
@mitigate $break_chain REDUCES $p4
@result $mitigate IS_A intervention_proof
@proof $result PROVES $q3`,
      PROOF_NL: "Reforestation absorbs CO2 → less greenhouse gas → less warming."
    },
    {
      id: "q4", TASK_NL: "What are all clean energy sources?",
      TASK_DSL: "@q4 clean_electricity GENERATORS listed",
      ANSWEAR_NL: "Solar and wind both generate clean electricity.",
      PROOF_DSL: `@p1 solar_power GENERATES clean_electricity
@p2 wind_power GENERATES clean_electricity
@gen1 $p1 IDENTIFIES generator_1
@gen2 $p2 IDENTIFIES generator_2
@all $gen1 AND $gen2
@count $all HAS 2_generators
@clean $all PROVIDES emission_free
@result $count IS_A generator_enumeration_proof
@proof $result PROVES $q4`,
      PROOF_NL: "Solar and wind both generate clean electricity. 2 sources."
    },
    {
      id: "q5", TASK_NL: "How do EVs help climate?",
      TASK_DSL: "@q5 electric_vehicles MITIGATE warming",
      ANSWEAR_NL: "EVs reduce emissions → less CO2 → less warming. Indirect mitigation.",
      PROOF_DSL: `@p1 electric_vehicles REDUCE emissions
@p2 reduce_emissions MITIGATES warming
@p3 fossil_fuel_burning RELEASES carbon_dioxide
@c1 $p1 REDUCES $p3
@c2 $c1 LEADS_TO less_CO2
@c3 $c2 LEADS_TO $p2
@mitigation $c3 ACHIEVES climate_benefit
@result $mitigation IS_A mitigation_chain_proof
@proof $result PROVES $q5`,
      PROOF_NL: "EVs reduce emissions → less fossil fuel CO2 → mitigates warming."
    },
    {
      id: "q6", TASK_NL: "Compare emission reduction strategies",
      TASK_DSL: "@q6 electric_vehicles REDUCE emissions",
      ANSWEAR_NL: "EVs and public transit both reduce emissions. Two transport strategies.",
      PROOF_DSL: `@p1 electric_vehicles REDUCE emissions
@p2 public_transit REDUCES emissions
@c1 $p1 IS transport_strategy_1
@c2 $p2 IS transport_strategy_2
@c3 $c1 SIMILAR_TO $c2
@c4 $c3 TARGET emissions
@result $c4 IS_A strategy_comparison_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Both EVs and public transit target emission reduction. Transport sector."
    },
    {
      id: "q7", TASK_NL: "What policy mechanisms exist?",
      TASK_DSL: "@q7 Paris_Agreement SETS emission_targets",
      ANSWEAR_NL: "Paris Agreement (targets) and carbon markets (trading). Two mechanisms.",
      PROOF_DSL: `@p1 Paris_Agreement SETS emission_targets
@p2 carbon_markets ENABLE trading
@c1 $p1 IS regulatory_mechanism
@c2 $p2 IS market_mechanism
@c3 $c1 COMBINES $c2
@c4 $c3 HAS 2_mechanisms
@result $c4 IS_A policy_enumeration_proof
@proof $result PROVES $q7`,
      PROOF_NL: "Paris Agreement (regulatory) + carbon markets (market-based). 2 mechanisms."
    },
    {
      id: "q8", TASK_NL: "Full intervention strategy: source to sink",
      TASK_DSL: "@q8 clean_electricity REPLACES fossil_fuels",
      ANSWEAR_NL: "Reduce sources (clean energy replaces fossil), increase sinks (reforestation). Dual approach.",
      PROOF_DSL: `@p1 clean_electricity REPLACES fossil_fuels
@p2 reforestation ABSORBS carbon_dioxide
@p3 fossil_fuel_burning RELEASES carbon_dioxide
@c1 $p1 ELIMINATES $p3
@c2 $p2 REMOVES carbon_dioxide
@c3 $c1 COMBINES $c2
@c4 $c3 FORMS complete_intervention
@result $c4 IS_A intervention_strategy_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Dual strategy: reduce sources (clean energy) + increase sinks (reforestation)."
    }
  ]
};
