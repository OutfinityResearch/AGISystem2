/**
 * DS(/theory/dsl_commands_memory.js) - Memory Management DSL Commands
 *
 * Implements Sys2DSL commands for knowledge lifecycle:
 * - RETRACT: Remove facts from knowledge base
 * - GET_USAGE: Query usage statistics
 * - FORGET: Remove low-usage concepts
 * - BOOST: Increase concept priority
 * - PROTECT: Mark concepts as unforgettable
 *
 * See also: DS(/knowledge/usage_tracking), DS(/knowledge/forgetting)
 *
 * @module theory/dsl_commands_memory
 */

class DSLCommandsMemory {
  constructor({ conceptStore, parser }) {
    this.conceptStore = conceptStore;
    this.parser = parser;
  }

  /**
   * RETRACT: Remove a fact from the knowledge base
   * Syntax: @var RETRACT Subject Relation Object
   */
  cmdRetract(argTokens, env) {
    if (argTokens.length < 3) {
      throw new Error('RETRACT expects at least three tokens: Subject REL Object');
    }
    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    const object = this.parser.expandString(argTokens.slice(2).join(' '), env);

    const facts = this.conceptStore.getFacts();
    let removed = 0;
    for (let i = 0; i < facts.length; i++) {
      const f = facts[i];
      if (f.subject === subject && f.relation === relation && f.object === object) {
        this.conceptStore.removeFact(f._id !== undefined ? f._id : i);
        removed++;
      }
    }
    return { ok: removed > 0, removed, subject, relation, object };
  }

  /**
   * GET_USAGE: Get usage statistics for a concept
   * Syntax: @var GET_USAGE conceptLabel
   */
  cmdGetUsage(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('GET_USAGE expects a concept label');
    }
    const label = this.parser.expandString(argTokens[0], env);
    const stats = this.conceptStore.getUsageStats(label);
    return stats || { error: 'Concept not found', label };
  }

  /**
   * FORGET: Remove concepts based on criteria
   * Syntax: @var FORGET [threshold=N] [olderThan=Xd] [concept=label] [pattern=pat] [dryRun]
   *
   * Criteria options:
   * - threshold=N: Forget concepts with usage count < N
   * - olderThan=Xd: Forget concepts not accessed in X days
   * - concept=label: Forget specific concept
   * - pattern=pat: Forget concepts matching pattern
   * - dryRun: Preview without actual deletion
   */
  cmdForget(argTokens, env) {
    const criteria = {};
    for (const token of argTokens) {
      const expanded = this.parser.expandString(token, env);
      if (expanded === 'dryRun') {
        criteria.dryRun = true;
      } else if (expanded.startsWith('threshold=')) {
        criteria.threshold = parseInt(expanded.split('=')[1], 10);
      } else if (expanded.startsWith('olderThan=')) {
        criteria.olderThan = expanded.split('=')[1];
      } else if (expanded.startsWith('concept=')) {
        criteria.concept = expanded.split('=')[1];
      } else if (expanded.startsWith('pattern=')) {
        criteria.pattern = expanded.split('=')[1];
      }
    }
    return this.conceptStore.forget(criteria);
  }

  /**
   * BOOST: Increase usage count for a concept
   * Syntax: @var BOOST conceptLabel [amount]
   *
   * This manually increases the usage counter, making the concept
   * less likely to be forgotten during cleanup.
   */
  cmdBoost(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('BOOST expects a concept label');
    }
    const label = this.parser.expandString(argTokens[0], env);
    const amount = argTokens.length > 1
      ? parseInt(this.parser.expandString(argTokens[1], env), 10)
      : 10;
    this.conceptStore.boostUsage(label, amount);
    return { ok: true, label, amount };
  }

  /**
   * PROTECT: Mark concept as protected from forgetting
   * Syntax: @var PROTECT conceptLabel
   *
   * Protected concepts will never be removed by FORGET operations,
   * regardless of usage statistics.
   */
  cmdProtect(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('PROTECT expects a concept label');
    }
    const label = this.parser.expandString(argTokens[0], env);
    this.conceptStore.protect(label);
    return { ok: true, label, protected: true };
  }

  /**
   * UNPROTECT: Remove protection from a concept
   * Syntax: @var UNPROTECT conceptLabel
   */
  cmdUnprotect(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('UNPROTECT expects a concept label');
    }
    const label = this.parser.expandString(argTokens[0], env);
    this.conceptStore.unprotect(label);
    return { ok: true, label, protected: false };
  }
}

module.exports = DSLCommandsMemory;
