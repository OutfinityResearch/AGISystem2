/**
 * Proof Classifier - Qualitative analysis of proof complexity and reasoning type
 *
 * Instead of just counting "direct" vs "transitive", this module analyzes:
 * - Reasoning type (deduction, induction, abduction, analogy)
 * - Proof depth (shallow lookup vs deep derivation)
 * - Cognitive complexity (trivial, moderate, complex, sophisticated)
 * - What's actually being tested
 *
 * @module evalsuite/lib/validators/proof_classifier
 */

/**
 * Reasoning types that can be present in a proof
 */
const ReasoningType = {
  FACT_LOOKUP: 'fact_lookup',           // Just retrieving a stored fact
  TRANSITIVE_CLOSURE: 'transitive_closure', // A IS_A B IS_A C (mechanical)
  PROPERTY_INHERITANCE: 'property_inheritance', // X IS_A Y, Y HAS Z → X HAS Z
  DEDUCTION: 'deduction',               // Applying rules to derive conclusions
  ABDUCTION: 'abduction',               // Inferring causes from effects
  INDUCTION: 'induction',               // Generalizing from examples
  ANALOGY: 'analogy',                   // Mapping relations between domains
  EXCEPTION_HANDLING: 'exception_handling', // Non-monotonic override
  CONSTRAINT_SATISFACTION: 'constraint_sat', // Finding solutions under constraints
  COUNTERFACTUAL: 'counterfactual'      // What-if reasoning
};

/**
 * Complexity levels for proofs
 */
const ComplexityLevel = {
  TRIVIAL: 'trivial',           // 0-1 steps, just fact lookup
  SHALLOW: 'shallow',           // 2-3 steps, simple chaining
  MODERATE: 'moderate',         // 4-6 steps, some inference
  COMPLEX: 'complex',           // 7-10 steps, multiple reasoning types
  SOPHISTICATED: 'sophisticated' // 10+ steps, deep reasoning chains
};

/**
 * Analyze a proof and classify its complexity and reasoning type
 *
 * @param {Object} proofResult - Result from proof_executor with factsVerified, etc.
 * @param {string} proofDSL - The original PROOF_DSL text
 * @param {Object} task - The task object with TASK_DSL, TASK_NL
 * @returns {Object} Classification with reasoning types, depth, complexity, description
 */
