# src/hdc/strategies/index.mjs

## Purpose

Strategy registry for HDC implementations. Manages registration, retrieval, and enumeration of available strategies.

## Exports

| Function | Description |
|----------|-------------|
| `getStrategy(strategyId)` | Get strategy by ID |
| `getDefaultStrategy()` | Get default strategy (dense-binary) |
| `registerStrategy(id, strategy)` | Register new strategy |
| `listStrategies()` | List available strategy IDs |

## API Signatures

```javascript
/**
 * Get strategy by ID
 * @param {string} strategyId
 * @returns {HDCStrategy}
 * @throws {Error} If strategy not found
 */
getStrategy(strategyId: string) → HDCStrategy

/**
 * Get the default strategy
 * @returns {HDCStrategy}
 */
getDefaultStrategy() → HDCStrategy

/**
 * Register a new strategy
 * @param {string} id - Unique identifier
 * @param {HDCStrategy} strategy - Strategy implementation
 * @throws {Error} If id already registered
 */
registerStrategy(id: string, strategy: HDCStrategy) → void

/**
 * List all registered strategy IDs
 * @returns {string[]}
 */
listStrategies() → string[]
```

## Built-in Strategies

| ID | Module | Description |
|----|--------|-------------|
| `dense-binary` | `./dense-binary.mjs` | Default. Uint32Array + XOR binding |

## Dependencies

- `./dense-binary.mjs` - Default strategy implementation

## Algorithm

```
INTERNAL: strategies = Map<string, HDCStrategy>

ON MODULE LOAD:
  strategies.set('dense-binary', denseBinaryStrategy)

getStrategy(id):
  IF strategies.has(id):
    RETURN strategies.get(id)
  ELSE:
    THROW Error("Unknown strategy: {id}")

getDefaultStrategy():
  RETURN strategies.get('dense-binary')

registerStrategy(id, strategy):
  IF strategies.has(id):
    THROW Error("Strategy already registered: {id}")
  strategies.set(id, strategy)

listStrategies():
  RETURN Array.from(strategies.keys())
```

## Usage Example

```javascript
import { getStrategy, listStrategies, registerStrategy } from './strategies/index.mjs';

// List available
console.log(listStrategies()); // ['dense-binary']

// Get specific
const strategy = getStrategy('dense-binary');

// Register custom
import { myStrategy } from './my-custom-strategy.mjs';
registerStrategy('my-strategy', myStrategy);
```

## Test Cases

1. Default strategy is dense-binary
2. Unknown strategy throws error
3. Duplicate registration throws error
4. listStrategies returns all registered
5. Custom strategy can be registered and retrieved
