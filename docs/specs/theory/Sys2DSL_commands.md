# Design Spec: Sys2DSL Command Reference

ID: DS(/theory/Sys2DSL_commands)

Status: DRAFT v2.0

## Overview

This document provides the complete reference for all Sys2DSL commands. Commands are organized by functional category.

See DS(/theory/Sys2DSL_syntax) for language syntax and conventions.

---

## 1. Query Commands

### 1.1 ASK

**Purpose:** Query the truth value of a statement within current theory.

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

**Notes:**
- Uses adversarial reasoning (optimist/skeptic radii)
- Respects current theory stack
- Deterministic: same query + same state = same result

---

### 1.2 ASK_MASKED

**Purpose:** Query with specific dimensions masked (filtered).

**Syntax:**
```sys2dsl
@result ASK_MASKED $mask subject RELATION object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| $mask | mask_ref | Reference to a mask (from MASK_* commands) |
| subject | concept \| fact | The subject of the query |
| RELATION | relation | The relationship to test |
| object | concept \| fact | The object of the query |

**Returns:** Same as ASK

**Example:**
```sys2dsl
@physMask MASK_PARTITIONS ontology
@result ASK_MASKED $physMask Water IS_A liquid

@tempMask MASK_DIMS temperature pressure
@result2 ASK_MASKED $tempMask Steam IS_A gas
```

---

### 1.3 FACTS_MATCHING

**Purpose:** Find all facts matching a pattern.

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

**Returns:**
```javascript
[
  { subject: string, relation: string, object: string, factId: string },
  ...
]
```

**Examples:**
```sys2dsl
# Find all facts about Water
@aboutWater FACTS_MATCHING Water ? ?

# Find all IS_A relationships
@allIsA FACTS_MATCHING ? IS_A ?

# Find what causes Fear
@causesFear FACTS_MATCHING ? CAUSES Fear

# Find all facts (use carefully - can be large!)
@allFacts FACTS_MATCHING ? ? ?
```

---

## 2. Assertion Commands

### 2.1 ASSERT

**Purpose:** Add a new fact to the current working theory.

**Syntax:**
```sys2dsl
@result ASSERT subject RELATION object
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| subject | concept \| fact | The subject |
| RELATION | relation | The relationship |
| object | concept \| fact | The object |

**Returns:**
```javascript
{
  ok: boolean,
  factId: string,
  conceptId: string,     // for subject
  objectConceptId: string, // for object
  created: boolean,      // true if new, false if merged with existing
  usageCount: number     // current usage count after increment
}
```

**Examples:**
```sys2dsl
@f1 ASSERT Water IS_A liquid
@f2 ASSERT Alice KNOWS Bob
@f3 ASSERT Dog HAS_PROPERTY loyalty
```

**Notes:**
- Facts go to the working theory (session-local)
- Use SAVE_THEORY to persist
- Increments usage counter for involved concepts

---

### 2.2 RETRACT

**Purpose:** Remove a fact from the current working theory.

**Syntax:**
```sys2dsl
@result RETRACT subject RELATION object
```

**Parameters:** Same as ASSERT

**Returns:**
```javascript
{
  ok: boolean,
  factId: string,      // the retracted fact ID
  found: boolean       // true if fact existed
}
```

**Example:**
```sys2dsl
@r1 RETRACT Water IS_A solid
```

**Notes:**
- Only affects working theory layer
- Cannot retract from base theories (they are immutable)
- Decrements usage counter

---

## 3. Concept Commands

### 3.1 BIND_CONCEPT

**Purpose:** Get a reference to a concept for further operations.

