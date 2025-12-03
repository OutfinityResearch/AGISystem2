# DS-HOOK: Design Specification - Hook System

**Document ID**: DS-HOOK-001
**Version**: 1.0
**Date**: 2025-12-03
**Status**: Draft
**Implements**: URS-TAI-030 through URS-TAI-043

---

## 1. Overview

### 1.1 Purpose

This document specifies the architectural design for the **Hook System** - a mechanism for declaring reactive behaviors (reflexes) in Sys2DSL theories that respond to system events.

### 1.2 Key Concepts

| Concept | Description |
|---------|-------------|
| **Hook** | A DSL program triggered by a system event |
| **Event** | A notable occurrence (fact added, concept created, etc.) |
| **Hook Context** | Isolated execution environment with restrictions |
| **Meta-Command** | Special verb that can modify state during hook execution |

### 1.3 Design Goals

1. **Declarative**: Policies expressed in DSL, not hidden in code
2. **Auditable**: All hooks visible and inspectable
3. **Safe**: No infinite loops, controlled side effects
4. **Performant**: Minimal overhead for common operations

---

## 2. Event Types

### 2.1 Event Catalog

| Event ID | Event Name | Trigger Condition | Available Context |
|----------|------------|-------------------|-------------------|
| E001 | ON_FACT_ADDED | New fact stored in ConceptStore | subject, relation, object, existence |
| E002 | ON_CONCEPT_CREATED | First usage of a concept label | concept, source |
| E003 | ON_REASONING_STEP | Inference operation in axiological region | subject, relation, result, region |
| E004 | ON_CONTRADICTION | ContradictionDetector finds conflict | fact1, fact2, rule |

### 2.2 Event Structure

```javascript
class HookEvent {
  constructor(type, payload) {
    this.type = type;           // 'ON_FACT_ADDED', etc.
    this.payload = payload;     // Event-specific data
    this.timestamp = Date.now();
    this.source = null;         // Theory that registered the hook
  }
}

// Example payload for ON_FACT_ADDED
{
  subject: "Dog",
  relation: "IS_A",
  object: "Mammal",
  existence: 127,
  factId: 123
}
```

---

## 3. Hook Declaration Syntax

### 3.1 Syntax A: Hook Blocks (Primary)

```sys2dsl
@HOOK <name> <EVENT_TYPE> BEGIN
  # Standard DSL statements
  @var1 subject READ_DIM existence
  @var2 $var1 GREATER_THAN threshold

  # Conditional meta-commands
  @decision IF $var2 THEN
    @effect subject SET_EXISTENCE IMPOSSIBLE
  END
END
```

### 3.2 Syntax B: Annotated Verbs (Alternative)

```sys2dsl
@hook_def existence_policy HOOK_FOR ON_FACT_ADDED
@existence_policy BEGIN
  # Hook logic
END
```

### 3.3 Parsing Rules

1. `@HOOK` keyword starts hook declaration
2. `<name>` is unique identifier within theory
3. `<EVENT_TYPE>` must be in event catalog
4. `BEGIN ... END` contains hook body
5. Hook body uses standard DSL + meta-commands

---

## 4. Hook Registry

### 4.1 Registry Structure

```javascript
class HookRegistry {
  constructor() {
    this._hooks = new Map();  // eventType → Array<Hook>
    this._hooksByName = new Map();  // hookName → Hook
    this._executionStack = [];
    this._inHookContext = false;
  }
}

class Hook {
  constructor(name, eventType, program, source) {
    this.name = name;
    this.eventType = eventType;
    this.program = program;      // Parsed DSL statements
    this.source = source;        // { theory: string, line: number }
    this.enabled = true;
    this.priority = 0;           // Lower = earlier execution
  }
}
```

### 4.2 Registration Flow

```
Theory Load
    │
    ▼
┌───────────────────┐
│ Parser detects    │
│ @HOOK declaration │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Parse hook body   │
│ into program AST  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Register in       │
│ HookRegistry      │
└───────────────────┘
```

### 4.3 Registration API

```javascript
class HookRegistry {
  register(hook) {
    // Validate event type
    if (!VALID_EVENTS.includes(hook.eventType)) {
      throw new Error(`Unknown event type: ${hook.eventType}`);
    }

    // Check for name conflicts
    if (this._hooksByName.has(hook.name)) {
      throw new Error(`Duplicate hook name: ${hook.name}`);
    }

    // Add to registry
    const hooks = this._hooks.get(hook.eventType) || [];
    hooks.push(hook);
    hooks.sort((a, b) => a.priority - b.priority);
    this._hooks.set(hook.eventType, hooks);
    this._hooksByName.set(hook.name, hook);
  }

  getHooksForEvent(eventType) {
    return (this._hooks.get(eventType) || []).filter(h => h.enabled);
  }
}
```

