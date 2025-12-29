/**
 * AGISystem2 - Executor Meta-Operations
 * @module runtime/executor-meta-ops
 *
 * Handles induce and bundle operations:
 * - executeInduce: Extract common properties from multiple examples
 * - executeBundle: Create bundled vector from multiple items
 */

import { bind, bundle } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';

/**
 * Execute induce operator - extract common properties from multiple examples
 * @induce [A, B, C] creates a pattern vector representing shared properties
 * @param {Executor} executor - Executor instance
 * @param {Statement} stmt - Statement AST
 * @returns {Object} Induce result
 */
export function executeInduce(executor, stmt) {
  // Get the list of items to induce from
  if (stmt.args.length === 0) {
    throw new Error('induce requires a list argument');
  }

  const listArg = stmt.args[0];
  const items = listArg.items || [listArg];
  const itemNames = items.map(item => executor.extractName(item));

  // Collect properties for each item
  const itemProps = new Map(); // itemName -> Set of "op:arg1"
  const componentKB = executor.session?.componentKB;

  for (const name of itemNames) {
    const props = new Set();
    if (componentKB) {
      const facts = componentKB.findByArg0(name);
      for (const f of facts) {
        if (f.args?.[1]) {
          props.add(`${f.operator}:${f.args[1]}`);
        }
      }
    } else {
      for (const fact of executor.session.kbFacts) {
        executor.session.reasoningStats.kbScans++;
        const meta = fact.metadata;
        if (meta?.args?.[0] === name && meta?.args?.[1]) {
          props.add(`${meta.operator}:${meta.args[1]}`);
        }
      }
    }
    itemProps.set(name, props);
  }

  // Find intersection of properties (what all items share)
  let commonProps = null;
  for (const [name, props] of itemProps) {
    if (commonProps === null) {
      commonProps = new Set(props);
    } else {
      for (const p of commonProps) {
        if (!props.has(p)) {
          commonProps.delete(p);
        }
      }
    }
  }

  // Create a pattern vector by bundling the common property vectors
  const propVectors = [];
  const propMetadata = [];
  for (const prop of commonProps || []) {
    const [op, arg1] = prop.split(':');
    const opVec = executor.session.vocabulary.getOrCreate(op);
    const arg1Vec = executor.session.vocabulary.getOrCreate(arg1);
    const propVec = bind(opVec, withPosition(1, arg1Vec, executor.session));
    propVectors.push(propVec);
    propMetadata.push({ operator: op, arg: arg1 });
  }

  const patternVec = propVectors.length > 0 ? bundle(propVectors) : executor.session.vocabulary.getOrCreate('__EMPTY_PATTERN__');

  // Store in scope if destination provided
  if (stmt.destination) {
    executor.session.scope.set(stmt.destination, patternVec);
  }

  // Also store metadata for querying
  const resultName = stmt.destination || '__induce_result__';
  executor.session.kbFacts.push({
    name: resultName,
    vector: patternVec,
    metadata: {
      operator: 'inducePattern',
      sources: itemNames,
      commonProperties: propMetadata,
      propertyCount: commonProps?.size || 0
    }
  });

  return {
    type: 'induce',
    destination: stmt.destination,
    sources: itemNames,
    commonProperties: propMetadata,
    propertyCount: commonProps?.size || 0,
    vector: patternVec
  };
}

/**
 * Execute bundle operator - create a bundled vector from multiple items
 * @bundle [A, B, C] creates a superposition of A, B, C vectors
 * @param {Executor} executor - Executor instance
 * @param {Statement} stmt - Statement AST
 * @returns {Object} Bundle result
 */
export function executeBundle(executor, stmt) {
  if (stmt.args.length === 0) {
    throw new Error('bundle requires a list argument');
  }

  const listArg = stmt.args[0];
  const items = listArg.items || [listArg];
  const itemVectors = items.map(item => executor.resolveExpression(item));
  const bundledVec = bundle(itemVectors);

  // Store in scope if destination provided
  if (stmt.destination) {
    executor.session.scope.set(stmt.destination, bundledVec);
  }

  // Store with metadata
  const resultName = stmt.destination || '__bundle_result__';
  const itemNames = items.map(item => executor.extractName(item));

  executor.session.kbFacts.push({
    name: resultName,
    vector: bundledVec,
    metadata: {
      operator: 'bundlePattern',
      items: itemNames,
      itemCount: items.length
    }
  });

  return {
    type: 'bundle',
    destination: stmt.destination,
    items: itemNames,
    itemCount: items.length,
    vector: bundledVec
  };
}
