# AGISystem2 - System Specifications

# Chapter 4: Architecture and API

**Document Version:** 2.0
**Status:** Implemented

> **Note:** This document describes the architecture and API. The actual implementation supports dual reasoning modes (HDC-Priority and Symbolic-Priority) based on HDC strategy. See DS01 Section 1.10 for details.

---

## 4.1 System Overview

AGISystem2 exposes a simple API through `Session`:

```
Session
  ├── LEARNING
  │   ├── learn(dsl: string) → LearnResult
  │   └── loadCore(options?) → LoadResult
  │
  ├── QUERYING
  │   ├── query(dsl: string) → QueryResult
  │   └── prove(dsl: string) → ProveResult
  │
  ├── REASONING (advanced)
  │   ├── abduce(dsl: string) → AbductionResult
  │   └── findAll(dsl: string) → FindAllResult
  │
  ├── OUTPUT
  │   ├── generateText(operator, args) → string
  │   ├── elaborate(proof) → { text: string, ... }
  │   └── describeResult(payload) → string
  │
  ├── INSPECTION
  │   ├── dump() → object
  │   ├── similarity(a, b) → number
  │   ├── decode(vector) → object
  │   └── summarize(vector) → { success, text, structure? }
  │
  └── LIFECYCLE
      └── close() → void
```

---

## 4.2 Core Methods Summary

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `learn` | DSL statements | LearnResult | Add facts, define graphs |
| `query` | DSL with holes | QueryResult | Find answers |
| `prove` | DSL without holes | ProveResult | Verify truth + proof steps |
| `summarize` | Vector | `{success,text,...}` | Concise decode (best-effort) |
| `elaborate` | ProveResult | `{text,...}` | Proof narration (best-effort) |
| `generateText` | operator, args | string | DSL → natural language |
| `describeResult` | payload | string | Reasoning result → NL |
| **`dump`** | — | object | Session state snapshot |
| **`similarity`** | a, b | number | Compare two vectors |
| **`decode`** | vector | DecodedStructure | Extract structure |

---

## 4.2.1 HDC Layer Architecture

The system uses a **strategy pattern** for HDC operations, allowing pluggable implementations:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Application (DSL, Session API)                    │
│  ─────────────────────────────────────────────────────────  │
│  Layer 3: Reasoning (Query, Prove, Rules)                   │
│  ─────────────────────────────────────────────────────────  │
│  Layer 2: HDC Facade (bind, bundle, sim, createFromName)    │  ← CONTRACT
│  ═══════════════════════════════════════════════════════════│
│  Layer 1: HDC Strategy (Implementation)                     │  ← SWAPPABLE
│           ├── dense-binary (DEFAULT)                        │
│           └── [future strategies]                           │
└─────────────────────────────────────────────────────────────┘
```

### HDC Module Structure

```
src/hdc/
├── facade.mjs           # Single entry point for all HDC operations
├── contract.mjs         # Interface definitions (JSDoc), validation
└── strategies/
    ├── index.mjs        # Strategy registry
    ├── dense-binary.mjs      # Default: Uint32Array + XOR
    ├── sparse-polynomial.mjs # Sparse binding/bundling
    └── metric-affine.mjs     # Metric (L1) strategy
```

### Key HDC Operations (via Facade)

| Operation | Description | Used By |
|-----------|-------------|---------|
| `bind(a, b)` | XOR-based association | Executor, Query |
| `bundle(vectors)` | Majority-vote superposition | KB updates |
| `similarity(a, b)` | Hamming-based similarity [0,1] | Query, Prove |
| `createFromName(name, geo)` | Deterministic vector creation | ASCII stamp |
| `topKSimilar(query, vocab, k)` | Find best matches | Query engine |

### Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SYS2_HDC_STRATEGY` | `dense-binary` | Default HDC strategy for new `Session`s (session-local override via constructor) |
| `SYS2_GEOMETRY` | `32768` | Default geometry for new `Session`s (session-local override via constructor) |
| `SYS2_DEBUG` | `false` | Enable debug logging |
| `REASONING_PRIORITY` | `symbolicPriority` | Default reasoning priority for new `Session`s (session-local override via constructor) |
| `SYS2_PROFILE` | `theoryDriven` | Reasoning profile (only `theoryDriven` is supported) |
| `SYS2_CANONICAL` | `true` | Enable canonicalization (`1`/`true`/etc.) |
| `SYS2_PROOF_VALIDATE` | `true` | Enable proof validation (`1`/`true`/etc.) |

**Session isolation note:** HDC strategy and reasoning priority are session-local. Vectors carry a strategy identifier, and HDC operations reject mixed-strategy inputs.

---

## 4.3 Session Lifecycle

