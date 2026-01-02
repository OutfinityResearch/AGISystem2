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
import { registerArtifact, registerEvidence } from './urc-store.mjs';

function nodeToAtomOrNumber(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Reference') return node.name;
  if (node.type === 'Literal') return node.value;
  return null;
}

function parseSolveOptionExpr(optionExpr) {
  if (!optionExpr || optionExpr.type !== 'Compound') return null;
  const key = optionExpr.operator?.name;
  if (!key) return null;
  const rawArgs = Array.isArray(optionExpr.args) ? optionExpr.args : [];
  const args = rawArgs.map(nodeToAtomOrNumber);
  return { key, args };
}

function parseSolveStatementDeclarations(stmt) {
  const declarations = [];
  const args = Array.isArray(stmt?.args) ? stmt.args : [];
  const optionArgs = args.slice(1);

  const optionItems = [];
  for (const arg of optionArgs) {
    if (!arg) continue;
    if (arg.type === 'List') {
      for (const item of arg.items || []) optionItems.push(item);
      continue;
    }
    optionItems.push(arg);
  }

  for (const item of optionItems) {
    const opt = parseSolveOptionExpr(item);
    if (!opt) continue;

    const keyNorm = String(opt.key || '').trim();
    if (!keyNorm) continue;

    // CSP assignment-style options (generic, DS16-aligned)
    if (keyNorm === 'variablesFrom' || keyNorm === 'varsFrom' || keyNorm === 'entitiesFrom') {
      const typeName = opt.args?.[0];
      if (typeName) declarations.push({ varName: 'variables', kind: 'from', source: typeName });
      continue;
    }
    if (keyNorm === 'domainFrom' || keyNorm === 'valuesFrom') {
      const typeName = opt.args?.[0];
      if (typeName) declarations.push({ varName: 'domain', kind: 'from', source: typeName });
      continue;
    }
    if (keyNorm === 'noConflict') {
      const rel = opt.args?.[0];
      if (rel) declarations.push({ varName: 'noConflict', kind: 'noConflict', source: rel });
      continue;
    }
    if (keyNorm === 'allDifferent') {
      declarations.push({ varName: 'allDifferent', kind: 'allDifferent', source: opt.args?.[0] || 'variables' });
      continue;
    }
    if (keyNorm === 'maxSolutions' || keyNorm === 'maxResults' || keyNorm === 'max_solutions' || keyNorm === 'max_results') {
      const n = opt.args?.[0];
      if (n !== null && n !== undefined) declarations.push({ varName: 'maxSolutions', kind: 'from', source: n });
      continue;
    }
    if (keyNorm === 'timeoutMs' || keyNorm === 'timeout' || keyNorm === 'timeout_ms') {
      const n = opt.args?.[0];
      if (n !== null && n !== undefined) declarations.push({ varName: 'timeout', kind: 'from', source: n });
      continue;
    }

    // Planning options (solve planning ...)
    if (keyNorm === 'start') {
      const ref = opt.args?.[0];
      if (ref) declarations.push({ varName: 'start', kind: 'from', source: ref });
      continue;
    }
    if (keyNorm === 'goal') {
      const ref = opt.args?.[0];
      if (ref) declarations.push({ varName: 'goal', kind: 'from', source: ref });
      continue;
    }
    if (keyNorm === 'maxDepth' || keyNorm === 'depth') {
      const n = opt.args?.[0];
      if (n !== null && n !== undefined) declarations.push({ varName: 'maxDepth', kind: 'from', source: n });
      continue;
    }
    if (keyNorm === 'guard') {
      const name = opt.args?.[0];
      if (name) declarations.push({ varName: 'guard', kind: 'from', source: name });
      continue;
    }
    if (keyNorm === 'conflictOp' || keyNorm === 'conflictsOp' || keyNorm === 'conflictRelation' || keyNorm === 'conflictsRelation') {
      const op = opt.args?.[0];
      if (op) declarations.push({ varName: 'conflictOp', kind: 'from', source: op });
      continue;
    }
    if (keyNorm === 'locationOp' || keyNorm === 'locationsOp' || keyNorm === 'locationRelation' || keyNorm === 'locationsRelation') {
      const op = opt.args?.[0];
      if (op) declarations.push({ varName: 'locationOp', kind: 'from', source: op });
      continue;
    }
  }

  return declarations;
}

export function executeSolveStatement(executor, stmt) {
  const args = Array.isArray(stmt?.args) ? stmt.args : [];
  const problemType = nodeToAtomOrNumber(args[0]);
  const pseudo = {
    destination: stmt.destination,
    problemType,
    declarations: parseSolveStatementDeclarations(stmt),
    line: stmt.line,
    column: stmt.column
  };
  return executeSolveBlock(executor, pseudo);
}

