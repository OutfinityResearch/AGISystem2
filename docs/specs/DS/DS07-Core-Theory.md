# AGISystem2 - System Specifications

# Chapter 7: The Core Theory Reference

**Document Version:** 2.0  
**Status:** Draft Specification

---

## 7.1 Purpose of Core Theory

Core is the foundational theory that is **always loaded** and **cannot be unloaded**. It provides:

1. **HDC Primitives** (L0) — raw vector operations
2. **Structural Operations** (L1) — building blocks
3. **Type System** (L1) — typed atom constructors
4. **Semantic Primitives** (L2) — Conceptual Dependency verbs
5. **Logic Primitives** — And, Or, Not, Implies, quantifiers
6. **Temporal Primitives** — Before, After, Causes
7. **Modal Primitives** — Possible, Necessary, Permitted
8. **Standard Roles** — Agent, Theme, Goal, etc.
9. **Reasoning Verbs** — abduce, induce, whatif, etc.

**Design goal:** Strong typing catches errors early, guides LLM translation, and enables type-aware reasoning.

---

## 7.2 L0: HDC Primitives

Implemented in runtime (native code). Never call directly from user DSL.

| Primitive | Signature | Operation | Notes |
|-----------|-----------|-----------|-------|
| `___Bind` | a b | XOR: `a ⊕ b` | Self-inverse, extension-safe |
| `___Bundle` | a b ... | Majority vote | Superposition, extension-safe |
| `___Similarity` | a b | Hamming similarity | Returns 0.0-1.0 |
| `___MostSimilar` | query set | Find nearest | Best match |
| `___NewVector` | name theory | ASCII stamped | Deterministic from name |
| `___Not` | v | Bitwise NOT | Flip all bits |
| `___GetType` | v | Extract type | Returns type vector |
| `___Extend` | v targetGeo | Clone to size | [v] → [v\|v] |

**No permutation!** Permutation breaks vector extension. Position encoding uses Pos1, Pos2, ... vectors instead.

### 7.2.1 ASCII Stamp Initialization

`___NewVector` creates vectors deterministically from name:

```javascript
___NewVector(name, theoryId, geometry):
    // "John" → ASCII [74,111,104,110] → repeated stamp → XOR with PRNG
    seed = hash(theoryId + ":" + name)
    baseStamp = asciiToStamp(name, 256)  // 256 bits per stamp
    
    for i in 0..geometry/256:
        vector[i*256:(i+1)*256] = baseStamp XOR PRNG(seed, i)
    
    return vector
```

**Properties:**
- Deterministic: same name → same vector
- Recognizable: ASCII pattern visible
- Extensible: cloning preserves pattern

---

## 7.3 L1: Type System

### 7.3.1 Why Types Matter

Without types:
```
@John __Atom        # What is John? Person? Place? Property?
@Red __Atom         # Can we say "Red runs"? Probably not.
@f Hungry John      # Valid
@f John Hungry      # Also valid syntactically, but wrong!
```

With types:
```
@John:John __Person
@Red:Red __Property
@f Hungry $John     # Valid: State applied to Person
@f $John Hungry     # Type error: Person cannot be a predicate
```

### 7.3.2 Type Hierarchy

```
__Atom (abstract base - don't use directly)
├── __Entity (concrete things)
│   ├── __Person (humans, agents)
│   ├── __Object (physical objects)
│   ├── __Place (locations)
│   ├── __Organization (companies, groups)
│   └── __Substance (materials: water, wood)
├── __Abstract (non-physical)
│   ├── __Property (permanent attributes: Red, Tall)
│   ├── __State (temporary conditions: Hungry, Broken)
│   ├── __Category (classes: Person, Animal, Vehicle)
│   ├── __Relation (connections: Parent, Owner, Friend)
│   └── __Action (action types: Walking, Eating)
├── __Temporal
│   ├── __TimePoint (moments: T0, Yesterday, 3pm)
│   └── __TimePeriod (durations: Morning, 2024, Childhood)
├── __Quantity
│   ├── __Number (numeric: 5, 100, 3.14)
│   ├── __Amount (fuzzy: Many, Few, Some)
│   └── __Measure (with unit: 5kg, 10km)
└── __Role (semantic roles - special)
```

### 7.3.3 Type Atoms

Core defines type markers as primitive atoms:

```
# Base type marker
@TypeMarker:TypeMarker ___NewVector

# Entity types
@EntityType:EntityType ___NewVector
@PersonType:PersonType ___NewVector
@ObjectType:ObjectType ___NewVector
@PlaceType:PlaceType ___NewVector
@OrganizationType:OrganizationType ___NewVector
@SubstanceType:SubstanceType ___NewVector

# Abstract types
@AbstractType:AbstractType ___NewVector
@PropertyType:PropertyType ___NewVector
@StateType:StateType ___NewVector
@CategoryType:CategoryType ___NewVector
@RelationType:RelationType ___NewVector
@ActionType:ActionType ___NewVector

# Temporal types
@TimePointType:TimePointType ___NewVector
@TimePeriodType:TimePeriodType ___NewVector

# Quantity types
@NumberType:NumberType ___NewVector
@AmountType:AmountType ___NewVector
@MeasureType:MeasureType ___NewVector

# Role type
@RoleType:RoleType ___NewVector
```

### 7.3.4 Typed Constructors

Each type has a constructor macro:

