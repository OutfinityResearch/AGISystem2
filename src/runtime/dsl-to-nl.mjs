import { parse } from '../parser/parser.mjs';

function operatorName(expr) {
  if (!expr || typeof expr !== 'object') return null;
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'Reference') return expr.name;
  return expr.name || expr.value || null;
}

function termToToken(expr, env) {
  if (!expr || typeof expr !== 'object') return String(expr ?? '');
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'Hole') return `?${expr.name}`;
  if (expr.type === 'Literal') return String(expr.value);
  if (expr.type === 'Reference') {
    const resolved = env?.get?.(expr.name) || null;
    if (resolved && resolved.type === 'Statement') {
      return resolved; // let higher layers render as statement
    }
    // DSL reference syntax uses `$name`.
    return `$${expr.name}`;
  }
  if (expr.type === 'Compound') return expr;
  if (expr.type === 'List') return expr;
  return typeof expr.toString === 'function' ? expr.toString() : String(expr);
}

function chooseIndefiniteArticle(word) {
  const w = String(word || '').trim();
  if (!w) return 'a';
  return /^[aeiou]/i.test(w) ? 'an' : 'a';
}

function renderParseableRelation(op, args) {
  const a = Array.isArray(args) ? args.map(String) : [];

  if (op === 'isA' && a.length === 2) {
    const [subject, object] = a;
    return `${subject} is ${chooseIndefiniteArticle(object)} ${object}`;
  }

  if (op === 'locatedIn' && a.length === 2) {
    const [subject, object] = a;
    return `${subject} is in ${object}`;
  }

  if (op === 'has' && a.length === 2) {
    const [subject, object] = a;
    return `${subject} has ${object}`;
  }

  if (op === 'owns' && a.length === 2) {
    const [subject, object] = a;
    return `${subject} owns ${object}`;
  }

  if (op === 'can' && a.length === 2) {
    const [subject, ability] = a;
    return `${subject} can ${ability}`;
  }

  if (a.length === 1) {
    const [subject] = a;
    return `${subject} ${op}`;
  }

  if (a.length >= 2) {
    const [subject, ...rest] = a;
    return `${subject} ${op} ${rest.join(' ')}`;
  }

  return `${op}`.trim();
}

function renderSentence(session, op, args, { stripPunctuation = true, style = 'pretty' } = {}) {
  const text = style === 'parseable'
    ? renderParseableRelation(op, args).trim()
    : session.generateText(op, args).trim();
  if (!stripPunctuation) return text;
  return text.replace(/[.!?]+$/g, '');
}

function extractSimpleOpArgs(expr, env) {
  const resolved = termToToken(expr, env);
  if (!resolved || typeof resolved !== 'object') return null;

  if (resolved.type === 'Statement') {
    const op = operatorName(resolved.operator);
    const rawArgs = Array.isArray(resolved.args) ? resolved.args : [];
    const args = rawArgs.map(a => termToToken(a, env));
    if (args.every(v => typeof v === 'string')) return { op, args };
    return null;
  }

  if (resolved.type === 'Compound') {
    const op = operatorName(resolved.operator);
    const rawArgs = Array.isArray(resolved.args) ? resolved.args : [];
    const args = rawArgs.map(a => termToToken(a, env));
    if (args.every(v => typeof v === 'string')) return { op, args };
    return null;
  }

  return null;
}

function renderNegationParseable(session, innerExpr, env) {
  const extracted = extractSimpleOpArgs(innerExpr, env);
  if (!extracted) return null;
  const { op, args } = extracted;

  if (op === 'isA' && args.length === 2) {
    const [subject, object] = args;
    return `${subject} is not a ${object}`;
  }

  if (op === 'can' && args.length === 2) {
    const [subject, ability] = args;
    // Use "cannot" because we add explicit support for it in NL patterns.
    return `${subject} cannot ${ability}`;
  }

  if (args.length === 2) {
    const [subject, object] = args;
    return `${subject} does not ${op} ${object}`;
  }

  if (args.length === 1) {
    const [subject] = args;
    return `${subject} does not ${op}`;
  }

  const inner = renderSentence(session, op, args, { stripPunctuation: true, style: 'parseable' });
  return `It is not true that ${inner}`;
}

function exprToHuman(session, expr, env, { style = 'pretty' } = {}) {
  const e = termToToken(expr, env);

  if (e && typeof e === 'object' && e.type === 'Statement') {
    return statementToHuman(session, e, env, { style });
  }

  if (!e || typeof e !== 'object') return String(e ?? '');

  if (e.type === 'Compound') {
    const op = operatorName(e.operator);
    const args = Array.isArray(e.args) ? e.args : [];
    if (op === 'Not' && args.length === 1) {
      if (style === 'parseable') {
        const rendered = renderNegationParseable(session, args[0], env);
        if (rendered) return rendered;
      }
      return `NOT (${exprToHuman(session, args[0], env, { style })})`;
    }
    if ((op === 'And' || op === 'Or') && args.length > 0) {
      const joiner = op === 'And' ? ' AND ' : ' OR ';
      return args.map(a => `(${exprToHuman(session, a, env, { style })})`).join(joiner);
    }

    const tokenArgs = args.map(a => termToToken(a, env));
    if (tokenArgs.every(a => typeof a === 'string')) {
      return renderSentence(session, op, tokenArgs, { stripPunctuation: true, style });
    }
    return typeof e.toString === 'function' ? e.toString() : String(e);
  }

  if (e.type === 'List') {
    const items = Array.isArray(e.items) ? e.items.map(i => exprToHuman(session, i, env, { style })) : [];
    return `[${items.join(', ')}]`;
  }

  return typeof e.toString === 'function' ? e.toString() : String(e);
}

