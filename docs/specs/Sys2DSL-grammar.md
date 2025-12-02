# Sys2DSL Language Specification - Grammar & Syntax

ID: DS(/Sys2DSL-grammar)

Status: v3.0 - Unified Triple Syntax

This is the **syntactic specification** for Sys2DSL. For semantics, see [Sys2DSL-spec.md](./Sys2DSL-spec.md).

## Design Philosophy

Sys2DSL v3.0 follows these core principles:

1. **Everything is a Triple** - All statements have the form `Subject VERB Object`
2. **Everything is a Point** - Verbs, concepts, facts, results - all are points in conceptual space
3. **No Special Commands** - What were "commands" are now verbs defined in the base theory
4. **Declarative Execution** - Statement order doesn't matter; execution follows topological dependencies
5. **Naming Determines Type** - The case convention of names determines the point type

---

## ⛔ INVIOLABLE RULE: Strict Triple Syntax

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  EVERY statement MUST be exactly:  @variable Subject VERB Object            │
│                                                                             │
│  • Exactly 3 components after @variable (Subject, VERB, Object)             │
│  • NO additional arguments allowed                                          │
│  • NO property=value syntax in triplet positions                            │
│  • NO inline JSON or compound tokens                                        │
│  • This rule is INVIOLABLE - no exceptions, no extensions                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Matters

This uniformity enables:
- **Uniform parsing**: One grammar rule for all statements
- **Geometric consistency**: Every element is a point in conceptual space
- **Composability**: Results chain cleanly via `$variable` references

### Handling Complex Values (FS-22, FS-23)

Complex operations requiring multiple inputs MUST use **chaining**:

```sys2dsl
# WRONG - 4 components:
@result subject PROJECT_DIM existence $value

# CORRECT - chain via intermediate point:
@pair existence DIM_PAIR $value        # Create point representing (dim, value)
@result subject SET_DIM $pair           # Use compound point
```

See [FS.md](./FS.md) FS-22 and FS-23 for canonical patterns.

---

## Statement Separation

Statements are separated by:
- **Newline** - Each line is a separate statement
- **`@` symbol** - Start of a new variable declaration acts as separator
- **Semicolon `;`** - Optional, retained for backwards compatibility inside BEGIN/END blocks

```sys2dsl
# Multiple statements - all equivalent:

# Newline separated (preferred)
@_ Dog IS_A animal
@_ Cat IS_A animal
@q Dog IS_A mammal

# @ as separator on same line
@_ Dog IS_A animal @_ Cat IS_A animal @q Dog IS_A mammal

# Semicolon (optional, mainly inside BEGIN/END)
@_ Dog IS_A animal; @_ Cat IS_A animal; @q Dog IS_A mammal
```

**Note:** The `@` symbol is sufficient as a statement terminator because it unambiguously marks the start of a new statement.

---

## Effectful Verbs (Theory & Memory Operations)

Some verbs have **side effects** beyond returning a point. These are called **effectful verbs**:

### Theory Stack Verbs
These verbs operate on the theory layer stack (copy-on-write working memory):

| Verb | Side Effect |
|------|-------------|
| `PUSH` | Creates new layer on theory stack |
| `POP` | Removes and discards top layer |
| `COMMIT` | Merges top layer into parent |
| `LOAD` | Loads persisted theory as new layer |
| `SAVE` | Persists current state to storage |

### Memory Management Verbs
These verbs modify concept existence/priority:

| Verb | Side Effect |
|------|-------------|
| `BOOST` | Increases existence/priority of subject |
| `FORGET` | Decreases existence of matching concepts |
| `PROTECT` | Marks subject as protected from forgetting |
| `RETRACT` | Sets subject's existence to negative |

### Key Point
Despite their side effects, these verbs **strictly follow triple syntax**:
```sys2dsl
@_ hypothetical PUSH any      # Side effect: push new layer
@_ any POP any                # Side effect: pop top layer
@_ Dog PROTECT any            # Side effect: mark Dog protected
```

The side effects are implementation details; the syntax is uniform.

See [Sys2DSL_commands_theory_memory.md](./theory/Sys2DSL_commands_theory_memory.md) for complete documentation.

---

## Lexical Structure

### Character Set
- UTF-8 encoding
- Case-sensitive identifiers (case determines semantics!)
- Whitespace: space, tab, newline (ignored except as token separators)

### Comments
```sys2dsl
# Single-line comment
# Comments start with # and extend to end of line
```

