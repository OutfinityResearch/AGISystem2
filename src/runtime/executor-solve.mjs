/**
 * AGISystem2 - Executor Solve Block Handler
 * @module runtime/executor-solve
 *
 * Handles CSP solve blocks and related operations:
 * - executeSolveBlock: Run CSP solver
 * - findConflictPairs: Find constraint conflicts in KB
 */

import { bindAll, bundle } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import { CSPSolver } from '../reasoning/csp/solver.mjs';
import { findAllOfType } from '../reasoning/find-all.mjs';
import { solvePlanning, resolveGoalRefs } from '../reasoning/planning/solver.mjs';

/**
 * Execute solve block - runs CSP solver
 * @param {Executor} executor - Executor instance
 * @param {SolveBlock} stmt - Solve block AST
 * @returns {Object} Solve result
 */
export function executeSolveBlock(executor, stmt) {
  const problemType = String(stmt.problemType || '').trim();
  if (problemType.toLowerCase() === 'planning' || problemType.toLowerCase() === 'plan') {
    return executePlanningSolveBlock(executor, stmt);
  }

  // DS19 strict declarations: a solve block defines a relation name (its destination)
  // used to query solution bindings (e.g. `@seating solve ...` then `seating Alice ?t`).
  if (stmt.destination) {
    executor.session.semanticIndex?.relations?.add?.(stmt.destination);
    executor.session.semanticIndex?.assignmentRelations?.add?.(stmt.destination);
  }

  const solver = new CSPSolver(executor.session, { timeout: 5000 });

  // Process declarations to configure solver
  let variableType = null;
  let domainType = null;
  const constraints = [];

  for (const decl of stmt.declarations) {
    if (decl.kind === 'from') {
      // Domain declaration: guests from Guest, tables from Table
      if (decl.varName === 'guests') {
        variableType = decl.source;
      } else if (decl.varName === 'tables') {
        domainType = decl.source;
      }
    } else if (decl.kind === 'noConflict') {
      // Constraint: noConflict conflictsWith
      constraints.push({ type: 'noConflict', relation: decl.source });
    } else if (decl.kind === 'allDifferent') {
      constraints.push({ type: 'allDifferent', relation: decl.source });
    }
  }

  // Get entities from KB
  const variables = findAllOfType(executor.session, variableType);
  const domain = findAllOfType(executor.session, domainType);

  if (variables.length === 0) {
    return {
      type: 'solve',
      destination: stmt.destination,
      success: false,
      error: `No ${variableType} entities found`,
      solutionCount: 0,
      solutions: []
    };
  }

  if (domain.length === 0) {
    return {
      type: 'solve',
      destination: stmt.destination,
      success: false,
      error: `No ${domainType} entities found`,
      solutionCount: 0,
      solutions: []
    };
  }

  // Add variables with domain
  for (const v of variables) {
    solver.addVariable(v, domain);
  }

  // Add constraints and collect constraint info for proof generation
  const constraintInfo = [];
  for (const c of constraints) {
    if (c.type === 'noConflict') {
      // Find all conflict pairs from KB
      const conflicts = findConflictPairs(executor, c.relation);
      for (const [p1, p2] of conflicts) {
        if (variables.includes(p1) && variables.includes(p2)) {
          constraintInfo.push({ type: 'noConflict', relation: c.relation, entities: [p1, p2] });
          solver.addPredicate([p1, p2], (assignment) => {
            const t1 = assignment.get(p1);
            const t2 = assignment.get(p2);
            if (t1 === undefined || t2 === undefined) return true;
            return t1 !== t2;
          });
        }
      }
    }
  }

  // Solve
  const result = solver.solve();

  // The destination becomes the relation for all solution facts
  // e.g., @seating solve ... → "seating Alice T1", "seating Bob T2"
  const solutionRelation = stmt.destination;
  const relationVec = executor.session.vocabulary.getOrCreate(solutionRelation);

  // HDC Compound Encoding: Each solution becomes a bundled hypervector
  // solution_vec = bundle(bind(relation, pos1(entity), pos2(value)), ...)
  const solutionVectors = [];

  for (const solution of result.solutions) {
    const assignmentVectors = [];

    for (const [entity, value] of Object.entries(solution)) {
      // Create positioned binding: relation(entity, value)
      const entityVec = executor.session.vocabulary.getOrCreate(entity);
      const valueVec = executor.session.vocabulary.getOrCreate(value);
      // Bind: operator XOR pos1(entity) XOR pos2(value)
      const assignment = bindAll(relationVec, withPosition(1, entityVec), withPosition(2, valueVec));
      assignmentVectors.push(assignment);
    }

    // Bundle all assignments into compound solution vector
    if (assignmentVectors.length > 0) {
      // bundle() expects array of vectors, not spread
      const solutionVec = bundle(assignmentVectors);
      solutionVectors.push({
        vector: solutionVec,
        assignments: Object.entries(solution).map(([e, v]) => ({ entity: e, value: v }))
      });
    }
  }

  // Generate proof info for each solution FIRST - show how constraints are satisfied
  const solutionsWithProof = result.solutions.map((sol, idx) => {
    const assignments = Object.entries(sol).map(([entity, value]) => ({
      predicate: solutionRelation,
      subject: entity,
      object: value,
      dsl: `${solutionRelation} ${entity} ${value}`
    }));

    // Generate constraint satisfaction proof
    const proofSteps = [];
    for (const constraint of constraintInfo) {
      if (constraint.type === 'noConflict') {
        const [e1, e2] = constraint.entities;
        const t1 = sol[e1];
        const t2 = sol[e2];
        if (t1 && t2 && t1 !== t2) {
          proofSteps.push({
            constraint: `${constraint.relation}(${e1}, ${e2})`,
            satisfied: true,
            reason: `${e1} at ${t1}, ${e2} at ${t2}, ${t1} ≠ ${t2}`
          });
        }
      }
    }

    return {
      index: idx + 1,
      facts: assignments,
      proof: proofSteps
    };
  });

  // Store compound solution vectors in KB (not individual facts)
  let storedSolutions = 0;
  if (result.success && solutionVectors.length > 0) {
    const cspTupleOp = executor.session.vocabulary.getOrCreate('cspTuple');
    for (let i = 0; i < solutionVectors.length; i++) {
      const { vector, assignments } = solutionVectors[i];
      const solutionName = `${stmt.destination}_sol${i + 1}`;

      // Get proof for this solution
      const solutionProof = solutionsWithProof[i]?.proof || [];
      const proofText = solutionProof
        .filter(p => p.satisfied)
        .map(p => `${p.constraint} satisfied: ${p.reason}`)
        .join('. ');

      // Store compound vector in KB with metadata about its components
      executor.session.kbFacts.push({
        name: solutionName,
        vector: vector,
        metadata: {
          operator: 'cspSolution',
          solutionRelation: solutionRelation,
          problemType: stmt.problemType,
          solutionIndex: i + 1,
          assignments: assignments,
          facts: assignments.map(a => `${solutionRelation} ${a.entity} ${a.value}`),
          proof: proofText
        }
      });

      // Store individual facts with constraint satisfaction proof
      for (const { entity, value } of assignments) {
        const factVec = bindAll(relationVec,
          withPosition(1, executor.session.vocabulary.getOrCreate(entity)),
          withPosition(2, executor.session.vocabulary.getOrCreate(value)));

        executor.session.addToKB(factVec, `${solutionRelation}_${entity}_${value}`, {
          operator: solutionRelation,
          args: [entity, value],
          source: 'csp',
          solutionIndex: i + 1,
          proof: proofText
        });
      }

      // Also store a deterministic n-ary tuple fact for multi-hole extraction from a single solution:
      // cspTuple <relation> <entity1> <value1> <entity2> <value2> ...
      // Uses the solve variable ordering to keep output stable.
      const byEntity = new Map(assignments.map(a => [a.entity, a.value]));
      const tupleArgs = [solutionRelation];
      const tupleVectors = [cspTupleOp, withPosition(1, relationVec)];
      let pos = 2;
      for (const entity of variables) {
        const value = byEntity.get(entity);
        if (!value) continue;
        tupleArgs.push(entity, value);
        tupleVectors.push(withPosition(pos++, executor.session.vocabulary.getOrCreate(entity)));
        tupleVectors.push(withPosition(pos++, executor.session.vocabulary.getOrCreate(value)));
      }
      const tupleVec = bindAll(...tupleVectors);
      executor.session.addToKB(tupleVec, `${solutionName}_tuple`, {
        operator: 'cspTuple',
        args: tupleArgs,
        source: 'csp',
        solutionRelation,
        solutionIndex: i + 1
      });

      storedSolutions++;
    }
  }

  // Return solutions with compound vectors for HDC-based retrieval
  return {
    type: 'solve',
    destination: solutionRelation,
    problemType: stmt.problemType,
    success: result.success,
    solutionCount: result.solutionCount,
    storedSolutions,
    // Constraint info for proof generation
    constraints: constraintInfo,
    // The relation to use in queries (the destination name)
    queryRelation: solutionRelation,
    // Include compound vectors for HDC queries
    compoundSolutions: solutionVectors.map((sv, i) => ({
      name: `${solutionRelation}_sol${i + 1}`,
      vector: sv.vector,
      assignments: sv.assignments
    })),
    // Structured facts with proof for NL generation
    solutions: solutionsWithProof,
    stats: result.stats
  };
}

