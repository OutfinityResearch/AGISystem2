# Design Spec: Sys2DSL Language Specification

ID: DS(/theory/Sys2DSL_syntax)

Status: DRAFT v2.0 - Major revision aligned with architectural vision

## 1. Overview

Sys2DSL (System 2 Domain Specific Language) is the **sole interface** for communicating with the AGISystem2 reasoning engine. All interactions - whether from CLI, external agents, or programmatic clients - must be expressed as Sys2DSL scripts.

### 1.1 Design Principles

1. **Single Interface**: Sys2DSL is the ONLY way to send commands to the engine. No direct API calls bypass it.
2. **Scripts In, Scripts Out**: Sessions receive Sys2DSL scripts and return Sys2DSL scripts (which can then be converted to natural language for display).
3. **Deterministic**: Same script + same theory stack = same results.
4. **Human-Readable**: Syntax designed for both machine generation and human authoring.
5. **Composable**: Variables enable chaining results between commands.

### 1.2 Document References

- DS(/theory/Sys2DSL_commands) - Complete command reference
- DS(/theory/dsl_engine.js) - Interpreter implementation
- DS(/interface/system2_session.js) - Session lifecycle
- DS(/knowledge/theory_stack.js) - Theory management

---

## 2. Lexical Structure

### 2.1 Character Set

- UTF-8 encoding
- Identifiers: `[a-zA-Z_][a-zA-Z0-9_]*`
- No emoji or special Unicode in identifiers

### 2.2 Token Types

| Token Type | Pattern | Examples |
|------------|---------|----------|
| VARIABLE_DEF | `@[a-z][a-zA-Z0-9_]*` | `@result`, `@myVar`, `@fact1` |
| VARIABLE_REF | `\$[a-z][a-zA-Z0-9_]*` | `$result`, `$myVar`, `$fact1` |
| CONCEPT | `[a-z][a-z0-9_]*` | `dog`, `boiling_point`, `person` |
| FACT | `[A-Z][a-zA-Z0-9_]*` | `Water`, `Alice`, `Treaty_of_Paris` |
| RELATION | `[A-Z][A-Z0-9_]*` | `IS_A`, `CAUSES`, `HAS_PROPERTY` |
| COMMAND | `[A-Z][A-Z0-9_]*` | `ASK`, `ASSERT`, `VALIDATE` |
| NUMBER | `-?[0-9]+(\.[0-9]+)?` | `42`, `-3.14`, `0` |
| STRING | `"[^"]*"` | `"hello world"` |
| COMMENT | `#.*$` | `# this is a comment` |
| SEPARATOR | `;` | statement separator |
| WILDCARD | `?` | pattern matching wildcard |

### 2.3 Case Conventions (CRITICAL)

```
lowercase     = concept (type, category, class)
                Examples: dog, temperature, legal_entity

Capitalized   = fact/individual (concrete instance)
                Examples: Water, Alice, Paris, Contract_2024_001

UPPERCASE     = relation/verb OR command
                Context determines which:
                - After @var: COMMAND
                - Inside parameters: RELATION
```

### 2.4 Comments

```sys2dsl
# Single line comment (entire line)
@result ASK Water IS_A liquid  # Inline comment NOT supported in v1
```

### 2.5 Line Structure

- One statement per line, starting with `@var`.
- Multiple statements on the same physical line are allowed **only** if each statement begins with its own `@` (the parser splits on `@`, not on `;`).  
- Semicolons are treated as regular characters; they do **not** delimit statements.  
- Backslash continuations are **not** supported.

---

## 3. Statement Syntax

### 3.1 General Form

```
@variableName COMMAND parameter1 parameter2 ... parameterN
```

Every statement:
1. **Starts with** `@variableName` - declares where to store the result
2. **Followed by** `COMMAND` - the operation to perform
3. **Followed by** parameters - command-specific arguments

### 3.2 Variable Declaration and Reference

```sys2dsl
# Declaration (stores result)
@myResult ASK Water IS_A liquid

# Reference (uses previous result)
@final COMBINE $myResult $otherResult

# Variables are immutable once assigned
# Re-declaration with same name is an ERROR
```

