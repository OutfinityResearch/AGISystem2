import { parse } from '../parser/parser.mjs';

const BUILTIN_OPERATORS = new Set([
  'Load',
  'Unload',
  'abduce',
  'whatif',
  'similar',
  'analogy',
  'symbolic_analogy',
  'property_analogy',
  'difference',
  'deduce',
  'induce',
  'bundle',
  'synonym',
  'canonical',
  'alias',
  'Default',
  'Exception',
  'mutuallyExclusive'
]);

function collectSemanticOperators(index) {
  if (!index) return new Set();
  const names = new Set();
  const addSet = (set) => {
    if (!set) return;
    for (const name of set) names.add(name);
  };
  addSet(index.transitiveRelations);
  addSet(index.symmetricRelations);
  addSet(index.reflexiveRelations);
  addSet(index.inheritableProperties);
  for (const [op, inv] of index.inverseRelations || []) {
    names.add(op);
    if (inv) names.add(inv);
  }
  for (const [op, others] of index.contradictsSameArgs || []) {
    names.add(op);
    if (others) {
      for (const other of others) names.add(other);
    }
  }
  for (const [op] of index.mutuallyExclusive || []) {
    names.add(op);
  }
  return names;
}

function collectKnownOperators(session) {
  const names = new Set(BUILTIN_OPERATORS);
  for (const op of session?.operators?.keys?.() || []) {
    names.add(op);
  }
  for (const op of session?.declaredOperators?.values?.() || []) {
    names.add(op);
  }
  for (const fact of session?.kbFacts || []) {
    if (fact?.metadata?.operator) names.add(fact.metadata.operator);
  }
  for (const meta of session?.referenceMetadata?.values?.() || []) {
    if (meta?.operator) names.add(meta.operator);
  }
  const semantic = collectSemanticOperators(session?.semanticIndex);
  for (const name of semantic) names.add(name);
  return names;
}

function collectKnownGraphs(session) {
  const names = new Set();
  for (const name of session?.graphs?.keys?.() || []) {
    names.add(name);
  }
  for (const [alias, canonical] of session?.graphAliases?.entries?.() || []) {
    if (alias) names.add(alias);
    if (canonical) names.add(canonical);
  }
  return names;
}

function formatLocation(node) {
  if (!node || !node.line || !node.column) return '';
  return ` at ${node.line}:${node.column}`;
}

function buildContext(session, options) {
  const allowNewOperators = options.allowNewOperators ?? options.mode === 'learn';
  const allowHoles = options.allowHoles ?? options.mode === 'query';
  return {
    mode: options.mode || 'generic',
    allowNewOperators,
    allowHoles,
    errors: [],
    bindings: new Set(session?.scope?.allNames?.() || []),
    knownOperators: collectKnownOperators(session),
    knownGraphs: collectKnownGraphs(session),
    localGraphs: new Set()
  };
}

function ensureKnownOperator(name, node, context) {
  if (context.allowNewOperators) return;
  if (context.knownOperators.has(name)) return;
  if (context.knownGraphs.has(name)) return;
  if (context.localGraphs.has(name)) return;
  context.errors.push(`Unknown operator '${name}'${formatLocation(node)}`);
}

function validateExpression(expr, context, role = 'argument') {
  if (!expr) return;

  switch (expr.type) {
    case 'Identifier':
      if (role === 'operator') {
        ensureKnownOperator(expr.name, expr, context);
      }
      return;
    case 'Reference':
      if (!context.bindings.has(expr.name)) {
        context.errors.push(`Undefined reference '$${expr.name}'${formatLocation(expr)}`);
      }
      return;
    case 'Hole':
      if (!context.allowHoles) {
        context.errors.push(`Holes are not allowed in ${context.mode} DSL${formatLocation(expr)}`);
      }
      return;
    case 'Compound':
      validateExpression(expr.operator, context, 'operator');
      for (const arg of expr.args || []) {
        validateExpression(arg, context, 'argument');
      }
      return;
    case 'List':
      for (const item of expr.items || []) {
        validateExpression(item, context, 'argument');
      }
      return;
    case 'Literal':
      return;
    default:
      // Unknown nodes are ignored here; parser should catch syntax issues.
      return;
  }
}

function validateStatement(stmt, context) {
  validateExpression(stmt.operator, context, 'operator');
  for (const arg of stmt.args || []) {
    validateExpression(arg, context, 'argument');
  }
  if (stmt.destination) {
    context.bindings.add(stmt.destination);
  }
}

function validateRule(rule, context) {
  validateExpression(rule.condition, context, 'argument');
  validateExpression(rule.conclusion, context, 'argument');
}

function validateSolveBlock(block, context) {
  for (const decl of block.declarations || []) {
    if (!decl?.source) continue;
    if (decl.kind === 'noConflict' || decl.kind === 'allDifferent') {
      ensureKnownOperator(decl.source, decl, context);
    }
  }
}

function validateGraph(graph, context) {
  const localNames = [graph.name, graph.persistName].filter(Boolean);
  for (const name of localNames) {
    context.localGraphs.add(name);
  }

  const child = {
    ...context,
    bindings: new Set(context.bindings),
    localGraphs: new Set(context.localGraphs)
  };
  for (const param of graph.params || []) {
    child.bindings.add(param);
  }
  for (const stmt of graph.body || []) {
    validateNode(stmt, child);
  }
  if (graph.returnExpr) {
    validateExpression(graph.returnExpr, child, 'argument');
  }
}

function validateTheory(theory, context) {
  const child = {
    ...context,
    bindings: new Set(context.bindings),
    localGraphs: new Set(context.localGraphs)
  };
  for (const stmt of theory.statements || []) {
    validateNode(stmt, child);
  }
}

function validateNode(node, context) {
  if (!node) return;
  switch (node.type) {
    case 'Statement':
      validateStatement(node, context);
      return;
    case 'RuleDeclaration':
      validateRule(node, context);
      return;
    case 'GraphDeclaration':
      validateGraph(node, context);
      return;
    case 'SolveBlock':
      validateSolveBlock(node, context);
      return;
    case 'TheoryDeclaration':
      validateTheory(node, context);
      return;
    case 'ImportStatement':
      return;
    default:
      return;
  }
}

export function checkDSL(session, dsl, options = {}) {
  const context = buildContext(session, options);
  const ast = parse(dsl);
  for (const stmt of ast.statements || []) {
    validateNode(stmt, context);
  }
  if (context.errors.length > 0) {
    const errorText = context.errors.join('; ');
    throw new Error(`DSL validation failed: ${errorText}`);
  }
  return ast;
}

export default checkDSL;
