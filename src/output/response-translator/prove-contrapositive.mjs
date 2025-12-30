function splitGoalParts(goalString) {
  if (!goalString || typeof goalString !== 'string') return [];
  return goalString.trim().split(/\s+/).filter(p => p.length > 0 && !p.startsWith('@'));
}

function normalizeSentence(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .toLowerCase();
}

function parseNotGoal(goalString) {
  const parts = splitGoalParts(goalString);
  if (parts.length < 2 || parts[0] !== 'Not') return null;
  const innerParts = parts.slice(1);
  if (innerParts.length === 0) return null;
  innerParts[0] = innerParts[0].replace(/^\(/, '');
  innerParts[innerParts.length - 1] = innerParts[innerParts.length - 1].replace(/\)$/, '');
  const innerOp = innerParts[0];
  const innerArgs = innerParts.slice(1);
  if (!innerOp) return null;
  return { innerOp, innerArgs };
}

function renderNotHuman(session, innerOp, innerArgs) {
  const inner = session.generateText(innerOp, innerArgs).replace(/[.!?]+$/, '');
  return `NOT (${inner})`;
}

function goalToHuman(session, goalString) {
  const parts = splitGoalParts(goalString);
  if (parts.length >= 2 && parts[0] === 'Not') {
    const parsed = parseNotGoal(goalString);
    if (parsed) return renderNotHuman(session, parsed.innerOp, parsed.innerArgs);
  }
  if (parts.length < 2) return parts.join(' ') || 'statement';
  const op = parts[0];
  const args = parts.slice(1);
  return session.generateText(op, args).replace(/\.$/, '');
}

function extractOpArgsFromStatementAst(ast) {
  if (!ast || typeof ast !== 'object') return null;
  if (ast.type !== 'Statement') return null;
  const op = ast.operator?.name || ast.operator?.value;
  const args = Array.isArray(ast.args) ? ast.args : [];
  if (!op) return null;
  return { op, args };
}

function collectLeafAsts(part, out = []) {
  if (!part || typeof part !== 'object') return out;
  if (part.type === 'leaf' && part.ast) out.push(part.ast);
  if (part.inner) collectLeafAsts(part.inner, out);
  if (Array.isArray(part.parts)) for (const p of part.parts) collectLeafAsts(p, out);
  return out;
}

function termToToken(node, bindings) {
  if (!node || typeof node !== 'object') return String(node ?? '');
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Hole') {
    const bound = bindings && typeof bindings === 'object' ? bindings[node.name] : null;
    return bound || `?${node.name}`;
  }
  if (node.type === 'Reference') return `@${node.name}`;
  if (node.type === 'Literal') return String(node.value);
  return typeof node.toString === 'function' ? node.toString() : String(node);
}

function statementToHuman(session, ast, bindings) {
  const extracted = extractOpArgsFromStatementAst(ast);
  if (!extracted) return null;
  const args = extracted.args.map(a => termToToken(a, bindings));
  return session.generateText(extracted.op, args).replace(/[.!?]+$/, '');
}

function compoundToHuman(session, part, bindings) {
  if (!part || typeof part !== 'object') return String(part ?? '');
  if (part.type === 'leaf') return statementToHuman(session, part.ast, bindings) || '';
  if (part.type === 'Not' && part.inner) return `NOT (${compoundToHuman(session, part.inner, bindings)})`;
  if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
    const joiner = part.type === 'And' ? ' AND ' : ' OR ';
    return part.parts.map(p => `(${compoundToHuman(session, p, bindings)})`).join(joiner);
  }
  return typeof part.toString === 'function' ? part.toString() : String(part);
}

function inferBindingsFromNotGoal(ruleObj, parsedNot, session) {
  if (!ruleObj || !parsedNot) return null;

  const tryMatchStatement = (leafAst) => {
    const extracted = extractOpArgsFromStatementAst(leafAst);
    if (!extracted || extracted.op !== parsedNot.innerOp) return null;
    if (extracted.args.length !== parsedNot.innerArgs.length) return null;
    const bindings = {};
    for (let i = 0; i < extracted.args.length; i++) {
      const argNode = extracted.args[i];
      const wanted = parsedNot.innerArgs[i];
      if (argNode?.type === 'Hole') {
        bindings[argNode.name] = wanted;
      } else {
        const token = termToToken(argNode, null);
        if (token !== wanted) return null;
      }
    }
    return bindings;
  };

  if (!ruleObj.conditionParts && ruleObj.conditionAST) {
    return tryMatchStatement(ruleObj.conditionAST);
  }

  if (!ruleObj.conditionParts) return null;
  const leaves = collectLeafAsts(ruleObj.conditionParts, []);
  for (const leaf of leaves) {
    const bindings = tryMatchStatement(leaf);
    if (bindings) return bindings;
  }
  return null;
}

