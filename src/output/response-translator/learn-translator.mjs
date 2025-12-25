import { BaseTranslator, makeTranslation } from './shared.mjs';
import { SolveResultFormatter } from './solve-result-formatter.mjs';

export class LearnTranslator extends BaseTranslator {
  constructor(session) {
    super(session);
    this.solveFormatter = new SolveResultFormatter(session);
  }

  translate({ reasoningResult }) {
    if (!reasoningResult) return makeTranslation('Failed');

    if (reasoningResult.solveResult?.type === 'solve') {
      return this.solveFormatter.formatSolveResult(reasoningResult.solveResult);
    }

    if (Array.isArray(reasoningResult.warnings) && reasoningResult.warnings.length > 0) {
      const proofText = typeof reasoningResult.proof_nl === 'string'
        ? reasoningResult.proof_nl
        : null;
      return makeTranslation(reasoningResult.warnings[0], proofText);
    }

    return makeTranslation(
      reasoningResult.success
        ? `Learned ${reasoningResult.facts ?? 0} facts`
        : 'Failed'
    );
  }
}

