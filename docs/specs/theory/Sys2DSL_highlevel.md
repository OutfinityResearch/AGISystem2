# Sys2DSL High-Level Verbs - v3.0

ID: DS(/theory/Sys2DSL_highlevel)

Status: v3.0 - Updated for Unified Triple Syntax

## Overview

High-level verbs provide convenient entry points for common operations. They are defined in the base theory using the fundamental triple syntax and delegate to lower-level verbs.

**Key Principle**: All verbs follow the `@variable Subject VERB Object` triple syntax. There are NO special commands - everything is a verb.

---

## High-Level Query Verbs

### QUERY - Multi-strategy Query

Tries multiple strategies to answer: direct lookup, inference, transitive reasoning.

```sys2dsl
# v3.0 Syntax: Subject QUERY Object
@result Dog QUERY animal

# With mask (chain pattern)
@mask ontology MASK any
@result Dog QUERY_MASKED $mask animal
```

**Defined as:**
```sys2dsl
@QUERY BEGIN
  @direct subject IS_A object;
  @inferred subject INFER object;
  @return $direct OR $inferred;
END
```

### WHATIF - Counterfactual Query

Creates hypothetical theory layer, asserts fact, queries, then discards.

```sys2dsl
# v3.0 Syntax: Subject WHATIF Object
@result Unicorn WHATIF animal

# What if Unicorn were an animal?
```

**Defined as:**
```sys2dsl
@WHATIF BEGIN
  @_ hypothetical PUSH any;
  @_ subject IS_A object;
  @r subject INFER any;
  @_ any POP any;
  @return $r PROJECT_DIM counterfactual positive;
END
```

### EXPLAIN_QUERY - Query with Proof

Returns query result with explanation trace.

```sys2dsl
@result Dog EXPLAIN_QUERY mammal
# Returns proof chain: Dog IS_A mammal because...
```

---

## High-Level Fact Retrieval Verbs

### SUMMARIZE_FACTS - Summarized Fact List

Gets facts matching pattern and summarizes them.

```sys2dsl
# v3.0 Syntax: Subject SUMMARIZE_FACTS Object
@summary Dog SUMMARIZE_FACTS any
# Returns: "Dog has 5 facts: IS_A mammal, HAS fur, ..."
```

### SUGGEST - Hypothesis Generation

Generates hypotheses via abduction or analogy.

```sys2dsl
# v3.0: Observation SUGGEST Domain
@hypotheses fever SUGGEST disease
# Returns: possible causes of fever
```

---

## High-Level Theory Management Verbs

### MANAGE_THEORY - Unified Theory Operations

Single verb for all theory operations, using Object to specify action.

```sys2dsl
# List theories
@theories any THEORIES any

# Save current theory
@saved my_physics SAVE any

# Load a theory
@loaded physics_basic LOAD any

# Merge theories
@merged source_theory MERGE target_theory

# Delete a theory
@deleted old_theory DELETE any
```

### SESSION - Session Control

```sys2dsl
# Reset session
@reset session RESET any

# Checkpoint
@cp session CHECKPOINT any

# Restore
@restored $cp RESTORE any
```

---

## High-Level Memory Verbs

### MEMORY - Unified Memory Operations

```sys2dsl
# Boost a concept
@boosted Dog BOOST any

# Forget a concept
@forgotten OldFact FORGET any

# Protect from forgetting
@protected ImportantFact PROTECT any

# Unprotect
@unprotected $protected UNPROTECT any

# Get usage stats
@usage Dog USAGE any
```

---

## High-Level Mask Verbs

### MASK - Create Dimension Masks

```sys2dsl
# Mask by partition
@mask ontology MASK any

# Apply mask to query (chained)
@result Dog QUERY_WITH $mask animal
```

---

## High-Level Output Verbs

### FORMAT - Format Results

```sys2dsl
# To natural language
@text $result TO_NATURAL any

# To JSON
@json $result TO_JSON any

# Summarize
@summary $list SUMMARIZE any
```

---

## Mapping from v2.0 Commands

| v2.0 Command | v3.0 Triple Syntax |
|--------------|-------------------|
| `@r QUERY S R O` | `@r S QUERY O` |
| `@r WHATIF <fact>` | `@r subject WHATIF object` |
| `@r EXPLAIN_QUERY S R O` | `@r S EXPLAIN_QUERY O` |
| `@r SUGGEST Obs` | `@r observation SUGGEST domain` |
| `@r SUMMARIZE_FACTS S R O` | `@r S SUMMARIZE_FACTS O` |
| `@r action LIST` | `@r any THEORIES any` |
| `@r name SAVE` | `@r name SAVE any` |
| `@r target BOOST` | `@r target BOOST any` |
| `@r part1 MASK` | `@r part1 MASK any` |
| `@r $v TO_NATURAL` | `@r $v TO_NATURAL any` |

---

## Design Principles

1. **Everything is a Triple**: `Subject VERB Object` - no exceptions
2. **Verbs, not Commands**: High-level operations are verbs defined in base theory
3. **Composition via Chaining**: Complex operations use intermediate variables
4. **`any` as Wildcard**: The concept `any` serves as universal matcher/placeholder

---

## Related Documents

- [Sys2DSL-grammar.md](../Sys2DSL-grammar.md) - v3.0 Grammar (source of truth)
- [Sys2DSL-spec.md](../Sys2DSL-spec.md) - v3.0 Semantics
- [base/*.sys2dsl](../../init/theories/base/) - Verb definitions
