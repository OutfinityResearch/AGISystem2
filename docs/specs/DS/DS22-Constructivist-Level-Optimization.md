# DS22: Constructivist Level Optimization

## Status: IMPLEMENTED (Runtime Optimization Pending)

**Version**: 1.0
**Date**: 2025-12-25
**Authors**: Claude Code + S. Alboaie

---

## 1. Abstract

This document specifies the Constructivist Level optimization for AGISystem2's reasoning engines. The optimization exploits the hierarchical nature of knowledge bases where concepts at level N can only be constructed from concepts at levels strictly < N, creating a DAG structure that enables search space pruning.

**Current State**: Infrastructure implemented and functional. Runtime pruning is enabled for variable-rule instantiation (premise-level check after unification); full conclusion-level indexing for variable rules remains an open optimization.

---

## 2. Theoretical Foundation

### 2.1 Constructivist Level Definition

For any concept C in the knowledge base:

```
Level(C) = 0                                        if C is a primitive atom
Level(C) = 1 + max(Level(d) for d in deps(C))      otherwise
```

Where `deps(C)` are all concepts referenced in C's definition.

### 2.2 Key Properties

1. **DAG Structure**: Constructivist levels create a Directed Acyclic Graph - no circular definitions possible by construction
2. **Monotonicity**: If A depends on B, then Level(A) > Level(B)
3. **Finite Depth**: For any finite KB, there exists a maximum level
4. **Search Pruning**: When proving goal G at level L, only facts/rules with dependencies at levels < L need consideration

### 2.3 Example

```
Level 0: Animal, Living (primitives)
Level 1: isA, hasProperty (operators depend on args)
Level 2: Dog (depends on Animal via isA Dog Animal)
Level 3: GoldenRetriever (depends on Dog)
```

For goal `hasProperty GoldenRetriever Living` at level 4:
- Only need to consider facts at levels 0-3
- Can skip any rule whose premises require level >= 4

---

## 3. Architecture

### 3.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Session                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ComponentKB                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              LevelManager                          │  │  │
│  │  │  - conceptLevels: Map<string, number>              │  │  │
│  │  │  - factLevels: Map<factId, number>                 │  │  │
│  │  │  - levelIndex: Map<level, Set<factId>>             │  │  │
│  │  │  - ruleLevels: Map<ruleId, {conc, prem}>          │  │  │
│  │  │  - _levelBundles: Map<level, Vector>               │  │  │
│  │  │  - _cumulativeBundles: Map<level, Vector>          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────────────────────┐    │
│  │ ForwardChainEngine│  │ LevelAwareRuleIndex              │    │
│  │ (Level-ordered)   │  │ (For backward chaining - pending)│    │
│  └──────────────────┘  └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
Fact Addition:
  1. Parse fact → extract dependencies
  2. Compute level from dependency levels
  3. Update conceptLevels, factLevels, levelIndex
  4. Invalidate level bundles (lazy recompute)

Query (when enabled):
  1. Compute goal level from goal dependencies
  2. Retrieve facts/rules up to goalLevel-1
  3. Perform reasoning on reduced search space
```

---

## 4. Implementation Details

### 4.1 Core Module: constructivist-level.mjs

```javascript
/**
 * Extract dependencies from a fact or expression
 * @param {Object} fact - Fact with metadata or AST
 * @returns {Set<string>} Referenced concept names
 */
export function extractDependencies(fact, options = {}) {
  const deps = new Set();
  // Recursively extract from metadata.args, AST nodes, etc.
  // Skip variables (?x), holes ($), references (@)
  return deps;
}

/**
 * Compute level for a fact
 * @param {Object} fact - Fact to compute level for
 * @param {Map} conceptLevels - Existing concept→level mapping
 * @returns {number} Computed level
 */
export function computeConstructivistLevel(fact, conceptLevels, options = {}) {
  const deps = extractDependencies(fact);
  if (deps.size === 0) return 0;

  let maxDepLevel = -1;
  for (const dep of deps) {
    maxDepLevel = Math.max(maxDepLevel, conceptLevels.get(dep) ?? 0);
  }
  return maxDepLevel + 1;
}

/**
 * Compute levels for a rule (STATIC - see Section 5 for limitations)
 */
