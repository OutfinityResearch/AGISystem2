# Constructivist Level Optimization Proposal

**Document Version:** 1.0
**Status:** Proposal
**Date:** 2025-12-25

---

## Executive Summary

This document proposes a fundamental optimization to AGISystem2's reasoning engines based on **Constructivist Levels** - a hierarchical ordering of concepts where each concept at level N can only be built from concepts at levels strictly less than N. This creates a DAG (Directed Acyclic Graph) structure that enables significant search space pruning.

**Expected Benefits:**
- 30-50% reduction in backward chaining search space
- Guaranteed cycle prevention (no circular definitions possible)
- Level-based KB bundling for faster HDC search
- Natural ordering for forward chaining

---

## 1. Theoretical Foundation

### 1.1 Constructivist Level Definition

```
Level(concept) =
  0                                      if concept is a primitive atom
  1 + max(Level(d) for d in deps(concept))  otherwise
```

Where `deps(concept)` returns all concepts that `concept` directly references.

### 1.2 Core Invariant

**Strict Dependency Rule:**
```
∀ fact F at level N:
  ∀ concept C referenced by F:
    Level(C) < N
```

This ensures:
1. No circular dependencies (impossible by construction)
2. Foundational concepts (level 0) have no dependencies
3. Higher-level concepts are built strictly from lower-level ones

### 1.3 Examples

```
# Level 0: Primitives (atoms, built-in operators)
Animal        → Level 0 (primitive atom)
Dog           → Level 0 (primitive atom)
isA           → Level 0 (primitive operator)

# Level 1: Direct facts using only primitives
isA Dog Animal                → Level 1 (uses Dog:0, Animal:0, isA:0)
isA Cat Animal                → Level 1

# Level 2: Facts referencing level 1
canBark Dog                   → Level 2 (uses Dog:0, canBark:0)
Implies (isA ?x Dog) (canBark ?x)  → Level 2 (rule)

# Level 3: Facts using level 2 concepts or rules
@noisyAnimal Or (canBark ?x) (canMeow ?x)  → Level 3
```

### 1.4 Relation to Existing Abstraction Levels

Current L0/L1/L2/L3+ levels are **semantic categories** (runtime/structural/semantic/domain), while Constructivist Levels are **dependency depths**. They are orthogonal:

| Concept | Abstraction Level | Constructivist Level |
|---------|-------------------|---------------------|
| `___Bind` | L0 (HDC primitive) | 0 |
| `__Atom` | L1 (structural) | 0 |
| `isA` | L2 (semantic) | 0 |
| `isA Dog Animal` | L3 (domain) | 1 |
| `canBark Dog` | L3 (domain) | 2 (if defined after Dog) |
| Rule using above | L3 (domain) | 3 |

---

## 2. Current System Analysis

### 2.1 Existing KB Structure (ComponentKB)

```javascript
// Current indices in component-kb.mjs
facts[]              // Array of fact objects
operatorIndex        // Map<operatorName, [factIds]>
arg0Index            // Map<argName, [factIds]>
arg1Index            // Map<argName, [factIds]>
operatorVectors      // HDC vectors for operators
argVectors           // HDC vectors for arguments
```

**Gap:** No level-based indexing exists.

### 2.2 Current Search Flow

```
prove(goal) →
  proveGoal(goal, depth) →
    tryDirectMatch()      // Scans ALL facts with operator
    tryTransitiveChains() // Scans ALL isA facts
    tryRuleMatch()        // Scans ALL rules by conclusion op
```

**Problem:** Each search phase potentially scans facts at ALL constructivist levels, even when the goal's level constrains what's possible.

### 2.3 Current HDC Search

```javascript
// query-hdc.mjs - Master Equation
KB_bundle = bundle(ALL_facts)  // Single monolithic bundle
answer = unbind(KB_bundle, query)
```

**Problem:** Monolithic KB bundle doesn't leverage level structure.

---

