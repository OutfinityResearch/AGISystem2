/**
 * Test Case: Theory Layering & Advanced Counterfactual Reasoning
 * Tests THEORY_PUSH/POP for isolated counterfactual contexts, CF command for what-if scenarios, RETRACT for fact removal, layer isolation, and MERGE_THEORY for combining theories
 * Version: 3.0
 */

module.exports = {
  id: "suite_10_theory_layers",
  name: "Theory Layering & Advanced Counterfactual Reasoning",
  description: "Tests THEORY_PUSH/POP for isolated counterfactual contexts, CF command for what-if scenarios, RETRACT for fact removal, layer isolation, and MERGE_THEORY for combining theories",
  theory: {
    natural_language: "Base reality facts about physics and history. Physics: Water boils at 100 degrees Celsius at sea level. Water freezes at 0 degrees Celsius. Room temperature is approximately 20 degrees Celsius. Fire requires oxygen to burn. Gravity causes objects to fall downward. Metal expands when heated. History: Napoleon lost the Battle of Waterloo in 1815. The French Empire ended after Waterloo. World War 1 happened before World War 2. The Internet was invented after television. The Roman Empire fell in 476 AD. Technology: Electricity was discovered before the internet. Smartphones require electricity to function. Cars require fuel or electricity to operate.",
    expected_facts: [
          "water BOILS_AT 100_celsius",
          "water FREEZES_AT 0_celsius",
          "room_temperature IS 20_celsius",
          "fire REQUIRES oxygen",
          "gravity CAUSES objects_fall",
          "metal EXPANDS_WHEN heated",
          "Napoleon LOST Battle_of_Waterloo",
          "Battle_of_Waterloo HAPPENED_IN 1815",
          "French_Empire ENDED_AFTER Waterloo",
          "WW1 BEFORE WW2",
          "Internet INVENTED_AFTER television",
          "Roman_Empire FELL_IN 476_AD",
          "electricity DISCOVERED_BEFORE internet",
          "smartphone REQUIRES electricity",
          "car REQUIRES fuel_or_electricity"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "In a world where water boiled at 50 degrees, would it be liquid at room temperature?",
      expected_dsl: `
        @q1_push cf_water PUSH any
        @_ water BOILS_AT 50_celsius
        @q1 water BOILS_AT 50_celsius
        @q1_pop any POP any
      `,
      expected_answer: {
        natural_language: "Yes, water would still be liquid at room temperature (20 degrees) if it boiled at 50 degrees, since 20 < 50.",
        truth: "TRUE_CERTAIN",
        explanation: "CF creates isolated context where boiling point is 50, room temp 20 < 50",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "What if there was no oxygen - could fire exist?",
      expected_dsl: `
        @q2_push cf_no_oxygen PUSH any
        @q2_retract fire RETRACT oxygen
        @q2 fire REQUIRES oxygen
        @q2_pop any POP any
      `,
      expected_answer: {
        natural_language: "No, fire could not exist without oxygen. Fire requires oxygen to burn, so in a world without oxygen, fire is impossible.",
        truth: "UNKNOWN",
        explanation: "After RETRACT, the fact is removed so ASK returns UNKNOWN",
        existence: "zero"
      }
    },
    {
      id: "q3",
      natural_language: "What if Napoleon had won Waterloo - would the French Empire have continued?",
      expected_dsl: `
        @q3_push cf_napoleon PUSH any
        @_ Napoleon WON Battle_of_Waterloo
        @q3 Napoleon WON Battle_of_Waterloo
        @q3_pop any POP any
      `,
      expected_answer: {
        natural_language: "Plausibly yes. If Napoleon had won Waterloo instead of losing, the French Empire might have continued since its end was a consequence of the defeat.",
        truth: "TRUE_CERTAIN",
        explanation: "Counterfactual reasoning: removing cause may remove effect",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "Create a 'no_gravity' layer and check if objects would fall",
      expected_dsl: `
        @layer1 no_gravity_world PUSH any
        @retract1 gravity RETRACT objects_fall
        @q4 gravity CAUSES objects_fall
        @restore any POP any
      `,
      expected_answer: {
        natural_language: "In the no-gravity layer, objects would not fall because we retracted the causal relationship. After THEORY_POP, normal gravity rules apply again.",
        truth: "UNKNOWN",
        explanation: "After RETRACT, the fact is removed so ASK returns UNKNOWN",
        existence: "zero"
      }
    },
    {
      id: "q5",
      natural_language: "After popping the no-gravity layer, do objects fall again?",
      expected_dsl: `@q5 gravity CAUSES objects_fall`,
      expected_answer: {
        natural_language: "Yes, after popping the counterfactual layer, we return to base reality where gravity causes objects to fall.",
        truth: "TRUE_CERTAIN",
        explanation: "THEORY_POP restores previous layer state",
        existence: "positive"
      }
    },
    {
      id: "q6",
      natural_language: "Can we have nested counterfactual layers?",
      expected_dsl: `
        @outer alternate_history PUSH any
        @_ Napoleon WON Battle_of_Waterloo
        @inner alternate_physics PUSH any
        @_ water BOILS_AT 50_celsius
        @q6 water BOILS_AT 50_celsius
        @pop_inner any POP any
        @pop_outer any POP any
      `,
      expected_answer: {
        natural_language: "Yes, nested layers work. In inner layer, both changes are visible. After popping inner, water boils at 100 again but Napoleon still won. After popping outer, both revert to base reality.",
        truth: "TRUE_CERTAIN",
        explanation: "Layer stacking: inner sees outer changes, pops restore correctly",
        existence: "positive"
      }
    },
    {
      id: "q7",
      natural_language: "What if smartphones didn't require electricity?",
      expected_dsl: `
        @q7_push cf_smartphone PUSH any
        @q7_retract smartphone RETRACT electricity
        @q7 smartphone REQUIRES electricity
        @q7_pop any POP any
      `,
      expected_answer: {
        natural_language: "If smartphones didn't require electricity, they could theoretically function without power. However, this counterfactual removes a fundamental dependency.",
        truth: "UNKNOWN",
        explanation: "After RETRACT, the fact is removed so ASK returns UNKNOWN (not FALSE)",
        existence: "zero"
      }
    },
    {
      id: "q8",
      natural_language: "Verify layer isolation - changes in a layer should not affect base theory",
      expected_dsl: `
        @setup test_isolation PUSH any
        @_ Roman_Empire FELL_IN 500_AD
        @check_layer Roman_Empire FELL_IN 500_AD
        @pop any POP any
        @q8 Roman_Empire FELL_IN 476_AD
      `,
      expected_answer: {
        natural_language: "In the test layer, Roman Empire fell in 500 AD (as asserted). After popping, the base theory shows 476 AD unchanged. Layers are properly isolated.",
        truth: "TRUE_CERTAIN",
        explanation: "Complete isolation: layer changes don't leak to base",
        existence: "positive"
      }
    }
  ],
  version: "3.0"
};
