# AGISystem2 - System Specifications

# Chapter 7c: L2 Semantic Primitives

**Document Version:** 1.0
**Status:** Draft Specification
**Part Of:** DS07 Core Theory (refactored)
**Config File:** `config/Core/04-semantic-primitives.sys2`

---

## 7c.1 Overview

This document specifies the **Level 2 (L2) Semantic Primitives** - the foundational event types based on Schank's Conceptual Dependency theory. These primitives:

1. **Decompose complex actions** into primitive operations
2. **Enable inference** across similar events
3. **Support NL translation** with semantic precision

---

## 7c.2 Primitive Categories

| Category | Primitives | Description |
|----------|------------|-------------|
| Physical | `_ptrans`, `_propel`, `_grasp`, `_ingest`, `_expel` | Body and object movements |
| Abstract | `_atrans` | Transfer of ownership/control |
| Mental | `_mtrans`, `_mbuild`, `_attend`, `_speak`, `_conc` | Information and thought |

---

## 7c.3 Physical Action Primitives

### 7c.3.1 _ptrans - Physical Transfer

Transfer of physical location.

```sys2
# Types: agent:Entity, object:Entity, from:Place, to:Place
@_ptrans:_ptrans graph agent object from to
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @r3 __Role Source $from
    @r4 __Role Goal $to
    @result __Bundle $eid $r1 $r2 $r3 $r4
    return $result
end
```

**Examples:**
- `go John Home Work` → `_ptrans John John Home Work`
- `move Ball Field Goal` → `_ptrans Player Ball Field Goal`

### 7c.3.2 _propel - Apply Force

Application of physical force to an object.

```sys2
# Types: agent:Entity, object:Object, direction:Property
@_propel:_propel graph agent object direction
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @r3 __Role Direction $direction
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end
```

**Examples:**
- `push Door Forward` → `_propel John Door Forward`
- `kick Ball North` → `_propel Player Ball North`

### 7c.3.3 _grasp - Take Control

Taking physical control of an object.

```sys2
# Types: agent:Entity, object:Object
@_grasp:_grasp graph agent object
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Examples:**
- `grab Key` → `_grasp John Key`
- `hold Baby` → `_grasp Mother Baby`

### 7c.3.4 _ingest - Take Into Body

Taking something into the body (eating, drinking, breathing).

```sys2
# Types: agent:Person, object:Substance|Object
@_ingest:_ingest graph agent object
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Examples:**
- `eat Apple` → `_ingest John Apple`
- `drink Water` → `_ingest Mary Water`
- `breathe Air` → `_ingest Person Air`

### 7c.3.5 _expel - Expel From Body

Expelling something from the body.

```sys2
# Types: agent:Person, object:Substance|Object
@_expel:_expel graph agent object
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Examples:**
- `spit Seed` → `_expel Person Seed`
- `exhale CarbonDioxide` → `_expel Person CarbonDioxide`

---

## 7c.4 Abstract Action Primitives

### 7c.4.1 _atrans - Abstract Transfer

Transfer of ownership, control, or abstract possession.

```sys2
# Types: agent:Entity, object:Entity|Abstract, from:Entity, to:Entity
@_atrans:_atrans graph agent object from to
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Theme $object
    @r3 __Role Source $from
    @r4 __Role Goal $to
    @result __Bundle $eid $r1 $r2 $r3 $r4
    return $result
end
```

**Examples:**
- `give Book Mary` → `_atrans John Book John Mary`
- `buy Car Dealer` → `_atrans John Car Dealer John` + `_atrans John Money John Dealer`
- `steal Wallet Victim` → `_atrans Thief Wallet Victim Thief`

---

## 7c.5 Mental Action Primitives

### 7c.5.1 _mtrans - Mental Transfer

Transfer of information between minds.

```sys2
# Types: agent:Person, info:Abstract, from:Person|Place, to:Person
@_mtrans:_mtrans graph agent info from to
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $info
    @r3 __Role Source $from
    @r4 __Role Recipient $to
    @result __Bundle $eid $r1 $r2 $r3 $r4
    return $result
