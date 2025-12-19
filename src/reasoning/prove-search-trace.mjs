/**
 * AGISystem2 - Proof Search Trace Generation
 * @module reasoning/prove-search-trace
 *
 * Builds detailed search traces for failed proofs:
 * - Inheritance chain traversal
 * - Relation path finding
 * - Rule condition analysis
 * - Negation trace building
 */

/**
 * Build a search trace describing what was searched for failed proofs
 * @param {ProofEngine} engine - Proof engine instance
 * @param {Object} goal - Goal that failed
 * @param {string} goalStr - Goal string representation
 * @returns {string} Search trace description
 */
export function buildSearchTrace(engine, goal, goalStr) {
  const traces = [];
  const op = engine.extractOperatorName(goal);
  const args = (goal.args || []).map(a => engine.extractArgName(a)).filter(Boolean);
  const semanticIndex = engine.session?.useSemanticIndex ? engine.session?.semanticIndex : null;

  if (args.length < 2) {
    return `Searched ${goalStr} in KB. Not found.`;
  }

  const entity = args[0];
  const target = args[1];
  const componentKB = engine.session?.componentKB;

  // 1. Check if entity exists in KB
  let entityExists = false;
  let entityFacts = [];
  if (componentKB) {
    entityFacts = componentKB.findByArg0(entity, false);
    // For temporal/causal facts, treat presence as source or target as existence
    entityExists = entityFacts.length > 0 ||
      componentKB.findByOperatorAndArg1(op, entity).length > 0 ||
      componentKB.findByOperatorAndArg0(op, entity).length > 0;
  } else {
    for (const fact of engine.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.args?.[0] === entity) {
        entityExists = true;
        entityFacts.push(meta);
      }
      if (meta?.args?.[1] === entity && meta.operator === op) {
        entityExists = true;
      }
    }
  }

  if (!entityExists) {
    traces.push(`Searched isA ${entity} ?type in KB. Not found`);
    traces.push(`Entity unknown`);
    traces.push(`No applicable inheritance paths`);
    return `Search: ${traces.join('. ')}.`;
  }

  // 2. Get the isA chain for the entity
  const isAChain = buildIsAChain(engine, entity, componentKB);

  if (isAChain.length > 0) {
    traces.push(isAChain.join('. '));
  }

  // 3a. Check relevant rules for this operator to surface missing conditions
  const ruleTrace = describeRuleCheck(engine, op, entity);
  if (ruleTrace) {
    traces.push(ruleTrace);
  }

  // 3. Check what we were looking for and why it failed
  if (op === 'isA') {
    traces.push(`No path exists from ${entity} to ${target}`);
  } else if ((semanticIndex?.isInheritableProperty?.(op)) || ['can', 'has', 'likes', 'knows', 'owns', 'uses'].includes(op)) {
    // Property inheritance - check if any ancestor has it
    const traceResult = buildPropertyInheritanceTrace(engine, op, target, isAChain);
    traces.push(...traceResult);
  } else if ((semanticIndex?.isTransitive?.(op)) || ['locatedIn', 'causes', 'before', 'partOf'].includes(op)) {
    traces.push(`Searched ${op} ${entity} ?next in KB. Not found`);
    const edges = buildRelationEdges(engine, op);
    const outgoing = edges.get(entity) || [];
    if (outgoing.length === 0) {
      traces.push(`${entity} has no outgoing ${op} relations`);
    }
    const reversePath = findRelationPath(edges, target, entity);
    if (reversePath.length > 0) {
      traces.push(`Reverse path: ${reversePath.join(' -> ')}`);
      traces.push('Path exists in opposite direction only');
      const inverse = semanticIndex?.getInverseRelation?.(op);
      const dirLabel =
        op === 'causes'
          ? 'Causal direction violated'
          : inverse
            ? `${op} direction violated (inverse=${inverse})`
            : `${op} direction violated`;
      traces.push(dirLabel);
    } else {
      traces.push(`No transitive path to ${target}`);
    }
  }

  return traces.length > 0 ? `Search: ${traces.join('. ')}.` : `Searched ${goalStr}. Not found.`;
}

/**
 * Build isA inheritance chain for an entity
 * @param {ProofEngine} engine - Proof engine instance
 * @param {string} entity - Entity name
 * @param {Object} componentKB - Component KB
 * @returns {Array<string>} Chain steps
 */
