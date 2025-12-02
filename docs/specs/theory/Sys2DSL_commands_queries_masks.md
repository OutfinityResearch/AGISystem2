# Design Spec: Sys2DSL Query & Mask Verbs

ID: DS(/theory/Sys2DSL_commands_queries_masks)

Status: v3.0 - Unified Triple Syntax

## Scope
Reference for query and masking verbs. **v3.0 uses strict triple syntax**: `@variable Subject VERB Object`. There are NO separate "query" vs "assertion" commands - all operations use the same triple format.

See [Sys2DSL-grammar.md](../Sys2DSL-grammar.md) for complete v3.0 syntax rules.

---

## 1. Query Verbs

### 1.1 IS_A (Ontological Relation)
**Purpose:** Assert or query type relationships. Whether this is a query or assertion is determined by geometric reasoning, not syntax.

**v3.0 Syntax:**
```sys2dsl
@result Subject IS_A Object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| Subject | concept \| fact \| any | The subject entity |
| Object | concept \| fact | The type/category |

**Returns:** Point with existence dimension value indicating truth

**Examples:**
```sys2dsl
@_ Dog IS_A animal           # Assert/verify Dog is an animal
@_ Cat IS_A animal           # Assert/verify Cat is an animal
@r Grivei IS_A Dog           # Check if Grivei is a Dog
@animals any IS_A animal     # Find all animals (query with 'any')
```

**Notes:**
- Uses geometric reasoning (diamond overlap, distance metrics)
- Respects current theory stack
- Automatically validates for contradictions
- Using `any` as subject triggers enumeration

---

### 1.2 FACTS (Fact Enumeration)
**Purpose:** Find all facts matching a pattern.

**v3.0 Syntax:**
```sys2dsl
@results Subject FACTS Object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| Subject | concept \| fact \| any | Subject pattern (any = wildcard) |
| Object | any | Always use `any` for object |

**Returns:** Composite point containing list of matching facts

**v3.0 Examples:**
```sys2dsl
@aboutWater Dog FACTS any        # All facts about Dog
@allFacts any FACTS any          # All facts (both any)
@dogRels Dog any Cat             # All relations between Dog and Cat
```


---

### 1.3 QUERY (High-Level Query Verb)
**Purpose:** Multi-strategy query that tries direct lookup, then inference.

**v3.0 Syntax:**
```sys2dsl
@result Subject QUERY Object
```

**Notes:** QUERY is a compound verb that internally uses IS_A, FACTS, geometric reasoning, and inference as needed.

---

## 2. Mask Verbs

### 2.1 MASK (Dimension Masking)
**Purpose:** Create a mask for filtering dimensions in reasoning.

**v3.0 Syntax:**
```sys2dsl
@mask Subject MASK Object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| Subject | concept \| partition_name | What to mask |
| Object | any | Always use `any` |

**v3.0 Examples:**
```sys2dsl
@ontMask ontology MASK any        # Mask to ontology partition
@physMask physical MASK any       # Mask to physical dimensions
```


**Using Masks:**
```sys2dsl
@mask ontology MASK any
# Masks are applied at the theory layer level
# or through control points - see theory documentation
```

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted query + mask commands from DS(/theory/Sys2DSL_commands) |
| **3.0** | **Converted to v3.0 triple syntax. Removed ASK/ASSERT commands. FACTS_MATCHING → FACTS verb. MASK_PARTITIONS/MASK_DIMS → MASK verb. All examples updated to strict triple format.** |