### 3.3 Parameter Syntax

Parameters can be:

> Note: Unquoted `property=value` tokens in subject/object positions are rejected by the current parser. If you must carry such text, quote it (e.g., `"temp=100"`) or model it as a named concept instead.

#### 3.3.1 Triplet Form (Subject RELATION Object)
```sys2dsl
@fact ASSERT Water IS_A liquid
@query ASK Dog CAUSES Fear
```

#### 3.3.2 Simple Token List
```sys2dsl
@mask MASK_PARTITIONS ontology axiology
@dims MASK_DIMS temperature pressure density
```

#### 3.3.3 Variable References
```sys2dsl
@combined MERGE_LISTS $list1 $list2
@check BOOL_AND $cond1 $cond2
```

#### 3.3.4 Pattern with Wildcards
```sys2dsl
@matches FACTS_MATCHING ? IS_A animal
@causes FACTS_MATCHING Water CAUSES ?
@all FACTS_MATCHING ? ? ?
```

#### 3.3.5 Mixed Forms
```sys2dsl
@result ASK_MASKED $myMask Water IS_A liquid
```

---

## 4. Type System

### 4.1 Value Types

| Type | Description | Literal Syntax |
|------|-------------|----------------|
| `truth` | Truth value | `TRUE_CERTAIN`, `PLAUSIBLE`, `FALSE`, `UNKNOWN`, `CONFLICT` |
| `concept_ref` | Reference to concept | (returned by BIND_CONCEPT) |
| `fact_ref` | Reference to fact | (returned by ASSERT) |
| `relation_ref` | Reference to relation | (returned by BIND_RELATION) |
| `list` | Array of items | (returned by FACTS_MATCHING, etc.) |
| `mask` | Dimension mask | (returned by MASK_*) |
| `number` | Numeric value | `42`, `-3.14` |
| `string` | Text string | `"hello"` |
| `theory_ref` | Reference to theory | (returned by theory commands) |

### 4.2 Truth Values

```sys2dsl
# Possible truth values returned by ASK, VALIDATE, PROVE:
TRUE_CERTAIN    # Definitely true within current theory
PLAUSIBLE       # Likely true but not certain (within radius)
FALSE           # Definitely false
UNKNOWN         # Cannot determine (timeout or insufficient data)
CONFLICT        # Contradictory evidence found
```

### 4.3 Result Objects

Commands return structured results:

```javascript
// ASK returns:
{
  truth: 'TRUE_CERTAIN' | 'PLAUSIBLE' | 'FALSE' | 'UNKNOWN' | 'CONFLICT',
  confidence: 0.0-1.0,
  provenance: [...explanation steps...]
}

// ASSERT returns:
{
  ok: true | false,
  conceptId: string,
  factId: string,
  created: boolean  // true if new, false if merged
}

// FACTS_MATCHING returns:
[
  { subject: string, relation: string, object: string, factId: string },
  ...
]
```

---

## 5. Concepts vs Facts vs Relations

### 5.1 Concepts (Types/Categories)

Concepts are **types or categories** in the knowledge space. They represent classes of things.

```sys2dsl
# Concepts are lowercase
dog              # the concept of "dog" (the type)
temperature      # the concept of temperature
legal_entity     # the concept of a legal entity
boiling_point    # the property concept
```

**Characteristics:**
- Represented as BoundedDiamond in vector space
- Can have multiple meanings (polysemy → multiple diamonds)
- Lowercase naming convention
- Created implicitly through ASSERT or explicitly through DEFINE_CONCEPT

### 5.2 Facts (Instances/Individuals)

Facts are **concrete instances** - specific entities or statements.

```sys2dsl
# Facts start with uppercase
Water            # the specific substance water
Alice            # a specific person named Alice
Paris            # the specific city
Contract_2024_01 # a specific contract
```

**Characteristics:**
- Represent specific instances in the knowledge base
- Capitalized naming convention
- Created through ASSERT statements
- Have a unique factId

### 5.3 Relations (Verbs)

Relations define **how concepts/facts relate** to each other.

