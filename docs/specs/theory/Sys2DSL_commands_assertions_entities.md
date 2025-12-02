# Design Spec: Sys2DSL Assertion, Concept, and Relation Verbs

ID: DS(/theory/Sys2DSL_commands_assertions_entities)

Status: v3.0 - Unified Triple Syntax

## Scope
Verbs for creating and managing knowledge. **v3.0 uses strict triple syntax**: `@variable Subject VERB Object`. There is NO distinction between "query" and "assertion" - all statements use the same format.

See [Sys2DSL-grammar.md](../Sys2DSL-grammar.md) for complete v3.0 syntax rules.

---

## 1. Ontological Verbs

### 1.1 IS_A (Type Relation)
**Purpose:** Assert or query type relationships. Automatically creates/modifies points in conceptual space.

**v3.0 Syntax:**
```sys2dsl
@result Subject IS_A Object
```

**Returns:** Point with existence dimension indicating truth/assertion result

**v3.0 Examples:**
```sys2dsl
@_ Water IS_A liquid             # Assert Water is a liquid
@_ Alice IS_A person             # Assert Alice is a person
@_ Dog IS_A animal               # Assert Dog is an animal
@r Grivei IS_A Dog               # Query/verify Grivei is a Dog
```


**Notes:**
- Facts go to the working theory (session-local)
- Use SAVE verb to persist
- Automatically increments usage counters
- Validates for contradictions (e.g., disjoint types)

---

### 1.2 HAS (Property Relation)
**Purpose:** Assert property relationships.

**v3.0 Syntax:**
```sys2dsl
@result Subject HAS Object
```

**v3.0 Examples:**
```sys2dsl
@_ Dog HAS fur                   # Dog has fur
@_ Dog HAS loyalty               # Dog has loyalty trait
@_ Water HAS boiling_point       # Water has boiling_point property
```

---

### 1.3 RETRACT (Fact Removal)
**Purpose:** Remove a fact from the current working theory.

**v3.0 Syntax:**
```sys2dsl
@result Subject RETRACT Object
```

**Returns:** Point indicating success/failure

**v3.0 Examples:**
```sys2dsl
@_ misconception RETRACT any     # Retract a mistaken fact
@_ Water RETRACT solid_at_20c    # Remove incorrect assertion
```


---

## 2. Concept Verbs

### 2.1 INSPECT (Introspection)
**Purpose:** Inspect a point and its geometric properties.

**v3.0 Syntax:**
```sys2dsl
@info Subject INSPECT Object
```

**v3.0 Examples:**
```sys2dsl
@info Dog INSPECT any            # Inspect Dog point
@meta animal INSPECT any         # Inspect animal concept
```

**Returns:** Point metadata (center, diamond radii, dimensions, usage, kind)


---

### 2.2 BIND (Point Reference)
**Purpose:** Get or create a point reference. In v3.0, points are created implicitly, so BIND is rarely needed.

**v3.0 Syntax:**
```sys2dsl
@ref Subject BIND Object
```

**Notes:** Most of the time, you don't need BIND - just use the concept name directly.

---

## 3. Verb Definition (BEGIN/END Blocks)

### 3.1 Custom Verb Definition
**Purpose:** Define new verbs using BEGIN/END blocks.

**v3.0 Syntax:**
```sys2dsl
@VERB_NAME BEGIN
  @step1 subject OPERATION freevar1
  @step2 freevar1 OPERATION2 object
  @return $step2 FINALIZE any
END
```

**v3.0 Example:**
```sys2dsl
@GRANDPARENT_OF BEGIN
  @p1 subject PARENT_OF freevar1
  @p2 freevar1 PARENT_OF object
  @return subject HAS_RELATION grandparent
END
```

**Notes:**
- `subject` and `object` are implicit parameters
- `freevar1`, `freevar2`, etc. are intermediate variables
- `@return` marks which result is returned
- Verb names must be ALL_CAPS

---

## 4. Property Setting (DIM_PAIR Pattern)

### 4.1 Setting Dimension Values
**Purpose:** Set dimension values on points. In v3.0, use the DIM_PAIR pattern.

**v3.0 Syntax:**
```sys2dsl
@pair dimension DIM_PAIR value
@_ subject SET_DIM $pair
```

**v3.0 Example:**
```sys2dsl
@positive NUMERIC_VALUE 127
@pair existence DIM_PAIR $positive
@_ Dog SET_DIM $pair              # Set Dog's existence to +127
```


**Note:** The `property=value` syntax from v2 is NOT supported in v3. Always use DIM_PAIR.

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted assertion, concept, relation commands from DS(/theory/Sys2DSL_commands) |
| **3.0** | **Converted to v3.0 triple syntax. Removed ASSERT command (now implicit). Updated BIND_CONCEPT → BIND. Removed DEFINE_CONCEPT (implicit). Removed property=value syntax. Added DIM_PAIR pattern. All examples updated.** |
