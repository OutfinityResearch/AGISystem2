# AGISystem2 - System Specifications

# Chapter 7d: Logic Primitives

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 Kernel Pack (refactored; formerly Core)
**Pack File (canonical):** `config/Packs/Logic/05-logic.sys2`

---

## 7d.1 Overview

This document specifies the **Logic Primitives** of AGISystem2 - the logical connectives and quantifiers that enable formal reasoning. These include:

1. **Propositional logic**: And, Or, Not, Implies, Iff, Xor
2. **Quantifiers**: ForAll, Exists
3. **Negation types**: Structural vs semantic

---

## 7d.2 Logic Atoms

Defined in the Logic pack (`config/Packs/Logic/05-logic.sys2`):

```sys2
@Implies:Implies __Relation
@And:And __Relation
@Or:Or __Relation
@Not:Not __Relation
@Iff:Iff __Relation
@Xor:Xor __Relation
@ForAll:ForAll __Relation
@Exists:Exists __Relation
```

---

## 7d.3 Logic Graphs

### 7d.3.1 Implication

```sys2
# Implication: antecedent -> consequent
@ImpliesGraph:implies graph antecedent consequent
    @pair __Pair $antecedent $consequent
    @result __Role Implies $pair
    return $result
end
```

**Usage:**
```sys2
@rule implies (isA ?X Bird) (can ?X Fly)
# "All birds can fly"
```

### 7d.3.2 Conjunction (And)

```sys2
# Conjunction: a AND b
@AndGraph:and graph a b
    @pair __Pair $a $b
    @result __Role And $pair
    return $result
end
```

**Usage:**
```sys2
@cond and (isA ?X Bird) (not (isA ?X Penguin))
# "X is a bird AND X is not a penguin"
```

### 7d.3.3 Disjunction (Or)

```sys2
# Disjunction: a OR b
@OrGraph:or graph a b
    @pair __Pair $a $b
    @result __Role Or $pair
    return $result
end
```

**Usage:**
```sys2
@cond or (isA ?X Cat) (isA ?X Dog)
# "X is a cat OR X is a dog"
```

### 7d.3.4 Negation (Not)

```sys2
# Negation: NOT proposition
@NotGraph:not graph proposition
    @result __Role Not $proposition
    return $result
end
```

**Usage:**
```sys2
@neg not (can Penguin Fly)
# "Penguin cannot fly"
```

### 7d.3.5 Biconditional (Iff)

```sys2
# Biconditional: a IFF b
@IffGraph:iff graph a b
    @pair __Pair $a $b
    @result __Role Iff $pair
    return $result
end
```

**Usage:**
```sys2
@equiv iff (isA ?X Bachelor) (and (isA ?X Man) (not (isMarried ?X)))
# "X is a bachelor if and only if X is an unmarried man"
```

### 7d.3.6 Exclusive Or (Xor)

```sys2
# Exclusive or: a XOR b
@XorGraph:xor graph a b
    @pair __Pair $a $b
    @result __Role Xor $pair
    return $result
end
```

**Usage:**
```sys2
@choice xor (goLeft ?X) (goRight ?X)
# "X goes left XOR X goes right (but not both)"
```

---

## 7d.4 Quantifiers

### 7d.4.1 Universal Quantifier (ForAll)

```sys2
# Universal: for all X, predicate holds
@ForAllGraph:forall graph variable predicate
    @quant __Role ForAll $variable
    @scope __Role Scope $predicate
    @result __Bundle $quant $scope
    return $result
end
```

**Usage:**
```sys2
@rule forall ?X (implies (isA ?X Mammal) (has ?X Fur))
# "For all X: if X is a mammal, then X has fur"
```

### 7d.4.2 Existential Quantifier (Exists)

```sys2
# Existential: there exists X such that predicate
@ExistsGraph:exists graph variable predicate
    @quant __Role Exists $variable
    @scope __Role Scope $predicate
    @result __Bundle $quant $scope
    return $result
end
```

**Usage:**
```sys2
@claim exists ?X (and (isA ?X Dog) (color ?X White))
# "There exists an X such that X is a white dog"
```

---

## 7d.5 Negation in Depth

### 7d.5.1 Two Types of Negation

| Type | Operator | Level | Effect |
|------|----------|-------|--------|
| Structural | `___Not` | HDC (L0) | Flip all bits → maximally dissimilar |
| Semantic | `not` | Logic | Creates logical negation concept |

### 7d.5.2 Structural Negation (HDC Level)

```sys2
@inverted ___Not $vector
# Flips all bits → similarity ≈ 0
```

Used for:
- Finding opposite vectors
- Creating anti-patterns
- Internal HDC operations

### 7d.5.3 Semantic Negation (Logic Level)

```sys2
@negated not Flying
# Creates concept "not flying" as role binding: Not BIND Flying
```

Used for:
- Expressing logical negation in rules
- Negating predicates in conditions
- Default reasoning exceptions

### 7d.5.4 When to Use Which

| Scenario | Use | Example |
|----------|-----|---------|
| Find opposite vector | `___Not` | `@opposite ___Not Happy` |
| Express logical negation | `not` | `@rule implies Penguin (not CanFly)` |
| Negate rule antecedent | `not` | `@cond and Bird (not Penguin)` |

---

## 7d.6 Truth Table Reference

### 7d.6.1 Binary Connectives

| A | B | A AND B | A OR B | A XOR B | A IMPLIES B | A IFF B |
|---|---|---------|--------|---------|-------------|---------|
| T | T | T | T | F | T | T |
| T | F | F | T | T | F | F |
| F | T | F | T | T | T | F |
| F | F | F | F | F | T | T |

### 7d.6.2 Unary Negation

| A | NOT A |
|---|-------|
| T | F |
| F | T |

---

## 7d.7 Implementation Notes

The logic primitives are:
1. **Defined in** the Logic pack (`config/Packs/Logic/05-logic.sys2`)
2. **Used by** proof engine (`src/reasoning/prove.mjs`)
3. **Evaluated by** condition prover (`src/reasoning/conditions.mjs`)

### 7d.7.1 Rule Representation

Rules like `implies A B` are stored with:
- `operator`: "implies"
- `args`: [A, B]
- Special handling in backward chaining

### 7d.7.2 Condition Evaluation

Compound conditions (And, Or) support backtracking:
- `And`: All sub-conditions must prove
- `Or`: At least one sub-condition must prove
- `Not`: Sub-condition must fail to prove

---

## 7d.8 Logic Summary

| Element | Count | Purpose |
|---------|-------|---------|
| Logic Atoms | 8 | Implies, And, Or, Not, Iff, Xor, ForAll, Exists |
| Logic Graphs | 8 | Corresponding graph implementations |

---

*End of DS07d - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
