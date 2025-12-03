# DS-HOOK: Design Specification - Hook System

**Document ID**: DS-HOOK-001
**Version**: 2.0
**Date**: 2025-12-03
**Status**: Draft
**Implements**: URS-TAI-020 through URS-TAI-023

---

## 1. Overview

### 1.1 Purpose

This document specifies the Hook System - declarative reflexes triggered by system events. Hooks are expressed as **regular facts/relations**, not special syntax.

### 1.2 Design Constraint

**Triple syntax only**. Hooks are registered via relations. No `@HOOK ... BEGIN ... END` blocks. Everything is facts.

---

## 2. Hook Architecture

### 2.1 Core Concept

A hook is:
1. A **macro** that defines behavior
2. A **registration fact** that binds macro to event

```sys2dsl
# Define the macro (existing syntax)
@check_mode BEGIN
  @mode session GET_MODE any
  @result $mode EQUALS learning
END

# Register as hook via relation
@h1 check_mode HOOK ON_FACT_ADDED
```

### 2.2 Event Types

| Event | Constant | Trigger |
|-------|----------|---------|
| ON_FACT_ADDED | on_fact_added | New fact stored |
| ON_CONCEPT_CREATED | on_concept_created | First concept usage |
| ON_REASONING_STEP | on_reasoning_step | Inference operation |
| ON_CONTRADICTION | on_contradiction | Conflict detected |

---

## 3. Hook Declaration (Triple Syntax)

### 3.1 HOOK Relation

The `HOOK` relation binds a macro to an event:

```sys2dsl
@registration macro_name HOOK event_type
```

**Examples**:

```sys2dsl
# Register existence_policy macro for fact events
@h1 existence_policy HOOK on_fact_added

# Register ethics_guard for reasoning steps
@h2 ethics_guard HOOK on_reasoning_step

# Register tagger for new concepts
@h3 domain_tagger HOOK on_concept_created

# Register handler for contradictions
@h4 conflict_resolver HOOK on_contradiction
```

### 3.2 Hook Macro Definition

Macros use existing `BEGIN ... END` syntax (which is already part of v3):

```sys2dsl
# Macro that checks mode and sets existence
@existence_policy BEGIN
  @mode session GET_MODE any
  @isLearning $mode EQUALS learning
  @newEx $isLearning TERNARY certain unproven
  @result subject SET_EXISTENCE $newEx
END

# Register it
@h1 existence_policy HOOK on_fact_added
```

### 3.3 Hook Priority

Optional priority via additional fact:

```sys2dsl
@h1 existence_policy HOOK on_fact_added
@p1 existence_policy HAS_PRIORITY 10
```

Lower priority = earlier execution.

---

## 4. Hook Context Variables

### 4.1 Implicit Bindings

When a hook executes, these variables are bound:

| Event | Variables |
|-------|-----------|
| on_fact_added | `subject`, `relation`, `object`, `existence` |
| on_concept_created | `concept`, `source` |
| on_reasoning_step | `subject`, `relation`, `result`, `region` |
| on_contradiction | `fact1`, `fact2`, `rule` |

### 4.2 Using Context in Macros

```sys2dsl
# On fact added, 'subject', 'relation', 'object' are available
@existence_policy BEGIN
  @check subject READ_DIM domain
  @isUnknown $check EQUALS zero
  @tag $isUnknown TERNARY unknown_domain none
  @result subject ADD_TAG $tag
END
```

---

## 5. Meta-Relations (Hook Actions)

### 5.1 Available Meta-Relations

These relations have side-effects and are primarily used in hooks:

