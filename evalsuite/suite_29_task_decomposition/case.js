/**
 * Test Case: Comprehensive Recipe Execution - Task Dependency Analysis
 * Tests task decomposition, resource contention, and parallel execution
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_29_task_decomposition",
  name: "Comprehensive Recipe Execution - Task Dependency Analysis",

  theory_NL: "Recipe execution with prep and cook phases. Prep tasks: prep_1 (dice_bacon, 5min, produces diced_bacon), prep_2 (beat_eggs, 3min, produces egg_mixture), prep_3 (mince_garlic, 2min, produces minced_garlic), prep_4 (boil_water, 10min, uses burner_1, produces boiling_water). Cook tasks: cook_1 (cook_pasta, 12min, uses burner_1, needs boiling_water, produces cooked_pasta), cook_2 (fry_bacon, 8min, uses pan_1, needs diced_bacon and minced_garlic, produces crispy_bacon). Assembly: assemble_1 (combine, uses pan_1, needs cooked_pasta and crispy_bacon), assemble_2 (add_egg_mixture, needs egg_mixture), assemble_3 (final_toss, produces final_dish). Task types: prep tasks are preparation_task, cook tasks are cooking_task, assemble tasks are assembly_task.",

  theory_DSL: [
    "prep_1 EXECUTES dice_bacon", "prep_1 DURATION 5", "prep_1 OUTPUTS diced_bacon", "prep_1 IS_A preparation_task",
    "prep_2 EXECUTES beat_eggs", "prep_2 DURATION 3", "prep_2 OUTPUTS egg_mixture", "prep_2 IS_A preparation_task",
    "prep_3 EXECUTES mince_garlic", "prep_3 DURATION 2", "prep_3 OUTPUTS minced_garlic", "prep_3 IS_A preparation_task",
    "prep_4 EXECUTES boil_water", "prep_4 DURATION 10", "prep_4 USES burner_1", "prep_4 OUTPUTS boiling_water", "prep_4 IS_A preparation_task",
    "cook_1 EXECUTES cook_pasta", "cook_1 DURATION 12", "cook_1 USES burner_1", "cook_1 TAKES boiling_water", "cook_1 OUTPUTS cooked_pasta", "cook_1 IS_A cooking_task",
    "cook_2 EXECUTES fry_bacon", "cook_2 DURATION 8", "cook_2 USES pan_1", "cook_2 TAKES diced_bacon", "cook_2 TAKES minced_garlic", "cook_2 OUTPUTS crispy_bacon", "cook_2 IS_A cooking_task",
    "assemble_1 EXECUTES combine", "assemble_1 USES pan_1", "assemble_1 TAKES cooked_pasta", "assemble_1 TAKES crispy_bacon", "assemble_1 OUTPUTS combined_dish", "assemble_1 IS_A assembly_task",
    "assemble_2 EXECUTES add_egg", "assemble_2 TAKES combined_dish", "assemble_2 TAKES egg_mixture", "assemble_2 OUTPUTS egg_coated_dish", "assemble_2 IS_A assembly_task",
    "assemble_3 EXECUTES final_toss", "assemble_3 TAKES egg_coated_dish", "assemble_3 OUTPUTS final_dish", "assemble_3 IS_A assembly_task",
    "diced_bacon FLOWS_TO cook_2", "minced_garlic FLOWS_TO cook_2", "boiling_water FLOWS_TO cook_1",
    "cooked_pasta FLOWS_TO assemble_1", "crispy_bacon FLOWS_TO assemble_1",
    "egg_mixture FLOWS_TO assemble_2", "combined_dish FLOWS_TO assemble_2", "egg_coated_dish FLOWS_TO assemble_3",
    "burner_1 IS_A heat_source", "pan_1 IS_A cookware", "heat_source IS_A equipment", "cookware IS_A equipment",
    "preparation_task IS_A recipe_task", "cooking_task IS_A recipe_task", "assembly_task IS_A recipe_task",
    "recipe_task IS_A task_type", "task_type IS_A process_element"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace full recipe: start → final_dish",
      TASK_DSL: "@q1 prep_1 PROVISIONS final_dish",
      ANSWEAR_NL: "prep_1,2,3,4 (parallel where possible) → cook_1,2 → assemble_1,2,3. 9 tasks total.",
      PROOF_DSL: `@p1 prep_1 OUTPUTS diced_bacon
@p2 prep_2 OUTPUTS egg_mixture
@p3 prep_3 OUTPUTS minced_garlic
@p4 prep_4 OUTPUTS boiling_water
@p5 cook_1 TAKES boiling_water
@p6 cook_1 OUTPUTS cooked_pasta
@p7 cook_2 TAKES diced_bacon
@p8 cook_2 TAKES minced_garlic
@p9 cook_2 OUTPUTS crispy_bacon
@p10 assemble_1 TAKES cooked_pasta
@p11 assemble_1 TAKES crispy_bacon
@p12 assemble_1 OUTPUTS combined_dish
@p13 assemble_2 TAKES combined_dish
@p14 assemble_2 TAKES egg_mixture
@p15 assemble_2 OUTPUTS egg_coated_dish
@p16 assemble_3 TAKES egg_coated_dish
@p17 assemble_3 OUTPUTS final_dish
@c1 $p4 LEADS_TO $p5
@c2 $p5 LEADS_TO $p6
@c3 $p1 LEADS_TO $p7
@c4 $p3 LEADS_TO $p8
@c5 $p6 LEADS_TO $p10
@c6 $p9 LEADS_TO $p11
@c7 $p12 LEADS_TO $p13
@c8 $p15 LEADS_TO $p16
@c9 $p16 LEADS_TO $p17
@chain $c9 COMPLETES trace
@result $chain IS_A recipe_trace_proof
@proof $result PROVES $q1`,
      PROOF_NL: "9 tasks: 4 prep → 2 cook → 3 assemble. Dependencies enforce partial ordering."
    },
    {
      id: "q2", TASK_NL: "What is the resource contention for burner_1?",
      TASK_DSL: "@q2 burner_1 HAS contention",
      ANSWEAR_NL: "prep_4 and cook_1 both use burner_1. cook_1 must wait for prep_4 (sequential).",
      PROOF_DSL: `@p1 prep_4 USES burner_1
@p2 cook_1 USES burner_1
@p3 cook_1 TAKES boiling_water
@p4 prep_4 OUTPUTS boiling_water
@c1 $p1 SHARES burner_1
@c2 $p2 SHARES burner_1
@c3 $p3 REQUIRES $p4
@c4 prep_4 PRECEDES cook_1
@result $c4 IS_A resource_contention_proof
@proof $result PROVES $q2`,
      PROOF_NL: "burner_1 shared by prep_4, cook_1. Also data dependency. Must be sequential."
    },
    {
      id: "q3", TASK_NL: "What tasks can run in parallel at start?",
      TASK_DSL: "@q3 prep_tasks ENABLE parallel",
      ANSWEAR_NL: "prep_1, prep_2, prep_3 can all run parallel (no shared resources, no dependencies).",
      PROOF_DSL: `@p1 prep_1 IS_A preparation_task
@p2 prep_2 IS_A preparation_task
@p3 prep_3 IS_A preparation_task
@c1 prep_1 INDEPENDENT prep_2
@c2 prep_1 INDEPENDENT prep_3
@c3 prep_2 INDEPENDENT prep_3
@c4 $c1 ENABLES parallel
@c5 $c2 ENABLES parallel
@c6 $c3 ENABLES parallel
@result $c6 IS_A parallelism_proof
@proof $result PROVES $q3`,
      PROOF_NL: "prep_1,2,3 have no dependencies or shared resources. Full parallelism."
    },
    {
      id: "q4", TASK_NL: "What inputs does cook_2 need?",
      TASK_DSL: "@q4 cook_2 HAS inputs",
      ANSWEAR_NL: "cook_2 takes diced_bacon (from prep_1) and minced_garlic (from prep_3). 2 inputs.",
      PROOF_DSL: `@p1 cook_2 TAKES diced_bacon
@p2 cook_2 TAKES minced_garlic
@p3 prep_1 OUTPUTS diced_bacon
@p4 prep_3 OUTPUTS minced_garlic
@c1 $p1 FROM $p3
@c2 $p2 FROM $p4
@c3 $c1 COMBINES $c2
@result $c3 IS_A multi_input_proof
@proof $result PROVES $q4`,
      PROOF_NL: "cook_2 needs diced_bacon + minced_garlic. Blocked until both prep tasks done."
    },
    {
      id: "q5", TASK_NL: "Is cook_1 a process_element? (Deep hierarchy)",
      TASK_DSL: "@q5 cook_1 IS_A process_element",
      ANSWEAR_NL: "cook_1→cooking_task→recipe_task→task_type→process_element. 4-step chain.",
      PROOF_DSL: `@p1 cook_1 IS_A cooking_task
@p2 cooking_task IS_A recipe_task
@p3 recipe_task IS_A task_type
@p4 task_type IS_A process_element
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 REACHES process_element
@result $chain IS_A transitive_inheritance_proof
@proof $result PROVES $q5`,
      PROOF_NL: "4-step: cook_1→cooking→recipe→task_type→process_element."
    },
    {
      id: "q6", TASK_NL: "What is total prep time if run sequentially?",
      TASK_DSL: "@q6 prep_time SUMS total",
      ANSWEAR_NL: "prep_1(5) + prep_2(3) + prep_3(2) + prep_4(10) = 20 minutes sequential.",
      PROOF_DSL: `@p1 prep_1 DURATION 5
@p2 prep_2 DURATION 3
@p3 prep_3 DURATION 2
@p4 prep_4 DURATION 10
@c1 $p1 ADDS $p2
@c2 $c1 ADDS $p3
@c3 $c2 ADDS $p4
@total $c3 SUMS 20
@result $total IS_A duration_sum_proof
@proof $result PROVES $q6`,
      PROOF_NL: "Sequential prep: 5+3+2+10 = 20 minutes total."
    },
    {
      id: "q7", TASK_NL: "What if prep_4 fails? What is blocked?",
      TASK_DSL: "@q7 prep_4_failure BLOCKS downstream",
      ANSWEAR_NL: "prep_4 failure blocks cook_1, which blocks assemble_1, which blocks assemble_2, which blocks assemble_3. 4 tasks blocked.",
      PROOF_DSL: `@p1 prep_4 OUTPUTS boiling_water
@p2 cook_1 TAKES boiling_water
@p3 cook_1 OUTPUTS cooked_pasta
@p4 assemble_1 TAKES cooked_pasta
@p5 assemble_1 OUTPUTS combined_dish
@p6 assemble_2 TAKES combined_dish
@p7 assemble_2 OUTPUTS egg_coated_dish
@p8 assemble_3 TAKES egg_coated_dish
@c1 prep_4 BLOCKS $p1
@c2 $c1 BLOCKS $p2
@c3 $c2 BLOCKS $p3
@c4 $c3 BLOCKS $p4
@c5 $c4 BLOCKS $p5
@c6 $c5 BLOCKS $p6
@c7 $c6 BLOCKS $p7
@c8 $c7 BLOCKS $p8
@cascade $c8 CONFIRMS failure
@result $cascade IS_A failure_cascade_proof
@proof $result PROVES $q7`,
      PROOF_NL: "prep_4 failure cascades: cook_1→assemble_1→assemble_2→assemble_3. Recipe fails."
    },
    {
      id: "q8", TASK_NL: "What is the critical path time?",
      TASK_DSL: "@q8 critical_path TAKES longest",
      ANSWEAR_NL: "prep_4(10)→cook_1(12)→assemble_1→assemble_2→assemble_3 = longest path. At least 22 min for prep+cook.",
      PROOF_DSL: `@p1 prep_4 DURATION 10
@p2 cook_1 DURATION 12
@p3 prep_4 OUTPUTS boiling_water
@p4 cook_1 TAKES boiling_water
@c1 $p3 LEADS_TO $p4
@c2 $p1 ADDS $p2
@c3 $c2 SUMS 22
@critical prep_4_cook_1 IS longest
@result $critical IS_A critical_path_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Critical path: prep_4(10)+cook_1(12)=22 min. Assembly adds more time."
    }
  ]
};
