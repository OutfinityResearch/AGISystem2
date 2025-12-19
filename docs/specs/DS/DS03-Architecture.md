# AGISystem2 - System Specifications

# Chapter 4: Architecture and API

**Document Version:** 2.0
**Status:** Implemented

> **Note:** This document describes the architecture and API. The actual implementation supports dual reasoning modes (HDC-Priority and Symbolic-Priority) based on HDC strategy. See DS01 Section 1.10 for details.

---

## 4.1 System Overview

AGISystem2 exposes a simple API through `AGISystem2Engine`:

```
AGISystem2Engine
    └── getSession() → Session
            │
            ├── LEARNING
            │   └── learn(dsl: string) → void
            │
            ├── QUERYING
            │   ├── query(dsl: string) → Result
            │   └── prove(dsl: string) → Proof
            │
            ├── TEXT GENERATION
            │   ├── summarize(vector, options?) → string
            │   └── elaborate(vector, options?) → string
            │
            ├── DEBUG / INSPECTION
            │   ├── dump() → SessionState
            │   ├── inspect(name: string) → VectorInfo
            │   ├── listTheories() → TheoryInfo[]
            │   ├── listAtoms(theory?: string) → AtomInfo[]
            │   ├── listGraphs(theory?: string) → GraphInfo[]
            │   ├── listFacts() → FactInfo[]
            │   ├── similarity(a, b) → number
            │   └── decode(vector) → DecodedStructure
            │
            └── LIFECYCLE
                ├── get(name: string) → Vector
                ├── set(name: string, vector: Vector) → void
                └── close() → void
```

---

## 4.2 Core Methods Summary

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `learn` | DSL statements | — | Add facts, define graphs |
| `query` | DSL with holes | Result | Find answers |
| `prove` | DSL with holes | Proof | Answer + derivation |
| `summarize` | Vector | string | Concise decode |
| `elaborate` | Vector | string | Detailed decode |
| `generateText` | operator, args | string | DSL → natural language |
| **`dump`** | — | SessionState | Full session state |
| **`inspect`** | name | VectorInfo | Detailed vector info |
| **`listTheories`** | — | TheoryInfo[] | Loaded theories |
| **`listAtoms`** | theory? | AtomInfo[] | All atoms |
| **`listGraphs`** | theory? | GraphInfo[] | All graphs |
| **`listFacts`** | — | FactInfo[] | All facts in KB |
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
    └── dense-binary.mjs # Default: Uint32Array + XOR
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
| `SYS2_HDC_STRATEGY` | `dense-binary` | Active HDC implementation |
| `SYS2_GEOMETRY` | `32768` | Default vector geometry (divisible by 32) |
| `SYS2_DEBUG` | `false` | Enable debug logging |

---

## 4.3 Session Lifecycle

```javascript
const engine = new AGISystem2Engine();
const session = engine.getSession();

// Core is auto-loaded with:
// - Position vectors: Pos1..Pos20
// - Type constructors: __Person, __Object, __Place, etc.
// - L2 primitives: _ptrans, _atrans, _mtrans, etc.
// - Logic: Implies, And, Or, Not
// - Roles: Agent, Theme, Source, Goal, etc.

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

`learn()` executes DSL statements that build knowledge. No holes allowed.

**Valid learn() input:**
```
@_ Load $Economics
@John:John __Person
@Mary:Mary __Person
@fact1 sell $John $Mary Car 1000
@fact2 likes $Mary Pizza
```

**Invalid learn() input:**
```
@answer sell ?who $Mary Car 1000    # ERROR: holes not allowed
```

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

`prove()` returns the answer AND the **derivation chain**.

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

## 4.7 Text Generation Methods

### summarize(vector, options?)

Decodes vector to concise natural language.

```javascript
const text = session.summarize(session.get("tx"));
// "Alice sold Car to Bob for 1000"
```

### elaborate(vector, options?)

Decodes vector to detailed explanation.

```javascript
const text = session.elaborate(session.get("tx"));
// "A commercial transaction occurred where Alice (the seller) 
//  transferred ownership of Car to Bob (the buyer). 
//  In exchange, Bob transferred 1000 units of currency to Alice."
```

### Decode Levels

```javascript
session.summarize(vector, { level: "atomic" });
session.summarize(vector, { level: "conceptual" });
session.summarize(vector, { level: "natural" });  // default
```

| Level | Example Output |
|-------|----------------|
| `atomic` | `sell ⊕ (Pos1⊕Alice) ⊕ (Pos2⊕Bob) ⊕ (Pos3⊕Car) ⊕ (Pos4⊕1000)` |
| `conceptual` | `sell(Agent=Alice, Recipient=Bob, Theme=Car, Price=1000)` |
| `natural` | "Alice sold Car to Bob for 1000" |

---

## 4.8 Debug / Inspection API

### 4.8.1 dump() → SessionState

Returns complete session state for debugging.

```typescript
interface SessionState {
    // Loaded theories
    theories: {
        name: string;
        geometry: number;
        atomCount: number;
        graphCount: number;
        isCore: boolean;
    }[];
    
