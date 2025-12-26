import { BaseTranslator } from './shared.mjs';
import { describePositiveProof } from './prove-positive.mjs';

function splitGoalParts(goalString) {
  if (!goalString || typeof goalString !== 'string') return [];
  return goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
}

export class ProveTranslator extends BaseTranslator {
  translate({ reasoningResult }) {
    if (!reasoningResult) return 'Cannot prove: statement';
    const base = (() => {
      if (!reasoningResult.valid) {
        return this.describeInvalidProof(reasoningResult);
      }
      if (reasoningResult.result === false) {
        return this.describeNegativeProof(reasoningResult);
      }
      return describePositiveProof(this.session, reasoningResult);
    })();

    const confidence = typeof reasoningResult.confidence === 'number'
      ? reasoningResult.confidence
      : (typeof reasoningResult?.proofObject?.confidence === 'number' ? reasoningResult.proofObject.confidence : null);
    if (typeof confidence === 'number' && Number.isFinite(confidence)) {
      return `${base} (confidence=${confidence.toFixed(2)})`;
    }
    return base;
  }

  exprToHuman(expr, bindings = null) {
    if (!expr || typeof expr !== 'object') return String(expr ?? '');

    const termToToken = (node) => {
      if (!node || typeof node !== 'object') return String(node ?? '');
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'Hole') {
        const bound = bindings && typeof bindings === 'object' ? bindings[node.name] : null;
        return bound || `?${node.name}`;
      }
      if (node.type === 'Reference') return `@${node.name}`;
      if (node.type === 'Literal') return node.literalType === 'string' ? String(node.value) : String(node.value);
      return typeof node.toString === 'function' ? node.toString() : String(node);
    };

    if (expr.type === 'Statement') {
      const op = expr.operator?.name || expr.operator?.value || termToToken(expr.operator);
      const args = Array.isArray(expr.args) ? expr.args.map(termToToken) : [];
      return this.session.generateText(op, args).replace(/[.!?]+$/, '');
    }

    if (expr.type === 'Compound') {
      const op = expr.operator?.name || expr.operator?.value || termToToken(expr.operator);
      const args = Array.isArray(expr.args) ? expr.args : [];
      if (op === 'Not' && args.length === 1) {
        return `NOT (${this.exprToHuman(args[0], bindings)})`;
      }
      if ((op === 'And' || op === 'Or') && args.length > 0) {
        const joiner = op === 'And' ? ' AND ' : ' OR ';
        return args.map(a => `(${this.exprToHuman(a, bindings)})`).join(joiner);
      }
      const rendered = args.map(a => this.exprToHuman(a, bindings)).join(', ');
      return `${op}(${rendered})`;
    }