## 3. Proposed Optimization

### 3.1 Level-Indexed KB Structure

```javascript
// Enhanced ComponentKB
class ComponentKB {
  // Existing indices...

  // NEW: Level-based indices
  levelIndex: Map<number, Set<factId>>      // Facts by level
  maxLevel: number                           // Highest level in KB
  conceptLevels: Map<conceptName, number>    // Level of each concept

  // NEW: Level-segmented HDC bundles
  levelBundles: Map<number, Vector>          // KB bundle per level
  cumulativeBundles: Map<number, Vector>     // Bundle of levels 0..N
}
```

### 3.2 Level Computation Algorithm

```javascript
function computeConstructivistLevel(fact, kb) {
  const deps = extractDependencies(fact);  // operator + all args

  if (deps.length === 0) return 0;

  let maxDepLevel = 0;
  for (const dep of deps) {
    const depLevel = kb.conceptLevels.get(dep) ?? 0;
    maxDepLevel = Math.max(maxDepLevel, depLevel);
  }

  return maxDepLevel + 1;
}

function extractDependencies(fact) {
  const deps = new Set();

  // Add operator
  if (fact.operator) deps.add(fact.operator);

  // Add arguments (recursively for compound expressions)
  for (const arg of fact.args || []) {
    if (typeof arg === 'string' && !arg.startsWith('?')) {
      deps.add(arg);
    } else if (arg.operator) {
      // Compound expression - add all its deps
      for (const d of extractDependencies(arg)) {
        deps.add(d);
      }
    }
  }

  return [...deps];
}
```

### 3.3 Optimized Backward Chaining

```javascript
// prove/prove-goal.mjs - OPTIMIZED
async function proveGoal(goal, depth, options) {
  const goalLevel = computeGoalLevel(goal, kb);

  // OPTIMIZATION 1: Only search facts at goal's level
  const candidateFacts = kb.getFactsAtLevel(goalLevel);

  // OPTIMIZATION 2: Only consider rules that could produce this level
  const candidateRules = kb.getRulesWithConclusionAtLevel(goalLevel);

  // OPTIMIZATION 3: For transitive chains, stop at level boundaries
  const transitiveResult = await tryTransitiveChains(goal, {
    maxLevel: goalLevel  // Don't follow chains to higher levels
  });

  // ... rest of proof logic
}

// Rule matching with level constraints
function tryRuleMatch(goal, goalLevel) {
  // Only rules where:
  // 1. Conclusion level = goalLevel
  // 2. All premise levels < goalLevel
  const rules = kb.getRulesByConclusionLevel(goalLevel);

  for (const rule of rules) {
    // Skip rules with premises at same or higher level (impossible to satisfy)
    if (rule.maxPremiseLevel >= goalLevel) continue;

    // Proceed with unification and recursive proof
    // ...
  }
}
```

### 3.4 Optimized HDC Search

```javascript
// query-hdc.mjs - OPTIMIZED
async function searchHDC(query, session) {
  const queryLevel = computeQueryLevel(query, kb);

  // OPTIMIZATION: Search level-by-level, starting from lowest
  for (let level = 0; level <= queryLevel; level++) {
    // Use cumulative bundle up to this level
    const kbBundle = kb.getCumulativeBundle(level);

    const candidate = unbind(kbBundle, queryVector);
    const matches = topKSimilar(candidate, vocabulary, K);

    // Early termination if high-confidence match found
    if (matches[0]?.similarity > HDC_MATCH_HIGH) {
      return verifyAndReturn(matches);
    }
  }

  // Full KB search as fallback
  return searchFullKB(query, session);
}
```

### 3.5 Level-Aware Rule Index

