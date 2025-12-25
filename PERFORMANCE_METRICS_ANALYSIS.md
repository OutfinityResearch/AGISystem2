# AGISystem2 Performance Metrics Analysis

## Executive Summary

This document identifies **heavy/expensive operations** in the AGISystem2 reasoning engines that are **NOT currently tracked** but **SHOULD be** for comprehensive performance analysis.

**Currently Tracked Metrics** (in `/home/salboaie/work/AGISystem2/src/runtime/session.mjs`):
- `queries` - Total query count
- `proofs` - Total proof attempts
- `kbScans` - Knowledge base fact scans
- `similarityChecks` - Vector similarity computations
- `ruleAttempts` - Rule application attempts
- `transitiveSteps` - Transitive reasoning steps
- `maxProofDepth` / `minProofDepth` - Proof depth bounds
- `totalProofSteps` - Successful proof steps
- `totalReasoningSteps` - All reasoning attempts (with backtracking)
- `hdcQueries` / `hdcSuccesses` / `hdcBindings` - HDC-specific metrics
- `methods` / `operations` - Generic operation tracking

---

## 1. Vector Operations (HDC Core Operations)

### 1.1 bind() Calls
**Location**: Used throughout reasoning engines
**Files**:
- `/home/salboaie/work/AGISystem2/src/runtime/session.mjs:271, 287`
- `/home/salboaie/work/AGISystem2/src/runtime/executor-solve.mjs:111, 128-129`
- `/home/salboaie/work/AGISystem2/src/runtime/executor-meta-ops.mjs:76, 81`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:184, 435`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-compound.mjs:55 (nested)`

**Frequency**: Very high - called for every query, fact encoding, position binding
**Currently Tracked**: ❌ NO
**Estimated Cost**: Medium-High (O(d) where d=dimension, but frequent)

**Recommendation**:
- **Metric Name**: `hdcBindOperations`
- **Description**: Count of bind() operations (XOR/binding in vector space)
- **Tracking Location**: In `hdc/facade.mjs:bind()` or at call sites
- **Why Important**: Bind is the fundamental operation for compositional encoding; high counts may indicate inefficient encoding strategies

---

### 1.2 bundle() Calls
**Location**: Fact aggregation, level bundles, CSP solutions
**Files**:
- `/home/salboaie/work/AGISystem2/src/runtime/session.mjs:271, 287`
- `/home/salboaie/work/AGISystem2/src/runtime/executor-solve.mjs:129`
- `/home/salboaie/work/AGISystem2/src/reasoning/component-kb.mjs:538, 566`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:208`

**Frequency**: Medium - called during KB bundling, level computation, compound queries
**Currently Tracked**: ❌ NO
**Estimated Cost**: High (O(n*d) where n=vectors, d=dimension)

**Recommendation**:
- **Metric Name**: `hdcBundleOperations`
- **Description**: Count of bundle() operations (superposition/majority sum)
- **Sub-metrics**:
  - `bundleVectorCount` - Total vectors bundled
  - `maxBundleSize` - Largest single bundle operation
- **Why Important**: Bundle operations are expensive (O(n*d)); tracking helps identify bottlenecks in KB reorganization

---

### 1.3 unbind() Calls
**Location**: Query answering, pattern extraction
**Files**:
- `/home/salboaie/work/AGISystem2/src/core/position.mjs:87`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:212, 218, 260, 364-365, 416, 421`
- `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs:225`

**Frequency**: Medium-High - called during HDC Master Equation queries
**Currently Tracked**: ❌ NO
**Estimated Cost**: Medium (same as bind, O(d))

**Recommendation**:
- **Metric Name**: `hdcUnbindOperations`
- **Description**: Count of unbind() operations (inverse binding)
- **Why Important**: Core to HDC query answering; high counts indicate complex query patterns

---