export function computeRuleLevels(rule, conceptLevels) {
  // Extract from conditionAST and conclusionAST
  // Returns { conclusionLevel, maxPremiseLevel }
}

/**
 * Level-based KB manager
 */
export class LevelManager {
  constructor(session) {
    this.conceptLevels = new Map();
    this.factLevels = new Map();
    this.levelIndex = new Map();
    this.ruleLevels = new Map();
    this._levelBundles = new Map();
    this._cumulativeBundles = new Map();
  }

  registerConcept(name, level) { ... }
  getConceptLevel(name) { ... }
  addFact(fact) { ... }
  getFactsAtLevel(level) { ... }
  getFactsUpToLevel(maxLevel) { ... }
}
```

### 4.2 ComponentKB Integration

```javascript
// In component-kb.mjs
import { LevelManager, computeConstructivistLevel } from './constructivist-level.mjs';

export class ComponentKB {
  constructor(session) {
    this.levelManager = new LevelManager(session);
    this.useLevelOptimization = session?.useLevelOptimization ?? true;
    this._levelBundles = new Map();
    this._cumulativeBundles = new Map();
  }

  addFact(fact) {
    // ... existing logic ...
    if (this.useLevelOptimization) {
      entry.constructivistLevel = this.levelManager.addFact(entry);
    }
  }

  getConceptLevel(name) { ... }
  getFactsAtLevel(level) { ... }
  findByOperatorAtLevel(operator, maxLevel) { ... }
  getLevelBundle(level) { ... }
  getCumulativeBundle(maxLevel) { ... }
}
```

### 4.3 Forward Chaining Engine

```javascript
// In forward-chain.mjs
export class ForwardChainEngine {
  constructor(session) {
    this.session = session;
    this.derivedFacts = [];
    this.appliedRules = new Set();
  }

  /**
   * Run level-ordered forward chaining
   * Processes rules in level order: 0, 1, 2, ...
   * Ensures premises are always available before conclusions
   */
  forwardChain(options = {}) {
    const { maxIterations = 100, trackDerivations = false } = options;

    // Compute rule levels
    const rulesByLevel = new Map();
    for (const rule of this.session.rules) {
      const levels = computeRuleLevels(rule, conceptLevels);
      const concLevel = levels.conclusionLevel;
      if (!rulesByLevel.has(concLevel)) {
        rulesByLevel.set(concLevel, []);
      }
      rulesByLevel.get(concLevel).push(rule);
    }

    // Process level by level
    for (let level = 1; level <= maxLevel; level++) {
      for (const rule of rulesByLevel.get(level) || []) {
        // Check premises, derive conclusions
      }
    }

    return { derivedCount, iterations, derivations };
  }
}
```

### 4.4 Level-Aware Rule Index (Pending Fix)

```javascript
// In prove/rule-index.mjs
export class LevelAwareRuleIndex {
  constructor(session) {
    this._byOp = null;
    this._byLevel = null;
    this._byOpAndLevel = null;
  }

  getRulesByOp(op) { ... }
  getRulesByLevel(level) { ... }

  /**
   * Get rules that could prove a goal at given level
   * ISSUE: Does not account for variable instantiation
   */
  getRulesForGoal(op, goalLevel) {
    const candidates = this._byOp.get(op) || [];
    return candidates.filter(rule => {
      const premLevel = rule._maxPremLevel ?? 0;
      // BUG: premLevel is computed statically, ignoring variable bindings
      if (premLevel >= goalLevel) return false;
      return true;
    });
  }
}
```

---

## 5. Known Issue: Variable Instantiation

### 5.1 Problem Description

Static level computation fails for rules with variables:

```javascript
// Rule: Implies (And (isA ?x ?y) (hasProperty ?y ?p)) (hasProperty ?x ?p)
computeRuleLevels(rule, conceptLevels)
// Returns: { conclusionLevel: 1, maxPremiseLevel: 1 }
```

This is **incorrect**. Variables `?x`, `?y`, `?p` can be substituted with any concept:
- `?x` could be `GoldenRetriever` (level 3)
- `?y` could be `Dog` (level 2)
- `?p` could be `Living` (level 2)

The **actual** premise level after instantiation would be max(3, 2, 2) + 1 = 4, not 1.

### 5.2 Regression Evidence

| Metric | Before Optimization | With Optimization | After Disabling |
|--------|---------------------|-------------------|-----------------|
| Pass Rate | 99% (370/372) | 98% (367/372) | 99% (370/372) |
| Time | 321-507ms | 369-638ms | 326-499ms |

Three additional failures in deep chain reasoning.

### 5.3 Proposed Solution: Runtime Level Evaluation

Instead of static computation, evaluate rule applicability at runtime:

```javascript
// Proposed fix for getRulesForGoal
getRulesForGoal(op, goalLevel, goalArgs) {
  const candidates = this._byOp.get(op) || [];

  return candidates.filter(rule => {
    if (!rule.hasVariables) {
      // Ground rules: use static level
      return rule._maxPremLevel < goalLevel;
    }

    // Variable rules: compute instantiated level
    const bindings = unifyConclusion(rule.conclusionAST, goalArgs);
    if (!bindings) return false;

    const instantiatedPremLevel = computeInstantiatedPremiseLevel(
      rule.conditionAST,
      bindings,
      this.conceptLevels
    );

    return instantiatedPremLevel < goalLevel;
  });
}

