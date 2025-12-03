/**
 * Test Case: Boost Forget - Task Priority Classification
 * Tests task and item priority classification queries
 * Version: 3.0
 */

module.exports = {
  id: "suite_21_boost_forget",
  name: "Boost Forget - Task Priority Classification",
  description: "Tests task and item priority classification queries.",
  theory_NL: "We have various items with different classifications: ImportantNote is a note, CriticalItem is an item, HighPriority is a task, LowPriority is work, Essential is a concept, BaseEntity is a thing.",
  theory_DSL: [
    "BaseEntity IS_A thing",
    "ImportantNote IS_A note",
    "CriticalItem IS_A item",
    "HighPriority IS_A task",
    "LowPriority IS_A work",
    "Essential IS_A concept",
    "ScratchNote IS_A scratch",
    "TempItem IS_A temp"
  ],
  tasks: [
    {
      id: "q1",
      TASK_NL: "Is ImportantNote a note?",
      TASK_DSL: "@q1 ImportantNote IS_A note",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, ImportantNote is a note."
    },
    {
      id: "q2",
      TASK_NL: "Is ScratchNote a scratch?",
      TASK_DSL: "@q2 ScratchNote IS_A scratch",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, ScratchNote is a scratch."
    },
    {
      id: "q3",
      TASK_NL: "Is CriticalItem an item?",
      TASK_DSL: "@q3 CriticalItem IS_A item",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, CriticalItem is an item."
    },
    {
      id: "q4",
      TASK_NL: "Is TempItem a temp?",
      TASK_DSL: "@q4 TempItem IS_A temp",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, TempItem is a temp."
    },
    {
      id: "q5",
      TASK_NL: "Is HighPriority a task?",
      TASK_DSL: "@q5 HighPriority IS_A task",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, HighPriority is a task."
    },
    {
      id: "q6",
      TASK_NL: "Is LowPriority work?",
      TASK_DSL: "@q6 LowPriority IS_A work",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, LowPriority is work."
    },
    {
      id: "q7",
      TASK_NL: "Is Essential a concept?",
      TASK_DSL: "@q7 Essential IS_A concept",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, Essential is a concept."
    },
    {
      id: "q8",
      TASK_NL: "Is BaseEntity a thing?",
      TASK_DSL: "@q8 BaseEntity IS_A thing",
      ANSWEAR_DSL: "{\"truth\": \"TRUE_CERTAIN\"}",
      ANSWEAR_NL: "Yes, BaseEntity is a thing."
    }
  ],
};