```sys2dsl
# Relations are ALL_CAPS
IS_A             # subsumption/type hierarchy
CAUSES           # causal relationship
HAS_PROPERTY     # attribute relationship
PERMITS          # deontic permission
PROHIBITS        # deontic prohibition
```

**Characteristics:**
- Have properties: inverse, symmetric, transitive
- Are also concepts (can be queried and modified)
- ALL_CAPS naming convention
- Can be built-in or user-defined

### 5.4 Examples Clarifying the Distinction

```sys2dsl
# "dog" is a concept (type), "Fido" is a fact (instance)
@f1 ASSERT Fido IS_A dog

# "water" as concept vs "Water" as the specific substance
@f2 ASSERT Water IS_A liquid           # Water (specific) is a liquid (type)
@f3 ASSERT water HAS_PROPERTY boiling_point  # water (concept) has property

# Query about concept
@q1 ASK dog IS_A animal                # Is the type "dog" a subtype of "animal"?

# Query about fact
@q2 ASK Fido IS_A mammal               # Is Fido (specific dog) a mammal?
```

---

## 6. Relations as First-Class Concepts

### 6.1 Principle

Relations are themselves concepts that can be:
- Queried for their properties
- Modified within a theory
- Extended with new relations
- Used in reasoning about relationships

### 6.2 Querying Relations

```sys2dsl
# Bind a relation to inspect it
@rel BIND_RELATION CAUSES
@props INSPECT $rel

# Returns:
# {
#   name: "CAUSES",
#   inverse: "CAUSED_BY",
#   symmetric: false,
#   transitive: false,
#   domain: "ontology",
#   range: "ontology"
# }
```

### 6.3 Modifying Relations in Theory

```sys2dsl
# Make CAUSES transitive in current theory (local override)
@mod MODIFY_RELATION CAUSES transitive=true

# This does NOT change the base definition
# Only affects current session/theory layer
```

### 6.4 Defining New Relations

```sys2dsl
# Define a new relation/verb
@newrel DEFINE_RELATION TEACHES \
        inverse=TAUGHT_BY \
        symmetric=false \
        transitive=false \
        domain=ontology \
        range=ontology

# Now usable in assertions
@f1 ASSERT Alice TEACHES mathematics
@f2 ASSERT Bob TAUGHT_BY Alice
```

---

## 7. Evaluation Model

### 7.1 Topological Ordering

Commands are NOT executed in textual order. Instead:

1. Parser builds dependency graph from `$variable` references
2. Topological sort determines execution order
3. Commands with no dependencies execute first
4. Cyclic dependencies are an ERROR

```sys2dsl
# These execute in dependency order, not textual order:
@c BOOL_AND $a $b      # Executes THIRD (depends on a, b)
@a ASK Water IS_A liquid   # Executes FIRST (no deps)
@b ASK Ice IS_A solid      # Executes SECOND (no deps, parallel with a)
```

### 7.2 Execution Context

Each script executes within:
- **Session**: Provides working theory overlay
- **Theory Stack**: Base theories + session overlay
- **Environment**: Variable bindings from current script

### 7.3 Determinism

Given:
- Same script text
- Same theory stack state
- Same configuration

Result is **always identical**. No randomness, no external dependencies.

---

## 8. Session Lifecycle

### 8.1 Session Start

```sys2dsl
# When session starts:
# 1. New working theory layer created (empty overlay)
# 2. Base theories loaded per configuration
# 3. Ready to receive scripts
```

### 8.2 Script Execution

```sys2dsl
# Client sends script
@q1 ASK Water IS_A liquid
@q2 ASK Ice IS_A solid

# Engine returns result script
@q1 = { truth: TRUE_CERTAIN, confidence: 0.95, ... }
@q2 = { truth: TRUE_CERTAIN, confidence: 0.92, ... }
```

### 8.3 Theory Modification

```sys2dsl
# Modifications go to working theory (session-local)
@f1 ASSERT NewFact IS_A something

# To persist, explicitly save
@saved SAVE_THEORY my_theory_name

# Or merge into existing theory
@merged MERGE_THEORY current target_theory
```

