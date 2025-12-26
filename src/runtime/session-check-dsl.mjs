import { parse } from '../parser/parser.mjs';
import { BOOTSTRAP_OPERATORS, DECLARATION_OPERATORS } from './operator-declarations.mjs';
import { CORE_OPERATOR_CATALOG, CORE_OPERATOR_KIND } from './operator-catalog.mjs';

const BUILTIN_OPERATORS = new Set([
  'Load',
  'Unload',
  'Set',
  'solve',
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
  'verifyPlan',
  'synonym',
  'canonical',
  'alias',
  'Default',
  'Exception',
  'mutuallyExclusive'
]);
// Planning (solve-as-planning output facts)
BUILTIN_OPERATORS.add('planStep');
BUILTIN_OPERATORS.add('planAction');
BUILTIN_OPERATORS.add('plan');
for (const op of BOOTSTRAP_OPERATORS) {
  BUILTIN_OPERATORS.add(op);
}

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

function collectSemanticOperatorKinds(index) {
  const kinds = new Map(); // name -> kind
  if (!index) return kinds;
  const addSet = (set, kind) => {
    if (!set) return;
    for (const name of set) kinds.set(name, kind);
  };
  addSet(index.relations, 'relation');
  addSet(index.transitiveRelations, 'relation');
  addSet(index.symmetricRelations, 'relation');
  addSet(index.reflexiveRelations, 'relation');
  addSet(index.inheritableProperties, 'relation');
  // Constraints are still relation-typed operators.
  for (const [op, inv] of index.inverseRelations || []) {
    if (op) kinds.set(op, 'relation');
    if (inv) kinds.set(inv, 'relation');
  }
  for (const [op, others] of index.contradictsSameArgs || []) {
    if (op) kinds.set(op, 'relation');
    if (others) {
      for (const other of others) kinds.set(other, 'relation');
    }
  }
  for (const [op] of index.mutuallyExclusive || []) {
    if (op) kinds.set(op, 'relation');
  }
  return kinds;
}

function collectKnownOperators(session) {
  const names = new Set(BUILTIN_OPERATORS);
  for (const op of CORE_OPERATOR_CATALOG) {
    names.add(op);
  }
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
  const requireKnownAtoms = options.requireKnownAtoms ?? false;
  const scopeAtoms = new Set(session?.scope?.allNames?.() || []);
  const graphAtoms = collectKnownGraphs(session);
  const vocabAtoms = new Set(session?.vocabulary?.names?.() || []);
  const knownAtoms = new Set([...vocabAtoms, ...scopeAtoms, ...graphAtoms]);
  const operatorKinds = new Map(CORE_OPERATOR_KIND || []);
  const semanticKinds = collectSemanticOperatorKinds(session?.semanticIndex);
  for (const [k, v] of semanticKinds.entries()) operatorKinds.set(k, v);

  return {
    mode: options.mode || 'generic',
    allowNewOperators,
    allowHoles,
    requireKnownAtoms,
    enforceDeclarations: options.enforceDeclarations ?? session?.enforceDeclarations ?? false,
    errors: [],
    bindings: new Set(session?.scope?.allNames?.() || []),
    knownOperators: collectKnownOperators(session),
    knownGraphs: collectKnownGraphs(session),
    localGraphs: new Set(),
    operatorKinds,
    knownAtoms,
    localAtoms: new Set()
  };
}

function ensureKnownOperator(name, node, context) {
  if (context.allowNewOperators) return;
  if (context.knownOperators.has(name)) return;
  if (context.knownGraphs.has(name)) return;
  if (context.localGraphs.has(name)) return;
  context.errors.push(`Unknown operator '${name}'${formatLocation(node)}`);
}

function ensureDeclaredOperator(name, node, context) {
  if (!context.enforceDeclarations) return;
  if (!name || typeof name !== 'string') return;
  if (BUILTIN_OPERATORS.has(name)) return;
  if (DECLARATION_OPERATORS.has(name)) return;
  if (context.knownGraphs.has(name) || context.localGraphs.has(name)) return;
  if (context.operatorKinds?.has?.(name)) return;
  context.errors.push(
    `Undeclared operator '${name}'${formatLocation(node)} (declare with '@${name}:${name} __Relation' or '@${name} graph ...')`
  );
}

