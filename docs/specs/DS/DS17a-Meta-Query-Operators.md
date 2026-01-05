# AGISystem2 - System Specifications

# Chapter 17a: Meta-Query Operators

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Depends On:** DS02 (DSL Syntax), DS05 (Basic Reasoning), DS06 (Advanced Reasoning)

---

## 17a.1 Overview

This document specifies **meta-query operators** - special DSL operators that perform complex reasoning computations beyond simple KB lookup. These operators are:

1. **Declared in Core Theory** (12-reasoning.sys2) - gives them vocabulary atoms
2. **Implemented in Query Engine** - provides computational semantics
3. **Composable** - can be used in larger queries

| Operator | Purpose | Input | Output |
|----------|---------|-------|--------|
| `similar` | Find concepts with shared properties | Entity | Ranked entity list |
| `induce` | Extract common properties | Entity list | Pattern vector |
| `bundle` | Create superposition vector | Entity list | Bundled vector |
| `difference` | Find distinguishing properties | Two entities | Property list |
| `analogy` | A:B :: C:? reasoning | Three entities | Entity |

---

## 17a.2 Architectural Design

### 17a.2.1 Dual-Layer Architecture

**Layer 1: Declaration (Core Theory)**
```sys2
# In 12-reasoning.sys2
@Abduction:Abduction __Action
@Induction:Induction __Action
@Analogy:Analogy __Action

@SimilarGraph:similar graph query vocabulary
    @result ___MostSimilar $query $vocabulary
    return $result
end
```

**Layer 2: Implementation (Query Engine)**
```javascript
// In query.mjs
if (operatorName === 'similar') {
  return this.searchSimilar(knowns[0], holes[0]);
}
```

### 17a.2.2 Why Dual-Layer?

1. **Vocabulary Integration**: Declaring in theory gives operators vocabulary atoms
2. **Synonym Support**: Can define `alike` as synonym of `similar`
3. **Composability**: Pattern `similar (bundle [A,B]) ?X` works
4. **Efficient Execution**: Code implementation avoids graph overhead

---

## 17a.3 Operator Specifications

### 17a.3.1 `similar` - Property-Based Similarity

**Syntax:**
```sys2
@result similar <entity> ?X
```

**Semantics:**
Finds entities that share properties with the query entity. Similarity score = shared_properties / max(props_A, props_B).

**Example:**
```sys2
# KB
has Car Wheels
has Car Engine
isA Car Vehicle
has Truck Wheels
has Truck Engine
isA Truck Vehicle
has Bicycle Wheels
isA Bicycle Vehicle

# Query
@q similar Car ?X
# Result: X = Truck (sim=1.0), X = Bicycle (sim=0.67)
```

**Implementation Notes:**
- Uses ComponentKB for efficient property lookup
- Computes Jaccard-like similarity on property sets
- Returns top-K results sorted by similarity

### 17a.3.2 `induce` - Pattern Extraction

**Syntax:**
```sys2
@pattern induce [entity1, entity2, ...]
```

**Semantics:**
Creates a pattern vector representing the **intersection** of properties across all input entities. The pattern can then be queried.

**Example:**
```sys2
# KB
has Mammal1 Fur
has Mammal1 WarmBlood
feeds Mammal1 Milk
has Mammal2 Fur
has Mammal2 WarmBlood
feeds Mammal2 Milk

# Induce
@mammalPattern induce [Mammal1, Mammal2]
# Result: pattern with {has:Fur, has:WarmBlood, feeds:Milk}

# Query the pattern
@q has $mammalPattern ?prop
# Result: prop = {Fur, WarmBlood}
```

**Implementation Notes:**
- Collects properties for each entity
- Computes set intersection
- Bundles common property vectors into pattern

### 17a.3.3 `bundle` - Vector Superposition

**Syntax:**
```sys2
@pattern bundle [entity1, entity2, ...]
```

**Semantics:**
Creates a superposition of entity vectors. Unlike `induce`, this preserves ALL properties (union, not intersection).

**Example:**
```sys2
@birdPattern bundle [Sparrow, Robin, Eagle]
# Result: pattern containing all bird properties

@q can $birdPattern ?ability
# Result: may find Fly, Chirp, Hunt, etc.
```

**HDC Properties:**
- Bundle maintains retrievability: unbind(bundle(A,B,C), A) ≈ bundle(B,C)
- Noise increases with bundle size
- Best for 3-7 items

