# Design Spec: src/plugins/index.js

ID: DS(/plugins/index.js)

Module `plugins/index`
- **Role**: Central export module for compute plugins. Provides factory functions to create and access a shared PluginRegistry with all built-in plugins registered.
- **Pattern**: Module/Factory. SOLID: single point of access for plugin system.
- **Key Collaborators**: `PluginRegistry`, `MathPlugin`, `PhysicsPlugin`, `LogicPlugin`, `DatetimePlugin`.

## Exports

### Plugin Classes
- `MathPlugin`: Arithmetic operations and numeric comparisons
- `PhysicsPlugin`: Unit conversions and physical calculations
- `LogicPlugin`: Boolean and multi-valued logic operations
- `DatetimePlugin`: Temporal comparisons and date arithmetic
- `PluginRegistry`: Plugin management and delegation

### Factory Functions
- `createRegistry()`: Create a new PluginRegistry with all plugins registered
- `getSharedRegistry()`: Get or create a singleton shared registry
- `resetSharedRegistry()`: Reset the shared registry (for testing)

## Usage

```js
const { createRegistry, getSharedRegistry } = require('./src/plugins');

// Option 1: Create a new registry
const registry = createRegistry();

// Option 2: Use the shared singleton
const sharedRegistry = getSharedRegistry();

// Evaluate computable relations
const result = registry.evaluate('CONVERTS_TO', 'celsius_100', 'fahrenheit');
// → { truth: 'TRUE_CERTAIN', value: 212, unit: 'fahrenheit' }

const logicResult = registry.evaluate('IMPLIES', -127, 64);
// → { truth: 'TRUE_CERTAIN', value: 127 }

const timeResult = registry.evaluate('BEFORE', '2024-01-01', '2024-12-31');
// → { truth: 'TRUE_CERTAIN', result: true }
```

## Pseudocode

```js
const MathPlugin = require('./math.js');
const PhysicsPlugin = require('./physics.js');
const LogicPlugin = require('./logic.js');
const DatetimePlugin = require('./datetime.js');
const PluginRegistry = require('./registry.js');

function createRegistry() {
  const registry = new PluginRegistry();
  registry.register('math', new MathPlugin());
  registry.register('physics', new PhysicsPlugin());
  registry.register('logic', new LogicPlugin());
  registry.register('datetime', new DatetimePlugin());
  return registry;
}

let _sharedRegistry = null;
function getSharedRegistry() {
  if (!_sharedRegistry) {
    _sharedRegistry = createRegistry();
  }
  return _sharedRegistry;
}

function resetSharedRegistry() {
  _sharedRegistry = null;
}

module.exports = {
  MathPlugin, PhysicsPlugin, LogicPlugin, DatetimePlugin, PluginRegistry,
  createRegistry, getSharedRegistry, resetSharedRegistry
};
```

## Registered Plugins

| Plugin | Domain | Relations Count | Description |
|--------|--------|-----------------|-------------|
| math | 1 | 8 | Arithmetic and comparisons |
| physics | 2 | 14 | Unit conversions and physics |
| logic | 4 | 12 | Boolean and multi-valued logic |
| datetime | 5 | 15 | Temporal operations |

## Total Computable Relations: 49

The registry provides a unified interface for all computable relations across domains.

## Notes/Constraints
- The shared registry is a singleton for efficiency.
- `resetSharedRegistry()` is intended for testing isolation.
- Each `createRegistry()` call returns a fresh, independent registry.
- Plugin registration order doesn't affect functionality.
