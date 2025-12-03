/**
 * Test Case: Comprehensive Tool Planning - Pipeline Dependency Analysis
 * Tests tool chain dependencies, data flow, and execution ordering
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_26_tool_planning",
  name: "Comprehensive Tool Planning - Pipeline Dependency Analysis",

  theory_NL: "Web scraping pipeline: fetch_url(url)→raw_html. parse_html(raw_html)→dom_tree. extract_data(dom_tree,selector)→extracted_list. transform_json(extracted_list)→json_data. save_file(json_data,filepath)→saved_file. compress_archive(saved_file)→archive. Steps must execute in dependency order.",

  theory_DSL: [
    "fetch_url TAKES url", "fetch_url PRODUCES raw_html",
    "parse_html TAKES raw_html", "parse_html PRODUCES dom_tree",
    "extract_data TAKES dom_tree", "extract_data TAKES selector", "extract_data PRODUCES extracted_list",
    "transform_json TAKES extracted_list", "transform_json PRODUCES json_data",
    "save_file TAKES json_data", "save_file TAKES filepath", "save_file PRODUCES saved_file",
    "compress_archive TAKES saved_file", "compress_archive PRODUCES archive",
    "step_1 EXECUTES fetch_url", "step_2 EXECUTES parse_html", "step_3 EXECUTES extract_data",
    "step_4 EXECUTES transform_json", "step_5 EXECUTES save_file", "step_6 EXECUTES compress_archive",
    "raw_html FLOWS_TO parse_html", "dom_tree FLOWS_TO extract_data",
    "extracted_list FLOWS_TO transform_json", "json_data FLOWS_TO save_file", "saved_file FLOWS_TO compress_archive",
    "step_2 MUST_PRECEDE step_3", "pipeline HAS 6_stages"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace full pipeline: url → archive",
      TASK_DSL: "@q1 pipeline HAS 6_stages",
      ANSWEAR_NL: "url→fetch→raw_html→parse→dom_tree→extract→list→transform→json→save→file→compress→archive",
      PROOF_DSL: `@p1 fetch_url TAKES url
@p2 fetch_url PRODUCES raw_html
@p3 parse_html PRODUCES dom_tree
@p4 extract_data PRODUCES extracted_list
@p5 transform_json PRODUCES json_data
@p6 save_file PRODUCES saved_file
@p7 compress_archive PRODUCES archive
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p3
@c3 $p3 LEADS_TO $p4
@c4 $p4 LEADS_TO $p5
@c5 $p5 LEADS_TO $p6
@c6 $p6 LEADS_TO $p7
@c7 $c1 EXTENDS $c2
@c8 $c7 EXTENDS $c3
@chain $c8 COMPLETES pipeline
@result $chain IS_A pipeline_trace_proof
@proof $result PROVES $q1`,
      PROOF_NL: "6-stage pipeline: fetch→parse→extract→transform→save→compress."
    },
    {
      id: "q2", TASK_NL: "What does extract_data need?",
      TASK_DSL: "@q2 extract_data TAKES dom_tree",
      ANSWEAR_NL: "extract_data needs dom_tree (from parse) AND selector (user input). 2 inputs.",
      PROOF_DSL: `@p1 extract_data TAKES dom_tree
@p2 extract_data TAKES selector
@p3 parse_html PRODUCES dom_tree
@c1 $p1 REQUIRES $p3
@c2 $p2 FROM user_input
@c3 $c1 COMBINES $c2
@c4 $c3 NEEDS 2_inputs
@result $c4 IS_A dependency_proof
@proof $result PROVES $q2`,
      PROOF_NL: "extract_data needs 2 inputs: dom_tree (pipeline) + selector (user)."
    },
    {
      id: "q3", TASK_NL: "Can step_3 run before step_2?",
      TASK_DSL: "@q3 step_2 MUST_PRECEDE step_3",
      ANSWEAR_NL: "No. step_3 (extract) needs dom_tree, which step_2 (parse) produces. Dependency constraint.",
      PROOF_DSL: `@p1 step_2 EXECUTES parse_html
@p2 step_3 EXECUTES extract_data
@p3 parse_html PRODUCES dom_tree
@p4 extract_data TAKES dom_tree
@c1 $p1 LEADS_TO $p3
@c2 $p2 LEADS_TO $p4
@c3 $p4 REQUIRES $p3
@c4 $c3 ESTABLISHES dependency
@c5 step_2 MUST_PRECEDE step_3
@c6 $c4 ENFORCES $c5
@result $c6 IS_A ordering_constraint_proof
@proof $result PROVES $q3`,
      PROOF_NL: "extract needs dom_tree, parse produces it. step_2 must precede step_3."
    },
    {
      id: "q4", TASK_NL: "What is the data type at each stage?",
      TASK_DSL: "@q4 stages PRODUCE data_types",
      ANSWEAR_NL: "url(string)→raw_html(text)→dom_tree(structure)→list(array)→json(object)→file(path)→archive(binary)",
      PROOF_DSL: `@p1 fetch_url PRODUCES raw_html
@p2 parse_html PRODUCES dom_tree
@p3 extract_data PRODUCES extracted_list
@p4 transform_json PRODUCES json_data
@p5 save_file PRODUCES saved_file
@p6 compress_archive PRODUCES archive
@c1 $p1 OUTPUTS raw_html
@c2 $p2 OUTPUTS dom_tree
@c3 $p3 OUTPUTS extracted_list
@c4 $p4 OUTPUTS json_data
@c5 $p5 OUTPUTS saved_file
@c6 $p6 OUTPUTS archive
@c7 $c1 COMBINES $c2
@chain $c7 COMPLETES type_list
@result $chain IS_A type_trace_proof
@proof $result PROVES $q4`,
      PROOF_NL: "6 data types flow through pipeline, each stage transforms type."
    },
    {
      id: "q5", TASK_NL: "Which tools have multiple inputs?",
      TASK_DSL: "@q5 extract_data TAKES selector",
      ANSWEAR_NL: "extract_data (dom_tree, selector) and save_file (json_data, filepath). 2 tools.",
      PROOF_DSL: `@p1 extract_data TAKES dom_tree
@p2 extract_data TAKES selector
@p3 save_file TAKES json_data
@p4 save_file TAKES filepath
@c1 $p1 COMBINES $p2
@c2 $c1 PROVES extract_multi
@c3 $p3 COMBINES $p4
@c4 $c3 PROVES save_multi
@c5 $c2 COMBINES $c4
@c6 $c5 TOTALS 2_tools
@result $c6 IS_A multi_input_proof
@proof $result PROVES $q5`,
      PROOF_NL: "extract_data (2 inputs) and save_file (2 inputs). Both need multiple."
    },
    {
      id: "q6", TASK_NL: "What is minimum steps to get json_data?",
      TASK_DSL: "@q6 transform_json PRODUCES json_data",
      ANSWEAR_NL: "url→fetch→parse→extract→transform = 4 steps to json_data.",
      PROOF_DSL: `@p1 step_1 EXECUTES fetch_url
@p2 step_2 EXECUTES parse_html
@p3 step_3 EXECUTES extract_data
@p4 step_4 EXECUTES transform_json
@p5 transform_json PRODUCES json_data
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@c4 $c3 LEADS_TO $p5
@c5 $c4 NEEDS 4_steps
@result $c5 IS_A minimum_path_proof
@proof $result PROVES $q6`,
      PROOF_NL: "4 steps: fetch→parse→extract→transform→json_data."
    },
    {
      id: "q7", TASK_NL: "What if parse_html fails?",
      TASK_DSL: "@q7 parse_failure BLOCKS downstream",
      ANSWEAR_NL: "No dom_tree → extract blocked → transform blocked → save blocked → compress blocked. 4 steps blocked.",
      PROOF_DSL: `@p1 parse_html PRODUCES dom_tree
@p2 extract_data TAKES dom_tree
@p3 transform_json TAKES extracted_list
@p4 save_file TAKES json_data
@p5 compress_archive TAKES saved_file
@c1 parse_failure BLOCKS $p1
@c2 $c1 BLOCKS $p2
@c3 $c2 BLOCKS $p3
@c4 $c3 BLOCKS $p4
@c5 $c4 BLOCKS $p5
@c6 $c5 CASCADES 4_downstream
@result $c6 IS_A failure_cascade_proof
@proof $result PROVES $q7`,
      PROOF_NL: "parse failure cascades: extract, transform, save, compress all blocked."
    },
    {
      id: "q8", TASK_NL: "List execution order for full pipeline",
      TASK_DSL: "@q8 execution_order IS sequential",
      ANSWEAR_NL: "step_1 (fetch) → step_2 (parse) → step_3 (extract) → step_4 (transform) → step_5 (save) → step_6 (compress)",
      PROOF_DSL: `@p1 step_1 EXECUTES fetch_url
@p2 step_2 EXECUTES parse_html
@p3 step_3 EXECUTES extract_data
@p4 step_4 EXECUTES transform_json
@p5 step_5 EXECUTES save_file
@p6 step_6 EXECUTES compress_archive
@p7 raw_html FLOWS_TO parse_html
@p8 dom_tree FLOWS_TO extract_data
@c1 $p1 PRECEDES $p2
@c2 $p2 PRECEDES $p3
@c3 $p3 PRECEDES $p4
@c4 $p4 PRECEDES $p5
@c5 $p5 PRECEDES $p6
@c6 $p7 CONFIRMS $c1
@c7 $p8 CONFIRMS $c2
@chain $c5 COMPLETES order
@result $chain IS_A execution_order_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Linear order: step_1→2→3→4→5→6 based on data dependencies."
    }
  ]
};