```
# Abstract base (internal only)
@__Atom:__Atom macro
    @v ___NewVector
    return $v
end

# Entity types
@__Entity:__Entity macro
    @v ___NewVector
    @typed ___Bind $v EntityType
    return $typed
end

@__Person:__Person macro
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 PersonType
    return $typed
end

@__Object:__Object macro
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 ObjectType
    return $typed
end

@__Place:__Place macro
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 PlaceType
    return $typed
end

@__Organization:__Organization macro
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 OrganizationType
    return $typed
end

@__Substance:__Substance macro
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 SubstanceType
    return $typed
end

# Abstract types
@__Property:__Property macro
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 PropertyType
    return $typed
end

@__State:__State macro
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 StateType
    return $typed
end

@__Category:__Category macro
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 CategoryType
    return $typed
end

@__Relation:__Relation macro
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 RelationType
    return $typed
end

@__Action:__Action macro
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 ActionType
    return $typed
end

# Temporal types
@__TimePoint:__TimePoint macro
    @v ___NewVector
    @typed ___Bind $v TimePointType
    return $typed
end

@__TimePeriod:__TimePeriod macro
    @v ___NewVector
    @typed ___Bind $v TimePeriodType
    return $typed
end

# Quantity types
@__Number:__Number macro value
    @v ___NewVector
    @t ___Bind $v NumberType
    @typed ___Bind $t $value
    return $typed
end

@__Amount:__Amount macro
    @v ___NewVector
    @typed ___Bind $v AmountType
    return $typed
end
```

### 7.3.5 Type Checking

Runtime can check types:

```
@IsTypeMacro:isType macro instance typeMarker
    @extracted ___GetType $instance
    @sim ___Similarity $extracted $typeMarker
    @result GreaterThan $sim 0.8
    return $result
end

# Usage
@check isType $John PersonType        # true
@check isType $John PlaceType         # false
@check isType $Red PropertyType       # true
```

### 7.3.6 Correct Usage Examples

```
# Entities
@John:John __Person
@Mary:Mary __Person
@Ball:Ball __Object
@Car:Car __Object
@Paris:Paris __Place
@Home:Home __Place
@Google:Google __Organization
@Water:Water __Substance

# Properties (permanent)
@Red:Red __Property
@Heavy:Heavy __Property
@Tall:Tall __Property
@Round:Round __Property

# States (temporary)
@Hungry:Hungry __State
@Asleep:Asleep __State
@Broken:Broken __State
@Happy:Happy __State

# Categories
@Person:Person __Category
@Animal:Animal __Category
@Vehicle:Vehicle __Category
@Food:Food __Category

# Relations
@Parent:Parent __Relation
@Owner:Owner __Relation
@Friend:Friend __Relation
@PartOf:PartOf __Relation

# Actions (as concepts)
@Walking:Walking __Action
@Eating:Eating __Action
@Buying:Buying __Action

# Time
@Yesterday:Yesterday __TimePoint
@T0:T0 __TimePoint
@Morning:Morning __TimePeriod
@Childhood:Childhood __TimePeriod

# Quantities
@Five:Five __Number 5
@Many:Many __Amount
@Few:Few __Amount
```

---

## 7.4 L1: Structural Operations

Building blocks that work with typed atoms.

```
@__Role:__Role macro roleName filler
    @r ___Bind $roleName $filler
    @typed ___Bind $r RoleType
    return $typed
end

@__Pair:__Pair macro first second
    @shifted ___Permute $second 1
    @result ___Bind $first $shifted
    return $result
end

@__Triple:__Triple macro a b c
    @p1 ___Permute $b 1
    @p2 ___Permute $c 2
    @r1 ___Bind $a $p1
    @result ___Bind $r1 $p2
    return $result
end

@__Bundle:__Bundle macro items
    @result ___Bundle $items
    return $result
end

@__Event:__Event macro
    @v ___NewVector
    @typed ___Bind $v EventType
    return $typed
end

@__Sequence:__Sequence macro items
    # Each item permuted by position, then bundled
    @result ___BundlePermuted $items
    return $result
end
```

---

## 7.4 The Binding Formula

### 7.4.1 Statement Encoding

Every statement `@dest Op Arg1 Arg2 ... ArgN` is encoded as:

```
dest = Op ⊕ (Pos1 ⊕ Arg1) ⊕ (Pos2 ⊕ Arg2) ⊕ ... ⊕ (PosN ⊕ ArgN)
```

**Why this works:**
- Each argument is "tagged" with its position vector
- XOR is associative and commutative
- Position vectors are quasi-orthogonal to each other and to arguments
- Extension (cloning) preserves the pattern

### 7.4.2 Example

```
@fact loves John Mary

# Internally:
fact = loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)

# Different from:
@fact2 loves Mary John
fact2 = loves ⊕ (Pos1 ⊕ Mary) ⊕ (Pos2 ⊕ John)

similarity(fact, fact2) ≈ 0.5  # Different facts!
```

### 7.4.3 With Macro

When Op has an associated macro:
```
dest = Op ⊕ macro_result
```

The macro's return value is bound with the operator.

### 7.4.4 Query (Unbinding)

To find `?who` in `@q loves ?who Mary`:

```
# Build partial (skip the hole)
partial = loves ⊕ (Pos2 ⊕ Mary)

# Unbind from fact in KB
result = fact ⊕ partial
       = (loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)) ⊕ (loves ⊕ (Pos2 ⊕ Mary))
       = Pos1 ⊕ John  # known parts cancel out!

# Extract answer
answer = result ⊕ Pos1
       = John
```

---

