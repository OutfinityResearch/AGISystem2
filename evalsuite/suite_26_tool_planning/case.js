/**
 * Test Case: Comprehensive Tool Planning - Pipeline Dependency Analysis
 * Tests tool chain dependencies, data flow, and execution ordering
 * Version: 5.0 - Complex proofs with dependency chains and data flow analysis
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
    "extracted_list FLOWS_TO transform_json", "json_data FLOWS_TO save_file", "saved_file FLOWS_TO compress_archive"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace full pipeline: url → archive",
      TASK_DSL: "@q1 pipeline FULL_TRACE",
      ANSWEAR_NL: "url→fetch→raw_html→parse→dom_tree→extract→list→transform→json→save→file→compress→archive",
      PROOF_DSL: `@p1 fetch_url TAKES url
@p2 fetch_url PRODUCES raw_html
@p3 parse_html PRODUCES dom_tree
@p4 extract_data PRODUCES extracted_list
@p5 transform_json PRODUCES json_data
@p6 save_file PRODUCES saved_file
@p7 compress_archive PRODUCES archive
@flow1 $p1 LEADS_TO $p2
@flow2 $p2 LEADS_TO $p3
@flow3 $p3 LEADS_TO $p4
@flow4 $p4 LEADS_TO $p5
@flow5 $p5 LEADS_TO $p6
@flow6 $p6 LEADS_TO $p7
@chain $flow1 THROUGH $flow6
@stages 6 TRANSFORMATIONS
@result $chain IS_A pipeline_trace_proof
@proof $result PROVES $q1`,
      PROOF_NL: "6-stage pipeline: fetch→parse→extract→transform→save→compress."
    },
    {
      id: "q2", TASK_NL: "What does extract_data need?",
      TASK_DSL: "@q2 extract_data DEPENDENCIES listed",
      ANSWEAR_NL: "extract_data needs dom_tree (from parse) AND selector (user input). 2 inputs.",
      PROOF_DSL: `@p1 extract_data TAKES dom_tree
@p2 extract_data TAKES selector
@p3 parse_html PRODUCES dom_tree
@dep1 $p1 FROM $p3
@dep2 $p2 FROM user_input
@both $dep1 AND $dep2
@count 2 INPUTS required
@result $both IS_A dependency_proof
@proof $result PROVES $q2`,
      PROOF_NL: "extract_data needs 2 inputs: dom_tree (pipeline) + selector (user)."
    },
    {
      id: "q3", TASK_NL: "Can step_3 run before step_2?",
      TASK_DSL: "@q3 step_order CONSTRAINT_CHECK",
      ANSWEAR_NL: "No. step_3 (extract) needs dom_tree, which step_2 (parse) produces. Dependency constraint.",
      PROOF_DSL: `@p1 step_2 EXECUTES parse_html
@p2 step_3 EXECUTES extract_data
@p3 parse_html PRODUCES dom_tree
@p4 extract_data TAKES dom_tree
@produces $p1 LEADS_TO $p3
@needs $p2 LEADS_TO $p4
@dependency $p4 REQUIRES $p3
@order step_2 MUST_PRECEDE step_3
@violate step_3_before_step_2 BLOCKS $dependency
@result $order IS_A ordering_constraint_proof
@proof $result PROVES $q3`,
      PROOF_NL: "extract needs dom_tree, parse produces it. step_2 must precede step_3."
    },
    {
      id: "q4", TASK_NL: "What is the data type at each stage?",
      TASK_DSL: "@q4 data_types TRACED",
      ANSWEAR_NL: "url(string)→raw_html(text)→dom_tree(structure)→list(array)→json(object)→file(path)→archive(binary)",
      PROOF_DSL: `@p1 fetch_url PRODUCES raw_html
@p2 parse_html PRODUCES dom_tree
@p3 extract_data PRODUCES extracted_list
@p4 transform_json PRODUCES json_data
@p5 save_file PRODUCES saved_file
@p6 compress_archive PRODUCES archive
@types raw_html dom_tree extracted_list json_data saved_file archive
@count 6 DATA_TYPES in_pipeline
@result $types IS_A type_trace_proof
@proof $result PROVES $q4`,
      PROOF_NL: "6 data types flow through pipeline, each stage transforms type."
    },
    {
      id: "q5", TASK_NL: "Which tools have multiple inputs?",
      TASK_DSL: "@q5 multi_input_tools IDENTIFIED",
      ANSWEAR_NL: "extract_data (dom_tree, selector) and save_file (json_data, filepath). 2 tools.",
      PROOF_DSL: `@p1 extract_data TAKES dom_tree
@p2 extract_data TAKES selector
@p3 save_file TAKES json_data
@p4 save_file TAKES filepath
@multi1 $p1 AND $p2 MEANS extract_multi
@multi2 $p3 AND $p4 MEANS save_multi
@tools $multi1 AND $multi2
@count 2 MULTI_INPUT tools
@result $tools IS_A multi_input_proof
@proof $result PROVES $q5`,
      PROOF_NL: "extract_data (2 inputs) and save_file (2 inputs). Both need multiple."
    },
    {
      id: "q6", TASK_NL: "What is minimum steps to get json_data?",
      TASK_DSL: "@q6 json_data MINIMUM_PATH",
      ANSWEAR_NL: "url→fetch→parse→extract→transform = 4 steps to json_data.",
      PROOF_DSL: `@p1 step_1 EXECUTES fetch_url
@p2 step_2 EXECUTES parse_html
@p3 step_3 EXECUTES extract_data
@p4 step_4 EXECUTES transform_json
@p5 transform_json PRODUCES json_data
@path $p1 THEN $p2 THEN $p3 THEN $p4
@reaches $path PRODUCES json_data
@count 4 STEPS minimum
@result $count IS_A minimum_path_proof
@proof $result PROVES $q6`,
      PROOF_NL: "4 steps: fetch→parse→extract→transform→json_data."
    },
    {
      id: "q7", TASK_NL: "What if parse_html fails?",
      TASK_DSL: "@q7 parse_failure CASCADE",
      ANSWEAR_NL: "No dom_tree → extract blocked → transform blocked → save blocked → compress blocked. 4 steps blocked.",
      PROOF_DSL: `@p1 parse_html PRODUCES dom_tree
@p2 extract_data TAKES dom_tree
@p3 transform_json TAKES extracted_list
@p4 save_file TAKES json_data
@p5 compress_archive TAKES saved_file
@fail parse_html FAILS
@block1 $fail BLOCKS $p1
@block2 $block1 BLOCKS $p2
@block3 $block2 BLOCKS $p3
@block4 $block3 BLOCKS $p4
@block5 $block4 BLOCKS $p5
@cascade 4 DOWNSTREAM blocked
@result $cascade IS_A failure_cascade_proof
@proof $result PROVES $q7`,
      PROOF_NL: "parse failure cascades: extract, transform, save, compress all blocked."
    },
    {
      id: "q8", TASK_NL: "List execution order for full pipeline",
      TASK_DSL: "@q8 execution_order COMPLETE",
      ANSWEAR_NL: "step_1 (fetch) → step_2 (parse) → step_3 (extract) → step_4 (transform) → step_5 (save) → step_6 (compress)",
      PROOF_DSL: `@p1 step_1 EXECUTES fetch_url
@p2 step_2 EXECUTES parse_html
@p3 step_3 EXECUTES extract_data
@p4 step_4 EXECUTES transform_json
@p5 step_5 EXECUTES save_file
@p6 step_6 EXECUTES compress_archive
@order $p1 THEN $p2 THEN $p3 THEN $p4 THEN $p5 THEN $p6
@deps raw_html FLOWS_TO parse_html
@deps2 dom_tree FLOWS_TO extract_data
@verify $deps AND $deps2 CONFIRM order
@result $order IS_A execution_order_proof
@proof $result PROVES $q8`,
      PROOF_NL: "Linear order: step_1→2→3→4→5→6 based on data dependencies."
    }
  ]
};