function computeInstantiatedPremiseLevel(condAST, bindings, conceptLevels) {
  // Substitute variables with bound values
  // Compute level of instantiated condition
  let maxLevel = 0;
  for (const dep of extractDependencies(condAST)) {
    const resolvedDep = bindings.get(dep) || dep;
    maxLevel = Math.max(maxLevel, conceptLevels.get(resolvedDep) ?? 0);
  }
  return maxLevel + 1;
}
```

### 5.4 Alternative: Hybrid Approach

```javascript
// In tryRuleChainForCondition
let candidates;
if (useLevelOpt && goalLevel !== null) {
  // First pass: get rules by operator (no level filter)
  const allRules = this.levelRuleIndex.getRulesByOp(goalOp);

  // Second pass: filter by instantiated level at runtime
  candidates = allRules.filter(rule => {
    if (!rule.hasVariables) {
      return rule._maxPremLevel < goalLevel;
    }
    // Variable rules: defer level check to after unification
    return true; // Will be checked after binding
  });
} else {
  candidates = this.session.rules;
}
```

---

## 6. Current Implementation Status

### 6.1 What Works

| Component | Status | Notes |
|-----------|--------|-------|
| LevelManager | ✅ Active | Tracks concept/fact levels |
| computeConstructivistLevel | ✅ Active | Correct for ground facts |
| ComponentKB.addFact level tracking | ✅ Active | Assigns levels on insertion |
| getLevelBundle / getCumulativeBundle | ✅ Active | HDC bundles by level |
| ForwardChainEngine | ✅ Active | Level-ordered processing |
| LevelAwareRuleIndex | ⚠️ Built | Not used due to variable issue |

### 6.2 What's Disabled / Partially Enabled

```javascript
// kb-matching.mjs - tryDirectMatch
const useLevelOpt = false; // DISABLED

// kb-matching.mjs - tryRuleChainForCondition
// Still uses operator-indexed candidates; now applies premise-level pruning after unification.
candidates = this.engine.getRulesByConclusionOp(goalOp);

// query-hdc.mjs - searchHDC
// Enabled when session/useLevelOptimization is true (safe fallback to full bundle when needed)
const useLevelSearch = options.useLevelOptimization ?? (componentKB?.useLevelOptimization && session.useLevelOptimization !== false);
```

---

## 7. API Reference

### 7.1 LevelManager

```javascript
import { LevelManager } from './reasoning/constructivist-level.mjs';

const mgr = new LevelManager(session);

// Register primitive concepts
mgr.registerConcept('Animal', 0);
mgr.registerConcept('Dog', 1);

// Query levels
mgr.getConceptLevel('Dog'); // → 1

// Add fact and get its level
const level = mgr.addFact(factEntry); // Returns computed level

// Get facts by level
mgr.getFactsAtLevel(2); // → [facts at level 2]
mgr.getFactsUpToLevel(3); // → [facts at levels 0, 1, 2, 3]
```

### 7.2 ComponentKB Level Methods

```javascript
const kb = session.componentKB;

// Query concept level
kb.getConceptLevel('GoldenRetriever'); // → 3

// Get max level in KB
kb.getMaxLevel(); // → 3