## 7.5 L2: Semantic Primitives

Semantic primitives now specify expected types in comments:

### Physical Actions

```
# _ptrans: Physical transfer of location
# Types: agent:Entity, object:Entity, from:Place, to:Place
@_ptrans:_ptrans macro agent object from to
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @r3 __Role Source $from
    @r4 __Role Goal $to
    @result __Bundle $eid $r1 $r2 $r3 $r4
    return $result
end

# _propel: Apply physical force
# Types: agent:Entity, object:Object, direction:Property
@_propel:_propel macro agent object direction
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @r3 __Role Direction $direction
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end

# _grasp: Take physical control
# Types: agent:Entity, object:Object
@_grasp:_grasp macro agent object
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @result __Bundle $eid $r1 $r2
    return $result
end

# _ingest: Take into body
# Types: agent:Person, object:Substance|Object
@_ingest:_ingest macro agent object
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @result __Bundle $eid $r1 $r2
    return $result
end

# _expel: Expel from body
# Types: agent:Person, object:Substance|Object
@_expel:_expel macro agent object
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @result __Bundle $eid $r1 $r2
    return $result
end
```

### Abstract Actions

```
# _atrans: Abstract transfer (ownership, control)
# Types: agent:Entity, object:Entity|Abstract, from:Entity, to:Entity
@_atrans:_atrans macro agent object from to
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @r3 __Role Source $from
    @r4 __Role Goal $to
    @result __Bundle $eid $r1 $r2 $r3 $r4
    return $result
end
```

### Mental Actions

```
# _mtrans: Mental/information transfer
# Types: agent:Person, info:Abstract, from:Person|Place, to:Person
@_mtrans:_mtrans macro agent info from to
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $info
    @r3 __Role Source $from
    @r4 __Role Recipient $to
    @result __Bundle $eid $r1 $r2 $r3 $r4
    return $result
end

# _mbuild: Mental construction
# Types: agent:Person, idea:Abstract
@_mbuild:_mbuild macro agent idea
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $idea
    @result __Bundle $eid $r1 $r2
    return $result
end

# _attend: Focus sense organ
# Types: agent:Person, sense:Object, target:Entity
@_attend:_attend macro agent sense target
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Instrument $sense
    @r3 __Role Target $target
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end

# _speak: Produce sounds
# Types: agent:Person, utterance:Abstract
@_speak:_speak macro agent utterance
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $utterance
    @result __Bundle $eid $r1 $r2
    return $result
end

# _conc: Conceptualize/think about
# Types: agent:Person, concept:Abstract
@_conc:_conc macro agent concept
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $concept
    @result __Bundle $eid $r1 $r2
    return $result
end
```

---

## 7.6 Logic Primitives

### Standard Logic Atoms

```
@Implies:Implies __Relation
@And:And __Relation
@Or:Or __Relation
@Not:Not __Relation
@Iff:Iff __Relation
@Xor:Xor __Relation
@ForAll:ForAll __Relation
@Exists:Exists __Relation
@Most:Most __Amount
@Few:Few __Amount
```

### Logic Macros

```
# Implication: antecedent → consequent
@ImpliesMacro:implies macro antecedent consequent
    @pair __Pair $antecedent $consequent
    @result __Role Implies $pair
    return $result
end

# Conjunction: a AND b
@AndMacro:and macro a b
    @pair __Pair $a $b
    @result __Role And $pair
    return $result
end

# Disjunction: a OR b
@OrMacro:or macro a b
    @pair __Pair $a $b
    @result __Role Or $pair
    return $result
end

# Negation: NOT proposition
@NotMacro:not macro proposition
    @result __Role Not $proposition
    return $result
end

# Biconditional: a IFF b
@IffMacro:iff macro a b
    @pair __Pair $a $b
    @result __Role Iff $pair
    return $result
end
```

### Quantifiers

```
# Universal: for all X, predicate holds
@ForAllMacro:forall macro variable predicate
    @quant __Role ForAll $variable
    @scope __Role Scope $predicate
    @result __Bundle $quant $scope
    return $result
end

# Existential: there exists X such that predicate
@ExistsMacro:exists macro variable predicate
    @quant __Role Exists $variable
    @scope __Role Scope $predicate
    @result __Bundle $quant $scope
    return $result
end
```

---

## 7.7 Negation in Depth

### Type 1: Structural Negation (HDC Level)

```
@inverted ___Not $vector
# Flips all bits → maximally dissimilar (similarity ≈ 0)
```

### Type 2: Semantic Negation (Logic Level)

```
@negated not Flying
# Creates concept "not flying" as role binding: Not ⊕ Flying
```

### When to Use Which

| Scenario | Use | Example |
|----------|-----|---------|
| Find opposite vector | `___Not` | `@opposite ___Not Happy` |
| Express logical negation | `not` | `@rule implies Penguin (not CanFly)` |
| Negate rule antecedent | `not` | `@cond and Bird (not Penguin)` |

---

## 7.8 Temporal Primitives

```
# Temporal relation atoms
@Before:Before __Relation
@After:After __Relation
@During:During __Relation
@Starts:Starts __Relation
@Ends:Ends __Relation
@Overlaps:Overlaps __Relation
@Meets:Meets __Relation

# Causal atoms
@Causes:Causes __Relation
@Enables:Enables __Relation
@Prevents:Prevents __Relation
```

### Temporal Macros

