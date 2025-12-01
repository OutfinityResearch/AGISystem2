# Design Spec: Sys2DSL Query & Mask Commands

ID: DS(/theory/Sys2DSL_commands_queries_masks)

Status: DRAFT v1.0

## Scope
Reference for all query commands (`ASK`, `ASK_MASKED`, `FACTS_MATCHING`) and masking commands (`MASK_PARTITIONS`, `MASK_DIMS`, `MASK_CONCEPT`). Syntax follows the Sys2DSL line format `@var COMMAND args…`. See DS(/theory/Sys2DSL_syntax) for language rules.

---

## 1. Query Commands

### 1.1 ASK (subcommand of QUERY)
**Purpose:** Query the truth value of a statement within the current theory. In the high-level API, use `QUERY subject RELATION object [mode=...]` which calls ASK first.

**Syntax:**
```sys2dsl
@result ASK subject RELATION object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| subject | concept \| fact | The subject of the query |
| RELATION | relation | The relationship to test |
| object | concept \| fact | The object of the query |

**Returns:**
```javascript
{
  truth: 'TRUE_CERTAIN' | 'PLAUSIBLE' | 'FALSE' | 'UNKNOWN' | 'CONFLICT',
  confidence: number,      // 0.0 - 1.0
  provenance: [            // explanation chain
    { step: 1, source: "base_theory", fact: "..." },
    ...
  ]
}
```

**Example:**
```sys2dsl
@q1 ASK Water IS_A liquid
@q2 ASK Dog CAUSES Fear
@q3 ASK Alice KNOWS Bob
```

**Notes:** Uses adversarial reasoning (optimist/skeptic radii), respects current theory stack, deterministic for a fixed state.

---

### 1.2 ASK_MASKED (subcommand of QUERY with mask)
**Purpose:** Query with specific dimensions masked (filtered). In the high-level API, supply `mask=$maskVar` to `QUERY`.

**Syntax:**
```sys2dsl
@result ASK_MASKED $mask subject RELATION object
```

**Parameters:** same as ASK, plus `$mask` reference from MASK commands.

**Example:**
```sys2dsl
@physMask MASK_PARTITIONS ontology
@result ASK_MASKED $physMask Water IS_A liquid
```

---

### 1.3 FACTS_MATCHING (subcommand of SUMMARIZE_FACTS)
**Purpose:** Find all facts matching a pattern. In the high-level API, use `SUMMARIZE_FACTS subject RELATION object`, which internally calls FACTS_MATCHING then SUMMARIZE.

**Syntax:**
```sys2dsl
@results FACTS_MATCHING subject RELATION object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| subject | concept \| fact \| ? | Subject pattern (? = wildcard) |
| RELATION | relation \| ? | Relation pattern (? = wildcard) |
| object | concept \| fact \| ? | Object pattern (? = wildcard) |

**Returns:** Array of matching facts `{ subject, relation, object, factId }`

**Examples:**
```sys2dsl
@aboutWater FACTS_MATCHING Water ? ?
@allIsA FACTS_MATCHING ? IS_A ?
@causesFear FACTS_MATCHING ? CAUSES Fear
@allFacts FACTS_MATCHING ? ? ?
```

---

## 2. Mask Commands

### 2.1 MASK_PARTITIONS
**Purpose:** Create a mask from named partitions (e.g., ontology/axiology).

**Syntax:**
```sys2dsl
@mask MASK_PARTITIONS ontology axiology
```

**Returns:** Mask reference usable in ASK_MASKED.

---

### 2.2 MASK_DIMS
**Purpose:** Create a mask from explicit dimension names.

**Syntax:**
```sys2dsl
@tempMask MASK_DIMS temperature pressure
```

---

### 2.3 MASK_CONCEPT
**Purpose:** Create a mask based on concept relevance (uses diamond relevance masks).

**Syntax:**
```sys2dsl
@mask MASK_CONCEPT Physics
@result ASK_MASKED $mask Electron IS_A particle
```

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted query + mask commands from DS(/theory/Sys2DSL_commands) |
