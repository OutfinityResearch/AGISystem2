# Module Plan: src/runtime/session.mjs

**Document Version:** 1.1  
**Status:** Implemented

---

## 1. Purpose

Provides the main API surface for AGISystem2. Sessions are isolated reasoning contexts that manage scope, knowledge base, vocabulary, and high-level methods for learning, querying, and proving.

---

## 2. Public API (Implemented)

```javascript
class Session {
  constructor(options?: SessionOptions)

  // Core API
  learn(dsl: string): LearnResult
  query(dsl: string, options?: QueryOptions): QueryResult
  prove(dsl: string, options?: ProveOptions): ProveResult
  abduce(dsl: string, options?: AbductionOptions): AbductionResult
  findAll(dsl: string, options?: FindAllOptions): FindAllResult

  // Output
  summarize(vector: Vector): SummarizeResult
  elaborate(proof: ProveResult): string
  generateText(operator: string, args: string[]): string
  formatResult(result: QueryResult | ProveResult, type?: 'query' | 'prove'): string
  describeResult(payload: { action: string, reasoningResult: object, queryDsl?: string }): string

  // Inspection
  dump(): SessionState
  similarity(a: Vector, b: Vector): number
  decode(vector: Vector): DecodedStructure

  // Validation and loading
  checkDSL(dsl: string, options?: CheckOptions): AST
  loadCore(options?: { corePath?: string, includeIndex?: boolean }): LoadResult

  // Lifecycle
  close(): void
}

interface SessionOptions {
  geometry?: number;                 // Default: 32768
  hdcStrategy?: string;              // Default: env SYS2_HDC_STRATEGY or 'dense-binary'
  reasoningPriority?: string;        // Default: env REASONING_PRIORITY or 'symbolicPriority'
  reasoningProfile?: string;         // Default: 'theoryDriven'
  canonicalizationEnabled?: boolean; // Override profile-derived toggle
  proofValidationEnabled?: boolean;  // Override profile-derived toggle
  rejectContradictions?: boolean;    // Default: true
}
```

---

## 3. Behavior Notes

- Core theories are **not** auto-loaded. Call `session.loadCore()` explicitly.
- `learn`, `query`, `prove`, `abduce`, and `findAll` validate DSL with `checkDSL` first; invalid DSL throws.
- `learn` is transactional. On any error (syntax, dependency, load error, contradiction), the session rolls back.
- Contradictions are rejected by default (`rejectContradictions: true`) and reported in `errors`/`warnings`.
- NL output is produced via `session.describeResult(...)`.

---

## 4. Dependencies

- `src/runtime/scope.mjs`
- `src/runtime/executor.mjs`
- `src/runtime/session-check-dsl.mjs`
- `src/runtime/session-learn.mjs`
- `src/runtime/session-core-load.mjs`
- `src/reasoning/*`
- `src/output/response-translator.mjs`

---

## 5. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SES-01 | Create session | Non-null, empty KB |
| SES-02 | Learn single fact | `success=true`, `facts=1` |
| SES-03 | Reject invalid DSL | Throws |
| SES-04 | Reject contradiction | `success=false`, no KB changes |
| SES-05 | Query with hole | Binding returned |
| SES-06 | Prove valid goal | `valid=true` |
| SES-07 | loadCore | Core loaded without errors |

---

*End of Module Plan*