---

## Naming Conventions (Critical!)

The naming convention of a declaration determines the **type of point** created:

```
┌─────────────────────────────────────────────────────────────────┐
│              NAMING CONVENTION → POINT TYPE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pattern                        │  Point Type    │  kind        │
│  ───────────────────────────────│────────────────│──────────    │
│                                 │                │              │
│  @ALL_CAPS or @ALL_CAPS_123     │  Verb/Relation │  "verb"      │
│  Examples: @IS_A, @CAUSES,      │                │              │
│            @GRANDPARENT_OF      │                │              │
│                                 │                │              │
│  @all_lowercase or @lower_123   │  Concept       │  "concept"   │
│  Examples: @animal, @danger,    │                │              │
│            @living_thing        │                │              │
│                                 │                │              │
│  @First_upper_rest_lower        │  Fact/Instance │  "fact"      │
│  Examples: @Dog, @Grivei,       │                │              │
│            @Universe, @Paris    │                │              │
│                                 │                │              │
│  @_                             │  Temporary     │  "temp"      │
│  (underscore only - ignore      │  (no result    │              │
│   result, side-effect only)     │   stored)      │              │
│                                 │                │              │
│  @return                        │  Return value  │  (special)   │
│  (inside BEGIN/END blocks)      │  of compound   │              │
│                                 │                │              │
└─────────────────────────────────────────────────────────────────┘
```

### Examples

```sys2dsl
# Defining a VERB (all caps)
@GRANDPARENT_OF BEGIN
  @p1 subject PARENT_OF freevar1
  @return freevar1 PARENT_OF object
END

# Defining a CONCEPT (all lowercase)
@dangerous_animal BEGIN
  @c1 subject IS_A animal
  @c2 subject HAS danger
  @return $c1 AND $c2
END

# Defining a FACT (first cap, rest lower)
@Dangerous_dog BEGIN
  @f1 subject IS_A Dog
  @return $f1 AND $danger_trait
END

# Temporary result (ignored)
@_ Dog IS_A animal

# Return from compound (inside BEGIN/END)
@return result FINAL_VALUE any
```

---

## Tokens

### Variable Declaration
```ebnf
VAR_DECL ::= '@' IDENTIFIER
           | '@' '_'
           | '@' 'return'
```
Examples: `@result`, `@MY_VERB`, `@animal`, `@Dog`, `@_`, `@return`

### Variable Reference
```ebnf
VAR_REF ::= '$' IDENTIFIER
```
Examples: `$result`, `$my_concept`, `$Dog`

### Identifier Patterns
```ebnf
IDENTIFIER ::= VERB_ID | CONCEPT_ID | FACT_ID | TEMP_ID

VERB_ID    ::= [A-Z] [A-Z0-9_]*           # All uppercase (verbs/relations)
CONCEPT_ID ::= [a-z] [a-z0-9_]*           # All lowercase (concepts)
FACT_ID    ::= [A-Z] [a-z0-9_]*           # First upper, rest lower (facts)
TEMP_ID    ::= '_'                         # Underscore only (temporary)
```

### Special Identifiers
```ebnf
SPECIAL_ID ::= 'any'                       # Wildcard concept
             | 'subject'                   # Implicit subject in verb definition
             | 'object'                    # Implicit object in verb definition
             | 'freevar' [0-9]+            # Free variable in verb definition
```

### Numeric Values
```ebnf
NUMBER ::= '-'? [0-9]+ ('.' [0-9]+)?
```
Examples: `127`, `-127`, `0`, `64`, `3.14`

### String Literals
```ebnf
STRING ::= '"' [^"]* '"' | "'" [^']* "'"
```
Examples: `"hello world"`, `'temperature=100'`

---

## Grammar

### Program Structure
```ebnf
PROGRAM ::= STATEMENT*

STATEMENT ::= SIMPLE_STATEMENT SEPARATOR?
            | COMPOUND_STATEMENT

SIMPLE_STATEMENT ::= VAR_DECL SUBJECT VERB OBJECT

# Statements separated by newline, @ (next statement), or optional ;
SEPARATOR ::= NEWLINE | ';'

COMPOUND_STATEMENT ::= VAR_DECL 'BEGIN' INNER_STATEMENT+ 'END'

# Inside BEGIN/END: newline or ; separates, @ starts next statement
INNER_STATEMENT ::= SIMPLE_STATEMENT (NEWLINE | ';')?
                  | RETURN_STATEMENT (NEWLINE | ';')?

RETURN_STATEMENT ::= '@return' SUBJECT VERB OBJECT
```

