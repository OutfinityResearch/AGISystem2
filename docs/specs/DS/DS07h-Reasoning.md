# AGISystem2 - System Specifications

# Chapter 7h: Reasoning Verbs & Meta-Operators

**Document Version:** 1.0
**Status:** Draft Specification
**Part Of:** DS07 Core Theory (refactored)
**Config File:** `config/Core/12-reasoning.sys2`
**Related:** [DS17 Meta-Query Operators](DS17-Meta-Query-Operators.md)

---

## 7h.1 Overview

This document specifies the **Reasoning Verbs** - meta-level operations for higher-order inference. These include:

1. **Reasoning Type Atoms**: Abduction, Induction, Deduction, Analogy
2. **Reasoning Graphs**: abduce, induce, deduce, whatif, analogy, similar, explain
3. **Meta-Query Operators**: Operations with dual-layer architecture (see DS17)

---

## 7h.2 Reasoning Type Atoms

Defined in `config/Core/12-reasoning.sys2`:

```sys2
@Abduction:Abduction __Action   # Find best explanation
@Induction:Induction __Action   # Learn from examples
@Deduction:Deduction __Action   # Derive from premises
@Analogy:Analogy __Action       # Proportional reasoning
```

---

## 7h.3 Reasoning Graphs

### 7h.3.1 abduce - Abductive Reasoning

Find the best explanation for an observation.

```sys2
# Types: observation:Event|State -> explanation:Event
@AbduceGraph:abduce graph observation
    @eid __Event
    @r1 __Role Action Abduction
    @r2 __Role Theme $observation
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Example:**
```sys2
# Observation: The grass is wet
@obs inState Grass Wet

# Abduce: Why is the grass wet?
@explanation abduce $obs
# Possible explanations: It rained, Sprinklers were on
```

### 7h.3.2 induce - Inductive Reasoning

Learn a rule from examples.

```sys2
# Types: examples:Bundle -> rule:Implies
@InduceGraph:induce graph examples
    @eid __Event
    @r1 __Role Action Induction
    @r2 __Role Theme $examples
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Example:**
```sys2
# Examples
@e1 has Sparrow Wings
@e2 has Robin Wings
@e3 has Eagle Wings

# Induce
@pattern induce [$e1, $e2, $e3]
# Result: Birds have wings
```

### 7h.3.3 deduce - Deductive Reasoning

Derive a conclusion from premises.

```sys2
# Types: premises:Bundle -> conclusion:Abstract
@DeduceGraph:deduce graph premises
    @eid __Event
    @r1 __Role Action Deduction
    @r2 __Role Theme $premises
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Example:**
```sys2
# Premises
@p1 implies (isA ?X Mammal) (has ?X Fur)
@p2 isA Dog Mammal

# Deduce
@conclusion deduce (__Bundle $p1 $p2)
# Result: Dogs have fur
```

### 7h.3.4 whatif - Counterfactual Reasoning

Explore alternative scenarios.

```sys2
# Types: world:Bundle, fact:Event -> alternativeWorld:Bundle
@WhatIfGraph:whatif graph world fact
    @eid __Event
    @r1 __Role Theme $world
    @r2 __Role Content $fact
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Example:**
```sys2
# Current world has: John has job, John has salary
# What if John doesn't have job?
@alt whatif CurrentWorld (not (has John Job))
# Result: World without John having salary
```

### 7h.3.5 analogy - Analogical Reasoning

A is to B as C is to D.

```sys2
# Types: a:Entity, b:Entity, c:Entity -> d:Entity
@AnalogyGraph:analogy graph a b c
    @rel ___Bind $a $b
    @result ___Bind $c $rel
    return $result
end
```

**Example:**
```sys2
# France:Paris :: Germany:?
@answer analogy France Paris Germany
# Result: Berlin
```

### 7h.3.6 similar - Similarity Search

Find similar concepts.

```sys2
# Types: query:Any, vocabulary:Bundle -> matches:Bundle
@SimilarGraph:similar graph query vocabulary
    @result ___MostSimilar $query $vocabulary
    return $result
end
```

**Example:**
```sys2
# Find things similar to Car
@matches similar Car Vehicles
# Result: Truck, Van, Bus (ranked by similarity)
```

### 7h.3.7 explain - Explanation Generation

Generate explanation for a conclusion.

```sys2
# Types: conclusion:Abstract -> explanation:Bundle
@ExplainGraph:explain graph conclusion
    @eid __Event
    @r1 __Role Theme $conclusion
    @r2 __Role Action Deduction
    @result __Bundle $eid $r1 $r2
    return $result
end
```

---

## 7h.4 Dual-Layer Architecture

Meta-query operators like `similar`, `induce`, and `bundle` have a **dual-layer architecture**:

### Layer 1: Declaration (Core Theory)

```sys2
# In 12-reasoning.sys2
@SimilarGraph:similar graph query vocabulary
    @result ___MostSimilar $query $vocabulary
    return $result
end
```

This:
- Gives the operator a **vocabulary atom**
- Enables **synonym support** (e.g., "alike" → "similar")
- Allows **composition** in larger queries

### Layer 2: Implementation (Query Engine)

```javascript
// In src/reasoning/query.mjs
if (operatorName === 'similar' && knowns.length === 1 && holes.length === 1) {
  return this.searchSimilar(knowns[0], holes[0]);
}
```

This:
- Provides **computational semantics**
- Implements **efficient algorithms**
- Returns **structured results**

### Why Dual-Layer?

1. **Vocabulary Integration**: Operators are first-class atoms
2. **Synonym Support**: Can define `alike` as synonym of `similar`
3. **Composability**: Pattern `similar (bundle [A,B]) ?X` works
4. **Efficient Execution**: Code implementation avoids graph overhead

---

## 7h.5 Link to DS17

For detailed specifications of meta-query operators, see [DS17 Meta-Query Operators](DS17-Meta-Query-Operators.md):

| Operator | Purpose | DS17 Section |
|----------|---------|--------------|
| `similar` | Find concepts with shared properties | 17.3.1 |
| `induce` | Extract common properties | 17.3.2 |
| `bundle` | Create superposition vector | 17.3.3 |
| `difference` | Find distinguishing properties | 17.3.4 |
| `analogy` | A:B :: C:? reasoning | 17.3.5 |

---

## 7h.6 Reasoning Summary

| Verb | Type | Purpose | Implemented |
|------|------|---------|-------------|
| `abduce` | Graph | Find explanation | Partial |
| `induce` | Meta-Op | Pattern extraction | Yes |
| `deduce` | Graph | Derive conclusion | Via proof engine |
| `whatif` | Graph | Counterfactual | Partial |
| `analogy` | Meta-Op | Proportional reasoning | Partial |
| `similar` | Meta-Op | Similarity search | Yes |
| `explain` | Graph | Generate explanation | Partial |
| `bundle` | Meta-Op | Create superposition | Yes |
| `difference` | Meta-Op | Find differences | Planned |

---

## 7h.7 Implementation Files

| File | Purpose |
|------|---------|
| `config/Core/12-reasoning.sys2` | Atom and graph definitions |
| `src/reasoning/query.mjs` | `similar` operator |
| `src/runtime/executor.mjs` | `induce`, `bundle` operators |
| `src/reasoning/prove.mjs` | Deduction/proof engine |

---

*End of DS07h - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
