# AGISystem2 - System Specifications
#
# DS29: Creative Writing Consistency and Bias Detection (Trustworthy Pattern) — Research
#
# **Document Version:** 1.0
# **Author:** Sînică Alboaie
# **Status:** Planned (research-level; not implemented)
#
# This document is an extracted, focused spec from DS08 (Trustworthy AI Patterns).
# It is not currently shipped as a runnable Core/config theory set.
#
# Scope: “story bible” as a theory-driven guardrail system: character/world consistency checks, editorial constraints, and bias-pattern reports.

---

## 1. The problem

Creative writing support needs more than text generation. It needs structured guardrails that catch contradictions and harmful patterns without blocking legitimate creativity:

- character consistency (traits, beliefs, knowledge, abilities),
- world consistency (hard rules of the universe),
- editorial rules (required/forbidden/discouraged content patterns),
- bias detection (statistical or structural patterns across scenes).

The goal is to represent the “story bible” as explicit theory artifacts and use `prove()` and query operators to produce actionable reports.

---

## 2. Story bible theory (sketch)

```
@StoryBible theory 32768 deterministic

    # ============ CHARACTER SYSTEM ============

    @Character:Character __Category
    @Trait:Trait __Property
    @Belief:Belief __Property
    @Knowledge:Knowledge __State
    @Ability:Ability __Property
    @Relationship:Relationship __Relation

    # Character definition
    @CharacterGraph:defineCharacter graph name traits beliefs knowledge abilities
        @c1 isA $name Character
        @c2 hasTraits $name $traits
        @c3 hasBelief $name $beliefs
        @c4 knows $name $knowledge
        @c5 canDo $name $abilities
        @result __Bundle $c1 $c2 $c3 $c4 $c5
        return $result
    end

    # Trait definitions (examples)
    @Brave:Brave __Trait
    @Cowardly:Cowardly __Trait
    @Honest:Honest __Trait
    @Deceptive:Deceptive __Trait
    @Compassionate:Compassionate __Trait
    @Cruel:Cruel __Trait
    @Trusting:Trusting __Trait
    @Suspicious:Suspicious __Trait

    # Trait incompatibilities
    @incompatible1 incompatible Brave Cowardly
    @incompatible2 incompatible Honest Deceptive
    @incompatible3 incompatible Compassionate Cruel
    @incompatible4 incompatible Trusting Suspicious

    # ============ WORLD RULES ============

    @WorldRule:WorldRule __Category

    @WorldRuleGraph:worldRule graph name condition consequence
        @r1 __Role Name $name
        @r2 implies $condition $consequence
        @result __Bundle $r1 $r2
        return $result
    end

    # ============ EDITORIAL GUIDELINES ============

    @EditorialRule:EditorialRule __Category
    @Forbidden:Forbidden __Property
    @Required:Required __Property
    @Discouraged:Discouraged __Property

    @EditorialGraph:editorial graph name ruleType condition
        @r1 __Role Name $name
        @r2 __Role RuleType $ruleType
        @r3 __Role Condition $condition
        @result __Bundle $r1 $r2 $r3
        return $result
    end

    # ============ BIAS PATTERNS ============

    @BiasPattern:BiasPattern __Category

    @BiasPatternGraph:biasPattern graph name description detection
        @r1 __Role Name $name
        @r2 __Role Description $description
        @r3 __Role Detection $detection
        @result __Bundle $r1 $r2 $r3
        return $result
    end

end
```

This theory is intended to be extended by a story-specific knowledge base:

- characters and their profiles,
- scenes (actions/dialogue),
- world rules,
- editorial constraints,
- bias pattern definitions.

---

## 3. Story-specific declarations (examples)

### 3.1 Characters

```
@_ Load $StoryBible

@elena defineCharacter Elena
    (bundle Brave Suspicious)
    (bundle (not (trusts Elena Authority)))
    (bundle)
    (bundle Swordfighting)
```

### 3.2 World rules

```
@deathRule worldRule "Death is permanent"
    (state ?person Dead)
    (impossible (state ?person Alive))
```

### 3.3 Editorial rules

```
@ed1 editorial "No deus ex machina"
    Forbidden
    (unexplainedMiracle ?event)

@ed2 editorial "Villains need motivation"
    Required
    (implies (isA ?char Villain) (hasMotivation ?char ?motive))
```

### 3.4 Bias patterns

```
@bias1 biasPattern "Women as emotional"
    "Female characters disproportionately shown as emotional"
    (correlation (isA ?char Female) (frequently (emotional ?char)))
```

---

## 4. Consistency checking (example)

Writers add scenes as structured data (characters present, location, actions, dialogue). The system checks scenes against the story bible.

```javascript
session.learn(`
    @scene42 scene 42
        (bundle Elena Marcus)
        CastleChapel
        (bundle
            (action Elena Prays GoddessAethon)
            (action Marcus Watches Elena))
        (bundle
            (says Elena "Goddess, give me strength"))
`);

const consistency = session.prove(`
    @check consistentWith $scene42 (characterProfile Elena)
`);
```

The expected outcome is not only a boolean, but a report that identifies:

- which constraints were triggered,
- why they might be inconsistent,
- what exceptions would make it acceptable (character development / irony / implied missing scenes),
- actionable remediation suggestions.

---

## 5. World rule validation (example)

```javascript
session.learn(`
    @scene67 scene 67
        (bundle Necromancer)
        Crypt
        (bundle
            (action Necromancer Resurrects King))
        (bundle)
`);

session.learn(`
    @scene23_death state King Dead
`);

const worldCheck = session.prove(`
    @check permittedBy $scene67 WorldRules
`);
```

World rules are intended to be “hard constraints” by default: violations should be blocking unless explicitly documented as exceptions.

---

## 6. Bias detection report (example)

Bias detection is modeled as an analysis query over many scenes and character attributes.

```javascript
const biasReport = session.query(`
    @patterns detectBias AllScenes BiasPatterns
`);

session.elaborate(biasReport);
```

The output is expected to be a structured report with:

- detected patterns,
- evidence/instances,
- ratios and caveats (“sample too small”),
- recommendations.

---

## 7. Notes

This DS is research-level. If promoted to runtime:

- “analysis” operators like `detectBias` and `correlation` require clear semantics and deterministic implementations,
- proofs for bias reports are likely not DS19-style logical proofs; they should be treated as audit traces with explicit computations,
- unit tests should cover both strict constraints (world rules) and advisory checks (character/bias).
