import { makeTranslation } from './shared.mjs';

export class SolveResultFormatter {
  constructor(session) {
    this.session = session;
  }

  formatSolveResult(solveData) {
    if (!solveData || solveData.type !== 'solve') {
      return makeTranslation('No valid solutions found.', 'CSP found no matching solve block.');
    }
    if (!solveData.success || (solveData.solutionCount || 0) === 0) {
      const error = solveData.error || 'No valid solutions found.';
      const constraintDesc = (solveData.constraints || [])
        .map(c => `${c.relation}(${c.entities.join(', ')})`)
        .join(', ');
      const proofText = constraintDesc
        ? `Constraints ${constraintDesc} cannot all be satisfied with available assignments.`
        : 'No valid assignment exists.';
      return makeTranslation(error, proofText);
    }

    const solutionTexts = (solveData.solutions || []).map((sol, idx) => {
      const facts = Array.isArray(sol) ? sol : (sol.facts || []);
      const factTexts = facts.map(fact => this.describeFact(fact));
      const label = sol.index ? `${sol.index}.` : `${idx + 1}.`;
      return `${label} ${factTexts.join(', ')}`.replace(/\s+\./g, '.');
    });

    const proofSteps = [];
    for (const sol of (solveData.solutions || [])) {
      if (sol.proof && sol.proof.length > 0) {
        for (const step of sol.proof) {
          if (step.satisfied) {
            proofSteps.push(`${step.constraint} satisfied: ${step.reason}`);
          }
        }
      }
    }

    const summary = solveData.solutionCount || solutionTexts.length;
    const description = solveData.description ||
                        solveData.destination ||
                        solveData.label ||
                        solveData.type ||
                        'solutions';
    const joined = solutionTexts.join('. ');
    const base = joined
      ? `Found ${summary} ${description}: ${joined}.`
      : `Found ${summary} ${description}.`;

    const uniqueProofs = [...new Set(proofSteps)];
    const proofText = uniqueProofs.length > 0
      ? uniqueProofs.join('. ')
      : `All ${summary} assignments satisfy constraints.`;
    return makeTranslation(base, proofText);
  }

  describeFact(fact) {
    if (!fact) return '';
    if (fact.dsl) {
      const parts = fact.dsl.split(' ').filter(Boolean);
      return this.session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
    }
    if (fact.predicate) {
      return this.session.generateText(fact.predicate, [fact.subject, fact.object]).replace(/\.$/, '');
    }
    if (typeof fact === 'string') {
      const parts = fact.split(' ').filter(Boolean);
      if (parts.length === 0) return '';
      return this.session.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
    }
    return JSON.stringify(fact);
  }
}