```
# Before: event1 happened before event2
# Types: event1:Event, event2:Event
@BeforeMacro:before macro event1 event2
    @pair __Pair $event1 $event2
    @result __Role Before $pair
    return $result
end

# After: event1 happened after event2
@AfterMacro:after macro event1 event2
    @result before $event2 $event1
    return $result
end

# During: event1 happened during event2
@DuringMacro:during macro event1 event2
    @pair __Pair $event1 $event2
    @result __Role During $pair
    return $result
end

# Causes: cause led to effect
# Types: cause:Event, effect:Event|State
@CausesMacro:causes macro cause effect
    @temporal before $cause $effect
    @causal __Role Causes (__Pair $cause $effect)
    @result __Bundle $temporal $causal
    return $result
end

# Enables: enabler made possible enabled
@EnablesMacro:enables macro enabler enabled
    @pair __Pair $enabler $enabled
    @result __Role Enables $pair
    return $result
end

# Prevents: preventer stopped prevented
@PreventsMacro:prevents macro preventer prevented
    @pair __Pair $preventer $prevented
    @result __Role Prevents $pair
    return $result
end
```

---

## 7.9 Modal Primitives

```
# Alethic (truth)
@Possible:Possible __Property
@Necessary:Necessary __Property
@Impossible:Impossible __Property

# Deontic (obligation)
@Permitted:Permitted __Property
@Forbidden:Forbidden __Property
@Obligatory:Obligatory __Property

# Epistemic (knowledge)
@Known:Known __State
@Believed:Believed __State
@Unknown:Unknown __State
```

### Modal Macros

```
# Possibility
@PossibleMacro:possible macro proposition
    @result __Role Possible $proposition
    return $result
end

# Necessity
@NecessaryMacro:necessary macro proposition
    @result __Role Necessary $proposition
    return $result
end

# Knowledge: agent knows proposition
# Types: agent:Person, proposition:Abstract
@KnowsMacro:knows macro agent proposition
    @knower __Role Experiencer $agent
    @content __Role Content $proposition
    @state __Role Known (__Bundle $knower $content)
    return $state
end

# Belief: agent believes proposition
@BelievesMacro:believes macro agent proposition
    @believer __Role Experiencer $agent
    @content __Role Content $proposition
    @state __Role Believed (__Bundle $believer $content)
    return $state
end

# Obligation: agent must do action
# Types: agent:Person, action:Action|Event
@MustMacro:must macro agent action
    @obliged __Role Agent $agent
    @act __Role Action $action
    @result __Role Obligatory (__Bundle $obliged $act)
    return $result
end

# Permission: agent may do action
@MayMacro:may macro agent action
    @permitted __Role Agent $agent
    @act __Role Action $action
    @result __Role Permitted (__Bundle $permitted $act)
    return $result
end
```

---

## 7.10 Default and Exception Handling

```
@Default:Default __Relation
@Exception:Exception __Relation
@Unless:Unless __Relation
```

### Default Macros

```
# Default: category normally has property
# Types: category:Category, property:Property|State
@DefaultMacro:normally macro category property
    @rule __Role Default (__Pair $category $property)
    return $rule
end

# Exception: subcategory overrides default
# Types: subcategory:Category, property:Property|State
@ExceptionMacro:except macro subcategory property
    @rule __Role Exception (__Pair $subcategory $property)
    return $rule
end

# Unless: proposition holds unless condition
@UnlessMacro:unless macro proposition condition
    @negCond not $condition
    @result implies $negCond $proposition
    return $result
end
```

---

## 7.11 Standard Roles

Semantic roles for event structures (all typed as __Role internally):

```
# Agent roles
@Agent:Agent __Relation          # Who performs action
@CoAgent:CoAgent __Relation      # Who helps perform

# Patient/Theme roles
@Theme:Theme __Relation          # What is affected
@Patient:Patient __Relation      # What undergoes change

# Experiencer
@Experiencer:Experiencer __Relation    # Who experiences

# Transfer roles
@Recipient:Recipient __Relation  # Who receives
@Beneficiary:Beneficiary __Relation    # Who benefits
@Source:Source __Relation        # Starting point
@Goal:Goal __Relation            # Ending point

# Circumstantial roles
@Location:Location __Relation    # Where
@Instrument:Instrument __Relation    # With what tool
@Manner:Manner __Relation        # How
@Time:Time __Relation            # When
@Duration:Duration __Relation    # How long

# Causal roles
@Cause:Cause __Relation          # Why (cause)
@Purpose:Purpose __Relation      # Why (intention)
@Result:Result __Relation        # What resulted

# Content
@Content:Content __Relation      # Information content
```

---

## 7.12 L3 Bootstrap Verbs

Common verbs built from L2, with type signatures:

```
# tell: speaker tells info to listener
# Types: speaker:Person, info:Abstract, listener:Person
@TellMacro:tell macro speaker info listener
    @result _mtrans $speaker $info $speaker $listener
    return $result
end

# ask: asker asks question to askee
# Types: asker:Person, question:Abstract, askee:Person
@AskMacro:ask macro asker question askee
    @req __Role Request $question
    @result _mtrans $asker $req $asker $askee
    return $result
end

# give: giver gives object to receiver
# Types: giver:Person, object:Entity, receiver:Person
@GiveMacro:give macro giver object receiver
    @result _atrans $giver $object $giver $receiver
    return $result
end

# take: taker takes object from source
# Types: taker:Person, object:Entity, source:Person|Place
@TakeMacro:take macro taker object source
    @result _atrans $taker $object $source $taker
    return $result
end

# buy: buyer buys item from seller for price
# Types: buyer:Person, item:Entity, seller:Person, price:Quantity
@BuyMacro:buy macro buyer item seller price
    @t1 _atrans $buyer $item $seller $buyer
    @t2 _atrans $buyer $price $buyer $seller
    @result __Bundle $t1 $t2
    return $result
end

# sell: seller sells item to buyer for price
# Types: seller:Person, item:Entity, buyer:Person, price:Quantity
@SellMacro:sell macro seller item buyer price
    @result buy $buyer $item $seller $price
    return $result
end

# go: agent goes from source to destination
# Types: agent:Person, from:Place, to:Place
@GoMacro:go macro agent from to
    @result _ptrans $agent $agent $from $to
    return $result
end

# see: experiencer sees object
# Types: experiencer:Person, object:Entity
@SeeMacro:see macro experiencer object
    @eyes __Object              # Eyes as instrument
    @result _attend $experiencer $eyes $object
    return $result
end

# hear: experiencer hears sound
# Types: experiencer:Person, sound:Entity|Abstract
@HearMacro:hear macro experiencer sound
    @ears __Object              # Ears as instrument
    @result _attend $experiencer $ears $sound
    return $result
end

# want: experiencer wants something
# Types: experiencer:Person, desired:Entity|Abstract|Event
@WantMacro:want macro experiencer desired
    @eid __Event
    @r1 __Role Experiencer $experiencer
    @r2 __Role Theme $desired
    @r3 __Role State Wanting
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end

# like: experiencer likes something
# Types: experiencer:Person, liked:Entity|Abstract
@LikeMacro:like macro experiencer liked
    @eid __Event
    @r1 __Role Experiencer $experiencer
    @r2 __Role Theme $liked
    @r3 __Role State Liking
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end

# fear: experiencer fears something
# Types: experiencer:Person, feared:Entity|Abstract
@FearMacro:fear macro experiencer feared
    @eid __Event
    @r1 __Role Experiencer $experiencer
    @r2 __Role Theme $feared
    @r3 __Role State Fearing
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end
```

---

## 7.13 Property and State Macros

```
# hasProperty: entity has permanent property
# Types: entity:Entity, property:Property
@HasPropertyMacro:hasProperty macro entity property
    @r1 __Role Theme $entity
    @r2 __Role Attribute $property
    @result __Bundle $r1 $r2
    return $result
end

# inState: entity is in temporary state
# Types: entity:Entity, state:State
@InStateMacro:inState macro entity state
    @r1 __Role Theme $entity
    @r2 __Role State $state
    @result __Bundle $r1 $r2
    return $result
end

# isA: entity is member of category
# Types: entity:Entity, category:Category
@IsAMacro:isA macro entity category
    @r1 __Role Instance $entity
    @r2 __Role Category $category
    @result __Bundle $r1 $r2
    return $result
end

# subclass: category1 is subclass of category2
# Types: category1:Category, category2:Category
@SubclassMacro:subclass macro subcategory supercategory
    @r1 __Role Subclass $subcategory
    @r2 __Role Superclass $supercategory
    @result __Bundle $r1 $r2
    return $result
end
```

---

## 7.14 Reasoning Verbs

```
# abduce: find best explanation for observation
# Types: observation:Event|State → explanation:Event
@AbduceMacro:abduce macro observation
    # Implementation finds rules with consequent ≈ observation
    # Returns best antecedent
end

# induce: learn rule from examples  
# Types: examples:Bundle → rule:Implies
@InduceMacro:induce macro examples
    # Implementation finds pattern across examples
    # Returns generalized rule
end

# whatif: counterfactual reasoning
# Types: world:Bundle, fact:Event → alternativeWorld:Bundle
@WhatIfMacro:whatif macro world fact
    # Implementation removes fact and dependents
    # Returns modified world
end

# analogy: A is to B as C is to ?
# Types: a:Entity, b:Entity, c:Entity → d:Entity
@AnalogyMacro:analogy macro a b c
    @rel ___Bind $a $b
    @result ___Bind $c $rel
    return $result
end

# similar: find similar items
# Types: query:Any, vocabulary:Bundle → matches:Bundle
@SimilarMacro:similar macro query vocabulary
    @result ___MostSimilar $query $vocabulary
    return $result
end
```

---

## 7.15 Natural Language Translation Guide

### 7.15.1 Principles

1. **Identify types first** — What kind of thing is each noun?
2. **Create atoms with correct type** — Use `__Person`, `__Object`, `__Place`, etc.
3. **Build macros for domain concepts** — Define relationships and actions
4. **Instantiate with facts** — Use your macros to state facts
5. **Express rules** — Use `implies` for generalizations

### 7.15.2 Example: Family Domain

**Natural language:**
> "John is Mary's father. Mary is Tom's mother. 
> Fathers are male parents. Grandparents are parents of parents."

**Step 1: Identify types**
- John, Mary, Tom → Person
- Male, Female → Property
- Father, Mother, Parent, Grandparent → Relation

**Step 2: Create typed atoms**
```
@Family theory 32768 deterministic

    # Properties
    @Male:Male __Property
    @Female:Female __Property
    
    # Relations
    @ParentRel:ParentRel __Relation
    @FatherRel:FatherRel __Relation
    @MotherRel:MotherRel __Relation
    @GrandparentRel:GrandparentRel __Relation
```