function classifyProof(proofResult, proofDSL, task = {}) {
  const classification = {
    reasoningTypes: [],
    primaryType: ReasoningType.FACT_LOOKUP,
    depth: 0,
    chainLength: 0,
    complexity: ComplexityLevel.TRIVIAL,
    factsCount: 0,
    derivedCount: 0,
    directCount: 0,
    description: '',
    issues: [],
    isGenuineReasoning: false
  };

  if (!proofDSL) {
    classification.description = 'No proof provided';
    return classification;
  }

  // Parse proof structure
  const lines = proofDSL.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const facts = [];
  const chains = [];
  const memberships = [];
  let resultType = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^@(\w+)\s+(\$?\w+)\s+(\w+)\s+(\$?\w+)$/);
    if (!match) continue;

    const [, variable, subject, relation, object] = match;

    if (variable === 'result' && relation === 'IS_A') {
      resultType = object;
    } else if (variable.match(/^p\d+$/)) {
      facts.push({ variable, subject, relation, object });
    } else if (variable.match(/^c\d+$/) && relation === 'LEADS_TO') {
      chains.push({ variable, from: subject, to: object });
    } else if (relation === 'MEMBER_OF') {
      memberships.push({ variable, member: subject, set: object });
    }
  }

  classification.factsCount = facts.length;
  classification.chainLength = chains.length;

  // Analyze verified facts for direct vs derived
  if (proofResult?.factsVerified) {
    for (const f of proofResult.factsVerified) {
      if (f.method === 'direct' || f.depth === 1) {
        classification.directCount++;
      } else {
        classification.derivedCount++;
      }
    }
  }

  // Determine reasoning types present
  const reasoningTypes = new Set();

  // Check for fact lookup (trivial)
  if (facts.length <= 1 && chains.length === 0) {
    reasoningTypes.add(ReasoningType.FACT_LOOKUP);
  }

  // Check for transitive closure
  if (chains.length > 0 && facts.every(f => f.relation === 'IS_A' || f.relation === 'LOCATED_IN')) {
    reasoningTypes.add(ReasoningType.TRANSITIVE_CLOSURE);
  }

  // Check for property inheritance (X IS_A Y, Y HAS Z)
  const hasIsA = facts.some(f => f.relation === 'IS_A');
  const hasProperty = facts.some(f => ['HAS', 'CAN', 'HELPS', 'NEEDS', 'CAUSES'].includes(f.relation));
  if (hasIsA && hasProperty && chains.length > 0) {
    reasoningTypes.add(ReasoningType.PROPERTY_INHERITANCE);
  }

  // Check for exception handling
  if (resultType === 'exception_override' ||
      facts.some(f => f.relation === 'CANNOT' || f.relation === 'OVERRIDES')) {
    reasoningTypes.add(ReasoningType.EXCEPTION_HANDLING);
  }

  // Check for abduction (causes, diagnosis)
  if (resultType?.includes('abduct') ||
      facts.some(f => f.relation === 'CAUSES' || f.relation === 'INDICATES')) {
    // But check if it's REAL abduction or just lookup
    if (memberships.length > 0) {
      // Multiple possible causes enumerated = pseudo-abduction (just enumeration)
      reasoningTypes.add(ReasoningType.FACT_LOOKUP);
      classification.issues.push('Pseudo-abduction: enumerates causes but does not rank hypotheses');
    } else if (chains.length >= 2) {
      reasoningTypes.add(ReasoningType.ABDUCTION);
    }
  }

  // Check for analogy
  if (resultType?.includes('analog') ||
      facts.some(f => f.relation === 'SIMILAR_TO' || f.relation === 'MAPS_TO')) {
    reasoningTypes.add(ReasoningType.ANALOGY);
  }

  // Check for counterfactual
  if (resultType?.includes('counterfactual') ||
      facts.some(f => f.relation === 'IF_NOT' || f.relation === 'WITHOUT')) {
    reasoningTypes.add(ReasoningType.COUNTERFACTUAL);
  }

  // If only IS_A chains, it's not real deduction
  const nonIsAFacts = facts.filter(f => f.relation !== 'IS_A');
  if (chains.length >= 2 && nonIsAFacts.length >= 1) {
    reasoningTypes.add(ReasoningType.DEDUCTION);
  }

  classification.reasoningTypes = Array.from(reasoningTypes);

  // Determine primary reasoning type
  if (reasoningTypes.has(ReasoningType.ABDUCTION)) {
    classification.primaryType = ReasoningType.ABDUCTION;
  } else if (reasoningTypes.has(ReasoningType.COUNTERFACTUAL)) {
    classification.primaryType = ReasoningType.COUNTERFACTUAL;
  } else if (reasoningTypes.has(ReasoningType.DEDUCTION)) {
    classification.primaryType = ReasoningType.DEDUCTION;
  } else if (reasoningTypes.has(ReasoningType.EXCEPTION_HANDLING)) {
    classification.primaryType = ReasoningType.EXCEPTION_HANDLING;
  } else if (reasoningTypes.has(ReasoningType.PROPERTY_INHERITANCE)) {
    classification.primaryType = ReasoningType.PROPERTY_INHERITANCE;
  } else if (reasoningTypes.has(ReasoningType.TRANSITIVE_CLOSURE)) {
    classification.primaryType = ReasoningType.TRANSITIVE_CLOSURE;
  } else {
    classification.primaryType = ReasoningType.FACT_LOOKUP;
  }

  // Calculate depth (facts + chains)
  classification.depth = facts.length + chains.length;

  // Determine complexity level
  if (classification.depth <= 1) {
    classification.complexity = ComplexityLevel.TRIVIAL;
  } else if (classification.depth <= 3) {
    classification.complexity = ComplexityLevel.SHALLOW;
  } else if (classification.depth <= 6) {
    classification.complexity = ComplexityLevel.MODERATE;
  } else if (classification.depth <= 10) {
    classification.complexity = ComplexityLevel.COMPLEX;
  } else {
    classification.complexity = ComplexityLevel.SOPHISTICATED;
  }

  // Determine if this is genuine reasoning
  classification.isGenuineReasoning = (
    classification.complexity !== ComplexityLevel.TRIVIAL &&
    classification.primaryType !== ReasoningType.FACT_LOOKUP &&
    (classification.derivedCount > 0 || classification.chainLength >= 2)
  );

  // Generate human-readable description
  classification.description = generateDescription(classification, resultType, task);

  return classification;
}

