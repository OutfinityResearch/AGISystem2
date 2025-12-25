/**
 * Leaf-condition proving utilities (ground + partially bound).
 *
 * Split out of `src/reasoning/conditions.mjs` to keep each file <500 LOC.
 */

import { Statement, Identifier } from '../../parser/ast.mjs';
import { debug_trace } from '../../utils/debug.js';

function dbg(category, ...args) {
  debug_trace(`[Cond:${category}]`, ...args);
}

export function proveSingleCondition(self, condStr, bindings, depth) {
  dbg('SINGLE', 'Condition:', condStr, 'Bindings:', [...bindings.entries()]);

  if (!condStr.includes('?')) {
    const parts = condStr.trim().split(/\s+/);
    if (parts[0] === 'holds' && parts.length >= 2) {
      const args = parts.slice(1).map(arg => new Identifier(arg));
      const goal = new Statement(null, new Identifier('holds'), args);
      const result = self.engine.proveGoal(goal, depth + 1);
      if (result.valid) {
        return { valid: true, confidence: result.confidence, steps: result.steps };
      }
    }

    // Block proving a positive condition if it is explicitly negated in KB.
    // This must be metadata-based (graph operators have vector mismatch).
    if (parts.length >= 2) {
      const goal = new Statement(null, new Identifier(parts[0]), parts.slice(1).map(arg => new Identifier(arg)));
      const negInfo = self.engine.checkGoalNegation(goal);
      if (negInfo?.negated) {
        return {
          valid: false,
          reason: 'Condition is negated',
          steps: [{ operation: 'condition_negated', fact: `${parts[0]} ${parts.slice(1).join(' ')}`.trim() }]
        };
      }
    }

    const match = self.engine.kbMatcher.findMatchingFact(condStr);
    if (match.found) {
      return { valid: true, confidence: match.confidence, steps: [{ operation: 'fact_matched', fact: condStr }] };
    }

    const transResult = self.engine.transitive.tryTransitiveForCondition(condStr);
    if (transResult.valid) {
      return {
        valid: true,
        confidence: transResult.confidence * self.thresholds.CONFIDENCE_DECAY,
        steps: [{ operation: 'transitive_proof', fact: condStr }, ...(transResult.steps || [])]
      };
    }

    // Value type inheritance: has X Y can be proven if has X Z and isA Z Y
    // Example: has Alice PaymentMethod if has Alice CreditCard and isA CreditCard PaymentMethod
    const valueInheritResult = tryValueTypeInheritance(self, condStr, depth);
    if (valueInheritResult.valid) {
      return valueInheritResult;
    }

    if (depth < self.options.maxDepth) {
      const ruleResult = self.engine.kbMatcher.tryRuleChainForCondition(condStr, depth + 1);
      if (ruleResult.valid) return ruleResult;
    }

    // As a fallback for ground conditions, allow backward chaining via rules (including ground rules),
    // but only when the conclusion matches exactly (no similarity-based acceptance here).
    if (depth < self.options.maxDepth) {
      const goalStmt = new Statement(null, new Identifier(parts[0]), parts.slice(1).map(arg => new Identifier(arg)));

      const goalOp = parts[0];
      const goalArgs = parts.slice(1);
      const canon = (name) => {
        if (!self.session?.canonicalizationEnabled) return name;
        return self.session.componentKB?.canonicalizeName?.(name) || name;
      };

      for (const rule of self.session.rules) {
        if (!rule.conclusionAST) continue;

        if (!rule.hasVariables) {
          const concOp = self.engine.unification.extractOperatorFromAST(rule.conclusionAST);
          const concArgs = self.engine.unification.extractArgsFromAST(rule.conclusionAST);
          const exact =
            concOp &&
            canon(concOp) === canon(goalOp) &&
            concArgs.length === goalArgs.length &&
            concArgs.every((a, i) => !a.isVariable && canon(a.name) === canon(goalArgs[i]));
          if (!exact) continue;
        }

        const res = self.engine.kbMatcher.tryRuleMatch(goalStmt, rule, depth);
        if (res.valid) return res;
      }
    }

    return { valid: false };
  }

  return proveWithUnboundVars(self, condStr, bindings, depth);
}

