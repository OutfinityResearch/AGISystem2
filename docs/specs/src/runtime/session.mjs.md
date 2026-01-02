# Module Plan: src/runtime/session.mjs

**Document Version:** 2.1
**Status:** Implemented
**Traces To:** FS-25 to FS-33, URS-06, URS-07, URS-15

---

## 1. Purpose

Provides the main API surface for AGISystem2. Sessions are isolated reasoning contexts that manage scope, knowledge base, vocabulary, and high-level methods for learning, querying, and proving.

### 1.1 Session universe (DS26)

In addition to the public API, `Session` is responsible for “universe bootstrapping”:

- Creates a **session-local HDC context** (IoC), which may instantiate a per-session strategy instance (e.g., EXACT allocator).
- Initializes **runtime-reserved atoms** (internal tokens such as `Pos1`, `__EMPTY_BUNDLE__`) from a non-DSL config file (`config/runtime/reserved-atoms.json`).
- Auto-loads Core theories by default (with opt-out, and default-off under `node --test`).

---

## 2. Public API

### 2.1 Constructor

```javascript
class Session {
  constructor(options?: SessionOptions)
}

interface SessionOptions {
  geometry?: number;                   // Default: strategy default (exact: 256; dense-binary: 32768) unless SYS2_GEOMETRY is set
  hdcStrategy?: string;                // Default: env SYS2_HDC_STRATEGY or 'exact'
  reasoningPriority?: string;          // Default: env REASONING_PRIORITY or 'symbolicPriority'
  reasoningProfile?: string;           // Default: 'theoryDriven'
  canonicalizationEnabled?: boolean;   // Override profile-derived toggle
  proofValidationEnabled?: boolean;    // Override profile-derived toggle
  rejectContradictions?: boolean;      // Default: true

  // Strategy-specific (session-local) tuning
  exactUnbindMode?: 'A'|'B';           // EXACT: which UNBIND variant is default

  // Core bootstrapping (non-DSL runtime policy)
  autoLoadCore?: boolean;              // Default: true (except under `node --test`)
  corePath?: string;                   // Default: './config/Packs/Kernel'
  coreIncludeIndex?: boolean;          // Default: true (load only index.sys2)
}
```

### 2.2 Core Learning/Reasoning Methods

```javascript
// Learn DSL statements (facts, rules, theories)
learn(dsl: string): LearnResult

// Query with holes to find bindings
query(dsl: string, options?: QueryOptions): QueryResult

// Pure HDC master equation query
queryHDC(dsl: string): QueryResult

// Backward chaining proof
prove(dsl: string, options?: ProveOptions): ProveResult

// Best explanation reasoning
abduce(dsl: string, options?: AbduceOptions): AbduceResult

// Pattern discovery and rule induction
induce(options?: InduceOptions): InduceResult

// Find all solutions for a pattern
findAll(pattern: string, options?: FindAllOptions): FindAllResult

// Learn from examples (batch)
learnFrom(examples: string[]): LearnResult
```

### 2.3 Theory & Core Loading

```javascript
// Load core theories
loadCore(options?: { corePath?: string, includeIndex?: boolean, force?: boolean }): LoadResult

// Track rules for reasoning
trackRules(ast: AST): void
```

### 2.4 DSL Validation

```javascript
// Parse and validate DSL (lenient - allows unknown operators)
checkDSL(dsl: string, options?: CheckOptions): AST

// Parse and validate DSL (strict - rejects unknown operators)
checkDSLStrict(dsl: string, options?: CheckOptions): AST
```

### 2.5 Output & Decoding

```javascript
// Summarize vector in natural language
summarize(vector: Vector): SummarizeResult

// Elaborate proof with full chain
elaborate(proof: ProveResult): { text: string, proofChain?: string[], fullProof?: string }

// Generate natural language from operator/args
generateText(operator: string, args: string[]): string

// Format query or proof result
formatResult(result: QueryResult | ProveResult, type?: 'query' | 'prove'): string

// Describe result for NL output
describeResult(payload: { action: string, reasoningResult: object, queryDsl?: string }): string

// Decode vector to structure
decode(vector: Vector): DecodedStructure

// Extract arguments from vector
extractArguments(vector: Vector, operatorName: string): string[]
```

### 2.6 Knowledge Base Management

```javascript
// Add vector to KB
addToKB(vector: Vector, name?: string, metadata?: object): void

// Get bundled KB vector (cached)
getKBBundle(): Vector | null

// Check for contradictions
checkContradiction(metadata: object): ContradictionInfo | null

// Get all tracked rules
getAllRules(): Rule[]
```

### 2.7 Statistics & Debugging

```javascript
// Get reasoning statistics
getReasoningStats(reset?: boolean): ReasoningStats

// Track method call (internal)
trackMethod(method: string): void

// Track operation (internal)
trackOperation(operation: string): void

// Compute similarity between vectors
similarity(a: Vector, b: Vector): number

// Resolve expression to vector
resolve(expr: string | AST): Vector

// Dump session state
dump(): SessionState
```

### 2.8 Lifecycle

```javascript
// Close session and release resources
close(): void
```