**Syntax:**
```sys2dsl
@ref BIND_CONCEPT conceptName
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| conceptName | concept | The concept to bind |

**Returns:**
```javascript
{
  kind: 'conceptRef',
  label: string,
  id: string,
  diamondCount: number,  // number of meanings (polysemy)
  usageCount: number
}
```

**Example:**
```sys2dsl
@waterConcept BIND_CONCEPT water
@dogConcept BIND_CONCEPT dog
```

---

### 3.2 DEFINE_CONCEPT

**Purpose:** Explicitly create a new concept with specified dimensions.

**Syntax:**
```sys2dsl
@ref DEFINE_CONCEPT name dimension1=value1 dimension2=value2 ...
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| name | concept | Name for the new concept |
| dimension=value | pairs | Initial dimension values |

**Returns:**
```javascript
{
  kind: 'conceptRef',
  label: string,
  id: string,
  created: boolean,   // false if concept already existed
  dimensions: { ... }
}
```

**Example:**
```sys2dsl
@newConcept DEFINE_CONCEPT electric_car \
            physicality=80 \
            artifact_device=100 \
            computation_capability=60
```

**Notes:**
- Concepts are usually created implicitly via ASSERT
- Use DEFINE_CONCEPT for precise control over initial dimensions
- If concept exists, returns existing (does not overwrite)

---

### 3.3 INSPECT

**Purpose:** Get detailed information about a concept, fact, or relation.

**Syntax:**
```sys2dsl
@info INSPECT $ref
@info INSPECT conceptName
@info INSPECT RELATION_NAME
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| $ref | any_ref | Variable reference |
| name | concept \| relation | Direct name |

**Returns:** (varies by type)

For concept:
```javascript
{
  kind: 'concept',
  label: string,
  id: string,
  diamonds: [
    {
      center: [...],
      min: [...],
      max: [...],
      radius: number,
      relevanceMask: [...]
    },
    ...
  ],
  usageCount: number,
  lastUsed: timestamp,
  createdAt: timestamp
}
```

For relation:
```javascript
{
  kind: 'relation',
  name: string,
  inverse: string | null,
  symmetric: boolean,
  transitive: boolean,
  domain: string,
  range: string,
  usageCount: number
}
```

---

## 4. Relation Commands

### 4.1 BIND_RELATION

**Purpose:** Get a reference to a relation.

**Syntax:**
```sys2dsl
@ref BIND_RELATION RELATION_NAME
```

**Returns:**
```javascript
{
  kind: 'relationRef',
  name: string,
  inverse: string | null,
  symmetric: boolean,
  transitive: boolean
}
```

**Example:**
```sys2dsl
@causesRel BIND_RELATION CAUSES
@props INSPECT $causesRel
```

---

### 4.2 DEFINE_RELATION

**Purpose:** Create a new relation (verb) that can be used in facts.

**Syntax:**
```sys2dsl
@ref DEFINE_RELATION NAME \
     inverse=INVERSE_NAME \
     symmetric=true|false \
     transitive=true|false \
     domain=partition \
     range=partition
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| NAME | relation | required | Name of the new relation |
| inverse | relation | null | Name of inverse relation |
| symmetric | boolean | false | Is relation symmetric? |
| transitive | boolean | false | Is relation transitive? |
| domain | partition | ontology | Domain partition hint |
| range | partition | ontology | Range partition hint |

**Returns:**
```javascript
{
  kind: 'relationRef',
  name: string,
  created: boolean,
  permutation: [...],      // generated deterministically
  inversePermutation: [...]
}
```

**Example:**
```sys2dsl
# Define TEACHES with inverse TAUGHT_BY
@teachRel DEFINE_RELATION TEACHES \
          inverse=TAUGHT_BY \
          symmetric=false \
          transitive=false

# Now use it
@f1 ASSERT Professor TEACHES Student
@f2 ASSERT Student TAUGHT_BY Professor
```

**Notes:**
- Relation permutations are generated deterministically from name + seed
- If inverse specified, it's also registered automatically
- Relations persist in working theory until saved

---

### 4.3 MODIFY_RELATION

**Purpose:** Override relation properties in current theory layer.

