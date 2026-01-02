# AGISystem2 - System Specifications

# Chapter 7e: Temporal, Modal & Default Primitives

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Draft Specification
**Part Of:** DS07 Kernel Pack (refactored; formerly Core)
**Pack Files (canonical):** `config/Packs/Temporal/06-temporal.sys2`, `config/Packs/Modal/07-modal.sys2`, `config/Packs/Defaults/08-defaults.sys2`

---

## 7e.1 Overview

This document specifies three related categories of primitives:

1. **Temporal**: Relations between events in time (before, after, causes)
2. **Modal**: Truth modalities (possible, necessary, permitted, known)
3. **Default**: Non-monotonic reasoning (normally, except, unless)

---

## 7e.2 Temporal Primitives

Defined in the Temporal pack (`config/Packs/Temporal/06-temporal.sys2`).

### 7e.2.1 Temporal Relation Atoms

```sys2
# Allen's interval relations
@Before:Before __Relation
@After:After __Relation
@During:During __Relation
@Starts:Starts __Relation
@Ends:Ends __Relation
@Overlaps:Overlaps __Relation
@Meets:Meets __Relation

# Causal relations
@Causes:Causes __Relation
@Enables:Enables __Relation
@Prevents:Prevents __Relation
```

### 7e.2.2 Temporal Graphs

```sys2
# Before: event1 happened before event2
@BeforeGraph:before graph event1 event2
    @pair __Pair $event1 $event2
    @result __Role Before $pair
    return $result
end

# After: event1 happened after event2
@AfterGraph:after graph event1 event2
    @result before $event2 $event1
    return $result
end

# During: event1 happened during event2
@DuringGraph:during graph event1 event2
    @pair __Pair $event1 $event2
    @result __Role During $pair
    return $result
end

# Starts: event1 starts when event2 starts
@StartsGraph:starts graph event1 event2
    @pair __Pair $event1 $event2
    @result __Role Starts $pair
    return $result
end

# Ends: event1 ends when event2 ends
@EndsGraph:ends graph event1 event2
    @pair __Pair $event1 $event2
    @result __Role Ends $pair
    return $result
end

# Overlaps: event1 overlaps with event2
@OverlapsGraph:overlaps graph event1 event2
    @pair __Pair $event1 $event2
    @result __Role Overlaps $pair
    return $result
end

# Meets: event1 ends exactly when event2 starts
@MeetsGraph:meets graph event1 event2
    @pair __Pair $event1 $event2
    @result __Role Meets $pair
    return $result
end
```

### 7e.2.3 Causal Graphs

```sys2
# Causes: cause led to effect (includes temporal before)
@CausesGraph:causes graph cause effect
    @temporal before $cause $effect
    @causal __Role Causes (__Pair $cause $effect)
    @result __Bundle $temporal $causal
    return $result
end

# Enables: enabler made possible enabled
@EnablesGraph:enables graph enabler enabled
    @pair __Pair $enabler $enabled
    @result __Role Enables $pair
    return $result
end

# Prevents: preventer stopped prevented
@PreventsGraph:prevents graph preventer prevented
    @pair __Pair $preventer $prevented
    @result __Role Prevents $pair
    return $result
end
```

### 7e.2.4 Allen's Interval Relations

| Relation | Meaning | Diagram |
|----------|---------|---------|
| Before | A ends before B starts | `A---A   B---B` |
| Meets | A ends when B starts | `A---AB---B` |
| Overlaps | A starts before B, ends during B | `A---A`<br>`   B---B` |
| During | A contained within B | `  A---A`<br>`B-------B` |
| Starts | A and B start together | `A---A`<br>`B-------B` |
| Ends | A and B end together | `A-------A`<br>`    B---B` |

---

## 7e.3 Modal Primitives

Defined in the Modal pack (`config/Packs/Modal/07-modal.sys2`).

### 7e.3.1 Modal Categories

| Category | Atoms | Meaning |
|----------|-------|---------|
| **Alethic** | Possible, Necessary, Impossible | Truth in possible worlds |
| **Deontic** | Permitted, Forbidden, Obligatory | Moral/legal status |
| **Epistemic** | Known, Believed, Unknown | Knowledge states |

### 7e.3.2 Alethic Atoms

```sys2
@Possible:Possible __Property     # Could be true
@Necessary:Necessary __Property   # Must be true
@Impossible:Impossible __Property # Cannot be true
```

### 7e.3.3 Deontic Atoms

```sys2
@Permitted:Permitted __Property   # Allowed to do
@Forbidden:Forbidden __Property   # Not allowed to do
@Obligatory:Obligatory __Property # Required to do
```

### 7e.3.4 Epistemic Atoms

