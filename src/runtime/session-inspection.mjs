import { bind, similarity, topKSimilar } from '../core/operations.mjs';
import { removePosition } from '../core/position.mjs';

export function extractArguments(session, vector, operatorName) {
  const opVec = session.vocabulary.get(operatorName);
  const remainder = bind(vector, opVec);

  const args = [];
  for (let pos = 1; pos <= 5; pos++) {
    const extracted = removePosition(pos, remainder);
    const matches = topKSimilar(extracted, session.vocabulary.atoms, 3);

    if (matches.length > 0 && matches[0].similarity > 0.45) {
      args.push({
        position: pos,
        value: matches[0].name,
        confidence: matches[0].similarity,
        alternatives: matches.slice(1).map(m => ({ value: m.name, confidence: m.similarity }))
      });
    }
  }

  return args;
}

export function decodeVector(session, vector) {
  const operatorCandidates = [];

  for (const [name, opVec] of session.operators) {
    const sim = similarity(vector, opVec);
    if (sim > 0.4) operatorCandidates.push({ name, similarity: sim });
  }

  for (const [name, atomVec] of session.vocabulary.entries()) {
    if (!session.operators.has(name)) {
      const sim = similarity(vector, atomVec);
      if (sim > 0.5) operatorCandidates.push({ name, similarity: sim });
    }
  }

  if (operatorCandidates.length === 0) {
    return { success: false, reason: 'No operator found' };
  }

  operatorCandidates.sort((a, b) => b.similarity - a.similarity);
  const operator = operatorCandidates[0];
  const args = extractArguments(session, vector, operator.name);

  return {
    success: true,
    structure: {
      operator: operator.name,
      operatorConfidence: operator.similarity,
      arguments: args,
      confidence: operator.similarity
    }
  };
}

export function summarizeVector(session, vector) {
  const decoded = decodeVector(session, vector);
  if (!decoded.success) return { success: false, text: 'Unable to decode' };

  const { operator, arguments: args } = decoded.structure;
  const text = session.generateText(operator, args);
  return { success: true, text, structure: decoded.structure };
}