function renderNotFact(session, fact) {
  const parts = String(fact || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'Not') return null;
  const innerOp = String(parts[1] || '').replace(/^\(/, '');
  const innerArgs = parts.slice(2).map((p, idx, arr) => {
    if (idx === arr.length - 1) return String(p).replace(/\)$/, '');
    return p;
  });
  if (!innerOp) return null;
  return renderNotHuman(session, innerOp, innerArgs);
}

function renderPositiveFact(session, fact) {
  const parts = String(fact || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const op = String(parts[0] || '').replace(/^\(/, '');
  const args = parts.slice(1).map((p, idx, arr) => {
    if (idx === arr.length - 1) return String(p).replace(/\)$/, '');
    return p;
  });
  if (!op) return null;
  return session.generateText(op, args).replace(/[.!?]+$/, '');
}

function renderFact(session, fact) {
  if (!fact) return null;
  const text = String(fact).trim();
  if (text.startsWith('Not ')) return renderNotFact(session, text);
  if (text.startsWith('Not(')) return renderNotFact(session, text.replace('Not(', 'Not ').replace(',', ' ').replace(')', ''));
  return renderPositiveFact(session, text);
}

export function describeContrapositiveProof(session, reasoningResult) {
  if (!session || !reasoningResult) return null;
  const parsedNot = parseNotGoal(reasoningResult.goal);
  if (!parsedNot) return null;

  const steps = reasoningResult.steps || [];
  const hasContrapositive = steps.some(s => s?.inference === 'contrapositive');
  if (!hasContrapositive) return null;
  const goalText = goalToHuman(session, reasoningResult.goal);

  const lines = [];
  let previousNegated = null;

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;

    if (step.operation === 'rule_application' && step.inference === 'contrapositive') {
      const produced = typeof step.fact === 'string' ? renderNotFact(session, step.fact) : null;
      const ruleObj = step.ruleId ? (session.rules || []).find(r => r.id === step.ruleId) : null;
      const parsedProduced = typeof step.fact === 'string' ? parseNotGoal(step.fact) : null;
      const bindings = inferBindingsFromNotGoal(ruleObj, parsedProduced, session) || null;

      const condText = ruleObj?.conditionParts ? compoundToHuman(session, ruleObj.conditionParts, bindings) : null;
      const condTextFallback = (!condText && ruleObj?.conditionAST) ? (statementToHuman(session, ruleObj.conditionAST, bindings) || null) : null;
      const concText = ruleObj?.conclusionParts
        ? compoundToHuman(session, ruleObj.conclusionParts, bindings)
        : (ruleObj?.conclusionAST ? (statementToHuman(session, ruleObj.conclusionAST, bindings) || null) : null);

      const finalCondText = condText || condTextFallback;
      const ruleText = (finalCondText && concText) ? `IF (${finalCondText}) THEN (${concText})` : null;
      if (ruleText && previousNegated && produced) {
        lines.push(`Using contrapositive on rule: ${ruleText}. Since ${previousNegated}, infer ${produced}`);
      } else if (ruleText && produced) {
        lines.push(`Using contrapositive on rule: ${ruleText}. Infer ${produced}`);
      } else if (produced) {
        lines.push(`Using contrapositive. Infer ${produced}`);
      }
      if (produced) previousNegated = produced;
      continue;
    }

    if (typeof step.fact === 'string' && step.fact.trim().startsWith('Not ')) {
      const rendered = renderNotFact(session, step.fact);
      if (rendered) {
        const label = step.operation === 'not_fact' ? 'Found in KB' : 'Derived';
        lines.push(`${label}: ${rendered}`);
        previousNegated = rendered;
      }
      continue;
    }

    if ((step.operation === 'direct_fact' || step.operation === 'fact_matched') && typeof step.fact === 'string') {
      const rendered = renderFact(session, step.fact);
      if (rendered) lines.push(`Found in KB: ${rendered}`);
      continue;
    }
  }

  lines.push(`Therefore ${goalText}`);

  return `True: ${goalText}. Proof: ${lines.join('. ')}.`;
}
