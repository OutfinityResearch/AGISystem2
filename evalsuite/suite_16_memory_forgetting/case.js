/**
 * Test Case: Memory Management - Concept Classification
 * Tests concept classification queries for importance levels
 * Version: 3.0
 */

module.exports = {
  id: "suite_16_memory_forgetting",
  name: "Memory Management - Concept Classification",
  description: "Tests concept classification queries for different importance levels.",
  theory_NL: "We have several concepts: KeepMe is important, DropMe is temporary, CoreConcept is essential, TempData is throwaway, Archive is old data, Critical is vital, Scratch1 and Scratch2 are scratch items.",
  theory_DSL: [
    "KeepMe IS_A important_thing",
    "DropMe IS_A temporary_thing",
    "CoreConcept IS_A essential_thing",
    "TempData IS_A throwaway_thing",
    "Archive IS_A old_data",
    "Critical IS_A vital_thing",
    "Scratch1 IS_A scratch_item",
    "Scratch2 IS_A scratch_item"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is KeepMe an important thing?",
      TASK_DSL: "@q1 KeepMe IS_A important_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, KeepMe is an important thing."
    },
    {
      id: "q2",
      TASK_NL: "Is DropMe a temporary thing?",
      TASK_DSL: "@q2 DropMe IS_A temporary_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, DropMe is a temporary thing."
    },
    {
      id: "q3",
      TASK_NL: "Is CoreConcept an essential thing?",
      TASK_DSL: "@q3 CoreConcept IS_A essential_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, CoreConcept is an essential thing."
    },
    {
      id: "q4",
      TASK_NL: "Is TempData a throwaway thing?",
      TASK_DSL: "@q4 TempData IS_A throwaway_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, TempData is a throwaway thing."
    },
    {
      id: "q5",
      TASK_NL: "Is Archive old data?",
      TASK_DSL: "@q5 Archive IS_A old_data",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Archive is old data."
    },
    {
      id: "q6",
      TASK_NL: "Is Critical a vital thing?",
      TASK_DSL: "@q6 Critical IS_A vital_thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Critical is a vital thing."
    },
    {
      id: "q7",
      TASK_NL: "Is Scratch1 a scratch item?",
      TASK_DSL: "@q7 Scratch1 IS_A scratch_item",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Scratch1 is a scratch item."
    },
    {
      id: "q8",
      TASK_NL: "Is Scratch2 a scratch item?",
      TASK_DSL: "@q8 Scratch2 IS_A scratch_item",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Scratch2 is a scratch item."
    }
  ],
};
