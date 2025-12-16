# Module Plan: src/reasoning/prove.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-49 to FS-56

---

## 1. Purpose

Implements multi-step proof construction via backward chaining. Builds proof trees that derive goals from known facts and rules.

---

## 2. Responsibilities

- Backward chain from goal to premises
- Match goals against rule conclusions
- Build proof trees with all steps
- Detect cycles and enforce depth limits
- Calculate combined confidence
- Support direct KB lookup as base case

---

## 3. Public API

```javascript
class ProofEngine {
  constructor(session: Session, options?: ProofOptions)

  prove(goal: Statement): ProveResult
}

interface ProofOptions {
  maxDepth?: number;      // Default: 10
  timeout?: number;       // Default: 5000ms
}

interface ProveResult {
  valid: boolean;
  proof: ProofTree | null;
  steps: ProofStep[];
  confidence: number;
  reason?: string;
}

interface ProofTree {
  goal: string;
  method: 'direct' | 'rule' | 'assumption';
  rule?: string;
  premises?: ProofTree[];
  confidence: number;
}

interface ProofStep {
  operation: string;
  goal: string;
  result: string;
  timestamp: string;
}
```

---

## 4. Internal Design

### 4.1 Main Algorithm

```javascript
prove(statement) {
  this.steps = [];
  this.visited = new Set();
  this.startTime = Date.now();

  const goalVector = this.buildGoalVector(statement);
  const result = this.backwardChain(goalVector, statement.toString(), 0);

  return {
    valid: result.success,
    proof: result.tree,
    steps: this.steps,
    confidence: result.confidence,
    reason: result.reason
  };
}
```

### 4.2 Backward Chaining

```javascript
backwardChain(goalVector, goalStr, depth) {
  // Check timeout
  if (Date.now() - this.startTime > this.options.timeout) {
    return { success: false, reason: 'timeout' };
  }

  // Check depth limit
  if (depth > this.options.maxDepth) {
    this.logStep('depth_limit', goalStr, 'exceeded');
    return { success: false, reason: 'depth limit' };
  }

  // Cycle detection
  const goalHash = this.hashGoal(goalVector);
  if (this.visited.has(goalHash)) {
    this.logStep('cycle', goalStr, 'detected');
    return { success: false, reason: 'cycle' };
  }
  this.visited.add(goalHash);

  // Try direct KB lookup
  const directResult = this.tryDirectMatch(goalVector, goalStr);
  if (directResult.success && directResult.confidence > 0.7) {
    this.logStep('direct', goalStr, 'found');
    return directResult;
  }

  // Try rule matching
  const rules = this.findMatchingRules(goalVector, goalStr);
  for (const rule of rules) {
    this.logStep('try_rule', goalStr, rule.name);

    const premises = rule.getPremises();
    const premiseResults = [];
    let allSucceeded = true;

    for (const premise of premises) {
      const premiseResult = this.backwardChain(
        premise.vector,
        premise.toString(),
        depth + 1
      );

      if (!premiseResult.success) {
        allSucceeded = false;
        break;
      }

      premiseResults.push(premiseResult);
    }

    if (allSucceeded) {
      this.logStep('rule_success', goalStr, rule.name);

      return {
        success: true,
        tree: {
          goal: goalStr,
          method: 'rule',
          rule: rule.name,
          premises: premiseResults.map(r => r.tree),
          confidence: this.combineConfidences(premiseResults)
        },
        confidence: this.combineConfidences(premiseResults)
      };
    }
  }

  // Try weaker direct match
  if (directResult.success && directResult.confidence > 0.55) {
    this.logStep('direct_weak', goalStr, 'accepted');
    return directResult;
  }

  this.logStep('failed', goalStr, 'no proof');
  return { success: false, reason: 'no proof found' };
}
```

### 4.3 Rule Matching

```javascript
findMatchingRules(goalVector, goalStr) {
  const matchingRules = [];

  for (const rule of this.session.getAllRules()) {
    const conclusion = rule.getConclusion();
    const unification = this.tryUnify(goalVector, conclusion);

    if (unification.success) {
      matchingRules.push({
        name: rule.name,
        getPremises: () => rule.getPremises(unification.bindings)
      });
    }
  }

  // Sort by specificity
  matchingRules.sort((a, b) => b.specificity - a.specificity);

  return matchingRules;
}
```

### 4.4 Confidence Combination

```javascript
combineConfidences(results) {
  if (results.length === 0) return 1.0;

  // Minimum of all premise confidences
  let minConf = 1.0;
  for (const r of results) {
    if (r.confidence < minConf) {
      minConf = r.confidence;
    }
  }

  // Slight penalty for chain length
  return minConf * Math.pow(0.98, results.length);
}
```

---

## 5. Dependencies

- `../core/operations.js` - similarity
- `./rules.js` - Rule matching
- `./unify.js` - Pattern unification

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| PRV-01 | Direct KB match | valid=true, method=direct |
| PRV-02 | Single rule step | valid=true, premises present |
| PRV-03 | Multi-step proof | Deep tree |
| PRV-04 | Cycle detection | valid=false, reason=cycle |
| PRV-05 | Depth limit | valid=false, reason=depth |
| PRV-06 | No proof exists | valid=false |
| PRV-07 | Confidence calculation | Correct combined score |
| PRV-08 | Timeout | valid=false, reason=timeout |

---

*End of Module Plan*