**Syntax:**
```sys2dsl
@result MODIFY_RELATION NAME property=value ...
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| NAME | relation | Relation to modify |
| property=value | pairs | Properties to override |

**Returns:**
```javascript
{
  ok: boolean,
  name: string,
  modified: ['transitive', ...],  // list of changed properties
  previousValues: { ... }
}
```

**Example:**
```sys2dsl
# Make LOCATED_IN transitive in this theory
@mod MODIFY_RELATION LOCATED_IN transitive=true

# Now: if A LOCATED_IN B and B LOCATED_IN C, then A LOCATED_IN C
```

**Notes:**
- Changes are local to current theory layer
- Does NOT modify base definitions
- Useful for domain-specific reasoning adjustments

---

## 5. Theory Management Commands

### 5.1 LIST_THEORIES

**Purpose:** Enumerate available theories.

**Syntax:**
```sys2dsl
@theories LIST_THEORIES
```

**Returns:**
```javascript
[
  {
    name: string,
    path: string,
    description: string,
    lastModified: timestamp,
    factCount: number
  },
  ...
]
```

**Example:**
```sys2dsl
@available LIST_THEORIES
```

---

### 5.2 LOAD_THEORY

**Purpose:** Load a theory as base for current session.

**Syntax:**
```sys2dsl
@loaded LOAD_THEORY theoryName
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| theoryName | string | Name of theory to load |

**Returns:**
```javascript
{
  ok: boolean,
  name: string,
  factCount: number,
  conceptCount: number,
  loaded: boolean
}
```

**Example:**
```sys2dsl
@base LOAD_THEORY physics_fundamentals
@domain LOAD_THEORY medical_knowledge
```

**Notes:**
- Multiple theories can be loaded (stacked)
- Order matters: later theories override earlier ones
- Working theory is always on top of stack

---

### 5.3 SAVE_THEORY

**Purpose:** Save current working theory to persistent storage.

**Syntax:**
```sys2dsl
@saved SAVE_THEORY name
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | Name for saved theory |

**Returns:**
```javascript
{
  ok: boolean,
  name: string,
  path: string,
  factCount: number,
  conceptCount: number
}
```

**Example:**
```sys2dsl
# Work on some facts
@f1 ASSERT NewConcept IS_A something
@f2 ASSERT AnotherFact CAUSES Effect

# Save it
@saved SAVE_THEORY my_new_theory
```

---

### 5.4 MERGE_THEORY

**Purpose:** Merge current working theory into an existing theory.

**Syntax:**
```sys2dsl
@result MERGE_THEORY target strategy
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| target | string | Target theory name |
| strategy | string | Merge strategy: `append`, `override`, `interactive` |

**Returns:**
```javascript
{
  ok: boolean,
  target: string,
  addedFacts: number,
  modifiedFacts: number,
  conflicts: [...]
}
```

**Example:**
```sys2dsl
@merged MERGE_THEORY physics_fundamentals append
```

---

### 5.5 RESET_SESSION

**Purpose:** Clear working theory and start fresh.

**Syntax:**
```sys2dsl
@result RESET_SESSION
```

**Returns:**
```javascript
{
  ok: boolean,
  cleared: {
    facts: number,
    concepts: number,
    variables: number
  }
}
```

---

## 6. Reasoning Commands

### 6.1 VALIDATE

**Purpose:** Check consistency of current theory or proposed facts.

**Syntax:**
```sys2dsl
@result VALIDATE
@result VALIDATE $script
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| (none) | - | Validate current working theory |
| $script | script_ref | Validate specific proposed facts |

**Returns:**
```javascript
{
  valid: boolean,
  conflicts: [
    {
      fact1: { subject, relation, object },
      fact2: { subject, relation, object },
      reason: string
    },
    ...
  ],
  warnings: [...]
}
```

**Example:**
```sys2dsl
# Add potentially conflicting facts
@f1 ASSERT Water IS_A solid
@f2 ASSERT Water IS_A liquid

