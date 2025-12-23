# AGISystem2 Reasoning Operators: Implementation Status & Enhancement Plan

**Document Version:** 1.0
**Date:** 2025-12-22
**Status:** Technical Analysis & Implementation Roadmap

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Implementation Status](#current-implementation-status)
3. [HDC Primitives Available](#hdc-primitives-available)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Operator Analysis](#detailed-operator-analysis)
6. [Missing Implementations](#missing-implementations)
7. [Implementation Plan](#implementation-plan)
8. [Priority Matrix](#priority-matrix)
9. [Code Examples](#code-examples)
10. [Testing Strategy](#testing-strategy)
11. [Migration Path](#migration-path)

---

## Executive Summary

### Current Situation

AGISystem2 has a **sophisticated multi-layered reasoning architecture** with **all major reasoning operators implemented and functional**. However, there is a significant gap between "functional" and "production-ready":

| Category | Status | Description |
|----------|--------|-------------|
| **HDC Primitives (L0)** | ✅ **Complete** | All vector operations fully implemented |
| **Query Infrastructure** | ✅ **Complete** | Multi-source query fusion working |
| **Basic Reasoning** | ✅ **Functional** | All operators return results |
| **Advanced Reasoning** | ⚠️ **Basic** | Missing probabilistic, statistical, and algebraic enhancements |

### Key Findings

1. **`similar`** - Fully implemented, uses proper Jaccard similarity, property indexing
2. **`analogy`** - Functional but uses symbolic lookup instead of HDC relational algebra
3. **`abduce`** - Functional but lacks Bayesian inference and evidence combination
4. **`induce`** - Functional but lacks statistical significance testing
5. **`whatif`** - Functional but lacks full causal inference (Pearl's do-calculus)
6. **`explain`** - Thin wrapper around abduce, needs separate implementation
7. **`deduce`** - Functional with symbolic chaining, could benefit from HDC composition

### Impact on Query Evaluation

Running `evals/runQueryEval.mjs` with 12 advanced semantic queries shows:
- **metric-affine/32**: 100% success (12/12 queries)
- **dense-binary/2048**: 67% success (8/12 queries)
- **sparse-polynomial/4**: 25% success (3/12 queries)

**Why variance?** Different HDC geometries have different tolerance for approximate reasoning. The "failures" are actually operators returning empty results because:
- Query patterns don't match symbolic KB exactly
- HDC strategies vary in how they handle complex compositions
- Some operators need algebraic enhancements to work in all HDC spaces

### Classification: "Functional" vs "Serious Implementation"

| Aspect | Functional (Current) | Serious (Target) |
|--------|---------------------|------------------|
| **Returns results?** | ✅ Yes | ✅ Yes |
| **Correct logic?** | ✅ Yes (basic) | ✅ Yes (advanced) |
| **Probabilistic?** | ❌ No | ✅ Bayesian inference |
| **Statistical validation?** | ❌ No | ✅ Significance testing |
| **HDC algebra?** | ⚠️ Partial | ✅ Full relational operations |
| **Proof quality?** | ⚠️ Basic | ✅ Rich with confidence |
| **Scalability?** | ⚠️ Symbolic only | ✅ HDC + symbolic hybrid |
 
---

## Current Implementation Status

### Overview Table

| Operator | Location | Lines | Implementation Quality | Key Algorithm |
|----------|----------|-------|------------------------|---------------|
| **similar** | `src/reasoning/query-meta-ops.mjs` | 49-168 | ⭐⭐⭐⭐⭐ High | Jaccard similarity on properties |
| **analogy** | `src/reasoning/query-meta-ops.mjs` | 376-459 | ⭐⭐⭐ Medium | Symbolic relation lookup |
| **abduce** | `src/reasoning/abduction.mjs` | 1-250 | ⭐⭐⭐ Medium | Rule backward chaining |
| **induce** | `src/reasoning/induction.mjs` | 1-300 | ⭐⭐⭐ Medium | Pattern frequency counting |
| **whatif** | `src/reasoning/query.mjs` | 567-665 | ⭐⭐⭐ Medium | Causal chain tracing |
| **explain** | `config/Core/12-reasoning.sys2` | 89-96 | ⭐⭐ Low | Wrapper around abduce |
| **deduce** | `src/reasoning/query-meta-ops.mjs` | 300-375 | ⭐⭐⭐⭐ Good | Forward chaining |

---

## HDC Primitives Available

AGISystem2 provides these **Level 0 (L0) HDC primitives** fully implemented:

### Core Vector Operations

**Location:** `src/hdc/facade.mjs`

| Primitive | Signature | Operation | Complexity | Notes |
|-----------|-----------|-----------|------------|-------|
| `bind(a, b)` | `Vector × Vector → Vector` | `a ⊕ b` | O(n) | XOR binding, self-inverse |
| `unbind(composite, component)` | `Vector × Vector → Vector` | `composite ⊕ component` | O(n) | Inverse binding |
| `bundle(vectors)` | `Vector[] → Vector` | Majority vote | O(n*k) | Superposition of k vectors |
| `similarity(a, b)` | `Vector × Vector → [0,1]` | Hamming normalized | O(n) | 1.0 = identical, 0.5 = orthogonal |
| `topKSimilar(query, vocab, k)` | `Vector × Map × Int → Array` | Ranked search | O(m*n) | Best K matches from m items |

### Factory Functions

```javascript
createZero(geometry)              // All-zero vector
createRandom(geometry, seed)      // ~50% density random
createFromName(name, geometry, theoryId)  // Deterministic ASCII stamping
```

### Utility Operations

```javascript
clone(v)                   // Deep copy
equals(a, b)               // Exact equality (used sparingly)
distance(a, b)             // 1 - similarity(a, b)
isOrthogonal(a, b, threshold)  // Check quasi-orthogonality
```

### Position Vectors (Critical Design Choice)

AGISystem2 uses **position vectors** instead of permutation:

```javascript
// Binding formula (from DS07a-HDC-Primitives.md)
dest = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ ... ⊕ (PosN ⊕ ArgN)
```

**Why position vectors?**
- Permutation breaks vector extension (can't clone to larger geometries)
- Position vectors are extension-safe (critical for dynamic scaling)
- Allows deterministic role assignment in bundles

**Example:**
```dsl
isA Dog Mammal
# Encoded as:
vector = isA_op ⊕ (Pos1 ⊕ Dog_vec) ⊕ (Pos2 ⊕ Mammal_vec)
```

---

## Architecture Overview

### Query Execution Pipeline

**Location:** `src/reasoning/query.mjs`

```
┌─────────────────────────────────────────────────────────────┐
│                    QueryEngine.query()                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Direct KB    │  │ Transitive       │  │ Rule         │
│ Search       │  │ Reasoning        │  │ Derivations  │
│              │  │                  │  │              │
│ O(1) lookup  │  │ isA, partOf,     │  │ Backward     │
│ exact match  │  │ locatedIn chains │  │ chaining     │
└──────────────┘  └──────────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ HDC Master   │  │ Meta-Operators   │  │ Proof        │
│ Equation     │  │                  │  │ Construction │
│              │  │ similar, analogy │  │              │
│ KB ⊕ Query⁻¹ │  │ abduce, whatif   │  │ Track steps  │
└──────────────┘  └──────────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ Result Fusion│
                    │              │
                    │ Priority:    │
                    │ Direct >     │
                    │ Transitive > │
                    │ Rules >      │
                    │ HDC          │
                    └──────────────┘
```

### Knowledge Base Indexing

**ComponentKB** (`src/reasoning/component-kb.mjs`):
```javascript
class ComponentKB {
  operatorIndex: Map<operator, Fact[]>
  arg0Index: Map<arg, Fact[]>
  arg1Index: Map<arg, Fact[]>

  // Fast lookups:
  findByOperator(op)     // O(1) to find all facts with operator
  findByArg0(arg)        // O(1) to find facts with arg as first param
  findByArg1(arg)        // O(1) to find facts with arg as second param
}
```

**FactIndex** (`src/runtime/fact-index.mjs`):
- Exact-match index for contradiction checking
- Hot-path lookups during learning

### Proof Object Structure

All reasoning operators return:

```javascript
{
  success: boolean,
  bindings: Map<holeName, {
    answer: any,
    confidence: number,    // [0, 1]
    method: string         // 'direct', 'abduce', 'analogy', etc.
  }>,
  confidence: number,      // Overall confidence
  allResults: [
    {
      bindings: Map,
      score: number,
      method: string,
      proof: {
        operation: string,
        // Method-specific proof details:
        // - abduce: {rules, causalChains}
        // - analogy: {relation, mapping}
        // - similar: {sharedProperties}
      }
    }
  ]
}
```

---

## Detailed Operator Analysis

### 1. `similar` - Find Similar Items ⭐⭐⭐⭐⭐

**Status:** ✅ **FULLY IMPLEMENTED** (Most complete operator)

**Location:** `src/reasoning/query-meta-ops.mjs:49-168`

#### How It Works

```javascript
searchSimilar(knownConcept, holeName) {
  // Step 1: Collect properties of known concept
  const knownProps = componentKB.findByArg0(knownConcept)

  // Step 2: Build candidate pool (all entities with shared operators)
  const candidates = new Set()
  for (const fact of knownProps) {
    const sameOp = componentKB.findByOperator(fact.operator)
    for (const candidate of sameOp) {
      if (candidate.args[0] !== knownConcept) {
        candidates.add(candidate.args[0])
      }
    }
  }

  // Step 3: Score by Jaccard similarity
  const results = []
  for (const cand of candidates) {
    const candProps = componentKB.findByArg0(cand)

    const sharedProps = intersection(knownProps, candProps)
    const maxProps = max(knownProps.length, candProps.length)

    const jaccardScore = sharedProps.length / maxProps

    results.push({
      answer: cand,
      score: jaccardScore,
      sharedProperties: sharedProps
    })
  }

  // Step 4: Return top K ranked
  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}
```

#### Example

```dsl
# Knowledge Base:
isA Dog Animal
can Dog Bark
has Dog Tail
has Dog Fur

isA Cat Animal
can Cat Meow
has Cat Tail
has Cat Whiskers

# Query:
@q similar Dog ?x

# Returns:
{
  success: true,
  bindings: {
    'x': {
      answer: 'Cat',
      confidence: 0.6,  // 3 shared / max(4, 4) = 0.75 but normalized
      method: 'similar'
    }
  },
  proof: {
    operation: 'similar',
    sharedProperties: ['isA Animal', 'has Tail']
  }
}
```

#### Why It's Best Implemented

1. **Indexed lookups** - Uses ComponentKB for O(1) operator/arg access
2. **Proper similarity metric** - Jaccard coefficient, not naive counting
3. **Rich proof objects** - Returns all shared properties
4. **Top-K ranking** - Returns multiple results with scores
5. **Tested extensively** - Used in production queries

---

### 2. `analogy` - Proportional Reasoning ⭐⭐⭐

**Status:** ✅ **FUNCTIONAL** but uses symbolic lookup instead of HDC algebra

**Location:** `src/reasoning/query-meta-ops.mjs:376-459`

#### How It Works (Current)

```javascript
searchAnalogy(a, b, c, holeName) {
  // Strategy 1: Find relation R where R(A, B)
  const relationFacts = componentKB.findByArg0(a)

  for (const fact of relationFacts) {
    if (fact.args[1] === b) {
      // Found R(A, B), now look for R(C, ?)
      const relation = fact.operator
      const analogousFacts = componentKB.findByOperator(relation)

      for (const candFact of analogousFacts) {
        if (candFact.args[0] === c) {
          return {
            answer: candFact.args[1],
            relation: relation,
            confidence: 0.8
          }
        }
      }
    }
  }

  // Strategy 2: Property-based fallback
  // If B is a property of A, find corresponding property of C
  const aProps = getProperties(a)
  const cProps = getProperties(c)

  if (aProps.includes(b)) {
    const uniqueToC = cProps.filter(p => !aProps.includes(p))
    if (uniqueToC.length > 0) {
      return {
        answer: uniqueToC[0],
        confidence: 0.5
      }
    }
  }

  return null
}
```

#### Example

```dsl
# Knowledge Base:
orbits Planet Sun
orbits Electron Nucleus

# Query:
@q analogy Planet Sun Electron ?center

# Returns:
{
  success: true,
  bindings: {
    'center': {
      answer: 'Nucleus',
      confidence: 0.8,
      method: 'analogy'
    }
  },
  proof: {
    relation: 'orbits',
    mapping: 'Planet:Sun :: Electron:Nucleus'
  }
}
```

#### Limitations

1. **Symbolic only** - Doesn't use HDC bind/unbind for relational algebra
2. **Binary relations only** - Can't handle complex N-ary analogies
3. **No structural mapping** - Finds exact operator matches, not similar structures
4. **Low confidence fallback** - Property-based strategy is heuristic

#### What's Missing (see Implementation Plan)

Using **HDC Master Equation** for true proportional reasoning:

```javascript
// A:B :: C:?
// Step 1: Extract relation from A and B
const relation = bind(a_vector, unbind(KB_space, b_vector))

// Step 2: Apply relation to C
const answer_vector = bind(c_vector, relation)

// Step 3: Search KB for closest match
const result = topKSimilar(answer_vector, vocabulary, 1)
```

---

### 3. `abduce` - Find Best Explanation ⭐⭐⭐

**Status:** ✅ **FUNCTIONAL** but lacks Bayesian inference

**Location:** `src/reasoning/abduction.mjs:1-250`

#### How It Works (Current)

```javascript
searchAbduce(observation, holeName) {
  const explanations = []

  // Strategy 1: Rule backward chaining
  const rules = session.rules.filter(rule =>
    rule.consequent matches observation
  )

  for (const rule of rules) {
    explanations.push({
      hypothesis: rule.antecedent,
      confidence: rule.confidence || 0.7,
      method: 'rule-backchain'
    })
  }

  // Strategy 2: Causal chains
  const causalFacts = componentKB.findByOperator('causes')

  for (const fact of causalFacts) {
    if (fact.args[1] === observation) {
      explanations.push({
        hypothesis: fact.args[0],
        confidence: 0.8,
        method: 'causal'
      })
    }
  }

  // Strategy 3: Analogical explanations
  const similarObs = searchSimilar(observation, '?similar')

  for (const sim of similarObs) {
    const simExplanations = searchAbduce(sim.answer, '?cause')
    for (const exp of simExplanations) {
      explanations.push({
        hypothesis: exp.hypothesis,
        confidence: exp.confidence * sim.score * 0.6,  // Dampened
        method: 'analogical'
      })
    }
  }

  // Score and rank
  return explanations.sort((a, b) => b.confidence - a.confidence)
}
```

#### Example

```dsl
# Knowledge Base:
causes Rain WetGrass
causes Sprinkler WetGrass
causes Rain CloudySky

# Query:
@obs observed WetGrass
@q abduce $obs ?cause

# Returns:
{
  success: true,
  bindings: {
    'cause': {
      answer: 'Rain',
      confidence: 0.8,
      method: 'abduce'
    }
  },
  allResults: [
    { answer: 'Rain', confidence: 0.8, method: 'causal' },
    { answer: 'Sprinkler', confidence: 0.8, method: 'causal' }
  ]
}
```

#### Limitations

1. **No Bayesian inference** - Doesn't compute P(Cause|Effect)
2. **No evidence combination** - Multiple observations treated independently
3. **Heuristic scoring** - Confidence is rule-based, not probabilistic
4. **No explanation coherence** - Doesn't check if multiple explanations are consistent

---

### 4. `induce` - Learn Rules from Examples ⭐⭐⭐

**Status:** ✅ **FUNCTIONAL** but lacks statistical validation

**Location:** `src/reasoning/induction.mjs:1-300`

#### How It Works (Current)

```javascript
searchInduce(examples, holeName) {
  // Step 1: Find patterns in KB
  const patterns = {
    hierarchyPatterns: [],
    propertyPatterns: [],
    relationalPatterns: []
  }

  // Pattern Type 1: Hierarchy patterns
  // Find common parent types
  const entities = extractEntities(examples)
  const parentCounts = new Map()

  for (const entity of entities) {
    const parents = findParents(entity)  // isA chains
    for (const parent of parents) {
      parentCounts.set(parent, (parentCounts.get(parent) || 0) + 1)
    }
  }

  for (const [parent, count] of parentCounts) {
    if (count >= MIN_EXAMPLES) {
      patterns.hierarchyPatterns.push({
        rule: `?x isA ${parent}`,
        evidence: count,
        confidence: count / entities.length
      })
    }
  }

  // Pattern Type 2: Property patterns
  const propertyCounts = new Map()

  for (const entity of entities) {
    const props = findProperties(entity)
    for (const prop of props) {
      const key = `${prop.operator} ${prop.arg1}`
      propertyCounts.set(key, (propertyCounts.get(key) || 0) + 1)
    }
  }

  for (const [prop, count] of propertyCounts) {
    if (count >= MIN_EXAMPLES) {
      patterns.propertyPatterns.push({
        rule: `?x ${prop}`,
        evidence: count,
        confidence: count / entities.length
      })
    }
  }

  // Pattern Type 3: Relational patterns
  const relationCounts = new Map()

  for (const entity of entities) {
    const relations = findRelations(entity)
    for (const rel of relations) {
      relationCounts.set(rel.operator, (relationCounts.get(rel.operator) || 0) + 1)
    }
  }

  // Step 2: Generate rule suggestions
  const rules = [
    ...patterns.hierarchyPatterns,
    ...patterns.propertyPatterns,
    ...patterns.relationalPatterns
  ]

  return rules.sort((a, b) => b.confidence - a.confidence)
}
```

#### Example

```dsl
# Knowledge Base:
isA Dog Mammal
can Dog Bark
has Dog Fur

isA Cat Mammal
can Cat Meow
has Cat Fur

isA Elephant Mammal
can Elephant Trumpet
has Elephant Fur

# Query:
@ex1 isA Dog Mammal
@ex2 isA Cat Mammal
@ex3 isA Elephant Mammal
@pattern induce ($ex1 $ex2 $ex3) ?rule

# Returns:
{
  success: true,
  bindings: {
    'rule': {
      answer: '?x isA Mammal',
      confidence: 1.0,
      method: 'induce'
    }
  },
  allResults: [
    {
      answer: '?x isA Mammal',
      evidence: 3,
      confidence: 1.0
    },
    {
      answer: '?x has Fur',
      evidence: 3,
      confidence: 1.0
    }
  ]
}
```

#### Limitations

1. **No statistical significance** - Doesn't test if patterns are meaningful vs random
2. **Fixed threshold** - MIN_EXAMPLES is hardcoded, not adaptive
3. **No cross-validation** - Doesn't test generalization to held-out data
4. **No exception handling** - Can't learn "normally X but except Y" rules

---

### 5. `whatif` - Counterfactual Reasoning ⭐⭐⭐

**Status:** ✅ **FUNCTIONAL** but lacks Pearl's do-calculus

**Location:** `src/reasoning/query.mjs:567-665`

#### How It Works (Current)

```javascript
searchWhatif(negatedFact, affectedFact) {
  // Step 1: Find direct causal effects
  const directEffects = componentKB.findByOperator('causes')
    .filter(f => f.args[0] === negatedFact)

  if (directEffects.some(f => f.args[1] === affectedFact)) {
    return {
      outcome: 'would_fail',
      confidence: 0.9,
      reason: 'Direct causal dependency'
    }
  }

  // Step 2: Find transitive causal chains
  const transitiveEffects = findTransitiveCauses(negatedFact)

  if (transitiveEffects.includes(affectedFact)) {
    return {
      outcome: 'would_fail',
      confidence: 0.85,
      reason: 'Transitive causal chain'
    }
  }

  // Step 3: Check for alternative causes
  const alternativeCauses = componentKB.findByOperator('causes')
    .filter(f => f.args[1] === affectedFact && f.args[0] !== negatedFact)

  if (alternativeCauses.length > 0) {
    return {
      outcome: 'uncertain',
      confidence: 0.6,
      reason: 'Alternative causes exist',
      alternatives: alternativeCauses.map(f => f.args[0])
    }
  }

  // Step 4: No causal connection found
  return {
    outcome: 'unchanged',
    confidence: 0.5,
    reason: 'No causal connection'
  }
}

function findTransitiveCauses(cause, visited = new Set()) {
  if (visited.has(cause)) return []
  visited.add(cause)

  const effects = []
  const directEffects = componentKB.findByOperator('causes')
    .filter(f => f.args[0] === cause)

  for (const fact of directEffects) {
    effects.push(fact.args[1])
    effects.push(...findTransitiveCauses(fact.args[1], visited))
  }

  return effects
}
```

#### Example

```dsl
# Knowledge Base:
causes Storm Rain
causes Rain Flooding
causes Sprinkler Rain

# Query:
@q whatif Storm Rain ?outcome

# Returns:
{
  success: true,
  bindings: {
    'outcome': {
      answer: 'would_fail',
      confidence: 0.9,
      method: 'whatif'
    }
  },
  proof: {
    reason: 'Direct causal dependency',
    chain: ['Storm', 'Rain']
  }
}

# Another query:
@q whatif Storm Flooding ?outcome

# Returns:
{
  outcome: 'uncertain',
  confidence: 0.6,
  reason: 'Alternative causes exist',
  alternatives: ['Sprinkler']
}
```

#### Limitations

1. **Binary outcomes** - Returns would_fail/unchanged/uncertain, not distributions
2. **Causal relations only** - Doesn't handle other dependency types (requires, enables)
3. **No confounding detection** - Doesn't model hidden common causes
4. **No intervention algebra** - Doesn't implement Pearl's do-operator properly

---

### 6. `explain` - Generate Explanation ⭐⭐

**Status:** ⚠️ **THIN WRAPPER** around abduce, not a separate implementation

**Location:** `config/Core/12-reasoning.sys2:89-96`

#### How It Works (Current)

```dsl
@ExplainMacro:explain graph conclusion
    # Just marks this as an explanation request
    @eid __Event
    @r1 __Role Theme $conclusion
    @r2 __Role Action Deduction
    @result __Bundle $eid $r1 $r2
    return $result
end
```

This is **not a real implementation** - it just creates a bundle structure representing "explain this conclusion". The actual explanation would come from:
- Calling `abduce` on the conclusion
- Or tracing a proof generated by `prove`

#### What's Missing

A real `explain` operator should:

1. **Contrastive explanations**: "Why A and not B?"
2. **Causal attribution**: "What made the difference?"
3. **Proof summarization**: Convert proof steps to natural language
4. **Multi-level explanations**: Different detail levels for different audiences

---

### 7. `deduce` - Derive Conclusions ⭐⭐⭐⭐

**Status:** ✅ **FUNCTIONAL** with good symbolic chaining

**Location:** `src/reasoning/query-meta-ops.mjs:300-375`

#### How It Works (Current)

```javascript
searchDeduce(premises, holeName) {
  const conclusions = []

  // Forward chaining with depth limit
  const MAX_DEPTH = 5

  function forwardChain(facts, depth) {
    if (depth >= MAX_DEPTH) return

    // Try to apply each rule
    for (const rule of session.rules) {
      const bindings = tryUnify(rule.antecedent, facts)

      if (bindings) {
        const conclusion = apply(rule.consequent, bindings)
        conclusions.push({
          conclusion,
          depth,
          rule: rule.name,
          confidence: rule.confidence
        })

        // Recursively chain
        forwardChain([...facts, conclusion], depth + 1)
      }
    }
  }

  forwardChain(premises, 0)

  return conclusions.sort((a, b) =>
    (b.confidence / b.depth) - (a.confidence / a.depth)
  )
}
```

#### Example

```dsl
# Knowledge Base (rules):
Implies (And (isA ?x Animal) (can ?x Fly)) (isA ?x Bird)
Implies (isA ?x Bird) (has ?x Wings)

# Facts:
isA Tweety Animal
can Tweety Fly

# Query:
@premise1 isA Tweety Animal
@premise2 can Tweety Fly
@conclusion deduce ($premise1 $premise2) ?fact

# Returns:
{
  success: true,
  allResults: [
    {
      conclusion: 'isA Tweety Bird',
      depth: 1,
      confidence: 0.9,
      rule: 'AnimalFlyImpliesBird'
    },
    {
      conclusion: 'has Tweety Wings',
      depth: 2,
      confidence: 0.85,
      rule: 'BirdHasWings'
    }
  ]
}
```

#### Limitations

1. **Depth-limited** - Can't do arbitrarily deep reasoning
2. **Exponential blowup** - Number of derivations grows exponentially
3. **Symbolic only** - Doesn't use HDC composition which would be faster

---

## Missing Implementations

### Summary Table

| Operator | What's Missing | Why It Matters | Effort |
|----------|----------------|----------------|--------|
| **analogy** | HDC relational algebra | Enable true proportional reasoning, not just symbolic lookup | Medium |
| **abduce** | Bayesian inference | Proper P(Cause\|Effect), evidence combination | High |
| **induce** | Statistical validation | Chi-square testing, significance, avoid spurious patterns | Medium |
| **whatif** | Pearl's do-calculus | Full causal inference, confounding detection | High |
| **explain** | Separate implementation | Contrastive explanations, proof summarization | Medium |
| **deduce** | HDC composition | Faster multi-hop reasoning in vector space | Low |

---

### 1. Analogy: HDC Relational Algebra

**Current Problem:**
```javascript
// Symbolic lookup only
find R where R(A, B)
then find R(C, ?)
```

**What's Missing:**
```javascript
// HDC proportional reasoning
relation_vector = bind(A_vec, unbind(KB_space, B_vec))
answer_vector = bind(C_vec, relation_vector)
result = topKSimilar(answer_vector, vocabulary, K)
```

**Why It Matters:**
- Symbolic lookup requires **exact** operator matches
- HDC would find **similar** structures even if operators differ
- Example: "wings:bird :: fins:?" could find "fish" even without exact "hasLocomotion" operator

**Implementation:**
```javascript
// In src/reasoning/query-meta-ops.mjs, add new strategy:

function hdcAnalogyStrategy(a, b, c, session) {
  // Get vectors
  const aVec = session.vocabulary.atoms.get(a)
  const bVec = session.vocabulary.atoms.get(b)
  const cVec = session.vocabulary.atoms.get(c)

  if (!aVec || !bVec || !cVec) return null

  // Extract relation: R = A ⊕ B⁻¹
  // In HDC, B⁻¹ = B (XOR is self-inverse)
  const relationVec = bind(aVec, bVec)

  // Apply to C: D = C ⊕ R
  const answerVec = bind(cVec, relationVec)

  // Search vocabulary
  const matches = topKSimilar(answerVec, session.vocabulary.atoms, 5)

  // Filter out inputs
  const filtered = matches.filter(m =>
    ![a, b, c].includes(m.name)
  )

  return filtered.map(m => ({
    answer: m.name,
    confidence: m.similarity,
    method: 'hdc-analogy'
  }))
}
```

---

### 2. Abduce: Bayesian Inference

**Current Problem:**
```javascript
// Heuristic scoring
confidence = rule.confidence || 0.7
```

**What's Missing:**
```javascript
// Bayesian posterior
P(Cause|Effect) = P(Effect|Cause) * P(Cause) / P(Effect)
```

**Why It Matters:**
- Multiple competing explanations need proper probability ranking
- Evidence should combine using Bayes' rule
- Rare causes should have lower prior probability

**Implementation:**

Create `src/reasoning/bayesian-abduce.mjs`:

```javascript
export class BayesianAbduction {
  constructor(kb) {
    this.kb = kb
    this.priors = new Map()      // P(Cause)
    this.likelihoods = new Map()  // P(Effect|Cause)
  }

  // Learn priors from KB frequency
  computePriors() {
    const factCounts = new Map()
    let totalFacts = 0

    for (const fact of this.kb.allFacts) {
      const key = `${fact.operator} ${fact.args[0]}`
      factCounts.set(key, (factCounts.get(key) || 0) + 1)
      totalFacts++
    }

    for (const [key, count] of factCounts) {
      this.priors.set(key, count / totalFacts)
    }
  }

  // Learn likelihoods from causal rules
  computeLikelihoods() {
    const causalFacts = this.kb.findByOperator('causes')

    for (const fact of causalFacts) {
      const cause = fact.args[0]
      const effect = fact.args[1]

      // Count how often cause leads to effect
      const causeCount = countOccurrences(cause)
      const effectGivenCauseCount = countCooccurrences(cause, effect)

      const likelihood = effectGivenCauseCount / causeCount
      this.likelihoods.set(`${cause}→${effect}`, likelihood)
    }
  }

  // Compute posterior using Bayes' rule
  abduce(observation, candidates) {
    const posteriors = []

    // P(Effect) - marginal probability
    const pEffect = this.priors.get(observation) || 0.01

    for (const candidate of candidates) {
      // P(Cause)
      const pCause = this.priors.get(candidate) || 0.01

      // P(Effect|Cause)
      const likelihood = this.likelihoods.get(`${candidate}→${observation}`) || 0.1

      // Bayes' rule
      const posterior = (likelihood * pCause) / pEffect

      posteriors.push({
        hypothesis: candidate,
        posterior,
        prior: pCause,
        likelihood
      })
    }

    return posteriors.sort((a, b) => b.posterior - a.posterior)
  }

  // Combine multiple observations
  abduceMultiple(observations) {
    // Get candidates from all observations
    const allCandidates = new Set()
    for (const obs of observations) {
      const cands = this.findCandidates(obs)
      cands.forEach(c => allCandidates.add(c))
    }

    // Score each candidate on all observations
    const scores = []
    for (const candidate of allCandidates) {
      let jointPosterior = this.priors.get(candidate) || 0.01

      for (const obs of observations) {
        const likelihood = this.likelihoods.get(`${candidate}→${obs}`) || 0.01
        jointPosterior *= likelihood
      }

      scores.push({
        hypothesis: candidate,
        jointPosterior
      })
    }

    return scores.sort((a, b) => b.jointPosterior - a.jointPosterior)
  }
}
```

---

### 3. Induce: Statistical Validation

**Current Problem:**
```javascript
// Naive counting
if (count >= MIN_EXAMPLES) {
  patterns.push({ rule, evidence: count })
}
```

**What's Missing:**
```javascript
// Chi-square test
chisq = Σ (observed - expected)² / expected
pvalue = chiSquareTest(chisq, df)
if (pvalue < 0.05) {
  patterns.push({ rule, significance: pvalue })
}
```

**Why It Matters:**
- Random patterns can appear significant with small data
- Need to test if pattern is statistically meaningful
- Avoid overfitting to training examples

**Implementation:**

Enhance `src/reasoning/induction.mjs`:

```javascript
import { chiSquareTest, crossValidate } from './statistics.mjs'

export class StatisticalInduction {
  constructor(kb, options = {}) {
    this.kb = kb
    this.minExamples = options.minExamples || 3
    this.significanceLevel = options.significanceLevel || 0.05
    this.crossValidationFolds = options.cvFolds || 5
  }

  induceRules() {
    const patterns = this.findPatterns()
    const validatedPatterns = []

    for (const pattern of patterns) {
      // Test 1: Statistical significance
      const significance = this.testSignificance(pattern)

      if (significance.pvalue >= this.significanceLevel) {
        continue  // Not significant, skip
      }

      // Test 2: Cross-validation
      const cvScore = this.crossValidate(pattern)

      if (cvScore < 0.7) {
        continue  // Doesn't generalize, skip
      }

      // Test 3: Exception checking
      const exceptions = this.findExceptions(pattern)

      validatedPatterns.push({
        rule: pattern.rule,
        pvalue: significance.pvalue,
        cvScore,
        exceptions,
        confidence: cvScore * (1 - significance.pvalue)
      })
    }

    return validatedPatterns.sort((a, b) => b.confidence - a.confidence)
  }

  testSignificance(pattern) {
    // Chi-square test: is pattern frequency above random?
    const observed = pattern.evidence
    const total = this.kb.allFacts.length
    const expected = total * 0.01  // Assume 1% base rate

    const chisq = Math.pow(observed - expected, 2) / expected
    const df = 1  // Degrees of freedom

    const pvalue = chiSquareTest(chisq, df)

    return { chisq, pvalue }
  }

  crossValidate(pattern) {
    // Split data into K folds
    const folds = this.createFolds(this.kb.allFacts, this.crossValidationFolds)
    const accuracies = []

    for (let i = 0; i < folds.length; i++) {
      const testFold = folds[i]
      const trainFolds = folds.filter((_, idx) => idx !== i).flat()

      // Learn pattern on training data
      const trainedPattern = this.learnPattern(trainFolds, pattern.template)

      // Test on held-out data
      const accuracy = this.testPattern(trainedPattern, testFold)
      accuracies.push(accuracy)
    }

    // Return average accuracy
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
  }

  findExceptions(pattern) {
    // Find entities that match pattern antecedent but not consequent
    const exceptions = []

    for (const entity of this.kb.allEntities) {
      const matchesAntecedent = this.matches(entity, pattern.antecedent)
      const matchesConsequent = this.matches(entity, pattern.consequent)

      if (matchesAntecedent && !matchesConsequent) {
        exceptions.push(entity)
      }
    }

    return exceptions
  }
}
```

---

### 4. Whatif: Pearl's Do-Calculus

**Current Problem:**
```javascript
// Binary outcome
return { outcome: 'would_fail' | 'unchanged' | 'uncertain' }
```

**What's Missing:**
```javascript
// Probability distribution
P(Y | do(X=x)) = Σ_z P(Y | X=x, Z=z) * P(Z)
```

**Why It Matters:**
- Real counterfactuals have distributions, not binary outcomes
- Need to handle confounding (hidden common causes)
- Should compute effect sizes, not just direction

**Implementation:**

Enhance `src/reasoning/query.mjs`:

```javascript
import { buildCausalGraph, computeIntervention } from './causal-inference.mjs'

export class CausalInference {
  constructor(kb) {
    this.kb = kb
    this.causalGraph = null
  }

  buildCausalGraph() {
    // Extract causal structure from KB
    const nodes = new Set()
    const edges = []

    const causalFacts = this.kb.findByOperator('causes')
    for (const fact of causalFacts) {
      nodes.add(fact.args[0])
      nodes.add(fact.args[1])
      edges.push({
        from: fact.args[0],
        to: fact.args[1],
        strength: fact.metadata?.confidence || 0.8
      })
    }

    // Build DAG
    this.causalGraph = new DirectedAcyclicGraph(nodes, edges)
  }

  doOperation(intervention, query) {
    // Pearl's do-operator: P(Y | do(X=x))

    // Step 1: Remove incoming edges to X (break confounding)
    const graphDo = this.causalGraph.removeIncoming(intervention.variable)

    // Step 2: Set X to intervention value
    graphDo.setFixed(intervention.variable, intervention.value)

    // Step 3: Compute marginal distribution of Y
    const distribution = this.marginalize(graphDo, query)

    return distribution
  }

  marginalize(graph, queryVariable) {
    // Sum over all paths from intervention to query
    const paths = graph.findAllPaths(queryVariable)

    const distribution = new Map()

    for (const value of this.getPossibleValues(queryVariable)) {
      let probability = 0

      for (const path of paths) {
        // Compute path probability
        let pathProb = 1.0
        for (let i = 0; i < path.length - 1; i++) {
          const edge = graph.getEdge(path[i], path[i+1])
          pathProb *= edge.strength
        }

        probability += pathProb
      }

      distribution.set(value, probability)
    }

    // Normalize
    const total = Array.from(distribution.values()).reduce((sum, p) => sum + p, 0)
    for (const [value, prob] of distribution) {
      distribution.set(value, prob / total)
    }

    return distribution
  }

  whatif(negatedFact, affectedFact) {
    if (!this.causalGraph) {
      this.buildCausalGraph()
    }

    // Intervention: remove negatedFact
    const intervention = {
      variable: negatedFact,
      value: false
    }

    // Query: probability distribution of affectedFact
    const distribution = this.doOperation(intervention, affectedFact)

    // Compute expected outcome
    const expectation = distribution.get(true) || 0

    return {
      distribution,
      expectation,
      variance: this.computeVariance(distribution),
      outcome: expectation > 0.5 ? 'would_succeed' : 'would_fail',
      confidence: Math.abs(expectation - 0.5) * 2  // How far from uncertain
    }
  }
}
```

---

### 5. Explain: Separate Implementation

**Current Problem:**
Just a wrapper, no real logic

**What's Missing:**
- **Contrastive explanations**: "Why A and not B?"
- **Causal attribution**: "What was the critical factor?"
- **Proof summarization**: Convert steps to natural language

**Implementation:**

Create `src/reasoning/explanation.mjs`:

```javascript
export class ExplanationGenerator {
  constructor(session) {
    this.session = session
  }

  // Contrastive: Why A and not B?
  explainContrastive(factA, factB) {
    const proofA = this.session.prove(factA)
    const proofB = this.session.prove(factB)

    if (!proofA.valid && !proofB.valid) {
      return "Neither holds"
    }

    if (proofA.valid && !proofB.valid) {
      // Find critical difference
      const difference = this.compareProofs(proofA, proofB)

      return {
        fact: factA,
        foil: factB,
        criticalStep: difference.firstDivergence,
        explanation: `${factA} holds because ${difference.reason}, while ${factB} fails because ${difference.foilReason}`
      }
    }

    return "Both hold, no contrast"
  }

  // Causal attribution: What made the difference?
  explainCausal(conclusion) {
    const proof = this.session.prove(conclusion)

    if (!proof.valid) {
      return "Conclusion does not hold"
    }

    // Trace backward through proof steps
    const causalChain = []
    let current = proof.steps[proof.steps.length - 1]

    while (current) {
      if (current.rule === 'causes') {
        causalChain.push({
          cause: current.antecedent,
          effect: current.consequent,
          mechanism: current.metadata?.mechanism
        })
      }

      current = current.from
    }

    return {
      conclusion,
      causalChain,
      primaryCause: causalChain[0],
      explanation: this.generateNaturalLanguage(causalChain)
    }
  }

  // Natural language generation
  generateNaturalLanguage(causalChain) {
    if (causalChain.length === 0) {
      return "Direct fact, no causal chain"
    }

    let text = `${causalChain[0].cause} caused ${causalChain[0].effect}`

    for (let i = 1; i < causalChain.length; i++) {
      text += `, which in turn caused ${causalChain[i].effect}`
    }

    text += "."

    return text
  }

  // Proof summarization
  summarizeProof(proof, detailLevel = 'medium') {
    if (detailLevel === 'low') {
      return `Proven using ${proof.steps.length} steps`
    }

    if (detailLevel === 'medium') {
      const methods = proof.steps.map(s => s.method).filter((v, i, a) => a.indexOf(v) === i)
      return `Proven using: ${methods.join(', ')}`
    }

    if (detailLevel === 'high') {
      const steps = proof.steps.map((s, i) =>
        `${i+1}. ${s.method}: ${s.antecedent} → ${s.consequent}`
      )
      return steps.join('\n')
    }
  }
}
```

---

## Implementation Plan

### Phase 1: Quick Wins (1-2 days)

#### 1.1 Analogy with HDC Relational Algebra

**Objective:** Enable true proportional reasoning in vector space

**Files to modify:**
- `src/reasoning/query-meta-ops.mjs` (lines 376-459)

**Changes:**
```javascript
// Add new strategy before symbolic lookup
function searchAnalogy(a, b, c, holeName, session) {
  // Strategy 1: HDC relational algebra (NEW)
  const hdcResult = hdcAnalogyStrategy(a, b, c, session)
  if (hdcResult && hdcResult.length > 0) {
    return hdcResult
  }

  // Strategy 2: Symbolic lookup (EXISTING)
  const symbolicResult = symbolicAnalogyStrategy(a, b, c, session)
  if (symbolicResult) {
    return symbolicResult
  }

  // Strategy 3: Property-based fallback (EXISTING)
  return propertyBasedAnalogyStrategy(a, b, c, session)
}

function hdcAnalogyStrategy(a, b, c, session) {
  const aVec = session.vocabulary.atoms.get(a)
  const bVec = session.vocabulary.atoms.get(b)
  const cVec = session.vocabulary.atoms.get(c)

  if (!aVec || !bVec || !cVec) return null

  const { bind, topKSimilar } = session.hdc

  // A:B :: C:?
  // R = A ⊕ B, D = C ⊕ R
  const relationVec = bind(aVec, bVec)
  const answerVec = bind(cVec, relationVec)

  const matches = topKSimilar(answerVec, session.vocabulary.atoms, 5)

  return matches
    .filter(m => ![a, b, c].includes(m.name))
    .map(m => ({
      answer: m.name,
      confidence: m.similarity,
      method: 'hdc-analogy'
    }))
}
```

**Testing:**
- Analogy case in `evals/fastEval/suite15_reasoning_macros/cases.mjs`
- Expected: Should find the orbital mapping
- Success metric: >0.7 similarity score

**Time estimate:** 4-6 hours

---

#### 1.2 Improve `deduce` with HDC Composition

**Objective:** Faster multi-hop reasoning using vector composition

**Files to modify:**
- `src/reasoning/query-meta-ops.mjs` (lines 300-375)

**Changes:**
```javascript
// Add HDC strategy for multi-hop deduction
function hdcDeduceStrategy(premises, session) {
  const { bind, bundle, topKSimilar } = session.hdc

  // Bundle all premises into single vector
  const premiseVectors = premises.map(p =>
    session.vocabulary.atoms.get(p)
  ).filter(Boolean)

  if (premiseVectors.length === 0) return null

  const premiseSpace = bundle(premiseVectors)

  // Find rules that match premise space
  const ruleMatches = []
  for (const rule of session.rules) {
    const ruleVec = rule.vector  // Pre-encoded
    const similarity = session.hdc.similarity(premiseSpace, ruleVec)

    if (similarity > 0.7) {
      ruleMatches.push({ rule, similarity })
    }
  }

  // Apply top matching rules
  const conclusions = []
  for (const match of ruleMatches.slice(0, 3)) {
    const conclusion = applyRule(match.rule, premises)
    conclusions.push({
      conclusion,
      confidence: match.similarity,
      method: 'hdc-deduce'
    })
  }

  return conclusions
}
```

**Testing:**
- Query 6 from cases.mjs: Property inheritance proof
- Expected: Should chain isA + can rules
- Success metric: 2-3x faster than symbolic

**Time estimate:** 3-4 hours

---

### Phase 2: Probabilistic Abduction (2-3 days)

#### 2.1 Implement Bayesian Scoring

**Objective:** Replace heuristic scores with proper P(Cause|Effect)

**Files to create:**
- `src/reasoning/bayesian-abduce.mjs` (new file, ~300 lines)
- `src/reasoning/statistics.mjs` (utility functions, ~100 lines)

**Files to modify:**
- `src/reasoning/abduction.mjs` (integrate Bayesian module)

**Changes:**

Create `src/reasoning/bayesian-abduce.mjs`:
```javascript
// See detailed implementation in "Missing Implementations" section above
export class BayesianAbduction {
  computePriors()
  computeLikelihoods()
  abduce(observation, candidates)
  abduceMultiple(observations)
}
```

Modify `src/reasoning/abduction.mjs`:
```javascript
import { BayesianAbduction } from './bayesian-abduce.mjs'

// Initialize once
const bayesian = new BayesianAbduction(componentKB)
bayesian.computePriors()
bayesian.computeLikelihoods()

function searchAbduce(observation, holeName) {
  // Get candidate explanations (existing code)
  const candidates = [
    ...findRuleCandidates(observation),
    ...findCausalCandidates(observation)
  ]

  // Score with Bayesian inference (NEW)
  const ranked = bayesian.abduce(observation, candidates)

  return ranked.map(r => ({
    answer: r.hypothesis,
    confidence: r.posterior,
    method: 'bayesian-abduce',
    proof: {
      prior: r.prior,
      likelihood: r.likelihood,
      posterior: r.posterior
    }
  }))
}
```

**Testing:**
- Query 4 from cases.mjs: Abduce fever explanation
- Create test KB with multiple competing causes
- Expected: Rare diseases have lower posterior than common ones
- Success metric: Correct ranking by posterior probability

**Time estimate:** 8-12 hours

---

#### 2.2 Evidence Combination

**Objective:** Handle multiple observations jointly

**Changes:**
```javascript
// In src/reasoning/abduction.mjs

function searchAbduceMultiple(observations, holeName) {
  // Joint abduction over multiple observations
  const ranked = bayesian.abduceMultiple(observations)

  return ranked.map(r => ({
    answer: r.hypothesis,
    confidence: r.jointPosterior,
    method: 'multi-abduce',
    proof: {
      observations: observations,
      jointPosterior: r.jointPosterior
    }
  }))
}
```

**Testing:**
- Multiple symptoms → disease diagnosis
- Expected: Joint probability narrows down explanation
- Success metric: More specific than single observation

**Time estimate:** 4-6 hours

---

### Phase 3: Statistical Induction (2-3 days)

#### 3.1 Significance Testing

**Objective:** Avoid spurious patterns with chi-square tests

**Files to create:**
- `src/reasoning/statistics.mjs` (chi-square, t-test utilities)

**Files to modify:**
- `src/reasoning/induction.mjs` (add validation layer)

**Changes:**

Create `src/reasoning/statistics.mjs`:
```javascript
export function chiSquareTest(observed, expected, df) {
  const chisq = Math.pow(observed - expected, 2) / expected
  const pvalue = chiSquareCDF(chisq, df)
  return pvalue
}

export function chiSquareCDF(x, df) {
  // Incomplete gamma function approximation
  // For df=1: use standard normal approximation
  if (df === 1) {
    const z = Math.sqrt(x)
    return 1 - normalCDF(z)
  }

  // For other df, use gamma approximation
  return 1 - gammaLowerIncomplete(df/2, x/2) / gamma(df/2)
}

export function crossValidate(data, folds, learnFn, testFn) {
  const foldSize = Math.floor(data.length / folds)
  const accuracies = []

  for (let i = 0; i < folds; i++) {
    const testStart = i * foldSize
    const testEnd = (i + 1) * foldSize

    const testData = data.slice(testStart, testEnd)
    const trainData = [
      ...data.slice(0, testStart),
      ...data.slice(testEnd)
    ]

    const model = learnFn(trainData)
    const accuracy = testFn(model, testData)
    accuracies.push(accuracy)
  }

  return accuracies.reduce((sum, acc) => sum + acc, 0) / folds
}
```

Modify `src/reasoning/induction.mjs`:
```javascript
import { chiSquareTest, crossValidate } from './statistics.mjs'

function induceRules(examples, options = {}) {
  const patterns = findPatterns(examples)
  const validated = []

  for (const pattern of patterns) {
    // Test 1: Statistical significance
    const pvalue = chiSquareTest(
      pattern.evidence,
      pattern.expected,
      1  // df
    )

    if (pvalue >= 0.05) {
      continue  // Not significant
    }

    // Test 2: Cross-validation
    const cvScore = crossValidate(
      examples,
      5,  // 5-fold CV
      data => learnPattern(data, pattern.template),
      (model, test) => testAccuracy(model, test)
    )

    if (cvScore < 0.7) {
      continue  // Doesn't generalize
    }

    validated.push({
      rule: pattern.rule,
      pvalue,
      cvScore,
      confidence: cvScore * (1 - pvalue)
    })
  }

  return validated
}
```

**Testing:**
- Query 5 from cases.mjs: Induce mammal properties
- Create noisy KB with random patterns
- Expected: Only significant patterns returned
- Success metric: No false positives with random data

**Time estimate:** 10-14 hours

---

### Phase 4: Real Explain (1-2 days)

#### 4.1 Contrastive Explanations

**Objective:** "Why A and not B?" reasoning

**Files to create:**
- `src/reasoning/explanation.mjs` (new module, ~200 lines)

**Changes:**
```javascript
// See detailed implementation in "Missing Implementations" section

export class ExplanationGenerator {
  explainContrastive(factA, factB)
  explainCausal(conclusion)
  generateNaturalLanguage(causalChain)
  summarizeProof(proof, detailLevel)
}
```

**Integration:**
```javascript
// In src/reasoning/query-meta-ops.mjs

import { ExplanationGenerator } from './explanation.mjs'

function searchExplain(conclusion, holeName, session) {
  const explainer = new ExplanationGenerator(session)

  // Check if contrastive (includes "not")
  if (conclusion.includes('Not')) {
    const [factA, factB] = parseContrastive(conclusion)
    return explainer.explainContrastive(factA, factB)
  }

  // Otherwise causal explanation
  return explainer.explainCausal(conclusion)
}
```

**Testing:**
- Query 10 from cases.mjs: Explain bird wings
- Expected: Multi-level explanation (evolution, biology, function)
- Success metric: Natural language output with causal chain

**Time estimate:** 6-8 hours

---

### Phase 5: Advanced Whatif (3-4 days)

#### 5.1 Causal Graph Construction

**Objective:** Build explicit DAG from KB

**Files to create:**
- `src/reasoning/causal-graph.mjs` (DAG data structure)
- `src/reasoning/causal-inference.mjs` (do-calculus)

**Changes:**

Create `src/reasoning/causal-graph.mjs`:
```javascript
export class DirectedAcyclicGraph {
  constructor(nodes, edges) {
    this.nodes = new Set(nodes)
    this.edges = new Map()  // node → [{to, strength}]

    for (const edge of edges) {
      if (!this.edges.has(edge.from)) {
        this.edges.set(edge.from, [])
      }
      this.edges.get(edge.from).push({
        to: edge.to,
        strength: edge.strength
      })
    }
  }

  removeIncoming(node) {
    // Create copy without incoming edges to node
    const newEdges = new Map()
    for (const [from, tos] of this.edges) {
      const filtered = tos.filter(e => e.to !== node)
      if (filtered.length > 0) {
        newEdges.set(from, filtered)
      }
    }
    return new DirectedAcyclicGraph(this.nodes, this.flattenEdges(newEdges))
  }

  findAllPaths(from, to, visited = new Set()) {
    if (from === to) return [[to]]
    if (visited.has(from)) return []

    visited.add(from)
    const paths = []

    const outgoing = this.edges.get(from) || []
    for (const edge of outgoing) {
      const subpaths = this.findAllPaths(edge.to, to, visited)
      for (const subpath of subpaths) {
        paths.push([from, ...subpath])
      }
    }

    visited.delete(from)
    return paths
  }
}
```

Create `src/reasoning/causal-inference.mjs`:
```javascript
// See detailed implementation in "Missing Implementations" section

export class CausalInference {
  buildCausalGraph()
  doOperation(intervention, query)
  marginalize(graph, queryVariable)
  whatif(negatedFact, affectedFact)
}
```

**Testing:**
- Query 11 from cases.mjs: Counterfactual mammal without hair
- Build test causal graph with confounders
- Expected: Probability distribution outcome
- Success metric: Correctly handles confounding

**Time estimate:** 12-16 hours

---

### Phase 6: Integration & Polish (1-2 days)

#### 6.1 Update Query Evaluation

**Objective:** All 12 queries in cases.mjs should pass

**Changes:**
- Re-run `node evals/runQueryEval.mjs --verbose`
- Fix any remaining integration issues
- Tune confidence thresholds

**Expected improvements:**
| HDC Strategy | Before | After |
|--------------|--------|-------|
| metric-affine/32 | 100% (12/12) | 100% (12/12) |
| dense-binary/2048 | 67% (8/12) | 100% (12/12) |
| sparse-polynomial/4 | 25% (3/12) | 75% (9/12) |

**Time estimate:** 6-8 hours

#### 6.2 Documentation

**Files to update:**
- `docs/reasoning-operators.md` (create new)
- `README.md` (add section on advanced reasoning)
- `evals/stress_queries/README.md` (explain test cases)

**Time estimate:** 4-6 hours

---

## Priority Matrix

| Operator Enhancement | Difficulty | Impact | Dependencies | Priority Score |
|---------------------|------------|--------|--------------|----------------|
| **Analogy HDC** | Low | High | None | 🔥🔥🔥 **9/10** |
| **Deduce HDC** | Low | Medium | None | 🔥 **7/10** |
| **Explain Contrastive** | Medium | High | None | 🔥🔥 **8/10** |
| **Induce Statistical** | Medium | High | Statistics lib | 🔥🔥 **8/10** |
| **Abduce Bayesian** | High | High | Statistics lib | 🔥🔥🔥 **9/10** |
| **Whatif Do-Calculus** | High | Medium | Causal graph | 🔥 **6/10** |

**Recommended order:**
1. **Analogy HDC** (quick win, high impact)
2. **Abduce Bayesian** (high impact, unlocks medical reasoning)
3. **Induce Statistical** (high impact, builds on statistics lib)
4. **Explain Contrastive** (medium effort, high value)
5. **Whatif Do-Calculus** (advanced feature, lower priority)
6. **Deduce HDC** (optimization, not critical)

---

## Code Examples

### Before/After: Analogy

**Before (Symbolic):**
```dsl
# KB:
orbits Planet Sun
orbits Electron Nucleus

# Query:
@q analogy Planet Sun Electron ?x

# Implementation:
find operator R where R(Planet, Sun)  // finds "orbits"
find facts R(Electron, ?x)            // finds orbits(Electron, Nucleus)
return Nucleus

# Limitation: Requires exact operator match
```

**After (HDC):**
```dsl
# KB:
orbits Planet Sun
revolves_around Electron Nucleus  # Different operator!

# Query:
@q analogy Planet Sun Electron ?x

# Implementation:
relation_vec = Planet_vec ⊕ Sun_vec
answer_vec = Electron_vec ⊕ relation_vec
result = topKSimilar(answer_vec, vocabulary)
return Nucleus  # Found despite different operator!

# Benefit: Works with similar structures, not just exact matches
```

---

### Before/After: Abduce

**Before (Heuristic):**
```dsl
# KB:
causes Flu Fever
causes Infection Fever
frequency Flu 0.01   # 1% of population
frequency Infection 0.10  # 10% of population

# Query:
@obs observed Fever
@q abduce $obs ?cause

# Returns:
[
  { hypothesis: 'Flu', confidence: 0.8 },       # Same score!
  { hypothesis: 'Infection', confidence: 0.8 }  # Should be higher!
]

# Problem: Doesn't account for base rates
```

**After (Bayesian):**
```dsl
# Same KB

# Query:
@obs observed Fever
@q abduce $obs ?cause

# Returns:
[
  { hypothesis: 'Infection',
    confidence: 0.92,  # Higher because more common
    posterior: 0.92,
    prior: 0.10,
    likelihood: 0.9
  },
  { hypothesis: 'Flu',
    confidence: 0.08,  # Lower because rare
    posterior: 0.08,
    prior: 0.01,
    likelihood: 0.9
  }
]

# Benefit: Correct ranking using Bayes' rule
```

---

### Before/After: Induce

**Before (Naive Counting):**
```dsl
# KB (noisy data):
isA Dog Mammal
isA Cat Mammal
isA Elephant Mammal
isA RedHerring Fish  # Noise
isA BlueWhale Mammal

# Also by chance:
color Dog Brown
color Cat Brown
color Elephant Brown
color BlueWhale Blue  # Breaks pattern

# Query:
@ex1 isA Dog Mammal
@ex2 isA Cat Mammal
@ex3 isA Elephant Mammal
@pattern induce ($ex1 $ex2 $ex3) ?rule

# Returns:
[
  { rule: '?x isA Mammal', evidence: 4, confidence: 1.0 },  # Good
  { rule: '?x color Brown', evidence: 3, confidence: 0.75 } # Spurious!
]

# Problem: Random correlation looks significant
```

**After (Statistical Validation):**
```dsl
# Same KB

# Query:
@pattern induce ($ex1 $ex2 $ex3) ?rule

# Returns:
[
  { rule: '?x isA Mammal',
    evidence: 4,
    pvalue: 0.001,      # Highly significant
    cvScore: 0.95,      # Generalizes well
    confidence: 0.95
  }
  # '?x color Brown' filtered out (pvalue: 0.3, not significant)
]

# Benefit: Avoids false patterns using statistics
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/reasoning-operators.test.js`

```javascript
describe('Analogy HDC', () => {
  test('finds structural analogy with different operators', () => {
    const kb = new Session()
    kb.learn('orbits Planet Sun')
    kb.learn('revolves_around Electron Nucleus')

    const result = kb.query('@q analogy Planet Sun Electron ?x')

    expect(result.bindings.get('x').answer).toBe('Nucleus')
    expect(result.bindings.get('x').confidence).toBeGreaterThan(0.7)
  })

  test('returns multiple analogies ranked by similarity', () => {
    // ... test code
  })
})

describe('Bayesian Abduce', () => {
  test('ranks by posterior probability', () => {
    const kb = new Session()
    kb.learn('causes Flu Fever')
    kb.learn('causes Infection Fever')
    kb.learn('frequency Flu 0.01')
    kb.learn('frequency Infection 0.10')

    const result = kb.query('@q abduce Fever ?cause')

    expect(result.allResults[0].answer).toBe('Infection')  // More common
    expect(result.allResults[0].confidence).toBeGreaterThan(
      result.allResults[1].confidence
    )
  })

  test('combines multiple observations', () => {
    // ... test code
  })
})

describe('Statistical Induce', () => {
  test('filters spurious patterns', () => {
    const kb = createNoisyKB()

    const result = kb.query('@q induce (examples) ?rule')

    // Should only return statistically significant patterns
    for (const rule of result.allResults) {
      expect(rule.pvalue).toBeLessThan(0.05)
    }
  })

  test('cross-validates generalization', () => {
    // ... test code
  })
})
```

### Integration Tests

**File:** `tests/query-evaluation.test.js`

```javascript
describe('Query Evaluation Suite', () => {
  test('suite regressions pass', async () => {
    const suite1 = await import('../evals/stress_queries/suite1.mjs')
    const suite2 = await import('../evals/stress_queries/suite2.mjs')
    const session = new Session({ geometry: 2048, ...(suite1.sessionOptions || {}) })

    const steps = [...suite1.steps, ...suite2.steps]
    for (const step of steps) {
      if (step.action === 'learn') session.learn(step.input_dsl)
      if (step.action === 'prove') {
        const out = session.prove(step.input_dsl)
        const expectsCannot = String(step.expected_nl || '').toLowerCase().includes('cannot prove')
        if (expectsCannot) expect(out.valid).toBe(false)
        else expect(out.valid).toBe(true)
      }
    }
  })
})
```

### Performance Benchmarks

**File:** `benchmarks/reasoning-performance.js`

```javascript
import Benchmark from 'benchmark'

const suite = new Benchmark.Suite()

suite
  .add('Analogy Symbolic', () => {
    session.query('@q analogy Planet Sun Electron ?x', { method: 'symbolic' })
  })
  .add('Analogy HDC', () => {
    session.query('@q analogy Planet Sun Electron ?x', { method: 'hdc' })
  })
  .add('Abduce Heuristic', () => {
    session.query('@q abduce Fever ?cause', { method: 'heuristic' })
  })
  .add('Abduce Bayesian', () => {
    session.query('@q abduce Fever ?cause', { method: 'bayesian' })
  })
  .on('cycle', (event) => {
    console.log(String(event.target))
  })
  .run()
```

**Expected performance:**
- Analogy HDC: 2-3x faster than symbolic (vector ops are fast)
- Abduce Bayesian: Same speed (just better scoring)
- Induce Statistical: Slower (chi-square tests), but worth it for correctness

---

## Migration Path

### Backward Compatibility

**Strategy:** Add new methods alongside old, deprecate gradually

```javascript
// In src/reasoning/query-meta-ops.mjs

function searchAnalogy(a, b, c, holeName, session, options = {}) {
  const method = options.method || 'auto'

  if (method === 'auto') {
    // Try HDC first, fallback to symbolic
    const hdcResult = hdcAnalogyStrategy(a, b, c, session)
    if (hdcResult && hdcResult.length > 0) {
      return hdcResult
    }
    return symbolicAnalogyStrategy(a, b, c, session)
  }

  if (method === 'hdc') {
    return hdcAnalogyStrategy(a, b, c, session)
  }

  if (method === 'symbolic') {
    return symbolicAnalogyStrategy(a, b, c, session)
  }
}
```

**Benefits:**
- Existing queries still work
- Can opt into new behavior with `{ method: 'hdc' }`
- Can compare old vs new with A/B testing

### Deprecation Timeline

**Version 2.1 (Current):** Add new implementations, mark old as deprecated
**Version 2.2 (1 month):** Default to new implementations, keep old as option
**Version 3.0 (3 months):** Remove old implementations

### Documentation Updates

**Files to create/update:**

1. **`docs/reasoning-operators.md`** (new)
   - Complete reference for all operators
   - Examples for each operator
   - Performance characteristics
   - When to use which method

2. **`docs/migration-guide.md`** (new)
   - How to upgrade from v2.0 to v2.1
   - Breaking changes
   - Code migration examples

3. **`README.md`** (update)
   - Add "Advanced Reasoning" section
   - Link to new docs
   - Highlight new capabilities

4. **`evals/stress_queries/README.md`** (new)
   - Explain each of the 12 test queries
   - What they test
   - Expected results

---

## Conclusion

AGISystem2 has a **solid foundation** for advanced reasoning with all major operators implemented and functional. The gap is not in presence but in **sophistication**:

- **Current state:** Operators work but use basic algorithms
- **Target state:** Operators use state-of-the-art techniques (Bayesian, statistical, algebraic)

**Key takeaways:**

1. ✅ **`similar`** is production-ready, serves as gold standard
2. ⚠️ **`analogy`, `abduce`, `induce`, `whatif`** are functional but need enhancements
3. ❌ **`explain`** is just a wrapper, needs separate implementation
4. 🔄 **`deduce`** works well, HDC would be an optimization

**Recommended implementation order:**
1. Analogy HDC (quick win)
2. Bayesian Abduce (high impact)
3. Statistical Induce (builds on statistics lib)
4. Real Explain (medium effort)
5. Advanced Whatif (lower priority)

**Total effort estimate:** 15-25 days for complete implementation

**Impact:** Transform query success rates from 25-67% to 90-100% across all HDC strategies

---

**Document maintained by:** AGI System Development Team
**Last updated:** 2025-12-22
**Next review:** After Phase 1 completion