```javascript
import { Session } from 'agisystem2';

const session = new Session({
  hdcStrategy: 'dense-binary',
  geometry: 32768,
  reasoningPriority: 'symbolicPriority'
});

// Core is not auto-loaded. Call session.loadCore() to load:
// - Position vectors: Pos1..Pos20
// - Type constructors: __Person, __Object, __Place, etc.
// - L2 primitives: _ptrans, _atrans, _mtrans, etc.
// - Logic: Implies, And, Or, Not
// - Roles: Agent, Theme, Source, Goal, etc.

session.loadCore();

session.learn(`
    @_ Load $Commerce
    @tx1 sell Alice Bob Car 1000
    @tx2 buy Charlie Book David 50
`);

const result = session.query(`
    @answer buy ?who Book ?seller ?price
`);

// Debug: see what's loaded
console.log(session.dump());

session.close();
```

---

## 4.4 The learn() Method

`learn()` executes DSL statements that build knowledge. Holes are supported for rule/graph variables; avoid holes in plain fact learning.

**Valid learn() input:**
```
@_ Load $Economics
@John:John __Person
@Mary:Mary __Person
@fact1 sell $John $Mary Car 1000
@fact2 likes $Mary Pizza
```

**Note on holes in learn():**
```
@rule sell ?who $Mary Car 1000    # Variable-style learn used for rules/graphs
```

**Output:** `LearnResult`
```typescript
interface LearnResult {
    success: boolean;
    facts: number;
    errors: string[];
    warnings: string[];
    // Present for solve blocks (CSP).
    solveResult?: object;
}
```

**Contradiction handling:**
- Contradictions are rejected by default (configurable via `rejectContradictions`).
- Rejected learns are transactional: no new facts are stored in the KB.
- The NL proof is surfaced via `session.describeResult(...)` (e.g., `proof_nl` in eval suites).

**What learn() does:**
1. Parse DSL statements
2. Execute each statement:
   - Create vectors via ASCII stamping (deterministic)
   - Bind with position vectors: `Op ⊕ (Pos1 ⊕ A) ⊕ (Pos2 ⊕ B) ⊕ ...`
3. Store results in session working memory
4. Update knowledge base (bundle new facts)
5. Optionally export to theories

---

## 4.5 The query() Method

`query()` executes DSL with holes (`?var`) and returns solutions.

**Input:**
```
@answer buy ?who Book ?seller ?price
```

**Output:** `Result` structure
```typescript
interface Result {
    vector: Uint64Array;           // The answer vector
    bindings: Map<string, Binding>; // Solutions for each hole
    success: boolean;
}

interface Binding {
    name: string;           // Literal name (e.g., "Charlie")
    vector: Uint64Array;    // The vector
    similarity: number;     // Match confidence 0-1
}
```

**Query execution:**
1. Build partial: `buy ⊕ (Pos2 ⊕ Book)`
2. Unbind from KB: `candidate = KB ⊕ partial`
3. For each hole position, unbind position vector:
   - `?who = candidate ⊕ Pos1`
   - `?seller = candidate ⊕ Pos3`
   - `?price = candidate ⊕ Pos4`
4. Find nearest literals for each
5. Return best matches with confidence scores

**Example:**
```javascript
const result = session.query(`@answer buy ?who Book ?seller ?price`);

// result.bindings:
// ?who → {name: "Charlie", similarity: 0.94}
// ?seller → {name: "David", similarity: 0.91}
// ?price → {name: "50", similarity: 0.89}
```

---

## 4.6 The prove() Method

`prove()` returns the answer AND the **derivation chain**. The goal must be a complete fact (no holes).

**Output:** `Proof` structure
```typescript
interface Proof {
    result: Result;              // Same as query() result
    valid: boolean;              // Is statement provable?
    confidence: number;          // Overall confidence 0-1
    steps: ProofStep[];          // Derivation chain
}

interface ProofStep {
    operation: string;    // "bind", "unbind", "lookup", "similarity"
    inputs: any[];        // What went in
    output: any;          // What came out
    detail: string;       // Human-readable explanation
}
```

**Proof steps example:**

| Step | Operation | Detail |
|------|-----------|--------|
| 1 | lookup | Found 'buy' graph in Commerce theory |
| 2 | resolve | Resolved Charlie → vector |
| 3 | resolve | Resolved Book → vector |
| 4 | bind | Built query: buy ⊕ (Pos1⊕Charlie) ⊕ (Pos2⊕Book) ⊕ ... |
| 5 | similarity | Compared with KB, found match (0.97) |
| 6 | conclude | Statement VALID with confidence 0.97 |

---

## 4.7 Output Methods

### describeResult(payload) → string

Primary NL output path (used by Eval runners). It translates a reasoning payload into a string via `ResponseTranslator`.

### summarize(vector) → { success, text, structure? }

Best-effort decoding helper used for vector inspection.

### elaborate(proof) → { text, ... }

Best-effort proof narration helper for `prove()` results.

---

## 4.8 Debug / Inspection API (current)

The current runtime provides a small set of inspection helpers focused on debugging sessions and decoding vectors.

