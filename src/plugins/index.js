/**
 * Compute Plugins Index
 *
 * Exports all compute plugins and provides a factory function
 * to register them with a PluginRegistry.
 *
 * DS: DS(/plugins/index.js)
 */

const MathPlugin = require('./math.js');
const PhysicsPlugin = require('./physics.js');
const LogicPlugin = require('./logic.js');
const DatetimePlugin = require('./datetime.js');
const PluginRegistry = require('./registry.js');

/**
 * Create and configure a PluginRegistry with all built-in plugins
 * @returns {PluginRegistry}
 */
function createRegistry() {
  const registry = new PluginRegistry();

  // Register all built-in plugins
  registry.register('math', new MathPlugin());
  registry.register('physics', new PhysicsPlugin());
  registry.register('logic', new LogicPlugin());
  registry.register('datetime', new DatetimePlugin());

  return registry;
}

/**
 * Get or create a shared registry instance
 */
let _sharedRegistry = null;
function getSharedRegistry() {
  if (!_sharedRegistry) {
    _sharedRegistry = createRegistry();
  }
  return _sharedRegistry;
}

/**
 * Reset the shared registry (for testing)
 */
function resetSharedRegistry() {
  _sharedRegistry = null;
}

module.exports = {
  // Plugin classes
  MathPlugin,
  PhysicsPlugin,
  LogicPlugin,
  DatetimePlugin,
  PluginRegistry,

  // Factory functions
  createRegistry,
  getSharedRegistry,
  resetSharedRegistry
};
