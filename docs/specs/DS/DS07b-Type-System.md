# AGISystem2 - System Specifications

# Chapter 7b: Type System & Constructors

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 Core Theory (refactored)
**Config Files:** `config/Core/00-types.sys2`, `config/Core/02-constructors.sys2`, `config/Core/03-structural.sys2`

---

## 7b.1 Overview

This document specifies the **Type System** of AGISystem2 - the mechanism for creating typed atoms and ensuring semantic correctness. Strong typing:

1. **Catches errors early** - prevents nonsensical statements
2. **Guides LLM translation** - helps NL→DSL conversion
3. **Enables type-aware reasoning** - knows what can apply to what

---

## 7b.2 Why Types Matter

**Without types:**
```sys2
@John __Atom        # What is John? Person? Place? Property?
@Red __Atom         # Can we say "Red runs"? Probably not.
@f Hungry John      # Valid
@f John Hungry      # Also valid syntactically, but wrong!
```

**With types:**
```sys2
@John:John __Person
@Red:Red __Property
@f Hungry $John     # Valid: State applied to Person
@f $John Hungry     # Type error: Person cannot be a predicate
```

---

## 7b.3 Type Hierarchy

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
├── __Event (happenings with participants)
└── __Role (semantic roles - special)
```

---

## 7b.4 Type Markers

Defined in `config/Core/00-types.sys2`:

```sys2
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

# Event and Role
@EventType:EventType ___NewVector
@RoleType:RoleType ___NewVector
```

**Total: 19 type markers**

---

## 7b.5 Typed Constructors

Defined in `config/Core/02-constructors.sys2`:

### 7b.5.1 Entity Constructors

```sys2
@__Entity:__Entity graph
    @v ___NewVector
    @typed ___Bind $v EntityType
    return $typed
end

@__Person:__Person graph
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 PersonType
    return $typed
end

@__Object:__Object graph
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 ObjectType
    return $typed
end

@__Place:__Place graph
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 PlaceType
    return $typed
end

@__Organization:__Organization graph
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 OrganizationType
    return $typed
end

@__Substance:__Substance graph
    @v ___NewVector
    @t1 ___Bind $v EntityType
    @typed ___Bind $t1 SubstanceType
    return $typed
end
```

### 7b.5.2 Abstract Constructors

```sys2
@__Property:__Property graph
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 PropertyType
    return $typed
end

@__State:__State graph
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 StateType
    return $typed
end

@__Category:__Category graph
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 CategoryType
    return $typed
end

@__Relation:__Relation graph
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 RelationType
    return $typed
end

@__Action:__Action graph
    @v ___NewVector
    @t1 ___Bind $v AbstractType
    @typed ___Bind $t1 ActionType
    return $typed
end
```

### 7b.5.3 Temporal Constructors

```sys2
@__TimePoint:__TimePoint graph
    @v ___NewVector
    @typed ___Bind $v TimePointType
    return $typed
end

@__TimePeriod:__TimePeriod graph
    @v ___NewVector
    @typed ___Bind $v TimePeriodType
    return $typed
end
```

### 7b.5.4 Quantity Constructors

```sys2
@__Number:__Number graph value
    @v ___NewVector
    @t ___Bind $v NumberType
    @typed ___Bind $t $value
    return $typed
end

@__Amount:__Amount graph
    @v ___NewVector
    @typed ___Bind $v AmountType
    return $typed
end

@__Measure:__Measure graph value unit
    @v ___NewVector
    @t ___Bind $v MeasureType
    @withVal ___Bind $t $value
    @typed ___Bind $withVal $unit
    return $typed
end
```

### 7b.5.5 Event Constructor

```sys2
@__Event:__Event graph
    @v ___NewVector
    @typed ___Bind $v EventType
    return $typed
end
```

---

## 7b.6 Structural Operations

Defined in `config/Core/03-structural.sys2`:

### 7b.6.1 Role Binding

```sys2
@__Role:__Role graph roleName filler
    @r ___Bind $roleName $filler
    @typed ___Bind $r RoleType
    return $typed
end
```

### 7b.6.2 Pair and Triple

```sys2
@__Pair:__Pair graph first second
    @p1 ___Bind $first Pos1
    @p2 ___Bind $second Pos2
    @result ___Bind $p1 $p2
    return $result
end

@__Triple:__Triple graph a b c
    @p1 ___Bind $a Pos1
    @p2 ___Bind $b Pos2
    @p3 ___Bind $c Pos3
    @r1 ___Bind $p1 $p2
    @result ___Bind $r1 $p3
    return $result
end
```

### 7b.6.3 Bundle and Sequence

```sys2
@__Bundle:__Bundle graph items
    @result ___Bundle $items
    return $result
end

@__Sequence:__Sequence graph items
    # Each item bound with position, then bundled
    @result ___BundlePositioned $items
    return $result
end
```

### 7b.6.4 Type Checking

```sys2
@IsTypeGraph:isType graph instance typeMarker
    @extracted ___GetType $instance
    @sim ___Similarity $extracted $typeMarker
    @result GreaterThan $sim 0.8
    return $result
end
```

---

## 7b.7 Usage Examples

### 7b.7.1 Creating Entities

```sys2
# People
@John:John __Person
@Mary:Mary __Person

# Objects
@Ball:Ball __Object
@Car:Car __Object

# Places
@Paris:Paris __Place
@Home:Home __Place

# Organizations
@Google:Google __Organization

# Substances
@Water:Water __Substance
```

### 7b.7.2 Creating Abstract Concepts

```sys2
# Properties (permanent)
@Red:Red __Property
@Heavy:Heavy __Property
@Tall:Tall __Property

# States (temporary)
@Hungry:Hungry __State
@Asleep:Asleep __State
@Broken:Broken __State

# Categories
@Person:Person __Category
@Animal:Animal __Category
@Vehicle:Vehicle __Category

# Relations
@Parent:Parent __Relation
@Owner:Owner __Relation
@Friend:Friend __Relation

# Actions
@Walking:Walking __Action
@Eating:Eating __Action
```

### 7b.7.3 Creating Temporal and Quantities

```sys2
# Time
@Yesterday:Yesterday __TimePoint
@T0:T0 __TimePoint
@Morning:Morning __TimePeriod
@Childhood:Childhood __TimePeriod

# Quantities
@Five:Five __Number 5
@Many:Many __Amount
@TenKg:TenKg __Measure 10 Kilogram
```

---

## 7b.8 Type Quick Reference

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
| With units | `__Measure` | 5kg, 10km |

---

## 7b.9 Implementation Files

| Config File | Purpose |
|-------------|---------|
| `config/Core/00-types.sys2` | Type marker definitions |
| `config/Core/02-constructors.sys2` | Typed constructor graphs |
| `config/Core/03-structural.sys2` | Structural operations |

| Source File | Purpose |
|-------------|---------|
| `src/runtime/executor.mjs` | Graph expansion |
| `src/core/operations.mjs` | Bind, bundle primitives |

---

*End of DS07b - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