# Check for conflicts
@check VALIDATE
# Returns: conflicts about Water being both solid and liquid
```

---

### 6.2 PROVE

**Purpose:** Attempt to prove a statement is true within current theory.

**Syntax:**
```sys2dsl
@result PROVE subject RELATION object
```

**Parameters:** Same as ASK

**Returns:**
```javascript
{
  proven: boolean,
  truth: 'TRUE_CERTAIN' | 'FALSE' | 'UNKNOWN',
  proof: [
    { step: 1, type: 'axiom', fact: '...' },
    { step: 2, type: 'inference', rule: 'transitivity', from: [1], fact: '...' },
    ...
  ],
  counterexample: null | { ... }  // if proven false
}
```

**Example:**
```sys2dsl
# Try to prove mammals need oxygen
@proof PROVE mammal REQUIRES oxygen

# Try to prove something false
@disproof PROVE fish IS_A mammal
```

---

### 6.3 HYPOTHESIZE

**Purpose:** Generate hypotheses that could explain an observation.

**Syntax:**
```sys2dsl
@hypotheses HYPOTHESIZE observation RELATION target
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| observation | fact | The observed fact |
| RELATION | relation | The causal/explanatory relation |
| target | ? \| fact | What to explain (? for any) |

**Returns:**
```javascript
{
  observation: { subject, relation, object },
  hypotheses: [
    {
      hypothesis: { subject, relation, object },
      plausibility: number,
      supportingFacts: [...],
      confidence: number
    },
    ...
  ]
}
```

**Example:**
```sys2dsl
# What could cause this symptom?
@obs ASSERT Patient HAS_SYMPTOM fever
@hyp HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?

# Returns possible causes: infection, inflammation, etc.
```

---

### 6.4 CF (Counterfactual)

**Purpose:** Ask a question under hypothetical conditions.

**Syntax:**
```sys2dsl
@result CF question | hypothetical_fact1; hypothetical_fact2; ...
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| question | triplet | The query (same as ASK) |
| hypothetical_facts | triplets | Temporary facts for this query only |

**Returns:** Same as ASK, plus:
```javascript
{
  truth: ...,
  counterfactual: true,
  temporaryFacts: [...],
  originalTruth: ...  // what it would be without hypotheticals
}
```

**Example:**
```sys2dsl
# What if water boiled at 50 degrees?
@cf1 CF Water IS_A gas | Water HAS_PROPERTY boiling_point=50

# What if dogs could fly?
@cf2 CF Dog LOCATED_IN sky | Dog HAS_ABILITY flight
```

---

### 6.5 ABDUCT

**Purpose:** Find possible causes/explanations using inverse reasoning.

**Syntax:**
```sys2dsl
@result ABDUCT observation RELATION
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| observation | fact | What we observed |
| RELATION | relation | The relation to trace backward (e.g., CAUSED_BY) |

**Returns:**
```javascript
{
  observation: { ... },
  candidates: [
    {
      candidate: { subject, relation, object },
      distance: number,
      confidence: number
    },
    ...
  ]
}
```

**Example:**
```sys2dsl
# What caused this effect?
@causes ABDUCT Explosion CAUSED_BY

# What is this an instance of?
@types ABDUCT Fido IS_A
```

---

## 7. Mask Commands

### 7.1 MASK_PARTITIONS

**Purpose:** Create a mask that includes only specified partitions.

**Syntax:**
```sys2dsl
@mask MASK_PARTITIONS partition1 partition2 ...
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| partitions | partition names | `ontology`, `axiology`, `empirical` |

**Returns:**
```javascript
{
  kind: 'maskRef',
  partitions: ['ontology', ...],
  dims: Uint8Array,  // bit mask
  activeDimCount: number
}
```

**Example:**
```sys2dsl
# Only physical/ontological dimensions
@physMask MASK_PARTITIONS ontology

# Only value-based dimensions
@valueMask MASK_PARTITIONS axiology

