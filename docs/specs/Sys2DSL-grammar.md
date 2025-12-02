# Sys2DSL Language Specification - Grammar & Syntax

ID: DS(/Sys2DSL-grammar)

This is the **syntactic specification** for Sys2DSL. For semantics, see [Sys2DSL-spec.md](./Sys2DSL-spec.md).

## Lexical Structure

### Character Set
- UTF-8 encoding
- Case-sensitive identifiers
- Whitespace: space, tab, newline (statement separators)

### Comments
```sys2dsl
# Single-line comment
# Comments start with # and extend to end of line
```

### Tokens

#### Variable Declaration
```
VAR_DECL ::= '@' IDENTIFIER
```
Examples: `@result`, `@q1`, `@fact_list`

#### Variable Reference
```
VAR_REF ::= '$' IDENTIFIER
```
Examples: `$result`, `$q1`, `$fact_list`

#### Identifier
```
IDENTIFIER ::= [A-Za-z_] [A-Za-z0-9_]*
```
Examples: `Dog`, `IS_A`, `temperature_rise`, `q1`

#### Commands (Keywords)
```
COMMAND ::=
    # Query Commands
    'ASK' | 'ASK_MASKED' | 'FACTS_MATCHING' | 'FACTS_WITH_RELATION' | 'FACTS_WITH_OBJECT'
  | 'INSTANCES_OF' | 'ALL_REQUIREMENTS_SATISFIED'
    # Assertion Commands
  | 'ASSERT' | 'RETRACT'
    # Reasoning Commands
  | 'CF' | 'ABDUCT' | 'PROVE' | 'ANALOGICAL' | 'HYPOTHESIZE' | 'VALIDATE'
  | 'CHECK_CONTRADICTION' | 'CHECK_WOULD_CONTRADICT'
  | 'REGISTER_FUNCTIONAL' | 'REGISTER_CARDINALITY'
    # Inference Commands
  | 'INFER' | 'FORWARD_CHAIN' | 'WHY' | 'DEFINE_RULE' | 'DEFINE_DEFAULT' | 'CLEAR_RULES'
    # Boolean/List Operations
  | 'BOOL_AND' | 'BOOL_OR' | 'BOOL_NOT' | 'NONEMPTY'
  | 'MERGE_LISTS' | 'PICK_FIRST' | 'PICK_LAST' | 'COUNT' | 'FILTER' | 'POLARITY_DECIDE'
    # Theory Management
  | 'THEORY_PUSH' | 'THEORY_POP' | 'LIST_THEORIES' | 'SAVE_THEORY' | 'LOAD_THEORY'
  | 'MERGE_THEORY' | 'DELETE_THEORY' | 'THEORY_INFO' | 'RESET_SESSION'
    # Concept/Relation Binding
  | 'BIND_CONCEPT' | 'BIND_POINT' | 'BIND_RELATION'
  | 'DEFINE_CONCEPT' | 'DEFINE_RELATION' | 'INSPECT' | 'LITERAL'
    # Masking
  | 'MASK_PARTITIONS' | 'MASK_DIMS'
    # Memory Management
  | 'GET_USAGE' | 'FORGET' | 'BOOST' | 'PROTECT' | 'UNPROTECT'
    # Output Commands
  | 'SUMMARIZE' | 'TO_NATURAL' | 'TO_JSON' | 'FORMAT' | 'EXPLAIN'
    # Ontology Introspection
  | 'EXPLAIN_CONCEPT' | 'MISSING' | 'WHAT_IS'
    # High-Level Commands (wrap multiple granular commands)
  | 'QUERY' | 'WHATIF' | 'SUGGEST' | 'MANAGE_THEORY' | 'MEMORY' | 'MASK'
  | 'FORMAT_RESULT' | 'SUMMARIZE_FACTS' | 'EXPLAIN_QUERY'
```

#### Wildcard
```
WILDCARD ::= '*'
```
The asterisk `*` matches any value in pattern contexts.

**Note**: The question mark `?` is NOT a valid wildcard. Use `*` exclusively.

#### String Literals
```
STRING ::= '"' [^"]* '"' | "'" [^']* "'"
```
Examples: `"Dog IS_A Animal"`, `'temperature=100'`

#### Numeric Literals
```
NUMBER ::= '-'? [0-9]+ ('.' [0-9]+)?
```
Examples: `42`, `-3.14`, `0.5`

## Grammar

### Program Structure
```
PROGRAM ::= STATEMENT*

STATEMENT ::= VAR_DECL COMMAND ARGUMENT*

ARGUMENT ::=
    VAR_REF
  | STRING
  | IDENTIFIER
  | WILDCARD
  | NUMBER
  | KEY_VALUE

KEY_VALUE ::= IDENTIFIER '=' VALUE
VALUE ::= STRING | NUMBER | IDENTIFIER
```

### Statement Forms

#### Basic Statement
```sys2dsl
@varName COMMAND arg1 arg2 ...
```

#### Multi-Statement Line
Multiple statements can appear on one line:
```sys2dsl
@a ASK Dog IS_A Animal @b ASK Cat IS_A Animal
```