```javascript
// prove/rule-index.mjs - ENHANCED
class RuleIndex {
  // Existing: Map<conclusionOp, [rules]>
  byConclusionOp: Map<string, Rule[]>

  // NEW: Additional indices
  byConclusionLevel: Map<number, Rule[]>
  byMaxPremiseLevel: Map<number, Rule[]>

  buildIndex(rules, kb) {
    for (const rule of rules) {
      const concLevel = kb.getConceptLevel(rule.conclusion);
      const premiseLevel = this.computeMaxPremiseLevel(rule, kb);

      // Index by conclusion level
      this.addToIndex(this.byConclusionLevel, concLevel, rule);

      // Index by max premise level (for forward chaining)
      this.addToIndex(this.byMaxPremiseLevel, premiseLevel, rule);

      // Store metadata on rule
      rule._concLevel = concLevel;
      rule._maxPremLevel = premiseLevel;
    }
  }
}
```

---

## 4. Additional Optimization Opportunities

### 4.1 Forward Chaining by Level

Currently not implemented, but level-based KB enables efficient forward chaining:

```javascript
async function forwardChain(session, maxIterations = 100) {
  const kb = session.kb;
  let changed = true;
  let iterations = 0;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Process rules in order of their conclusion level
    for (let level = 1; level <= kb.maxLevel + 1; level++) {
      const rules = kb.getRulesByConclusionLevel(level);

      for (const rule of rules) {
        // All premises are at lower levels, so they're already computed
        if (allPremisesSatisfied(rule, kb)) {
          const newFact = deriveConclusion(rule, kb);
          if (!kb.contains(newFact)) {
            kb.add(newFact);  // Automatically gets level = rule._concLevel
            changed = true;
          }
        }
      }
    }
  }

  return { iterations, newFacts: kb.facts.length };
}
```

**Benefit:** Guaranteed single-pass derivation for each level.

### 4.2 Parallel Level Processing

Facts at the same level are independent (no circular deps), enabling parallel processing:

```javascript
async function parallelQuery(goals, session) {
  // Group goals by level
  const byLevel = groupBy(goals, g => computeGoalLevel(g, session.kb));

  const results = new Map();

  // Process levels sequentially (lower first)
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    const levelGoals = byLevel.get(level);

    // Process goals within a level in parallel
    const levelResults = await Promise.all(
      levelGoals.map(g => prove(g, session))
    );

    levelResults.forEach((r, i) => results.set(levelGoals[i], r));
  }

  return results;
}
```

### 4.3 Incremental Bundle Updates

When adding facts, only update affected level bundles:

```javascript
// component-kb.mjs - Incremental update
addFact(fact) {
  const level = computeConstructivistLevel(fact, this);

  // Add to indices
  this.facts.push(fact);
  this.levelIndex.get(level).add(factId);

  // Update only affected bundles
  const factVector = this.computeFactVector(fact);
  this.levelBundles.set(level,
    bundle([this.levelBundles.get(level), factVector])
  );

  // Invalidate cumulative bundles for this level and above
  for (let l = level; l <= this.maxLevel; l++) {
    this.cumulativeBundles.delete(l);
  }
}
```

### 4.4 Proof Pruning via Level Bounds

```javascript
// prove-goal.mjs - Enhanced pruning
function canPossiblyProve(goal, kb, currentDepth) {
  const goalLevel = computeGoalLevel(goal, kb);

  // If goal level > max KB level, impossible to prove
  if (goalLevel > kb.maxLevel) {
    return { possible: false, reason: 'goal_level_exceeds_kb' };
  }

  // If goal level = 0 and not in KB, impossible (primitives must exist)
  if (goalLevel === 0 && !kb.hasPrimitive(goal.operator)) {
    return { possible: false, reason: 'missing_primitive' };
  }

  return { possible: true };
}
```

### 4.5 CSP Optimization

Level information can improve CSP variable ordering:

```javascript
// csp-hdc-heuristic.mjs - Level-based variable ordering
function selectNextVariable(unassigned, kb) {
  // Prefer variables constrained by lower-level concepts
  // (more foundational, likely fewer valid values)
  return unassigned.sort((a, b) => {
    const levelA = kb.getConstraintLevel(a);
    const levelB = kb.getConstraintLevel(b);
    return levelA - levelB;  // Lower level first
  })[0];
}
```

