/**
 * ProofEngine modus-ponens helper for propositional `holds`.
 * Split from `src/reasoning/prove.mjs` to keep files <500 LOC.
 */

import { Statement, Identifier } from '../../parser/ast.mjs';

export function tryImplicationModusPonens(self, goal, depth) {
  const op = self.extractOperatorName(goal);
  if (op !== 'holds') return { valid: false };

  const args = (goal.args || []).map(a => self.extractArgName(a)).filter(Boolean);
  if (args.length < 1) return { valid: false };
  const target = args[0];

  const candidates = [];
  for (const rule of self.session.rules || []) {
    const conc = rule.conclusionAST;
    if (!conc) continue;

    if (conc.type === 'Identifier' && conc.name === target) {
      candidates.push(rule);
      continue;
    }

    const concOp = self.extractOperatorName(conc);
    if (concOp === 'holds') {
      const concArgs = (conc.args || []).map(a => self.extractArgName(a)).filter(Boolean);
      if (concArgs[0] === target) {
        candidates.push(rule);
      }
    }
  }

  for (const rule of candidates) {
    const condResult = proveImplicationCondition(self, rule, depth + 1);
    if (!condResult.valid) continue;

    const steps = [];
    steps.push(...(condResult.steps || []));
    const implicationFact = describeSimpleImplication(rule);
    if (implicationFact) {
      steps.push({ operation: 'direct_fact', fact: implicationFact });
    }
    steps.push({ operation: 'rule_application', fact: `holds ${target}` });

    return {
      valid: true,
      method: 'modus_ponens',
      confidence: (condResult.confidence || self.thresholds.RULE_CONFIDENCE) * self.thresholds.CONFIDENCE_DECAY,
      goal: self.goalToFact(goal),
      steps
    };
  }

  return { valid: false };
}

export function proveImplicationCondition(self, rule, depth) {
  if (rule.conditionParts) {
    return self.conditions.proveCondition(rule, depth);
  }

  const condAst = rule.conditionAST;
  if (!condAst) return { valid: false };

  if (condAst.type === 'Identifier' && condAst.name) {
    const antecedent = new Statement(
      null,
      new Identifier('holds'),
      [new Identifier(condAst.name)]
    );
    return self.proveGoal(antecedent, depth);
  }

  const condOp = self.extractOperatorName(condAst);
  if (condOp === 'holds' || condAst.operator) {
    return self.proveGoal(condAst, depth);
  }

  return { valid: false };
}

export function describeSimpleImplication(rule) {
  const cond = rule?.conditionAST;
  const conc = rule?.conclusionAST;
  if (!cond || !conc) return null;

  if (cond.type !== 'Identifier' || conc.type !== 'Identifier') return null;
  if (!cond.name || !conc.name) return null;

  return `implies ${cond.name} ${conc.name}`;
}