### 1.4 topKSimilar() Calls
**Location**: Vocabulary searches, candidate generation
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/query-hdc.mjs:221, 261, 366, 422`
- `/home/salboaie/work/AGISystem2/src/reasoning/holographic/query-hdc-first.mjs:229`

**Frequency**: Medium - called per hole in queries
**Currently Tracked**: ❌ NO (only individual `similarityChecks` tracked)
**Estimated Cost**: Very High (O(V*d) where V=vocabulary size, d=dimension)

**Recommendation**:
- **Metric Name**: `topKSimilarSearches`
- **Sub-metrics**:
  - `topKVocabSize` - Total vocabulary entries scanned
  - `topKCandidatesRequested` - Sum of K values across all searches
- **Why Important**: Most expensive operation in HDC queries; scales with vocabulary size; critical bottleneck

---

## 2. Graph Traversal Operations

### 2.1 Transitive Relation BFS/DFS
**Location**: Transitive reasoning chains (isA, locatedIn, partOf)
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/transitive.mjs:241-260` - `findAllTransitiveTargets()`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-transitive.mjs:151-230`
- `/home/salboaie/work/AGISystem2/src/reasoning/find-all.mjs:133-230`

**Frequency**: High - called for inheritance, type checking, spatial reasoning
**Currently Tracked**: Partial - `transitiveSteps` counts steps, but not:
- Queue size / nodes explored
- Graph depth reached
- Cycles detected

**Recommendation**:
- **Metric Name**: `transitiveGraphTraversals`
- **Sub-metrics**:
  - `transitiveNodesExplored` - Total BFS/DFS nodes visited
  - `transitiveMaxDepth` - Deepest chain found
  - `transitiveCyclesDetected` - Number of cycles avoided
- **Why Important**: Can explode with dense graphs; tracks reasoning complexity

---

### 2.2 Property Inheritance Graph Traversal
**Location**: Property inheritance via isA chains
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/property-inheritance.mjs:140-197`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-inheritance.mjs:51-350`

**Frequency**: Medium - triggered by `has` queries
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `inheritanceTraversals`
- **Sub-metrics**:
  - `inheritancePathsExplored` - BFS paths traversed
  - `inheritanceMaxDepth` - Deepest inheritance chain
- **Why Important**: Inheritance can trigger cascading KB scans; expensive in deep hierarchies

---

### 2.3 Planning Search (A* / Forward Search)
**Location**: Planning solver state-space search
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/planning/solver.mjs:377-410`

**Frequency**: Low (only when planning invoked)
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `planningSearchStats`
- **Sub-metrics**:
  - `planningNodesExpanded` - State nodes explored
  - `planningMaxDepth` - Plan depth limit reached
  - `planningStatesGenerated` - Total states generated
- **Why Important**: Planning is NP-hard; can timeout; critical for diagnostics

---

## 3. Rule Matching & Unification

### 3.1 Unification Attempts
**Location**: Rule backward chaining with variable binding
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/unification.mjs:38-130` - `tryUnification()`
- `/home/salboaie/work/AGISystem2/src/reasoning/abduction.mjs:145-180` - `tryUnify()`
- `/home/salboaie/work/AGISystem2/src/reasoning/kb-matching.mjs:471-473`

**Frequency**: High - called for every rule with variables
**Currently Tracked**: Partial - `ruleAttempts` counts attempts, but not:
- Unification successes vs failures
- Binding set sizes
- AST traversal depth

**Recommendation**:
- **Metric Name**: `unificationAttempts`
- **Sub-metrics**:
  - `unificationSuccesses` - Successful unifications
  - `unificationBindingsCreated` - Total variable bindings created
  - `unificationASTNodesTraversed` - AST nodes visited during matching
- **Why Important**: Unification is expensive (AST traversal + binding checks); high failure rates indicate poor rule indexing

---

### 3.2 Pattern Matching (findAllFactMatches)
**Location**: KB pattern search for condition proving
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/kb-matching.mjs:149-264` - `findAllFactMatches()`
- `/home/salboaie/work/AGISystem2/src/reasoning/conditions/instantiated.mjs:126-310`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-rules.mjs:287-380`

**Frequency**: Very High - called for every rule condition
**Currently Tracked**: Partial - `kbScans` counts fact scans, but not:
- Pattern complexity (number of variables)
- Backtracking iterations
- Domain generation for variables

**Recommendation**:
- **Metric Name**: `patternMatchAttempts`
- **Sub-metrics**:
  - `patternMatchVariables` - Total variables in patterns
  - `patternMatchBacktracks` - Backtracking steps
  - `patternMatchDomainSize` - Sum of domain sizes for unbound vars
- **Why Important**: Pattern matching dominates rule proving; tracks combinatorial explosion

---

### 3.3 Rule Condition Proving (Recursive)
**Location**: Recursive condition proving in rules
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/conditions/rule-conditions.mjs:17-81`
- `/home/salboaie/work/AGISystem2/src/reasoning/conditions/instantiated.mjs:16-310`
- `/home/salboaie/work/AGISystem2/src/reasoning/conditions/single.mjs:63-231`