**Step 3: Build macros**
```
    # parent: person1 is parent of person2
    # Types: parent:Person, child:Person
    @ParentMacro:parent macro parent child
        @r1 __Role Agent $parent
        @r2 __Role Theme $child
        @r3 __Role Relation ParentRel
        @result __Bundle $r1 $r2 $r3
        return $result
    end
    
    # father: person is father of child
    # Types: father:Person, child:Person
    @FatherMacro:father macro fatherPerson child
        @p parent $fatherPerson $child
        @g hasProperty $fatherPerson Male
        @result __Bundle $p $g
        return $result
    end
    
    # mother: person is mother of child
    # Types: mother:Person, child:Person
    @MotherMacro:mother macro motherPerson child
        @p parent $motherPerson $child
        @g hasProperty $motherPerson Female
        @result __Bundle $p $g
        return $result
    end
    
    # grandparent: gp is grandparent of gc
    # Types: grandparent:Person, grandchild:Person
    @GrandparentMacro:grandparent macro gp gc
        @middle ?mid                      # intermediate (hole)
        @p1 parent $gp $middle
        @p2 parent $middle $gc
        @result __Bundle $p1 $p2
        return $result
    end
```

**Step 4: Create individuals and facts**
```
    # People
    @John:John __Person
    @Mary:Mary __Person
    @Tom:Tom __Person
    
    # Facts
    @f1 father $John $Mary
    @f2 mother $Mary $Tom
end
```

**Step 5: Query**
```
@_ Load $Family

# Who is Tom's grandparent?
@q grandparent ?who Tom
# Result: ?who = John
```

---

### 7.15.3 Example: Physics Domain

**Natural language:**
> "Objects have mass and velocity. Force applied to an object causes acceleration.
> Heavy objects need more force to accelerate."

**Step 1: Identify types**
- Ball, Car → Object
- Mass, Velocity, Acceleration → Property (measurable)
- Force → Action (or Event)
- Heavy, Light → Property

**Complete domain:**
```
@Physics theory 32768 deterministic

    # Physical properties
    @Mass:Mass __Property
    @Velocity:Velocity __Property
    @Acceleration:Acceleration __Property
    @Position:Position __Property
    
    # Property values
    @Heavy:Heavy __Property
    @Light:Light __Property
    @Fast:Fast __Property
    @Slow:Slow __Property
    @Zero:Zero __Number 0
    
    # Macros
    
    # hasPhysicalProperty: object has measurable property with value
    # Types: object:Object, property:Property, value:Property|Number
    @HasPhysPropMacro:hasPhysProp macro object property value
        @r1 __Role Theme $object
        @r2 __Role Attribute $property
        @r3 __Role Value $value
        @result __Bundle $r1 $r2 $r3
        return $result
    end
    
    # applyForce: agent applies force to object in direction
    # Types: agent:Entity, object:Object, magnitude:Quantity, direction:Property
    @ApplyForceMacro:applyForce macro agent object magnitude direction
        @action _propel $agent $object $direction
        @mag __Role Magnitude $magnitude
        @result __Bundle $action $mag
        return $result
    end
    
    # accelerate: object changes from vel1 to vel2
    # Types: object:Object, fromVel:Property, toVel:Property
    @AccelerateMacro:accelerate macro object fromVel toVel
        @r1 __Role Theme $object
        @r2 __Role Attribute Velocity
        @r3 __Role Source $fromVel
        @r4 __Role Goal $toVel
        @result __Bundle $r1 $r2 $r3 $r4
        return $result
    end
    
    # Rules
    
    # Force causes acceleration
    @r1 implies (applyForce ?agent ?obj ?f ?dir) 
                (accelerate ?obj Zero ?newVel)
    
    # Objects
    @Ball:Ball __Object
    @Car:Car __Object
    
    # Facts
    @ballMass hasPhysProp $Ball Mass Light
    @carMass hasPhysProp $Car Mass Heavy

end
```

---

### 7.15.4 Example: Narrative

**Natural language:**
> "Alice was hungry. She went to the store and bought bread. 
> She went home and ate the bread. She was satisfied."

```
@Story theory 32768 deterministic

    # Characters
    @Alice:Alice __Person
    
    # Objects
    @Bread:Bread __Object
    @Money:Money __Object
    
    # Places
    @Home:Home __Place
    @Store:Store __Place
    
    # States
    @Hungry:Hungry __State
    @Satisfied:Satisfied __State
    
    # Time points
    @T0:T0 __TimePoint
    @T1:T1 __TimePoint
    @T2:T2 __TimePoint
    @T3:T3 __TimePoint
    @T4:T4 __TimePoint
    @T5:T5 __TimePoint
    
    # Events with timestamps
    @s0 inState $Alice Hungry                    # T0: hungry
    @t0 __Role Time T0
    @e0 __Bundle $s0 $t0
    
    @s1 go $Alice Home Store                     # T1: go to store
    @t1 __Role Time T1
    @e1 __Bundle $s1 $t1
    
    @s2 buy $Alice Bread StoreOwner Money        # T2: buy bread
    @t2 __Role Time T2
    @e2 __Bundle $s2 $t2
    
    @s3 go $Alice Store Home                     # T3: go home
    @t3 __Role Time T3
    @e3 __Bundle $s3 $t3
    
    @s4 _ingest $Alice Bread                     # T4: eat bread
    @t4 __Role Time T4
    @e4 __Bundle $s4 $t4
    
    @s5 inState $Alice Satisfied                 # T5: satisfied
    @t5 __Role Time T5
    @e5 __Bundle $s5 $t5
    
    # Temporal sequence
    @seq1 before $e0 $e1
    @seq2 before $e1 $e2
    @seq3 before $e2 $e3
    @seq4 before $e3 $e4
    @seq5 before $e4 $e5
    
    # Causal links
    @c1 causes $e0 $e1      # hunger caused going to store
    @c2 enables $e2 $e4     # buying enabled eating
    @c3 causes $e4 $e5      # eating caused satisfaction

end
```