/**
 * Generate a human-readable description of the proof classification
 */
function generateDescription(classification, resultType, task) {
  const parts = [];

  // Depth description
  const depthWords = {
    [ComplexityLevel.TRIVIAL]: 'trivial (single fact lookup)',
    [ComplexityLevel.SHALLOW]: 'shallow (2-3 step chain)',
    [ComplexityLevel.MODERATE]: 'moderate (4-6 step derivation)',
    [ComplexityLevel.COMPLEX]: 'complex (7-10 step reasoning)',
    [ComplexityLevel.SOPHISTICATED]: 'sophisticated (10+ step deep reasoning)'
  };
  parts.push(depthWords[classification.complexity] || classification.complexity);

  // Primary reasoning type
  const typeWords = {
    [ReasoningType.FACT_LOOKUP]: 'fact retrieval',
    [ReasoningType.TRANSITIVE_CLOSURE]: 'transitive IS_A chain',
    [ReasoningType.PROPERTY_INHERITANCE]: 'property inheritance',
    [ReasoningType.DEDUCTION]: 'deductive reasoning',
    [ReasoningType.ABDUCTION]: 'abductive inference',
    [ReasoningType.INDUCTION]: 'inductive generalization',
    [ReasoningType.ANALOGY]: 'analogical mapping',
    [ReasoningType.EXCEPTION_HANDLING]: 'exception/override handling',
    [ReasoningType.COUNTERFACTUAL]: 'counterfactual reasoning'
  };
  parts.push(typeWords[classification.primaryType] || classification.primaryType);

  // Facts breakdown
  if (classification.factsCount > 0) {
    const factDesc = [];
    if (classification.directCount > 0) {
      factDesc.push(`${classification.directCount} direct`);
    }
    if (classification.derivedCount > 0) {
      factDesc.push(`${classification.derivedCount} derived`);
    }
    if (factDesc.length > 0) {
      parts.push(`(${factDesc.join(', ')} facts)`);
    }
  }

  return parts.join(' — ');
}

/**
 * Classify all proofs in a test case and generate summary statistics
 *
 * @param {Object[]} queryResults - Array of query results with factsVerified
 * @param {Object} testCase - The test case with tasks
 * @returns {Object} Summary statistics
 */