---

## 5. Implementation Plan

### Phase 1: Core Level Infrastructure (2-3 )

**Files to modify:**
- `src/reasoning/component-kb.mjs` - Add level tracking
- `src/runtime/session.mjs` - Initialize level indices
- `src/nlp/nl2dsl.mjs` - Compute levels on fact creation

**Tasks:**
1. Add `conceptLevels: Map<string, number>` to ComponentKB
2. Add `levelIndex: Map<number, Set<factId>>` to ComponentKB
3. Implement `computeConstructivistLevel(fact, kb)`
4. Update `addFact()` to compute and store levels
5. Add `getFactsAtLevel(n)` and `getFactsUpToLevel(n)` methods
6. Add unit tests for level computation

### Phase 2: HDC Level Bundles 

**Files to modify:**
- `src/reasoning/component-kb.mjs` - Level-segmented bundles
- `src/reasoning/query-hdc.mjs` - Level-based search

**Tasks:**
1. Add `levelBundles: Map<number, Vector>` to ComponentKB
2. Add `getCumulativeBundle(maxLevel)` method
3. Update `buildKBBundle()` to create level bundles
4. Modify HDC search to use level-progressive search
5. Add benchmarks comparing monolithic vs level-based search

### Phase 3: Backward Chaining Optimization 

**Files to modify:**
- `src/reasoning/prove/prove-goal.mjs` - Level-aware proving
- `src/reasoning/prove/rule-index.mjs` - Level-based rule index
- `src/reasoning/kb-matching.mjs` - Level-constrained matching

**Tasks:**
1. Enhance RuleIndex with `byConclusionLevel` index
2. Compute and cache `rule._concLevel` and `rule._maxPremLevel`
3. Add `computeGoalLevel(goal, kb)` function
4. Modify `proveGoal()` to use level constraints
5. Add level-based pruning in `tryRuleMatch()`
6. Update transitive chain search with level bounds
7. Add benchmarks for proof search reduction

### Phase 4: Forward Chaining 

**Files to create:**
- `src/reasoning/forward-chain.mjs` - New forward chainer

**Tasks:**
1. Implement level-ordered forward chaining
2. Add `session.forwardChain()` API
3. Add incremental forward chaining (trigger on fact addition)
4. Add tests and benchmarks

### Phase 5: Integration and Testing 

**Tasks:**
1. Update existing tests to verify level computation
2. Add comprehensive benchmarks
3. Create documentation for constructivist levels
4. Profile and tune thresholds
5. Update spec documents (DS02, DS07)

---

## 6. API Changes

### 6.1 New Session Methods

```javascript
// Get constructivist level of a concept
session.getConceptLevel(conceptName: string): number

// Get all facts at a specific level
session.getFactsAtLevel(level: number): Fact[]

// Get KB statistics by level
session.getLevelStatistics(): {
  maxLevel: number,
  factsByLevel: Map<number, number>,
  rulesByLevel: Map<number, number>
}

// Forward chaining (new)
session.forwardChain(options?: {
  maxIterations?: number,
  maxLevel?: number
}): { iterations: number, newFacts: number }
```

### 6.2 Fact Metadata Extension

```javascript
// Fact object enhanced with level
{
  id: string,
  vector: Vector,
  metadata: {
    operator: string,
    args: string[],
    constructivistLevel: number,  // NEW
    // ... existing fields
  }
}
```

### 6.3 Configuration Options

```javascript
// session options
{
  reasoning: {
    useLevelOptimization: true,        // Enable level-based pruning
    levelProgressiveHDC: true,         // Search HDC by level
    maxConstructivistLevel: 100,       // Limit for level computation
    parallelLevelProcessing: false,    // Enable parallel within-level
  }
}
```

---

## 7. Expected Performance Impact

