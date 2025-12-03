/**
 * Test Case: Comprehensive CI/CD Pipeline - Dependency Chain Analysis
 * Tests pipeline stage dependencies, failure cascades, and execution ordering
 * Version: 5.1 - Fixed PROOF_DSL format (strict triples)
 */
module.exports = {
  id: "suite_27_workflow_planning",
  name: "Comprehensive CI/CD Pipeline - Dependency Chain Analysis",

  theory_NL: "CI/CD pipeline with 8 stages. checkout→build→unit_test→security→deploy_staging→integration_test→approval→deploy_prod. Each stage produces artifacts consumed by next. checkout produces source_code. build takes source_code, produces artifact_bundle. unit_test takes artifact_bundle, produces test_report. security takes artifact_bundle, produces vulnerability_report. deploy_staging takes artifact_bundle, produces staging_deployment. integration_test takes staging_deployment, produces integration_report. approval takes integration_report, produces approval_status. deploy_prod requires approval_status, produces production_deployment. Failures cascade downstream. Stage types: checkout,build are build_stage; unit_test,security are quality_stage; deploy_staging,deploy_prod are deploy_stage.",

  theory_DSL: [
    "checkout EXECUTES git_clone", "checkout PRODUCES source_code", "checkout IS_A build_stage",
    "build EXECUTES npm_build", "build TAKES source_code", "build PRODUCES artifact_bundle", "build IS_A build_stage",
    "unit_test EXECUTES jest_runner", "unit_test TAKES artifact_bundle", "unit_test PRODUCES test_report", "unit_test IS_A quality_stage",
    "security EXECUTES snyk_scan", "security TAKES artifact_bundle", "security PRODUCES vulnerability_report", "security IS_A quality_stage",
    "deploy_staging EXECUTES kubectl_apply", "deploy_staging TAKES artifact_bundle", "deploy_staging PRODUCES staging_deployment", "deploy_staging IS_A deploy_stage",
    "integration_test EXECUTES cypress_run", "integration_test TAKES staging_deployment", "integration_test PRODUCES integration_report", "integration_test IS_A quality_stage",
    "approval EXECUTES manual_review", "approval TAKES integration_report", "approval PRODUCES approval_status", "approval IS_A approval_stage",
    "deploy_prod EXECUTES kubectl_apply", "deploy_prod REQUIRES approval_status", "deploy_prod PRODUCES production_deployment", "deploy_prod IS_A deploy_stage",
    "source_code FLOWS_TO build", "artifact_bundle FLOWS_TO unit_test", "artifact_bundle FLOWS_TO security",
    "artifact_bundle FLOWS_TO deploy_staging", "staging_deployment FLOWS_TO integration_test",
    "integration_report FLOWS_TO approval", "approval_status FLOWS_TO deploy_prod",
    "build_stage IS_A pipeline_stage", "quality_stage IS_A pipeline_stage", "deploy_stage IS_A pipeline_stage", "approval_stage IS_A pipeline_stage",
    "pipeline_stage IS_A workflow_element", "workflow_element IS_A process_component",
    "failure BLOCKS downstream_stages", "unit_test_failure IS_A failure", "security_failure IS_A failure",
    "integration_test_failure IS_A failure", "build_failure IS_A failure"
  ],

  tasks: [
    {
      id: "q1", TASK_NL: "Trace full pipeline: source_code → production_deployment",
      TASK_DSL: "@q1 checkout PROVISIONS production_deployment",
      ANSWEAR_NL: "checkout→build→(test+security)→staging→integration→approval→prod. 8-stage pipeline.",
      PROOF_DSL: `@p1 checkout PRODUCES source_code
@p2 build TAKES source_code
@p3 build PRODUCES artifact_bundle
@p4 unit_test TAKES artifact_bundle
@p5 unit_test PRODUCES test_report
@p6 security TAKES artifact_bundle
@p7 security PRODUCES vulnerability_report
@p8 deploy_staging TAKES artifact_bundle
@p9 deploy_staging PRODUCES staging_deployment
@p10 integration_test TAKES staging_deployment
@p11 integration_test PRODUCES integration_report
@p12 approval TAKES integration_report
@p13 approval PRODUCES approval_status
@p14 deploy_prod REQUIRES approval_status
@p15 deploy_prod PRODUCES production_deployment
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p3
@c3 $p3 LEADS_TO $p4
@c4 $p4 LEADS_TO $p5
@c5 $p3 LEADS_TO $p8
@c6 $p8 LEADS_TO $p9
@c7 $p9 LEADS_TO $p10
@c8 $p10 LEADS_TO $p11
@c9 $p11 LEADS_TO $p12
@c10 $p12 LEADS_TO $p13
@c11 $p13 LEADS_TO $p14
@c12 $p14 LEADS_TO $p15
@chain $c12 COMPLETES trace
@result $chain IS_A pipeline_trace_proof
@proof $result PROVES $q1`,
      PROOF_NL: "8-stage pipeline: checkout→build→test/security→staging→integration→approval→prod."
    },
    {
      id: "q2", TASK_NL: "What if build fails? What stages are blocked?",
      TASK_DSL: "@q2 build_failure BLOCKS downstream",
      ANSWEAR_NL: "Build failure blocks all downstream: unit_test, security, deploy_staging, integration_test, approval, deploy_prod. 6 stages blocked.",
      PROOF_DSL: `@p1 build PRODUCES artifact_bundle
@p2 unit_test TAKES artifact_bundle
@p3 security TAKES artifact_bundle
@p4 deploy_staging TAKES artifact_bundle
@p5 deploy_staging PRODUCES staging_deployment
@p6 integration_test TAKES staging_deployment
@p7 integration_test PRODUCES integration_report
@p8 approval TAKES integration_report
@p9 approval PRODUCES approval_status
@p10 deploy_prod REQUIRES approval_status
@p11 build_failure IS_A failure
@p12 failure BLOCKS downstream_stages
@c1 $p11 BLOCKS $p1
@c2 $c1 BLOCKS $p2
@c3 $c1 BLOCKS $p3
@c4 $c1 BLOCKS $p4
@c5 $c4 BLOCKS $p5
@c6 $c5 BLOCKS $p6
@c7 $c6 BLOCKS $p7
@c8 $c7 BLOCKS $p8
@c9 $c8 BLOCKS $p9
@c10 $c9 BLOCKS $p10
@cascade $c10 CONFIRMS failure
@result $cascade IS_A failure_cascade_proof
@proof $result PROVES $q2`,
      PROOF_NL: "Build failure cascades to 6 downstream stages. Critical failure point."
    },
    {
      id: "q3", TASK_NL: "What stage types exist and what is their hierarchy?",
      TASK_DSL: "@q3 stage_types HAS hierarchy",
      ANSWEAR_NL: "build_stage, quality_stage, deploy_stage, approval_stage → pipeline_stage → workflow_element → process_component. 3 levels.",
      PROOF_DSL: `@p1 build_stage IS_A pipeline_stage
@p2 quality_stage IS_A pipeline_stage
@p3 deploy_stage IS_A pipeline_stage
@p4 approval_stage IS_A pipeline_stage
@p5 pipeline_stage IS_A workflow_element
@p6 workflow_element IS_A process_component
@c1 $p1 ESTABLISHES type_1
@c2 $p2 ESTABLISHES type_2
@c3 $p3 ESTABLISHES type_3
@c4 $p4 ESTABLISHES type_4
@c5 $p5 LEADS_TO $p6
@chain $c5 REACHES process_component
@result $chain IS_A hierarchy_proof
@proof $result PROVES $q3`,
      PROOF_NL: "4 stage types all inherit from pipeline_stage→workflow_element→process_component."
    },
    {
      id: "q4", TASK_NL: "Can deploy_prod run before approval?",
      TASK_DSL: "@q4 deploy_prod REQUIRES approval",
      ANSWEAR_NL: "No. deploy_prod REQUIRES approval_status, which approval PRODUCES. Must wait for approval.",
      PROOF_DSL: `@p1 deploy_prod REQUIRES approval_status
@p2 approval PRODUCES approval_status
@p3 approval TAKES integration_report
@p4 integration_test PRODUCES integration_report
@c1 $p1 REQUIRES $p2
@c2 $p2 REQUIRES $p3
@c3 $p3 REQUIRES $p4
@order approval PRECEDES deploy_prod
@chain $c3 ENFORCES order
@result $chain IS_A ordering_constraint_proof
@proof $result PROVES $q4`,
      PROOF_NL: "deploy_prod requires approval_status. approval produces it. Order enforced."
    },
    {
      id: "q5", TASK_NL: "What stages can run in parallel after build?",
      TASK_DSL: "@q5 build ENABLES parallel",
      ANSWEAR_NL: "unit_test, security, and deploy_staging all take artifact_bundle. Can run in parallel.",
      PROOF_DSL: `@p1 build PRODUCES artifact_bundle
@p2 unit_test TAKES artifact_bundle
@p3 security TAKES artifact_bundle
@p4 deploy_staging TAKES artifact_bundle
@c1 $p2 SHARES artifact_bundle
@c2 $p3 SHARES artifact_bundle
@c3 $p4 SHARES artifact_bundle
@c4 $c1 CONFIRMS parallel
@result $c4 IS_A parallelism_proof
@proof $result PROVES $q5`,
      PROOF_NL: "unit_test, security, deploy_staging all need artifact_bundle, no interdependencies. Parallel."
    },
    {
      id: "q6", TASK_NL: "What is minimum path to staging_deployment?",
      TASK_DSL: "@q6 staging_deployment REQUIRES minimum_path",
      ANSWEAR_NL: "checkout→build→deploy_staging = 3 stages. Shortest path.",
      PROOF_DSL: `@p1 checkout PRODUCES source_code
@p2 build TAKES source_code
@p3 build PRODUCES artifact_bundle
@p4 deploy_staging TAKES artifact_bundle
@p5 deploy_staging PRODUCES staging_deployment
@c1 $p1 LEADS_TO $p2
@c2 $p2 LEADS_TO $p3
@c3 $p3 LEADS_TO $p4
@c4 $p4 LEADS_TO $p5
@path $c4 COMPLETES minimum
@result $path IS_A minimum_path_proof
@proof $result PROVES $q6`,
      PROOF_NL: "3 stages: checkout→build→deploy_staging. No shortcuts possible."
    },
    {
      id: "q7", TASK_NL: "Is unit_test a process_component? (Deep hierarchy)",
      TASK_DSL: "@q7 unit_test IS_A process_component",
      ANSWEAR_NL: "unit_test→quality_stage→pipeline_stage→workflow_element→process_component. Yes, 4-step chain.",
      PROOF_DSL: `@p1 unit_test IS_A quality_stage
@p2 quality_stage IS_A pipeline_stage
@p3 pipeline_stage IS_A workflow_element
@p4 workflow_element IS_A process_component
@c1 $p1 LEADS_TO $p2
@c2 $c1 LEADS_TO $p3
@c3 $c2 LEADS_TO $p4
@chain $c3 REACHES process_component
@result $chain IS_A transitive_inheritance_proof
@proof $result PROVES $q7`,
      PROOF_NL: "4-step inheritance: unit_test→quality→pipeline→workflow→process_component."
    },
    {
      id: "q8", TASK_NL: "Compare failure impact: unit_test vs integration_test",
      TASK_DSL: "@q8 integration_test HAS greater_impact",
      ANSWEAR_NL: "unit_test_failure: blocks nothing directly (parallel). integration_test_failure: blocks approval, deploy_prod. Integration more critical.",
      PROOF_DSL: `@p1 unit_test PRODUCES test_report
@p2 integration_test PRODUCES integration_report
@p3 approval TAKES integration_report
@p4 approval PRODUCES approval_status
@p5 deploy_prod REQUIRES approval_status
@p6 unit_test_failure IS_A failure
@p7 integration_test_failure IS_A failure
@c1 $p6 BLOCKS nothing
@c2 $p7 BLOCKS $p2
@c3 $c2 BLOCKS $p3
@c4 $c3 BLOCKS $p4
@c5 $c4 BLOCKS $p5
@compare $c5 EXCEEDS $c1
@result $compare IS_A impact_comparison_proof
@proof $result PROVES $q8`,
      PROOF_NL: "unit_test parallel path (0 blocked). integration_test blocks approval+prod (2 blocked)."
    }
  ]
};
