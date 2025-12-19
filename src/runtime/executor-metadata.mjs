import { Identifier, Reference, Literal, Compound, List } from '../parser/ast.mjs';

export function resolveNameFromNode(executor, node) {
  if (!node) return null;

  if (node instanceof Reference) {
    const vec = executor.session.scope.get(node.name);
    if (vec) {
      const name = executor.session.vocabulary.reverseLookup(vec);
      if (name) return name;
    }
    return node.name;
  }

  if (node instanceof Identifier) return node.name;
  if (node instanceof Literal) return String(node.value);
  if (node instanceof Compound) return node.toString();
  if (node instanceof List) return node.toString();
  if (node.name) return node.name;
  if (node.value) return String(node.value);
  return null;
}

export function extractName(executor, node) {
  if (!node) return null;
  if (node instanceof Identifier) return node.name;
  if (node instanceof Reference) return node.name;
  if (node instanceof Literal) return String(node.value);
  if (node.name) return node.name;
  if (node.value) return String(node.value);
  return null;
}

export function extractMetadata(executor, stmt) {
  const operatorName = resolveNameFromNode(executor, stmt.operator);
  const args = stmt.args.map(arg => resolveNameFromNode(executor, arg));
  return { operator: operatorName, args };
}

export function extractCompoundMetadata(executor, compound) {
  const operator = resolveNameFromNode(executor, compound.operator);
  const args = (compound.args || []).map(a => resolveNameFromNode(executor, a)).filter(a => a !== null);
  return { operator, args };
}

export function extractMetadataWithNotExpansion(executor, stmt, operatorName) {
  if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Reference) {
    const refName = stmt.args[0].name;
    const innerMeta = executor.session.referenceMetadata.get(refName);
    if (innerMeta) {
      return {
        operator: 'Not',
        args: [innerMeta.operator, ...innerMeta.args],
        innerOperator: innerMeta.operator,
        innerArgs: innerMeta.args
      };
    }
  }

  if (operatorName === 'Not' && stmt.args.length === 1 && stmt.args[0] instanceof Compound) {
    const inner = extractCompoundMetadata(executor, stmt.args[0]);
    if (inner.operator) {
      return {
        operator: 'Not',
        args: [inner.operator, ...inner.args],
        innerOperator: inner.operator,
        innerArgs: inner.args
      };
    }
  }

  return extractMetadata(executor, stmt);
}

export function statementToFactString(executor, stmt) {
  const operatorName = resolveNameFromNode(executor, stmt.operator);
  const args = stmt.args.map(arg => resolveNameFromNode(executor, arg)).filter(Boolean);
  return `${operatorName} ${args.join(' ')}`;
}

