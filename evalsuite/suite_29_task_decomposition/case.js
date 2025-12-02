/**
 * Test Case: Task Decomposition - Recipe Execution Plan
 * Tests task decomposition with DSL-validatable proof chains. Verifies dependencies, timing, and resource allocation.
 * Version: 3.0
 */

module.exports = {
  id: "suite_29_task_decomposition",
  name: "Task Decomposition - Recipe Execution Plan",
  description: "Tests task decomposition with DSL-validatable proof chains. Verifies dependencies, timing, and resource allocation.",
  theory: {
    natural_language: "PREP PHASE: prep_1 executes dice_bacon taking bacon_200g outputting diced_bacon duration 5min. prep_2 executes beat_eggs taking eggs_4pcs outputting egg_mixture duration 3min. prep_3 executes mince_garlic outputting minced_garlic duration 2min. prep_4 executes boil_water outputting boiling_water duration 10min uses burner_1. COOK PHASE: cook_1 executes cook_pasta taking boiling_water outputting cooked_pasta duration 12min uses burner_1 after prep_4. cook_2 executes fry_bacon taking diced_bacon and minced_garlic outputting crispy_bacon duration 8min uses pan_1 after prep_1 and prep_3. ASSEMBLY: assemble_1 executes combine_pasta_bacon taking cooked_pasta and crispy_bacon uses pan_1 after cook_1 and cook_2. assemble_2 executes add_egg_mixture taking egg_mixture after assemble_1. assemble_3 executes season_and_serve outputting final_dish after assemble_2. PARALLEL: prep_1 prep_2 prep_3 can run parallel.",
    expected_facts: [
          "prep_1 EXECUTES dice_bacon",
          "prep_1 TAKES bacon_200g",
          "prep_1 OUTPUTS diced_bacon",
          "prep_1 DURATION 5min",
          "prep_2 EXECUTES beat_eggs",
          "prep_2 TAKES eggs_4pcs",
          "prep_2 OUTPUTS egg_mixture",
          "prep_2 DURATION 3min",
          "prep_3 EXECUTES mince_garlic",
          "prep_3 OUTPUTS minced_garlic",
          "prep_3 DURATION 2min",
          "prep_4 EXECUTES boil_water",
          "prep_4 OUTPUTS boiling_water",
          "prep_4 DURATION 10min",
          "prep_4 USES burner_1",
          "cook_1 EXECUTES cook_pasta",
          "cook_1 TAKES boiling_water",
          "cook_1 OUTPUTS cooked_pasta",
          "cook_1 DURATION 12min",
          "cook_1 USES burner_1",
          "cook_1 AFTER prep_4",
          "cook_2 EXECUTES fry_bacon",
          "cook_2 TAKES diced_bacon",
          "cook_2 TAKES minced_garlic",
          "cook_2 OUTPUTS crispy_bacon",
          "cook_2 USES pan_1",
          "cook_2 AFTER prep_1",
          "cook_2 AFTER prep_3",
          "assemble_1 EXECUTES combine_pasta_bacon",
          "assemble_1 TAKES cooked_pasta",
          "assemble_1 TAKES crispy_bacon",
          "assemble_1 USES pan_1",
          "assemble_1 AFTER cook_1",
          "assemble_1 AFTER cook_2",
          "assemble_2 EXECUTES add_egg_mixture",
          "assemble_2 TAKES egg_mixture",
          "assemble_2 AFTER assemble_1",
          "assemble_3 EXECUTES season_and_serve",
          "assemble_3 OUTPUTS final_dish",
          "assemble_3 AFTER assemble_2",
          "prep_parallel CAN_RUN prep_1",
          "prep_parallel CAN_RUN prep_2",
          "prep_parallel CAN_RUN prep_3"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "PREP: What does prep_2 need and produce?",
      expected_dsl: `
        @takes prep_2 TAKES eggs_4pcs
        @outputs prep_2 OUTPUTS egg_mixture
        @q1 $takes AND $outputs
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
      natural_language: "PARALLEL: What tasks can run parallel during prep?",
      expected_dsl: `
        @r1 prep_parallel CAN_RUN prep_1
        @r2 prep_parallel CAN_RUN prep_2
        @r3 prep_parallel CAN_RUN prep_3
        @p1 $r1 AND $r2
        @q2 $p1 AND $r3
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
      natural_language: "DEPENDENCY: What must complete before cook_2?",
      expected_dsl: `
        @a1 cook_2 AFTER prep_1
        @a2 cook_2 AFTER prep_3
        @q3 $a1 AND $a2
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
      natural_language: "RESOURCE: What tasks use burner_1?",
      expected_dsl: `
        @u1 prep_4 USES burner_1
        @u2 cook_1 USES burner_1
        @q4 $u1 AND $u2
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
      natural_language: "TIMING: How long does cook_1 take?",
      expected_dsl: `
        @exec cook_1 EXECUTES cook_pasta
        @dur cook_1 DURATION 12min
        @q5 $exec AND $dur
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
      natural_language: "ASSEMBLY: What does assemble_1 need from cooking?",
      expected_dsl: `
        @t1 assemble_1 TAKES cooked_pasta
        @t2 assemble_1 TAKES crispy_bacon
        @q6 $t1 AND $t2
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
      natural_language: "FINAL: What produces final_dish?",
      expected_dsl: `
        @exec assemble_3 EXECUTES season_and_serve
        @out assemble_3 OUTPUTS final_dish
        @q7 $exec AND $out
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
      natural_language: "PAN: Which tasks use pan_1?",
      expected_dsl: `
        @u1 cook_2 USES pan_1
        @u2 assemble_1 USES pan_1
        @q8 $u1 AND $u2
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