### dump() → object

Returns a lightweight snapshot of session state:
- `geometry`, `factCount`, `ruleCount`
- `vocabularySize`
- `scopeBindings`

### similarity(a, b) → number

Compares two vectors directly (or literals resolved to vectors).

### decode(vector) → object

Decodes a vector to a best-effort structural form (operator + positional args).

### summarize(vector) → { success, text, structure? }

Formats `decode(vector)` into a short natural-language string (best-effort).

---

## 4.9 Internal Architecture

```
Session
├── scope: Scope                     # @vars (non-persistent bindings)
├── kbFacts: Fact[]                  # persistent facts (vector + metadata)
├── vocabulary: Vocabulary           # atom ↔ vector mapping
├── graphs: Map<string, GraphDef>    # declared graphs/macros
├── rules: Rule[]                    # derived from Implies
├── reasoning engines                # query/prove/abduce/etc.
│
├── learn(dsl)
│   ├── parse(dsl) → AST
│   ├── for each statement:
│   │   ├── resolve literals from theoryStack
│   │   ├── create vectors via ASCII stamping
│   │   ├── bind: Op ⊕ (Pos1⊕A1) ⊕ (Pos2⊕A2) ⊕ ...
│   │   └── store in workingMemory
│   └── update knowledgeBase = Bundle(KB, newFacts)
│
├── query(dsl)
│   ├── parse(dsl) → AST with holes
│   ├── build partial (skip holes)
│   ├── candidate = KB ⊕ partial
│   ├── for each hole at position N:
│   │   └── answer = candidate ⊕ PosN
│   ├── find nearest in vocabulary
│   └── return Result with bindings
│
├── prove(dsl)
│   ├── startTrace()
│   ├── same as query() but record steps
│   ├── endTrace()
│   └── return Proof
│
├── dump()
│   └── return lightweight state snapshot
│
└── decode(vector)
    ├── try unbind each known operator
    ├── for best match, extract arguments
    └── return DecodedStructure
```

---

## 4.10 Knowledge Base Management

The session maintains a **knowledge base** — a bundled vector of all learned facts.

```javascript
// Internally
knowledgeBase = Bundle(fact1, fact2, fact3, ...)
```

**Operations:**

| Operation | What Happens |
|-----------|--------------|
| learn fact | KB = Bundle(KB, fact) |
| query | candidate = KB ⊕ partial |
| forget | KB = KB - fact (approximate via negative bundle) |

**Capacity monitoring (current):** use `session.dump()` fields like `factCount` and `vocabularySize`.

---

## 4.11 Debug Example (current)

```javascript
import { Session } from 'agisystem2';

const session = new Session({
  hdcStrategy: 'dense-binary',
  geometry: 2048,
  reasoningPriority: 'symbolicPriority'
});
session.loadCore();

// Build knowledge
session.learn(`
  @f isA Rex Dog
`);

// === DEBUGGING ===

console.log('=== SESSION DUMP ===');
console.log(session.dump());

console.log('=== DECODE FACT VECTOR ===');
const factVec = session.scope.get('f');
console.log(session.decode(factVec));

console.log('=== SUMMARIZE ===');
console.log(session.summarize(factVec));

console.log('=== PROVE + ELABORATE ===');
const proof = session.prove('@goal isA Rex Dog');
console.log(session.elaborate(proof));

session.close();
```

**Output:**
```
=== SESSION DUMP ===
{
  geometry: 2048,
  factCount: 1,
  ruleCount: 0,
  vocabularySize: 123,
  scopeBindings: ['f']
}

=== DECODE FACT VECTOR ===
{
  success: true,
  structure: {
    operator: 'isA',
    operatorConfidence: 0.9,
    arguments: [
      { position: 1, value: 'Rex', confidence: 0.9, alternatives: [] },
      { position: 2, value: 'Dog', confidence: 0.9, alternatives: [] }
    ],
    confidence: 0.9
  }
}

=== SUMMARIZE ===
{ success: true, text: 'Rex is a dog.', structure: { ... } }

=== PROVE + ELABORATE ===
{ text: 'True: Rex is a dog', proofChain: [ 'Rex is a dog' ], fullProof: '...' }
```

---

## 4.12 Summary

| Component | Purpose |
|-----------|---------|
| `Session` | Main API surface |
| `learn()` | Add facts/graphs (holes allowed for rules/graphs) |
| `query()` | Find answers (with holes) |
| `prove()` | Answer + derivation chain |
| `summarize()` | Vector → best-effort text |
| `elaborate()` | ProveResult → best-effort narration |
| **`dump()`** | Full session state snapshot |
| **`similarity()`** | Compare vectors |
| **`decode()`** | Extract structure from vector |

**Key insight:** The debug API exposes the internal vector space, making it possible to understand exactly what the system has learned and how it represents knowledge.

---

*End of Chapter 4*
