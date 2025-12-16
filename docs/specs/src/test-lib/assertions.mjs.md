# Module: src/test-lib/assertions.mjs

**Purpose:** Domain-specific test assertions for HDC operations.

## Exports

```javascript
export class AssertionError extends Error {}

export class Assertions {
  static similarityAbove(actual: number, threshold: number, message?: string): void
  static similarityBelow(actual: number, threshold: number, message?: string): void
  static confidenceStrong(result: { confidence: number }): void
  static querySucceeds(result: QueryResult): void
  static queryReturns(result: QueryResult, hole: string, expectedValue: string): void
  static proofValid(result: ProveResult): void
  static proofInvalid(result: ProveResult): void
  static decodesTo(decoded: DecodeResult, operator: string, args?: string[]): void
  static vectorsOrthogonal(a: Vector, b: Vector, session: Session): void
  static vectorsEqual(a: Vector, b: Vector, session: Session): void
  static vectorsSimilar(a: Vector, b: Vector, session: Session, threshold?: number): void
  static vectorBalanced(v: Vector, tolerance?: number): void
}
```

## Dependencies

None.

## Test Cases

- Each assertion throws on failure
- Each assertion passes on success
- Error messages are descriptive