# Physical and values, no learned
@combinedMask MASK_PARTITIONS ontology axiology
```

---

### 7.2 MASK_DIMS

**Purpose:** Create a mask for specific named dimensions.

**Syntax:**
```sys2dsl
@mask MASK_DIMS dimName1 dimName2 ...
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| dimNames | dimension names | Names from dimension catalog |

**Returns:**
```javascript
{
  kind: 'maskRef',
  dimensions: ['temperature', 'pressure', ...],
  dims: Uint8Array,
  activeDimCount: number
}
```

**Example:**
```sys2dsl
# Only temperature and pressure
@thermoMask MASK_DIMS temperature pressure

# Only moral and legal dimensions
@ethicsMask MASK_DIMS moral_valence legality trust_level
```

---

### 7.3 MASK_CONCEPT

**Purpose:** Create a mask based on a concept's relevance mask.

**Syntax:**
```sys2dsl
@mask MASK_CONCEPT $conceptRef
@mask MASK_CONCEPT conceptName
```

**Returns:** Mask matching the concept's active dimensions

**Example:**
```sys2dsl
@waterRef BIND_CONCEPT water
@waterMask MASK_CONCEPT $waterRef

# Now query using water's relevant dimensions only
@result ASK_MASKED $waterMask Ice IS_A solid
```

---

## 8. Utility Commands

### 8.1 BOOL_AND

**Purpose:** Logical AND of two truth values.

**Syntax:**
```sys2dsl
@result BOOL_AND $var1 $var2
```

**Returns:** Combined truth value

---

### 8.2 BOOL_OR

**Purpose:** Logical OR of two truth values.

**Syntax:**
```sys2dsl
@result BOOL_OR $var1 $var2
```

---

### 8.3 BOOL_NOT

**Purpose:** Logical negation.

**Syntax:**
```sys2dsl
@result BOOL_NOT $var
```

---

### 8.4 MERGE_LISTS

**Purpose:** Concatenate two lists.

**Syntax:**
```sys2dsl
@combined MERGE_LISTS $list1 $list2
```

---

### 8.5 PICK_FIRST

**Purpose:** Get first element of a list.

**Syntax:**
```sys2dsl
@first PICK_FIRST $list
```

---

### 8.6 PICK_LAST

**Purpose:** Get last element of a list.

**Syntax:**
```sys2dsl
@last PICK_LAST $list
```

---

### 8.7 NONEMPTY

**Purpose:** Check if list is non-empty.

**Syntax:**
```sys2dsl
@hasItems NONEMPTY $list
```

**Returns:** `{ truth: TRUE_CERTAIN }` or `{ truth: FALSE }`

---

### 8.8 COUNT

**Purpose:** Count elements in a list.

**Syntax:**
```sys2dsl
@n COUNT $list
```

**Returns:** `{ count: number }`

---

### 8.9 FILTER

**Purpose:** Filter list by condition.

**Syntax:**
```sys2dsl
@filtered FILTER $list RELATION value
```

**Example:**
```sys2dsl
@allFacts FACTS_MATCHING ? IS_A animal
@dogs FILTER $allFacts IS_A dog
```

---

## 9. Memory Management Commands

### 9.1 GET_USAGE

**Purpose:** Get usage statistics for a concept or relation.

**Syntax:**
```sys2dsl
@stats GET_USAGE $ref
@stats GET_USAGE conceptName
```

**Returns:**
```javascript
{
  label: string,
  usageCount: number,
  lastUsed: timestamp,
  createdAt: timestamp,
  assertCount: number,    // times used in ASSERT
  queryCount: number,     // times used in ASK
  inferenceCount: number  // times used in reasoning
}
```

---

### 9.2 FORGET

**Purpose:** Remove low-usage concepts/facts.

