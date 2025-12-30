# AGISystem2 - System Specifications

# Chapter 2: The Sys2DSL Language Specification

**Document Version:** 5.0  
**Author:** Sînică Alboaie  
**Status:** Draft Specification

---

## 2.1 Core Principle: Everything Is a Vector

In Sys2DSL, **everything** is a semantic vector:
- Atoms (John, Red)
- Operators (sell, give)
- Facts (@fact1)
- Roles (Agent, Theme)
- Theories (Economics, Physics)
- Even operations like Load, Export

**Position in statement determines syntactic role:**

```
@destination Operator arg1 arg2 arg3 ...
```

| Position | Role | What Happens |
|----------|------|--------------|
| 1 | Destination | New variable declared with `@` |
| 2 | Operator | Vector bound into result |
| 3+ | Arguments | Position-tagged and bound |

**The binding formula:**
```
destination = Operator ⊕ (Pos1 ⊕ arg1) ⊕ (Pos2 ⊕ arg2) ⊕ (Pos3 ⊕ arg3) ⊕ ...
```

Each argument is bound with its **position vector** (Pos1, Pos2, etc.) before being XORed into the result. This encodes argument order without using permutation operations.

> **Important:** We do NOT use permutation (bit rotation) because it breaks vector extension. See Chapter 1.2.3 for details. Position vectors are quasi-orthogonal markers that achieve the same goal safely.

> ### ⚠️ CRITICAL LIMITATION: Commutativity of Bind
>
> **The resulting vector is invariant to the order in which position-tagged pairs are XORed:**
>
> ```
> (Pos1 ⊕ A) ⊕ (Pos2 ⊕ B) = (Pos2 ⊕ B) ⊕ (Pos1 ⊕ A)
> ```
>
> **This means:**
> - Position vectors (`Pos1`, `Pos2`, etc.) act as **unique tags**, not sequence encoders
> - The vector encodes WHAT is at WHICH position, but not the inherent order
> - **Encoding is unambiguous:** `loves(John, Mary)` ≠ `loves(Mary, John)` because `Pos1⊕John ≠ Pos1⊕Mary`
> - **Decoding requires context:** The Phrasing Engine (DS11) uses semantic role templates to determine presentation order
>
> **Practical effect:** The binding algebra is sound for encoding and reasoning. For human-readable output, the Phrasing Engine imposes logical order based on semantic roles defined in templates (e.g., `{Pos1:Subject}`, `{Pos2:Object}`).

---

## 2.2 Tokens

| Token | Syntax | Purpose |
|-------|--------|---------|
| `@var` | Declaration | Create **temporary** variable (scope only, NOT KB) |
| `@var:name` | Declaration + KB | Create variable AND add to KB as `name` |
| `@:name` | KB only | Add to KB as `name` without local variable |
| `@_` | Discard | Result not needed |
| `$var` | Reference | Access any binding in scope |
| `?var` | Hole | Unknown to solve |
| `name` | Literal | Vector from loaded theory |
| `#` | Comment | Ignored until EOL |
| (no prefix) | Anonymous | Add directly to KB |

**Persistence Rules:**

| Form | In Scope | In KB | Use Case |
|------|----------|-------|----------|
| `operator arg1 arg2` | No | Yes | Simple facts |
| `@var:name operator arg1 arg2` | Yes | Yes | Named facts |
| `@:name operator arg1 arg2` | No | Yes | Named facts (no local ref needed) |
| `@var operator arg1 arg2` | Yes | **No** | Temporary (for references) |

**Example - Building a Negation:**
```dsl
love John Mary              # → KB (anonymous)
@neg love John Alice        # → scope only (NOT in KB!)
@f1:notJohnAlice Not $neg   # → KB (the negation)
```

This ensures `prove love John Alice` returns **false** - the positive fact never entered KB.

**The `@_` convention:** For operations where we don't need the result (like Load), use `@_` as destination.

> ### Parenthesized Compound Expressions
>
> Sys2DSL supports parenthesized expressions for nested graph calls:
> ```
> # Inline nested graph call:
> @causal __Role Causes (__Pair $cause $effect)
> ```
>
> **Syntax:** `(operator arg1 arg2 ...)`
>
> This creates a **Compound** expression that:
> 1. Evaluates the nested graph call first
> 2. Passes the result as an argument to the outer expression
>
> **Use cases:**
> - Nested graph invocations in Core theories
> - Building complex structures inline
>
> **Alternative - reference-based composition** (still recommended for complex logic):
> ```
> @c1 hasState Door Open
> @c2 isA Door Entrance
> @cond And $c1 $c2
> @concl canEnter Person
> @rule Implies $cond $concl
> ```
>
> The reference-based approach is preferred when sub-expressions need names for inspection, debugging, or when the logic is complex. Inline parentheses are best for simple structural patterns in Core theories.