function statementToHuman(session, stmt, env, { style = 'pretty' } = {}) {
  const op = operatorName(stmt.operator);
  const args = Array.isArray(stmt.args) ? stmt.args : [];

  // Query: `@q isA ?x Type` -> "What is a Type?"
  if (
    style === 'parseable' &&
    stmt?.destination === 'q' &&
    op === 'isA' &&
    args.length === 2 &&
    args[0]?.type === 'Hole' &&
    args[1]?.type === 'Identifier'
  ) {
    const typeWord = termToToken(args[1], env);
    return `What is a ${typeWord}?`;
  }

  if (op === 'Not' && args.length === 1) {
    if (style === 'parseable') {
      const rendered = renderNegationParseable(session, args[0], env);
      if (rendered) return rendered;
    }
    const inner = exprToHuman(session, args[0], env, { style });
    return `NOT (${inner})`;
  }

  // Flat Not form: `Not isA A B` -> treat as `Not (isA A B)`
  if (op === 'Not' && args.length > 1) {
    if (style === 'parseable') {
      const innerExpr = { type: 'Compound', operator: args[0], args: args.slice(1) };
      const rendered = renderNegationParseable(session, innerExpr, env);
      if (rendered) return rendered;
    }
    const inner = args.map(a => exprToHuman(session, a, env, { style })).join(' ');
    return `NOT (${inner})`;
  }

  if ((op === 'And' || op === 'Or') && args.length > 0) {
    const joiner = op === 'And' ? ' AND ' : ' OR ';
    return args.map(a => `(${exprToHuman(session, a, env, { style })})`).join(joiner);
  }

  if (op === 'Implies' && args.length === 2) {
    const ant = exprToHuman(session, args[0], env, { style });
    const cons = exprToHuman(session, args[1], env, { style });
    return `IF (${ant}) THEN (${cons})`;
  }

  const tokenArgs = args.map(a => termToToken(a, env));
  if (tokenArgs.every(a => typeof a === 'string')) {
    return renderSentence(session, op, tokenArgs, { stripPunctuation: true, style });
  }

  // Fall back: render args with recursion (handles references/compounds).
  const renderedArgs = args.map(a => exprToHuman(session, a, env, { style })).join(' ');
  return `${op} ${renderedArgs}`.trim();
}

function shouldSkipStatement(stmt, { includeDeclarations = false, includeMeta = false } = {}) {
  const op = operatorName(stmt.operator) || '';
  if (!op) return true;

  // Skip non-persistent destination bindings by default; keep common "query/goal" destinations.
  if (stmt?.destination && !stmt?.persistName) {
    if (stmt.destination !== 'q' && stmt.destination !== 'goal') return true;
  }

  if (!includeMeta) {
    if (op === 'Load' || op === 'Unload' || op === 'Set') return true;
    if (op === 'solve' || op === 'abduce' || op === 'whatif') return true;
  }

  // These are usually intermediate logical constructor bindings, not user-level facts.
  if (op === 'And' || op === 'Or') return true;

  if (!includeDeclarations) {
    if (op.startsWith('__')) return true;
    if (op.startsWith('___')) return true;
    if (op === 'graph') return true;
  }

  return false;
}

function collectStatements(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) collectStatements(n, out);
    return out;
  }

  if (node.type === 'Program') return collectStatements(node.statements || [], out);
  if (node.type === 'TheoryDeclaration') return collectStatements(node.statements || [], out);
  if (node.type === 'GraphDeclaration') return collectStatements(node.body || [], out);
  if (node.type === 'SolveBlock') return collectStatements(node.declarations || [], out);
  if (node.type === 'RuleDeclaration') {
    out.push(node);
    return out;
  }
  if (node.type === 'ImportStatement') {
    out.push(node);
    return out;
  }
  if (node.type === 'Statement') {
    out.push(node);
    return out;
  }
  return out;
}

export function dslToNl(session, dsl, options = {}) {
  const lines = [];
  const errors = [];

  let ast;
  try {
    ast = typeof dsl === 'string' ? parse(dsl) : dsl;
  } catch (e) {
    return { success: false, lines: [], errors: [e?.message || String(e)] };
  }

  const env = new Map();
  const nodes = collectStatements(ast, []);

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    if (node.type === 'ImportStatement') {
      if (options.includeMeta) lines.push(`Import theory ${node.theoryName}.`);
      continue;
    }

    if (node.type === 'RuleDeclaration') {
      const ant = exprToHuman(session, node.condition, env, { style: options.style || 'pretty' });
      const cons = exprToHuman(session, node.conclusion, env, { style: options.style || 'pretty' });
      lines.push(`IF (${ant}) THEN (${cons}).`);
      continue;
    }

    if (node.type !== 'Statement') continue;

    if (node.destination) env.set(node.destination, node);

    if (shouldSkipStatement(node, options)) continue;

    const rendered = statementToHuman(session, node, env, { style: options.style || 'pretty' });
    if (!rendered) continue;
    lines.push(/[.!?]$/.test(rendered) ? rendered : `${rendered}.`);
  }

  return { success: errors.length === 0, lines, errors };
}

export default { dslToNl };
