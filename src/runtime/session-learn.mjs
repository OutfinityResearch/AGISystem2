import { parse } from '../parser/parser.mjs';
import { ContradictionError } from './contradiction-error.mjs';

/**
 * Learn DSL statements into the session.
 */
export function learn(session, dsl) {
  session.warnings = [];

  try {
    const ast = typeof dsl === 'string' ? parse(dsl) : dsl;
    const result = session.executor.executeProgram(ast);

    // Track rules (Implies statements)
    session.trackRules(ast);

    const loadErrors = [];
    for (const r of result.results || []) {
      if (!r) continue;
      if (r.loaded === false && Array.isArray(r.errors) && r.errors.length > 0) {
        const label = r.path || r.statement || 'Load';
        for (const err of r.errors) {
          const msg = err?.message || String(err);
          loadErrors.push(`Load failed for ${label}: ${msg}`);
        }
      }
    }

    // Count actual facts: for Load statements, use factsLoaded; otherwise count results
    let factCount = 0;
    let solveResult = null;

    for (const r of result.results) {
      if (r && typeof r.factsLoaded === 'number') {
        factCount += r.factsLoaded;
      } else if (r && r.type === 'solve') {
        solveResult = r;
        factCount += 1;
      } else {
        factCount += 1;
      }
    }

    const contradictionError = (result.errors || []).find(
      e => e instanceof ContradictionError || e?.name === 'ContradictionError'
    );

    const errors = result.errors.map(e => e.message).concat(loadErrors);
    const success = result.success && loadErrors.length === 0;

    const response = {
      success,
      facts: factCount,
      errors,
      warnings: session.warnings.slice()
    };

    if (contradictionError?.contradiction?.proof_nl) {
      response.proof_nl = contradictionError.contradiction.proof_nl;
    }
    if (contradictionError?.contradiction?.proofObject) {
      response.proofObject = contradictionError.contradiction.proofObject;
    }

    if (solveResult) {
      response.solveResult = solveResult;
    }

    return response;
  } catch (e) {
    return {
      success: false,
      facts: 0,
      errors: [e.message],
      warnings: session.warnings.slice()
    };
  }
}