| Relation | Syntax | Effect |
|----------|--------|--------|
| SET_EXISTENCE | `@r subject SET_EXISTENCE level` | Change fact existence |
| ADD_TAG | `@r subject ADD_TAG tagname` | Add tag to concept |
| REMOVE_TAG | `@r subject REMOVE_TAG tagname` | Remove tag |
| NEEDS_CONFIRMATION | `@r subject NEEDS_CONFIRMATION reason` | Queue for review |
| BLOCK_REASONING | `@r subject BLOCK_REASONING zone` | Stop inference |
| BOOST_EXISTENCE | `@r subject BOOST_EXISTENCE amount` | Increase existence |
| REDUCE_EXISTENCE | `@r subject REDUCE_EXISTENCE amount` | Decrease existence |

### 5.2 Examples

```sys2dsl
# Set existence to unproven
@e1 $fact SET_EXISTENCE unproven

# Tag as needing review
@e2 $concept ADD_TAG needs_review

# Block reasoning in ethics zone
@e3 $subject BLOCK_REASONING ethics_forbidden

# Queue contradiction for human review
@e4 $conflict NEEDS_CONFIRMATION contradiction_detected
```

---

## 6. Hook Isolation

### 6.1 Execution Rules

During hook execution:

1. **Hooks disabled**: No recursive triggers
2. **Writes buffered**: Changes applied after hook completes
3. **Reads allowed**: Hook can inspect KB

### 6.2 Implementation

```javascript
class HookRunner {
  constructor(engine) {
    this.engine = engine;
    this.executing = false;
    this.pendingEffects = [];
  }

  async fireEvent(eventType, context) {
    if (this.executing) return; // No recursion

    const hooks = this.getHooksForEvent(eventType);
    if (!hooks.length) return;

    this.executing = true;
    this.pendingEffects = [];

    try {
      for (const hook of hooks) {
        await this.executeHook(hook, context);
      }
    } finally {
      this.executing = false;
      this.applyPendingEffects();
    }
  }

  applyPendingEffects() {
    for (const effect of this.pendingEffects) {
      this.applyEffect(effect);
    }
    this.pendingEffects = [];
  }
}
```

---

## 7. Hook Registration

### 7.1 Registry Structure

```javascript
class HookRegistry {
  constructor() {
    this._hooks = new Map(); // eventType → Array<{macro, priority}>
  }

  register(macroName, eventType, priority = 100) {
    const hooks = this._hooks.get(eventType) || [];
    hooks.push({ macro: macroName, priority });
    hooks.sort((a, b) => a.priority - b.priority);
    this._hooks.set(eventType, hooks);
  }

  getHooksForEvent(eventType) {
    return this._hooks.get(eventType) || [];
  }
}
```

### 7.2 Registration from DSL

When DSL engine encounters `HOOK` relation:

```javascript
handleRelation(subject, relation, object) {
  if (relation === 'HOOK') {
    this.hookRegistry.register(subject, object);
    return { type: 'hook_registered' };
  }
  // ... other relations
}
```

---

## 8. Standard Hooks (Theory-Defined)

### 8.1 Base Theory: hooks.sys2dsl

```sys2dsl
# =============================================================================
# BASE HOOKS - Standard Hook Definitions
# =============================================================================

# -----------------------------------------------------------------------------
# SECTION 1: Existence Policies
# -----------------------------------------------------------------------------

# Check learning mode and set appropriate existence
@existence_check BEGIN
  @mode session GET_MODE any
  @isReasoning $mode EQUALS reasoning
  @newLevel $isReasoning TERNARY unproven certain
  @result subject SET_EXISTENCE $newLevel
END

# Register for fact events
@hk1 existence_check HOOK on_fact_added

# -----------------------------------------------------------------------------
# SECTION 2: Domain Tagging
# -----------------------------------------------------------------------------

# Tag concepts without domain
@domain_tagger BEGIN
  @domain concept READ_DIM domain
  @hasNone $domain EQUALS zero
  @tag $hasNone TERNARY unknown_domain skip
  @result concept ADD_TAG $tag
END

@hk2 domain_tagger HOOK on_concept_created

# -----------------------------------------------------------------------------
# SECTION 3: Ethics Guard
# -----------------------------------------------------------------------------

# Block reasoning in forbidden zones
@ethics_guard BEGIN
  @risk subject READ_DIM ethical_risk
  @tooHigh $risk GREATER_THAN 80
  @action $tooHigh TERNARY block allow
  @block subject BLOCK_REASONING $action
  @flag subject NEEDS_CONFIRMATION ethics_review
END

@hk3 ethics_guard HOOK on_reasoning_step
@pr3 ethics_guard HAS_PRIORITY 0

# -----------------------------------------------------------------------------
# SECTION 4: Contradiction Handler
# -----------------------------------------------------------------------------

# Queue contradictions for review
@contradiction_handler BEGIN
  @conflict $fact1 CONFLICT_WITH $fact2
  @flag $conflict NEEDS_CONFIRMATION contradiction
  @lower $fact2 REDUCE_EXISTENCE 64
END

@hk4 contradiction_handler HOOK on_contradiction
```

