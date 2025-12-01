# Sys2DSL Language Specification - Semantics

ID: DS(/Sys2DSL-spec)

This is the **semantic specification** for Sys2DSL, the declarative language used to interact with AGISystem2's reasoning engine. For syntax and grammar, see [Sys2DSL-grammar.md](./Sys2DSL-grammar.md).

## Overview

Sys2DSL (System 2 Domain Specific Language) is designed for:
- **Knowledge representation**: Asserting facts and relationships
- **Reasoning queries**: Asking questions about the knowledge base
- **Theory management**: Organizing knowledge into layers
- **Proof construction**: Building verifiable reasoning chains

## Core Design Principles

1. **Deterministic Execution**: Every script produces reproducible results
2. **Validatable Output**: All outputs can be verified without LLM involvement
3. **Compositional**: Complex reasoning built from simple, chainable operations
4. **Topological Independence**: Statement order doesn't matter; dependencies are resolved automatically

## Document Map - Quick Reference

### Core Specifications
| Document | Focus | Link |
|----------|-------|------|
| **Sys2DSL-grammar.md** | Syntax, tokens, statement structure | [Grammar](./Sys2DSL-grammar.md) |
| **Sys2DSL_arch.md** | Data model, session architecture | [Architecture](./theory/Sys2DSL_arch.md) |
| **Sys2DSL_highlevel.md** | High-level design philosophy | [High-Level](./theory/Sys2DSL_highlevel.md) |

### Command Categories
| Category | Specification | Implementation |
|----------|--------------|----------------|
| **Queries & Masks** | [Sys2DSL_commands_queries_masks.md](./theory/Sys2DSL_commands_queries_masks.md) | [dsl_commands_core.js.md](./theory/dsl_commands_core.js.md) |
| **Assertions & Entities** | [Sys2DSL_commands_assertions_entities.md](./theory/Sys2DSL_commands_assertions_entities.md) | [dsl_commands_core.js.md](./theory/dsl_commands_core.js.md) |
| **Reasoning** | [Sys2DSL_commands_reasoning.md](./theory/Sys2DSL_commands_reasoning.md) | [dsl_commands_reasoning.js.md](./theory/dsl_commands_reasoning.js.md) |
| **Theory & Memory** | [Sys2DSL_commands_theory_memory.md](./theory/Sys2DSL_commands_theory_memory.md) | [dsl_commands_theory.js.md](./theory/dsl_commands_theory.js.md), [dsl_commands_memory.js.md](./theory/dsl_commands_memory.js.md) |
| **Utility & Output** | [Sys2DSL_commands_util_output_ontology.md](./theory/Sys2DSL_commands_util_output_ontology.md) | [dsl_commands_output.js.md](./theory/dsl_commands_output.js.md) |
| **Inference Rules** | — | [dsl_commands_inference.js.md](./theory/dsl_commands_inference.js.md) |

### Supporting Modules
| Module | Purpose | Link |
|--------|---------|------|
| **Parser** | Tokenization, topological sort | [dsl_parser.js.md](./theory/dsl_parser.js.md) |
| **Engine** | Command dispatch, execution | [dsl_engine.js.md](./theory/dsl_engine.js.md) |
| **Theory Storage** | Persistence, versioning | [theory_storage.js.md](./theory/theory_storage.js.md) |
| **Geometric Model** | Vector space semantics | [Sys2DSL_geometric_model.md](./theory/Sys2DSL_geometric_model.md) |

## Semantic Categories

### 1. Truth Values

Sys2DSL operates with a multi-valued logic:

| Value | Meaning | Numeric Range |
|-------|---------|---------------|
| `TRUE_CERTAIN` | Proven fact or direct assertion | 1.0 |
| `TRUE_DEFAULT` | True by default reasoning | 0.7-0.9 |
| `PLAUSIBLE` | Likely but not certain | 0.5-0.7 |
| `UNKNOWN` | No evidence either way | 0.5 |
| `FALSE` | Proven false or contradicted | 0.0 |
| `CONFLICT` | Contradictory evidence exists | N/A |
| `UNKNOWN_TIMEOUT` | Reasoning exceeded time limit | N/A |

### 2. Value Types

```
Sys2DSLValue ::=
    Primitive           # string, number, boolean
  | TruthObject         # { truth: TruthValue, ... }
  | FactTriple          # { subject, relation, object }
  | FactList            # Array<FactTriple>
  | ConceptRef          # { kind: 'conceptRef', label, id }
  | PointRef            # { kind: 'pointRef', conceptId, centers, meta }
  | MaskRef             # { kind: 'maskRef', dims, spec }
```

### 3. Fact Representation

Facts are stored as subject-relation-object triples:

```sys2dsl
# Assertion creates a fact
@f ASSERT Dog IS_A Animal
# Creates: { subject: "Dog", relation: "IS_A", object: "Animal" }

# Query retrieves truth about a fact
@q ASK Dog IS_A Animal
# Returns: { truth: "TRUE_CERTAIN", ... }
```

