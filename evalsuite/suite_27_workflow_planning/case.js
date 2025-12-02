/**
 * Test Case: Workflow Execution - CI/CD Deployment Pipeline
 * Tests CI/CD pipeline planning with DSL-validatable proof chains. Each query verifies stage dependencies and execution order.
 * Version: 3.0
 */

module.exports = {
  id: "suite_27_workflow_planning",
  name: "Workflow Execution - CI/CD Deployment Pipeline",
  description: "Tests CI/CD pipeline planning with DSL-validatable proof chains. Each query verifies stage dependencies and execution order.",
  theory: {
    natural_language: "PIPELINE STAGES: Stage checkout executes git_clone with repository and branch parameters and produces source_code. Stage build executes npm_build with source_code input and build_config parameter and produces artifact_bundle. Stage unit_test executes jest_runner with source_code input and produces test_report. Stage security executes snyk_scan with artifact_bundle input and produces vulnerability_report. Stage deploy_staging executes kubectl_apply with artifact_bundle and produces staging_deployment. Stage integration_test executes cypress_run with staging_deployment input and produces integration_report. Stage approval executes manual_gate with integration_report input and produces approval_status. Stage deploy_prod executes kubectl_apply with artifact_bundle and requires approval_status and produces production_deployment.",
    expected_facts: [
          "checkout EXECUTES git_clone",
          "checkout WITH_PARAM repository",
          "checkout WITH_PARAM branch",
          "checkout PRODUCES source_code",
          "build EXECUTES npm_build",
          "build TAKES source_code",
          "build WITH_PARAM build_config",
          "build PRODUCES artifact_bundle",
          "unit_test EXECUTES jest_runner",
          "unit_test TAKES source_code",
          "unit_test PRODUCES test_report",
          "security EXECUTES snyk_scan",
          "security TAKES artifact_bundle",
          "security PRODUCES vulnerability_report",
          "deploy_staging EXECUTES kubectl_apply",
          "deploy_staging TAKES artifact_bundle",
          "deploy_staging PRODUCES staging_deployment",
          "integration_test EXECUTES cypress_run",
          "integration_test TAKES staging_deployment",
          "integration_test PRODUCES integration_report",
          "approval EXECUTES manual_gate",
          "approval TAKES integration_report",
          "approval PRODUCES approval_status",
          "deploy_prod EXECUTES kubectl_apply",
          "deploy_prod TAKES artifact_bundle",
          "deploy_prod REQUIRES approval_status",
          "deploy_prod PRODUCES production_deployment",
          "step_1 RUNS checkout",
          "step_2 RUNS build",
          "step_2 NEEDS source_code",
          "step_3 RUNS unit_test",
          "step_4 RUNS security",
          "step_5 RUNS deploy_staging",
          "step_6 RUNS integration_test",
          "step_7 RUNS approval",
          "step_8 RUNS deploy_prod",
          "unit_test_failure TRIGGERS pipeline_abort",
          "critical_vulnerability TRIGGERS pipeline_abort",
          "integration_test_failure TRIGGERS rollback"
    ]
  },
  queries: [
    {
      id: "q1",
      natural_language: "INIT: What parameters does checkout need?",
      expected_dsl: `
        @p1 checkout WITH_PARAM repository
        @p2 checkout WITH_PARAM branch
        @q1 $p1 AND $p2
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
      natural_language: "PARALLEL: Which stages take source_code?",
      expected_dsl: `
        @t1 build TAKES source_code
        @t2 unit_test TAKES source_code
        @q2 $t1 AND $t2
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
      natural_language: "DEPENDENCY: What does deploy_prod require?",
      expected_dsl: `
        @req deploy_prod REQUIRES approval_status
        @takes deploy_prod TAKES artifact_bundle
        @q3 $req AND $takes
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
      natural_language: "STEP 5: What does deploy_staging produce?",
      expected_dsl: `
        @runs step_5 RUNS deploy_staging
        @produces deploy_staging PRODUCES staging_deployment
        @q4 $runs AND $produces
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
      natural_language: "SECURITY: What does security scan produce?",
      expected_dsl: `
        @exec security EXECUTES snyk_scan
        @prod security PRODUCES vulnerability_report
        @q5 $exec AND $prod
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
      natural_language: "FAILURE: What triggers pipeline abort?",
      expected_dsl: `
        @f1 unit_test_failure TRIGGERS pipeline_abort
        @f2 critical_vulnerability TRIGGERS pipeline_abort
        @q6 $f1 AND $f2
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
      natural_language: "ROLLBACK: What triggers rollback?",
      expected_dsl: `@q7 integration_test_failure TRIGGERS rollback`,
      expected_answer: {
        natural_language: undefined,
        truth: undefined,
        explanation: undefined,
        existence: undefined
      }
    },
    {
      id: "q8",
      natural_language: "FINAL: What is produced at pipeline end?",
      expected_dsl: `
        @exec deploy_prod EXECUTES kubectl_apply
        @prod deploy_prod PRODUCES production_deployment
        @q8 $exec AND $prod
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
