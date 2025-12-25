import { describeContrapositiveProof } from './prove-contrapositive.mjs';
function normalizeSentence(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .toLowerCase();
}
function splitGoalParts(goalString) {
  if (!goalString || typeof goalString !== 'string') return [];
  return goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
}
function stableMoveToEnd(lines, shouldMove) {
  const keep = [];
  const move = [];
  for (const line of lines) {
    if (shouldMove(line)) move.push(line);
    else keep.push(line);
  }
  return [...keep, ...move];
}
class PositiveProveRenderer {
  constructor(session) {
    this.session = session;
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

  isTrivialEcho(result, proofSteps, ruleApplied, chainOpsCount) {
    const goalParts = splitGoalParts(result.goal || '');
    const goalOp = goalParts[0];
    const goalArgs = goalParts.slice(1);

    if (!goalOp || goalArgs.length === 0) return false;
    if (!Array.isArray(this.session?.kbFacts)) return false;

    const goalFactInKb = this.session.kbFacts.some(f => {
      const meta = f.metadata;
      if (!meta || meta.operator !== goalOp) return false;
      const args = meta.args || [];
      if (!Array.isArray(args) || args.length !== goalArgs.length) return false;
      for (let i = 0; i < args.length; i++) {
        if (args[i] !== goalArgs[i]) return false;
      }
      return true;
    });

    return proofSteps.length <= 1 && !ruleApplied && chainOpsCount <= 1 && !goalFactInKb;
  }

  describePositiveProof(result) {
    const steps = result.steps || [];

    const contrapositive = describeContrapositiveProof(this.session, result);
    if (contrapositive) return contrapositive;

    if (result.method === 'quantifier_type_disjointness' || result.method === 'quantifier_unsat') {
      const detail =
        steps.find(s => s?.operation === 'type_disjointness')?.detail ||
        steps.find(s => s?.operation === 'unsat_constraints')?.detail ||
        'Derived unsatisfiable existential constraints';
      const goal = (result.goal || '').trim() || 'goal';
      return `True: ${goal.replace(/^\s*@\S+\s+/, '')}. Proof: ${detail}.`;
    }
    if (result.method === 'exists_witness') {
      const witness = steps.find(s => s?.operation === 'exists_witness');
      const goal = (result.goal || '').trim() || 'goal';
      const entity = witness?.entity || 'witness';
      return `True: ${goal.replace(/^\s*@\S+\s+/, '')}. Proof: Witness ${entity} satisfies the existential.`;
    }

    const parsedNot = this.parseNotGoal(result.goal);
    if (parsedNot) {
      const innerDsl = `${parsedNot.innerOp} ${parsedNot.innerArgs.join(' ')}`.trim();
      const innerHuman = this.session.generateText(parsedNot.innerOp, parsedNot.innerArgs).replace(/\.$/, '');
      const notFactHuman = `NOT (${innerHuman})`;
      const hasNotFact = steps.some(s => s?.operation === 'not_fact');
      const hasCwa = steps.some(s => s?.operation === 'cwa_negation');
      if (hasNotFact || result.method === 'explicit_negation') {
        return `True: ${notFactHuman}. Proof: Found explicit negation: ${notFactHuman}.`;
      }
      if (hasCwa || result.method === 'closed_world_assumption') {
        return `True: ${notFactHuman}. Proof: Closed world assumption: cannot prove ${innerDsl}, therefore ${notFactHuman}.`;
      }
    }

    let ruleApplied = false;
    let chainOpsCount = 0;
    let chainPrimaryOp = null;
    const chainFacts = [];
    let currentBindings = null;

    const factLines = [];
    const chainVerifiedLines = [];
    const inheritanceLines = [];
    const conditionSatisfiedLines = [];
    const ruleLines = [];
    const bindingLines = [];

    const conditionLeafTexts = new Set();
    const goalOp = splitGoalParts(result.goal || '')[0] || null;
    const META_FACT_OPS = new Set(['mutuallyExclusive', 'contradictsSameArgs']);

    const SAFE_TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
    const ALLOWED_FACT_STEP_OPS = new Set([
      'direct_match',
      'direct_fact',
      'synonym_match',
      'transitive_step',
      'transitive_match',
      'transitive_found',
      'transitive_proof',
      'isA_chain',
      'inherit_property',
      'property_inherited',
      'condition_satisfied',
      'value_has',
      'rule_match',
      'rule_applied',
      'rule_application',
      'unification_match',
      'default_reasoning',
      'exception_blocked',
      'value_type_inheritance',
      'and_satisfied',
      'or_satisfied'
    ]);

    const ALLOWED_UNARY_FACT_OPS = new Set(['holds']);

    const isPrintableFact = (fact) => {
      if (!fact || typeof fact !== 'string') return false;
      const parts = fact.trim().split(/\s+/);
      if (parts.length < 2) return false;
      const op = parts[0];
      if (parts.length === 2 && !ALLOWED_UNARY_FACT_OPS.has(op)) return false;
      if (!SAFE_TOKEN_RE.test(op)) return false;
      if (op.startsWith('__') || op.startsWith('Pos')) return false;
      return true;
    };

    const ruleById = (ruleId) => {
      if (!ruleId) return null;
      return (this.session.rules || []).find(r => r.id === ruleId) || null;
    };

    for (const step of steps) {
      if (['rule_match', 'unification_match', 'rule_applied'].includes(step.operation)) {
        ruleApplied = true;
        if (step.bindings && typeof step.bindings === 'object') {
          currentBindings = step.bindings;
        }

        const ruleObj = ruleById(step.ruleId);
        if (ruleObj?.conditionParts) {
          for (const leaf of this.collectLeafHumans(ruleObj.conditionParts, currentBindings)) {
            if (leaf) conditionLeafTexts.add(leaf);
          }
        } else if (ruleObj?.conditionAST) {
          const leaf = this.exprToHuman(ruleObj.conditionAST, currentBindings);
          if (leaf) conditionLeafTexts.add(leaf);
        }

        const cond =
          ruleObj?.conditionParts
            ? this.compoundToHuman(ruleObj.conditionParts, currentBindings)
            : (ruleObj?.conditionAST ? this.exprToHuman(ruleObj.conditionAST, currentBindings) : null);
        const conc =
          ruleObj?.conclusionParts
            ? this.compoundToHuman(ruleObj.conclusionParts, currentBindings)
            : (ruleObj?.conclusionAST ? this.exprToHuman(ruleObj.conclusionAST, currentBindings) : null);

        if (cond && conc) {
          const appliedRuleText = `Applied rule: IF (${cond}) THEN (${conc})`;
          if (!ruleLines.includes(appliedRuleText)) ruleLines.push(appliedRuleText);

          if ((cond.includes('?') || conc.includes('?')) && currentBindings) {
            const bindingLine = this.bindingsToHuman(currentBindings);
            if (bindingLine && !bindingLines.includes(bindingLine)) bindingLines.push(bindingLine);
          }
        } else {
          const appliedRuleText = 'Applied rule: implication';
          if (!ruleLines.includes(appliedRuleText)) ruleLines.push(appliedRuleText);
        }

        continue;
      }

      if (step.operation === 'value_type_inheritance' && step.fact) {
        const parts = step.fact.trim().split(/\s+/).filter(Boolean);
        let derived = step.fact;
        if (parts.length >= 3) {
          derived = this.session.generateText(parts[0], parts.slice(1)).replace(/[.!?]+$/, '');
        }
        const inheritText = `Value-type inheritance: inferred ${derived} from the type of a value`;
        if (!inheritanceLines.includes(inheritText)) {
          inheritanceLines.push(inheritText);
        }
        continue;
      }

      if (step.operation === 'and_satisfied') {
        const raw = step.detail || '';
        const satisfiedFacts = [];
        if (raw) {
          const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
          for (const p of parts) {
            const factParts = p.split(/\s+/);
            if (factParts.length >= 3) {
              const op = factParts[0];
              const args = factParts.slice(1);
              const generated = this.session.generateText(op, args).replace(/[.!?]+$/, '');
              const stepText = generated || `${args[0]} ${op} ${args.slice(1).join(' ')}`;
              if (stepText && !factLines.includes(stepText)) {
                factLines.push(stepText);
                chainFacts.push(stepText);
                satisfiedFacts.push(stepText);
              }
            }
          }
        }

        const summary = satisfiedFacts.length > 0
          ? `And condition satisfied: ${satisfiedFacts.join(', ')}`
          : 'And condition satisfied';
        if (!conditionSatisfiedLines.includes(summary)) conditionSatisfiedLines.push(summary);
        continue;
      }

      if (step.operation === 'or_satisfied') {
        const raw = String(step.detail || '').trim();
        const satisfied = [];
        if (raw) {
          const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
          for (const p of parts) {
            const factParts = p.split(/\s+/);
            if (factParts.length >= 3) {
              const op = factParts[0];
              const args = factParts.slice(1);
              const generated = this.session.generateText(op, args).replace(/[.!?]+$/, '');
              const stepText = generated || `${args[0]} ${op} ${args.slice(1).join(' ')}`;
              if (stepText && !factLines.includes(stepText)) {
                factLines.push(stepText);
                chainFacts.push(stepText);
                satisfied.push(stepText);
              }
            }
          }
        }
        const summary = satisfied.length > 0
          ? `Or condition satisfied via: ${satisfied.join(', ')}`
          : 'Or condition satisfied';
        if (!conditionSatisfiedLines.includes(summary)) conditionSatisfiedLines.push(summary);
        continue;
      }

      if (step.operation === 'default_reasoning') {
        ruleApplied = true;
        const defaultFact = step.fact || 'default rule';
        const entity = step.appliedTo || 'entity';
        const defaultText = `${defaultFact} applies. ${entity} inherits via default`;
        if (!inheritanceLines.includes(defaultText)) {
          inheritanceLines.push(defaultText);
        }
        continue;
      }

      if (step.operation === 'exception_blocked') {
        const exception = step.exception || 'exception';
        const entity = step.entity || 'entity';
        const blockedText = `Default blocked by exception: ${exception} for ${entity}`;
        if (!inheritanceLines.includes(blockedText)) {
          inheritanceLines.push(blockedText);
        }
        continue;
      }

      if (step.fact) {
        if (step.operation && !ALLOWED_FACT_STEP_OPS.has(step.operation)) {
          continue;
        }
        const opToken = String(step.fact || '').trim().split(/\s+/)[0];
        if (opToken && META_FACT_OPS.has(opToken) && opToken !== goalOp) continue;
        if (!isPrintableFact(step.fact)) {
          continue;
        }

        const factParts = step.fact.trim().split(/\s+/);
        if (factParts.length >= 3) {
          const stepOp = factParts[0];
          const args = factParts.slice(1);
          if (['before', 'causes', 'isA', 'locatedIn', 'partOf'].includes(stepOp)) {
            chainPrimaryOp = chainPrimaryOp || stepOp;
            if (!chainPrimaryOp || chainPrimaryOp === stepOp) {
              chainOpsCount++;
            }
          }
          const generated = this.session.generateText(stepOp, args).replace(/[.!?]+$/, '');
          const stepText = generated || `${args[0]} ${stepOp} ${args.slice(1).join(' ')}`;
          if (stepText && !factLines.includes(stepText)) {
            factLines.push(stepText);
            chainFacts.push(stepText);
          }
        } else if (factParts.length === 2) {
          const stepText = `${factParts[1]} ${factParts[0]}`;
          if (stepText && !factLines.includes(stepText)) {
            factLines.push(stepText);
          }
        }
      }
    }

    if (!ruleApplied && chainOpsCount >= 2) {
      const chainLabel = chainPrimaryOp === 'causes' ? 'Causal chain' : 'Transitive chain';
      chainVerifiedLines.push(`${chainLabel} verified (${chainOpsCount} hops)`);
    }

    if (ruleApplied && (chainPrimaryOp === 'causes' || chainFacts.some(f => f.includes(' causes ')))) {
      const factSteps = chainFacts.filter(f => f.includes(' causes '));
      if (factSteps.length > 0) {
        const andLine = conditionSatisfiedLines.find(p => p.startsWith('And condition satisfied'));
        const hops = chainOpsCount >= 2 ? chainOpsCount : factSteps.length;
        const chainLine = hops >= 2 ? `Causal chain verified (${hops} hops)` : null;
        const goalText = this.goalToHuman(result.goal);
        const groundedRule = (() => {
          if (!andLine || !goalText) return null;
          const tail = andLine.split(':').slice(1).join(':').trim();
          const facts = tail.split(',').map(s => s.trim()).filter(Boolean);
          if (facts.length < 2) return null;
          return `Applied rule: IF ((${facts[0]}) AND (${facts[1]})) THEN (${goalText})`;
        })();
        const newProof = [...factSteps];
        if (chainLine) newProof.push(chainLine);
        if (andLine) newProof.push(andLine);
        if (groundedRule) newProof.push(groundedRule);
        else if (ruleLines.length > 0) newProof.push(...ruleLines);
        const proofBody = newProof.join('. ');
        const conclusion = goalText ? ` Therefore ${goalText}.` : '';
        return `True: ${goalText}. Proof: ${proofBody}.${conclusion}`;
      }
    }

    const goalText = this.goalToHuman(result.goal);
    const goalNorm = normalizeSentence(goalText);

    if (ruleApplied && goalText && conditionLeafTexts.size > 0) {
      const candidates = conditionSatisfiedLines
        .filter(p => p.startsWith('And condition satisfied:'))
        .map(line => {
          const tail = line.split(':').slice(1).join(':').trim();
          const facts = tail.split(',').map(s => s.trim()).filter(Boolean);
          return { facts, line };
        })
        .filter(c => c.facts.length === conditionLeafTexts.size);
      const best = candidates.sort((a, b) => b.facts.length - a.facts.length)[0];
      if (best && best.facts.length >= 2) {
        const cond = best.facts.map(f => `(${f})`).join(' AND ');
        ruleLines.length = 0; bindingLines.length = 0;
        ruleLines.push(`Applied rule: IF (${cond}) THEN (${goalText})`);
      }
    }

    const reorderedFacts = stableMoveToEnd(factLines, (line) => conditionLeafTexts.has(line));

    const proofSteps = [
      ...reorderedFacts,
      ...chainVerifiedLines,
      ...inheritanceLines,
      ...conditionSatisfiedLines,
      ...ruleLines,
      ...bindingLines
    ].filter(Boolean);

    const trivialDirect = proofSteps.length === 1 && normalizeSentence(proofSteps[0]) === goalNorm;
    if (trivialDirect && goalText) return `True: ${goalText}. Proof: Fact in KB: ${goalText}.`;

    const trivialEcho = this.isTrivialEcho(result, proofSteps, ruleApplied, chainOpsCount);
    if (trivialEcho) {
      const goalDesc = goalText || 'goal';
      return `Cannot prove: ${goalDesc}. Proof: Goal fact not found in KB; ignored low-confidence guess.`;
    }

    if (goalText && proofSteps.length > 0) {
      const proofBody = proofSteps.join('. ');
      const proofNorm = normalizeSentence(proofBody);
      const needsConclusion =
        goalText &&
        !proofNorm.includes(`therefore ${goalNorm}`) &&
        !proofNorm.endsWith(goalNorm) &&
        (ruleApplied || chainOpsCount >= 2 || proofSteps.length > 2);
      const conclusion = needsConclusion ? ` Therefore ${goalText}.` : '';
      return `True: ${goalText}. Proof: ${proofBody}.${conclusion}`;
    }
    if (goalText) {
      return `True: ${goalText}. Proof: No proof steps were produced.`;
    }
    return 'Proof valid';
  }
}

export function describePositiveProof(session, reasoningResult) {
  return new PositiveProveRenderer(session).describePositiveProof(reasoningResult);
}