// Get facts at/up to level
kb.getFactsAtLevel(2);
kb.getFactsUpToLevel(3);

// Level-constrained search
kb.findByOperatorAtLevel('isA', 2); // Facts with operator 'isA' at level <= 2

// HDC level bundles
kb.getLevelBundle(2);       // Bundle of level-2 facts only
kb.getCumulativeBundle(2);  // Bundle of levels 0, 1, 2
```

### 7.3 ForwardChainEngine

```javascript
import { ForwardChainEngine, createForwardChainEngine } from './reasoning/forward-chain.mjs';

const engine = createForwardChainEngine(session);

const result = engine.forwardChain({
  maxIterations: 100,    // Max derivation cycles
  maxLevel: Infinity,    // Max level to process
  stopOnNoChange: true,  // Stop when no new facts derived
  trackDerivations: true // Track derivation provenance
});

console.log(result.derivedCount);  // Number of new facts
console.log(result.iterations);    // Cycles performed
console.log(result.derivations);   // [{fact, rule, level, bindings}, ...]

// Reset for reuse
engine.reset();
```

---

## 8. Performance Characteristics

### 8.1 Memory Overhead

- **conceptLevels Map**: O(|concepts|) entries
- **levelIndex Map**: O(|levels|) entries, each with O(|facts at level|) refs
- **Level bundles**: O(|levels|) HDC vectors, lazily computed

### 8.2 Time Complexity

| Operation | Complexity |
|-----------|------------|
| addFact with level computation | O(|deps|) |
| getConceptLevel | O(1) |
| getFactsAtLevel | O(1) lookup + O(|facts|) iteration |
| getLevelBundle | O(|facts at level|) first time, O(1) cached |
| Forward chaining | O(|rules| × |levels| × |facts|) worst case |

### 8.3 Expected Optimization Gains (When Fixed)

- **Backward chaining**: 30-50% search space reduction for deep hierarchies
- **HDC search**: Early termination on high-confidence matches at lower levels
- **Forward chaining**: Guaranteed premise availability, natural termination

---

## 9. Future Work

### 9.1 Short Term

1. **Implement runtime level evaluation** for variable rules (Section 5.3)
2. **Re-enable backward chaining optimization** after fix
3. **Add level statistics** to reasoning metrics

### 9.2 Medium Term

1. **Level-aware HDC search** with progressive refinement
2. **Incremental level updates** on fact retraction
3. **Level caching** for repeated queries

### 9.3 Long Term

1. **Automated level hierarchy visualization**
2. **Level-based KB partitioning** for distributed reasoning
3. **Confidence decay by level distance**

---

## 10. Files Modified/Created

| File | Change | Description |
|------|--------|-------------|
| `src/reasoning/constructivist-level.mjs` | NEW | LevelManager, level computation functions |
| `src/reasoning/forward-chain.mjs` | NEW | ForwardChainEngine |
| `src/reasoning/component-kb.mjs` | MOD | Level tracking integration |
| `src/reasoning/prove/rule-index.mjs` | MOD | LevelAwareRuleIndex (pending use) |
| `src/reasoning/kb-matching.mjs` | MOD | Level optimization hooks (disabled) |
| `src/reasoning/query-hdc.mjs` | MOD | Level search hooks (disabled) |
| `src/reasoning/index.mjs` | MOD | New exports |

---

## 11. References

- DS05-Basic-Reasoning-Engine.md - Backward chaining foundation
- DS06-Advanced-Reasoning.md - Rule processing
- DS09-Core-HDC-Implementation.md - HDC operations
- DS17-Holographic-Priority-Mode.md - HDC-first reasoning

---

## Appendix A: Test Results

### A.1 Baseline (Pre-Implementation)
```
Pass Rate: 99% (370/372)
Time: 321-507ms
```

### A.2 With Level Optimization Enabled
```
Pass Rate: 98% (367/372)  [-3 tests]
Time: 369-638ms           [+15-26% slower]
```

### A.3 With Level Optimization Disabled (Current)
```
Pass Rate: 99% (370/372)  [baseline restored]
Time: 326-499ms           [baseline restored]
```

### A.4 Unit Tests
```
Tests: 675
Pass: 669
Fail: 1 (pre-existing: quantifiers-exists type disjointness)
```