**Syntax:**
```sys2dsl
@result FORGET threshold=value
@result FORGET older_than=duration
@result FORGET concept=name
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| threshold | number | Remove if usageCount < threshold |
| older_than | duration | Remove if not used within duration (e.g., `30d`, `1h`) |
| concept | name | Remove specific concept |

**Returns:**
```javascript
{
  ok: boolean,
  forgotten: [
    { label: string, usageCount: number, reason: string },
    ...
  ],
  count: number
}
```

**Example:**
```sys2dsl
# Forget concepts used less than 5 times
@cleaned FORGET threshold=5

# Forget concepts not used in 30 days
@old FORGET older_than=30d
```

---

### 9.3 BOOST

**Purpose:** Manually increase usage count (prioritize concept).

**Syntax:**
```sys2dsl
@result BOOST $ref amount
@result BOOST conceptName amount
```

**Example:**
```sys2dsl
# Make "water" more important
@boosted BOOST water 100
```

---

## 10. Output Commands

### 10.1 TO_NATURAL

**Purpose:** Convert script result to natural language.

**Syntax:**
```sys2dsl
@text TO_NATURAL $result
```

**Returns:**
```javascript
{
  text: string,  // human-readable explanation
  language: 'en' // language code
}
```

**Example:**
```sys2dsl
@answer ASK Water IS_A liquid
@readable TO_NATURAL $answer
# Returns: "Yes, water is a liquid (confidence: 95%)"
```

---

### 10.2 TO_JSON

**Purpose:** Export result as JSON.

**Syntax:**
```sys2dsl
@json TO_JSON $result
```

---

### 10.3 EXPLAIN

**Purpose:** Get detailed explanation of a result.

**Syntax:**
```sys2dsl
@explanation EXPLAIN $result
```

**Returns:**
```javascript
{
  summary: string,
  steps: [
    { step: 1, description: string, facts: [...] },
    ...
  ],
  confidence: number,
  assumptions: [...]
}
```

---

## 11. Command Summary Table

| Command | Category | Purpose |
|---------|----------|---------|
| ASK | Query | Query truth of statement |
| ASK_MASKED | Query | Query with dimension mask |
| FACTS_MATCHING | Query | Find matching facts |
| ASSERT | Assertion | Add fact |
| RETRACT | Assertion | Remove fact |
| BIND_CONCEPT | Concept | Get concept reference |
| DEFINE_CONCEPT | Concept | Create new concept |
| INSPECT | Concept | Get detailed info |
| BIND_RELATION | Relation | Get relation reference |
| DEFINE_RELATION | Relation | Create new relation |
| MODIFY_RELATION | Relation | Override relation properties |
| LIST_THEORIES | Theory | List available theories |
| LOAD_THEORY | Theory | Load theory |
| SAVE_THEORY | Theory | Save working theory |
| MERGE_THEORY | Theory | Merge theories |
| RESET_SESSION | Theory | Clear working theory |
| VALIDATE | Reasoning | Check consistency |
| PROVE | Reasoning | Prove statement |
| HYPOTHESIZE | Reasoning | Generate hypotheses |
| CF | Reasoning | Counterfactual query |
| ABDUCT | Reasoning | Abductive reasoning |
| MASK_PARTITIONS | Mask | Mask by partition |
| MASK_DIMS | Mask | Mask by dimensions |
| MASK_CONCEPT | Mask | Mask by concept |
| BOOL_AND/OR/NOT | Utility | Boolean operations |
| MERGE_LISTS | Utility | Combine lists |
| PICK_FIRST/LAST | Utility | List access |
| NONEMPTY | Utility | List check |
| COUNT | Utility | List count |
| FILTER | Utility | List filter |
| GET_USAGE | Memory | Get usage stats |
| FORGET | Memory | Remove unused |
| BOOST | Memory | Increase priority |
| TO_NATURAL | Output | Convert to text |
| TO_JSON | Output | Export JSON |
| EXPLAIN | Output | Detailed explanation |

---

## 12. Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial command set |
| 2.0 | Added: DEFINE_RELATION, MODIFY_RELATION, VALIDATE, PROVE, HYPOTHESIZE, memory commands, output commands |