### 17a.3.4 `difference` - Distinguishing Properties

**Syntax:**
```sys2
@diff difference <entityA> <entityB>
```

**Semantics:**
Returns properties that A has but B doesn't have.

**Example:**
```sys2
# KB
has Car Wheels
has Car Engine
has Car Doors
has Bicycle Wheels
has Bicycle Pedals

@diff difference Car Bicycle
# Result: {has:Engine, has:Doors}
```

### 17a.3.5 `analogy` - Proportional Reasoning

**Syntax:**
```sys2
@result analogy <A> <B> <C> ?D
```

**Semantics:**
Implements "A is to B as C is to D" reasoning using HDC operations:
```
D = B BIND A⁻¹ BIND C
```

**Example:**
```sys2
# KB
capitalOf France Paris
capitalOf Germany Berlin
capitalOf Italy Rome

@result analogy France Paris Germany ?X
# Result: X = Berlin (France:Paris :: Germany:Berlin)
```

---

## 17a.4 Fact Levels and Meta-Operations

### 17a.4.1 Fact Level Hierarchy

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Atoms (primitives) | `Dog`, `Animal`, `Fly` |
| 1 | Simple facts | `isA Dog Animal` |
| 2 | Rules | `ForAll ?X: isA ?X Mammal Implies has ?X Fur` |
| 3 | Meta-facts | `inducePattern [sources: [M1,M2]] [props: [Fur,WarmBlood]]` |

### 17a.4.2 Meta-Operator Results

Meta-operators (`similar`, `induce`, `bundle`) produce **Level 3 facts** with rich metadata:

```javascript
{
  name: 'mammalPattern',
  vector: <bundled HDC vector>,
  metadata: {
    operator: 'inducePattern',
    sources: ['Mammal1', 'Mammal2', 'Mammal3'],
    commonProperties: [
      { operator: 'has', arg: 'Fur' },
      { operator: 'has', arg: 'WarmBlood' }
    ],
    propertyCount: 2
  }
}
```

---

## 17a.5 DSL→NL Decoding

Meta-operator results should decode to natural language:

| Operator | DSL Result | NL Output |
|----------|-----------|-----------|
| similar | `X = Truck (0.95)` | "Car is most similar to Truck" |
| induce | `pattern: {Fur, WarmBlood}` | "Common properties: has Fur, has WarmBlood" |
| difference | `diff: {Engine}` | "Car has Engine, Bicycle does not" |
| analogy | `D = Berlin` | "As France is to Paris, Germany is to Berlin" |

---

## 17a.6 Integration with Core Theory

### 17a.6.1 Required Atoms (12-reasoning.sys2)

```sys2
# Reasoning type atoms
@Abduction:Abduction __Action
@Induction:Induction __Action
@Deduction:Deduction __Action
@Analogy:Analogy __Action

# Meta-operator graphs (semantic declaration)
@SimilarGraph:similar graph query vocabulary
    @result ___MostSimilar $query $vocabulary
    return $result
end

@InduceGraph:induce graph examples
    @eid __Event
    @r1 __Role Action Induction
    @r2 __Role Theme $examples
    @result __Bundle $eid $r1 $r2
    return $result
end
```

### 17a.6.2 Primitive Placeholders

The graphs use primitive placeholders (`___MostSimilar`, etc.) that are implemented by the Query Engine. This separates:
- **Declaration**: What the operator means (in theory)
- **Implementation**: How to compute it (in code)

---

## 17a.7 Future Extensions

### 17a.7.1 Planned Operators

| Operator | Purpose |
|----------|---------|
| `explain` | Generate proof chain for conclusion |
| `counterfactual` | What if X were not true? |
| `abstract` | Generalize from specific to category |
| `specialize` | Find most specific match |

### 17a.7.2 Compositional Queries

Future support for nested operators:
```sys2
# Find things similar to the common mammal pattern
@q similar (induce [Dog, Cat, Horse]) ?X
```

---

## 17a.8 Implementation Checklist

- [x] `similar` operator in QueryEngine
- [x] `induce` operator in Executor
- [x] `bundle` operator in Executor
- [ ] `difference` operator
- [ ] `analogy` operator
- [ ] DSL→NL decoding for meta-operators
- [ ] Synonym support for operators
- [ ] Compositional query support

---

*End of DS17a*