---

## 2.3 Abstraction Levels and Naming Convention

| Level | Prefix | Purpose | Who Uses |
|-------|--------|---------|----------|
| **L0** | `___` | HDC primitives | Runtime only |
| **L1** | `__` | Structural ops | Core theory |
| **L2** | `_` | Semantic primitives | Knowledge engineers |
| **L3+** | (none) | Domain concepts | End users |

**Rules:**
- `___name`: Never use directly (runtime internal)
- `__name`: Use only when building L2
- `_name`: Use when building domain verbs
- `name`: Normal user-level

---

## 2.4 The Core Theory

`Core` is **always loaded** and **cannot be unloaded**. It defines:

| Level | Definitions |
|-------|-------------|
| L0 (`___`) | `___Bind`, `___Bundle`, `___Similarity`, `___NewVector`, `___MostSimilar`, `___Extend` |
| L1 (`__`) | `__Atom`, `__Role`, `__Pair`, `__Event`, `__Bundle` |
| L2 (`_`) | `_ptrans`, `_atrans`, `_mtrans`, `_propel`, `_grasp`, `_ingest`, `_expel`, `_mbuild`, `_attend`, `_speak` |
| Position | `Pos1`, `Pos2`, `Pos3`, ... `Pos20` |
| Roles | `Agent`, `Theme`, `Source`, `Goal`, `Recipient`, `Content`, `Instrument` |
| Meta | `Load`, `Unload`, `Export`, `Import` |

**Core also defines theory management verbs** — they're just vectors like anything else.

---

## 2.5 Statement Execution

**Case 1: Operator has no graph** → Direct binding
```
@fact Tall John
# fact = Tall ⊕ (Pos1 ⊕ John)
```

**Case 2: Operator has graph** → Execute then bind
```
@tx sell Alice Bob Car 100
# 1. Execute sell graph → result
# 2. tx = sell ⊕ result
```

**Case 3: Multiple arguments** → Each tagged with position
```
@rel Loves John Mary
# rel = Loves ⊕ (Pos1 ⊕ John) ⊕ (Pos2 ⊕ Mary)

# Note: Loves(John, Mary) ≠ Loves(Mary, John)
# because Pos1 ⊕ John ≠ Pos1 ⊕ Mary
```

---

## 2.6 Graph Definition

```
@GraphName:export graph param1 param2
    @step1 Operation $param1
    @step2 Operation $step1 $param2
    return $step2
end
```

**Shorthand for KB-only export** (no local variable needed):
```
@:Pythagorean_Theorem graph triangle
    @premise isRightTriangle $triangle
    @a leg1 $triangle
    @b leg2 $triangle
    @c hypotenuse $triangle
    @sum add (square $a) (square $b)
    @conclusion equals $sum (square $c)
    @theorem Implies $premise $conclusion
    return $theorem
end
```

**`return`** specifies output. Without it, graph produces nothing.

**Holes in graphs** enable pattern matching:
```
@FindKiller graph victim
    @result kill ?murderer $victim
    return $result
end
```

---

## 2.7 Theory Definition

A theory creates **two things**:
1. A **vector** (semantic identity of the theory)
2. A **namespace** (atoms and graphs)

**Primary Syntax:** `@Name theory <geometry> <init> ... end`

```
@Economics theory 32768 deterministic
    @Money __Atom
    @Bank __Atom

    @SellGraph:sell graph seller buyer item price
        @t1 _atrans $seller $item $seller $buyer
        @t2 _atrans $buyer $price $buyer $seller
        @both __Bundle $t1 $t2
        return $both
    end
end
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `<geometry>` | 1024, 2048, 8192, 32768, 65536 | Vector dimension (must be divisible by 32) |
| `<init>` | `deterministic`, `random` | How to initialize the theory vector |

**Alternative Syntaxes (use session's default geometry):**

Brace form (recommended for quick prototyping):
```
theory Economics {
    @Money __Atom
    @Bank __Atom
}
```

Begin/end form:
```
theory Physics begin
    @Energy __Atom
    @Mass __Atom
end
```

Legacy bracket form (deprecated):
```
theory Math [
    @Number __Atom
]
```

> All alternative forms use the session's default geometry (configurable via `SYS2_GEOMETRY` environment variable) and deterministic initialization.

**The theory vector `$Economics`** can be used like any other:
```
@similar ___Similarity $Economics $Physics
@meta Describes $Economics Money
@all __Bundle $Economics $Physics $Law
```

---

## 2.8 Theory Management as Verbs

Since Load, Unload, Export, Import are vectors in Core, they follow standard syntax:

| Operation | Syntax | What It Does |
|-----------|--------|--------------|
| Load | `@_ Load $Theory` | Activate namespace |
| Unload | `@_ Unload $Theory` | Deactivate namespace |
| Export | `@_ Export $var` | Save to active theory |
| Import | `@v Import $Theory name` | Load specific atom |
| Set | `@_ Set CWA on|off` | Toggle session flags |

**Examples:**
```
# Load a theory (discard result with @_)
@_ Load $Economics

