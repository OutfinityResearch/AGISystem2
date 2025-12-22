import { parse } from '../parser/parser.mjs';
import { canonicalizeStatement } from './canonicalize.mjs';

/**
 * Execute query using HDC + Symbolic Reasoning (unified interface)
 */
export function query(session, dsl, options = {}) {
  try {
    const ast = typeof dsl === 'string' ? parse(dsl) : dsl;
    if (ast.statements.length === 0) {
      return { success: false, reason: 'Empty query' };
    }

    // For multi-statement DSL, execute all statements except last as setup,
    // then execute the last statement as the actual query
    if (ast.statements.length > 1) {
      for (let i = 0; i < ast.statements.length - 1; i++) {
        session.executor.executeStatement(ast.statements[i]);
      }
    }

    const rawQueryStmt = ast.statements[ast.statements.length - 1];
    const queryStmt = session.canonicalizationEnabled
      ? canonicalizeStatement(session, rawQueryStmt)
      : rawQueryStmt;

    const result = session.queryEngine.execute(queryStmt);
    session.reasoningStats.queries++;

    // Queries count as depth 5 for averaging (require KB traversal)
    const QUERY_DEPTH = 5;
    session.reasoningStats.proofLengths.push(QUERY_DEPTH);
    session.reasoningStats.totalProofSteps += QUERY_DEPTH;
    if (QUERY_DEPTH < session.reasoningStats.minProofDepth) {
      session.reasoningStats.minProofDepth = QUERY_DEPTH;
    }

    if (result.success) {
      const method = result.allResults?.[0]?.method || 'query_match';
      session.trackMethod(method);
      session.trackOperation('query_search');
    }

    return result;
  } catch (e) {
    return { success: false, reason: e.message };
  }
}