function buildIsAChain(engine, entity, componentKB) {
  const isAChain = [];
  let current = entity;
  const visited = new Set();

  while (current && !visited.has(current)) {
    visited.add(current);
    let nextParent = null;

    if (componentKB) {
      const isAFacts = componentKB.findByOperatorAndArg0('isA', current);
      if (isAFacts.length > 0 && isAFacts[0].args?.[1]) {
        nextParent = isAFacts[0].args[1];
      }
    } else {
      for (const fact of engine.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current) {
          nextParent = meta.args[1];
          break;
        }
      }
    }

    if (nextParent) {
      isAChain.push(`${current} isA ${nextParent}`);
      current = nextParent;
    } else {
      break;
    }
  }

  return isAChain;
}

/**
 * Build property inheritance trace for failed proofs
 * @param {ProofEngine} engine - Proof engine instance
 * @param {string} op - Operator name
 * @param {string} target - Target property value
 * @param {Array<string>} isAChain - isA chain steps
 * @returns {Array<string>} Trace entries
 */
function buildPropertyInheritanceTrace(engine, op, target, isAChain) {
  const traces = [];
  let found = false;
  const checkedTypes = [];

  // Check if the property exists for any type
  for (const fact of engine.session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === op && meta.args?.[1] === target) {
      checkedTypes.push(meta.args[0]);
      // Check if entity isA that type
      const propHolder = meta.args[0];
      if (isAChain.some(step => step.includes(propHolder))) {
        found = true;
        break;
      }
    }
  }

  if (!found && checkedTypes.length > 0) {
    traces.push(`Checked: ${checkedTypes.slice(0, 3).map(t => `${t} ${op} ${target}`).join(', ')}`);
    traces.push(`Entity is not a ${checkedTypes.join(' or ')}`);
    traces.push(`Property not inheritable`);
  } else if (checkedTypes.length === 0) {
    traces.push(`No ${op} ${target} facts found in KB`);
  }

  return traces;
}

/**
 * Build adjacency list for a binary relation in KB
 * @param {ProofEngine} engine - Proof engine instance
 * @param {string} op - Relation operator
 * @returns {Map<string, Array<string>>} Adjacency map
 */
export function buildRelationEdges(engine, op) {
  const edges = new Map();
  for (const fact of engine.session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === op && meta.args?.length >= 2) {
      const from = meta.args[0];
      const to = meta.args[1];
      if (!edges.has(from)) edges.set(from, []);
      edges.get(from).push(to);
    }
  }
  return edges;
}

/**
 * Find a path in a relation graph from start to target (BFS)
 * @param {Map<string, Array<string>>} edges - Adjacency map
 * @param {string} start - Start node
 * @param {string} target - Target node
 * @returns {Array<string>} Path if found, empty array otherwise
 */
export function findRelationPath(edges, start, target) {
  const queue = [[start, [start]]];
  const visited = new Set();

  while (queue.length > 0) {
    const [node, path] = queue.shift();
    if (node === target) return path;
    if (visited.has(node)) continue;
    visited.add(node);
    const neighbors = edges.get(node) || [];
    for (const n of neighbors) {
      queue.push([n, [...path, n]]);
    }
  }
  return [];
}

/**
 * Describe rule checks for a failed proof (high level)
 * @param {ProofEngine} engine - Proof engine instance
 * @param {string} op - Goal operator
 * @param {string} entity - Goal subject
 * @returns {string|null} Trace summary
 */
export function describeRuleCheck(engine, op, entity) {
  if (!engine.session?.rules?.length) return null;

  const matching = engine.session.rules.filter(r => {
    const concOp = r.conclusionAST?.operator?.name || r.conclusionAST?.operator?.value;
    return concOp === op;
  });
  if (matching.length === 0) return null;

  // Inspect first matching rule (deterministic)
  const rule = matching[0];
  const leaves = extractLeafConditions(rule.conditionParts);
  if (leaves.length === 0) {
    return `Checked rule: ${rule.name || rule.source}. Conditions could not be analyzed.`;
  }

  const found = [];
  const missing = [];

  for (const leaf of leaves) {
    const args = [];
    for (const arg of leaf.args || []) {
      if (arg.isVariable) {
        // Bind the first variable to the entity for a meaningful trace
        args.push(arg.name === 'x' || arg.name === 'subject' ? entity : `?${arg.name}`);
      } else {
        args.push(arg.name);
      }
    }
    const factStr = `${leaf.op} ${args.join(' ')}`.trim();
    const exists = engine.factExists(leaf.op, args[0], args[1]);
    if (exists) found.push(factStr);
    else missing.push(factStr);
  }

  let summary = `Checked rule: ${rule.name || rule.source}.`;
  if (found.length > 0) summary += ` Found: ${found.join(', ')}.`;
  if (missing.length > 0) summary += ` Missing: ${missing.join(', ')}.`;
  return summary;
}