**Frequency**: Very High - recursive, depth-limited
**Currently Tracked**: Partial - `maxDepth` limits exist, but not:
- Condition proving recursion depth
- And/Or branch exploration
- Exists/ForAll quantifier instantiations

**Recommendation**:
- **Metric Name**: `conditionProvingStats`
- **Sub-metrics**:
  - `conditionRecursionDepth` - Max recursion depth reached
  - `conditionAndBranches` - And-condition branches explored
  - `conditionOrBranches` - Or-condition branches explored
  - `quantifierInstantiations` - Exists/ForAll variable instantiations
- **Why Important**: Recursive condition proving is core to backward chaining; expensive with deep rule chains

---

## 4. CSP (Constraint Satisfaction Problem) Operations

### 4.1 Backtracking Steps
**Location**: CSP solver backtracking search
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/csp/backtrack.mjs:56-116`

**Frequency**: Medium (only during CSP solving)
**Currently Tracked**: ⚠️ Partial - Tracked in `BacktrackSearch.stats`, but NOT exposed to session stats:
- `nodesExplored` (line 67)
- `backtracks` (line 110)
- `pruned` (line 104)

**Recommendation**:
- **Metric Name**: `cspBacktrackStats` (expose existing internal stats)
- **Sub-metrics**:
  - `cspNodesExplored` - Search nodes explored
  - `cspBacktracks` - Backtrack operations
  - `cspPruned` - Forward-checking prunings
  - `cspConstraintChecks` - Constraint satisfaction checks
- **Why Important**: CSP solving is exponential; backtrack counts indicate search efficiency

---

### 4.2 Constraint Propagation
**Location**: Forward checking, arc consistency
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/csp/backtrack.mjs:161-206` - `forwardCheck()`
- `/home/salboaie/work/AGISystem2/src/reasoning/csp/constraint.mjs:20-85` - `isSatisfied()`

**Frequency**: Very High during CSP
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `cspConstraintPropagations`
- **Sub-metrics**:
  - `cspDomainReductions` - Domain values pruned
  - `cspConstraintEvaluations` - Total constraint checks
- **Why Important**: Constraint propagation is the core CSP expense; high counts indicate poor heuristics

---

## 5. Cache & Index Operations

### 5.1 Vocabulary Lookups (getOrCreate)
**Location**: Atom vector creation/retrieval
**Files**:
- `/home/salboaie/work/AGISystem2/src/runtime/vocabulary.mjs:30-44`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-compound.mjs:50-52, 93, 144, 204`

**Frequency**: Very High - called for every token
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `vocabularyLookups`
- **Sub-metrics**:
  - `vocabularyHits` - Existing atoms retrieved
  - `vocabularyMisses` - New atoms created
  - `vocabularyCacheSize` - Current vocabulary size
- **Why Important**: Vocabulary growth impacts memory and search costs; cache hit rate indicates reuse

---

### 5.2 ComponentKB Index Lookups
**Location**: Fast fact retrieval by operator/args
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/component-kb.mjs:244-327`

