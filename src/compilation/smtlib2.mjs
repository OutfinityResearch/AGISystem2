/**
 * AGISystem2 - SMT-LIB2 Compilation (v0)
 * @module compilation/smtlib2
 *
 * Deterministic compilation of a conservative Sys2DSL fragment into SMT-LIB2.
 * DS: docs/specs/DS/DS50-CompilationCore-SMTLIB2.md
 *
 * This module is intentionally self-contained and does not execute external solvers.
 */

import { createHash } from 'node:crypto';
import { parse } from '../parser/parser.mjs';

function sha256(text) {
  return createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function isIntNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) && Math.floor(n) === n;
}

function normalizeVarName(name) {
  return String(name || '').replace(/[^A-Za-z0-9_]/g, '_');
}

function stableStringKey(node) {
  if (!node || typeof node !== 'object') return String(node);
  if (node.type === 'Literal') return `L:${node.literalType}:${String(node.value)}`;
  if (node.type === 'Identifier') return `I:${node.name}`;
  if (node.type === 'Hole') return `H:${node.name}`;
  if (node.type === 'Compound') {
    const op = node.operator?.name || node.operator?.value || '?';
    const args = Array.isArray(node.args) ? node.args.map(stableStringKey).join(',') : '';
    return `C:${op}(${args})`;
  }
  return `T:${node.type}`;
}

function alphaRenameHoles(programAst) {
  const mapping = new Map(); // holeName -> v0, v1, ...
  let next = 0;

  function alloc(holeName) {
    if (mapping.has(holeName)) return mapping.get(holeName);
    const v = `v${next++}`;
    mapping.set(holeName, v);
    return v;
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Hole') {
      node._alpha = alloc(node.name);
      return;
    }
    if (node.type === 'Compound') {
      for (const a of node.args || []) walk(a);
    }
    if (node.type === 'Statement') {
      for (const a of node.args || []) walk(a);
    }
    if (node.type === 'Program') {
      for (const s of node.statements || []) walk(s);
    }
  }

  walk(programAst);
  return mapping;
}

function compileNode(node, { holeSort = 'Real' } = {}) {
  if (!node || typeof node !== 'object') throw new Error('Invalid AST node');

  if (node.type === 'Literal') {
    if (node.literalType === 'number') {
      if (!Number.isFinite(node.value)) throw new Error('Non-finite number literal');
      if (isIntNumber(node.value)) return String(node.value);
      // Deterministic decimal. Avoid scientific notation.
      const s = String(node.value);
      if (/[eE]/.test(s)) {
        // Normalize to a fixed decimal representation (best-effort, v0).
        return node.value.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
      }
      return s;
    }
    if (node.literalType === 'string') return JSON.stringify(String(node.value));
    if (node.literalType === 'boolean') return node.value ? 'true' : 'false';
    throw new Error(`Unsupported literal type: ${node.literalType}`);
  }

  if (node.type === 'Identifier') {
    // v0: treat identifiers as symbols. For safety, restrict to SMT-safe names.
    return normalizeVarName(node.name);
  }

  if (node.type === 'Hole') {
    const smtName = node._alpha ? String(node._alpha) : `v_${normalizeVarName(node.name)}`;
    return smtName;
  }

  if (node.type === 'Compound') {
    const op = node.operator?.name || node.operator?.value;
    const args = (node.args || []).map(a => compileNode(a, { holeSort }));

    // Boolean structure
    if (op === 'And') return `(and ${args.join(' ')})`;
    if (op === 'Or') return `(or ${args.join(' ')})`;
    if (op === 'Not') return `(not ${args[0]})`;
    if (op === 'Implies') return `(=> ${args[0]} ${args[1]})`;

    // Predicates
    if (op === 'equals') return `(= ${args[0]} ${args[1]})`;
    if (op === 'lt') return `(< ${args[0]} ${args[1]})`;
    if (op === 'leq') return `(<= ${args[0]} ${args[1]})`;
    if (op === 'gt') return `(> ${args[0]} ${args[1]})`;
    if (op === 'geq') return `(>= ${args[0]} ${args[1]})`;

    // Arithmetic terms
    if (op === 'Add') return `(+ ${args.join(' ')})`;
    if (op === 'Sub') return `(- ${args[0]} ${args[1]})`;
    if (op === 'Mul') return `(* ${args.join(' ')})`;
    if (op === 'Div') return `(/ ${args[0]} ${args[1]})`;
    if (op === 'Neg') return `(- ${args[0]})`;

    if (op === 'Pow') throw new Error('Pow is not supported by SMT-LIB2 v0 compiler');

    throw new Error(`Unsupported operator for SMT-LIB2 v0: ${String(op || '?')}`);
  }

  throw new Error(`Unsupported AST node type: ${node.type}`);
}

function collectHoles(programAst) {
  const out = new Map(); // smtName -> sort
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Hole') {
      const name = node._alpha ? String(node._alpha) : `v_${normalizeVarName(node.name)}`;
      out.set(name, 'Real');
      return;
    }
    if (node.type === 'Compound') for (const a of node.args || []) walk(a);
    if (node.type === 'Statement') for (const a of node.args || []) walk(a);
    if (node.type === 'Program') for (const s of node.statements || []) walk(s);
  }
  walk(programAst);
  return out;
}

/**
 * Compile a Sys2DSL boolean formula (or set of formulas) into an SMT-LIB2 artifact.
 *
 * Input forms supported:
 * - `dsl`: a Sys2DSL program (one or more statements). Statements are treated as assertions.
 *
 * @param {object} params
 * @param {string} params.dsl
 * @param {object} [params.options]
 * @returns {{ success: true, format: 'SMTLIB2', text: string, hash: string } | { success: false, error: string }}
 */
export function compileToSMTLIB2({ dsl, options = {} }) {
  try {
    const program = parse(String(dsl || ''));
    alphaRenameHoles(program);

    const assertions = [];
    for (const st of program.statements || []) {
      if (st.type !== 'Statement') continue;
      const op = st.operator?.name || st.operator?.value;
      // Statements are also expressions in Sys2DSL. For SMT we treat:
      // - op with args => (op arg1 arg2 ...)
      // - for a DSL statement "equals a b" we compile it as a predicate.
      const exprNode = op
        ? { type: 'Compound', operator: st.operator, args: st.args || [] }
        : null;
      if (!exprNode) continue;
      assertions.push(compileNode(exprNode, options));
    }

    const decls = collectHoles(program);

    const lines = [];
    lines.push('; AGISystem2 SMT-LIB2 artifact (v0)');
    lines.push('(set-logic ALL)');
    for (const [name, sort] of Array.from(decls.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`(declare-fun ${name} () ${sort})`);
    }
    for (const a of assertions) {
      lines.push(`(assert ${a})`);
    }
    lines.push('(check-sat)');
    lines.push('(get-model)');
    const text = `${lines.join('\n')}\n`;
    return { success: true, format: 'SMTLIB2', text, hash: sha256(text) };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