    // Theory stack (resolution order)
    theoryStack: string[];
    
    // Working memory
    workingMemory: {
        name: string;
        type: string;           // "atom", "fact", "graph", "theory"
        theory: string;         // Which theory it's from
        exported: boolean;      // Is it exported?
        geometry: number;
    }[];
    
    // Knowledge base stats
    knowledgeBase: {
        factCount: number;
        bundleCapacity: number;  // Estimated remaining capacity
        saturation: number;      // 0-1, how full the KB is
    };
    
    // Position vectors
    positionVectors: string[];   // ["Pos1", "Pos2", ...]
    
    // Session stats
    stats: {
        learnCalls: number;
        queryCalls: number;
        proveCalls: number;
        uptime: number;          // milliseconds
    };
}
```

**Example usage:**
```javascript
const state = session.dump();
console.log(JSON.stringify(state, null, 2));
```

**Example output:**
```json
{
  "theories": [
    {"name": "Core", "geometry": 32768, "atomCount": 140, "graphCount": 45, "isCore": true},
    {"name": "Commerce", "geometry": 32768, "atomCount": 25, "graphCount": 8, "isCore": false}
  ],
  "theoryStack": ["Commerce", "Core"],
  "workingMemory": [
    {"name": "tx1", "type": "fact", "theory": "session", "exported": false, "geometry": 32768},
    {"name": "tx2", "type": "fact", "theory": "session", "exported": false, "geometry": 32768},
    {"name": "Alice", "type": "atom", "theory": "Commerce", "exported": true, "geometry": 32768}
  ],
  "knowledgeBase": {
    "factCount": 2,
    "bundleCapacity": 198,
    "saturation": 0.01
  },
  "positionVectors": ["Pos1", "Pos2", "Pos3", "Pos4", "Pos5", "..."],
  "stats": {
    "learnCalls": 1,
    "queryCalls": 0,
    "proveCalls": 0,
    "uptime": 1523
  }
}
```

### 4.8.2 inspect(name) → VectorInfo

Deep inspection of a specific vector.

```typescript
interface VectorInfo {
    name: string;
    type: string;                    // "atom", "fact", "graph", "theory"
    sourceTheory: string;
    geometry: number;
    exported: boolean;
    
    // Vector analysis
    onesCount: number;               // Popcount
    onesDensity: number;             // onesCount / geometry
    
    // For facts: decoded structure
    structure?: {
        operator: string;
        arguments: {
            position: number;        // 1, 2, 3...
            name: string;
            similarity: number;
        }[];
    };
    
    // For graphs: signature
    signature?: {
        parameters: string[];
        returnType: string;
    };
    
    // Similarity to other vectors
    nearestNeighbors?: {
        name: string;
        similarity: number;
    }[];
}
```

**Example:**
```javascript
const info = session.inspect("tx1");
console.log(info);
```

**Output:**
```json
{
  "name": "tx1",
  "type": "fact",
  "sourceTheory": "session",
  "geometry": 32768,
  "exported": false,
  "onesCount": 16412,
  "onesDensity": 0.501,
  "structure": {
    "operator": "sell",
    "arguments": [
      {"position": 1, "name": "Alice", "similarity": 0.98},
      {"position": 2, "name": "Bob", "similarity": 0.97},
      {"position": 3, "name": "Car", "similarity": 0.96},
      {"position": 4, "name": "1000", "similarity": 0.95}
    ]
  },
  "nearestNeighbors": [
    {"name": "tx2", "similarity": 0.62},
    {"name": "sell", "similarity": 0.58}
  ]
}
```

### 4.8.3 listTheories() → TheoryInfo[]

List all loaded theories.

```typescript
interface TheoryInfo {
    name: string;
    geometry: number;
    initMode: "deterministic" | "random";
    isCore: boolean;
    loadOrder: number;              // Position in stack
    atoms: string[];                // Exported atom names
    graphs: string[];               // Exported graph names
}
```

**Example:**
```javascript
const theories = session.listTheories();
theories.forEach(t => {
    console.log(`${t.name}: ${t.atoms.length} atoms, ${t.graphs.length} graphs`);
});
// Core: 140 atoms, 45 graphs
// Commerce: 25 atoms, 8 graphs
```

### 4.8.4 listAtoms(theory?) → AtomInfo[]

List all atoms, optionally filtered by theory.

```typescript
interface AtomInfo {
    name: string;
    theory: string;
    type: string;           // From type system: "Person", "Object", "Property", etc.
    exported: boolean;
    geometry: number;
}
```

**Example:**
```javascript
// All atoms
const allAtoms = session.listAtoms();

