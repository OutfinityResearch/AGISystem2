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

function goalToHuman(session, goalString) {
  const parts = splitGoalParts(goalString);
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
  if (!ruleObj?.conditionParts || !parsedNot) return null;
  const leaves = collectLeafAsts(ruleObj.conditionParts, []);
  for (const leaf of leaves) {
    const extracted = extractOpArgsFromStatementAst(leaf);
    if (!extracted || extracted.op !== parsedNot.innerOp) continue;
    if (extracted.args.length !== parsedNot.innerArgs.length) continue;
    const bindings = {};
    let ok = true;
    for (let i = 0; i < extracted.args.length; i++) {
      const argNode = extracted.args[i];
      const wanted = parsedNot.innerArgs[i];
      if (argNode?.type === 'Hole') {
        bindings[argNode.name] = wanted;
      } else {
        const token = termToToken(argNode, null);
        if (token !== wanted) { ok = false; break; }
      }
    }
    if (ok) return bindings;
  }
  return null;
}

function renderNotFact(session, fact) {
  const parts = String(fact || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'Not') return null;
  const op = parts[0];
  const args = parts.slice(1);
  return session.generateText(op, args).replace(/[.!?]+$/, '');
}

export function describeContrapositiveProof(session, reasoningResult) {
  if (!session || !reasoningResult) return null;
  const parsedNot = parseNotGoal(reasoningResult.goal);
  if (!parsedNot) return null;

  const steps = reasoningResult.steps || [];
  const hasContrapositive = steps.some(s => s?.inference === 'contrapositive');
  if (!hasContrapositive) return null;
  const goalText = goalToHuman(session, reasoningResult.goal);
  const targetHuman = session.generateText(parsedNot.innerOp, parsedNot.innerArgs).replace(/[.!?]+$/, '');

  const ruleStep = steps.find(s => s?.operation === 'rule_application' && s?.inference === 'contrapositive') || null;
  const ruleObj = ruleStep?.ruleId ? (session.rules || []).find(r => r.id === ruleStep.ruleId) : null;
  const bindings = inferBindingsFromNotGoal(ruleObj, parsedNot, session) || null;

  const condText = ruleObj?.conditionParts ? compoundToHuman(session, ruleObj.conditionParts, bindings) : null;
  const concText = ruleObj?.conclusionParts
    ? compoundToHuman(session, ruleObj.conclusionParts, bindings)
    : (ruleObj?.conclusionAST ? (statementToHuman(session, ruleObj.conclusionAST, bindings) || null) : null);

  const otherAntecedents = [];
  if (ruleObj?.conditionParts) {
    for (const leafAst of collectLeafAsts(ruleObj.conditionParts, [])) {
      const human = statementToHuman(session, leafAst, bindings);
      if (!human) continue;
      if (normalizeSentence(human) === normalizeSentence(targetHuman)) continue;
      otherAntecedents.push(human);
    }
  }

  const negatedConclusion = (() => {
    const goalNotDsl = `Not ${parsedNot.innerOp} ${parsedNot.innerArgs.join(' ')}`.trim();
    const goalNotNorm = normalizeSentence(goalNotDsl);
    const candidate = steps.find(s =>
      typeof s?.fact === 'string' &&
      s.fact.trim().startsWith('Not ') &&
      normalizeSentence(s.fact) !== goalNotNorm
    );
    const rendered = candidate ? renderNotFact(session, candidate.fact) : null;
    if (rendered) return rendered;
    if (concText) return `NOT (${concText})`;
    return null;
  })();

  const lines = [];
  if (negatedConclusion) lines.push(`Proved: ${negatedConclusion}`);
  for (const a of otherAntecedents) lines.push(a);
  if (condText && concText) lines.push(`Applied contrapositive on rule: IF (${condText}) THEN (${concText})`);
  lines.push(`Therefore ${goalText}`);

  return `True: ${goalText}. Proof: ${lines.join('. ')}.`;
}