## Command Semantics Summary

### Query Commands
| Command | Semantics | Returns |
|---------|-----------|---------|
| `ASK` | Query truth of a proposition | TruthObject |
| `ASK_MASKED` | Query with dimension mask | TruthObject + maskSpec |
| `FACTS_MATCHING` | Pattern match over facts | FactList |
| `CF` | Counterfactual query | TruthObject |
| `ABDUCT` | Find causes for observation | Hypothesis list |
| `PROVE` | Attempt formal proof | Proof trace |
| `ANALOGICAL` | A:B :: C:? reasoning | Analogy result |

### Assertion Commands
| Command | Semantics | Returns |
|---------|-----------|---------|
| `ASSERT` | Add fact to knowledge base | ConfirmationObject |
| `RETRACT` | Remove fact from knowledge base | ConfirmationObject |
| `DEFINE_CONCEPT` | Create/update concept | ConceptRef |
| `DEFINE_RELATION` | Define relation properties | RelationRef |

### Logic Operations
| Command | Semantics | Returns |
|---------|-----------|---------|
| `BOOL_AND` | Logical AND of truth values | TruthObject |
| `BOOL_OR` | Logical OR of truth values | TruthObject |
| `BOOL_NOT` | Logical negation | TruthObject |
| `NONEMPTY` | Check if list non-empty | TruthObject |

### List Operations
| Command | Semantics | Returns |
|---------|-----------|---------|
| `MERGE_LISTS` | Concatenate lists | FactList |
| `PICK_FIRST` | Get first element | FactTriple |
| `PICK_LAST` | Get last element | FactTriple |
| `COUNT` | Count elements | { count: number } |
| `FILTER` | Filter by field=value | FactList |

### Theory Management
| Command | Semantics | Returns |
|---------|-----------|---------|
| `THEORY_PUSH` | Create new theory layer | Confirmation |
| `THEORY_POP` | Remove top theory layer | Confirmation |
| `SAVE_THEORY` | Persist theory to storage | Confirmation |
| `LOAD_THEORY` | Load theory from storage | Confirmation |
| `MERGE_THEORY` | Merge external theory | Confirmation |

## Wildcard Semantics

Sys2DSL uses **polymorphic commands** instead of wildcards for flexible pattern matching:

```sys2dsl
# Match any subject with IS_A Animal (specialized command)
@animals INSTANCES_OF Animal

# Match any fact about Dog (1-arg polymorphic)
@dog_facts FACTS_MATCHING Dog

# Match all facts with CAUSES relation (specialized command)
@causes FACTS_WITH_RELATION CAUSES

# Match all facts where the object is "heat"
@heat_facts FACTS_WITH_OBJECT heat
```

**Important**: Neither `?` nor `*` are wildcards. Sys2DSL does NOT support wildcard syntax. Use polymorphic commands instead.

## Execution Model

### Topological Evaluation

Statements are executed in dependency order, not textual order:

```sys2dsl
# These execute in correct order regardless of position:
@result BOOL_AND $a $b          # Depends on $a and $b
@a ASK Dog IS_A Animal          # No dependencies
@b ASK Cat IS_A Animal          # No dependencies

# Execution order: @a, @b, @result (or @b, @a, @result)
```

### Variable Scoping

- Variables are session-scoped
- `$varName` references must resolve before use
- Unresolved references evaluate to empty string/list
- Circular dependencies throw errors

## Composing Proofs

Sys2DSL enables building formal proof chains:

```sys2dsl
# Prove: Fido is a living thing
# Given: Fido IS_A Dog, Dog IS_A Mammal, Mammal IS_A Animal, Animal IS_A LivingThing

@premise1 ASK Fido IS_A Dog
@premise2 ASK Dog IS_A Mammal
@premise3 ASK Mammal IS_A Animal
@premise4 ASK Animal IS_A LivingThing

@step1 BOOL_AND $premise1 $premise2
@step2 BOOL_AND $step1 $premise3
@conclusion BOOL_AND $step2 $premise4

# @conclusion.truth = TRUE_CERTAIN demonstrates the proof
```

## Error Handling

| Error Type | Cause | Recovery |
|------------|-------|----------|
| `CYCLIC_DEPENDENCY` | Circular variable references | Restructure script |
| `INVALID_STATEMENT` | Malformed syntax | Fix syntax |
| `UNKNOWN_COMMAND` | Unrecognized command | Check spelling |
| `MISSING_ARGUMENT` | Required arg not provided | Add argument |
| `TYPE_MISMATCH` | Wrong value type for operation | Use correct type |

## See Also

- [Sys2DSL-grammar.md](./Sys2DSL-grammar.md) - Syntax specification
- [Sys2DSL_arch.md](./theory/Sys2DSL_arch.md) - Architecture details
- [dsl_engine.js.md](./theory/dsl_engine.js.md) - Implementation reference
