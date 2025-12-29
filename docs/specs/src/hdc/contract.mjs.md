# src/hdc/contract.mjs

## Purpose

Defines the HDC strategy contract using JSDoc type definitions. Provides validation function to verify custom strategy implementations.

## Exports

### Constants

| Export | Description |
|--------|-------------|
| `HDC_CONTRACT` | Object defining required mathematical properties |

### Functions

| Function | Description |
|----------|-------------|
| `validateStrategy(strategy, geometry)` | Validate strategy against contract |

## HDC_CONTRACT Properties

```javascript
export const HDC_CONTRACT = {
  // Similarity properties
  SIMILARITY_REFLEXIVE: true,   // similarity(v, v) = 1.0
  SIMILARITY_SYMMETRIC: true,   // similarity(a, b) = similarity(b, a)
  SIMILARITY_RANGE: [0, 1]      // Output must be in [0, 1]
};
```

## API Signatures

```javascript
/**
 * Validate a strategy implementation
 * @param {Object} strategy - Strategy object to validate
 * @param {number} geometry - Vector dimension for testing
 * @param {Object} [options]
 * @param {boolean} [options.expectSelfInverse] - validate `unbind(bind(a,b), b) ≈ a` (XOR-like strategies)
 * @param {{expected:number, tolerance:number}} [options.expectRandomBaseline] - validate similarity(random, random) baseline
 * @param {{min:number}} [options.expectBundleRetrievable] - validate sim(bundle([a,b,c]), a) >= min
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
validateStrategy(strategy, geometry = 2048, options = {}) → ValidationResult
```

## Strategy Interface (JSDoc)

Every HDC strategy must implement:

```javascript
/**
 * @typedef {Object} HDCStrategy
 * @property {string} id - Unique identifier
 * @property {Object} properties - Strategy properties
 *
 * @property {function(number): SemanticVector} createZero
 * @property {function(number, ?number): SemanticVector} createRandom
 * @property {function(string, number): SemanticVector} createFromName
 * @property {function(Object): SemanticVector} deserialize
 *
 * @property {function(SemanticVector, SemanticVector): SemanticVector} bind
 * @property {function(...SemanticVector): SemanticVector} bindAll
 * @property {function(SemanticVector[], ?SemanticVector): SemanticVector} bundle
 * @property {function(SemanticVector, SemanticVector): number} similarity
 * @property {function(SemanticVector, SemanticVector): SemanticVector} unbind
 *
 * @property {function(SemanticVector): SemanticVector} clone
 * @property {function(SemanticVector, SemanticVector): boolean} equals
 * @property {function(SemanticVector): Object} serialize
 * @property {function(SemanticVector, Map|Object, ?number): Array} topKSimilar
 * @property {function(SemanticVector, SemanticVector): number} distance
 * @property {function(SemanticVector, SemanticVector, ?number): boolean} isOrthogonal
 *
 * @property {function} Vector - Internal vector class
 */
```

## Validation Tests

The `validateStrategy()` function tests:

1. **Required Functions Exist**
   - All factory functions present
   - All core operations present
   - All utility functions present

2. **Similarity Properties**
   - Reflexive: `similarity(v, v) = 1.0`
   - Symmetric: `similarity(a, b) = similarity(b, a)`
   - Range: Output in [0, 1]

3. **Determinism**
   - `createFromName(same, same)` produces identical vectors

4. **Optional checks (strategy-specific)**
   - XOR-like cancellation: `expectSelfInverse`
   - Random baseline: `expectRandomBaseline`
   - Bundle retrievability: `expectBundleRetrievable`

## Dependencies

None (standalone module)

## Usage Example

```javascript
import { validateStrategy } from './src/hdc/contract.mjs';
import { myCustomStrategy } from './my-strategy.mjs';

const result = validateStrategy(myCustomStrategy, 2048);

if (result.valid) {
  console.log('Strategy passes contract!');
} else {
  console.log('Contract violations:');
  result.errors.forEach(e => console.log('  -', e));
}

if (result.warnings.length > 0) {
  console.log('Warnings:');
  result.warnings.forEach(w => console.log('  -', w));
}
```

## Test Cases

1. Dense-binary strategy passes validation (with XOR-specific options enabled)
2. Missing functions detected as errors
3. Invalid similarity range detected
4. Non-deterministic createFromName detected
5. Unbind not cancellative detected when `expectSelfInverse` is enabled
