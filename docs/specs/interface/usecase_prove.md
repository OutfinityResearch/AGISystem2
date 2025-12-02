# Design Spec: Use Case - Proving Theorems

ID: DS(/interface/usecase_prove)

Status: v3.0 - Unified Triple Syntax

## 1. Overview

This document describes how to use AGISystem2 to prove or disprove statements (theorems) based on the loaded theories and known facts.

### 1.1 What is Theorem Proving?

Given a statement and a knowledge base:
- **Prove**: Show the statement must be true
- **Disprove**: Show the statement must be false (find counterexample)
- **Unknown**: Cannot determine with available knowledge

### 1.2 Types of Proof

| Type | Description | Example |
|------|-------------|---------|
| Direct | Follow chain of facts | A→B→C proves A→C |
| By Contradiction | Assume negation leads to conflict | Assume ¬P, derive contradiction |
| By Transitivity | Use transitive relations | IS_A chains |
| By Counterexample | Find one case that disproves | "All X are Y" disproved by one X that isn't Y |

---

## 2. Basic Proof Commands

### 2.1 PROVE

```sys2dsl
# Try to prove a statement
@result Dog IS_A mammal

# Returns:
# {
#   proven: true,
#   truth: 'TRUE_CERTAIN',
#   proof: [
#     { step: 1, type: 'axiom', fact: 'Dog IS_A animal', source: 'base_theory' },
#     { step: 2, type: 'axiom', fact: 'animal IS_A mammal', source: 'biology' },
#     { step: 3, type: 'inference', rule: 'transitivity', from: [1, 2],
#       conclusion: 'Dog IS_A mammal' }
#   ],
#   counterexample: null
# }
```

### 2.2 Disproof

```sys2dsl
@result Fish IS_A mammal

# Returns:
# {
#   proven: false,
#   truth: 'FALSE',
#   proof: null,
#   counterexample: {
#     statement: 'Fish IS_A mammal',
#     disproof: [
#       { fact: 'Fish IS_A fish_class' },
#       { fact: 'fish_class DISJOINT_WITH mammal' },
#       { conclusion: 'Fish cannot be mammal' }
#     ]
#   }
# }
```

### 2.3 Unknown Result

```sys2dsl
@result Alien IS_A intelligent

# Returns:
# {
#   proven: null,
#   truth: 'UNKNOWN',
#   reason: 'Insufficient facts about Alien',
#   suggestions: [
#     'Add facts about Alien',
#     'Load theory about extraterrestrial life'
#   ]
# }
```

---

## 3. Proof Strategies

### 3.1 Forward Chaining

Start from known facts, derive new facts:

```sys2dsl
@result A CAUSES D

# Engine:
# 1. A CAUSES B (known)
# 2. B CAUSES C (known)
# 3. C CAUSES D (known)
# 4. If CAUSES is transitive: A CAUSES D ✓
```

### 3.2 Backward Chaining

Start from goal, find supporting facts:

```sys2dsl
@result A CAUSES D

# Engine:
# 1. Goal: A CAUSES D
# 2. What CAUSES D? → C CAUSES D
# 3. What CAUSES C? → B CAUSES C
# 4. What CAUSES B? → A CAUSES B ✓
# 5. Chain complete: A→B→C→D
```

### 3.3 Mixed Strategy (Default)

```sys2dsl
@result A CAUSES D

# Uses both forward and backward, meeting in middle
# More efficient for complex proofs
```

---

## 4. Proof with Constraints

### 4.1 Depth Limited

```sys2dsl
# Limit inference chain length (use config or parameters)
@result A CAUSES Z

# Will not find proof requiring more than 3 steps
```

### 4.2 Theory Scoped

```sys2dsl
# Only use facts from specific theories (load relevant theories first)
@loaded1 physics_basic PUSH any
@loaded2 chemistry_basic PUSH any
@result claim IS proven
```

### 4.3 Time Limited

```sys2dsl
# Timeout for complex proofs (configure via system settings)
@result complex_statement IS proven

# Returns UNKNOWN if timeout exceeded
```

### 4.4 With Assumptions

```sys2dsl
# Prove assuming certain facts - create temporary theory branch
@loaded temp_theory PUSH any
@_ A IS_A B
@_ C CAUSES D
@result conclusion IS proven
@popped any POP any
```

---

## 5. Counterexample Finding

### 5.1 Find Counterexample

