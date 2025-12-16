# Module Plan: src/runtime/session.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-25 to FS-33, NFS-15, NFS-49

---

## 1. Purpose

Provides the main API surface for AGISystem2. Sessions are isolated reasoning contexts that manage scope, knowledge base, vocabulary, and provide high-level methods for learning, querying, and proving.

---

## 2. Responsibilities

- Create isolated reasoning contexts
- Manage session state (scope, KB, vocabulary)
- Provide learn(), query(), prove() API
- Provide summarize(), elaborate() API
- Coordinate parser, executor, and engines
- Track session statistics
- Support cleanup and resource release

---

## 3. Public API

```javascript
class Session {
  constructor(options?: SessionOptions)

  // Core API
  learn(dsl: string): LearnResult
  query(dsl: string): QueryResult
  prove(goal: string): ProveResult

  // Output
  summarize(result: Vector | QueryResult): SummarizeResult
  elaborate(result: Vector | QueryResult, options?: ElaborateOptions): ElaborateResult

  // Inspection
  dump(): SessionState
  inspect(name: string): InspectResult
  listTheories(): string[]
  listAtoms(theory?: string): AtomInfo[]
  listMacros(theory?: string): MacroInfo[]
  listFacts(): FactInfo[]
  similarity(a: string | Vector, b: string | Vector): number
  decode(vector: Vector): DecodedStructure

  // Lifecycle
  close(): void

  // Properties
  get geometry(): number
  get stats(): SessionStats
}

interface SessionOptions {
  geometry?: number;          // Default: 32768
  name?: string;              // Session name
  preloadTheories?: string[]; // Theories to load
  logLevel?: string;          // Logging level
}
```

---

## 4. Internal Design

### 4.1 Session State

```javascript
class Session {
  constructor(options = {}) {
    this.geometry = options.geometry || 32768;
    this.name = options.name || `session_${Date.now()}`;

    // Core state
    this.scope = new Scope();
    this.kb = Vector.zero(this.geometry);
    this.vocabulary = new Map();
    this.facts = [];

    // Components
    this.registry = new TheoryRegistry(this.geometry);
    this.executor = new Executor(this);
    this.queryEngine = new QueryEngine(this);
    this.proofEngine = new ProofEngine(this);
    this.decoder = new Decoder(this);

    // Statistics
    this.stats = {
      learnCalls: 0,
      queryCalls: 0,
      proveCalls: 0,
      startTime: new Date().toISOString()
    };

    // Always load Core theory
    this.loadCoreTheory();

    // Preload requested theories
    for (const theory of options.preloadTheories || []) {
      this.learn(`@_ Load $${theory}`);
    }
  }
}
```

### 4.2 Learn Implementation

```javascript
learn(dsl) {
  this.stats.learnCalls++;

  const result = {
    success: true,
    statements: 0,
    warnings: [],
    errors: []
  };

  try {
    const parser = new Parser(dsl);
    const program = parser.parse();

    if (parser.getErrors().length > 0) {
      result.errors = parser.getErrors();
      result.success = result.errors.length === 0;
      return result;
    }

    for (const statement of program.statements) {
      try {
        this.executor.execute(statement);
        result.statements++;
      } catch (e) {
        result.errors.push({
          message: e.message,
          line: statement.line,
          column: statement.column
        });
      }
    }

    // Check capacity warnings
    if (this.facts.length > 100) {
      result.warnings.push(`Knowledge base has ${this.facts.length} facts. ` +
        `Accuracy may degrade above 200 facts.`);
    }

  } catch (e) {
    result.success = false;
    result.errors.push({ message: e.message, line: 0, column: 0 });
  }

  return result;
}
```

### 4.3 Query Implementation

```javascript
query(dsl) {
  this.stats.queryCalls++;

  try {
    const parser = new Parser(dsl);
    const program = parser.parse();

    if (program.statements.length !== 1) {
      throw new Error("Query must be a single statement");
    }

    return this.queryEngine.execute(program.statements[0]);

  } catch (e) {
    return {
      success: false,
      bindings: null,
      confidence: 0,
      ambiguous: false,
      reason: e.message
    };
  }
}
```

### 4.4 Prove Implementation

```javascript
prove(goal) {
  this.stats.proveCalls++;

  try {
    const parser = new Parser(goal);
    const program = parser.parse();

    if (program.statements.length !== 1) {
      throw new Error("Goal must be a single statement");
    }

    return this.proofEngine.prove(program.statements[0]);

  } catch (e) {
    return {
      valid: false,
      proof: null,
      steps: [],
      confidence: 0,
      reason: e.message
    };
  }
}
```

### 4.5 Dump Implementation

```javascript
dump() {
  return {
    scope: Object.fromEntries(
      [...this.scope.variables].map(([k, v]) => [k, { popcount: v.popcount() }])
    ),
    facts: this.facts.map(f => ({
      name: f.name,
      dsl: f.dsl,
      timestamp: f.timestamp
    })),
    vocabulary: {
      count: this.vocabulary.size,
      theories: this.registry.list()
    },
    theories: this.registry.list(),
    stats: { ...this.stats }
  };
}
```

### 4.6 Close Implementation

```javascript
close() {
  // Clear all state
  this.scope.clear();
  this.kb = null;
  this.vocabulary.clear();
  this.facts = [];

  // Log session end
  console.debug(`Session ${this.name} closed after ${this.stats.learnCalls} learns, ` +
    `${this.stats.queryCalls} queries, ${this.stats.proveCalls} proves`);
}
```

---

## 5. Dependencies

- `./scope.js` - Scope management
- `./executor.js` - Statement execution
- `./theory/registry.js` - Theory management
- `../parser/parser.js` - DSL parsing
- `../reasoning/query.js` - Query engine
- `../reasoning/prove.js` - Proof engine
- `../decoding/structural-decoder.js` - Vector decoding

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SES-01 | Create session | Non-null, Core loaded |
| SES-02 | Learn single fact | Success, statements=1 |
| SES-03 | Learn multiple facts | All added to KB |
| SES-04 | Query with hole | Binding returned |
| SES-05 | Prove valid goal | valid=true, proof tree |
| SES-06 | Dump state | Complete state object |
| SES-07 | Inspect vector | Structure decoded |
| SES-08 | Close session | Resources released |
| SES-09 | Session isolation | Sessions don't share state |
| SES-10 | Capacity warning | Warning at 100+ facts |

---

## 7. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Session creation | < 100ms | Benchmark |
| learn(10 statements) | < 50ms | Benchmark |
| query(1 hole) | < 100ms | Benchmark |
| prove(depth 5) | < 500ms | Benchmark |
| dump() | < 10ms | Benchmark |
| close() | < 5ms | Benchmark |

---

*End of Module Plan*
