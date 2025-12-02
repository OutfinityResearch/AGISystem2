/**
 * Test Case: Polarity Decision with FACTS_MATCHING
 * Exercises FACTS_MATCHING, LITERAL list binding, and POLARITY_DECIDE to ensure negative vs positive regulatory hits drive truth outcomes across multiple scenarios.
 * Version: 3.0
 */

module.exports = {
  id: "suite_18_polarity_decision",
  name: "Polarity Decision with FACTS_MATCHING",
  description: "Exercises FACTS_MATCHING, LITERAL list binding, and POLARITY_DECIDE to ensure negative vs positive regulatory hits drive truth outcomes across multiple scenarios.",
  theory: {
    natural_language: "Multiple drugs and products with different regulatory statuses across regions. DrugA is prohibited in EU but permitted in US. DrugB is permitted everywhere. DrugC is prohibited everywhere. ProductX has mixed status. We test various polarity decision scenarios.",
    expected_facts: [
          "drugA PROHIBITED_IN eu",
          "drugA PERMITTED_IN us",
          "drugB PERMITTED_IN eu",
          "drugB PERMITTED_IN us",
          "drugC PROHIBITED_IN eu",
          "drugC PROHIBITED_IN us",
          "productX PERMITTED_IN us",
          "productX PROHIBITED_IN asia"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "For EU, does negative evidence dominate for drugA?",
      expected_dsl: `
        @neg drugA FACTS any PROHIBITED_IN
        @pos drugA FACTS any PERMITTED_IN
        @regsEU LITERAL ["eu"]
        @q1 POLARITY_DECIDE $neg $pos $regsEU
      `,
      expected_answer: {
        natural_language: "EU has a prohibition, so the decision should be negative.",
        truth: "FALSE",
        explanation: "POLARITY_DECIDE sees a negative hit for eu and no positive, returning FALSE.",
        existence: "negative"
      }
    },
    {
      id: "q2",
      natural_language: "For US, does positive evidence win for drugA?",
      expected_dsl: `
        @regsUS LITERAL ["us"]
        @q2 POLARITY_DECIDE $neg $pos $regsUS
      `,
      expected_answer: {
        natural_language: "US has a permission fact and no prohibition, so the decision should be true.",
        truth: "TRUE_CERTAIN",
        explanation: "POLARITY_DECIDE finds only positive evidence for us.",
        existence: "positive"
      }
    },
    {
      id: "q3",
      natural_language: "Is drugB permitted in EU (only positive evidence)?",
      expected_dsl: `
        @negB drugB FACTS any PROHIBITED_IN
        @posB drugB FACTS any PERMITTED_IN
        @regsEU2 LITERAL ["eu"]
        @q3 POLARITY_DECIDE $negB $posB $regsEU2
      `,
      expected_answer: {
        natural_language: "Yes. DrugB has only permission facts, no prohibitions.",
        truth: "TRUE_CERTAIN",
        explanation: "No negative evidence exists for drugB in EU.",
        existence: "positive"
      }
    },
    {
      id: "q4",
      natural_language: "Is drugB permitted in US as well?",
      expected_dsl: `
        @regsUS2 LITERAL ["us"]
        @q4 POLARITY_DECIDE $negB $posB $regsUS2
      `,
      expected_answer: {
        natural_language: "Yes. DrugB is permitted in US too.",
        truth: "TRUE_CERTAIN",
        explanation: "Positive evidence only for drugB in US.",
        existence: "positive"
      }
    },
    {
      id: "q5",
      natural_language: "Is drugC prohibited in EU (only negative evidence)?",
      expected_dsl: `
        @negC drugC FACTS any PROHIBITED_IN
        @posC drugC FACTS any PERMITTED_IN
        @regsEU3 LITERAL ["eu"]
        @q5 POLARITY_DECIDE $negC $posC $regsEU3
      `,
      expected_answer: {
        natural_language: "Yes, decision is FALSE because drugC is prohibited in EU.",
        truth: "FALSE",
        explanation: "Only negative evidence for drugC in EU.",
        existence: "negative"
      }
    },
    {
      id: "q6",
      natural_language: "Is drugC also prohibited in US?",
      expected_dsl: `
        @regsUS3 LITERAL ["us"]
        @q6 POLARITY_DECIDE $negC $posC $regsUS3
      `,
      expected_answer: {
        natural_language: "Yes, decision is FALSE because drugC is prohibited in US too.",
        truth: "FALSE",
        explanation: "DrugC has prohibitions in both regions.",
        existence: "negative"
      }
    },
    {
      id: "q7",
      natural_language: "What about productX in US (positive only)?",
      expected_dsl: `
        @negX productX FACTS any PROHIBITED_IN
        @posX productX FACTS any PERMITTED_IN
        @regsUS4 LITERAL ["us"]
        @q7 POLARITY_DECIDE $negX $posX $regsUS4
      `,
      expected_answer: {
        natural_language: "ProductX is permitted in US.",
        truth: "TRUE_CERTAIN",
        explanation: "Only positive evidence for productX in US.",
        existence: "positive"
      }
    },
    {
      id: "q8",
      natural_language: "What about productX in Asia (negative only)?",
      expected_dsl: `
        @regsAsia LITERAL ["asia"]
        @q8 POLARITY_DECIDE $negX $posX $regsAsia
      `,
      expected_answer: {
        natural_language: "ProductX is prohibited in Asia.",
        truth: "FALSE",
        explanation: "Only negative evidence for productX in Asia.",
        existence: "negative"
      }
    }
  ],
  version: "3.0"
};