---

### 7.15.5 Type Quick Reference

| Natural Language | Type | Example |
|------------------|------|---------|
| People, animals, agents | `__Person` | John, Alice, Dog |
| Physical things | `__Object` | Ball, Car, Book |
| Locations | `__Place` | Home, Paris, Store |
| Companies, groups | `__Organization` | Google, FBI |
| Materials | `__Substance` | Water, Wood, Air |
| Permanent attributes | `__Property` | Red, Heavy, Tall |
| Temporary conditions | `__State` | Hungry, Broken, Happy |
| Classes of things | `__Category` | Person, Vehicle, Food |
| Relationships | `__Relation` | Parent, Owner, Before |
| Action concepts | `__Action` | Walking, Buying |
| Moments | `__TimePoint` | Yesterday, T0, 3pm |
| Durations | `__TimePeriod` | Morning, 2024 |
| Exact numbers | `__Number` | 5, 100, 3.14 |
| Fuzzy quantities | `__Amount` | Many, Few, Some |

---

## 7.16 Complete Core Theory Definition

```
@Core theory 32768 deterministic

    # ===== Type Markers =====
    @EntityType:EntityType ___NewVector
    @PersonType:PersonType ___NewVector
    @ObjectType:ObjectType ___NewVector
    @PlaceType:PlaceType ___NewVector
    @OrganizationType:OrganizationType ___NewVector
    @SubstanceType:SubstanceType ___NewVector
    @PropertyType:PropertyType ___NewVector
    @StateType:StateType ___NewVector
    @CategoryType:CategoryType ___NewVector
    @RelationType:RelationType ___NewVector
    @ActionType:ActionType ___NewVector
    @TimePointType:TimePointType ___NewVector
    @TimePeriodType:TimePeriodType ___NewVector
    @NumberType:NumberType ___NewVector
    @AmountType:AmountType ___NewVector
    @EventType:EventType ___NewVector
    @RoleType:RoleType ___NewVector
    
    # ===== Position Vectors (for argument ordering) =====
    # These replace permutation - see Chapter 1.4
    @Pos1:Pos1 ___NewVector "__Pos1__" "Core"
    @Pos2:Pos2 ___NewVector "__Pos2__" "Core"
    @Pos3:Pos3 ___NewVector "__Pos3__" "Core"
    @Pos4:Pos4 ___NewVector "__Pos4__" "Core"
    @Pos5:Pos5 ___NewVector "__Pos5__" "Core"
    @Pos6:Pos6 ___NewVector "__Pos6__" "Core"
    @Pos7:Pos7 ___NewVector "__Pos7__" "Core"
    @Pos8:Pos8 ___NewVector "__Pos8__" "Core"
    @Pos9:Pos9 ___NewVector "__Pos9__" "Core"
    @Pos10:Pos10 ___NewVector "__Pos10__" "Core"
    @Pos11:Pos11 ___NewVector "__Pos11__" "Core"
    @Pos12:Pos12 ___NewVector "__Pos12__" "Core"
    @Pos13:Pos13 ___NewVector "__Pos13__" "Core"
    @Pos14:Pos14 ___NewVector "__Pos14__" "Core"
    @Pos15:Pos15 ___NewVector "__Pos15__" "Core"
    @Pos16:Pos16 ___NewVector "__Pos16__" "Core"
    @Pos17:Pos17 ___NewVector "__Pos17__" "Core"
    @Pos18:Pos18 ___NewVector "__Pos18__" "Core"
    @Pos19:Pos19 ___NewVector "__Pos19__" "Core"
    @Pos20:Pos20 ___NewVector "__Pos20__" "Core"
    
    # ===== Typed Constructors =====
    @__Entity:__Entity macro ... end
    @__Person:__Person macro ... end
    @__Object:__Object macro ... end
    @__Place:__Place macro ... end
    @__Organization:__Organization macro ... end
    @__Substance:__Substance macro ... end
    @__Property:__Property macro ... end
    @__State:__State macro ... end
    @__Category:__Category macro ... end
    @__Relation:__Relation macro ... end
    @__Action:__Action macro ... end
    @__TimePoint:__TimePoint macro ... end
    @__TimePeriod:__TimePeriod macro ... end
    @__Number:__Number macro value ... end
    @__Amount:__Amount macro ... end
    @__Event:__Event macro ... end
    
    # ===== Structural =====
    @__Role:__Role macro roleName filler ... end
    @__Pair:__Pair macro a b ... end
    @__Triple:__Triple macro a b c ... end
    @__Bundle:__Bundle macro items ... end
    @__Sequence:__Sequence macro items ... end
    
    # ===== L2 Semantic Primitives =====
    @_ptrans:_ptrans macro agent object from to ... end
    @_atrans:_atrans macro agent object from to ... end
    @_mtrans:_mtrans macro agent info from to ... end
    @_propel:_propel macro agent object direction ... end
    @_grasp:_grasp macro agent object ... end
    @_ingest:_ingest macro agent object ... end
    @_expel:_expel macro agent object ... end
    @_mbuild:_mbuild macro agent idea ... end
    @_attend:_attend macro agent sense target ... end
    @_speak:_speak macro agent utterance ... end
    @_conc:_conc macro agent concept ... end
    
    # ===== Logic =====
    @Implies:Implies __Relation
    @And:And __Relation
    @Or:Or __Relation
    @Not:Not __Relation
    @Iff:Iff __Relation
    @Xor:Xor __Relation
    @ForAll:ForAll __Relation
    @Exists:Exists __Relation
    
    @ImpliesMacro:implies macro ante cons ... end
    @AndMacro:and macro a b ... end
    @OrMacro:or macro a b ... end
    @NotMacro:not macro prop ... end
    @ForAllMacro:forall macro var pred ... end
    @ExistsMacro:exists macro var pred ... end
    
    # ===== Temporal =====
    @Before:Before __Relation
    @After:After __Relation
    @During:During __Relation
    @Causes:Causes __Relation
    @Enables:Enables __Relation
    @Prevents:Prevents __Relation
    
    @BeforeMacro:before macro e1 e2 ... end
    @AfterMacro:after macro e1 e2 ... end
    @CausesMacro:causes macro c e ... end
    @EnablesMacro:enables macro e1 e2 ... end
    @PreventsMacro:prevents macro p e ... end
    
    # ===== Modal =====
    @Possible:Possible __Property
    @Necessary:Necessary __Property
    @Permitted:Permitted __Property
    @Forbidden:Forbidden __Property
    @Obligatory:Obligatory __Property
    @Known:Known __State
    @Believed:Believed __State
    
    @PossibleMacro:possible macro prop ... end
    @NecessaryMacro:necessary macro prop ... end
    @KnowsMacro:knows macro agent prop ... end
    @BelievesMacro:believes macro agent prop ... end
    @MustMacro:must macro agent action ... end
    @MayMacro:may macro agent action ... end
    
    # ===== Default =====
    @Default:Default __Relation
    @Exception:Exception __Relation
    @Unless:Unless __Relation
    
    @DefaultMacro:normally macro cat prop ... end
    @ExceptionMacro:except macro subcat prop ... end
    @UnlessMacro:unless macro prop cond ... end
    
    # ===== Roles =====
    @Agent:Agent __Relation
    @CoAgent:CoAgent __Relation
    @Theme:Theme __Relation
    @Patient:Patient __Relation
    @Experiencer:Experiencer __Relation
    @Recipient:Recipient __Relation
    @Beneficiary:Beneficiary __Relation
    @Source:Source __Relation
    @Goal:Goal __Relation
    @Location:Location __Relation
    @Instrument:Instrument __Relation
    @Manner:Manner __Relation
    @Time:Time __Relation
    @Duration:Duration __Relation
    @Cause:Cause __Relation
    @Purpose:Purpose __Relation
    @Result:Result __Relation
    @Content:Content __Relation
    
    # ===== Property/State Macros =====
    @HasPropertyMacro:hasProperty macro entity prop ... end
    @InStateMacro:inState macro entity state ... end
    @IsAMacro:isA macro entity cat ... end
    @SubclassMacro:subclass macro sub super ... end
    
    # ===== L3 Bootstrap =====
    @TellMacro:tell macro speaker info listener ... end
    @AskMacro:ask macro asker question askee ... end
    @GiveMacro:give macro giver object receiver ... end
    @TakeMacro:take macro taker object source ... end
    @BuyMacro:buy macro buyer item seller price ... end
    @SellMacro:sell macro seller item buyer price ... end
    @GoMacro:go macro agent from to ... end
    @SeeMacro:see macro exp object ... end
    @HearMacro:hear macro exp sound ... end
    @WantMacro:want macro exp desired ... end
    @LikeMacro:like macro exp liked ... end
    @FearMacro:fear macro exp feared ... end
    
    # ===== Reasoning =====
    @AbduceMacro:abduce macro obs ... end
    @InduceMacro:induce macro examples ... end
    @WhatIfMacro:whatif macro world fact ... end
    @AnalogyMacro:analogy macro a b c ... end
    @SimilarMacro:similar macro query vocab ... end

end
```