end
```

**Examples:**
- `tell Secret Mary` → `_mtrans John Secret John Mary`
- `learn Fact Book` → `_mtrans Student Fact Book Student`
- `read Book` → `_mtrans Reader Content Book Reader`

### 7c.5.2 _mbuild - Mental Construction

Creating a mental structure (idea, plan, decision).

```sys2
# Types: agent:Person, idea:Abstract
@_mbuild:_mbuild graph agent idea
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $idea
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Examples:**
- `decide Plan` → `_mbuild John Plan`
- `imagine Scenario` → `_mbuild Mary Scenario`
- `conclude Result` → `_mbuild Scientist Result`

### 7c.5.3 _attend - Focus Sense Organ

Directing sensory attention.

```sys2
# Types: agent:Person, sense:Object, target:Entity
@_attend:_attend graph agent sense target
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Instrument $sense
    @r3 __Role Target $target
    @result __Bundle $eid $r1 $r2 $r3
    return $result
end
```

**Examples:**
- `see Bird` → `_attend John Eyes Bird`
- `hear Music` → `_attend Mary Ears Music`
- `smell Flower` → `_attend Person Nose Flower`

### 7c.5.4 _speak - Produce Sounds

Producing speech or sounds.

```sys2
# Types: agent:Person, utterance:Abstract
@_speak:_speak graph agent utterance
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $utterance
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Examples:**
- `say Hello` → `_speak John Hello`
- `shout Warning` → `_speak Guard Warning`

### 7c.5.5 _conc - Conceptualize

Thinking about or conceptualizing something.

```sys2
# Types: agent:Person, concept:Abstract
@_conc:_conc graph agent concept
    @eid __Event
    @r1 __Role Agent $agent
    @r2 __Role Content $concept
    @result __Bundle $eid $r1 $r2
    return $result
end
```

**Examples:**
- `think Problem` → `_conc Scientist Problem`
- `consider Option` → `_conc Manager Option`

---

## 7c.6 Primitive Summary

| Primitive | Roles | Purpose |
|-----------|-------|---------|
| `_ptrans` | Agent, Theme, Source, Goal | Physical movement |
| `_propel` | Agent, Theme, Direction | Force application |
| `_grasp` | Agent, Theme | Take control |
| `_ingest` | Agent, Theme | Take into body |
| `_expel` | Agent, Theme | Expel from body |
| `_atrans` | Agent, Theme, Source, Goal | Transfer ownership |
| `_mtrans` | Agent, Content, Source, Recipient | Transfer information |
| `_mbuild` | Agent, Content | Create mental structure |
| `_attend` | Agent, Instrument, Target | Sense perception |
| `_speak` | Agent, Content | Produce sounds |
| `_conc` | Agent, Content | Conceptualize |

**Total: 11 L2 primitives**

---

## 7c.7 Why Decomposition Matters

**Without primitives:**
```sys2
@e1 John gives Mary a book
@e2 John hands Mary a book
@e3 John presents Mary with a book
# Three different facts - no connection!
```

**With primitives:**
```sys2
@e1 _atrans John Book John Mary
@e2 _atrans John Book John Mary
@e3 _atrans John Book John Mary
# Same primitive - inference connects them!
```

This enables:
- **Paraphrase recognition**: Different words, same meaning
- **Inference**: If X gives Y to Z, then Z has Y
- **Question answering**: "Who has the book?" → Mary

---

## 7c.8 Implementation Notes

The L2 primitives are:
1. **Defined in** `config/Core/04-semantic-primitives.sys2`
2. **Expanded by** `src/runtime/executor.mjs`
3. **Used by** L3 Bootstrap Verbs (see DS07g)

---

*End of DS07c - See [DS07-Index](DS07-Core-Theory-Index.md) for complete Core Theory*