### 8.4 Session End

```sys2dsl
# On session close:
# - Working theory discarded (unless saved)
# - Base theories unchanged
# - Audit log persisted
```

---

## 9. Error Handling

### 9.1 Error Types

| Error | Cause | Example |
|-------|-------|---------|
| `SYNTAX_ERROR` | Invalid syntax | `@123 ASK` (invalid var name) |
| `UNDEFINED_VAR` | Reference to undeclared variable | `$nonexistent` |
| `CYCLE_ERROR` | Circular dependency | `@a X $b; @b Y $a` |
| `TYPE_ERROR` | Wrong parameter type | `BOOL_AND 42 "text"` |
| `UNKNOWN_COMMAND` | Invalid command name | `@x FOOBAR y` |
| `UNKNOWN_RELATION` | Undefined relation used | `UNDEFINED_REL` |
| `TIMEOUT` | Reasoning exceeded limit | complex recursive query |
| `CONFLICT` | Contradictory evidence | inconsistent theory |

### 9.2 Error Response Format

```sys2dsl
# On error, result includes:
@varName = {
  error: "SYNTAX_ERROR",
  message: "Invalid variable name: must start with lowercase",
  line: 5,
  column: 1
}
```

---

## 10. Natural Language Bridge

### 10.1 Script to Natural Language

```sys2dsl
# Convert result to natural language for display
@result ASK Water CAUSES Boiling
@display TO_NATURAL $result

# Returns: "Yes, water causes boiling (confidence: 87%)"
```

### 10.2 Natural Language to Script

This is handled by external translator (LLM) with pinned prompts for determinism. The translator:
1. Receives natural language query
2. Produces Sys2DSL script
3. Script is validated before execution

---

## 11. Reserved Words

### 11.1 Commands (see DS(/theory/Sys2DSL_commands) for full list)

Currently implemented commands (grouped). Recommended high-level entry points: QUERY, WHATIF, SUGGEST, SUMMARIZE_FACTS, MANAGE_THEORY, MEMORY, MASK, FORMAT_RESULT (see DS(/theory/Sys2DSL_highlevel.md)). Granular/legacy commands:
```
Queries: QUERY, ASK, ASK_MASKED, CF, ABDUCT
Facts: ASSERT, FACTS_MATCHING
Logic/validation: VALIDATE, PROVE, HYPOTHESIZE, ANALOGICAL
Inference: INFER, FORWARD_CHAIN, DEFINE_RULE, DEFINE_DEFAULT, WHY
Contradiction/cardinality: CHECK_CONTRADICTION, CHECK_WOULD_CONTRADICT, REGISTER_FUNCTIONAL, REGISTER_CARDINALITY
Masks: MASK, MASK_PARTITIONS, MASK_DIMS, ASK_MASKED
Lists/booleans: BOOL_AND, BOOL_OR, BOOL_NOT, NONEMPTY, MERGE_LISTS, PICK_FIRST, PICK_LAST, COUNT, FILTER, POLARITY_DECIDE
Concepts/relations: BIND_CONCEPT, BIND_POINT, BIND_RELATION, DEFINE_CONCEPT, DEFINE_RELATION, INSPECT, LITERAL
Memory: RETRACT, GET_USAGE, FORGET, BOOST, PROTECT, UNPROTECT
Theory: LIST_THEORIES, LOAD_THEORY, SAVE_THEORY, MERGE_THEORY, THEORY_PUSH, THEORY_POP, RESET_SESSION
Output: TO_NATURAL, TO_JSON, EXPLAIN, FORMAT, SUMMARIZE
```

### 11.2 Truth Values

```
TRUE_CERTAIN, PLAUSIBLE, FALSE, UNKNOWN, CONFLICT
```

### 11.3 Partitions

```
ontology, axiology, empirical
```

---

## 12. Grammar (EBNF)

