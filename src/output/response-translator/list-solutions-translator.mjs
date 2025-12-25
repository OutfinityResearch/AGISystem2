import { BaseTranslator } from './shared.mjs';
import { SolveResultFormatter } from './solve-result-formatter.mjs';

export class ListSolutionsTranslator extends BaseTranslator {
  constructor(session) {
    super(session);
    this.solveFormatter = new SolveResultFormatter(session);
  }

  translate({ reasoningResult }) {
    if (!reasoningResult) return 'No valid solutions found.';
    if (!reasoningResult.success || (reasoningResult.solutionCount || 0) === 0) {
      return 'No valid solutions found.';
    }

    const solutionTexts = reasoningResult.solutions.map(sol => {
      const factTexts = (sol.facts || []).map(fact => {
        const parts = fact.split(' ');
        return this.session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
      });
      return `Solution ${sol.index}: ${factTexts.join(', ')}`;
    });

    return `Found ${reasoningResult.solutionCount} solutions. ${solutionTexts.join('. ')}.`;
  }
}

