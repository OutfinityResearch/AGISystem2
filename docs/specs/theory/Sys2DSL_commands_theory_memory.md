# Design Spec: Sys2DSL Theory Management & Memory Verbs

ID: DS(/theory/Sys2DSL_commands_theory_memory)

Status: v3.0 - Unified Triple Syntax

## Scope
Verbs for managing theories and memory. **v3.0 uses strict triple syntax**: `@variable Subject VERB Object`.

See [Sys2DSL-grammar.md](../Sys2DSL-grammar.md) for complete v3.0 syntax rules.

---

## IMPORTANT: Theory Verbs - Semantics and Side Effects

Theory management verbs (PUSH, POP, LOAD, SAVE, THEORIES, COMMIT) are **special effectful verbs** that follow the standard triple syntax but have **dual semantics**:

### 1. Side Effect on Theory Stack
These verbs operate directly on the **theory layer stack**, which is the runtime representation of working memory:
- `PUSH` - Creates a new copy-on-write layer on top of the stack
- `POP` - Removes and discards the top layer, reverting to previous state
- `COMMIT` - Merges the top layer down into its parent
- `LOAD` - Loads a persisted theory as a new stack layer
- `SAVE` - Persists the current stack state to storage

### 2. Meta-Representation in Theory Registry
In addition to their stack effects, these verbs **also record representations** in a meta-theory about available theories:
- When a theory is saved, a point is created in the theory registry
- `THEORIES` queries this registry
- Theory metadata (name, creation date, fact count) is stored as dimensions on these points

### 3. Why This Matters
This dual behavior enables:
- **Hypothetical reasoning**: PUSH a layer, add facts, reason, then POP to discard
- **Counterfactual exploration**: Branch theories without affecting the base
- **Theory persistence**: Save/load working states across sessions
- **Theory discovery**: Query what theories exist and their properties

### 4. Syntax Compliance
Despite their special semantics, these verbs **strictly follow triple syntax**:
```sys2dsl
@_ hypothetical PUSH any     # Side effect: push layer named "hypothetical"
@_ any POP any               # Side effect: pop top layer
@list any THEORIES any       # Query: returns theory registry contents
```

The triple syntax is preserved; the side effects are implementation details of these specific verbs.

---

## 1. Theory Management Verbs

### 1.1 THEORIES (List Available Theories)
**Purpose:** List available theories in the system.

**v3.0 Syntax:**
```sys2dsl
@list Subject THEORIES Object
```

**v3.0 Examples:**
```sys2dsl
@theories any THEORIES any       # List all theories
```

**Returns:** Composite point containing list of theory metadata

---

### 1.2 LOAD (Load Theory)
**Purpose:** Load a theory into the working stack.

**v3.0 Syntax:**
```sys2dsl
@result TheoryName LOAD Object
```

**v3.0 Examples:**
```sys2dsl
@_ base_ontology LOAD any        # Load base_ontology theory
@_ physics LOAD any              # Load physics theory
```

**Returns:** Point indicating success/loaded layers

---

### 1.3 SAVE (Save Theory)
**Purpose:** Persist the current working theory to storage.

**v3.0 Syntax:**
```sys2dsl
@result TheoryName SAVE Object
```

**v3.0 Examples:**
```sys2dsl
@_ my_session SAVE any           # Save as "my_session" theory
@_ experiment_2024 SAVE any      # Save as "experiment_2024"
```

**Returns:** Point indicating success and storage path

---

### 1.4 PUSH (Push Theory Layer)
**Purpose:** Push a new theory layer onto the stack (copy-on-write overlay).

**v3.0 Syntax:**
```sys2dsl
@result LayerName PUSH Object
```

**v3.0 Examples:**
```sys2dsl
@_ hypothetical PUSH any         # Push hypothetical layer
@_ counterfactual PUSH any       # Push counterfactual layer
```

**Returns:** Point representing the new layer

---

### 1.5 POP (Pop Theory Layer)
**Purpose:** Pop the top theory layer from the stack, discarding changes.

**v3.0 Syntax:**
```sys2dsl
@result Subject POP Object
```

**v3.0 Examples:**
```sys2dsl
@_ any POP any                   # Pop top layer
```

**Returns:** Point indicating success

---