# Unload
@_ Unload $Economics

# Export variable to current theory
@_ Export $myFact

# Toggle Closed World Assumption (negation-as-failure) at runtime
@_ Set CWA on

# Import specific atom
@bankVec Import $Finance Bank
```

**Dynamic loading in graph:**
```
@ReasonAboutMoney graph topic
    @_ Load $Economics      # Load relevant theory
    @result Query $topic
    @_ Unload $Economics    # Cleanup
    return $result
end
```

---

## 2.9 Operations on Theories

Since theories are vectors:

| Operation | Example | Purpose |
|-----------|---------|---------|
| Similarity | `@s ___Similarity $Economics $Physics` | How related? |
| Bundle | `@all __Bundle $Econ $Law $Med` | Superposition |
| Meta-facts | `@f Covers $Economics Money` | Facts about theories |
| Query | `@t FindTheory $topic` | Which theory fits? |
| Role | `@r __Role Domain $Economics` | Theory as filler |

**Find relevant theory dynamically:**
```
@FindTheory graph topic
    @theories __Bundle $Economics $Physics $Law $Medicine
    @best ___MostSimilar $topic $theories
    return $best
end

@relevantTheory FindTheory Money
@_ Load $relevantTheory
```

---

## 2.10 Complete Example

```
# Define a theory (creates vector + namespace)
@Commerce theory 32768 deterministic

    @Money __Atom
    @Price __Atom
    @Goods __Atom
    
    @SellGraph:sell graph seller buyer item price
        @t1 _atrans $seller $item $seller $buyer
        @t2 _atrans $buyer $price $buyer $seller
        @both __Bundle $t1 $t2
        return $both
    end
    
    @BuyGraph:buy graph buyer item seller price
        @t1 _atrans $buyer $item $seller $buyer
        @t2 _atrans $buyer $price $buyer $seller
        @both __Bundle $t1 $t2
        return $both
    end
    
end

# Usage
@_ Load $Commerce

@tx1 sell Alice Bob Car 1000
@tx2 buy Charlie Book David 50

# Query
@q buy ?who Book ?seller ?price

# Meta - what theories are similar to Commerce?
@related ___Similarity $Commerce $Economics

# Cleanup (optional)
@_ Unload $Commerce
```

---

## 2.11 Grammar (EBNF)

```ebnf
program      = { statement | graph_def | theory_block } ;

destination  = "_" | ident [ ":" , ident ] | ":" , ident ;  (* @_, @var, @var:name, @:name *)
statement    = "@" , destination , operation , { argument } , [ "#" , text ] , NL ;
operation    = ident | "$" , ident ;
argument     = "$" , ident | "?" , ident | ident | number | list | compound ;

list         = "[" , { argument } , "]" ;
compound     = "(" , ident , { argument } , ")" ;   (* nested graph call *)

graph_def    = "@" , ( ident [ ":" , ident ] | ":" , ident ) , "graph" , { ident } , NL ,
               { statement } ,
               "return" , "$" , ident , NL ,
               "end" , NL ;

(* Primary theory syntax - explicit geometry and init type *)
theory_primary = "@" , ident , "theory" , number , init_type , NL ,
                 { statement | graph_def } ,
                 "end" , NL ;

(* Alternative theory syntaxes - use session default geometry *)
theory_brace   = "theory" , ident , "{" , NL ,
                 { statement | graph_def } ,
                 "}" , NL ;

theory_begin   = "theory" , ident , "begin" , NL ,
                 { statement | graph_def } ,
                 "end" , NL ;

theory_bracket = "theory" , ident , "[" , NL ,        (* deprecated *)
                 { statement | graph_def } ,
                 "]" , NL ;

theory_block   = theory_primary | theory_brace | theory_begin | theory_bracket ;

init_type    = "random" | "deterministic" ;

