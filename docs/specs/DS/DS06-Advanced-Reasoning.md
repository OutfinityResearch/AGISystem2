# AGISystem2 - System Specifications

# Chapter 6: Advanced Reasoning

**Document Version:** 1.0  
**Author:** Sînică Alboaie  
**Status:** Draft Specification

---

## 6.1 Overview

Chapter 5 covered basic reasoning: deduction, backward chaining, and analogy. This chapter covers advanced patterns that emerge from the same HDC substrate.

| Reasoning Type | Question It Answers |
|----------------|---------------------|
| Abduction | Why did this happen? (best explanation) |
| Induction | What's the general rule? (from examples) |
| Structural Discovery | What action caused this change? |
| Counterfactual | What if things were different? |
| Default/Non-monotonic | What's normally true? (with exceptions) |
| Temporal | What happened when? (sequences, causation) |
| Compositional | Can I combine concepts? (novel combinations) |

**Core defines logical atoms for these:**
```
@Implies __Atom
@And __Atom
@Or __Atom
@Not __Atom
@Causes __Atom
@Before __Atom
@After __Atom
@During __Atom
@Default __Atom
@Exception __Atom
@Unless __Atom
@Counterfactual __Atom
@Explains __Atom
@GeneralizedFrom __Atom
```

---

## 6.2 Abduction: Inference to Best Explanation

**What it is:** Given an observation, find the most likely cause.

**Difference from backward chaining:**
- Backward: "Prove X is true" → find evidence
- Abduction: "X happened. Why?" → find best explanation

**Setup:**
```
# Causal knowledge
@r1 Causes Rain WetGrass
@r2 Causes Sprinkler WetGrass
@r3 Causes Rain WetSidewalk
@r4 Causes Sprinkler DryPath      # sprinkler doesn't reach path

# Observation
@obs1 WetGrass Observed
@obs2 WetSidewalk Observed
```

**Query:**
```
@explanation Explains ?cause $obs1
```

**Abduction process:**
```
1. Find all rules with consequent ≈ WetGrass
   Found: r1 (Rain), r2 (Sprinkler)
   
2. Candidate causes: Rain, Sprinkler

3. Check additional evidence:
   - WetSidewalk observed
   - r3: Rain → WetSidewalk ✓
   - No rule: Sprinkler → WetSidewalk ✗
   
4. Score candidates:
   - Rain explains BOTH observations
   - Sprinkler explains only one
   
5. Return: Rain (confidence: 0.85)
```

**Implementation as graph:**
```
@AbduceGraph:abduce graph observation
    @rules FindRulesWithConsequent $observation
    @candidates ExtractAntecedents $rules
    @scored ScoreByExplanatoryPower $candidates
    @best ___MostSimilar $observation $scored
    return $best
end

@cause abduce WetGrass
```

**Explanatory power scoring:**
```
score(candidate) = count(observations explained by candidate) 
                 / count(total observations)
                 * prior_probability(candidate)
```

---

## 6.3 Induction: Learning Rules from Examples

**What it is:** Given multiple examples, infer a general rule.

**Setup:**
```
# Observations
@obs1 Mortal Socrates
@obs2 Human Socrates
@obs3 Mortal Plato
@obs4 Human Plato
@obs5 Mortal Aristotle
@obs6 Human Aristotle
```

**Goal:** Discover `@rule Implies Human Mortal`

**Induction process:**
```
1. Find co-occurrences:
   - Socrates: {Human, Mortal}
   - Plato: {Human, Mortal}
   - Aristotle: {Human, Mortal}

2. Compute correlation:
   - Human and Mortal co-occur 100%
   
3. Hypothesize direction:
   - Does Human → Mortal? Check non-Human cases
   - Does Mortal → Human? Check non-Mortal cases
   
4. Generate rule:
   @inducedRule Implies Human Mortal
   @confidence 0.95
```

**Implementation:**
```
@InduceGraph:induce graph property1 property2 examples
    @cooccur CountCooccurrence $property1 $property2 $examples
    @total CountTotal $examples
    @ratio Divide $cooccur $total
    @threshold GreaterThan $ratio 0.8
    @rule Implies $property1 $property2
    @tagged TagConfidence $rule $ratio
    return $tagged
end

# Usage
@examples __Bundle $obs1 $obs2 $obs3 $obs4 $obs5 $obs6
@rule induce Human Mortal $examples
```