```sys2
@Known:Known __State       # Agent knows it's true
@Believed:Believed __State # Agent believes it's true
@Unknown:Unknown __State   # Agent doesn't know
```

### 7e.3.5 Modal Graphs

```sys2
# Alethic graphs
@PossibleGraph:possible graph proposition
    @result __Role Possible $proposition
    return $result
end

@NecessaryGraph:necessary graph proposition
    @result __Role Necessary $proposition
    return $result
end

@ImpossibleGraph:impossible graph proposition
    @result __Role Impossible $proposition
    return $result
end

# Epistemic graphs
@KnowsGraph:knows graph agent proposition
    @knower __Role Experiencer $agent
    @content __Role Content $proposition
    @state __Role Known (__Bundle $knower $content)
    return $state
end

@BelievesGraph:believes graph agent proposition
    @believer __Role Experiencer $agent
    @content __Role Content $proposition
    @state __Role Believed (__Bundle $believer $content)
    return $state
end

# Deontic graphs
@MustGraph:must graph agent action
    @obliged __Role Agent $agent
    @act __Role Action $action
    @result __Role Obligatory (__Bundle $obliged $act)
    return $result
end

@MayGraph:may graph agent action
    @permitted __Role Agent $agent
    @act __Role Action $action
    @result __Role Permitted (__Bundle $permitted $act)
    return $result
end

@MustNotGraph:mustNot graph agent action
    @forbidden __Role Agent $agent
    @act __Role Action $action
    @result __Role Forbidden (__Bundle $forbidden $act)
    return $result
end
```

### 7e.3.6 Modal Examples

```sys2
# Alethic
@m1 possible (rain Tomorrow)              # It might rain tomorrow
@m2 necessary (die Mortal)                # All mortals must die
@m3 impossible (square Circle)            # A circle cannot be square

# Epistemic
@e1 knows John (capital France Paris)     # John knows Paris is the capital
@e2 believes Mary (honest Tom)            # Mary believes Tom is honest

# Deontic
@d1 must Driver (stop RedLight)           # Drivers must stop at red lights
@d2 may Child (play Park)                 # Children may play in the park
@d3 mustNot Visitor (touch Exhibit)       # Visitors must not touch exhibits
```

---

## 7e.4 Default Primitives

Defined in the Defaults pack (`config/Packs/Defaults/08-defaults.sys2`).

### 7e.4.1 Default Atoms

```sys2
@Default:Default __Relation
@Exception:Exception __Relation
@Unless:Unless __Relation
@Typical:Typical __Property
@Atypical:Atypical __Property
```

### 7e.4.2 Default Graphs

```sys2
# normally: category normally has property
@DefaultGraph:normally graph category property
    @rule __Role Default (__Pair $category $property)
    return $rule
end

# except: subcategory overrides default
@ExceptionGraph:except graph subcategory property
    @rule __Role Exception (__Pair $subcategory $property)
    return $rule
end

# unless: proposition holds unless condition
@UnlessGraph:unless graph proposition condition
    @negCond not $condition
    @result implies $negCond $proposition
    return $result
end

# typical: instance is typical member of category
@TypicalGraph:typical graph instance category
    @membership isA $instance $category
    @typicality __Role Typical $instance
    @result __Bundle $membership $typicality
    return $result
end

# atypical: instance is atypical member of category
@AtypicalGraph:atypical graph instance category
    @membership isA $instance $category
    @atypicality __Role Atypical $instance
    @result __Bundle $membership $atypicality
    return $result
end
```

### 7e.4.3 Non-Monotonic Reasoning Example

```sys2
# Default: birds normally fly
@d1 normally Bird CanFly

# Exception: penguins don't fly
@e1 except Penguin CanFly

# Facts
@f1 isA Tweety Bird
@f2 isA Opus Bird
@f3 isA Opus Penguin

# Queries:
# can Tweety Fly? → Yes (default applies)
# can Opus Fly?   → No (exception overrides default)
```

---

## 7e.5 Summary

| Category | Atoms | Graphs | Purpose |
|----------|-------|--------|---------|
| Temporal | 7 | 7 | Time relations |
| Causal | 3 | 3 | Cause-effect |
| Alethic | 3 | 3 | Possibility/necessity |
| Deontic | 3 | 3 | Obligation/permission |
| Epistemic | 3 | 2 | Knowledge/belief |
| Default | 5 | 4 | Non-monotonic reasoning |

**Total: 24 atoms, 22 graphs**

---

## 7e.6 Implementation Notes

- **Temporal relations** are marked as transitive in `00-relations.sys2`
- **Modal operators** (`can`, `must`) trigger special handling in proof engine
- **Default reasoning** uses exception checking before applying defaults

---

*End of DS07e - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