**Note:** Semicolons are **optional**. The `@` symbol at the start of a new VAR_DECL implicitly terminates the previous statement. Newlines also act as statement separators.

### Triple Components
```ebnf
SUBJECT ::= CONCEPT_ID | FACT_ID | VAR_REF | SPECIAL_ID
VERB    ::= VERB_ID | VAR_REF
OBJECT  ::= CONCEPT_ID | FACT_ID | VAR_REF | SPECIAL_ID | NUMBER | STRING
```

### Compound Definition Forms
```ebnf
# Multi-line form (recommended for readability)
COMPOUND_MULTILINE ::= VAR_DECL 'BEGIN'
                         INNER_STATEMENT+
                       'END'

# Single-line form (compact)
COMPOUND_SINGLELINE ::= VAR_DECL 'BEGIN' INNER_STATEMENT+ 'END'
```

---

## Statement Forms

### Simple Triple Statement
Every simple statement is a triple: Subject VERB Object.

```sys2dsl
@result Subject VERB Object
```

Examples:
```sys2dsl
@_ Dog IS_A animal              # Dog is an animal (fact)
@r Dog QUERY animal             # Query if Dog relates to animal
@v Dog FACTS any                # Get all facts about Dog
@c $a AND $b                    # Boolean AND of two results
```

### Compound Definition (BEGIN/END)

Compound statements define new verbs, concepts, or facts with internal logic.

**Multi-line form:**
```sys2dsl
@GRANDPARENT_OF BEGIN
  @p1 subject PARENT_OF freevar1;
  @p2 freevar1 PARENT_OF object;
  @return subject GRANDPARENT_OF object;
END
```

**Single-line form:**
```sys2dsl
@GRANDPARENT_OF BEGIN @p1 subject PARENT_OF freevar1; @p2 freevar1 PARENT_OF object; @return subject GRANDPARENT_OF object; END
```

### The @return Convention

Inside a BEGIN/END block, `@return` marks the statement whose result is the return value of the compound definition.

```sys2dsl
@MY_VERB BEGIN
  @step1 subject DO_SOMETHING freevar1;
  @step2 freevar1 DO_MORE object;
  @return $step2 FINALIZE any;      # This is returned when MY_VERB is invoked
END
```

If no `@return` is specified, the last statement (topologically) is the return value.

### Temporary Results (@_)

Use `@_` when you don't need the result but want the side effect:

```sys2dsl
@_ Dog IS_A animal              # Assert fact, don't store result
@_ theory_name LOAD any         # Load theory, ignore return
```

---

## Special Concepts

### `any` - The Wildcard Concept

`any` is a predefined concept that matches anything. It replaces wildcards (`*`, `?`).

```sys2dsl
@all_facts any RELATES any              # All facts (subject=any, object=any)
@dog_facts Dog FACTS any                # All facts about Dog
@animals any IS_A animal                # All instances of animal
@dog_rels Dog any any                   # All relations where Dog is subject
```

**Important:** `any` is a real concept with a point in space, not syntax sugar.

### Implicit Variables in Verb Definitions

Inside BEGIN/END for verbs, these are implicit:

| Variable | Meaning |
|----------|---------|
| `subject` | The left argument when the verb is invoked |
| `object` | The right argument when the verb is invoked |
| `freevar1`, `freevar2`, ... | Free variables for intermediate bindings |

```sys2dsl
@UNCLE_OF BEGIN
  @p1 subject SIBLING_OF freevar1;      # subject = whoever invokes UNCLE_OF
  @p2 freevar1 PARENT_OF object;        # object = the second argument
  @return subject UNCLE_OF object;
END

# Usage:
@r Bob UNCLE_OF Alice                   # subject=Bob, object=Alice
```

---

## Numeric Constants

Constants are created using the `NUMERIC_VALUE` relation:

```sys2dsl
@positive NUMERIC_VALUE 127
@negative NUMERIC_VALUE -127
@zero NUMERIC_VALUE 0
@half NUMERIC_VALUE 64
```

These create constant points that can be used in dimension operations:

```sys2dsl
@_ Dog ONTO_EXISTENCE $positive         # Set Dog's existence to +127
@ex Dog READ_DIM existence              # Read Dog's existence dimension
```

---

## Predefined Relations (Geometric Primitives)

