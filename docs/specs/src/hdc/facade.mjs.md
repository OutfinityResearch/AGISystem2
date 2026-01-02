# src/hdc/facade.mjs

## Purpose

Single entry point for all HDC operations in AGISystem2. All upper layers import only from this module - direct imports from `strategies/` are prohibited.

**Default strategy note:** The application-level default HDC strategy for `Session` is `exact` (session-local). The process-global facade defaults to `dense-binary` for backward-compatible standalone usage.

## Exports

### Initialization

| Function | Description |
|----------|-------------|
| `initHDC(strategyId?, options?)` | Initialize with specific strategy |
| `getProperties()` | Get active strategy properties |
| `getStrategyId()` | Get active strategy ID |
| `listStrategies()` | List available strategies |

### Geometry Management

| Function | Description |
|----------|-------------|
| `getDefaultGeometry()` | Get the default geometry for vector operations |
| `setDefaultGeometry(geometry)` | Set the default geometry (must be divisible by 32) |

### Factory Functions

| Function | Description |
|----------|-------------|
| `createZero(geometry?)` | Create zero vector (uses default geometry if not specified) |
| `createRandom(geometry?, seed?)` | Create random ~50% density vector (uses default geometry) |
| `createFromName(name, geometry?)` | Create deterministic vector from name (uses default geometry) |
| `deserialize(obj)` | Restore vector from storage |

### Core Operations

| Function | Description |
|----------|-------------|
| `bind(a, b)` | Bind two vectors (strategy-defined) |
| `bindAll(...vectors)` | Bind multiple vectors |
| `bundle(vectors, tieBreaker?)` | Superposition (strategy-defined) |
| `similarity(a, b)` | Calculate similarity [0,1] |
| `unbind(composite, component)` | Unbind / inverse (strategy-defined) |

### Utilities

| Function | Description |
|----------|-------------|
| `clone(v)` | Deep copy vector |
| `equals(a, b)` | Check exact equality |
| `serialize(v)` | Export to storage format |
| `topKSimilar(query, vocabulary, k)` | Find K most similar |
| `distance(a, b)` | Calculate distance (1 - similarity) |
| `isOrthogonal(a, b, threshold?)` | Check quasi-orthogonality |

### KB Serialization (Strategy Level)

| Function | Description |
|----------|-------------|
| `serializeKB(facts)` | Serialize a knowledge base for persistence |
| `deserializeKB(serialized)` | Deserialize a knowledge base from storage |

### Benchmarking

| Function | Description |
|----------|-------------|
| `benchmarkStrategy(strategyId?, geometry?, options?)` | Benchmark single strategy |
| `compareStrategies(strategyIds?, geometry?, options?)` | Compare multiple strategies |
| `printBenchmark(results)` | Print human-readable results |

### Contract

| Export | Description |
|--------|-------------|
| `HDC_CONTRACT` | Contract properties object |
| `validateStrategy(strategy, geometry)` | Validate strategy implementation |
| `Vector` | Vector class (for backward compat) |

## API Signatures

```javascript
// Initialization
initHDC(strategyId = 'dense-binary', options = {}) → Object
getProperties() → Object
getStrategyId() → string
listStrategies() → string[]

// Geometry Management
getDefaultGeometry() → number
setDefaultGeometry(geometry: number) → void  // Must be divisible by 32

// Factory (all use default geometry if not specified)
createZero(geometry?: number) → SemanticVector
createRandom(geometry?: number, seed?: number) → SemanticVector
createFromName(name: string, geometry?: number) → SemanticVector
deserialize(serialized: Object) → SemanticVector

// Core operations
bind(a: SemanticVector, b: SemanticVector) → SemanticVector
bindAll(...vectors: SemanticVector[]) → SemanticVector
bundle(vectors: SemanticVector[], tieBreaker?: SemanticVector) → SemanticVector
similarity(a: SemanticVector, b: SemanticVector) → number
unbind(composite: SemanticVector, component: SemanticVector) → SemanticVector

// Utilities
clone(v: SemanticVector) → SemanticVector
equals(a: SemanticVector, b: SemanticVector) → boolean
serialize(v: SemanticVector) → Object
topKSimilar(query: SemanticVector, vocabulary: Map|Object, k?: number) → Array<{name, similarity}>
distance(a: SemanticVector, b: SemanticVector) → number
isOrthogonal(a: SemanticVector, b: SemanticVector, threshold?: number) → boolean

// Benchmarking
benchmarkStrategy(strategyId?: string, geometry?: number, options?: Object) → BenchmarkResults
compareStrategies(strategyIds?: string[], geometry?: number, options?: Object) → ComparisonResults
printBenchmark(results: BenchmarkResults) → void
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SYS2_HDC_STRATEGY` | `dense-binary` | Facade default strategy (process-global; avoid `exact` here — it requires a session-local instance) |
| `SYS2_GEOMETRY` | `32768` | Default vector geometry (must be divisible by 32) |

## Dependencies

- `./strategies/index.mjs` - Strategy registry
- `./contract.mjs` - Contract definitions

## Usage Example

```javascript
import { bind, bundle, similarity, createFromName } from './src/hdc/facade.mjs';

// Create deterministic vectors
const john = createFromName('John', 32768);
const mary = createFromName('Mary', 32768);
const loves = createFromName('loves', 32768);

// Bind to create relationship
const fact = bind(loves, bind(john, mary));

// Check similarity
console.log(similarity(john, mary)); // ~0.5 (unrelated)
console.log(similarity(john, john)); // 1.0 (identical)
```

## Test Cases

1. Strategy initialization from env var
2. Default strategy when not specified
3. All operations delegate to active strategy
4. Benchmark produces valid metrics
5. Strategy comparison works with multiple strategies