/**
 * Extract leaf conditions from a compound condition structure
 * @param {Object} condParts - conditionParts tree
 * @returns {Array<{op:string,args:Array}>}
 */
export function extractLeafConditions(condParts) {
  if (!condParts) return [];
  if (condParts.type === 'leaf' && condParts.ast) {
    const op = condParts.ast.operator?.name || condParts.ast.operator?.value;
    const args = (condParts.ast.args || []).map(a => ({
      name: a.name || a.value || '',
      isVariable: a.type === 'Hole'
    }));
    return [{ op, args }];
  }
  if (condParts.type === 'And' || condParts.type === 'Or') {
    return condParts.parts.flatMap(p => extractLeafConditions(p));
  }
  if (condParts.type === 'Not') {
    return extractLeafConditions(condParts.inner);
  }
  return [];
}

/**
 * Build search trace for negated goals
 * @param {ProofEngine} engine - Proof engine instance
 * @param {Object} goal - Goal statement
 * @param {Object} negationInfo - Negation details
 * @returns {string} Search trace
 */
export function buildNegationSearchTrace(engine, goal, negationInfo) {
  const traces = [];
  const op = engine.extractOperatorName(goal);
  const args = (goal.args || []).map(a => engine.extractArgName(a)).filter(Boolean);

  if (args.length < 2) {
    return `Search: Goal negated by Not(${negationInfo.negationRef}).`;
  }

  const entity = args[0];
  const target = args[1];

  // Find types that have the property we're checking (e.g., Bird for can Fly)
  // Check both direct facts and rules
  const typesWithProperty = new Set();
  for (const fact of engine.session.kbFacts) {
    const meta = fact.metadata;
    if (meta?.operator === op && meta.args?.[1] === target) {
      typesWithProperty.add(meta.args[0]);
    }
  }

  // Also check rules that derive the property
  for (const rule of engine.session.rules) {
    if (!rule.conclusionAST) continue;
    const concOp = rule.conclusionAST.operator?.name || rule.conclusionAST.operator?.value;
    if (concOp === op) {
      const ruleTargetArg = rule.conclusionAST.args?.[1];
      const ruleTarget = ruleTargetArg?.name || ruleTargetArg?.value;
      if (ruleTarget === target) {
        // Find the type in the condition
        const condAST = rule.conditionAST;
        if (condAST) {
          const condOp = condAST.operator?.name || condAST.operator?.value;
          if (condOp === 'isA') {
            const condType = condAST.args?.[1]?.name || condAST.args?.[1]?.value;
            if (condType) {
              typesWithProperty.add(condType);
            }
          }
        }
      }
    }
  }

  // Build isA chain for the entity, stopping at relevant type
  const isAChain = [];
  let current = entity;
  const visited = new Set();
  let foundRelevantType = null;

  while (current && !visited.has(current)) {
    visited.add(current);

    // Check if we found a type that has the property
    if (typesWithProperty.has(current)) {
      foundRelevantType = current;
      // Don't break - finish this step
    }

    let nextParent = null;
    for (const fact of engine.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator === 'isA' && meta.args?.[0] === current) {
        nextParent = meta.args[1];
        break;
      }
    }

    if (nextParent) {
      isAChain.push(`${current} isA ${nextParent}`);
      current = nextParent;

      // Stop after recording the step that reaches the relevant type
      if (foundRelevantType && typesWithProperty.has(nextParent)) {
        break;
      }
      if (foundRelevantType) {
        break; // Stop one step after the relevant type
      }
    } else {
      break;
    }
  }

  if (isAChain.length > 0) {
    traces.push(isAChain.join('. '));
  }

  // Check if there's a rule that would have applied
  if (['can', 'has', 'likes', 'knows'].includes(op) && foundRelevantType) {
    traces.push(`Rule: isA ${foundRelevantType} implies ${op} ${target} would apply`);
  }

  // Add negation info
  traces.push(`Found explicit negation: Not(${op} ${entity} ${target})`);
  traces.push('Negation blocks inference');

  return `Search: ${traces.join('. ')}.`;
}
