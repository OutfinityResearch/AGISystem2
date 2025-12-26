import { bind } from '../core/operations.mjs';
import { debug_trace, isDebugEnabled } from '../utils/debug.js';
import { ExecutionError } from './execution-error.mjs';

function dbg(category, ...args) {
  debug_trace(`[Executor:${category}]`, ...args);
}

export function executeGraphDeclaration(executor, graph) {
  if (!executor.session.graphs) executor.session.graphs = new Map();
  if (!executor.session.graphAliases) executor.session.graphAliases = new Map();

  const graphDef = {
    name: graph.name,
    persistName: graph.persistName,
    params: graph.params,
    body: graph.body,
    returnExpr: graph.returnExpr,
    line: graph.line
  };

  const invocationName = graph.persistName || graph.name;
  executor.session.graphs.set(invocationName, graphDef);

  if (graph.name && graph.name !== invocationName) {
    executor.session.graphs.set(graph.name, graphDef);
  }

  return {
    type: 'graph_definition',
    name: graph.name,
    persistName: graph.persistName,
    params: graph.params
  };
}

export function expandGraph(executor, graphName, args) {
  let graph = executor.session.graphs?.get(graphName);
  if (!graph && executor.session.graphAliases?.has(graphName)) {
    const canonical = executor.session.graphAliases.get(graphName);
    graph = executor.session.graphs?.get(canonical);
  }
  if (!graph) {
    throw new ExecutionError(`Unknown graph: ${graphName}`);
  }

  if (isDebugEnabled()) {
    dbg('GRAPH_EXPAND', `Expanding graph: ${graphName} with ${args.length} args`);
  }

  executor._graphDepth = (executor._graphDepth || 0) + 1;
  const parentScope = executor.session.scope;
  const graphScope = parentScope.child();
  executor.session.scope = graphScope;

  try {
    for (let i = 0; i < graph.params.length; i++) {
      const paramName = graph.params[i];
      const argVec = i < args.length ? executor.resolveExpression(args[i]) : null;
      if (argVec) {
        try {
          graphScope.define(paramName, argVec);
        } catch {
          graphScope.set(paramName, argVec);
        }
      }
    }

    if (isDebugEnabled()) {
      dbg('GRAPH_EXPAND', `Executing ${graph.body.length} body statements`);
    }
    for (const stmt of graph.body) {
      const result = executor.executeStatement(stmt);
      if (isDebugEnabled()) {
        dbg('GRAPH_BODY', `Statement: ${stmt.toString()} | Destination: ${stmt.destination || '(none)'} | Persistent: ${result.persistent}`);
      }
    }

    if (graph.returnExpr) {
      return executor.resolveExpression(graph.returnExpr);
    }

    return null;
  } finally {
    executor.session.scope = parentScope;
    executor._graphDepth = Math.max(0, (executor._graphDepth || 1) - 1);
  }
}

export function bindGraphInvocationResult(executor, stmt, graphResult) {
  if (!graphResult) {
    return executor.resolveExpression(stmt.operator);
  }
  const operatorVec = executor.resolveExpression(stmt.operator);
  const out = bind(operatorVec, graphResult);
  executor.session?.typeRegistry?.recordBind?.({ inputVec: graphResult, outputVec: out, rhsTypeMarker: null });
  return out;
}
