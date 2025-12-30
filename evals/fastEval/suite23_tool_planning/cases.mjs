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
    input_nl: '$action actionSig $tool $input $output. $action requires has Workspace $tool. $action requires has Workspace $input. $action causes has Workspace $output. ReadFile is a Tool. Extract is a Tool. WriteFile is a Tool. DS03Spec is a Resource. DS14Spec is a Resource. ReadDS03 toolStep ReadFile DS03Spec DS03Text. ExtractLearnReturn toolStep Extract DS03Text LearnReturnInfo. WriteLearnReport toolStep WriteFile LearnReturnInfo LearnReturnReport. ReadDS14 toolStep ReadFile DS14Spec DS14Text. ExtractProveNoHoles toolStep Extract DS14Text ProveNoHolesInfo. WriteEvalReport toolStep WriteFile ProveNoHolesInfo EvalReport.',
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
    input_nl: 'planLearn verifyPlan ?ok.',
    input_dsl: '@q verifyPlan planLearn ?ok',
    maxResults: 1,
    expected_nl: [
      'Plan planLearn is valid.'
    ],
    proof_nl: [
      'Goals satisfied'
    ]
  },

  {
    action: 'query',
    input_nl: 'planLearn plan ?len.',
    input_dsl: '@q plan planLearn ?len',
    maxResults: 1,
    expected_nl: [
      'Plan planLearn has 3 steps.'
    ],
    proof_nl: [
      'Found 3 plan steps for planLearn'
    ]
  },

  {
    action: 'query',
    input_nl: 'planLearn planStep 1 ?action.',
    input_dsl: '@q planStep planLearn 1 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan planLearn is ReadDS03.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan planLearn is ReadDS03'
    ]
  },
  {
    action: 'query',
    input_nl: 'planLearn planAction 1 ?tool ?input ?output.',
    input_dsl: '@q planAction planLearn 1 ?tool ?input ?output',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan planLearn uses ReadFile with DS03Spec and DS03Text.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan planLearn uses ReadFile with DS03Spec and DS03Text'
    ]
  },

  {
    action: 'query',
    input_nl: 'planLearn planStep 2 ?action.',
    input_dsl: '@q planStep planLearn 2 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 2 of plan planLearn is ExtractLearnReturn.'
    ],
    proof_nl: [
      'Fact in KB: Step 2 of plan planLearn is ExtractLearnReturn'
    ]
  },
  {
    action: 'query',
    input_nl: 'planLearn planAction 2 ?tool ?input ?output.',
    input_dsl: '@q planAction planLearn 2 ?tool ?input ?output',
    maxResults: 1,
    expected_nl: [
      'Step 2 of plan planLearn uses Extract with DS03Text and LearnReturnInfo.'
    ],
    proof_nl: [
      'Fact in KB: Step 2 of plan planLearn uses Extract with DS03Text and LearnReturnInfo'
    ]
  },

  {
    action: 'query',
    input_nl: 'planLearn planStep 3 ?action.',
    input_dsl: '@q planStep planLearn 3 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 3 of plan planLearn is WriteLearnReport.'
    ],
    proof_nl: [
      'Fact in KB: Step 3 of plan planLearn is WriteLearnReport'
    ]
  },
  {
    action: 'query',
    input_nl: 'planLearn planAction 3 ?tool ?input ?output.',
    input_dsl: '@q planAction planLearn 3 ?tool ?input ?output',
    maxResults: 1,
    expected_nl: [
      'Step 3 of plan planLearn uses WriteFile with LearnReturnInfo and LearnReturnReport.'
    ],
    proof_nl: [
      'Fact in KB: Step 3 of plan planLearn uses WriteFile with LearnReturnInfo and LearnReturnReport'
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
    input_nl: 'planEval verifyPlan ?ok.',
    input_dsl: '@q verifyPlan planEval ?ok',
    maxResults: 1,
    expected_nl: [
      'Plan planEval is valid.'
    ],
    proof_nl: [
      'Goals satisfied'
    ]
  },

  {
    action: 'query',
    input_nl: 'planEval plan ?len.',
    input_dsl: '@q plan planEval ?len',
    maxResults: 1,
    expected_nl: [
      'Plan planEval has 3 steps.'
    ],
    proof_nl: [
      'Found 3 plan steps for planEval'
    ]
  },

  {
    action: 'query',
    input_nl: 'planEval planStep 1 ?action.',
    input_dsl: '@q planStep planEval 1 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan planEval is ReadDS14.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan planEval is ReadDS14'
    ]
  },
  {
    action: 'query',
    input_nl: 'planEval planAction 1 ?tool ?input ?output.',
    input_dsl: '@q planAction planEval 1 ?tool ?input ?output',
    maxResults: 1,
    expected_nl: [
      'Step 1 of plan planEval uses ReadFile with DS14Spec and DS14Text.'
    ],
    proof_nl: [
      'Fact in KB: Step 1 of plan planEval uses ReadFile with DS14Spec and DS14Text'
    ]
  },

  {
    action: 'query',
    input_nl: 'planEval planStep 2 ?action.',
    input_dsl: '@q planStep planEval 2 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 2 of plan planEval is ExtractProveNoHoles.'
    ],
    proof_nl: [
      'Fact in KB: Step 2 of plan planEval is ExtractProveNoHoles'
    ]
  },
  {
    action: 'query',
    input_nl: 'planEval planAction 2 ?tool ?input ?output.',
    input_dsl: '@q planAction planEval 2 ?tool ?input ?output',
    maxResults: 1,
    expected_nl: [
      'Step 2 of plan planEval uses Extract with DS14Text and ProveNoHolesInfo.'
    ],
    proof_nl: [
      'Fact in KB: Step 2 of plan planEval uses Extract with DS14Text and ProveNoHolesInfo'
    ]
  },

  {
    action: 'query',
    input_nl: 'planEval planStep 3 ?action.',
    input_dsl: '@q planStep planEval 3 ?action',
    maxResults: 1,
    expected_nl: [
      'Step 3 of plan planEval is WriteEvalReport.'
    ],
    proof_nl: [
      'Fact in KB: Step 3 of plan planEval is WriteEvalReport'
    ]
  },
  {
    action: 'query',
    input_nl: 'planEval planAction 3 ?tool ?input ?output.',
    input_dsl: '@q planAction planEval 3 ?tool ?input ?output',
    maxResults: 1,
    expected_nl: [
      'Step 3 of plan planEval uses WriteFile with ProveNoHolesInfo and EvalReport.'
    ],
    proof_nl: [
      'Fact in KB: Step 3 of plan planEval uses WriteFile with ProveNoHolesInfo and EvalReport'
    ]
  }
];

export default { name, description, theories, steps };