**Frequency**: Very High - used to avoid full KB scans
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `componentKBIndexHits`
- **Sub-metrics**:
  - `indexLookupsByOperator` - Operator index queries
  - `indexLookupsByArg0` - Arg0 index queries
  - `indexHitRate` - Ratio of indexed vs full scans
- **Why Important**: Index effectiveness determines KB scan performance; low hit rates indicate missing indices

---

### 5.3 Level Bundle Computations
**Location**: Constructivist level bundle caching
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/component-kb.mjs:509-566`
- `/home/salboaie/work/AGISystem2/src/reasoning/constructivist-level.mjs:243-300`

**Frequency**: Medium - cached but recomputed on KB changes
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `levelBundleComputations`
- **Sub-metrics**:
  - `levelBundleRebuilds` - Cache invalidations
  - `levelBundleSize` - Vectors per level
- **Why Important**: Bundle recomputation is expensive (O(n*d)); frequent rebuilds indicate inefficient KB updates

---

## 6. Recursive Operations & Depth Limits

### 6.1 Proof Recursion Depth
**Location**: Recursive proof attempts
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/prove/prove-goal.mjs:27-31`
- `/home/salboaie/work/AGISystem2/src/reasoning/transitive.mjs:145-146`
- `/home/salboaie/work/AGISystem2/src/reasoning/inverse.mjs:49`

**Frequency**: Very High
**Currently Tracked**: Partial - `maxProofDepth` / `minProofDepth`, but not:
- Average recursion depth
- Depth limit hits
- Depth distribution

**Recommendation**:
- **Metric Name**: `proofRecursionStats`
- **Sub-metrics**:
  - `avgProofRecursionDepth` - Mean recursion depth
  - `proofDepthLimitHits` - Times depth limit reached
  - `proofDepthDistribution` - Histogram of depths
- **Why Important**: Depth limits are safety mechanisms; frequent hits indicate infinite loops or missing base cases

---

### 6.2 Rule Chain Depth
**Location**: Backward chaining rule applications
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/kb-matching.mjs:272-324` - `tryRuleChainForCondition()`
- `/home/salboaie/work/AGISystem2/src/reasoning/conditions/rule-conditions.mjs:17-22`

**Frequency**: High
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `ruleChainDepth`
- **Sub-metrics**:
  - `maxRuleChainDepth` - Deepest rule chain
  - `avgRuleChainDepth` - Mean chain length
- **Why Important**: Long rule chains are expensive; indicate complex reasoning or redundant rules

---

## 7. Iteration & Loop Operations

### 7.1 While Loop Iterations with Depth Limits
**Location**: Various bounded loops
**Files**:
- `/home/salboaie/work/AGISystem2/src/parser/parser.mjs:49-51` - Parser safety limit
- `/home/salboaie/work/AGISystem2/src/reasoning/find-all.mjs:58, 165, 196` - Result enumeration
- `/home/salboaie/work/AGISystem2/src/reasoning/query-transitive.mjs:172, 218` - BFS queues

**Frequency**: High
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `boundedLoopIterations`
- **Sub-metrics**:
  - `loopSafetyLimitHits` - Times iteration limits hit
  - `loopMaxIterations` - Largest loop iteration count
- **Why Important**: Iteration limits prevent infinite loops; hits indicate performance issues or bugs

---

### 7.2 Array Operations (map/filter/reduce)
**Location**: Throughout reasoning engines
**Files**: 601 occurrences across 48 files

**Frequency**: Extremely High
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `arrayOperationStats`
- **Sub-metrics**:
  - `largeArrayOps` - Operations on arrays >1000 elements
  - `totalArrayElementsProcessed` - Sum of array.length for all ops
- **Why Important**: Array operations dominate CPU in symbolic reasoning; tracks data structure efficiency

---

## 8. Holographic-Specific Operations

### 8.1 HDC Direct Search
**Location**: HDC-first proof strategy
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:235-302`

