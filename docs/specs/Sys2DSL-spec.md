# Sys2DSL Language Specification - Semantics

ID: DS(/Sys2DSL-spec)

Status: v3.0 - Unified Point Semantics

This is the **semantic specification** for Sys2DSL, the declarative language used to interact with AGISystem2's reasoning engine. For syntax and grammar, see [Sys2DSL-grammar.md](./Sys2DSL-grammar.md).

---

## Overview

Sys2DSL (System 2 Domain Specific Language) v3.0 is based on a revolutionary principle:

> **Everything is a point in conceptual space.**

Verbs, concepts, facts, results, constants - all are represented as geometric points with positions and boundaries (diamonds) in a high-dimensional vector space. This unified model enables:

- **Knowledge representation**: Creating points and their relations
- **Reasoning**: Geometric operations on point positions and boundaries
- **Learning**: Expanding diamond boundaries, not moving central points
- **Querying**: Measuring distances and overlaps between diamonds

---

## Core Design Principles

### 1. Everything Is a Point

Every entity in Sys2DSL has a geometric representation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    POINT STRUCTURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Point {                                                        │
│    id: string          # Unique identifier                      │
│    label: string       # Human-readable name                    │
│    kind: PointKind     # "verb" | "concept" | "fact" | ...     │
│    center: number[]    # Central position in N-dim space        │
│    diamond: {          # Uncertainty boundary                   │
│      radii: number[]   # Per-dimension radius                   │
│      shape: "diamond"  # L1-norm boundary                       │
│    }                                                            │
│    version: number     # For forgetting/versioning              │
│    meta: object        # Additional metadata                    │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Unified Triple Syntax

All statements have the same form:

```sys2dsl
@variable Subject VERB Object
```

- **Subject**: A point (concept, fact, or variable reference)
- **VERB**: A relation (also a point, but with `kind: "verb"`)
- **Object**: A point, constant, or wildcard

### 3. Declarative Execution

Statement order is irrelevant. Execution follows **topological sort** of dependencies:

```sys2dsl
@result $a AND $b        # Executes THIRD
@a Dog IS_A animal       # Executes FIRST (no deps)
@b Cat IS_A animal       # Executes FIRST (no deps)
```

### 4. Learning = Diamond Extension

Learning does **not** move the central point. Instead, it **extends the diamond boundary**:

```
Before learning:            After learning:

      ·····                       ·········
     ·  *  ·     + example  →    ·    *    ·
      ·····                       ·········

  * = center (unchanged)
  · = diamond boundary (expanded)
```

### 5. Naming Convention = Point Type

The case pattern of a name determines what kind of point it creates:

| Pattern | Kind | Example |
|---------|------|---------|
| `ALL_CAPS` | verb | `@IS_A`, `@CAUSES`, `@GRANDPARENT_OF` |
| `all_lower` | concept | `@animal`, `@danger`, `@living_thing` |
| `First_lower` | fact | `@Dog`, `@Paris`, `@Grivei` |

---

## Document Map

### Core Specifications
| Document | Focus | Link |
|----------|-------|------|
| **Sys2DSL-grammar.md** | Syntax, tokens, EBNF | [Grammar](./Sys2DSL-grammar.md) |
| **Sys2DSL_arch.md** | Data model, session architecture | [Architecture](./theory/Sys2DSL_arch.md) |

### Geometric Model
| Document | Focus | Link |
|----------|-------|------|
| **conceptual_space.md** | Vector space model | [Conceptual Space](./core/conceptual_space.md) |
| **ConceptStore** | Point storage and retrieval | [Store](./core/ConceptStore.md) |
| **geometric_primitives.md** | Hardcoded operations | [Primitives](./core/geometric_primitives.md) |

### Base Theory Verbs
| File | Category | Contents |
|------|----------|----------|
| **primitives.sys2dsl** | Declarations | Primitive verb declarations |
| **constants.sys2dsl** | Constants | positive, negative, zero, any |
| **logic.sys2dsl** | Boolean Logic | AND, OR, NOT, IMPLIES |
| **modal.sys2dsl** | Modal Logic | POSSIBLY, NECESSARILY |
| **query.sys2dsl** | Queries | QUERY, FACTS, INSTANCES |
| **reasoning.sys2dsl** | Reasoning | PROVE, HYPOTHESIZE, ABDUCT |
| **memory.sys2dsl** | Memory | FORGET, PROTECT, BOOST |
| **theory.sys2dsl** | Theory Layers | PUSH, POP, LOAD, SAVE |
| **output.sys2dsl** | Output | TO_NATURAL, SUMMARIZE |
| **control.sys2dsl** | Control | reasoning_depth, backtrack_limit |

---

## Point Types (kind)

Every point has a `kind` field that determines its behavior:

```
┌─────────────────────────────────────────────────────────────────┐
│                      POINT KINDS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Kind         │  Description                 │  Created By      │
│  ─────────────│──────────────────────────────│─────────────     │
│                                                                 │
│  FUNDAMENTAL KINDS:                                             │
│  "verb"       │  User-defined relation       │  @VERB BEGIN..   │
│  "relation"   │  Hardcoded primitive         │  System          │
│  "concept"    │  Abstract category           │  @concept_name   │
│  "fact"       │  Instance/concrete           │  @Fact_name      │
│  "constant"   │  Numeric value               │  NUMERIC_VALUE   │
│                                                                 │
│  COMPOSITE KINDS (results of complex operations):               │
│  "composite"  │  Generic combination         │  AND, OR, etc.   │
│  "proof"      │  Demonstration chain         │  PROVE verb      │
│  "summary"    │  Aggregated information      │  SUMMARIZE verb  │
│  "research"   │  Exploration findings        │  EXPLORE verb    │
│  "list"       │  Collection of points        │  FACTS, INSTANCES│
│                                                                 │
│  SPECIAL KINDS:                                                 │
│  "control"    │  Execution parameter         │  CONTROLS        │
│  "any"        │  Wildcard matcher            │  Predefined      │
│  "temp"       │  Temporary (not stored)      │  @_              │
│  "conflict"   │  Contradiction detected      │  Auto-validation │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Composite Kinds in Detail

**Proof Points** contain:
- `proof_of`: The statement being proven
- `steps`: Ordered list of proof step points
- `links`: Relations connecting steps (PROOF_STEP, DERIVES, CONCLUDES)
- `validity`: Overall proof validity

**Summary Points** contain:
- `summarizes`: List of points being summarized
- `count`: Number of items
- `aggregation_type`: "count", "list", "statistical", "semantic"

**Research Points** contain:
- `explores`: The domain/question being explored
- `findings`: Discovered points
- `paths_tried`: Reasoning paths attempted
- `confidence`: Overall confidence in findings

**List Points** contain:
- `items`: Array of point references
- `query`: The original query that produced this list
- `complete`: Whether the list is exhaustive

---

## Fundamental Semantic Principle

### There Is NO Distinction Between Query and Assertion

**CRITICAL**: In Sys2DSL v3.0, there is NO semantic difference between "querying" and "asserting". Every statement:

1. **Creates or modifies points** in conceptual space
2. **Returns a point** as result (which can be used by other statements)
3. **May trigger geometric reasoning** based on the verb's definition

```sys2dsl
@r Dog IS_A animal      # Creates/finds points, returns result point
@_ Dog IS_A animal      # Same operation, @_ means "don't bind result to variable"
```

The only difference is whether you bind the result to a variable (`@r`) or discard it (`@_`).

### Every Operation Returns a Point

**MANDATORY**: Every verb execution MUST return a point. The returned point can be:

| Result Kind | Description | Example |
|-------------|-------------|---------|
| `"fact"` | A concrete fact | `Dog IS_A animal` → fact point |
| `"concept"` | An abstract category | `@c animal GENERALIZE any` → concept point |
| `"verb"` | A relation definition | `@V BEGIN...END` → verb point |
| `"composite"` | Combined result | `$a AND $b` → composite point |
| `"proof"` | Demonstration chain | `X PROVE Y` → proof point |
| `"summary"` | Aggregated information | `X SUMMARIZE any` → summary point |
| `"research"` | Exploration result | `X EXPLORE domain` → research point |

### Composite Points: Proofs, Summaries, Research

Complex operations create **composite points** that link related points together:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPOSITE POINT STRUCTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Proof Point (kind: "proof"):                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  proof_of: "Socrates IS_A mortal"                       │    │
│  │  steps: [                                               │    │
│  │    step1 ←──── "Socrates IS_A human"                    │    │
│  │    step2 ←──── "human IS_A mortal"                      │    │
│  │    conclusion ←── "Socrates IS_A mortal"                │    │
│  │  ]                                                      │    │
│  │  links: [PROOF_STEP, PROOF_STEP, CONCLUDES]             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Summary Point (kind: "summary"):                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  summarizes: [point1, point2, point3, ...]              │    │
│  │  links: [SUMMARIZED_FROM, SUMMARIZED_FROM, ...]         │    │
│  │  aggregation: "count" | "list" | "digest"               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Research Point (kind: "research"):                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  explores: domain_point                                 │    │
│  │  findings: [finding1, finding2, ...]                    │    │
│  │  links: [DISCOVERED, DISCOVERED, ...]                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

These composite points ARE regular points in the conceptual space - they can be queried, combined, and reasoned about like any other point.

### The Role of `any`

The `any` wildcard indicates **enumeration/search**, but the result is still a point:

```sys2dsl
@animals any IS_A animal    # Search for all X where X IS_A animal
                            # Returns: composite point containing all matches
```

`any` doesn't make it a "query" - it makes the verb enumerate over the space.

---

## Automatic Contradiction Detection (MANDATORY)

### Cognitive Dissonance Detection

**CRITICAL REQUIREMENT**: Every operation that creates or modifies points MUST automatically check for contradictions and impossibilities using geometric reasoning.

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTOMATIC VALIDATION PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  On EVERY point creation/modification:                          │
│                                                                 │
│  1. GEOMETRIC DISTANCE CHECK                                    │
│     - Is the new point impossibly far from related points?      │
│     - Does it violate dimensional constraints?                  │
│                                                                 │
│  2. DISJOINTNESS CHECK                                          │
│     - Does X IS_A A conflict with existing X IS_A B             │
│       where A DISJOINT_WITH B?                                  │
│                                                                 │
│  3. FUNCTIONAL CONSTRAINT CHECK                                 │
│     - Does setting X.property = V conflict with existing        │
│       X.property = W where V ≠ W (for functional properties)?   │
│                                                                 │
│  4. CARDINALITY CHECK                                           │
│     - Does adding relation violate cardinality limits?          │
│                                                                 │
│  5. DIMENSIONAL COHERENCE CHECK                                 │
│     - Are dimension values within valid ranges?                 │
│     - Do correlated dimensions remain consistent?               │
│                                                                 │
│  Result:                                                        │
│  - If valid: proceed with operation                             │
│  - If contradiction: return point with CONFLICT status          │
│  - If impossible: return point with IMPOSSIBLE status           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Contradiction Response

When a contradiction is detected:

```sys2dsl
@r Dog IS_A mammal           # OK, existence = +127
@r Dog IS_A reptile          # CONFLICT detected!
                             # Returns: {
                             #   kind: "fact",
                             #   existence: NaN,  (CONFLICT)
                             #   conflict_with: ["Dog IS_A mammal"],
                             #   reason: "mammal DISJOINT_WITH reptile"
                             # }
```

The system does NOT blindly accept assertions. It performs geometric reasoning to detect cognitive dissonance.

### Soft vs Hard Contradictions

| Type | Detection | Response |
|------|-----------|----------|
| **Hard** | Logical impossibility (DISJOINT violation) | Return CONFLICT, do not store |
| **Soft** | Geometric implausibility (too far in space) | Return WARNING, store with low confidence |
| **Override** | Explicit override requested | Store with metadata about conflict |

---

## Truth as Dimension Values

Truth is not a separate data type - it's the value along the **existence dimension**:

```
┌─────────────────────────────────────────────────────────────────┐
│                 TRUTH AS DIMENSION VALUE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Numeric Value  │  Semantic Label    │  Interpretation          │
│  ───────────────│────────────────────│─────────────────────     │
│     +127        │  TRUE_CERTAIN      │  Proven/asserted fact    │
│     +64 to +126 │  TRUE_DEFAULT      │  True by default         │
│     +1 to +63   │  PLAUSIBLE         │  Likely but uncertain    │
│       0         │  UNKNOWN           │  No evidence             │
│     -1 to -63   │  IMPLAUSIBLE       │  Unlikely but uncertain  │
│     -64 to -126 │  FALSE_DEFAULT     │  False by default        │
│     -127        │  FALSE_CERTAIN     │  Proven false            │
│                                                                 │
│  Special:       │                    │                          │
│     NaN         │  CONFLICT          │  Contradictory evidence  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Geometric Primitives

These are the only hardcoded relations. Everything else is defined in base theory using these:

### Core Primitives

| Primitive | Operation |
|-----------|-----------|
| `NUMERIC_VALUE` | Create constant point with value |
| `READ_DIM` | Read dimension value from point |
| `PROJECT_DIM` | Set dimension value on point |
| `ZERO_DIMS` | Zero specified dimensions |

### Point Operations

| Primitive | Operation |
|-----------|-----------|
| `ATTRACT` | Move point toward another |
| `EXTEND` | Expand diamond boundary |
| `NEW_COMPOSITE` | Create composite from two points |
| `KIND` | Set or read point kind |

### Reasoning Primitives

| Primitive | Operation |
|-----------|-----------|
| `INDUCT` | Geometric induction (generalize from examples) |
| `DEDUCT` | Geometric deduction (project to parent) |
| `ABDUCT_PRIM` | Geometric abduction (reverse inference) |
| `ANALOGIZE_PRIM` | Vector transfer between domains |
| `PERMUTE` | Apply relation permutation |

### Numeric Operations

| Primitive | Operation |
|-----------|-----------|
| `PLUS`, `MINUS` | Addition, subtraction |
| `MULTIPLY`, `DIVIDE` | Multiplication, division |
| `MIN`, `MAX` | Minimum, maximum |
| `EQUALS`, `GREATER_THAN`, `LESS_THAN` | Comparisons |

---

## Verb Definitions

Verbs are defined using BEGIN/END blocks with implicit variables:

```sys2dsl
@GRANDPARENT_OF BEGIN
  @p1 subject PARENT_OF freevar1;
  @p2 freevar1 PARENT_OF object;
  @return subject HAS_RELATION grandparent;
END
```

### Implicit Variables

| Variable | Meaning |
|----------|---------|
| `subject` | First argument when verb is invoked |
| `object` | Second argument when verb is invoked |
| `freevar1`, `freevar2`, ... | Intermediate variables for binding |

### Return Convention

`@return` marks which statement's result is returned:

```sys2dsl
@MY_VERB BEGIN
  @step1 subject PROCESS freevar1;
  @step2 freevar1 FINALIZE object;
  @return $step2 CONFIRM any;      # This result is returned
END
```

If no `@return` exists, the topologically last statement is returned.

---

## Wildcard Semantics: The `any` Concept

Instead of `*` or `?` wildcards, Sys2DSL uses the `any` concept:

```sys2dsl
@all_facts any RELATES any         # All facts
@dog_facts Dog FACTS any           # All facts about Dog
@animals any IS_A animal           # All instances of animal
```

**`any` is a real point** in conceptual space. It matches anything because its diamond spans all dimensions with maximum radius.

---

## Negation Semantics

Negation is NOT syntactic (no `NOT` prefix). It's **dimensional**:

```sys2dsl
# Positive assertion (existence = +127)
@_ Dog IS_A animal

# Negative assertion (existence = -127)
@_ Dog ISNT_A reptile
```

Where `ISNT_A` is defined as:

```sys2dsl
@ISNT_A BEGIN
  @neg negative ONTO_EXISTENCE subject;
  @return subject IS_A object;
END
```

This sets the existence dimension to negative, making the fact "not exist."

---

## Control Points

Reasoning behavior is controlled via control points:

```sys2dsl
@depth NUMERIC_VALUE 5
@_ $depth CONTROLS reasoning_depth

@limit NUMERIC_VALUE 10
@_ $limit CONTROLS backtrack_limit
```

Available control points:
- `reasoning_depth` - Maximum inference chain depth
- `backtrack_limit` - Maximum backtracking attempts
- `timeout_ms` - Maximum reasoning time
- `confidence_threshold` - Minimum confidence for conclusions

---

## Theory Layers

Theories are conceptual space layers that can be pushed/popped:

```sys2dsl
@_ hypothetical PUSH any           # Push new layer
@_ Unicorn IS_A animal             # Assert in layer
@r Unicorn QUERY animal            # Query in layer
@_ any POP any                     # Pop layer, discard changes
```

Semantics:
- `PUSH` creates a copy-on-write overlay
- Changes only affect the top layer
- `POP` discards the layer (or `COMMIT` merges it down)
- Queries search top-down through layers

---

## Constraint Negotiation

Comparative relations trigger constraint solving:

```sys2dsl
@_ Virus LESS_ALIVE Bacteria
```

The system:
1. Identifies the `alive` dimension
2. Reads current values for Virus and Bacteria
3. Adjusts to satisfy `Virus.alive < Bacteria.alive`
4. May adjust both points to minimize total movement

---

## Execution Model

### Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PARSE                                                       │
│     - Tokenize input                                            │
│     - Build statement list                                      │
│     - Determine variable declarations (@ prefix)                │
│     - Identify kind from naming convention                      │
│                                                                 │
│  2. ANALYZE                                                     │
│     - Build dependency graph from $ references                  │
│     - Detect circular dependencies → ERROR                      │
│     - Topological sort                                          │
│                                                                 │
│  3. EXECUTE                                                     │
│     - Process in topological order                              │
│     - For each statement:                                       │
│       a. Resolve subject point                                  │
│       b. Resolve verb point                                     │
│       c. Resolve object point                                   │
│       d. Execute verb (geometric operation)                     │
│       e. Store result in environment                            │
│                                                                 │
│  4. RETURN                                                      │
│     - Return final environment with all variable values         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Resolution

Dependencies are explicit via `$variable` references:

```sys2dsl
@step3 $step2 PROCESS $step1       # Depends on step1, step2
@step1 input1 TRANSFORM any        # No dependencies
@step2 input2 TRANSFORM any        # No dependencies
```

Execution order: step1 ∥ step2, then step3

### Circular Dependencies

Circular dependencies are an error:

```sys2dsl
@a $b TRANSFORM any                # ERROR
@b $a TRANSFORM any                # Circular: a→b→a
```

---

## Versioning and Forgetting

Points have versions for controlled forgetting:

```
Point {
  id: "Dog_v3"
  version: 3
  center: [...current position...]
}

Index {
  "Dog" → "Dog_v3"    # Current version
  # Old versions still exist: Dog_v1, Dog_v2
}
```

When forgetting:
1. Decrease version count
2. Update index to point to older version
3. Old versions remain for potential recovery

---

## Error Handling

### Syntax Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| `CIRCULAR_DEPENDENCY` | $a uses $b, $b uses $a | Restructure script |
| `UNKNOWN_VERB` | Verb not in base theory | Define verb or check spelling |
| `KIND_MISMATCH` | Wrong naming convention | Use correct case pattern |
| `UNCLOSED_BLOCK` | BEGIN without END | Add END |
| `INVALID_TRIPLE` | Not Subject VERB Object | Fix statement structure |
| `UNDEFINED_VARIABLE` | $var not declared | Declare with @var first |

### Semantic Errors (Automatic Contradiction Detection)

| Error | Cause | Response |
|-------|-------|----------|
| `CONFLICT_DISJOINT` | X IS_A A when X IS_A B and A DISJOINT_WITH B | Return conflict point, do NOT store |
| `CONFLICT_FUNCTIONAL` | X.prop = V when X.prop = W already exists | Return conflict point |
| `CONFLICT_CARDINALITY` | Adding relation exceeds cardinality limit | Return conflict point |
| `IMPOSSIBLE_GEOMETRIC` | Point would be impossibly far in space | Return impossible point |
| `WARNING_IMPLAUSIBLE` | Point is geometrically implausible | Store with low confidence, return warning |

### Conflict Point Structure

When a conflict is detected, the returned point contains diagnostic information:

```json
{
  "kind": "conflict",
  "attempted": "Dog IS_A reptile",
  "existence": NaN,
  "conflicts_with": [
    {"fact": "Dog IS_A mammal", "reason": "mammal DISJOINT_WITH reptile"}
  ],
  "resolution_options": [
    "retract 'Dog IS_A mammal'",
    "retract 'mammal DISJOINT_WITH reptile'",
    "use OVERRIDE to force"
  ]
}
```

---

## Implementation References

| Component | Source |
|-----------|--------|
| Parser | `src/theory/dsl_parser.js` |
| Engine | `src/theory/dsl_engine.js` |
| Verb Executor | `src/theory/verb_executor.js` |
| Conceptual Space | `src/core/conceptual_space.js` |
| Point Store | `src/core/ConceptStore.js` |
| Base Theories | `data/theories/base/*.sys2dsl` |

---

## See Also

- [Sys2DSL-grammar.md](./Sys2DSL-grammar.md) - Syntax specification
- [Sys2DSL_arch.md](./theory/Sys2DSL_arch.md) - Architecture details
- [conceptual_space.md](./core/conceptual_space.md) - Vector space model
- [base/logic.sys2dsl](../init/theories/base/logic.sys2dsl) - Boolean logic verbs