// Just Commerce atoms
const commerceAtoms = session.listAtoms("Commerce");
commerceAtoms.forEach(a => console.log(`${a.name}: ${a.type}`));
// Alice: Person
// Bob: Person
// Car: Object
// Book: Object
```

### 4.8.5 listGraphs(theory?) → GraphInfo[]

List all graphs with signatures.

```typescript
interface GraphInfo {
    name: string;
    exportedAs: string;             // The exported name
    theory: string;
    parameters: {
        name: string;
        expectedType?: string;      // From type signature comments
    }[];
    description?: string;           // If documented
}
```

**Example:**
```javascript
const graphs = session.listGraphs("Core");
graphs.forEach(m => {
    const params = m.parameters.map(p => p.name).join(", ");
    console.log(`${m.exportedAs}(${params})`);
});
// sell(seller, item, buyer, price)
// buy(buyer, item, seller, price)
// give(giver, object, receiver)
// _ptrans(agent, object, from, to)
// ...
```

### 4.8.6 listFacts() → FactInfo[]

List all facts in the knowledge base.

```typescript
interface FactInfo {
    name: string;
    operator: string;
    arguments: string[];
    confidence: number;             // How well it matches the reconstructed form
    addedAt: number;                // Timestamp
}
```

**Example:**
```javascript
const facts = session.listFacts();
facts.forEach(f => {
    console.log(`${f.name}: ${f.operator}(${f.arguments.join(", ")})`);
});
// tx1: sell(Alice, Bob, Car, 1000)
// tx2: buy(Charlie, Book, David, 50)
```

### 4.8.7 similarity(a, b) → number

Compare two vectors directly.

```javascript
// By name
const sim1 = session.similarity("Alice", "Bob");
console.log(sim1);  // 0.498 (unrelated)

// By vector
const sim2 = session.similarity(session.get("tx1"), session.get("tx2"));
console.log(sim2);  // 0.612 (both are transactions)

// Mixed
const sim3 = session.similarity("sell", session.get("tx1"));
console.log(sim3);  // 0.58 (sell is in tx1)
```

### 4.8.8 decode(vector) → DecodedStructure

Extract structure from any vector.

```typescript
interface DecodedStructure {
    type: "atom" | "fact" | "bundle" | "unknown";
    
    // For facts
    operator?: {
        name: string;
        similarity: number;
    };
    arguments?: {
        position: number;
        name: string;
        similarity: number;
    }[];
    
    // For bundles
    components?: {
        name: string;
        similarity: number;
    }[];
    
    // Raw info
    geometry: number;
    density: number;
}
```

**Example:**
```javascript
const structure = session.decode(session.get("tx1"));
console.log(structure);
// {
//   type: "fact",
//   operator: {name: "sell", similarity: 0.95},
//   arguments: [
//     {position: 1, name: "Alice", similarity: 0.98},
//     {position: 2, name: "Bob", similarity: 0.97},
//     ...
//   ],
//   geometry: 32768,
//   density: 0.501
// }
```

---

## 4.9 Internal Architecture

```
Session
├── workingMemory: Map<string, Vector>
├── theoryStack: Theory[]
├── knowledgeBase: Vector (bundled facts)
├── vocabulary: Map<string, Vector>    # All known literals
├── proofTrace: ProofStep[]
├── stats: SessionStats
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
│   └── collect all state into SessionState
│
├── inspect(name)
│   ├── get vector
│   ├── analyze structure
│   ├── find nearest neighbors
│   └── return VectorInfo
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

**Capacity monitoring:**
```javascript
const state = session.dump();
console.log(`KB saturation: ${state.knowledgeBase.saturation * 100}%`);
console.log(`Remaining capacity: ~${state.knowledgeBase.bundleCapacity} facts`);
```