function parsePositiveInt(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.floor(value);
    return n > 0 ? n : fallback;
  }
  const s = String(value ?? '').trim();
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildPlanFactVector(session, operator, args) {
  const opVec = session.vocabulary.getOrCreate(operator);
  const positioned = args.map((a, i) => withPosition(i + 1, session.vocabulary.getOrCreate(String(a))));
  return bindAll(opVec, ...positioned);
}

function executePlanningSolveBlock(executor, stmt) {
  const session = executor.session;
  const planName = stmt.destination || 'plan';

  // DS19 strict declarations: a solve block defines a relation name used in outputs/queries.
  if (stmt.destination) {
    session.semanticIndex?.relations?.add?.(stmt.destination);
  }

  let maxDepth = 6;
  const goalRefs = [];
  const startRefs = [];
  let guard = null;
  const conflictOperators = [];
  const locationOperators = [];

  for (const decl of stmt.declarations || []) {
    if (!decl || decl.kind !== 'from') continue;

    const key = String(decl.varName || '').trim();
    if (!key) continue;

    if (key === 'goal' || key === 'goals') {
      goalRefs.push(String(decl.source));
      continue;
    }
    if (key === 'start' || key === 'starts') {
      startRefs.push(String(decl.source));
      continue;
    }
    if (key === 'maxDepth' || key === 'depth') {
      maxDepth = parsePositiveInt(decl.source, maxDepth);
      continue;
    }
    if (key === 'guard' || key === 'supervisor' || key === 'watcher') {
      guard = String(decl.source ?? '').trim() || null;
      continue;
    }
    if (key === 'conflictOp' || key === 'conflictsOp' || key === 'conflictRelation' || key === 'conflictsRelation') {
      conflictOperators.push(String(decl.source ?? '').trim());
      continue;
    }
    if (key === 'locationOp' || key === 'locationsOp' || key === 'locationRelation' || key === 'locationsRelation') {
      locationOperators.push(String(decl.source ?? '').trim());
    }
  }

  const goals = resolveGoalRefs(session, goalRefs);
  const startFacts = resolveGoalRefs(session, startRefs);

  if (goals.length === 0) {
    return {
      type: 'solve',
      destination: planName,
      description: 'plan',
      problemType: stmt.problemType,
      success: false,
      error: 'Planning solve requires at least one "goal from <ref>" declaration',
      solutionCount: 0,
      solutions: []
    };
  }

  const planning = solvePlanning(session, {
    goals,
    startFacts,
    maxDepth,
    guard,
    conflictOperators,
    locationOperators
  });
  if (!planning.success) {
    return {
      type: 'solve',
      destination: planName,
      description: 'plan',
      problemType: stmt.problemType,
      success: false,
      error: planning.error || 'No plan found',
      solutionCount: 0,
      solutions: [],
      stats: planning.stats
    };
  }

  // Store a plan summary fact: plan <planName> <length>
  const lengthStr = String(planning.plan.length);
  const planVec = buildPlanFactVector(session, 'plan', [planName, lengthStr]);
  session.addToKB(planVec, `${planName}_plan`, { operator: 'plan', args: [planName, lengthStr], source: 'planning' });

  // Optional: action signatures for nicer planAction facts.
  // Convention: actionSig <ActionName> <Tool> <Param1> <Param2>
  const actionSig = new Map();
  for (const fact of session.kbFacts || []) {
    const meta = fact?.metadata;
    if (!meta || meta.operator !== 'actionSig') continue;
    if (!Array.isArray(meta.args) || meta.args.length < 4) continue;
    const [actionName, tool, param1, param2] = meta.args;
    if (!actionName || !tool) continue;
    if (!actionSig.has(actionName)) {
      actionSig.set(actionName, { tool, param1, param2 });
    }
  }

  const stepFacts = [];
  for (let i = 0; i < planning.plan.length; i++) {
    const stepIndex = String(i + 1);
    const actionName = planning.plan[i];

    const vec = buildPlanFactVector(session, 'planStep', [planName, stepIndex, actionName]);
    session.addToKB(vec, `${planName}_step${stepIndex}`, {
      operator: 'planStep',
      args: [planName, stepIndex, actionName],
      source: 'planning'
    });

    stepFacts.push({ dsl: `planStep ${planName} ${stepIndex} ${actionName}` });

    const sig = actionSig.get(actionName);
    if (sig) {
      const actionArgs = [planName, stepIndex, sig.tool];
      if (sig.param1) actionArgs.push(sig.param1);
      if (sig.param2) actionArgs.push(sig.param2);

      const actionVec = buildPlanFactVector(session, 'planAction', actionArgs);
      session.addToKB(actionVec, `${planName}_action${stepIndex}`, {
        operator: 'planAction',
        args: actionArgs,
        source: 'planning'
      });

      stepFacts.push({ dsl: `planAction ${actionArgs.join(' ')}` });
    }
  }

  return {
    type: 'solve',
    destination: planName,
    description: 'plan',
    problemType: stmt.problemType,
    success: true,
    solutionCount: 1,
    storedSolutions: 1,
    solutions: [
      {
        index: 1,
        facts: stepFacts
      }
    ],
    stats: planning.stats,
    plan: planning.plan
  };
}

/**
 * Find all conflict pairs from KB
 * @param {Executor} executor - Executor instance
 * @param {string} relation - Relation name to search
 * @returns {Array<Array<string>>} Array of [entity1, entity2] pairs
 */
export function findConflictPairs(executor, relation) {
  const conflicts = [];
  for (const fact of executor.session.kbFacts) {
    executor.session.reasoningStats.kbScans++;
    const meta = fact.metadata;
    if (meta?.operator === relation && meta.args?.length === 2) {
      const [p1, p2] = meta.args;
      // Avoid duplicates
      if (!conflicts.some(c => (c[0] === p1 && c[1] === p2) || (c[0] === p2 && c[1] === p1))) {
        conflicts.push([p1, p2]);
      }
    }
  }
  return conflicts;
}