**Constraints on induction:**
- Minimum examples required (e.g., 5)
- Minimum confidence threshold (e.g., 0.8)
- Prefer simpler rules (Occam's razor via vector length)

---

## 6.4 Structural Discovery: Learning Verb Definitions

**What it is:** Observe state change, infer what action caused it.

**This is from original spec:** Vector Differential between states.

**Setup:**
```
# State before action
@s0_color HasProperty Wall White
@s0_owner HasProperty Car Alice
@s0 __Bundle $s0_color $s0_owner

# State after action  
@s1_color HasProperty Wall Red
@s1_owner HasProperty Car Alice
@s1 __Bundle $s1_color $s1_owner

# Known: someone did "paint Wall Red"
@action paint John Wall Red
```

**Discovery process:**
```
1. Compute delta:
   @added Difference $s1 $s0      # What appeared
   @removed Difference $s0 $s1    # What disappeared
   
   added ≈ HasProperty Wall Red
   removed ≈ HasProperty Wall White

2. Correlate with action arguments:
   - Action had: Wall, Red
   - Added has: Wall, Red
   - Pattern: paint ?agent ?surface ?color
     → removes HasProperty ?surface ?oldcolor
     → adds HasProperty ?surface ?color

3. Generate verb definition:
   @PaintDef:paint graph agent surface color
       @eid __Event
       @r1 __Role Agent $agent
       @r2 __Role Target $surface
       @r3 __Role Result $color
       @effect __Bundle $eid $r1 $r2 $r3
       return $effect
   end
```

**Implementation:**
```
@DiscoverVerbGraph:discoverVerb graph before after actionInstance
    @added Difference $after $before
    @removed Difference $before $after
    @args ExtractArguments $actionInstance
    @mapping CorrelateArgsWithDelta $args $added $removed
    @template GeneralizeGraph $mapping
    return $template
end

@learnedPaint discoverVerb $s0 $s1 $action
```

---

## 6.5 Counterfactual Reasoning: What If?

**What it is:** Reason about alternative scenarios that didn't happen.

**Setup:**
```
# Actual world
@actual1 buy Alice Car Dealer 10000
@actual2 drive Alice Car Work
@world __Bundle $actual1 $actual2
```

**Query:** "What if Alice hadn't bought the car?"

```
@counter Counterfactual $actual1 Not
```

**Counterfactual process:**
```
1. Identify counterfactual premise:
   - Negate: NOT(buy Alice Car Dealer 10000)
   
2. Find dependent facts:
   - drive Alice Car Work depends on Alice having Car
   - Check: does buy(Alice,Car) enable HasPossession(Alice,Car)?
   
3. Propagate changes:
   - Without buy → Alice doesn't have Car
   - Without Car → can't drive Car to Work
   
4. Generate alternative world:
   @altWorld Remove $world $actual2
   # Or: Alice takes bus/walks/etc.
```

**Implementation:**
```
@CounterfactualGraph:whatif graph world fact negated
    @dependencies FindDependents $world $fact
    @affected FilterByDependency $world $dependencies
    @altWorld Remove $world $affected
    return $altWorld
end

@alternative whatif $world $actual1 true
```

**Causal dependencies:**
```
# Encode that buy enables possession
@enables Enables buy HasPossession
# Encode that drive requires possession
@requires Requires drive HasPossession
```

---

## 6.6 Default Reasoning: Normally True, With Exceptions

**What it is:** Common-sense defaults that can be overridden.

**Setup:**
```
# Defaults
@d1 Default Bird CanFly
@d2 Default Mammal HasFur

# Exceptions
@e1 Exception Penguin CanFly      # Penguins can't fly
@e2 Exception Dolphin HasFur      # Dolphins don't have fur

# Facts
@f1 Bird Tweety
@f2 Penguin Tweety
@f3 Bird Robin
```

**Query:** "Can Tweety fly?"

```
@q CanFly Tweety
```

**Default reasoning process:**
```
1. Find applicable defaults:
   - Tweety is Bird → Default: CanFly
   
2. Check for exceptions:
   - Tweety is Penguin
   - Exception: Penguin overrides CanFly
   
3. Exception wins:
   - Result: Tweety cannot fly (confidence: 0.95)

4. Compare with Robin:
   - Robin is Bird → Default: CanFly
   - No exception applies
   - Result: Robin can fly (confidence: 0.90)
```

**Specificity ordering:**
```
Penguin is more specific than Bird
→ Penguin exception overrides Bird default
```

**Implementation:**
```
@DefaultReasonGraph:defaultQuery graph subject property
    @defaults FindDefaults $property
    @applicable FilterByType $defaults $subject
    @exceptions FindExceptions $property
    @specific MostSpecificType $subject
    @hasException CheckException $specific $exceptions
    @result If $hasException (Not $property) $property
    return $result
end
```

---

## 6.7 Temporal Reasoning: Sequences and Causation

**What it is:** Reason about time, order, and temporal causation.

**Core atoms:**
```
@Before __Atom       # e1 happened before e2
@After __Atom        # e1 happened after e2
@During __Atom       # e1 happened during e2
@Causes __Atom       # e1 caused e2
@Prevents __Atom     # e1 prevented e2
@Enables __Atom      # e1 made e2 possible
```

**Setup:**
```
# Events
@e1 buy Alice Car
@e2 drive Alice Car Work
@e3 crash Alice Car Tree

# Temporal relations
@t1 Before $e1 $e2        # buy before drive
@t2 Before $e2 $e3        # drive before crash
@t3 Causes $e3 Broken Car # crash causes broken
```

**Temporal queries:**

```
# What happened before the crash?
@q Before ?event $e3
# Results: e1, e2 (transitively)

# What caused the car to be broken?
@q Causes ?event (Broken Car)
# Result: e3 (crash)

# Could Alice drive after the crash?
@carState After $e3 ?state
# Broken → cannot drive
```

**Temporal inference:**
```
# Transitivity
@transitiveRule Implies (And (Before $a $b) (Before $b $c)) (Before $a $c)

# Causation requires temporal order
@causalRule Implies (Causes $a $b) (Before $a $b)
```

**Implementation:**
```
@TemporalQueryGraph:whenBefore graph event kb
    @direct FindDirect Before $event $kb
    @indirect TransitiveClosure Before $direct $kb
    @all __Bundle $direct $indirect
    return $all
end

@TemporalChainGraph:causalChain graph effect kb
    @cause FindDirect Causes $effect $kb
    @prior causalChain $cause $kb      # recursive
    @chain __Bundle $cause $prior
    return $chain
end
```

---

## 6.8 Compositional Reasoning: Novel Combinations

**What it is:** Combine existing concepts to create new ones.

**Why HDC excels:** Binding and bundling naturally create compositional structures.

**Basic composition:**
```
# Known concepts
@Red __Atom
@Blue __Atom
@Apple __Atom
@Car __Atom

# Existing compositions
@redApple Pair Red Apple        # red apple (seen before)
@blueCar Pair Blue Car          # blue car (seen before)

# Novel composition
@blueApple Pair Blue Apple      # blue apple (never seen!)
@redCar Pair Red Car            # red car (never seen!)
```

**Systematic composition:**
```
# All color-object combinations
@colors __Bundle Red Blue Green Yellow
@objects __Bundle Apple Car House Ball

@AllCombinationsGraph:combine graph set1 set2
    @result Empty
    # For each in set1 × set2, create Pair
    # (Implementation iterates or uses outer product)
    return $result
end
```

**Property inheritance in composition:**
```
# Red things are warm-colored
@r1 Implies Red WarmColored

# Apples are edible
@r2 Implies Apple Edible

# Query about novel combination:
@q WarmColored $blueApple
# Blue is NOT WarmColored → No

@q Edible $blueApple  
# Apple IS Edible → Yes (inherited)
```

**Conceptual blending:**
```
# Blend two concepts
@BlendGraph:blend graph concept1 concept2
    @shared ___Similarity $concept1 $concept2
    @unique1 Difference $concept1 $concept2
    @unique2 Difference $concept2 $concept1
    @blended __Bundle $shared $unique1 $unique2
    return $blended
end

# Horse + Bird = Pegasus?
@pegasus blend Horse Bird
# Has: legs (horse), wings (bird), flies (bird), runs (horse)
```

---

## 6.9 Integration: Combined Reasoning

Real reasoning combines multiple types:

**Scenario:** "The grass is wet. Should I water the garden?"

```
# Observation
@obs WetGrass Observed

# ABDUCTION: Why is grass wet?
@cause abduce WetGrass
# Result: Rain (0.85) or Sprinkler (0.15)

# TEMPORAL: When did it rain?
@when Before ?time Now
@rainEvent Rain $when
# Result: Rain was recent

# DEFAULT: Do plants need water after rain?
@d1 Default Rain SufficientWater
# Result: Probably sufficient

# COUNTERFACTUAL: What if it hadn't rained?
@alt whatif $world $rainEvent true
# Result: Grass would be dry, need watering

# CONCLUSION:
# Rain caused wet grass → sufficient water → don't water garden
```

---

## 6.10 Reasoning Verbs in Core

Core defines these as verbs for advanced reasoning:

```
# Abduction
@AbduceGraph:abduce graph observation
    ...
end

# Induction  
@InduceGraph:induce graph prop1 prop2 examples
    ...
end

# Structural discovery
@DiscoverVerbGraph:discoverVerb graph before after action
    ...
end

# Counterfactual
@CounterfactualGraph:whatif graph world fact negated
    ...
end

# Default query
@DefaultQueryGraph:normally graph subject property
    ...
end

# Temporal
@TemporalQueryGraph:before graph event
    ...
end

@CausalChainGraph:whyCaused graph effect
    ...
end

# Composition
@ComposeGraph:compose graph concept1 concept2
    ...
end

@BlendGraph:blend graph concept1 concept2
    ...
end
```

---

## 6.11 Summary

| Type | Input | Output | Core Atoms |
|------|-------|--------|------------|
| Abduction | Observation | Best explanation | `Explains`, `Causes` |
| Induction | Examples | General rule | `Implies`, `GeneralizedFrom` |
| Structural Discovery | Before/After states | Verb definition | `Difference` |
| Counterfactual | World + negated fact | Alternative world | `Counterfactual`, `Not` |
| Default | Subject + property | Normally true/false | `Default`, `Exception` |
| Temporal | Events | Order, causation | `Before`, `After`, `Causes` |
| Compositional | Concepts | Novel combinations | `Pair`, `__Bundle`, `blend` |

**Key insight:** All advanced reasoning emerges from the same HDC operations. Bind, unbind, bundle, similarity. The "type" of reasoning is determined by which patterns we look for and how we interpret results.

---

*End of Chapter 6*