---

## 5. Hook Execution Context

### 5.1 Isolation Requirements

During hook execution:

| Aspect | State | Reason |
|--------|-------|--------|
| Other hooks | DISABLED | Prevent recursion |
| Index writes | BLOCKED | No uncontrolled side effects |
| Meta-commands | ENABLED | Controlled state changes |
| Reads | ALLOWED | Hooks need to inspect state |

### 5.2 Context Manager

```javascript
class HookExecutionContext {
  constructor(engine, event) {
    this.engine = engine;
    this.event = event;
    this.bindings = new Map();  // Variable bindings
    this.effects = [];          // Pending state changes
    this.previousState = null;
  }

  enter() {
    // Save and modify engine state
    this.previousState = {
      hooksEnabled: this.engine.hooksEnabled,
      indexWritesBlocked: this.engine.indexWritesBlocked
    };

    this.engine.hooksEnabled = false;
    this.engine.indexWritesBlocked = true;
    this.engine._hookContext = this;

    // Bind event payload as variables
    for (const [key, value] of Object.entries(this.event.payload)) {
      this.bindings.set(key, value);
    }
  }

  exit() {
    // Restore engine state
    this.engine.hooksEnabled = this.previousState.hooksEnabled;
    this.engine.indexWritesBlocked = this.previousState.indexWritesBlocked;
    this.engine._hookContext = null;

    // Apply collected effects
    for (const effect of this.effects) {
      this._applyEffect(effect);
    }
  }

  addEffect(effect) {
    this.effects.push(effect);
  }

  _applyEffect(effect) {
    switch (effect.type) {
      case 'SET_EXISTENCE':
        this.engine.store.setFactExistence(effect.factId, effect.value);
        break;
      case 'TAG':
        this.engine.store.addTag(effect.concept, effect.tag);
        break;
      case 'NEEDS_CONFIRMATION':
        this.engine.confirmationQueue.add(effect.item);
        break;
    }
  }
}
```

### 5.3 Execution Flow

```javascript
class HookRunner {
  async fireEvent(event) {
    if (!this.registry.engine.hooksEnabled) {
      return;  // Hooks disabled (we're in a hook context)
    }

    const hooks = this.registry.getHooksForEvent(event.type);

    for (const hook of hooks) {
      const context = new HookExecutionContext(this.registry.engine, event);

      try {
        context.enter();
        await this.executeHook(hook, context);
      } finally {
        context.exit();
      }
    }
  }

  async executeHook(hook, context) {
    const executor = new DSLExecutor(this.registry.engine, context.bindings);

    for (const statement of hook.program) {
      await executor.execute(statement, {
        allowMetaCommands: true,
        hookContext: context
      });
    }
  }
}
```

---

## 6. Meta-Commands

### 6.1 Meta-Command Catalog

| Command | Syntax | Effect | Allowed Context |
|---------|--------|--------|-----------------|
| SET_EXISTENCE | `@_ subject SET_EXISTENCE level` | Change fact existence | ON_FACT_ADDED |
| TAG | `@_ subject TAG tagname` | Add tag to concept | Any |
| NEEDS_CONFIRMATION | `@_ subject NEEDS_CONFIRMATION reason` | Queue for user review | Any |
| BLOCK_REASONING | `@_ subject BLOCK_REASONING region` | Prevent inference | ON_REASONING_STEP |
| BOOST_EXISTENCE | `@_ subject BOOST_EXISTENCE amount` | Increase existence | ON_REASONING_STEP |

### 6.2 Meta-Command Validation

```javascript
const META_COMMANDS = {
  'SET_EXISTENCE': {
    validEvents: ['ON_FACT_ADDED', 'ON_REASONING_STEP'],
    handler: (ctx, subject, level) => {
      ctx.addEffect({
        type: 'SET_EXISTENCE',
        factId: ctx.event.payload.factId,
        value: EXISTENCE[level] || parseInt(level)
      });
    }
  },
  'TAG': {
    validEvents: ['ON_CONCEPT_CREATED', 'ON_FACT_ADDED'],
    handler: (ctx, concept, tag) => {
      ctx.addEffect({
        type: 'TAG',
        concept: concept,
        tag: tag
      });
    }
  },
  // ...
};

function executeMetaCommand(command, args, hookContext) {
  const meta = META_COMMANDS[command];

  if (!meta) {
    throw new Error(`Unknown meta-command: ${command}`);
  }

  if (!meta.validEvents.includes(hookContext.event.type)) {
    throw new Error(
      `Meta-command ${command} not valid for event ${hookContext.event.type}`
    );
  }

  meta.handler(hookContext, ...args);
}
```