export function tryValueTypeInheritance(self, condStr, depth) {
  const parts = condStr.split(/\s+/);
  if (parts.length < 3) return { valid: false };

  const [operator, entity, targetType] = parts;

  // Only applies to 'has' and similar possession operators
  if (!['has', 'owns', 'holds', 'contains'].includes(operator)) {
    return { valid: false };
  }

  dbg('VALUE_INHERIT', `Trying ${operator} ${entity} ${targetType} via value inheritance`);

  // Find all things that entity 'has'
  const componentKB = self.session.componentKB;
  const scanFacts = componentKB?.findByOperatorAndArg0 ? componentKB.findByOperatorAndArg0(operator, entity) : self.session.kbFacts;
  for (const fact of scanFacts) {
    if (self.engine.isTimedOut()) throw new Error('Proof timed out');
    self.session.reasoningStats.kbScans++;
    const meta = fact.metadata;

    if (meta?.operator === operator && meta.args?.[0] === entity) {
      const heldValue = meta.args[1];

      // Check if heldValue isA targetType (direct or transitive)
      const isAResult = checkIsATransitive(self, heldValue, targetType, depth);

      if (isAResult.found) {
        dbg('VALUE_INHERIT', `Found: ${entity} ${operator} ${heldValue}, and ${heldValue} isA ${targetType}`);

        return {
          valid: true,
          confidence: self.thresholds.CONDITION_CONFIDENCE * self.thresholds.CONFIDENCE_DECAY,
          steps: [
            { operation: 'value_has', fact: `${operator} ${entity} ${heldValue}` },
            ...isAResult.steps,
            { operation: 'value_type_inheritance', fact: `${operator} ${entity} ${targetType}` }
          ]
        };
      }
    }
  }

  return { valid: false };
}

export function checkIsATransitive(self, child, parent, depth, visited = new Set()) {
  if (child === parent) return { found: true, steps: [] };
  if (visited.has(child)) return { found: false, steps: [] };
  if (depth > (self.options?.maxDepth || 10)) return { found: false, steps: [] };

  visited.add(child);

  const componentKB = self.session.componentKB;
  const scanFacts = componentKB?.findByOperatorAndArg0 ? componentKB.findByOperatorAndArg0('isA', child) : self.session.kbFacts;
  for (const fact of scanFacts) {
    if (self.engine.isTimedOut()) throw new Error('Proof timed out');
    self.session.reasoningStats.kbScans++;
    const meta = fact.metadata;

    if (meta?.operator === 'isA' && meta.args?.[0] === child) {
      const directParent = meta.args[1];
      const step = { operation: 'isA_chain', fact: `isA ${child} ${directParent}` };

      if (directParent === parent) return { found: true, steps: [step] };

      const recurse = checkIsATransitive(self, directParent, parent, depth + 1, visited);
      if (recurse.found) return { found: true, steps: [step, ...recurse.steps] };
    }
  }

  return { found: false, steps: [] };
}

export function proveWithUnboundVars(self, condStr, bindings, depth) {
  const parts = condStr.split(/\s+/);
  if (parts.length < 2) return { valid: false };

  const op = parts[0];
  const args = parts.slice(1);

  const componentKB = self.session.componentKB;
  const scanFacts = componentKB?.findByOperator ? componentKB.findByOperator(op) : self.session.kbFacts;
  for (const fact of scanFacts) {
    if (self.engine.isTimedOut()) throw new Error('Proof timed out');
    self.session.reasoningStats.kbScans++;
    const meta = fact.metadata;
    if (!meta || meta.operator !== op) continue;
    if (!meta.args || meta.args.length !== args.length) continue;

    const newBindings = new Map();
    let matches = true;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const factArg = meta.args[i];

      if (arg.startsWith('?')) {
        const varName = arg.substring(1);
        if (bindings.has(varName)) {
          if (bindings.get(varName) !== factArg) {
            matches = false;
            break;
          }
        } else {
          newBindings.set(varName, factArg);
        }
      } else {
        if (arg !== factArg) {
          matches = false;
          break;
        }
      }
    }

    if (matches) {
      dbg('UNBOUND', 'Found match:', `${op} ${meta.args.join(' ')}`, 'New bindings:', [...newBindings.entries()]);
      return {
        valid: true,
        confidence: self.thresholds.CONDITION_CONFIDENCE,
        newBindings,
        steps: [{ operation: 'pattern_match', fact: `${op} ${meta.args.join(' ')}`, bindings: Object.fromEntries(newBindings) }]
      };
    }
  }

  return { valid: false, reason: 'No pattern match found' };
}