**Frequency**: High (when holographic mode enabled)
**Currently Tracked**: Partial - `holographicProofs`, `hdcProofSuccesses`, `symbolicProofFallbacks` exist but not exposed in default stats

**Recommendation**:
- **Metric Name**: Expose existing stats in session:
  - `holographicProofs` - Total HDC-first proof attempts
  - `hdcProofSuccesses` - Successful HDC proofs
  - `symbolicProofFallbacks` - Fallbacks to symbolic
- **Why Important**: Measures HDC effectiveness vs symbolic reasoning

---

### 8.2 Synonym Expansion
**Location**: ComponentKB synonym-aware matching
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/component-kb.mjs:140-198, 395-420`
- `/home/salboaie/work/AGISystem2/src/reasoning/holographic/prove-hdc-first.mjs:262-276`

**Frequency**: Medium
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `synonymExpansions`
- **Sub-metrics**:
  - `synonymLookups` - Synonym map queries
  - `synonymCandidatesGenerated` - Total synonyms expanded
- **Why Important**: Synonym expansion increases search space; tracks fuzzy matching overhead

---

## 9. Proof Step Operations

### 9.1 Proof Step Logging
**Location**: Proof trace construction
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/prove/state.mjs:22-28` - `logStep()`
- `/home/salboaie/work/AGISystem2/src/reasoning/prove-search-trace.mjs:19-180`

**Frequency**: Very High
**Currently Tracked**: Partial - `totalProofSteps` counts steps, but not:
- Step type distribution
- Trace construction cost

**Recommendation**:
- **Metric Name**: `proofStepTypeDistribution`
- **Sub-metrics**:
  - `directMatchSteps` - Direct KB matches
  - `ruleMatchSteps` - Rule applications
  - `transitiveSteps` - Already tracked
  - `synonymMatchSteps` - Synonym-based matches
  - `hdcDirectSteps` - HDC similarity matches
- **Why Important**: Step type distribution reveals reasoning strategy effectiveness

---

## 10. Recursion & Call Stack

### 10.1 Recursive Query Calls
**Location**: Nested query execution
**Files**:
- `/home/salboaie/work/AGISystem2/src/reasoning/query.mjs:70-450`
- `/home/salboaie/work/AGISystem2/src/reasoning/query-rules.mjs:47-156`

**Frequency**: Medium
**Currently Tracked**: ❌ NO

**Recommendation**:
- **Metric Name**: `recursiveQueryDepth`
- **Sub-metrics**:
  - `maxQueryCallStackDepth` - Deepest query nesting
  - `queryRecursionCount` - Total recursive query calls
- **Why Important**: Recursive queries can cause stack overflow or timeouts

---

## Summary of Recommendations

### High Priority (Most Expensive, Not Tracked)

1. **`topKSimilarSearches`** - Most expensive operation (O(V*d))
2. **`hdcBundleOperations`** - Expensive aggregations (O(n*d))
3. **`cspBacktrackStats`** - Expose existing CSP stats
4. **`unificationAttempts`** - Core rule matching cost
5. **`transitiveNodesExplored`** - Graph traversal explosion
6. **`patternMatchAttempts`** - Combinatorial pattern matching

### Medium Priority (Frequent, Not Tracked)

7. **`vocabularyLookups`** - Cache effectiveness
8. **`componentKBIndexHits`** - Index effectiveness
9. **`conditionProvingStats`** - Recursive condition depth
10. **`hdcBindOperations` / `hdcUnbindOperations`** - Core HDC ops

### Low Priority (Less Frequent, But Useful)

11. **`planningSearchStats`** - Planning diagnostics
12. **`synonymExpansions`** - Fuzzy matching cost
13. **`proofStepTypeDistribution`** - Strategy analysis
14. **`levelBundleComputations`** - Cache invalidation tracking
15. **`arrayOperationStats`** - Data structure efficiency

---

## Implementation Strategy

