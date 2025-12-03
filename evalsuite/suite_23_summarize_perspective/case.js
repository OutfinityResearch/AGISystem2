/**
 * Test Case: Structured Report Generation - Climate Policy Analysis
 * Tests climate-related causal relationships, emissions, and policy facts
 * Version: 3.0
 */

module.exports = {
  id: "suite_23_summarize_perspective",
  name: "Structured Report Generation - Climate Policy Analysis",
  description: "Tests climate-related causal relationships, emissions, and policy facts.",
  theory_NL: "Climate facts: Carbon dioxide is a greenhouse gas. Trapped heat causes temperature rise. Temperature rise causes ice cap melting. Ice cap melting causes sea level rise. Sea level rise threatens coastal cities. Deforestation releases carbon dioxide. Fossil fuel burning releases carbon dioxide. Solar power generates clean electricity. Wind power generates clean electricity.",
  theory_DSL: [
    "carbon_dioxide IS_A greenhouse_gas",
    "greenhouse_gas TRAPS heat",
    "trapped_heat CAUSES temperature_rise",
    "temperature_rise CAUSES ice_cap_melting",
    "ice_cap_melting CAUSES sea_level_rise",
    "sea_level_rise THREATENS coastal_cities",
    "deforestation RELEASES carbon_dioxide",
    "fossil_fuel_burning RELEASES carbon_dioxide",
    "solar_power GENERATES clean_electricity",
    "wind_power GENERATES clean_electricity",
    "electric_vehicles REDUCE emissions",
    "public_transit REDUCES emissions",
    "reforestation ABSORBS carbon_dioxide",
    "Paris_Agreement SETS emission_targets",
    "carbon_markets ENABLE trading"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Does trapped heat cause temperature rise?",
      TASK_DSL: "@q1 trapped_heat CAUSES temperature_rise",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, trapped heat causes temperature rise."
    },
    {
      id: "q2",
      TASK_NL: "Does deforestation release carbon dioxide?",
      TASK_DSL: "@q2 deforestation RELEASES carbon_dioxide",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, deforestation releases carbon dioxide."
    },
    {
      id: "q3",
      TASK_NL: "Does fossil fuel burning release carbon dioxide?",
      TASK_DSL: "@q3 fossil_fuel_burning RELEASES carbon_dioxide",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, fossil fuel burning releases carbon dioxide."
    },
    {
      id: "q4",
      TASK_NL: "Does solar power generate clean electricity?",
      TASK_DSL: "@q4 solar_power GENERATES clean_electricity",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, solar power generates clean electricity."
    },
    {
      id: "q5",
      TASK_NL: "Does wind power generate clean electricity?",
      TASK_DSL: "@q5 wind_power GENERATES clean_electricity",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, wind power generates clean electricity."
    },
    {
      id: "q6",
      TASK_NL: "Does sea level rise threaten coastal cities?",
      TASK_DSL: "@q6 sea_level_rise THREATENS coastal_cities",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, sea level rise threatens coastal cities."
    },
    {
      id: "q7",
      TASK_NL: "Does the Paris Agreement set emission targets?",
      TASK_DSL: "@q7 Paris_Agreement SETS emission_targets",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, the Paris Agreement sets emission targets."
    },
    {
      id: "q8",
      TASK_NL: "Does reforestation absorb carbon dioxide?",
      TASK_DSL: "@q8 reforestation ABSORBS carbon_dioxide",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, reforestation absorbs carbon dioxide."
    }
  ],
};