/**
 * Execute solve block - runs CSP solver
 * @param {Executor} executor - Executor instance
 * @param {SolveBlock} stmt - Solve block AST
 * @returns {Object} Solve result
 */
export function executeSolveBlock(executor, stmt) {
  const rawProblemType = String(stmt.problemType || '').trim();
  const problemType = rawProblemType.toLowerCase();
  if (problemType === 'planning' || problemType === 'plan') {
    return executePlanningSolveBlock(executor, stmt);
  }

  // CP/CSP solve blocks are intentionally generic:
  // - old scenario-specific names should not be treated as special runtime modes.
  // - we keep `problemType` only as metadata; the solver semantics come from declarations.
  const canonicalProblemType = problemType || 'csp';
  const solutionRelation = stmt.destination;

  // DS19 strict declarations: a solve block defines a relation name (its destination)
  // used to query solution bindings (e.g. `@seating solve ...` then `seating Alice ?t`).
  if (stmt.destination) {
    executor.session.semanticIndex?.relations?.add?.(stmt.destination);
    executor.session.semanticIndex?.assignmentRelations?.add?.(stmt.destination);
  }

  // DS16: allow per-solve overrides like `maxSolutions from 200`.
  let maxSolutions = null;
  let timeoutMs = 5000;

  const solver = new CSPSolver(executor.session, {
    timeout: timeoutMs,
    maxSolutions: maxSolutions ?? undefined
  });

  // Process declarations to configure solver
  let variableType = null;
  let domainType = null;
  const constraints = [];

  for (const decl of stmt.declarations) {
    if (decl.kind === 'from') {
      // Domain declaration: variables from <Type>, domain from <Type>
      if (decl.varName === 'variables' || decl.varName === 'guests' || decl.varName === 'vars' || decl.varName === 'entities') {
        variableType = decl.source;
      } else if (decl.varName === 'domain' || decl.varName === 'tables' || decl.varName === 'values' || decl.varName === 'rooms') {
        domainType = decl.source;
      } else if (
        decl.varName === 'maxSolutions' ||
        decl.varName === 'max_solutions' ||
        decl.varName === 'maxResults' ||
        decl.varName === 'max_results'
      ) {
        maxSolutions = parsePositiveInt(decl.source, null);
      } else if (decl.varName === 'timeout' || decl.varName === 'timeoutMs' || decl.varName === 'timeout_ms') {
        timeoutMs = parsePositiveInt(decl.source, timeoutMs);
      }
    } else if (decl.kind === 'noConflict') {
      // Constraint: noConflict conflictsWith
      constraints.push({ type: 'noConflict', relation: decl.source });
    } else if (decl.kind === 'allDifferent') {
      constraints.push({ type: 'allDifferent', target: decl.source });
    }
  }

  // Apply CSP options once we've parsed declarations.
  if (Number.isFinite(maxSolutions) && maxSolutions > 0) {
    solver.options.maxSolutions = maxSolutions;
  }
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    solver.options.timeout = timeoutMs;
  }

  if (!variableType) {
    return {
      type: 'solve',
      destination: stmt.destination,
      problemType: stmt.problemType,
      success: false,
      error: 'solve block requires `variables from <Type>` (or `guests from <Type>`)',
      solutionCount: 0,
      solutions: []
    };
  }

  if (!domainType) {
    return {
      type: 'solve',
      destination: stmt.destination,
      problemType: stmt.problemType,
      success: false,
      error: 'solve block requires `domain from <Type>` (or `tables from <Type>`)',
      solutionCount: 0,
      solutions: []
    };
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
    if (c.type === 'allDifferent') {
      // DS16: allDifferent across all variables in this solve block.
      // Optional `allDifferent guests` is accepted; the token is informational here.
      if (variables.length >= 2) {
        constraintInfo.push({ type: 'allDifferent', entities: [...variables] });
        solver.addAllDifferent(...variables);
      }
    }
  }

  // URC auditability (DS73 direction): emit a normalized CSP artifact for inspection/debug.
  // This is intentionally JSON-as-text to keep it dependency-free and easy to inspect.
  const cspArtifact = registerArtifact(executor.session, {
    format: 'CSP_JSON_V0',
    text: JSON.stringify({
      destination: solutionRelation,
      declaredProblemType: rawProblemType || null,
      canonicalProblemType,
      options: {
        timeoutMs: solver.options.timeout,
        maxSolutions: solver.options.maxSolutions
      },
      variables: [...variables],
      domain: [...domain],
      constraints: constraints.map(c => ({ ...c })),
      expandedConstraints: constraintInfo.map(c => ({ ...c }))
    }, null, 2)
  });

  // Solve
  const result = solver.solve();

  // The destination becomes the relation for all solution facts
  // e.g., @seating solve ... → "seating Alice T1", "seating Bob T2"
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
      const assignment = bindAll(
        relationVec,
        withPosition(1, entityVec, executor.session),
        withPosition(2, valueVec, executor.session)
      );
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
      if (constraint.type === 'allDifferent') {
        const used = new Set();
        let ok = true;
        const assignmentsText = [];
        for (const entity of constraint.entities || []) {
          const value = sol[entity];
          if (!value) continue;
          assignmentsText.push(`${entity} at ${value}`);
          if (used.has(value)) {
            ok = false;
            break;
          }
          used.add(value);
        }
        if (ok) {
          proofSteps.push({
            constraint: `allDifferent(${(constraint.entities || []).join(', ')})`,
            satisfied: true,
            reason: `${assignmentsText.join(', ')} (all values distinct)`
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

  // URC auditability (DS73 direction): attach evidence for the CSP outcome.
  // - If we have solutions: each solution becomes a Model evidence with an associated solution artifact.
  // - If we have no solutions: emit a single Trace evidence with status Infeasible referencing the CSP artifact.
  const urc = {
    cspArtifactId: cspArtifact?.id || null,
    solutionEvidenceIds: [],
    infeasibleEvidenceId: null
  };

  if (result.success && solutionsWithProof.length > 0) {
    for (const sol of solutionsWithProof) {
      const solArtifact = registerArtifact(executor.session, {
        format: 'CSP_SOLUTION_JSON_V0',
        text: JSON.stringify({
          destination: solutionRelation,
          solutionIndex: sol.index,
          facts: sol.facts,
          proof: sol.proof
        }, null, 2)
      });
      const ev = registerEvidence(executor.session, {
        kind: 'Model',
        method: 'CP',
        tool: 'CSPSolver',
        status: 'Sat',
        supports: solutionRelation || '_',
        artifactId: solArtifact.id,
        scope: '_'
      });
      urc.solutionEvidenceIds.push(ev.id);
    }
  } else {
    const ev = registerEvidence(executor.session, {
      kind: 'Trace',
      method: 'CP',
      tool: 'CSPSolver',
      status: 'Infeasible',
      supports: solutionRelation || '_',
      artifactId: cspArtifact?.id || '_',
      scope: '_'
    });
    urc.infeasibleEvidenceId = ev.id;
  }

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
          problemType: canonicalProblemType,
          declaredProblemType: rawProblemType || null,
          solutionIndex: i + 1,
          assignments: assignments,
          facts: assignments.map(a => `${solutionRelation} ${a.entity} ${a.value}`),
          proof: proofText
        }
      });

      // Store individual facts with constraint satisfaction proof
      for (const { entity, value } of assignments) {
        const factVec = bindAll(
          relationVec,
          withPosition(1, executor.session.vocabulary.getOrCreate(entity), executor.session),
          withPosition(2, executor.session.vocabulary.getOrCreate(value), executor.session)
        );

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
      const tupleVectors = [cspTupleOp, withPosition(1, relationVec, executor.session)];
      let pos = 2;
      for (const entity of variables) {
        const value = byEntity.get(entity);
        if (!value) continue;
        tupleArgs.push(entity, value);
        tupleVectors.push(withPosition(pos++, executor.session.vocabulary.getOrCreate(entity), executor.session));
        tupleVectors.push(withPosition(pos++, executor.session.vocabulary.getOrCreate(value), executor.session));
      }
      const tupleVec = bindAll(...tupleVectors);
      executor.session.addToKB(tupleVec, `${solutionName}_tuple`, {
        operator: 'cspTuple',
        args: tupleArgs,
        source: 'csp',
        proof: proofText,
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
    urc,
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
  const positioned = args.map((a, i) => withPosition(i + 1, session.vocabulary.getOrCreate(String(a)), session));
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
  session.addToKB(planVec, `${planName}_plan`, {
    operator: 'plan',
    args: [planName, lengthStr],
    source: 'planning',
    // Persist the solve spec for proof-real verification (DS19).
    plan: planning.plan,
    goals,
    startFacts,
    maxDepth,
    guard: guard || null,
    conflictOperators,
    locationOperators
  });

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