---

## 7. Standard Hooks

### 7.1 Existence Policy Hook

```sys2dsl
# Auto-set existence based on session mode
@HOOK existence_policy ON_FACT_ADDED BEGIN
  @mode session READ_CONTROL mode
  @isLearning $mode EQUALS learning

  @result IF $isLearning THEN
    @effect subject SET_EXISTENCE UNPROVEN
  END
END
```

### 7.2 Ethics Guard Hook

```sys2dsl
# Block reasoning in high-risk axiological regions
@HOOK ethics_guard ON_REASONING_STEP BEGIN
  @risk subject READ_DIM ethical_risk
  @tooHigh $risk GREATER_THAN 80

  @decision IF $tooHigh THEN
    @block subject BLOCK_REASONING ethics
    @flag subject NEEDS_CONFIRMATION ethical_review
  END
END
```

### 7.3 Unknown Domain Tagger

```sys2dsl
# Tag new concepts that lack domain classification
@HOOK domain_tagger ON_CONCEPT_CREATED BEGIN
  @hasDomain subject READ_DIM domain
  @isUnknown $hasDomain EQUALS zero

  @result IF $isUnknown THEN
    @tag subject TAG unknown_domain
  END
END
```

### 7.4 Contradiction Handler

```sys2dsl
# Handle contradictions by queuing for review
@HOOK contradiction_handler ON_CONTRADICTION BEGIN
  @conflict NEW_COMPOSITE $fact1 $fact2
  @flag $conflict NEEDS_CONFIRMATION contradiction_review
  @lower $fact2 SET_EXISTENCE UNPROVEN
END
```

---

## 8. Hook Priority and Ordering

### 8.1 Priority Levels

```javascript
const HOOK_PRIORITY = {
  SYSTEM: 0,      // Built-in safety hooks
  THEORY: 100,    // Theory-defined hooks
  USER: 200       // User-defined hooks
};
```

### 8.2 Ordering Rules

1. Hooks execute in priority order (lower first)
2. Within same priority, declaration order
3. Within same theory, line number order
4. Effects from all hooks collected, then applied

### 8.3 Override Prevention

System hooks (priority 0) cannot be overridden:

```javascript
register(hook) {
  if (hook.priority < HOOK_PRIORITY.SYSTEM && hook.source !== 'system') {
    throw new Error('Cannot register hooks with system priority');
  }
  // ...
}
```

---

## 9. Hook Introspection

### 9.1 List All Hooks

```javascript
class HookRegistry {
  listHooks(filter = {}) {
    let hooks = Array.from(this._hooksByName.values());

    if (filter.eventType) {
      hooks = hooks.filter(h => h.eventType === filter.eventType);
    }
    if (filter.source) {
      hooks = hooks.filter(h => h.source.theory === filter.source);
    }
    if (filter.enabled !== undefined) {
      hooks = hooks.filter(h => h.enabled === filter.enabled);
    }

    return hooks.map(h => ({
      name: h.name,
      eventType: h.eventType,
      source: h.source,
      enabled: h.enabled,
      priority: h.priority
    }));
  }
}
```

### 9.2 Hook Audit Trail

```javascript
class HookExecutionLog {
  constructor() {
    this._log = [];
  }

  record(event, hook, context, result) {
    this._log.push({
      timestamp: Date.now(),
      event: event.type,
      hook: hook.name,
      payload: event.payload,
      effects: context.effects.map(e => ({ ...e })),
      success: result.success,
      error: result.error || null
    });
  }

  getLog(filter = {}) {
    let log = this._log;

    if (filter.since) {
      log = log.filter(e => e.timestamp >= filter.since);
    }
    if (filter.hook) {
      log = log.filter(e => e.hook === filter.hook);
    }

    return log;
  }
}
```

---

## 10. Error Handling

### 10.1 Hook Execution Errors