### 7.1 Search Space Reduction

| Scenario | Current | With Levels | Reduction |
|----------|---------|-------------|-----------|
| Direct KB match | O(n) | O(n/L) | L× where L = avg levels |
| Rule matching | O(r) | O(r/L) | L× |
| Transitive chains | O(n²) | O((n/L)²) | L²× |
| HDC search | O(n) | O(n/L) early-term | Up to L× |

### 7.2 Memory Overhead

| Structure | Additional Memory |
|-----------|-------------------|
| conceptLevels Map | O(vocabulary size) × 8 bytes |
| levelIndex | O(facts) × 8 bytes |
| levelBundles | O(L) × vector_size |
| Rule level cache | O(rules) × 16 bytes |

**Estimated overhead:** ~5-10% additional memory for 10× potential speedup.

### 7.3 Computation Overhead

| Operation | Overhead |
|-----------|----------|
| Fact addition | +O(deps) for level computation |
| Bundle update | +O(1) per affected level |
| Query setup | +O(query_size) for level estimation |

**Amortized:** Level computation is one-time per fact; benefits compound with KB size.

---

## 8. Risks and Mitigations

### 8.1 Risk: Incorrect Level Assignment

**Cause:** Missing dependencies, dynamic concept creation
**Mitigation:** Validate levels on query (assert deps have lower levels)

### 8.2 Risk: Level Explosion

**Cause:** Very deep dependency chains
**Mitigation:** Cap at `maxConstructivistLevel`, flatten beyond threshold

### 8.3 Risk: Incremental Update Complexity

**Cause:** Adding fact may require level recalculation
**Mitigation:** Levels are stable (deps don't change), only new facts need computation

### 8.4 Risk: Breaking Existing Tests

**Cause:** Level-based pruning may change proof order
**Mitigation:** Ensure semantic equivalence, update tests for new proof traces

---

## 9. Success Metrics

1. **Proof Search Reduction:** Measure average facts/rules scanned per proof
2. **Query Latency:** Measure p50/p95 query times before/after
3. **HDC Early Termination:** Measure % of queries resolved at lower levels
4. **Memory Efficiency:** Measure KB memory per fact before/after
5. **Benchmark Suite:** Run LogiGlue/ProntoQA with and without optimization

---

## 10. Conclusion

The Constructivist Level optimization leverages the inherent hierarchical structure of knowledge to prune search spaces in both symbolic and holographic reasoning. By ensuring concepts at level N only reference concepts at levels < N, we create a DAG structure that:

1. **Prevents cycles** by construction (no circular definitions possible)
2. **Enables level-based search** (start from foundations, work up)
3. **Supports parallel processing** (facts at same level are independent)
4. **Accelerates HDC search** (level-segmented bundles, early termination)

The implementation is non-breaking (existing code continues to work), incremental (can be enabled/disabled), and provides measurable performance benefits for large knowledge bases.

**Recommendation:** Proceed with Phase 1-2 implementation and benchmark before committing to full rollout.

---

## Appendix A: Benchmark Queries

```javascript
// Stress test: Deep transitive chain
isA Socrates Human
isA Human Mammal
isA Mammal Animal
isA Animal LivingThing
isA LivingThing Thing
// Query: isA Socrates Thing (should use level bounds)

// Stress test: Wide rule base
// 1000 rules with varying conclusion operators
// Query: prove goal matching 1 rule
// Expected: Level index reduces scan from 1000 to ~100

// Stress test: Multi-hole HDC query
sell ?who ?what ?to
// With 10000 facts, level-progressive search should find matches faster
```

## Appendix B: Related Work

- **Stratification in Datalog:** Similar concept of level-based rule evaluation
- **Topological Sort in DAG:** Standard algorithm for level computation
- **Dependency Graphs in Build Systems:** Same principle (Makefile, Bazel)
- **Type Levels in Dependent Type Theory:** Conceptually similar hierarchy

---

*End of Proposal*
