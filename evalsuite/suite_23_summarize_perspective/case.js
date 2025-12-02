/**
 * Test Case: Structured Report Generation - Climate Policy Analysis
 * Tests ability to gather and structure knowledge for multi-section reports. Explanations are DSL proof chains that can be validated without LLM.
 * Version: 3.0
 */

module.exports = {
  id: "suite_23_summarize_perspective",
  name: "Structured Report Generation - Climate Policy Analysis",
  description: "Tests ability to gather and structure knowledge for multi-section reports. Explanations are DSL proof chains that can be validated without LLM.",
  theory: {
    natural_language: "SCIENTIFIC EVIDENCE: Carbon dioxide is a greenhouse gas. Greenhouse gases trap heat. Trapped heat causes temperature rise. Temperature rise causes ice cap melting. Ice cap melting causes sea level rise. Sea level rise threatens coastal cities. Methane is a greenhouse gas. Deforestation releases carbon dioxide. Fossil fuel burning releases carbon dioxide. ECONOMIC FACTORS: Carbon tax reduces emissions. Carbon tax costs businesses money. Renewable energy creates jobs. Renewable energy requires initial investment. Climate adaptation costs billions. Energy efficiency saves money. SOLUTIONS: Solar power generates clean electricity. Wind power generates clean electricity. Electric vehicles reduce emissions. Public transit reduces emissions. Reforestation absorbs carbon dioxide. SOCIAL IMPACTS: Heat waves cause deaths. Air pollution causes respiratory illness. Water scarcity affects agriculture. POLICY: Paris Agreement sets emission targets. Carbon markets enable trading. Building codes improve efficiency.",
    expected_facts: [
          "carbon_dioxide IS_A greenhouse_gas",
          "greenhouse_gas TRAPS heat",
          "trapped_heat CAUSES temperature_rise",
          "temperature_rise CAUSES ice_cap_melting",
          "ice_cap_melting CAUSES sea_level_rise",
          "sea_level_rise THREATENS coastal_cities",
          "methane IS_A greenhouse_gas",
          "deforestation RELEASES carbon_dioxide",
          "fossil_fuel_burning RELEASES carbon_dioxide",
          "carbon_tax REDUCES emissions",
          "carbon_tax COSTS businesses",
          "renewable_energy CREATES jobs",
          "renewable_energy REQUIRES initial_investment",
          "climate_adaptation COSTS billions",
          "energy_efficiency SAVES money",
          "solar_power GENERATES clean_electricity",
          "wind_power GENERATES clean_electricity",
          "electric_vehicles REDUCE emissions",
          "public_transit REDUCES emissions",
          "reforestation ABSORBS carbon_dioxide",
          "heat_waves CAUSE deaths",
          "air_pollution CAUSES respiratory_illness",
          "water_scarcity AFFECTS agriculture",
          "Paris_Agreement SETS emission_targets",
          "carbon_markets ENABLE trading",
          "building_codes IMPROVE efficiency"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "Section 1: What is the causal chain from greenhouse gases to coastal threats?",
      expected_dsl: `
        @causal_facts FACTS_MATCHING
        @step1 trapped_heat CAUSES temperature_rise
        @step2 temperature_rise CAUSES ice_cap_melting
        @step3 ice_cap_melting CAUSES sea_level_rise
        @chain1 $step1 AND $step2
        @q1 $chain1 AND $step3
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
      natural_language: "Section 1: What releases greenhouse gases?",
      expected_dsl: `
        @sources FACTS_WITH_OBJECT carbon_dioxide
        @source_count $sources COUNT any
        @deforest deforestation RELEASES carbon_dioxide
        @fossil fossil_fuel_burning RELEASES carbon_dioxide
        @q2 $deforest AND $fossil
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
      natural_language: "Section 2: What are the costs vs benefits of climate action?",
      expected_dsl: `
        @costs FACTS_MATCHING
        @benefits renewable_energy FACTS any CREATES
        @tax_cost carbon_tax COSTS businesses
        @jobs renewable_energy CREATES jobs
        @cost_exists $costs NONEMPTY any
        @benefit_exists $benefits NONEMPTY any
        @q3 $cost_exists AND $benefit_exists
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
      natural_language: "Section 3: Compile emission reduction methods",
      expected_dsl: `
        @reduce1 FACTS_WITH_OBJECT emissions
        @reduce2 FACTS_WITH_OBJECT emissions
        @all_reducers MERGE_LISTS $reduce1 $reduce2
        @ev electric_vehicles REDUCE emissions
        @transit public_transit REDUCES emissions
        @tax carbon_tax REDUCES emissions
        @q4 $all_reducers NONEMPTY any
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
      natural_language: "Section 3: What generates clean electricity?",
      expected_dsl: `
        @clean FACTS_WITH_OBJECT clean_electricity
        @solar solar_power GENERATES clean_electricity
        @wind wind_power GENERATES clean_electricity
        @q5 $solar AND $wind
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
      natural_language: "Section 4: What are human health impacts?",
      expected_dsl: `
        @health1 heat_waves CAUSE deaths
        @health2 air_pollution CAUSES respiratory_illness
        @health3 water_scarcity AFFECTS agriculture
        @direct $health1 AND $health2
        @q6 $direct AND $health3
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
      natural_language: "Section 5: What policy mechanisms exist?",
      expected_dsl: `
        @p1 Paris_Agreement SETS emission_targets
        @p2 carbon_markets ENABLE trading
        @p3 building_codes IMPROVE efficiency
        @policies $p1 AND $p2
        @q7 $policies AND $p3
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
      natural_language: "Section 6 - Synthesis: Prove the full climate argument",
      expected_dsl: `
        @premise1 fossil_fuel_burning RELEASES carbon_dioxide
        @premise2 carbon_dioxide IS_A greenhouse_gas
        @premise3 trapped_heat CAUSES temperature_rise
        @premise4 ice_cap_melting CAUSES sea_level_rise
        @solution1 electric_vehicles REDUCE emissions
        @solution2 reforestation ABSORBS carbon_dioxide
        @problem1 $premise1 AND $premise2
        @problem2 $premise3 AND $premise4
        @problem $problem1 AND $problem2
        @solutions $solution1 AND $solution2
        @q8 $problem AND $solutions
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