ident        = ( letter | "_" ) , { letter | digit | "_" } ;
number       = digit , { digit } ;
```

---

## 2.12 How Binding Works (Detailed)

This section clarifies the exact binding process for implementers.

### 2.12.1 Simple Statement

```
@fact Tall John
```

**Execution:**
1. Resolve `Tall` → vector from theory/vocabulary
2. Resolve `John` → vector from theory/vocabulary
3. Compute: `fact = Tall ⊕ (Pos1 ⊕ John)`

### 2.12.2 Multi-Argument Statement

```
@rel give Alice Book Bob
```

**Execution:**
1. Resolve `give`, `Alice`, `Book`, `Bob` → vectors
2. Compute: `rel = give ⊕ (Pos1 ⊕ Alice) ⊕ (Pos2 ⊕ Book) ⊕ (Pos3 ⊕ Bob)`

### 2.12.3 Statement with Graph

```
@tx sell Alice Bob Car 100
```

**Execution:**
1. Resolve `sell` → has graph `SellGraph`
2. Execute graph with args (Alice, Bob, Car, 100) → `graphResult`
3. Compute: `tx = sell ⊕ graphResult`

Note: The graph internally uses position vectors for its own structure.

### 2.12.4 Query with Holes

```
@answer sell ?who Bob Car ?price
```

**Execution:**
1. Build partial (skip holes):
   ```
   partial = sell ⊕ (Pos2 ⊕ Bob) ⊕ (Pos3 ⊕ Car)
   ```
2. Unbind from KB: `candidate = KB ⊕ partial`
3. For each hole:
   - `?who` at position 1: `who_raw = candidate ⊕ Pos1`
   - `?price` at position 4: `price_raw = candidate ⊕ Pos4`
4. Find nearest matches in vocabulary for each raw result

---

## 2.13 FindAll and CSP Queries

In addition to similarity-based queries that return the best match, Sys2DSL supports enumeration queries that return ALL matches.

### 2.13.1 FindAll Pattern

The `findAll` pattern returns every match, not just the best:

```
# Standard query - returns best match
@answer sell ?seller Bob ?price
# Result: { seller: 'Alice', price: '100' } (best match)

# FindAll - returns ALL matches
@all findAll seatedAt ?person Table1
# Result: [{ person: 'Alice' }, { person: 'Bob' }, { person: 'Carol' }]
```

**Use cases:**
- Enumerate all entities of a type
- Find all relationships for a subject
- Collect all instances before aggregation

### 2.13.2 Type Enumeration

Find all entities of a specific type:

```
# In KB:
isA Alice Guest
isA Bob Guest
isA Carol Guest

# Query
@guests findAllOfType Guest
# Result: ['Alice', 'Bob', 'Carol']
```

### 2.13.3 Constraint Satisfaction (CSP)

For combinatorial problems requiring ALL valid solutions, use the CSP solver:

**Wedding Seating Example:**
```
# Define guests and tables
isA Alice Guest
isA Bob Guest
isA Table1 Table
isA Table2 Table

# Define conflicts
conflictsWith Alice Bob
conflictsWith Bob Alice

# Solve (via API)
@solutions solveWeddingSeating
# Result: [
#   { Alice: 'Table1', Bob: 'Table2' },
#   { Alice: 'Table2', Bob: 'Table1' }
# ]
```

**Generic CSP (Planned DSL Syntax):**
```
@solutions solve WeddingSeating
  domain ?guest from Guest
  domain ?table from Table
  constraint Not sameTable ?g1 ?g2 when conflictsWith ?g1 ?g2
end
```

**Note:** Currently CSP is accessed via the JavaScript API (`session.solveWeddingSeating()`, `session.solveCSP()`). See DS16 for full CSP documentation.

### 2.13.4 Comparison: Query vs FindAll vs CSP

| Method | Returns | Use Case |
|--------|---------|----------|
| `query` | Best match | "Who loves Mary?" |
| `findAll` | All matches | "List everyone at Table1" |
| `solveCSP` | All valid assignments | "Find all valid seating arrangements" |

---

## 2.14 Summary

| Concept | Description |
|---------|-------------|
| Everything is vector | Atoms, operators, facts, theories, Load/Export — all vectors |
| Position vectors | Pos1, Pos2, ... encode argument order (NOT permutation) |
| Binding formula | `Op ⊕ (Pos1 ⊕ A1) ⊕ (Pos2 ⊕ A2) ⊕ ...` |
| `@_` | Discard destination for side-effect operations |
| Theory creates | Vector (identity) + Namespace (content) |
| Load/Unload/Export/Import | Normal verbs defined in Core |
| Underscore convention | `___`=L0, `__`=L1, `_`=L2, none=L3+ |
| Core | Auto-loaded, defines all infrastructure including Pos1..Pos20 |
| Graphs | Define argument processing, can contain holes |

**Uniform syntax:** There are no special commands. Everything follows `@dest Op args`.

**No permutation:** Position encoding uses dedicated position vectors (Pos1, Pos2, ...), not bit rotation. This ensures compatibility with vector extension.

---

*End of Chapter 2*