These relations are hardcoded because they perform fundamental geometric operations:

```
┌─────────────────────────────────────────────────────────────────┐
│              GEOMETRIC PRIMITIVES (Hardcoded)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Relation          │  Geometric Operation                      │
│  ──────────────────│──────────────────────────────────────     │
│  NUMERIC_VALUE     │  Create constant point                    │
│  READ_DIM          │  Read dimension value from point          │
│  PROJECT_DIM       │  Set dimension value on point             │
│  ZERO_DIMS         │  Zero specified dimensions                │
│  ATTRACT           │  Move point toward another                │
│  EXTEND            │  Expand diamond boundary                  │
│  NEW_COMPOSITE     │  Create composite point from two          │
│  INDUCT            │  Geometric induction (extend from examples)│
│  DEDUCT            │  Geometric deduction (project to parent)  │
│  ABDUCT_PRIM       │  Geometric abduction (reverse inference)  │
│  ANALOGIZE_PRIM    │  Vector transfer between domains          │
│  PERMUTE           │  Apply relation permutation               │
│  MIN               │  Numeric minimum                          │
│  MAX               │  Numeric maximum                          │
│  PLUS              │  Numeric addition                         │
│  MINUS             │  Numeric subtraction                      │
│  MULTIPLY          │  Numeric multiplication                   │
│  DIVIDE            │  Numeric division                         │
│  EQUALS            │  Numeric equality check                   │
│  GREATER_THAN      │  Numeric comparison                       │
│  LESS_THAN         │  Numeric comparison                       │
│  KIND              │  Set/read point kind                      │
│  PRIMITIVE         │  Mark as primitive (for documentation)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

All other relations (IS_A, CAUSES, AND, OR, QUERY, etc.) are defined as verbs in the base theory using these primitives.

---

## Execution Model

### Declarative, Not Imperative

Sys2DSL is **declarative**. Statement order does not matter. Execution order is determined by **topological sort** of dependencies.

```sys2dsl
# These execute in dependency order, not textual order:
@result $a AND $b                       # Executes THIRD (depends on $a, $b)
@a Dog IS_A animal                      # Executes FIRST (no dependencies)
@b Cat IS_A animal                      # Executes FIRST (no dependencies)
```

### Dependency Resolution

Dependencies are created by variable references (`$var`):

```sys2dsl
@step3 $step2 PROCESS $step1    # Depends on step1 and step2
@step1 input1 TRANSFORM any     # No dependencies
@step2 input2 TRANSFORM any     # No dependencies
```

Execution order: `step1`, `step2` (parallel), then `step3`.

### Circular Dependencies

Circular dependencies are an error:

```sys2dsl
@a $b TRANSFORM any             # ERROR: circular dependency
@b $a TRANSFORM any             # a depends on b, b depends on a
```

---

## Point Types and Inspection

Every point in space has a `kind` field:

| kind | Created by | Description |
|------|------------|-------------|
| `"verb"` | `@VERB_NAME` declarations | Verb/relation definition |
| `"relation"` | System primitives | Hardcoded geometric relations |
| `"concept"` | `@concept_name` declarations | Concept center point |
| `"fact"` | `@Fact_name` declarations | Fact/instance point |
| `"composite"` | AND, OR, compound operations | Composite result |
| `"constant"` | `NUMERIC_VALUE` | Numeric constant |
| `"control"` | `CONTROLS` relation | Execution control point |
| `"any"` | Predefined | The wildcard concept |

Inspect a point:
```sys2dsl
@info Dog INSPECT any           # Returns point details including kind
```

---

## Complete EBNF Grammar

```ebnf
(* Sys2DSL v3.0 Complete Grammar *)

program        = { statement } ;

statement      = simple_stmt | compound_stmt ;

simple_stmt    = var_decl , subject , verb , object ;

compound_stmt  = var_decl , 'BEGIN' , inner_stmts , 'END' ;

inner_stmts    = inner_stmt , { inner_stmt } ;

inner_stmt     = ( simple_stmt | return_stmt ) , ';' ;

return_stmt    = '@return' , subject , verb , object ;

var_decl       = '@' , ( identifier | '_' | 'return' ) ;

subject        = concept_id | fact_id | var_ref | special_id ;

verb           = verb_id | var_ref ;

object         = concept_id | fact_id | var_ref | special_id
               | number | string ;

var_ref        = '$' , identifier ;

identifier     = verb_id | concept_id | fact_id ;

verb_id        = upper , { upper | digit | '_' } ;