### 1.6 COMMIT (Commit Layer)
**Purpose:** Commit the top layer to the layer below (merge down).

**v3.0 Syntax:**
```sys2dsl
@result Subject COMMIT Object
```

**v3.0 Examples:**
```sys2dsl
@_ any COMMIT any                # Commit top layer down
```

---

## 2. Memory Management Verbs

### IMPORTANT: Memory Verbs - Semantics and Side Effects

Memory management verbs (BOOST, FORGET, PROTECT, USAGE, RETRACT) are **effectful verbs** that operate on **point metadata**:

#### Side Effects on Point Metadata
These verbs modify the **dimensional values** stored on points in the conceptual space:

| Verb | Side Effect on Point Metadata |
|------|------------------------------|
| `BOOST` | Increases `existence` and `usage_count` dimensions |
| `FORGET` | Decreases `existence` toward zero for matching points |
| `PROTECT` | Sets `protected` dimension to positive |
| `RETRACT` | Sets `existence` dimension to negative |
| `USAGE` | Query only (reads `usage_count`, `last_used`, etc.) |

#### Why This Matters
- Points have **dimension values** (existence, usage_count, protected, last_used, etc.)
- Memory verbs **modify these values** as side effects
- The returned point reflects the updated state
- Protected points survive FORGET operations
- RETRACT makes a point "negative" (exists but false)

#### Syntax Compliance
Despite their side effects, memory verbs **strictly follow triple syntax**:
```sys2dsl
@_ Dog BOOST any              # Side effect: increase Dog's existence
@_ Dog PROTECT any            # Side effect: mark Dog protected
@_ low_usage FORGET any       # Side effect: decrease existence of low-usage points
@_ wrong_fact RETRACT any     # Side effect: set existence negative
@info Dog USAGE any           # Query: returns Dog's usage metadata
```

The triple syntax is uniform; the side effects modify point metadata in the conceptual space.

---

### 2.1 USAGE (Get Usage Statistics)
**Purpose:** Get usage statistics for a point.

**v3.0 Syntax:**
```sys2dsl
@stats Subject USAGE Object
```

**v3.0 Examples:**
```sys2dsl
@info Dog USAGE any              # Get Dog's usage stats
@metrics concept USAGE any       # Get concept's usage
```

**Returns:** Point containing usage metrics (counts, recency, frequency, priority)

---

### 2.2 FORGET (Remove Unused Concepts)
**Purpose:** Forget concepts with low usage.

**v3.0 Syntax:**
```sys2dsl
@result Threshold FORGET Object
```

**v3.0 Examples:**
```sys2dsl
@_ low_threshold FORGET any      # Forget low-usage concepts
@removed 2 FORGET any            # Forget concepts with usage < 2
```

**Returns:** Point containing list of removed concepts

**Note:** Complex parameters like `olderThan` should use control points or be modeled as separate concepts.

---

### 2.3 BOOST (Increase Priority)
**Purpose:** Manually boost usage priority for a concept.

**v3.0 Syntax:**
```sys2dsl
@result Subject BOOST Amount
```

**v3.0 Examples:**
```sys2dsl
@_ Dog BOOST high_priority       # Boost Dog's priority
@n NUMERIC_VALUE 10
@_ concept BOOST $n              # Boost by numeric amount
```

**Returns:** Point with updated usage count

---

### 2.4 PROTECT (Prevent Forgetting)
**Purpose:** Protect a concept from being forgotten.

**v3.0 Syntax:**
```sys2dsl
@result Subject PROTECT Object
```

**v3.0 Examples:**
```sys2dsl
@_ Dog PROTECT any               # Protect Dog from forgetting
@_ critical_concept PROTECT any  # Protect critical concept
```

**Returns:** Point indicating protection status

---

## Version History
| Version | Changes |
|---------|---------|
| 1.0 | Extracted theory + memory commands from DS(/theory/Sys2DSL_commands) |
| **3.0** | **Converted to v3.0 triple syntax. LIST_THEORIES → THEORIES verb. LOAD_THEORY → LOAD. SAVE_THEORY → SAVE. THEORY_PUSH → PUSH. THEORY_POP → POP. GET_USAGE → USAGE. All parameter=value syntax converted to triple patterns. All examples updated.** |
