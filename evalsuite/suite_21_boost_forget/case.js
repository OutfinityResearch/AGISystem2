/**
 * Test Case: Boost Before Forgetting
 * Tests BOOST command to increase concept usage so it survives forgetting passes. Each query creates its own isolated facts to test boost/forget independently.
 * Version: 3.0
 */

module.exports = {
  id: "suite_21_boost_forget",
  name: "Boost Before Forgetting",
  description: "Tests BOOST command to increase concept usage so it survives forgetting passes. Each query creates its own isolated facts to test boost/forget independently.",
  theory: {
    natural_language: "Base theory with minimal facts. Each query will create and test its own concepts for boost/forget scenarios.",
    expected_facts: [
          "BaseEntity IS_A thing"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "Create and boost ImportantNote, then forget - should survive.",
      expected_dsl: `
        @_ ImportantNote IS_A note
        @boost ImportantNote BOOST any
        @_ any FORGET any
        @q1 ImportantNote IS_A note
      `,
      expected_answer: {
        natural_language: "Yes. ImportantNote was asserted, boosted to 5, above threshold 3.",
        truth: "TRUE_CERTAIN",
        explanation: "BOOST raises usageCount; FORGET threshold=3 removes only low-usage concepts.",
        existence: "positive"
      }
    },
    {
      id: "q2",
      natural_language: "Create ScratchNote without boosting, then forget - should be removed.",
      expected_dsl: `
        @_ ScratchNote IS_A scratch
        @_2 any FORGET any
        @q2 ScratchNote IS_A scratch
      `,
      expected_answer: {
        natural_language: "No. ScratchNote had low usage (1) and was forgotten.",
        truth: "UNKNOWN",
        explanation: "FORGET threshold=3 removes unboosted ScratchNote.",
        existence: "zero"
      }
    },
    {
      id: "q3",
      natural_language: "Create and boost CriticalItem with high value, use high threshold.",
      expected_dsl: `
        @_ CriticalItem IS_A item
        @boost2 CriticalItem BOOST any
        @_3 any FORGET any
        @q3 CriticalItem IS_A item
      `,
      expected_answer: {
        natural_language: "Yes. CriticalItem was boosted to 20, above threshold 10.",
        truth: "TRUE_CERTAIN",
        explanation: "High boost value ensures survival against high threshold.",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "Create TempItem, don't boost, use high threshold - should be removed.",
      expected_dsl: `
        @_ TempItem IS_A temp
        @_4 any FORGET any
        @q4 TempItem IS_A temp
      `,
      expected_answer: {
        natural_language: "No. TempItem was not boosted and is below threshold.",
        truth: "UNKNOWN",
        explanation: "Unboosted TempItem removed by threshold=10 forget.",
        existence: "zero"
      }
    },
    {
      id: "q5",
      natural_language: "Create HighPriority, boost to exactly threshold, should survive.",
      expected_dsl: `
        @_ HighPriority IS_A task
        @boost3 HighPriority BOOST any
        @_5 any FORGET any
        @q5 HighPriority IS_A task
      `,
      expected_answer: {
        natural_language: "Yes. Boost of 4 + initial usage of 1 = 5, equals threshold 5.",
        truth: "TRUE_CERTAIN",
        explanation: "Usage >= threshold means survival.",
        existence: "positive"
      }
    },
    {
      id: "q6",
      natural_language: "Create LowPriority, boost above threshold, should survive.",
      expected_dsl: `
        @_ LowPriority IS_A work
        @boost4 LowPriority BOOST any
        @_6 any FORGET any
        @q6 LowPriority IS_A work
      `,
      expected_answer: {
        natural_language: "Yes. LowPriority boosted to 8+1=9, above threshold 5.",
        truth: "TRUE_CERTAIN",
        explanation: "Sufficient boost ensures survival.",
        existence: "positive"
      }
    },
    {
      id: "q7",
      natural_language: "Create Essential, boost to 5, threshold 5, should survive.",
      expected_dsl: `
        @_ Essential IS_A concept
        @boost5 Essential BOOST any
        @_7 any FORGET any
        @q7 Essential IS_A concept
      `,
      expected_answer: {
        natural_language: "Yes. Essential boosted to 5+1=6, above threshold 5.",
        truth: "TRUE_CERTAIN",
        explanation: "Usage 6 >= threshold 5 means survival.",
        existence: "positive"
      }
    },
    {
      id: "q8",
      natural_language: "Create Disposable, no boost, threshold 5, should be removed.",
      expected_dsl: `
        @_ Disposable IS_A junk
        @_8 any FORGET any
        @q8 Disposable IS_A junk
      `,
      expected_answer: {
        natural_language: "No. Disposable had no boost (usage=1), below threshold 5.",
        truth: "UNKNOWN",
        explanation: "Unboosted concept removed by forget.",
        existence: "zero"
      }
    }
  ],
  version: "3.0"
};
