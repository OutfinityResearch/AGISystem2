/**
 * Proof Executor - Execute PROOF_DSL and validate against knowledge base
 *
 * This module:
 * 1. Loads theory_DSL into a session
 * 2. Executes PROOF_DSL
 * 3. Verifies that facts referenced in proof exist in KB
 * 4. Returns the result point (not JSON!)
 *
 * @module evalsuite/lib/validators/proof_executor
 */

const path = require('path');
const { validateSSA } = require('./ssa_validator');
const { validateProofStructure, parseTriple } = require('./proof_validator');

// Lazy load AGISystem2
let AgentSystem2 = null;

/**
 * Initialize AGISystem2 if not already loaded
 */
function ensureAGISystem() {
  if (!AgentSystem2) {
    const basePath = path.resolve(__dirname, '../../..');
    AgentSystem2 = require(path.join(basePath, 'src/interface/agent_system2'));
  }
}

/**
 * Execute a proof and validate it against the knowledge base
 *
 * @param {Object} options
 * @param {string[]} options.theoryDSL - Theory facts to load
 * @param {string} options.taskDSL - The query (e.g., "@q1 Fido IS_A living_thing")
 * @param {string} options.proofDSL - The proof script
 * @param {string} options.taskId - Task identifier (e.g., "q1")
 * @returns {Object} Execution result
 */
function executeProof({ theoryDSL, taskDSL, proofDSL, taskId }) {
  ensureAGISystem();

  const result = {
    valid: false,
    issues: [],
    executionLog: [],
    resultPoint: null,
    factsVerified: [],
    factsMissing: []
  };

  // Step 1: Validate SSA (pass taskId as external var)
  const ssaResult = validateSSA(proofDSL, { queryId: taskId });
  if (!ssaResult.valid) {
    result.issues.push(...ssaResult.issues.map(i => `SSA: ${i}`));
    return result;
  }
  result.executionLog.push('SSA validation passed');

  // Step 2: Validate proof structure
  const structResult = validateProofStructure(proofDSL, taskId);
  if (!structResult.valid) {
    result.issues.push(...structResult.issues.map(i => `Structure: ${i}`));
    return result;
  }
  result.executionLog.push('Structure validation passed');

  // Step 3: Create session and load theory
  let session;
  const loadedFacts = new Set();  // Track which facts are actually in KB

  try {
    const agent = new AgentSystem2({ profile: 'auto_test' });
    session = agent.createSession({ skipPreload: true });

    // Load theory facts
    if (theoryDSL && theoryDSL.length > 0) {
      const theoryLines = theoryDSL.map((fact, idx) => {
        // Convert bare facts to @f<idx> declarations
        const trimmed = fact.trim();
        if (!trimmed.startsWith('@')) {
          // Track the fact triple for later verification
          loadedFacts.add(trimmed.toLowerCase());
          return `@f${idx} ${trimmed}`;
        }
        // Extract triple from @var triple format
        const match = trimmed.match(/^@\w+\s+(.+)$/);
        if (match) loadedFacts.add(match[1].toLowerCase());
        return trimmed;
      });
      session.run(theoryLines);
      result.executionLog.push(`Loaded ${theoryLines.length} theory facts`);
    }
  } catch (err) {
    result.issues.push(`Session init error: ${err.message}`);
    return result;
  }

  // Step 4: Execute TASK_DSL (the query)
  try {
    if (taskDSL) {
      session.run([taskDSL]);
      result.executionLog.push(`Executed TASK_DSL: ${taskDSL}`);
    }
  } catch (err) {
    result.issues.push(`TASK_DSL execution error: ${err.message}`);
    return result;
  }

  // Step 5: Parse proof and collect facts to verify BEFORE executing
  const proofLines = proofDSL.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const factsToVerify = [];

  for (const line of proofLines) {
    const triple = parseTriple(line.trim());
    if (!triple) continue;

    const { variable, subject, relation, object } = triple;

    // Skip meta-relations (result, proof, chains, memberships)
    if (variable === 'result' || variable === 'proof') continue;
    if (variable.match(/^[cm]\d+$/)) continue;  // c1, m1 etc.
    if (relation === 'MEMBER_OF' || relation === 'LEADS_TO') continue;

    // Collect fact references (@p1, @p2, etc.) for verification
    if (variable.match(/^p\d+$/) || variable.match(/^link\d+$/)) {
      factsToVerify.push({ variable, subject, relation, object });
    }
  }

  // Step 5b: VERIFY facts BEFORE executing proof (using askDSL - query only!)
  // This prevents the proof from creating its own facts
  for (const fact of factsToVerify) {
    const factTriple = `${fact.subject} ${fact.relation} ${fact.object}`;

    // Use askDSL to QUERY without CREATING the fact
    const askResult = session.engine.askDSL({
      subject: fact.subject,
      relation: fact.relation,
      object: fact.object
    });

    const truth = askResult?.truth || askResult?.band || 'UNKNOWN';
    const isTrue = truth === 'TRUE_CERTAIN' || truth === 'TRUE_LIKELY';
    const depth = askResult?.depth || 0;
    // depth=1 means direct fact, depth>1 means derived via transitive chain
    const method = depth === 1 ? 'direct' : (depth > 1 ? 'transitive' : (askResult?.method || 'unknown'));

    // Extract search statistics from provenance (total work done by reasoner)
    const stepsExecuted = askResult?.provenance?.stepsExecuted || 1;
    const nodesVisited = askResult?.provenance?.nodesVisited || 1;
    const edgesExplored = askResult?.provenance?.edgesExplored || 0;
    const chainLength = askResult?.provenance?.chainLength || depth || 1;
    const trace = askResult?.provenance?.trace || [];  // Full exploration trace

    if (isTrue) {
      result.factsVerified.push({
        variable: fact.variable,
        fact: factTriple,
        truth: truth,
        method: method,
        depth: depth,
        stepsExecuted: stepsExecuted,  // BFS steps (total reasoning work)
        nodesVisited: nodesVisited,    // Graph nodes explored
        edgesExplored: edgesExplored,  // Relations tried
        chainLength: chainLength,       // Path length in result
        trace: trace,                   // Full exploration trace for debugging
        verified: true
      });
    } else {
      result.factsMissing.push({
        variable: fact.variable,
        fact: factTriple,
        truth: truth,
        reason: askResult?.provenance?.reason || 'Not found in KB',
        stepsExecuted: stepsExecuted,  // Even failed searches do work
        nodesVisited: nodesVisited,
        edgesExplored: edgesExplored,
        trace: trace,                   // Trace even for failed searches
        verified: false
      });
    }
  }

  if (factsToVerify.length > 0) {
    result.executionLog.push(`Verified ${result.factsVerified.length}/${factsToVerify.length} proof facts BEFORE execution`);
  }

  // Step 6: Execute the proof DSL (only if all facts were verified)
  try {
    session.run(proofLines);
    result.executionLog.push(`Executed ${proofLines.length} proof lines`);

    // Get the result point
    const resultPoint = session.getVar('result');
    const proofPoint = session.getVar('proof');

    if (resultPoint) {
      result.resultPoint = resultPoint;
      result.executionLog.push(`Result point obtained: ${JSON.stringify(resultPoint)}`);
    } else {
      result.issues.push('No @result point produced');
    }

    if (proofPoint) {
      result.executionLog.push(`Proof point obtained: ${JSON.stringify(proofPoint)}`);
    } else {
      result.issues.push('No @proof point produced');
    }

    // (Fact verification already done in Step 5b)

  } catch (err) {
    result.issues.push(`Proof execution error: ${err.message}`);
    return result;
  }

  // Step 7: Determine overall validity
  // Valid if: no issues, has result point, and ALL facts were verified (none missing)
  if (result.issues.length === 0 && result.resultPoint) {
    // ALL facts must be verified - any missing fact invalidates the proof
    if (result.factsMissing.length > 0) {
      result.valid = false;
      result.issues.push(`${result.factsMissing.length} proof fact(s) not found in KB`);
    } else if (factsToVerify.length === 0 || result.factsVerified.length > 0) {
      result.valid = true;
    } else {
      result.valid = false;
      result.issues.push('No proof facts could be verified against KB');
    }
  }

  return result;
}