---

## 4.11 Complete Debug Example

```javascript
const engine = new AGISystem2Engine();
const session = engine.getSession();

// Build knowledge
session.learn(`
    @_ Load $Commerce
    @Alice:Alice __Person
    @Bob:Bob __Person
    @Car:Car __Object
    @tx1 sell $Alice $Bob $Car 5000
`);

// === DEBUGGING ===

// 1. Full state dump
console.log("=== SESSION DUMP ===");
const state = session.dump();
console.log(`Theories loaded: ${state.theories.map(t => t.name).join(", ")}`);
console.log(`Facts in KB: ${state.knowledgeBase.factCount}`);
console.log(`KB saturation: ${(state.knowledgeBase.saturation * 100).toFixed(1)}%`);

// 2. Inspect specific vector
console.log("\n=== INSPECT tx1 ===");
const txInfo = session.inspect("tx1");
console.log(`Operator: ${txInfo.structure.operator}`);
txInfo.structure.arguments.forEach(arg => {
    console.log(`  Pos${arg.position}: ${arg.name} (${arg.similarity.toFixed(2)})`);
});

// 3. List what's available
console.log("\n=== AVAILABLE ATOMS ===");
session.listAtoms("Commerce").forEach(a => {
    console.log(`  ${a.name}: ${a.type}`);
});

console.log("\n=== AVAILABLE MACROS ===");
session.listGraphs("Commerce").slice(0, 5).forEach(m => {
    console.log(`  ${m.exportedAs}(${m.parameters.map(p=>p.name).join(", ")})`);
});

// 4. Check similarities
console.log("\n=== SIMILARITIES ===");
console.log(`Alice ~ Bob: ${session.similarity("Alice", "Bob").toFixed(3)}`);
console.log(`tx1 ~ sell: ${session.similarity("tx1", "sell").toFixed(3)}`);

// 5. Decode arbitrary vector
console.log("\n=== DECODE ===");
const decoded = session.decode(session.get("tx1"));
console.log(JSON.stringify(decoded, null, 2));

// 6. List all facts
console.log("\n=== ALL FACTS ===");
session.listFacts().forEach(f => {
    console.log(`${f.name}: ${f.operator}(${f.arguments.join(", ")})`);
});

session.close();
```

**Output:**
```
=== SESSION DUMP ===
Theories loaded: Core, Commerce
Facts in KB: 1
KB saturation: 0.5%

=== INSPECT tx1 ===
Operator: sell
  Pos1: Alice (0.98)
  Pos2: Bob (0.97)
  Pos3: Car (0.96)
  Pos4: 5000 (0.95)

=== AVAILABLE ATOMS ===
  Alice: Person
  Bob: Person
  Car: Object

=== AVAILABLE MACROS ===
  sell(seller, item, buyer, price)
  buy(buyer, item, seller, price)
  give(giver, object, receiver)
  take(taker, object, source)
  go(agent, from, to)

=== SIMILARITIES ===
Alice ~ Bob: 0.498
tx1 ~ sell: 0.583

=== DECODE ===
{
  "type": "fact",
  "operator": {"name": "sell", "similarity": 0.95},
  "arguments": [
    {"position": 1, "name": "Alice", "similarity": 0.98},
    {"position": 2, "name": "Bob", "similarity": 0.97},
    {"position": 3, "name": "Car", "similarity": 0.96},
    {"position": 4, "name": "5000", "similarity": 0.95}
  ],
  "geometry": 32768,
  "density": 0.501
}

=== ALL FACTS ===
tx1: sell(Alice, Bob, Car, 5000)
```

---

## 4.12 Summary

| Component | Purpose |
|-----------|---------|
| `Engine` | Entry point, creates sessions |
| `Session` | Working memory, theory stack, KB |
| `learn()` | Add facts (no holes) |
| `query()` | Find answers (with holes) |
| `prove()` | Answer + derivation chain |
| `summarize()` | Vector → concise text |
| `elaborate()` | Vector → detailed text |
| **`dump()`** | Full session state snapshot |
| **`inspect()`** | Deep vector analysis |
| **`listTheories/Atoms/Graphs/Facts`** | Enumerate loaded content |
| **`similarity()`** | Compare vectors |
| **`decode()`** | Extract structure from vector |

**Key insight:** The debug API exposes the internal vector space, making it possible to understand exactly what the system has learned and how it represents knowledge.

---

*End of Chapter 4*
