import { parse } from '../parser/parser.mjs';
import { canonicalizeStatement } from './canonicalize.mjs';
import { rewriteCanonicalSurfaceStatement } from './canonical-rewrite.mjs';
import { isHdcMethod } from './session-stats.mjs';

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
    let queryStmt = session.canonicalizationEnabled
      ? canonicalizeStatement(session, rawQueryStmt)
      : rawQueryStmt;

    if (session?.enforceCanonical) {
      const opName = queryStmt?.operator?.name || queryStmt?.operator?.value || null;
      const rewrite = rewriteCanonicalSurfaceStatement(session, queryStmt, opName);
      if (rewrite?.rewritten) {
        queryStmt = rewrite.statement;
      } else if (typeof opName === 'string' && /^_[A-Za-z]/.test(opName) && !opName.startsWith('__')) {
        return { success: false, reason: `Non-canonical primitive in query: ${opName}` };
      }
    }

    const result = session.queryEngine.execute(queryStmt, options);
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

      if (isHdcMethod(method)) {
        session.reasoningStats.hdcUsefulOps = (session.reasoningStats.hdcUsefulOps || 0) + 1;
      }
    }

    return result;
  } catch (e) {
    return { success: false, reason: e.message };
  }
}