```ebnf
script          = { statement } ;
statement       = var_decl COMMAND params ;
var_decl        = "@" IDENTIFIER ;
params          = { param } ;
param           = var_ref | triplet | token | pattern | string | number ;
var_ref         = "$" IDENTIFIER ;
triplet         = subject RELATION object ;
subject         = CONCEPT | FACT | "?" ;
object          = CONCEPT | FACT | "?" ;
pattern         = ( CONCEPT | FACT | "?" ) RELATION ( CONCEPT | FACT | "?" ) ;
token           = CONCEPT | FACT | RELATION ;
string          = '"' { char } '"' ;
number          = [ "-" ] DIGITS [ "." DIGITS ] ;
IDENTIFIER      = LETTER { LETTER | DIGIT | "_" } ;
CONCEPT         = LOWER { LOWER | DIGIT | "_" } ;
FACT            = UPPER { LETTER | DIGIT | "_" } ;
RELATION        = UPPER { UPPER | DIGIT | "_" } ;
COMMAND         = UPPER { UPPER | DIGIT | "_" } ;
LOWER           = "a" | ... | "z" ;
UPPER           = "A" | ... | "Z" ;
DIGIT           = "0" | ... | "9" ;
LETTER          = LOWER | UPPER ;
```

---

## 13. Examples

### 13.1 Basic Query

```sys2dsl
# Is water a liquid?
@answer ASK Water IS_A liquid
```

### 13.2 Building Knowledge

```sys2dsl
# Define facts about water
@f1 ASSERT Water IS_A liquid
@f2 ASSERT Water HAS_PROPERTY boiling_point
@f3 ASSERT Water CAUSES Hydration

# Query the knowledge
@q1 ASK Water IS_A substance
@q2 FACTS_MATCHING Water ? ?
```

### 13.3 Masked Reasoning

```sys2dsl
# Create mask for only physical properties
@physMask MASK_PARTITIONS ontology
@answer ASK_MASKED $physMask Water IS_A liquid

# Create mask for specific dimensions
@tempMask MASK_DIMS temperature pressure
@answer2 ASK_MASKED $tempMask Steam IS_A gas
```

> `MASK_DIMS` names must be resolvable via `config.dimensionNames` or be numeric indices; otherwise the command raises an error.

### 13.4 Theory Management

```sys2dsl
# List available theories
@theories LIST_THEORIES

# Load a specific theory
@loaded LOAD_THEORY physics_basic

# Make assertions (go to working theory)
@f1 ASSERT Helium IS_A noble_gas

# Save working theory
@saved SAVE_THEORY my_physics_extension
```

### 13.5 Validation and Proof

```sys2dsl
# Validate that new facts are consistent
@newFacts ASSERT Contradiction IS_A true
@newFacts2 ASSERT Contradiction IS_A false
@valid VALIDATE

# Try to prove a theorem
@theorem PROVE mammal REQUIRES oxygen
```

### 13.6 Hypothesis Generation

```sys2dsl
# Given observation, find possible causes
@observation ASSERT Patient HAS_SYMPTOM fever
@hypotheses HYPOTHESIZE Patient HAS_SYMPTOM fever CAUSED_BY ?
```

### 13.7 Defining New Relations

```sys2dsl
# Define a domain-specific relation
@rel DEFINE_RELATION PRESCRIBES \
     inverse=PRESCRIBED_BY \
     symmetric=false \
     transitive=false

# Use it
@f1 ASSERT Doctor PRESCRIBES Medicine
@f2 ASSERT Medicine PRESCRIBED_BY Doctor
```

---

## 14. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Basic command set |
| 2.0 | Current | Major revision: Sys2DSL as sole interface, relations as concepts, theory management, usage tracking |

---

## 15. Related Documents

- DS(/theory/Sys2DSL_commands) - Complete command reference
- DS(/theory/Sys2DSL_arch) - Data mapping and architecture
- DS(/knowledge/usage_tracking) - Usage counters and prioritization
- DS(/knowledge/forgetting) - Forgetting mechanisms
- DS(/interface/usecase_define_theory) - How to define theories
- DS(/interface/usecase_validate) - How to validate consistency
- DS(/interface/usecase_hypothesize) - How to generate hypotheses
- DS(/interface/usecase_prove) - How to prove theorems
