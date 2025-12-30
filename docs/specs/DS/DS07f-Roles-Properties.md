# AGISystem2 - System Specifications

# Chapter 7f: Semantic Roles & Property Relations

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 Core Theory (refactored)
**Config Files:** `config/Core/09-roles.sys2`, `config/Core/10-properties.sys2`, `config/Core/00-relations.sys2`

---

## 7f.1 Overview

This document specifies:

1. **Semantic Roles**: Thematic relations for event participants
2. **Property Relations**: Attribute assignment and categorization
3. **Relation Types**: Transitive, symmetric, reflexive relations

---

## 7f.2 Semantic Roles

Defined in `config/Core/09-roles.sys2`.

### 7f.2.1 Agent Roles

```sys2
@Agent:Agent __Relation          # Who performs action
@CoAgent:CoAgent __Relation      # Who helps perform
```

### 7f.2.2 Patient/Theme Roles

```sys2
@Theme:Theme __Relation          # What is affected
@Patient:Patient __Relation      # What undergoes change
```

### 7f.2.3 Experiencer Role

```sys2
@Experiencer:Experiencer __Relation    # Who experiences
```

### 7f.2.4 Transfer Roles

```sys2
@Recipient:Recipient __Relation  # Who receives
@Beneficiary:Beneficiary __Relation    # Who benefits
@Source:Source __Relation        # Starting point
@Goal:Goal __Relation            # Ending point
```

### 7f.2.5 Circumstantial Roles

```sys2
@Location:Location __Relation    # Where
@Instrument:Instrument __Relation    # With what tool
@Manner:Manner __Relation        # How
@Time:Time __Relation            # When
@Duration:Duration __Relation    # How long
```

### 7f.2.6 Causal Roles

```sys2
@Cause:Cause __Relation          # Why (cause)
@Purpose:Purpose __Relation      # Why (intention)
@Result:Result __Relation        # What resulted
```

### 7f.2.7 Content Roles

```sys2
@Content:Content __Relation      # Information content
@Scope:Scope __Relation          # Logical scope
```

### 7f.2.8 Additional Roles

```sys2
@Target:Target __Relation        # Target of attention
@Direction:Direction __Relation  # Direction of motion
@Attribute:Attribute __Relation  # Property being assigned
@Value:Value __Relation          # Value of property
@Instance:Instance __Relation    # Instance in category
@Category:Category __Relation    # Category of instance
@Subclass:Subclass __Relation    # Subcategory
@Superclass:Superclass __Relation # Supercategory
@Request:Request __Relation      # Request content
@State:State __Relation          # State marker
@Action:Action __Relation        # Action marker
@Magnitude:Magnitude __Relation  # Magnitude of force
```

### 7f.2.9 Role Summary Table

| Category | Roles | Purpose |
|----------|-------|---------|
| Agent | Agent, CoAgent | Who acts |
| Patient | Theme, Patient | What is affected |
| Experiencer | Experiencer | Who feels/perceives |
| Transfer | Recipient, Beneficiary, Source, Goal | Movement endpoints |
| Circumstantial | Location, Instrument, Manner, Time, Duration | Context |
| Causal | Cause, Purpose, Result | Why |
| Content | Content, Scope | Information |
| Structure | Instance, Category, Subclass, Superclass | Hierarchy |

**Total: 26 semantic roles**

---

## 7f.3 Property Relations

Defined in `config/Core/10-properties.sys2`.

### 7f.3.1 Property/State Graphs

```sys2
# hasProperty: entity has permanent property
@HasPropertyGraph:hasProperty graph entity property
    @r1 __Role Theme $entity
    @r2 __Role Attribute $property
    @result __Bundle $r1 $r2
    return $result
end

# inState: entity is in temporary state
@InStateGraph:inState graph entity state
    @r1 __Role Theme $entity
    @r2 __Role State $state
    @result __Bundle $r1 $r2
    return $result
end
```

### 7f.3.2 Category Graphs

```sys2
# isA: entity is member of category
@IsAGraph:isA graph entity category
    @r1 __Role Instance $entity
    @r2 __Role Category $category
    @result __Bundle $r1 $r2
    return $result
end

# subclass: category1 is subclass of category2
@SubclassGraph:subclass graph subcategory supercategory
    @r1 __Role Subclass $subcategory
    @r2 __Role Superclass $supercategory
    @result __Bundle $r1 $r2
    return $result
end
```

### 7f.3.3 Part-Whole Relations