function classifyTestCase(queryResults, testCase) {
  const summary = {
    totalTasks: 0,
    classifications: [],
    complexityDistribution: {
      [ComplexityLevel.TRIVIAL]: 0,
      [ComplexityLevel.SHALLOW]: 0,
      [ComplexityLevel.MODERATE]: 0,
      [ComplexityLevel.COMPLEX]: 0,
      [ComplexityLevel.SOPHISTICATED]: 0
    },
    reasoningTypeDistribution: {},
    genuineReasoningCount: 0,
    avgDepth: 0,
    maxDepth: 0,
    // NEW: Arrays for per-task metrics
    reasoningSteps: [],    // Real reasoning depth from askDSL per task
    proofLengths: [],      // PROOF_DSL line count per task
    maxReasoningDepths: [], // Max depth among verified facts per task
    qualitySummary: ''
  };

  const tasks = testCase.tasks || testCase.queries || [];
  let totalDepth = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const queryResult = queryResults.find(q => q.id === task.id) || {};

    const classification = classifyProof(
      queryResult,
      task.PROOF_DSL,
      task
    );

    summary.classifications.push({
      taskId: task.id,
      ...classification
    });

    summary.totalTasks++;
    summary.complexityDistribution[classification.complexity]++;

    for (const rt of classification.reasoningTypes) {
      summary.reasoningTypeDistribution[rt] = (summary.reasoningTypeDistribution[rt] || 0) + 1;
    }

    if (classification.isGenuineReasoning) {
      summary.genuineReasoningCount++;
    }

    totalDepth += classification.depth;
    if (classification.depth > summary.maxDepth) {
      summary.maxDepth = classification.depth;
    }

    // NEW: Collect real reasoning metrics
    // proofLength = number of non-empty lines in PROOF_DSL
    const proofLines = (task.PROOF_DSL || '').split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    summary.proofLengths.push(proofLines.length);

    // reasoningSteps = sum of actual reasoning depths from verified facts
    // maxReasoningDepth = max depth among all verified facts for this task
    let taskReasoningSteps = 0;
    let taskMaxDepth = 0;
    if (queryResult.proofResult?.factsVerified) {
      for (const fact of queryResult.proofResult.factsVerified) {
        const depth = fact.depth || 1;
        taskReasoningSteps += depth;
        if (depth > taskMaxDepth) taskMaxDepth = depth;
      }
    }
    summary.reasoningSteps.push(taskReasoningSteps);
    summary.maxReasoningDepths.push(taskMaxDepth);
  }

  summary.avgDepth = summary.totalTasks > 0 ? (totalDepth / summary.totalTasks).toFixed(1) : 0;

  // Generate quality summary
  summary.qualitySummary = generateQualitySummary(summary);

  return summary;
}

/**
 * Generate a quality summary for a test case
 */
function generateQualitySummary(summary) {
  const trivialPct = ((summary.complexityDistribution[ComplexityLevel.TRIVIAL] / summary.totalTasks) * 100).toFixed(0);
  const genuinePct = ((summary.genuineReasoningCount / summary.totalTasks) * 100).toFixed(0);

  if (summary.genuineReasoningCount === 0) {
    return `All ${summary.totalTasks} proofs are trivial fact lookups — no genuine reasoning tested`;
  }

  if (trivialPct > 75) {
    return `${trivialPct}% trivial, only ${genuinePct}% genuine reasoning — suite needs improvement`;
  }

  if (summary.avgDepth < 3) {
    return `Avg depth ${summary.avgDepth} is shallow — needs deeper inference chains`;
  }

  const types = Object.keys(summary.reasoningTypeDistribution).filter(t => t !== ReasoningType.FACT_LOOKUP);
  if (types.length >= 3) {
    return `Good variety: ${types.join(', ')} — ${genuinePct}% genuine reasoning`;
  }

  return `${genuinePct}% genuine reasoning, avg depth ${summary.avgDepth}`;
}

/**
 * Format classification for display
 */
function formatClassificationForDisplay(classification) {
  const icon = {
    [ComplexityLevel.TRIVIAL]: '○',
    [ComplexityLevel.SHALLOW]: '◐',
    [ComplexityLevel.MODERATE]: '◑',
    [ComplexityLevel.COMPLEX]: '●',
    [ComplexityLevel.SOPHISTICATED]: '◉'
  }[classification.complexity] || '?';

  const typeShort = {
    [ReasoningType.FACT_LOOKUP]: 'lookup',
    [ReasoningType.TRANSITIVE_CLOSURE]: 'trans',
    [ReasoningType.PROPERTY_INHERITANCE]: 'inherit',
    [ReasoningType.DEDUCTION]: 'deduce',
    [ReasoningType.ABDUCTION]: 'abduce',
    [ReasoningType.INDUCTION]: 'induce',
    [ReasoningType.ANALOGY]: 'analog',
    [ReasoningType.EXCEPTION_HANDLING]: 'except',
    [ReasoningType.COUNTERFACTUAL]: 'counter'
  }[classification.primaryType] || classification.primaryType;

  return `${icon} ${typeShort} (depth=${classification.depth})`;
}

module.exports = {
  classifyProof,
  classifyTestCase,
  formatClassificationForDisplay,
  generateQualitySummary,
  ReasoningType,
  ComplexityLevel
};