concept_id     = lower , { lower | digit | '_' } ;

fact_id        = upper , { lower | digit | '_' } ;

special_id     = 'any' | 'subject' | 'object'
               | 'freevar' , digit , { digit } ;

number         = [ '-' ] , digit , { digit } , [ '.' , digit , { digit } ] ;

string         = '"' , { char - '"' } , '"'
               | "'" , { char - "'" } , "'" ;

upper          = 'A' | 'B' | ... | 'Z' ;
lower          = 'a' | 'b' | ... | 'z' ;
digit          = '0' | '1' | ... | '9' ;
char           = (* any UTF-8 character *) ;

(* Comments: # to end of line *)
```

---

## Examples

### Simple Assertions
```sys2dsl
@_ Dog IS_A animal
@_ Cat IS_A animal
@_ Grivei IS_A Dog
@_ Paris LOCATED_IN France
```

### Queries with `any`
```sys2dsl
@all_animals any IS_A animal            # What is an animal?
@dog_facts Dog FACTS any                # All facts about Dog
@what_causes any CAUSES fever           # What causes fever?
@dog_relations Dog any Cat              # Relations between Dog and Cat
```

### Defining a Verb
```sys2dsl
@GRANDPARENT_OF BEGIN
  @p1 subject PARENT_OF freevar1;
  @p2 freevar1 PARENT_OF object;
  @return subject HAS_RELATION grandparent;
END

# Usage:
@r Alice GRANDPARENT_OF Charlie
```

### Defining a Concept
```sys2dsl
@dangerous_animal BEGIN
  @is_animal subject IS_A animal;
  @is_dangerous subject HAS dangerous;
  @return $is_animal AND $is_dangerous;
END
```

### Boolean Logic
```sys2dsl
@a Dog IS_A animal
@b Dog HAS fur
@both $a AND $b
@either $a OR $b
@not_a $a NOT any
```

### Constants and Dimensions
```sys2dsl
@high NUMERIC_VALUE 100
@_ Dog ONTO_EXISTENCE $high             # Dog definitely exists
@ex Dog READ_DIM existence              # Read existence value
```

### Theory Management
```sys2dsl
@_ hypothetical PUSH any                # Push new theory layer
@_ Unicorn IS_A animal                  # Assert in hypothetical
@r Unicorn QUERY animal                 # Query in hypothetical
@_ any POP any                          # Pop layer, discard changes
```

### Control Points
```sys2dsl
@depth NUMERIC_VALUE 5
@_ $depth CONTROLS reasoning_depth      # Limit reasoning depth
@limit NUMERIC_VALUE 10
@_ $limit CONTROLS backtrack_limit      # Limit backtracking
```

---

## Reserved Words

The following cannot be used as custom identifiers:
- `BEGIN`, `END` - Compound delimiters
- `any` - Wildcard concept
- `subject`, `object`, `freevar1`, ... - Implicit verb variables
- `return` - Return marker (after @)
- All primitive relation names (NUMERIC_VALUE, READ_DIM, etc.)

---

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid declaration` | Missing @ prefix | Add `@` before variable name |
| `Invalid triple` | Not exactly 3 components | Ensure Subject VERB Object |
| `Circular dependency` | $a uses $b, $b uses $a | Restructure dependencies |
| `Unknown verb` | Verb not defined | Define verb or check spelling |
| `Type mismatch` | Wrong case convention | Check naming (CAPS/lower/First) |
| `Missing return` | No @return in compound | Add @return or rely on last statement |
| `Unclosed BEGIN` | Missing END | Add END to close compound |

---

## Implementation References

| Component | Source |
|-----------|--------|
| Parser | `src/theory/dsl_parser.js` |
| Engine | `src/theory/dsl_engine.js` |
| Verb Executor | `src/theory/verb_executor.js` |
| Base Theory Verbs | `data/theories/base/*.sys2dsl` |

---

## See Also

- [Sys2DSL-spec.md](./Sys2DSL-spec.md) - Semantic specification
- [Sys2DSL_geometric_model.md](./theory/Sys2DSL_geometric_model.md) - Geometric model and v3 patterns
- [topological_eval.md](./theory/topological_eval.md) - Evaluation model
- [base/logic.sys2dsl](../init/theories/base/logic.sys2dsl) - Boolean logic verbs
- [base/reasoning.sys2dsl](../init/theories/base/reasoning.sys2dsl) - Reasoning verbs