```sys2dsl
# Actively search for counterexample
@result all_birds CAN fly

# Returns:
# {
#   found: true,
#   counterexample: {
#     instance: 'Penguin',
#     facts: [
#       'Penguin IS_A bird',
#       'Penguin CANNOT fly'
#     ],
#     conclusion: 'Not all birds can fly'
#   }
# }
```

### 5.2 Exhaustive Search

```sys2dsl
# Find ALL counterexamples
@result all_birds CAN fly

# Returns:
# {
#   counterexamples: [
#     { instance: 'Penguin', ... },
#     { instance: 'Ostrich', ... },
#     { instance: 'Kiwi', ... }
#   ]
# }
```

---

## 6. Universal and Existential Statements

### 6.1 Universal (All X are Y)

```sys2dsl
# Prove: All mammals breathe air
@result mammal REQUIRES oxygen

# Engine checks:
# 1. Definition: mammal REQUIRES oxygen (direct fact)
# 2. Or: all instances of mammal REQUIRE oxygen
# 3. No counterexample found
```

### 6.2 Existential (Some X is Y)

```sys2dsl
# Prove: Some bird can't fly
@result bird CANNOT fly

# Engine:
# 1. Find one bird that CANNOT fly
# 2. Penguin IS_A bird AND Penguin CANNOT fly ✓
```

### 6.3 Negation

```sys2dsl
# Prove: No fish is a mammal
@result fish IS_A mammal

# Engine:
# 1. fish DISJOINT_WITH mammal ✓
# 2. No instance of fish IS_A mammal
```

---

## 7. Proof Explanation

### 7.1 Natural Language Proof

```sys2dsl
@proof Dog IS_A mammal
@explanation TO_NATURAL $proof

# Returns:
# "To prove that Dog is a mammal:
#  1. We know that Dog is an animal (from biology theory)
#  2. We know that all animals are vertebrates
#  3. We know that Dog has fur and is warm-blooded
#  4. By definition, warm-blooded vertebrates with fur are mammals
#  5. Therefore, Dog is a mammal. QED"
```

### 7.2 Formal Proof Tree

```sys2dsl
@proof Dog IS_A mammal
@tree PROOF_TREE $proof

# Returns structured tree:
# {
#   goal: 'Dog IS_A mammal',
#   children: [
#     {
#       subgoal: 'Dog IS_A animal',
#       source: 'axiom',
#       children: []
#     },
#     {
#       subgoal: 'animal IS_A mammal',
#       source: 'inference',
#       rule: 'transitivity',
#       children: [...]
#     }
#   ]
# }
```

### 7.3 Step-by-Step

```sys2dsl
@proof Dog IS_A mammal verbose=true

# Returns each step as it's discovered
```

---

## 8. Proof in Context

### 8.1 With Loaded Theories

```sys2dsl
# Load relevant theories
@loaded1 biology PUSH any
@loaded2 zoology PUSH any

# Proof uses facts from both
@result Whale IS_A mammal
```

### 8.2 Counterfactual Proof

```sys2dsl
# What if we changed something?
@result CF_PROVE Dog IS_A bird | Dog HAS feathers; Dog CAN fly

# Proves in hypothetical world
```

### 8.3 Conditional Proof

```sys2dsl
# If X then prove Y
@result_IF X IS_A A THEN X IS_A B

# Returns:
# {
#   conditional: true,
#   antecedent: 'X IS_A A',
#   consequent: 'X IS_A B',
#   proven: true,
#   proof: [...]
# }
```

---

## 9. Incomplete Proofs

### 9.1 Partial Proof

```sys2dsl
@result complex_claim

# If can't complete:
# {
#   proven: null,
#   partial: true,
#   progress: [
#     { proven: 'A IS_A B', confidence: 1.0 },
#     { proven: 'B IS_A C', confidence: 1.0 },
#     { missing: 'C IS_A D', needed_for: 'completing proof' }
#   ],
#   gaps: ['Need fact about C and D relationship']
# }
```

### 9.2 What's Missing

```sys2dsl
@result claim
@missing WHAT_MISSING $result

# Returns facts that would complete the proof
```

### 9.3 Plausible Proof

```sys2dsl
# Even if not certain, show plausible path
@result_PLAUSIBLE claim min_confidence=0.7

# Returns proof with confidence scores
```

---

## 10. Complete Example: Mathematical Property

### 10.1 Setup

