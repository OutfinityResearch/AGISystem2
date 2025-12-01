# Design Spec: Sys2DSL Assertion, Concept, and Relation Commands

ID: DS(/theory/Sys2DSL_commands_assertions_entities)

Status: DRAFT v1.0

## Scope
Commands that mutate knowledge (ASSERT/RETRACT) and define or bind entities: concepts and relations. Syntax uses `@var COMMAND …`. See DS(/theory/Sys2DSL_syntax) for language rules.

---

## 1. Assertion Commands

### 1.1 ASSERT
**Purpose:** Add a new fact to the current working theory.

**Syntax:**
```sys2dsl
@result ASSERT subject RELATION object
```

**Returns:**
```javascript
{
  ok: boolean,
  factId: string,
  conceptId: string,
  objectConceptId: string,
  created: boolean,
  usageCount: number
}
```

**Example:**
```sys2dsl
@f1 ASSERT Water IS_A liquid
@f2 ASSERT Alice KNOWS Bob
@f3 ASSERT Dog HAS_PROPERTY loyalty
```

**Notes:** Facts go to the working theory (session-local); use SAVE_THEORY to persist; increments usage counters.

---

### 1.2 RETRACT
**Purpose:** Remove a fact from the current working theory.

**Syntax:**
```sys2dsl
@result RETRACT subject RELATION object
```

**Returns:** `{ ok, factId, found }`

**Example:**
```sys2dsl
@r1 RETRACT Water IS_A solid
```

---

## 2. Concept Commands

### 2.1 BIND_CONCEPT
**Purpose:** Get or create a concept reference (ID).

**Syntax:**
```sys2dsl
@dog BIND_CONCEPT Dog
```

**Returns:** `{ conceptId, created }`

---

### 2.2 DEFINE_CONCEPT
**Purpose:** Create a new concept with an optional label.

**Syntax:**
```sys2dsl
@c1 DEFINE_CONCEPT supernova "Super Nova"
```

**Returns:** `{ conceptId, label }`

---

### 2.3 INSPECT
**Purpose:** Inspect a concept and its diamonds.

**Syntax:**
```sys2dsl
@info INSPECT Dog
```

**Returns:** Concept metadata (diamonds, radius, masks, usage).

---

## 3. Relation Commands

### 3.1 BIND_RELATION
**Purpose:** Get or create a relation reference.

**Syntax:**
```sys2dsl
@rel BIND_RELATION CAUSES
```

**Returns:** `{ relationId, created }`

---

### 3.2 DEFINE_RELATION
**Purpose:** Define a new relation with properties (symmetric, transitive, inverse).

**Syntax:**
```sys2dsl
@r DEFINE_RELATION SUPPORTS symmetric=false transitive=false inverse=SUPPORTED_BY
```

**Returns:** `{ relationId, properties }`

---

### 3.3 MODIFY_RELATION
**Purpose:** Override relation properties at runtime.

**Syntax:**
```sys2dsl
@r MODIFY_RELATION CAUSES transitive=true
```

**Returns:** `{ relationId, updatedProperties }`

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted assertion, concept, relation commands from DS(/theory/Sys2DSL_commands) |
