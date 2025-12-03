/**
 * Test Case: Tool Chain Planning - Web Scraping Pipeline
 * Tests multi-step tool chain planning with DSL-validatable proof chains. Each query verifies dependencies and data flow using multi-statement DSL that can be executed without LLM.
 * Version: 3.0
 */

module.exports = {
  id: "suite_26_tool_planning",
  name: "Tool Chain Planning - Web Scraping Pipeline",
  description: "Tests multi-step tool chain planning with DSL-validatable proof chains. Each query verifies dependencies and data flow using multi-statement DSL that can be executed without LLM.",
  theory: {
    natural_language: "TOOL DEFINITIONS: The fetch_url tool takes a url parameter and produces raw_html output. The parse_html tool takes raw_html parameter and produces dom_tree output. The extract_data tool takes dom_tree and selector parameters and produces extracted_list output. The transform_json tool takes extracted_list parameter and produces json_data output. The save_file tool takes json_data and filepath parameters and produces saved_file output. The compress_archive tool takes saved_file parameter and produces archive output. COMPOSITION RULES: To get dom_tree you must first fetch_url then parse_html. To get json_data you must first have extracted_list. EXECUTION SEQUENCE: Step 1 is fetch_url with url parameter. Step 2 is parse_html with raw_html from step 1. Step 3 is extract_data with dom_tree from step 2. Step 4 is transform_json with extracted_list from step 3. Step 5 is save_file with json_data from step 4. Step 6 is compress_archive with saved_file from step 5.",
    expected_facts: [
          "fetch_url TAKES url",
          "fetch_url PRODUCES raw_html",
          "parse_html TAKES raw_html",
          "parse_html PRODUCES dom_tree",
          "extract_data TAKES dom_tree",
          "extract_data TAKES selector",
          "extract_data PRODUCES extracted_list",
          "transform_json TAKES extracted_list",
          "transform_json PRODUCES json_data",
          "save_file TAKES json_data",
          "save_file TAKES filepath",
          "save_file PRODUCES saved_file",
          "compress_archive TAKES saved_file",
          "compress_archive PRODUCES archive",
          "json_data REQUIRES_FIRST extracted_list",
          "step_1 EXECUTES fetch_url",
          "step_1 WITH_PARAM url",
          "step_2 EXECUTES parse_html",
          "step_2 INPUT_FROM step_1",
          "step_3 EXECUTES extract_data",
          "step_3 INPUT_FROM step_2",
          "step_3 WITH_PARAM selector",
          "step_4 EXECUTES transform_json",
          "step_4 INPUT_FROM step_3",
          "step_5 EXECUTES save_file",
          "step_5 INPUT_FROM step_4",
          "step_5 WITH_PARAM filepath",
          "step_6 EXECUTES compress_archive",
          "step_6 INPUT_FROM step_5"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "PLAN STEP 1: What is the first tool and what parameter does it need?",
      expected_dsl: `
        @exec step_1 EXECUTES fetch_url
        @param step_1 WITH_PARAM url
        @q1 $exec AND $param
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
      natural_language: "DEPENDENCY CHECK: What does parse_html need before it can run?",
      expected_dsl: `
        @takes parse_html TAKES raw_html
        @produces fetch_url PRODUCES raw_html
        @q2 $takes AND $produces
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
      natural_language: "PLAN STEP 3: What inputs does extract_data need?",
      expected_dsl: `
        @input1 extract_data TAKES dom_tree
        @input2 extract_data TAKES selector
        @q3 $input1 AND $input2
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
      natural_language: "DATA FLOW: Verify the chain from step_2 to step_4",
      expected_dsl: `
        @flow1 step_3 INPUT_FROM step_2
        @flow2 step_4 INPUT_FROM step_3
        @q4 $flow1 AND $flow2
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
      natural_language: "GOAL DECOMPOSITION: What sequence produces json_data?",
      expected_dsl: `
        @req json_data REQUIRES_FIRST extracted_list
        @produces transform_json PRODUCES json_data
        @takes transform_json TAKES extracted_list
        @chain1 $req AND $produces
        @q5 $chain1 AND $takes
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
      natural_language: "PARAMETER MAPPING: Which steps need configuration parameters?",
      expected_dsl: `
        @config1 step_1 WITH_PARAM url
        @config2 step_3 WITH_PARAM selector
        @config3 step_5 WITH_PARAM filepath
        @c1 $config1 AND $config2
        @q6 $c1 AND $config3
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
      natural_language: "FINAL STEP: What produces the archive output?",
      expected_dsl: `
        @produces compress_archive PRODUCES archive
        @takes compress_archive TAKES saved_file
        @q7 $produces AND $takes
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
      natural_language: "FULL CHAIN: Verify the complete 6-step pipeline",
      expected_dsl: `
        @s1 step_1 EXECUTES fetch_url
        @s2 step_2 EXECUTES parse_html
        @s3 step_3 EXECUTES extract_data
        @s4 step_4 EXECUTES transform_json
        @s5 step_5 EXECUTES save_file
        @s6 step_6 EXECUTES compress_archive
        @early $s1 AND $s2
        @mid1 $s3 AND $s4
        @mid2 $s5 AND $s6
        @half1 $early AND $mid1
        @q8 $half1 AND $mid2
      `,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    }
  ],
};