```javascript
async executeHook(hook, context) {
  try {
    await this._runHookProgram(hook, context);
    return { success: true };
  } catch (error) {
    // Log but don't crash the system
    this.log.record(context.event, hook, context, {
      success: false,
      error: error.message
    });

    // Depending on severity, may want to disable hook
    if (error.code === 'HOOK_INFINITE_LOOP') {
      hook.enabled = false;
    }

    return { success: false, error: error.message };
  }
}
```

### 10.2 Forbidden Operations

```javascript
const FORBIDDEN_IN_HOOK = ['IS_A', 'HAS', 'CAUSES', 'ADD_FACT'];

function validateHookStatement(statement, hookContext) {
  if (FORBIDDEN_IN_HOOK.includes(statement.verb)) {
    throw new HookError(
      `Verb ${statement.verb} not allowed in hook context. ` +
      `Use meta-commands instead.`
    );
  }
}
```

---

## 11. Integration Points

### 11.1 ConceptStore Integration

```javascript
class ConceptStore {
  addFact(subject, relation, object, existence) {
    const fact = this._createFact(subject, relation, object, existence);
    this._storeFact(fact);

    // Fire hook event
    this.hookRunner.fireEvent(new HookEvent('ON_FACT_ADDED', {
      subject, relation, object, existence,
      factId: fact.factId
    }));

    return fact;
  }

  ensureConcept(label) {
    if (!this._concepts.has(label)) {
      this._concepts.set(label, this._createConcept(label));

      // Fire hook event
      this.hookRunner.fireEvent(new HookEvent('ON_CONCEPT_CREATED', {
        concept: label,
        source: this._currentContext?.source || 'runtime'
      }));
    }
    return this._concepts.get(label);
  }
}
```

### 11.2 Reasoner Integration

```javascript
class Reasoner {
  inferStep(subject, relation, object) {
    const result = this._performInference(subject, relation, object);

    // Check if in axiological region
    const region = this._getAxiologicalRegion(subject);
    if (region) {
      this.hookRunner.fireEvent(new HookEvent('ON_REASONING_STEP', {
        subject, relation,
        result: result,
        region: region
      }));
    }

    return result;
  }
}
```

### 11.3 ContradictionDetector Integration

```javascript
class ContradictionDetector {
  check(fact1, fact2) {
    const conflict = this._detectConflict(fact1, fact2);

    if (conflict) {
      this.hookRunner.fireEvent(new HookEvent('ON_CONTRADICTION', {
        fact1: fact1,
        fact2: fact2,
        rule: conflict.rule
      }));
    }

    return conflict;
  }
}
```

---

## 12. DSL Engine Extensions

### 12.1 Parser Extension

```javascript
// In DSL parser
parseStatement(line) {
  const tokens = tokenize(line);

  if (tokens[0] === '@HOOK') {
    return this.parseHookDeclaration(tokens);
  }

  // ... existing parsing
}

parseHookDeclaration(tokens) {
  // @HOOK name EVENT_TYPE BEGIN
  const name = tokens[1];
  const eventType = tokens[2];

  if (tokens[3] !== 'BEGIN') {
    throw new ParseError('Expected BEGIN after event type');
  }

  // Parse until END
  const body = this.parseUntilEnd();

  return {
    type: 'HOOK_DECLARATION',
    name: name,
    eventType: eventType,
    body: body
  };
}
```

### 12.2 Engine Execution

```javascript
class DSLEngine {
  executeStatement(stmt, options = {}) {
    if (stmt.type === 'HOOK_DECLARATION') {
      this.registerHook(stmt);
      return;
    }

    // If in hook context, validate statement
    if (options.hookContext) {
      validateHookStatement(stmt, options.hookContext);
    }

    // ... existing execution
  }

  registerHook(stmt) {
    const hook = new Hook(
      stmt.name,
      stmt.eventType,
      stmt.body,
      { theory: this._currentTheory, line: this._currentLine }
    );

    this.hookRegistry.register(hook);
  }
}
```

---

## 13. Testing Strategy

### 13.1 Unit Tests

| Test Case | Expected |
|-----------|----------|
| Register hook | Hook in registry |
| Fire ON_FACT_ADDED | Hook executes |
| Hook context isolation | hooksEnabled = false |
| Meta-command in hook | Effect collected |
| Forbidden verb in hook | Error thrown |

### 13.2 Integration Tests

| Test Case | Expected |
|-----------|----------|
| Multiple hooks same event | All execute in order |
| Hook modifies existence | Fact updated after exit |
| Hook triggers contradiction | ON_CONTRADICTION fires |
| Disabled hook | Not executed |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | AGISystem2 Team | Initial draft |