---

## 3. Internal Components

### 3.1 Session Properties

```javascript
// HDC & Reasoning Configuration
this.hdcStrategy: string              // Active HDC strategy
this.reasoningPriority: string        // 'symbolicPriority' | 'holographicPriority'
this.reasoningProfile: string         // Profile name
this.features: object                 // Computed feature toggles
this.geometry: number                 // Vector dimension

// Core Components
this.scope: Scope                     // Variable bindings
this.vocabulary: Vocabulary           // Atom → Vector mapping
this.executor: Executor               // AST execution engine

// Reasoning Engines
this.queryEngine: QueryEngine         // Query processor (symbolic or holographic)
this.abductionEngine: AbductionEngine // Best explanation engine
this.inductionEngine: InductionEngine // Pattern learning engine

// Knowledge Storage
this.kb: Vector | null                // Bundled KB vector
this.kbFacts: FactEntry[]             // Individual facts with metadata
this.componentKB: ComponentKB         // Component-indexed KB for fuzzy matching
this.factIndex: FactIndex             // Exact-match fact index

// Rules & Theories
this.rules: Rule[]                    // Tracked rules
this.theories: Map                    // Loaded theories
this.operators: Map                   // Reserved operators
this.declaredOperators: Set           // User-declared operators

// Output
this.responseTranslator: ResponseTranslator  // NL generation

// Configuration
this.rejectContradictions: boolean    // Reject contradicting facts
this.canonicalizationEnabled: boolean // Enable canonicalization
this.proofValidationEnabled: boolean  // Enable proof validation
```

### 3.2 Reasoning Statistics

```javascript
this.reasoningStats = {
  queries: number,              // Total queries
  proofs: number,               // Total proofs
  kbScans: number,              // KB scans performed
  similarityChecks: number,     // Similarity computations
  ruleAttempts: number,         // Rule application attempts
  transitiveSteps: number,      // Transitive chain steps
  maxProofDepth: number,        // Maximum proof depth seen
  minProofDepth: number,        // Minimum proof depth (M)
  totalProofSteps: number,      // Successful proof steps
  totalReasoningSteps: number,  // All reasoning attempts
  proofLengths: number[],       // Proof length distribution
  methods: object,              // Method call counts
  operations: object,           // Operation counts

  // HDC-specific
  hdcQueries: number,           // HDC Master Equation queries
  hdcSuccesses: number,         // Successful HDC queries
  hdcBindings: number,          // Bindings found via HDC
  hdcBindOps: number,           // bind() calls (counted at facade layer when session-attached)
  hdcBundleOps: number,         // bundle() calls (counted at facade layer when session-attached)
  hdcUnbindOps: number,         // unbind() calls (counted at facade layer when session-attached)
  topKSimilarCalls: number      // topKSimilar() calls (counted at facade layer when session-attached)
};
```

---

## 4. Behavior Notes

- Core theories are **auto-loaded by default** in normal runs.
  - Default OFF under `node --test` to keep unit tests fast/stable.
  - Opt-out via `new Session({ autoLoadCore: false })` or `SYS2_AUTO_LOAD_CORE=0`.
- `loadCore({ includeIndex: true })` loads `config/Packs/Kernel/index.sys2`.
- `learn`, `query`, `prove`, `abduce`, and `findAll` validate DSL with `checkDSL` first; invalid DSL throws.
- `checkDSLStrict(...)` rejects unknown operators/concepts not already loaded or declared.
- `learn` is transactional. On any error (syntax, dependency, contradiction), the session rolls back.
- Contradictions are rejected by default (`rejectContradictions: true`) and reported in `errors`/`warnings`.
- NL output is produced via `session.describeResult(...)`.
- Reasoning engine selection is automatic based on `reasoningPriority`.

---

## 5. Dependencies

- `src/runtime/scope.mjs`
- `src/runtime/vocabulary.mjs`
- `src/runtime/executor.mjs`
- `src/runtime/fact-index.mjs`
- `src/runtime/semantic-index.mjs`
- `src/runtime/canonicalize.mjs`
- `src/runtime/reasoning-profile.mjs`
- `src/runtime/session-*.mjs` (submodules)
- `src/reasoning/*`
- `src/output/*`

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SES-01 | Create session | Non-null, empty KB |
| SES-02 | Learn single fact | `success=true`, `facts=1` |
| SES-03 | Reject invalid DSL | Throws |
| SES-04 | Reject contradiction | `success=false`, no KB changes |
| SES-05 | Query with hole | Binding returned |
| SES-06 | Prove valid goal | `proved=true` |
| SES-07 | loadCore | Core loaded without errors |
| SES-08 | getReasoningStats | Returns stats object |
| SES-09 | Holographic priority | Uses HolographicQueryEngine |
| SES-10 | findAll returns all solutions | Multiple bindings |
| SES-11 | abduce returns explanations | Ranked explanations |
| SES-12 | induce discovers patterns | Rules with scores |
| SES-13 | Transaction rollback | KB unchanged on error |
| SES-14 | ComponentKB integration | Fuzzy matching works |

---

*End of Module Plan*