function ensureKnownAtom(name, node, context) {
  if (!context.requireKnownAtoms) return;
  if (context.knownAtoms.has(name)) return;
  if (context.localAtoms.has(name)) return;
  context.errors.push(`Unknown concept '${name}'${formatLocation(node)}`);
}

function validateExpression(expr, context, role = 'argument', holesOk = context.allowHoles, enforceDecls = false) {
  if (!expr) return;

  switch (expr.type) {
    case 'Identifier':
      if (role === 'operator') {
        ensureKnownOperator(expr.name, expr, context);
        if (enforceDecls) ensureDeclaredOperator(expr.name, expr, context);
      } else {
        ensureKnownAtom(expr.name, expr, context);
      }
      return;
    case 'Reference':
      if (!context.bindings.has(expr.name)) {
        context.errors.push(`Undefined reference '$${expr.name}'${formatLocation(expr)}`);
      }
      return;
    case 'Hole':
      if (!holesOk) {
        context.errors.push(`Holes are not allowed in ${context.mode} DSL${formatLocation(expr)}`);
      }
      return;
    case 'Compound':
      validateExpression(expr.operator, context, 'operator', holesOk, enforceDecls);
      {
        const opName = expr.operator?.name;
        const nestedHolesOk = holesOk || opName === 'Exists' || opName === 'ForAll';
        for (const arg of expr.args || []) {
          validateExpression(arg, context, 'argument', nestedHolesOk, enforceDecls);
        }
      }
      return;
    case 'List':
      for (const item of expr.items || []) {
        validateExpression(item, context, 'argument', holesOk, enforceDecls);
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
  // Only enforce declared operator kinds for persistent statements/rules;
  // allow non-persistent "scratch" statements during refactors (e.g. temporary primitives).
  const shouldPersist = !stmt.destination || stmt.isPersistent;
  const operatorName = stmt.operator?.name;
  const definesRuleOrProposition =
    operatorName === 'Implies' ||
    operatorName === 'And' ||
    operatorName === 'Or' ||
    operatorName === 'Not' ||
    operatorName === 'Exists' ||
    operatorName === 'ForAll';
  const enforceDecls = shouldPersist || definesRuleOrProposition;
  validateExpression(stmt.operator, context, 'operator', context.allowHoles, enforceDecls);

  const args = stmt.args || [];

  // DS02/DS16: `solve` is a builtin verb; its option expressions are *data* and must not
  // be validated as graph calls (i.e., we don't require declaration for option keywords).
  if (operatorName === 'solve') {
    if (args.length < 1) {
      context.errors.push(`solve expects at least a problem type${formatLocation(stmt)}`);
      return;
    }
    if (args[0]?.type !== 'Identifier') {
      context.errors.push(`solve expects an identifier problem type as first argument${formatLocation(args[0])}`);
    }

    const optionItems = [];
    for (const arg of args.slice(1)) {
      if (!arg) continue;
      if (arg.type === 'List') {
        for (const item of arg.items || []) optionItems.push(item);
        continue;
      }
      optionItems.push(arg);
    }

    for (const item of optionItems) {
      if (!item) continue;
      if (item.type !== 'Compound') continue;
      const key = item.operator?.name;
      if (!key) continue;

      // Only validate that referenced relation operators exist.
      if (key === 'noConflict') {
        const rel = item.args?.[0];
        if (rel?.type === 'Identifier') {
          ensureKnownOperator(rel.name, rel, context);
        }
      }
    }

    if (stmt.destination) context.bindings.add(stmt.destination);
    return;
  }
  const quantifierHolesOk =
    operatorName === 'Exists' ||
    operatorName === 'ForAll' ||
    (operatorName === 'Not' &&
      args[0]?.type === 'Compound' &&
      (args[0].operator?.name === 'Exists' || args[0].operator?.name === 'ForAll'));

  // Meta-constraints treat operator names as arguments.
  if (operatorName === 'mutuallyExclusive' && args.length >= 1) {
    validateExpression(args[0], context, 'operator', context.allowHoles, enforceDecls);
    for (let i = 1; i < args.length; i++) validateExpression(args[i], context, 'argument', context.allowHoles, enforceDecls);
  } else if ((operatorName === 'inverseRelation' || operatorName === 'contradictsSameArgs') && args.length >= 2) {
    validateExpression(args[0], context, 'operator', context.allowHoles, enforceDecls);
    validateExpression(args[1], context, 'operator', context.allowHoles, enforceDecls);
    for (let i = 2; i < args.length; i++) validateExpression(args[i], context, 'argument', context.allowHoles, enforceDecls);
  } else {
    for (const arg of args) {
      validateExpression(arg, context, 'argument', quantifierHolesOk || context.allowHoles, enforceDecls);
    }
  }

  if (shouldPersist && operatorName) {
    // Declaration statements define operator kinds.
    if (DECLARATION_OPERATORS.has(operatorName)) {
      const kind = 'relation';
      if (stmt.destination) context.operatorKinds.set(stmt.destination, kind);
      if (stmt.persistName) context.operatorKinds.set(stmt.persistName, kind);
    } else {
      ensureDeclaredOperator(operatorName, stmt.operator, context);
    }
  }
  if (stmt.destination) {
    context.bindings.add(stmt.destination);
  }
  if (operatorName && DECLARATION_OPERATORS.has(operatorName)) {
    if (stmt.destination) context.knownOperators.add(stmt.destination);
    if (stmt.persistName) context.knownOperators.add(stmt.persistName);
  }
}

function validateRule(rule, context) {
  validateExpression(rule.condition, context, 'argument', context.allowHoles, true);
  validateExpression(rule.conclusion, context, 'argument', context.allowHoles, true);
}

function validateSolveBlock(block, context) {
  for (const decl of block.declarations || []) {
    if (!decl?.source) continue;
    // noConflict expects a relation operator name (e.g. conflictsWith).
    if (decl.kind === 'noConflict') {
      ensureKnownOperator(decl.source, decl, context);
    }
    // allDifferent's source token is informational (e.g. "guests") and not an operator name.
  }
  if (block.destination) {
    context.knownOperators.add(block.destination);
  }
}

function validateGraph(graph, context) {
  const localNames = [graph.name, graph.persistName].filter(Boolean);
  for (const name of localNames) {
    context.localGraphs.add(name);
    context.operatorKinds.set(name, 'graph');
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
      if (node.name) context.localGraphs.add(node.name);
      if (node.persistName) context.localGraphs.add(node.persistName);
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

function collectLocalAtomsAndOperators(node, context) {
  if (!node) return;
  switch (node.type) {
    case 'Statement': {
      const operatorName = node.operator?.name;
      if (node.destination) {
        context.localAtoms.add(node.destination);
      }
      if (node.persistName) {
        context.localAtoms.add(node.persistName);
      }
      if (operatorName && DECLARATION_OPERATORS.has(operatorName)) {
        if (node.destination) {
          context.knownOperators.add(node.destination);
          context.localAtoms.add(node.destination);
          context.operatorKinds.set(node.destination, 'relation');
        }
        if (node.persistName) {
          context.knownOperators.add(node.persistName);
          context.localAtoms.add(node.persistName);
          context.operatorKinds.set(node.persistName, 'relation');
        }
      }
      return;
    }
    case 'GraphDeclaration': {
      if (node.name) context.localGraphs.add(node.name);
      if (node.persistName) context.localGraphs.add(node.persistName);
      if (node.name) context.operatorKinds.set(node.name, 'graph');
      if (node.persistName) context.operatorKinds.set(node.persistName, 'graph');
      if (node.name) context.localAtoms.add(node.name);
      if (node.persistName) context.localAtoms.add(node.persistName);
      return;
    }
    case 'TheoryDeclaration': {
      if (node.name) context.localAtoms.add(node.name);
      for (const stmt of node.statements || []) {
        collectLocalAtomsAndOperators(stmt, context);
      }
      return;
    }
    default:
      return;
  }
}

export function checkDSL(session, dsl, options = {}) {
  const context = buildContext(session, options);
  const ast = parse(dsl);
  // Pre-scan to allow forward references to symbols declared/persisted in this program.
  for (const stmt of ast.statements || []) {
    collectLocalAtomsAndOperators(stmt, context);
  }
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
