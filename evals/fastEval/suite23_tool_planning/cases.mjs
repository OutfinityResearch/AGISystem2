/**
 * Suite 23 - Tool-Usage Planning
 *
 * Demonstrates using Sys2 graphs to define tool capabilities as planning operators,
 * then uses `solve planning` to produce step-by-step plans for different goals.
 *
 * Notes:
 * - The planner operates over `requires/causes/prevents` action definitions.
 * - We also attach `actionSig Action Tool Input Output` facts so the runtime can
 *   emit `planAction` facts (tool + parameters) alongside `planStep`.
 */

export const name = 'Tool-Usage Planning';
export const description = 'Graph-defined tool steps + planning for multiple goals with parameterized tool usage.';

// Core is loaded by the runner; no extra config theories are required here.
export const theories = [];

export const steps = [
  {
    action: 'learn',
    input_nl: 'Define tool-step capabilities via graphs and compute a plan to produce a learning report.',
    input_dsl: `
      # Declare action signatures (used to emit planAction facts)
      @actionSig:actionSig __Relation

      # Define a reusable graph for "a tool step" (Action + tool + input + output).
      @toolStep:toolStep graph action tool input output
        actionSig $action $tool $input $output
        requires $action has Workspace $tool
        requires $action has Workspace $input
        causes $action has Workspace $output
        return $output
      end

      # Tool entities
      isA ReadFile Tool
      isA Extract Tool
      isA WriteFile Tool

      # Inputs (entities in the current session)
      isA DS03Spec Resource
      isA DS14Spec Resource

      # Tool pipelines (actions are ground instances)
      toolStep ReadDS03 ReadFile DS03Spec DS03Text
      toolStep ExtractLearnReturn Extract DS03Text LearnReturnInfo
      toolStep WriteLearnReport WriteFile LearnReturnInfo LearnReturnReport

      toolStep ReadDS14 ReadFile DS14Spec DS14Text
      toolStep ExtractProveNoHoles Extract DS14Text ProveNoHolesInfo
      toolStep WriteEvalReport WriteFile ProveNoHolesInfo EvalReport

      # Start state (refs)
      @sReadFile has Workspace ReadFile
      @sExtract has Workspace Extract
      @sWriteFile has Workspace WriteFile
      @sDS03 has Workspace DS03Spec
      @sDS14 has Workspace DS14Spec

      # Goals (refs)
      @gLearnReport has Workspace LearnReturnReport
      @gEvalReport has Workspace EvalReport

      @planLearn solve planning
        start from sReadFile
        start from sExtract
        start from sWriteFile
        start from sDS03
        start from sDS14

        goal from gLearnReport
        maxDepth from 6
      end
    `,
    expected_nl: 'Found 1 plan.'
  },

  {
    action: 'query',
    input_nl: 'How many steps are in the learning-report plan?',
    input_dsl: '@q plan planLearn ?len',
    expected_nl: [
      'Plan planLearn has 3 steps.'
    ],
    proof_nl: [
      'plan planLearn 3'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 1 of the learning-report plan?',
    input_dsl: '@q planStep planLearn 1 ?action',
    expected_nl: [
      'Step 1 of plan planLearn is ReadDS03.'
    ],
    proof_nl: [
      'planStep planLearn 1 ReadDS03'
    ]
  },
  {
    action: 'query',
    input_nl: 'What tool is used at step 1 (with parameters)?',
    input_dsl: '@q planAction planLearn 1 ?tool ?input ?output',
    expected_nl: [
      'Step 1 of plan planLearn uses ReadFile with DS03Spec and DS03Text.'
    ],
    proof_nl: [
      'planAction planLearn 1 ReadFile DS03Spec DS03Text'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 2 of the learning-report plan?',
    input_dsl: '@q planStep planLearn 2 ?action',
    expected_nl: [
      'Step 2 of plan planLearn is ExtractLearnReturn.'
    ],
    proof_nl: [
      'planStep planLearn 2 ExtractLearnReturn'
    ]
  },
  {
    action: 'query',
    input_nl: 'What tool is used at step 2 (with parameters)?',
    input_dsl: '@q planAction planLearn 2 ?tool ?input ?output',
    expected_nl: [
      'Step 2 of plan planLearn uses Extract with DS03Text and LearnReturnInfo.'
    ],
    proof_nl: [
      'planAction planLearn 2 Extract DS03Text LearnReturnInfo'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 3 of the learning-report plan?',
    input_dsl: '@q planStep planLearn 3 ?action',
    expected_nl: [
      'Step 3 of plan planLearn is WriteLearnReport.'
    ],
    proof_nl: [
      'planStep planLearn 3 WriteLearnReport'
    ]
  },
  {
    action: 'query',
    input_nl: 'What tool is used at step 3 (with parameters)?',
    input_dsl: '@q planAction planLearn 3 ?tool ?input ?output',
    expected_nl: [
      'Step 3 of plan planLearn uses WriteFile with LearnReturnInfo and LearnReturnReport.'
    ],
    proof_nl: [
      'planAction planLearn 3 WriteFile LearnReturnInfo LearnReturnReport'
    ]
  },

  // --- A second goal: same tools + different target output ---

  {
    action: 'learn',
    input_nl: 'Compute a plan for a different goal: produce an evaluation report from DS14.',
    input_dsl: `
      @planEval solve planning
        start from sReadFile
        start from sExtract
        start from sWriteFile
        start from sDS03
        start from sDS14

        goal from gEvalReport
        maxDepth from 6
      end
    `,
    expected_nl: 'Found 1 plan.'
  },

  {
    action: 'query',
    input_nl: 'How many steps are in the eval-report plan?',
    input_dsl: '@q plan planEval ?len',
    expected_nl: [
      'Plan planEval has 3 steps.'
    ],
    proof_nl: [
      'plan planEval 3'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 1 of the eval-report plan?',
    input_dsl: '@q planStep planEval 1 ?action',
    expected_nl: [
      'Step 1 of plan planEval is ReadDS14.'
    ],
    proof_nl: [
      'planStep planEval 1 ReadDS14'
    ]
  },
  {
    action: 'query',
    input_nl: 'What tool is used at step 1 (with parameters)?',
    input_dsl: '@q planAction planEval 1 ?tool ?input ?output',
    expected_nl: [
      'Step 1 of plan planEval uses ReadFile with DS14Spec and DS14Text.'
    ],
    proof_nl: [
      'planAction planEval 1 ReadFile DS14Spec DS14Text'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 2 of the eval-report plan?',
    input_dsl: '@q planStep planEval 2 ?action',
    expected_nl: [
      'Step 2 of plan planEval is ExtractProveNoHoles.'
    ],
    proof_nl: [
      'planStep planEval 2 ExtractProveNoHoles'
    ]
  },
  {
    action: 'query',
    input_nl: 'What tool is used at step 2 (with parameters)?',
    input_dsl: '@q planAction planEval 2 ?tool ?input ?output',
    expected_nl: [
      'Step 2 of plan planEval uses Extract with DS14Text and ProveNoHolesInfo.'
    ],
    proof_nl: [
      'planAction planEval 2 Extract DS14Text ProveNoHolesInfo'
    ]
  },

  {
    action: 'query',
    input_nl: 'What is step 3 of the eval-report plan?',
    input_dsl: '@q planStep planEval 3 ?action',
    expected_nl: [
      'Step 3 of plan planEval is WriteEvalReport.'
    ],
    proof_nl: [
      'planStep planEval 3 WriteEvalReport'
    ]
  },
  {
    action: 'query',
    input_nl: 'What tool is used at step 3 (with parameters)?',
    input_dsl: '@q planAction planEval 3 ?tool ?input ?output',
    expected_nl: [
      'Step 3 of plan planEval uses WriteFile with ProveNoHolesInfo and EvalReport.'
    ],
    proof_nl: [
      'planAction planEval 3 WriteFile ProveNoHolesInfo EvalReport'
    ]
  }
];

export default { name, description, theories, steps };