```sys2
@PartOf:PartOf __Relation
@HasPart:HasPart __Relation
@MadeOf:MadeOf __Relation

@PartOfGraph:partOf graph part whole
    @pair __Pair $part $whole
    @result __Role PartOf $pair
    return $result
end

@HasPartGraph:hasPart graph whole part
    @pair __Pair $whole $part
    @result __Role HasPart $pair
    return $result
end

@MadeOfGraph:madeOf graph object substance
    @pair __Pair $object $substance
    @result __Role MadeOf $pair
    return $result
end
```

### 7f.3.4 Location Relations

```sys2
@At:At __Relation
@In:In __Relation
@On:On __Relation
@Near:Near __Relation

@AtGraph:at graph entity location
    @r1 __Role Theme $entity
    @r2 __Role Location $location
    @result __Bundle $r1 $r2
    return $result
end

@InGraph:in graph entity container
    @r1 __Role Theme $entity
    @r2 __Role Location $container
    @r3 __Role Relation In
    @result __Bundle $r1 $r2 $r3
    return $result
end

@OnGraph:on graph entity surface
    @r1 __Role Theme $entity
    @r2 __Role Location $surface
    @r3 __Role Relation On
    @result __Bundle $r1 $r2 $r3
    return $result
end

@NearGraph:near graph entity landmark
    @r1 __Role Theme $entity
    @r2 __Role Location $landmark
    @r3 __Role Relation Near
    @result __Bundle $r1 $r2 $r3
    return $result
end
```

---

## 7f.4 Relation Types

Defined in `config/Core/00-relations.sys2`.

### 7f.4.1 Transitive Relations

Relations where: `R(A,B) AND R(B,C) => R(A,C)`

```sys2
@isA:isA __TransitiveRelation
@locatedIn:locatedIn __TransitiveRelation
@partOf:partOf __TransitiveRelation
@subclassOf:subclassOf __TransitiveRelation
@containedIn:containedIn __TransitiveRelation
@before:before __TransitiveRelation
@after:after __TransitiveRelation
@causes:causes __TransitiveRelation
@appealsTo:appealsTo __TransitiveRelation
@leadsTo:leadsTo __TransitiveRelation
@enables:enables __TransitiveRelation
@ancestorOf:ancestorOf __TransitiveRelation
@descendantOf:descendantOf __TransitiveRelation
```

### 7f.4.2 Symmetric Relations

Relations where: `R(A,B) => R(B,A)`

```sys2
@siblingOf:siblingOf __SymmetricRelation
@marriedTo:marriedTo __SymmetricRelation
@near:near __SymmetricRelation
@adjacent:adjacent __SymmetricRelation
```

### 7f.4.3 Reflexive Relations

Relations where: `R(A,A)` is always true

```sys2
@equals:equals __ReflexiveRelation
@sameAs:sameAs __ReflexiveRelation
```

---

## 7f.5 Recently Added Relations

The following relations were identified as "hardcoded" and have now been formally added to core theory:

### 7f.5.1 Added to `10-properties.sys2`

```sys2
# Capability relation
@Can:Can __Relation
@CanGraph:can graph entity ability
    @r1 __Role Theme $entity
    @r2 __Role Attribute $ability
    @result __Bundle $r1 $r2
    return $result
end

# Possession relation
@Has:Has __Relation
@HasGraph:has graph entity possession
    @r1 __Role Theme $entity
    @r2 __Role Attribute $possession
    @result __Bundle $r1 $r2
    return $result
end

# Synonym relation (for fuzzy matching)
@Synonym:Synonym __SymmetricRelation
@SynonymGraph:synonym graph term1 term2
    @pair __Pair $term1 $term2
    @result __Role Synonym $pair
    return $result
end
```

### 7f.5.2 Added to `00-relations.sys2`

```sys2
# Family relations
@parent:parent __Relation
@child:child __Relation
@loves:loves __Relation
@hates:hates __Relation
@owns:owns __Relation

# Misc relations
@likes:likes __Relation
@trusts:trusts __Relation
@conflictsWith:conflictsWith __SymmetricRelation
```

These additions resolve the gaps identified in the hardcoded theory analysis.

---

## 7f.6 Summary

| Category | Count | Examples |
|----------|-------|----------|
| Semantic Roles | 26 | Agent, Theme, Goal, Location |
| Property Graphs | 4 | hasProperty, inState, isA, subclass |
| Part-Whole | 3 | PartOf, HasPart, MadeOf |
| Location | 4 | At, In, On, Near |
| Transitive | 13 | isA, locatedIn, partOf, before |
| Symmetric | 4 | siblingOf, marriedTo, near |
| Reflexive | 2 | equals, sameAs |

---

*End of DS07f - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