#### Multi-Line Scripts
```sys2dsl
@premise1 ASK Dog IS_A Mammal
@premise2 ASK Mammal IS_A Animal
@conclusion BOOL_AND $premise1 $premise2
```

## Command Syntax Reference

### Query Commands

#### ASK
```
ASK_STMT ::= VAR_DECL 'ASK' (STRING | TRIPLET)
TRIPLET ::= IDENTIFIER RELATION IDENTIFIER
RELATION ::= [A-Z_]+
```
```sys2dsl
@q ASK "Is Dog an Animal?"
@q ASK Dog IS_A Animal
@q ASK $subject $relation $object
```

#### ASK_MASKED
```
ASK_MASKED_STMT ::= VAR_DECL 'ASK_MASKED' VAR_REF (STRING | TRIPLET)
```
```sys2dsl
@q ASK_MASKED $mask "Dog IS_A Animal"
@q ASK_MASKED $ontology_mask Dog IS_A Animal
```

#### FACTS_MATCHING (Polymorphic)
```
FACTS_MATCHING_STMT ::= VAR_DECL 'FACTS_MATCHING' [IDENTIFIER [RELATION [OBJECT]]]
# 0 args: all facts
# 1 arg:  facts where subject or object matches
# 2 args: facts matching subject + relation
# 3 args: exact match (subject + relation + object)
```
```sys2dsl
@all_facts FACTS_MATCHING              # all facts
@dog_facts FACTS_MATCHING Dog          # facts about Dog
@dog_is FACTS_MATCHING Dog IS_A        # Dog IS_A ?
@exact FACTS_MATCHING Dog IS_A Animal  # exact match
```

#### Specialized Query Commands
```sys2dsl
@animals INSTANCES_OF Animal           # all X where X IS_A Animal
@causes FACTS_WITH_RELATION CAUSES     # all facts with CAUSES relation
@heat_facts FACTS_WITH_OBJECT heat     # all facts with object=heat
```

#### CF (Counterfactual)
```
CF_STMT ::= VAR_DECL 'CF' STRING
# String format: "question | fact1 ; fact2 ; ..."
```
```sys2dsl
@cf CF "Water BOILS_AT Celsius50 | pressure=0.1atm"
```

#### ABDUCT
```
ABDUCT_STMT ::= VAR_DECL 'ABDUCT' (STRING | IDENTIFIER) OPTION*
OPTION ::= 'limit=' NUMBER | 'transitive' | 'noTransitive' | 'maxDepth=' NUMBER
```
```sys2dsl
@causes ABDUCT fever
@causes ABDUCT "high_temperature" limit=5 noTransitive
```

### Assertion Commands

#### ASSERT
```
ASSERT_STMT ::= VAR_DECL 'ASSERT' IDENTIFIER RELATION IDENTIFIER+
```
```sys2dsl
@f ASSERT Dog IS_A Animal
@f ASSERT Paris LOCATED_IN France
```

#### RETRACT
```
RETRACT_STMT ::= VAR_DECL 'RETRACT' IDENTIFIER RELATION IDENTIFIER+
```
```sys2dsl
@r RETRACT Dog IS_A Fish
```

### Boolean Commands

```
BOOL_STMT ::= VAR_DECL ('BOOL_AND' | 'BOOL_OR') VAR_REF VAR_REF
            | VAR_DECL 'BOOL_NOT' VAR_REF
            | VAR_DECL 'NONEMPTY' VAR_REF
```
```sys2dsl
@and BOOL_AND $a $b
@or BOOL_OR $a $b
@not BOOL_NOT $a
@has NONEMPTY $list
```

### List Commands

```
LIST_STMT ::=
    VAR_DECL 'MERGE_LISTS' VAR_REF VAR_REF
  | VAR_DECL 'PICK_FIRST' VAR_REF
  | VAR_DECL 'PICK_LAST' VAR_REF
  | VAR_DECL 'COUNT' VAR_REF
  | VAR_DECL 'FILTER' VAR_REF KEY_VALUE
```
```sys2dsl
@merged MERGE_LISTS $list1 $list2
@first PICK_FIRST $facts
@last PICK_LAST $facts
@n COUNT $facts
@filtered FILTER $facts relation=IS_A
```

### Theory Commands

```
THEORY_STMT ::=
    VAR_DECL 'THEORY_PUSH' ('name=' IDENTIFIER)?
  | VAR_DECL 'THEORY_POP'
  | VAR_DECL 'SAVE_THEORY' IDENTIFIER
  | VAR_DECL 'LOAD_THEORY' IDENTIFIER
  | VAR_DECL 'MERGE_THEORY' IDENTIFIER
```
```sys2dsl
@push THEORY_PUSH name=hypothetical
@pop THEORY_POP
@save SAVE_THEORY my_theory
@load LOAD_THEORY base_theory
@merge MERGE_THEORY external_facts
```

### Mask Commands

```
MASK_STMT ::=
    VAR_DECL 'MASK_PARTITIONS' IDENTIFIER+
  | VAR_DECL 'MASK_DIMS' IDENTIFIER+
```
```sys2dsl
@m MASK_PARTITIONS ontology axiology
@m MASK_DIMS Temperature Mass Location
```