    return typeof expr.toString === 'function' ? expr.toString() : String(expr);
  }

  bindingsToHuman(bindings) {
    if (!bindings || typeof bindings !== 'object') return null;
    const entries = Object.entries(bindings).filter(([, v]) => typeof v === 'string' && v.trim().length > 0);
    if (entries.length === 0) return null;
    const parts = entries.map(([k, v]) => `?${k}=${v}`);
    return `Bindings: ${parts.join(', ')}`;
  }

  compoundToHuman(part, bindings = null) {
    if (!part || typeof part !== 'object') return String(part ?? '');
    if (part.type === 'leaf') {
      return this.exprToHuman(part.ast, bindings);
    }
    if (part.type === 'Not' && part.inner) {
      return `NOT (${this.compoundToHuman(part.inner, bindings)})`;
    }
    if ((part.type === 'And' || part.type === 'Or') && Array.isArray(part.parts)) {
      const joiner = part.type === 'And' ? ' AND ' : ' OR ';
      return part.parts.map(p => `(${this.compoundToHuman(p, bindings)})`).join(joiner);
    }
    return typeof part.toString === 'function' ? part.toString() : String(part);
  }

  collectLeafHumans(part, bindings = null, out = []) {
    if (!part || typeof part !== 'object') return out;
    if (part.type === 'leaf' && part.ast) {
      out.push(this.exprToHuman(part.ast, bindings));
      return out;
    }
    if (part.inner) this.collectLeafHumans(part.inner, bindings, out);
    if (Array.isArray(part.parts)) {
      for (const p of part.parts) this.collectLeafHumans(p, bindings, out);
    }
    return out;
  }

  parseNotGoal(goalString) {
    const parts = splitGoalParts(goalString);
    if (parts.length < 2) return null;
    if (parts[0] !== 'Not') return null;
    const innerParts = parts.slice(1);
    if (innerParts.length === 0) return null;

    innerParts[0] = innerParts[0].replace(/^\(/, '');
    innerParts[innerParts.length - 1] = innerParts[innerParts.length - 1].replace(/\)$/, '');

    const innerOp = innerParts[0];
    const innerArgs = innerParts.slice(1);
    if (!innerOp) return null;
    return { innerOp, innerArgs };
  }

  goalToHuman(goalString) {
    const parts = splitGoalParts(goalString);
    if (parts.length < 2) return parts.join(' ') || 'statement';
    const op = parts[0];
    const args = parts.slice(1);
    return this.session.generateText(op, args).replace(/\.$/, '');
  }

  describeInvalidProof(result) {
    const goalText = this.goalToHuman(result.goal);
    const searchTrace = typeof result.searchTrace === 'string' ? result.searchTrace.trim() : '';

    if (/Found explicit negation:/i.test(searchTrace) || /Negation blocks inference/i.test(searchTrace) || /Goal is negated/i.test(result.reason || '')) {
      const proofText = `Found explicit negation: NOT (${goalText}). Negation blocks inference.`;
      return `Cannot prove: ${goalText}. Proof: ${proofText}`;
    }

    const parsedNot = this.parseNotGoal(result.goal);
    if (parsedNot && /explicit negation/i.test(result.reason || '')) {
      const inner = this.session.generateText(parsedNot.innerOp, parsedNot.innerArgs).replace(/\.$/, '');
      const proofText = `Open-world negation: no explicit negation fact for (${inner}).`;
      return `Cannot prove: NOT (${inner}). Proof: ${proofText}`;
    }

    const ruleExplanation = this.explainRuleFailure(result);
    if (ruleExplanation) {
      return `Cannot prove: ${goalText}. Proof: ${ruleExplanation}`;
    }

    const parts = splitGoalParts(result.goal);
    const goalOp = parts[0];
    const goalArgs = parts.slice(1);
    const subj = goalArgs[0];
    const obj = goalArgs[1];

    const kb = Array.isArray(this.session?.kbFacts) ? this.session.kbFacts : [];
    const hasDirect = kb.some(f => f?.metadata?.operator === goalOp && Array.isArray(f?.metadata?.args) && f.metadata.args.join(' ') === goalArgs.join(' '));
    if (hasDirect) {
      const proofText = `Goal fact exists in KB but was rejected by the prover (${result.reason || 'unprovable'}).`;
      return `Cannot prove: ${goalText}. Proof: ${proofText}`;
    }

    const hasAnyForSubject = subj
      ? kb.some(f => f?.metadata?.operator === goalOp && Array.isArray(f?.metadata?.args) && f.metadata.args[0] === subj)
      : false;

    if (goalOp && subj && obj && !hasAnyForSubject) {
      const proofText = `No ${goalOp} facts for ${subj} exist in KB, so ${goalText} cannot be derived.`;
      return `Cannot prove: ${goalText}. Proof: ${proofText}`;
    }

    if (goalOp && subj && obj) {
      const proofText = `No proof found for ${goalText} within the search limits (${result.reason || 'no applicable rules'}).`;
      return `Cannot prove: ${goalText}. Proof: ${proofText}`;
    }

    if (searchTrace) {
      return `Cannot prove: ${goalText}. Proof: ${searchTrace.replace(/^Search:\\s*/i, '')}`;
    }
    return `Cannot prove: ${goalText}. Proof: No valid derivation was found.`;
  }

  collectLeafStatements(part, negated = false, out = []) {
    if (!part || typeof part !== 'object') return out;
    if (part.type === 'leaf' && part.ast) {
      out.push({ ast: part.ast, negated });
      return out;
    }
    if (part.type === 'Not' && part.inner) {
      this.collectLeafStatements(part.inner, !negated, out);
      return out;
    }
    if (Array.isArray(part.parts)) {
      for (const p of part.parts) {
        this.collectLeafStatements(p, negated, out);
      }
    }
    if (part.inner) this.collectLeafStatements(part.inner, negated, out);
    return out;
  }

  matchStatementToGoal(statementAst, goalOp, goalArgs) {
    if (!statementAst || typeof statementAst !== 'object') return null;
    if (statementAst.type !== 'Statement') return null;
    const op = statementAst.operator?.name || statementAst.operator?.value;
    if (!op || op !== goalOp) return null;
    const args = Array.isArray(statementAst.args) ? statementAst.args : [];
    if (args.length !== goalArgs.length) return null;

    const bindings = {};
    for (let i = 0; i < args.length; i++) {
      const node = args[i];
      const want = goalArgs[i];
      if (!node) return null;
      if (node.type === 'Identifier') {
        if (node.name !== want) return null;
        continue;
      }
      if (node.type === 'Hole') {
        const hole = node.name;
        if (!hole) return null;
        if (bindings[hole] && bindings[hole] !== want) return null;
        bindings[hole] = want;
        continue;
      }
      if (node.type === 'Literal') {
        if (String(node.value) !== String(want)) return null;
        continue;
      }
      return null;
    }
    return bindings;
  }

  groundStatement(statementAst, bindings) {
    if (!statementAst || statementAst.type !== 'Statement') return null;
    const op = statementAst.operator?.name || statementAst.operator?.value;
    if (!op) return null;
    const args = [];
    for (const node of (statementAst.args || [])) {
      if (node.type === 'Identifier') args.push(node.name);
      else if (node.type === 'Hole') args.push(bindings?.[node.name] || `?${node.name}`);
      else if (node.type === 'Literal') args.push(String(node.value));
      else return null;
    }
    return { op, args };
  }

  factExists(op, args) {
    if (!op || !Array.isArray(args)) return false;
    const kb = Array.isArray(this.session?.kbFacts) ? this.session.kbFacts : [];
    return kb.some(f => {
      const meta = f?.metadata;
      if (!meta || meta.operator !== op) return false;
      const factArgs = meta.args || [];
      if (!Array.isArray(factArgs) || factArgs.length !== args.length) return false;
      for (let i = 0; i < args.length; i++) {
        if (factArgs[i] !== args[i]) return false;
      }
      return true;
    });
  }

  notFactExists(op, args) {
    // Detect explicit Not($ref) where $ref points to `op args...`.
    const kb = Array.isArray(this.session?.kbFacts) ? this.session.kbFacts : [];
    const expectedText = `${op} ${args.join(' ')}`.trim();
    for (const fact of kb) {
      const meta = fact?.metadata;
      if (meta?.operator !== 'Not') continue;
      const refName = meta.args?.[0]?.replace('$', '');
      if (!refName) continue;
      const refText = this.session.referenceTexts?.get(refName);
      if (refText === expectedText) return true;
    }
    return false;
  }

  explainRuleFailure(result) {
    const goalParts = splitGoalParts(result.goal);
    const goalOp = goalParts[0];
    const goalArgs = goalParts.slice(1);
    if (!goalOp || goalArgs.length === 0) return null;

    const rules = Array.isArray(this.session?.rules) ? this.session.rules : [];
    for (const rule of rules) {
      const conclusionLeaves = rule?.conclusionParts
        ? this.collectLeafStatements(rule.conclusionParts, false, [])
        : (rule?.conclusionAST ? [{ ast: rule.conclusionAST, negated: false }] : []);

      for (const leaf of conclusionLeaves) {
        const bindings = this.matchStatementToGoal(leaf.ast, goalOp, goalArgs);
        if (!bindings) continue;

        const condText = rule?.conditionParts
          ? this.compoundToHuman(rule.conditionParts, bindings)
          : (rule?.conditionAST ? this.exprToHuman(rule.conditionAST, bindings) : null);
        const concText = rule?.conclusionParts
          ? this.compoundToHuman(rule.conclusionParts, bindings)
          : (rule?.conclusionAST ? this.exprToHuman(rule.conclusionAST, bindings) : null);

        const proofLines = [];
        if (condText && concText) {
          proofLines.push(`Checked rule: IF (${condText}) THEN (${concText})`);
        }

        const condLeaves = rule?.conditionParts
          ? this.collectLeafStatements(rule.conditionParts, false, [])
          : (rule?.conditionAST ? [{ ast: rule.conditionAST, negated: false }] : []);

        const missing = [];
        const blocked = [];
        const found = [];

        for (const condLeaf of condLeaves) {
          const grounded = this.groundStatement(condLeaf.ast, bindings);
          if (!grounded || grounded.args.some(a => typeof a === 'string' && a.startsWith('?'))) continue;
          const factText = this.session.generateText(grounded.op, grounded.args).replace(/[.!?]+$/, '');

          if (condLeaf.negated) {
            if (this.notFactExists(grounded.op, grounded.args)) {
              found.push(`Found explicit negation: NOT (${factText})`);
            } else if (this.factExists(grounded.op, grounded.args)) {
              blocked.push(`Blocked: NOT (${factText}) is false because ${factText} is true`);
            } else if (this.session.closedWorldAssumption) {
              found.push(`Closed world assumption: cannot prove ${factText}, so NOT (${factText}) holds`);
            } else {
              missing.push(`Missing: explicit negation for ${factText}`);
            }
          } else {
            if (this.factExists(grounded.op, grounded.args)) {
              found.push(`Found: ${factText}`);
            } else {
              missing.push(`Missing: ${factText}`);
            }
          }
        }

        if (found.length > 0) proofLines.push(...found);
        if (blocked.length > 0) proofLines.push(...blocked);
        if (missing.length > 0) proofLines.push(...missing);

        if (blocked.length > 0 || missing.length > 0) {
          proofLines.push('Therefore the rule antecedent is not satisfied');
          return proofLines.join('. ');
        }
      }
    }

    return null;
  }

  describeNegativeProof(result) {
    const proofSteps = [];
    for (const step of result.steps || []) {
      if (step.operation === 'chain_step' && step.from && step.to) {
        const text = this.session.generateText('locatedIn', [step.from, step.to]).replace(/\.$/, '');
        if (text && !proofSteps.includes(text)) {
          proofSteps.push(text);
        }
      } else if (step.operation === 'disjoint_check') {
        proofSteps.push(`${step.container} and ${step.target} are disjoint`);
      }
    }

    const goalText = this.goalToHuman(result.goal);
    if (goalText && proofSteps.length > 0) {
      return `False: NOT ${goalText}. Proof: ${proofSteps.join('. ')}.`;
    }
    if (goalText) {
      return `False: NOT ${goalText}. Proof: No counterexample chain was produced.`;
    }
    return 'Proof valid (negative)';
  }

}
