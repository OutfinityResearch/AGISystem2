# Design Spec: Sys2DSL Theory Management & Memory Commands

ID: DS(/theory/Sys2DSL_commands_theory_memory)

Status: DRAFT v1.0

## Scope
Commands for managing theories (list/load/save/merge/reset) and memory/usage control (GET_USAGE, FORGET, BOOST). Syntax uses `@var COMMAND …`.

---

## 1. Theory Management Commands

### 1.1 LIST_THEORIES
**Purpose:** List available theories (local or registered).

**Syntax:**
```sys2dsl
@theories LIST_THEORIES
```

**Returns:** Array of `{ id, name, domain, version, priority }`.

---

### 1.2 LOAD_THEORY
**Purpose:** Load a theory into the working stack.

**Syntax:**
```sys2dsl
@ok LOAD_THEORY base_ontology
```

**Returns:** `{ ok: boolean, layersLoaded: number }`

---

### 1.3 SAVE_THEORY
**Purpose:** Persist the current working theory.

**Syntax:**
```sys2dsl
@ok SAVE_THEORY my_session_snapshot
```

**Returns:** `{ ok: boolean, path: string }`

---

### 1.4 MERGE_THEORY
**Purpose:** Merge a theory into the current one (union).

**Syntax:**
```sys2dsl
@ok MERGE_THEORY domain_extension
```

**Returns:** `{ ok: boolean, mergedFacts: number }`

---

### 1.5 RESET_SESSION
**Purpose:** Clear the working theory/session (keeps persisted theories).

**Syntax:**
```sys2dsl
@ok RESET_SESSION
```

**Returns:** `{ ok: boolean }`

---

## 2. Memory Management Commands

### 2.1 GET_USAGE
**Purpose:** Get usage statistics for concepts/relations.

**Syntax:**
```sys2dsl
@usage GET_USAGE Dog
```

**Returns:** Usage metrics (counts, recency, frequency, priority).

---

### 2.2 FORGET
**Purpose:** Forget concepts based on criteria (threshold, pattern, age).

**Syntax:**
```sys2dsl
@removed FORGET threshold=2 olderThan=30d
```

**Returns:** `{ removed: [], wouldRemove?: [], count, protected, skipped }`

---

### 2.3 BOOST
**Purpose:** Manually boost usage for a concept.

**Syntax:**
```sys2dsl
@boosted BOOST Dog amount=10
```

**Returns:** `{ conceptId, usageCount }`

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted theory + memory commands from DS(/theory/Sys2DSL_commands) |
