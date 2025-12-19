import { parse } from '../parser/parser.mjs';

/**
 * Learn DSL statements into the session.
 */
export function learn(session, dsl) {
  session.warnings = [];

  try {
    const ast = parse(dsl);
    const result = session.executor.executeProgram(ast);

    // Track rules (Implies statements)
    session.trackRules(ast);

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

    const response = {
      success: result.success,
      facts: factCount,
      errors: result.errors.map(e => e.message),
      warnings: session.warnings.slice()
    };

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