/**
 * Format a result point as DSL (not JSON)
 *
 * @param {Object} point - The result point object
 * @param {string} varName - Variable name
 * @returns {string} DSL representation
 */
function formatPointAsDSL(point, varName = 'result') {
  if (!point) return `@${varName} UNKNOWN`;

  // If point has subject, relation, object structure
  if (point.s && point.r && point.o) {
    return `@${varName} ${point.s} ${point.r} ${point.o}`;
  }

  // If point has type
  if (point.type) {
    return `@${varName} $ref IS_A ${point.type}`;
  }

  // Fallback
  return `@${varName} point_${Date.now()}`;
}

/**
 * Execute all proofs in a test case
 *
 * @param {Object} testCase - Test case with theory_DSL and tasks
 * @returns {Object} Results for all tasks
 */
function executeTestCase(testCase) {
  const results = {
    caseId: testCase.id,
    caseName: testCase.name,
    tasks: [],
    passed: 0,
    failed: 0
  };

  const theoryDSL = testCase.theory_DSL || [];

  for (const task of testCase.tasks || []) {
    const taskResult = executeProof({
      theoryDSL,
      taskDSL: task.TASK_DSL,
      proofDSL: task.PROOF_DSL,
      taskId: task.id
    });

    results.tasks.push({
      taskId: task.id,
      ...taskResult
    });

    if (taskResult.valid) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  return results;
}

module.exports = {
  executeProof,
  executeTestCase,
  formatPointAsDSL
};
