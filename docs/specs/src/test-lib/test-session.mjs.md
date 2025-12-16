# Module: src/test-lib/test-session.mjs

**Purpose:** Enhanced session for testing with verification methods.

## Exports

```javascript
export class TestError extends Error {}

export class TestSession extends Session {
  constructor(options?: { geometry?: number })
  testLog: LogEntry[];
  assertions: Assertion[];

  learnAndVerify(dsl: string, expectedFacts?: ExpectedFact[]): LearnResult
  queryAndVerify(dsl: string, expectedBindings: object): QueryResult
  proveAndVerify(goal: string, expectedValid: boolean, expectedSteps?: number): ProveResult
  decodeAndVerify(vectorName: string, expectedText: string): DecodeResult
  getReport(): TestReport
  resetTest(): void
}

interface TestReport {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  assertions: Assertion[];
  log: LogEntry[];
}
```

## Dependencies

- `../runtime/session.mjs`

## Test Cases

- Assertions are tracked correctly
- Report shows accurate pass/fail counts
- Log captures all operations
