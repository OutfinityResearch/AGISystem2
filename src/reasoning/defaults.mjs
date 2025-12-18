/**
 * AGISystem2 - Default/Exception Reasoning
 * @module reasoning/defaults
 *
 * Non-monotonic reasoning with defaults and exceptions:
 * - Default rules apply unless blocked by exceptions
 * - More specific exceptions override less specific
 * - Confidence splits for conflicting defaults at same level
 *
 * Syntax in KB:
 * - Default can Bird Fly       → Birds can fly by default
 * - Exception can Penguin Fly  → Penguins are exception to flying
 */

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Defaults:${category}]`, ...args);
}

/**
 * Default Reasoner - handles non-monotonic reasoning
 */
export class DefaultReasoner {
  /**
   * Create default reasoner
   * @param {Session} session - Parent session with KB
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Resolve defaults for an entity and property
   * @param {string} entity - Entity name (e.g., "Opus")
   * @param {string} operator - Property operator (e.g., "can")
   * @param {string} value - Property value (e.g., "Fly")
   * @returns {Object} Resolution result with value, confidence, and reasoning
   */
  resolveDefaults(entity, operator, value) {
    dbg('RESOLVE', `Checking ${operator} ${entity} ${value}`);

    // Get entity's type hierarchy
    const types = this.getTypeHierarchy(entity);
    dbg('TYPES', `${entity} hierarchy: ${types.join(' → ')}`);

    // Find all applicable defaults (from entity and its types)
    const applicableDefaults = this.findApplicableDefaults(operator, value, types);
    dbg('DEFAULTS', `Found ${applicableDefaults.length} defaults`);

    // Find all applicable exceptions
    const applicableExceptions = this.findApplicableExceptions(operator, value, types);
    dbg('EXCEPTIONS', `Found ${applicableExceptions.length} exceptions`);

    // Check if any exception blocks the defaults
    const blocked = [];
    const active = [];

    for (const def of applicableDefaults) {
      // Find exceptions that are more specific than this default
      const blockingException = applicableExceptions.find(exc =>
        this.isMoreSpecific(exc.forType, def.forType, types)
      );

      if (blockingException) {
        blocked.push({
          default: def,
          blockedBy: blockingException,
          reason: `Exception for ${blockingException.forType} blocks default for ${def.forType}`
        });
      } else {
        active.push(def);
      }
    }

    dbg('ACTIVE', `${active.length} active, ${blocked.length} blocked`);

    // Handle conflicts at same specificity level
    if (active.length > 1) {
      // Multiple defaults apply - return with confidence split
      const splitConfidence = 1.0 / active.length;
      return {
        success: true,
        ambiguous: true,
        results: active.map(d => ({
          value: true,
          confidence: splitConfidence,
          fromType: d.forType,
          reason: `Default from ${d.forType} (conflict: ${active.length} candidates)`
        })),
        blocked,
        method: 'default_conflict_split'
      };
    }

    // Single active default
    if (active.length === 1) {
      return {
        success: true,
        ambiguous: false,
        value: true,
        confidence: 0.9,
        fromType: active[0].forType,
        blocked,
        method: 'default_applied'
      };
    }

    // No defaults apply - check if exception explicitly blocks
    if (applicableExceptions.length > 0) {
      const mostSpecificException = this.getMostSpecific(applicableExceptions, types);
      return {
        success: true,
        ambiguous: false,
        value: false,
        confidence: 0.95,
        fromType: mostSpecificException.forType,
        reason: `Exception for ${mostSpecificException.forType} applies`,
        method: 'exception_applied'
      };
    }

    // No defaults or exceptions found
    return {
      success: false,
      ambiguous: false,
      value: null,
      reason: 'No applicable defaults or exceptions',
      method: 'no_default'
    };
  }

  /**
   * Get type hierarchy for an entity (entity → parent → grandparent → ...)
   * @param {string} entity - Entity name
   * @returns {Array<string>} Type hierarchy including entity
   */
  getTypeHierarchy(entity) {
    const hierarchy = [entity];
    const visited = new Set([entity]);
    const componentKB = this.session?.componentKB;

    let current = entity;
    while (current) {
      let parent = null;

      if (componentKB) {
        const isAFacts = componentKB.findByOperatorAndArg0('isA', current);
        if (isAFacts.length > 0) {
          parent = isAFacts[0].args?.[1];
        }
      } else {
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === 'isA' && meta.args?.[0] === current) {
            parent = meta.args[1];
            break;
          }
        }
      }

      if (parent && !visited.has(parent)) {
        hierarchy.push(parent);
        visited.add(parent);
        current = parent;
      } else {
        break;
      }
    }

    return hierarchy;
  }

  /**
   * Find all Default facts that apply to any type in hierarchy
   * @param {string} operator - Property operator
   * @param {string} value - Property value
   * @param {Array<string>} types - Type hierarchy
   * @returns {Array<Object>} Applicable defaults
   */
  findApplicableDefaults(operator, value, types) {
    const defaults = [];
    const componentKB = this.session?.componentKB;

    for (const type of types) {
      if (componentKB) {
        const facts = componentKB.findByOperatorAndArg0('Default', operator);
        for (const fact of facts) {
          // Default format: Default op Type Value
          if (fact.args?.[1] === type && fact.args?.[2] === value) {
            defaults.push({
              forType: type,
              operator,
              value,
              specificity: types.indexOf(type)
            });
          }
        }
      } else {
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === 'Default' &&
              meta.args?.[0] === operator &&
              meta.args?.[1] === type &&
              meta.args?.[2] === value) {
            defaults.push({
              forType: type,
              operator,
              value,
              specificity: types.indexOf(type)
            });
          }
        }
      }
    }

    // Sort by specificity (more specific = lower index = first)
    defaults.sort((a, b) => a.specificity - b.specificity);
    return defaults;
  }

  /**
   * Find all Exception facts that apply to any type in hierarchy
   * @param {string} operator - Property operator
   * @param {string} value - Property value
   * @param {Array<string>} types - Type hierarchy
   * @returns {Array<Object>} Applicable exceptions
   */
  findApplicableExceptions(operator, value, types) {
    const exceptions = [];
    const componentKB = this.session?.componentKB;

    for (const type of types) {
      if (componentKB) {
        const facts = componentKB.findByOperatorAndArg0('Exception', operator);
        for (const fact of facts) {
          // Exception format: Exception op Type Value
          if (fact.args?.[1] === type && fact.args?.[2] === value) {
            exceptions.push({
              forType: type,
              operator,
              value,
              specificity: types.indexOf(type)
            });
          }
        }
      } else {
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === 'Exception' &&
              meta.args?.[0] === operator &&
              meta.args?.[1] === type &&
              meta.args?.[2] === value) {
            exceptions.push({
              forType: type,
              operator,
              value,
              specificity: types.indexOf(type)
            });
          }
        }
      }
    }

    // Sort by specificity
    exceptions.sort((a, b) => a.specificity - b.specificity);
    return exceptions;
  }

  /**
   * Check if typeA is more specific than typeB in hierarchy
   * @param {string} typeA - First type
   * @param {string} typeB - Second type
   * @param {Array<string>} hierarchy - Type hierarchy
   * @returns {boolean} True if typeA is more specific
   */
  isMoreSpecific(typeA, typeB, hierarchy) {
    const idxA = hierarchy.indexOf(typeA);
    const idxB = hierarchy.indexOf(typeB);
    // Lower index = more specific (closer to entity)
    return idxA >= 0 && idxB >= 0 && idxA < idxB;
  }

  /**
   * Get most specific item from a list
   * @param {Array<Object>} items - Items with forType property
   * @param {Array<string>} hierarchy - Type hierarchy
   * @returns {Object} Most specific item
   */
  getMostSpecific(items, hierarchy) {
    return items.reduce((best, current) => {
      if (!best) return current;
      return this.isMoreSpecific(current.forType, best.forType, hierarchy) ? current : best;
    }, null);
  }
}

export default DefaultReasoner;