### Phase 1: Core HDC Operations
Add tracking to `/home/salboaie/work/AGISystem2/src/hdc/facade.mjs`:
```javascript
// In bind(), bundle(), unbind()
session?.reasoningStats?.hdcBindOperations++;
session?.reasoningStats?.hdcBundleOperations++;
session?.reasoningStats?.hdcUnbindOperations++;
```

### Phase 2: Top-K Search
Add tracking to `/home/salboaie/work/AGISystem2/src/core/operations.mjs`:
```javascript
export function topKSimilar(query, vocabulary, k) {
  session?.reasoningStats?.topKSimilarSearches++;
  session?.reasoningStats?.topKVocabSize += vocabulary.size;
  // ... existing logic
}
```

### Phase 3: Graph Traversal
Add tracking to transitive/inheritance reasoners:
```javascript
// In findAllTransitiveTargets()
session.reasoningStats.transitiveNodesExplored++;
session.reasoningStats.transitiveMaxDepth = Math.max(
  session.reasoningStats.transitiveMaxDepth,
  depth
);
```

### Phase 4: CSP Stats Exposure
Expose `BacktrackSearch.stats` to session:
```javascript
// In executor-solve.mjs after CSP solving
Object.assign(session.reasoningStats, {
  cspNodesExplored: (session.reasoningStats.cspNodesExplored || 0) + search.stats.nodesExplored,
  cspBacktracks: (session.reasoningStats.cspBacktracks || 0) + search.stats.backtracks,
  cspPruned: (session.reasoningStats.cspPruned || 0) + search.stats.pruned
});
```

### Phase 5: Unification & Pattern Matching
Add fine-grained tracking to unification and pattern matching:
```javascript
// In tryUnification()
session.reasoningStats.unificationAttempts++;
if (unifyOk) session.reasoningStats.unificationSuccesses++;

// In findAllFactMatches()
session.reasoningStats.patternMatchAttempts++;
session.reasoningStats.patternMatchVariables += variableCount;
```

---

## Expected Impact

**Performance Visibility**:
- Identify hot paths consuming >80% of reasoning time
- Detect combinatorial explosions early
- Optimize based on data, not intuition

**Debugging**:
- Pinpoint timeout causes (deep recursion vs expensive operations)
- Detect infinite loops (high iteration counts with no progress)
- Identify missing indices (high KB scan to index hit ratio)

**Capacity Planning**:
- Predict memory usage (vocabulary size, bundle sizes)
- Estimate query complexity from metrics
- Set realistic timeout values based on operation counts

---

## File Locations Reference

**Reasoning Stats Tracking**:
- `/home/salboaie/work/AGISystem2/src/runtime/session.mjs:110-128` - Stats initialization
- `/home/salboaie/work/AGISystem2/src/runtime/session-stats.mjs` - Stats utilities

**HDC Operations**:
- `/home/salboaie/work/AGISystem2/src/hdc/facade.mjs:217-259` - bind/bundle/unbind
- `/home/salboaie/work/AGISystem2/src/core/operations.mjs` - topKSimilar

**CSP Operations**:
- `/home/salboaie/work/AGISystem2/src/reasoning/csp/backtrack.mjs:27-31, 67, 104, 110` - Internal stats
- `/home/salboaie/work/AGISystem2/src/runtime/executor-solve.mjs` - CSP invocation

**Graph Traversal**:
- `/home/salboaie/work/AGISystem2/src/reasoning/transitive.mjs:241-260` - Transitive BFS
- `/home/salboaie/work/AGISystem2/src/reasoning/query-transitive.mjs:151-230` - Query transitive
- `/home/salboaie/work/AGISystem2/src/reasoning/property-inheritance.mjs:140-197` - Inheritance

**Unification & Pattern Matching**:
- `/home/salboaie/work/AGISystem2/src/reasoning/unification.mjs:38-130` - tryUnification
- `/home/salboaie/work/AGISystem2/src/reasoning/kb-matching.mjs:149-264` - findAllFactMatches
- `/home/salboaie/work/AGISystem2/src/reasoning/conditions/instantiated.mjs:126-310` - Condition proving

---

**End of Report**