---

## 7.17 Summary

| Category | Count | Key Items |
|----------|-------|-----------|
| Type Markers | 17 | EntityType, PersonType, PropertyType, StateType |
| **Position Vectors** | 20 | Pos1...Pos20 (replace permutation) |
| Typed Constructors | 16 | __Person, __Object, __Place, __Property, __State |
| Structural | 5 | __Role, __Pair, __Bundle, __Event |
| L2 Primitives | 11 | _ptrans, _atrans, _mtrans, _mbuild |
| Logic | 8+6 | Implies, And, Or, Not + macros |
| Temporal | 6+5 | Before, After, Causes + macros |
| Modal | 7+6 | Possible, Known, Obligatory + macros |
| Default | 3+3 | Default, Exception, Unless + macros |
| Roles | 18 | Agent, Theme, Goal, Source, Recipient |
| Property/State | 4 | hasProperty, inState, isA, subclass |
| L3 Bootstrap | 12 | tell, give, buy, go, see, want |
| Reasoning | 5 | abduce, induce, whatif, analogy, similar |

**Total: ~140 definitions**

**Key design decisions:**
- **No permutation** — breaks vector extension
- **Position vectors** — Pos1...Pos20 encode argument order
- **ASCII stamping** — deterministic, extensible initialization
- **Strong types** — catches errors, guides LLM translation

---

*End of Chapter 7*
