/**
 * AGISystem2 - Scope Management
 * @module runtime/scope
 *
 * Manages named bindings (vectors) in a hierarchical scope.
 */

export class Scope {
  /**
   * Create a new scope
   * @param {Scope|null} parent - Parent scope for inheritance
   */
  constructor(parent = null) {
    this.parent = parent;
    this.bindings = new Map();
  }

  /**
   * Define a new binding in this scope
   * @param {string} name - Binding name
   * @param {*} value - Value to bind
   * @throws {Error} If name already defined in this scope
   */
  define(name, value) {
    if (this.bindings.has(name)) {
      throw new Error(`'${name}' is already defined in this scope`);
    }
    this.bindings.set(name, value);
  }

  /**
   * Set a binding (define or update)
   * @param {string} name - Binding name
   * @param {*} value - Value to bind
   */
  set(name, value) {
    // Check if defined in parent scopes
    if (!this.bindings.has(name) && this.parent) {
      const parentScope = this.findDefiningScope(name);
      if (parentScope) {
        parentScope.bindings.set(name, value);
        return;
      }
    }
    this.bindings.set(name, value);
  }

  /**
   * Get a binding value
   * @param {string} name - Binding name
   * @returns {*} Bound value or undefined
   */
  get(name) {
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return undefined;
  }

  /**
   * Check if binding exists
   * @param {string} name - Binding name
   * @returns {boolean}
   */
  has(name) {
    if (this.bindings.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  /**
   * Delete a binding
   * @param {string} name - Binding name
   * @returns {boolean} True if deleted
   */
  delete(name) {
    return this.bindings.delete(name);
  }

  /**
   * Find the scope where a name is defined
   * @param {string} name - Binding name
   * @returns {Scope|null}
   */
  findDefiningScope(name) {
    if (this.bindings.has(name)) return this;
    if (this.parent) return this.parent.findDefiningScope(name);
    return null;
  }

  /**
   * Create child scope
   * @returns {Scope} New child scope
   */
  child() {
    return new Scope(this);
  }

  /**
   * Get all binding names in this scope (not parents)
   * @returns {string[]}
   */
  localNames() {
    return Array.from(this.bindings.keys());
  }

  /**
   * Get all binding names including parents
   * @returns {string[]}
   */
  allNames() {
    const names = new Set(this.localNames());
    if (this.parent) {
      for (const name of this.parent.allNames()) {
        names.add(name);
      }
    }
    return Array.from(names);
  }

  /**
   * Get iterator over local bindings
   * @returns {Iterator}
   */
  entries() {
    return this.bindings.entries();
  }

  /**
   * Get count of local bindings
   * @returns {number}
   */
  get size() {
    return this.bindings.size;
  }

  /**
   * Clear all local bindings
   */
  clear() {
    this.bindings.clear();
  }
}

export default Scope;