### Reasoning Commands

```
REASONING_STMT ::=
    VAR_DECL 'PROVE' IDENTIFIER RELATION IDENTIFIER+
  | VAR_DECL 'HYPOTHESIZE' IDENTIFIER RELATION? OPTION*
  | VAR_DECL 'ANALOGICAL' IDENTIFIER IDENTIFIER IDENTIFIER
  | VAR_DECL 'VALIDATE' IDENTIFIER?
  | VAR_DECL 'CHECK_CONTRADICTION' OPTION*
  | VAR_DECL 'CHECK_WOULD_CONTRADICT' IDENTIFIER RELATION IDENTIFIER+
```
```sys2dsl
@proof PROVE Fido IS_A LivingThing
@hypo HYPOTHESIZE Dog CAN limit=5
@analogy ANALOGICAL King Queen Man
@valid VALIDATE
@contra CHECK_CONTRADICTION disjointness functional
@would CHECK_WOULD_CONTRADICT Dog IS_A Plant
```

### Binding Commands

```
BIND_STMT ::=
    VAR_DECL 'BIND_CONCEPT' IDENTIFIER
  | VAR_DECL 'BIND_POINT' (VAR_REF | IDENTIFIER)
  | VAR_DECL 'BIND_RELATION' IDENTIFIER
  | VAR_DECL 'DEFINE_CONCEPT' IDENTIFIER OPTION*
  | VAR_DECL 'DEFINE_RELATION' IDENTIFIER PROPERTY*
  | VAR_DECL 'INSPECT' IDENTIFIER
```
```sys2dsl
@cref BIND_CONCEPT Dog
@pref BIND_POINT $cref
@rref BIND_RELATION IS_A
@def DEFINE_CONCEPT Temperature vector=[0,0,100]
@rel DEFINE_RELATION SIBLING_OF symmetric
@snap INSPECT Dog
```

### Output Commands

```
OUTPUT_STMT ::=
    VAR_DECL 'TO_NATURAL' VAR_REF+
  | VAR_DECL 'TO_JSON' VAR_REF
  | VAR_DECL 'SUMMARIZE' VAR_REF OPTION*
  | VAR_DECL 'FORMAT' VAR_REF STRING?
```
```sys2dsl
@nl TO_NATURAL $facts
@json TO_JSON $result
@sum SUMMARIZE $facts maxItems=5
@fmt FORMAT $result "template: {truth}"
```

## Operator Precedence

Sys2DSL uses explicit variable references rather than operator precedence. Evaluation order is determined by data dependencies via topological sort.

## Reserved Words

The following are reserved and cannot be used as identifiers:
- All COMMAND keywords (ASK, ASSERT, etc.)
- `TRUE_CERTAIN`, `TRUE_DEFAULT`, `PLAUSIBLE`, `FALSE`, `UNKNOWN`, `CONFLICT`

## Error Recovery

### Syntax Errors
| Error | Message Pattern | Fix |
|-------|-----------------|-----|
| Missing @ | `Invalid Sys2DSL statement: 'X'` | Add @var prefix |
| Missing command | `Invalid Sys2DSL statement` | Add command after @var |
| Unclosed quote | Parse fails | Close string with matching quote |
| Circular dep | `Cyclic Sys2DSL dependencies` | Remove circular $refs |
| Duplicate var | `Duplicate Sys2DSL variable` | Use unique var names |

## Examples

### Simple Query
```sys2dsl
@q ASK Dog IS_A Animal
```

### Pattern Matching with Wildcard
```sys2dsl
@animals INSTANCES_OF Animal
@count COUNT $animals
@has_animals NONEMPTY $animals
```

### Proof Chain
```sys2dsl
@p1 ASK Dog IS_A Mammal
@p2 ASK Mammal IS_A Animal
@p3 ASK Animal IS_A LivingThing
@chain1 BOOL_AND $p1 $p2
@proof BOOL_AND $chain1 $p3
```

### Theory Layer with Hypothetical
```sys2dsl
@push THEORY_PUSH name=what_if
@hypo ASSERT Water BOILS_AT Celsius50
@check ASK Water BOILS_AT Celsius50
@pop THEORY_POP
@restored ASK Water BOILS_AT Celsius100
```

## Implementation References

| Component | Specification | Source |
|-----------|---------------|--------|
| Tokenizer | This document | `src/theory/dsl_parser.js` |
| Parser | This document | `src/theory/dsl_parser.js` |
| Evaluator | [Sys2DSL-spec.md](./Sys2DSL-spec.md) | `src/theory/dsl_engine.js` |
| Commands | [dsl_commands_*.js.md](./theory/) | `src/theory/dsl_commands_*.js` |

## See Also

- [Sys2DSL-spec.md](./Sys2DSL-spec.md) - Semantic specification
- [Sys2DSL_syntax.md](./theory/Sys2DSL_syntax.md) - Extended syntax notes
- [dsl_parser.js.md](./theory/dsl_parser.js.md) - Parser implementation