---

## 9. Integration Points

### 9.1 ConceptStore Integration

```javascript
class ConceptStore {
  addFact(subject, relation, object, existence) {
    const fact = this._createFact(subject, relation, object, existence);
    this._storeFact(fact);

    // Fire hook
    this.hookRunner.fireEvent('on_fact_added', {
      subject, relation, object, existence,
      factId: fact.factId
    });

    return fact;
  }

  ensureConcept(label) {
    if (!this._concepts.has(label)) {
      this._concepts.set(label, this._createConcept(label));

      // Fire hook
      this.hookRunner.fireEvent('on_concept_created', {
        concept: label,
        source: this._currentSource
      });
    }
    return this._concepts.get(label);
  }
}
```

### 9.2 Reasoner Integration

```javascript
class Reasoner {
  inferStep(subject, relation, object) {
    const region = this.getAxiologicalRegion(subject);

    // Fire hook before inference
    this.hookRunner.fireEvent('on_reasoning_step', {
      subject, relation, object,
      region: region
    });

    // Check if blocked
    if (this.isBlocked(subject, region)) {
      return { blocked: true, reason: region };
    }

    return this._performInference(subject, relation, object);
  }
}
```

### 9.3 ContradictionDetector Integration

```javascript
class ContradictionDetector {
  check(fact1, fact2) {
    const conflict = this._detectConflict(fact1, fact2);

    if (conflict) {
      this.hookRunner.fireEvent('on_contradiction', {
        fact1, fact2,
        rule: conflict.rule
      });
    }

    return conflict;
  }
}
```

---

## 10. Hook Introspection

### 10.1 List Hooks

Via relation query:

```sys2dsl
# Get all hooks for an event
@hooks any HOOKS_FOR on_fact_added

# Get all registered hooks
@all any LIST_HOOKS any
```

### 10.2 Disable/Enable Hook

```sys2dsl
# Disable a hook
@d1 existence_check DISABLE_HOOK any

# Enable a hook
@e1 existence_check ENABLE_HOOK any
```

---

## 11. Error Handling

### 11.1 Hook Errors

If a hook throws:
1. Error is logged
2. Hook may be disabled (configurable)
3. Other hooks continue executing

```javascript
async executeHook(hook, context) {
  try {
    await this.runMacro(hook.macro, context);
  } catch (error) {
    this.log.error(`Hook ${hook.macro} failed: ${error.message}`);

    if (this.config.disableOnError) {
      this.disableHook(hook.macro);
    }
  }
}
```

---

## 12. Test Cases

| Test | Setup | Expected |
|------|-------|----------|
| Hook registration | `@h1 foo HOOK on_fact_added` | foo in registry |
| Hook fires | Add fact | Hook macro executes |
| No recursion | Hook adds fact | Inner fact doesn't trigger hooks |
| Priority order | Two hooks, different priority | Lower priority first |
| Hook disabled | `@d foo DISABLE_HOOK any` | Hook doesn't execute |

---

## 13. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-03 | Initial draft with block syntax |
| 2.0 | 2025-12-03 | Rewritten for triple-only syntax |