```sys2dsl
# Load math theory
@loaded arithmetic PUSH any

# Define some facts
@_ even_number HAS_PROPERTY divisible_by_2
@_ 4 IS_A even_number
@_ divisible_by_2 IMPLIES has_factor_2
```

### 10.2 Simple Proof

```sys2dsl
@result 4 HAS_PROPERTY divisible_by_2

# Proof:
# 1. 4 IS_A even_number (axiom)
# 2. even_number HAS_PROPERTY divisible_by_2 (axiom)
# 3. 4 HAS_PROPERTY divisible_by_2 (by inheritance)
```

### 10.3 Chain Proof

```sys2dsl
@result 4 HAS has_factor_2

# Proof:
# 1. 4 IS_A even_number
# 2. even_number HAS_PROPERTY divisible_by_2
# 3. 4 HAS_PROPERTY divisible_by_2 (by inheritance)
# 4. divisible_by_2 IMPLIES has_factor_2
# 5. 4 HAS has_factor_2 (by modus ponens)
```

---

## 11. Complete Example: Legal Reasoning

### 11.1 Setup

```sys2dsl
@loaded contract_law PUSH any

# Legal facts
@_ Contract_A IS_A valid_contract
@_ Party_X SIGNED Contract_A
@_ Party_X RECEIVED consideration
@_ valid_contract REQUIRES mutual_assent
@_ valid_contract REQUIRES consideration
@_ signing IMPLIES mutual_assent
```

### 11.2 Prove Contract Validity

```sys2dsl
@result Contract_A IS valid

# Proof:
# 1. Contract_A IS_A valid_contract (given)
# 2. valid_contract REQUIRES mutual_assent
# 3. Party_X SIGNED Contract_A → mutual_assent (by rule)
# 4. valid_contract REQUIRES consideration
# 5. Party_X RECEIVED consideration (given)
# 6. All requirements satisfied → Contract_A IS valid
```

### 11.3 Find Breach

```sys2dsl
@result Contract_A IS breached

# If no breach facts:
# {
#   proven: false,
#   truth: 'FALSE',
#   reason: 'No evidence of breach found',
#   would_breach: [
#     'non_performance',
#     'late_delivery',
#     'defective_goods'
#   ]
# }
```

---

## 12. Proof Quality

### 12.1 Shortest Proof

```sys2dsl
@result claim prefer=shortest

# Returns proof with fewest steps
```

### 12.2 Most Certain Proof

```sys2dsl
@result claim prefer=certain

# Returns proof using most certain facts
```

### 12.3 Most Explainable Proof

```sys2dsl
@result claim prefer=explainable

# Returns proof easiest to understand
```

---

## 13. Integration with Other Features

### 13.1 Prove Then Validate

```sys2dsl
# Prove something
@proof claim

# Check if proof is consistent with theory
@valid VALIDATE_PROOF $proof
```

### 13.2 Hypothesize Then Prove

```sys2dsl
# Generate hypothesis
@hyp effect CAUSED_BY ?

# Try to prove top hypothesis
@proofAttempt $hyp.hypotheses[0].hypothesis
```

### 13.3 Prove for Validation

```sys2dsl
# Before asserting, prove it doesn't conflict
@proposed NewFact IS_A type

# Prove it's consistent
@consistent $proposed
```

---

## 14. Configuration

```javascript
{
  proof: {
    maxDepth: 10,
    maxTime: 30000,  // 30 seconds
    strategy: 'mixed',
    preferShort: true,
    allowPlausible: false,
    verboseOutput: false
  }
}
```

---

## 15. Best Practices

### 15.1 Start Simple

```sys2dsl
# Try direct proof first
@result simple_claim

# If fails, try with more context
@result simple_claim max_depth=5
```

### 15.2 Check Both Directions

```sys2dsl
# Try to prove
@prove claim

# Also try to disprove
@disprove claim

# Be suspicious if both fail
```

### 15.3 Understand Failures

```sys2dsl
@result claim

# If unknown, check why
@why WHY_UNKNOWN $result
# Returns: missing facts, depth limit, timeout, etc.
```

---

## 16. Related Documents

- DS(/theory/Sys2DSL_syntax) - Language reference
- DS(/theory/Sys2DSL_commands) - Command reference
- DS(/reason/reasoner.js) - Proof engine implementation
- DS(/interface/usecase_validate) - Validation
- DS(/interface/usecase_hypothesize) - Hypothesis generation
