/**
 * AGISystem2 - Result Formatter
 * @module output/result-formatter
 *
 * Formats query/prove results into natural language.
 * Meta-operators (similar, analogy, difference, induce, bundle, abduce, whatif)
 * are formatted with natural templates including proof traces.
 */

import { textGenerator } from './text-generator.mjs';

/**
 * Format a query result into natural language
 * @param {Object} result - Query result from session.query()
 * @param {string} queryType - Type: 'query' or 'prove'
 * @returns {string} Natural language text
 */
export function formatQueryResult(result, queryType = 'query') {
  if (!result) return 'No result';

  // Check for meta-operator results
  const allResults = result.allResults || [];
  const metaOps = [
    'abduce', 'whatif', 'similar', 'analogy',
    'symbolic_analogy', 'property_analogy',  // analogy variants
    'difference', 'induce', 'bundle', 'deduce',
    'explain'
  ];
  const metaResults = allResults.filter(r => metaOps.includes(r.method));

  if (metaResults.length > 0) {
    return formatMetaOperatorResults(metaResults);
  }

  // Standard bindings formatting
  if (result.bindings && result.bindings.size > 0) {
    return formatBindingsResult(result);
  }

  return 'No results';
}

/**
 * Format meta-operator results with natural templates
 */
function formatMetaOperatorResults(metaResults) {
  const texts = [];

  for (const r of metaResults) {
    const proof = r.proof || {};
    const op = proof.operation || r.method;
    const text = formatSingleMetaResult(op, r, proof);
    if (text) texts.push(text);
  }

  return texts.length > 0 ? texts.join(' ') : 'No results';
}

/**
 * Format a single meta-operator result with natural language
 */
function formatSingleMetaResult(op, result, proof) {
  switch (op) {
    case 'similar':
      return formatSimilar(result, proof);
    case 'analogy':
    case 'symbolic_analogy':
    case 'property_analogy':
      return formatAnalogy(result, proof);
    case 'difference':
      return formatDifference(result, proof);
    case 'induce':
      return formatInduce(result, proof);
    case 'bundle':
      return formatBundle(result, proof);
    case 'abduce':
      return formatAbduce(result, proof);
    case 'whatif':
      return formatWhatif(result, proof);
    case 'deduce':
      return formatDeduce(result, proof);
    case 'explain':
      return formatExplain(result, proof);
    default:
      return `${op}: ${JSON.stringify(proof)}`;
  }
}

/**
 * similar: "Mallet is similar to Hammer. Proof: shared Handle, Head, Pound"
 */
function formatSimilar(result, proof) {
  const entity = proof.entity || getAnswerFromBindings(result.bindings) || 'Unknown';
  const target = proof.target || 'target';
  const shared = proof.sharedProperties || [];

  if (shared.length > 0) {
    return `${entity} is similar to ${target}. Proof: shared ${formatList(shared)}`;
  }

  const similarity = proof.similarity ? `similarity ${(proof.similarity * 100).toFixed(0)}%` : 'properties match';
  return `${entity} is similar to ${target}. Proof: ${similarity}`;
}

/**
 * analogy: "Truck is to Haul as Bicycle is to Transport. Proof: Truck can Haul maps to Bicycle can Transport"
 */
function formatAnalogy(result, proof) {
  const mapping = proof.mapping || '';
  const relation = proof.relation || 'relation';

  // Parse mapping like "Truck:Haul :: Bicycle:Transport"
  if (mapping.includes('::')) {
    const [left, right] = mapping.split('::').map(s => s.trim());
    const [a, b] = left.split(':').map(s => s.trim());
    const [c, d] = right.split(':').map(s => s.trim());
    // Build descriptive proof: "Truck can Haul maps to Bicycle can Transport"
    const proofText = `${a} ${relation} ${b} maps to ${c} ${relation} ${d}`;
    return `${a} is to ${b} as ${c} is to ${d}. Proof: ${proofText}`;
  }

  // Fallback: get answer from bindings
  const answer = getAnswerFromBindings(result.bindings) || 'Unknown';
  return `Analogy result: ${answer}. Proof: proportional reasoning`;
}

/**
 * difference: "Car differs from Truck. Proof: Car has Engine, Seats. Truck has Bed, Haul."
 */
function formatDifference(result, proof) {
  const entityA = proof.entityA || 'A';
  const entityB = proof.entityB || 'B';
  const uniqueA = proof.uniqueToA || [];
  const uniqueB = proof.uniqueToB || [];

  const featuresA = uniqueA.map(p => p.value || p).filter(Boolean);
  const featuresB = uniqueB.map(p => p.value || p).filter(Boolean);

  let text = `${entityA} differs from ${entityB}. Proof:`;
  if (featuresA.length > 0) {
    text += ` ${entityA} has ${formatList(featuresA)}.`;
  }
  if (featuresB.length > 0) {
    text += ` ${entityB} has ${formatList(featuresB)}.`;
  }
  if (featuresA.length === 0 && featuresB.length === 0) {
    text += ' no unique properties found.';
  }

  return text;
}

/**
 * induce: "Dog, Cat, Bird share Animal, Vertebrate. Proof: intersection of properties"
 */
function formatInduce(result, proof) {
  const sources = proof.sources || [];
  const common = proof.common || [];

  const commonValues = common.map(p => p.value || p).filter(Boolean);
  const sourceList = formatList(sources);

  if (commonValues.length > 0) {
    return `${sourceList} share ${formatList(commonValues)}. Proof: intersection of ${sourceList} properties`;
  }

  return `${sourceList} have no common properties. Proof: empty intersection`;
}

/**
 * bundle: "Sparrow and Hawk combined can Fly, Hunt, Chirp. Proof: union of properties"
 */
function formatBundle(result, proof) {
  const sources = proof.sources || [];
  const combined = proof.combined || [];

  const combinedValues = combined.map(p => p.value || p).filter(Boolean);
  const sourceList = formatList(sources);

  if (combinedValues.length > 0) {
    return `${sourceList} combined have ${formatList(combinedValues)}. Proof: union of ${sourceList} properties`;
  }

  return `${sourceList} combined have no properties. Proof: empty union`;
}

/**
 * abduce: "WetGrass is explained by Rain. Proof: Rain causes WetGrass."
 */
function formatAbduce(result, proof) {
  const observed = proof.observed || 'Observation';
  const cause = proof.cause || getAnswerFromBindings(result.bindings) || 'Unknown';
  const explanation = proof.explanation || `${cause} causes ${observed}`;
  const confidence = typeof proof.confidence === 'number'
    ? proof.confidence
    : (typeof result?.score === 'number' ? result.score : null);

  const confText = typeof confidence === 'number' ? ` (confidence=${confidence.toFixed(2)})` : '';
  return `${observed} is explained by ${cause}. Proof: ${explanation}${confText}`;
}

/**
 * whatif: "If Rain did not occur, WetGrass would be uncertain. Proof: causal chain"
 */
function formatWhatif(result, proof) {
  const negated = proof.negated || 'event';
  const affected = proof.affected || 'outcome';
  const outcome = proof.outcome || 'uncertain';
  const paths = proof.paths || [];
  const confidence = typeof proof.confidence === 'number'
    ? proof.confidence
    : (typeof result?.score === 'number' ? result.score : null);

  const outcomeText = outcome === 'would_fail' ? 'would not occur' :
                      outcome === 'unchanged' ? 'would be unchanged' :
                      'would be uncertain';

  const pathDesc = paths.length > 0
    ? paths.map(p => p.path?.join(' → ')).filter(Boolean).join('; ')
    : `${negated} → ${affected}`;

  const confText = typeof confidence === 'number' ? ` (confidence=${confidence.toFixed(2)})` : '';
  return `If ${negated} did not occur, ${affected} ${outcomeText}. Proof: ${pathDesc}${confText}`;
}

/**
 * deduce: "From Dog, deduce has Dog Fur. Proof: r1 via isA Dog Mammal"
 */
function formatDeduce(result, proof) {
  const source = proof.source || 'source';
  const conclusion = proof.conclusion || getAnswerFromBindings(result.bindings) || 'Unknown';
  const chain = proof.chain || [];
  const filter = proof.filter || '';

  // Format conclusion as triple if it's an object
  let conclusionText = conclusion;
  if (typeof conclusion === 'object' && conclusion.operator) {
    const args = conclusion.args?.join(' ') || '';
    conclusionText = `${conclusion.operator} ${args}`.trim();
  }

  // Format proof chain
  let proofText = '';
  if (chain.length > 0) {
    const chainSteps = chain.map(step => {
      if (typeof step === 'string') return step;
      if (step.rule) return step.rule;
      if (step.fact) return step.fact;
      return JSON.stringify(step);
    });
    proofText = chainSteps.join(' via ');
  } else if (proof.derivedFrom) {
    proofText = proof.derivedFrom;
  } else {
    proofText = 'forward chaining';
  }

  return `From ${source}, deduce ${conclusionText}. Proof: ${proofText}`;
}

/**
 * explain: "Explanation for X: ... Proof: ... (confidence=...)"
 */
function formatExplain(result, proof) {
  const goal = proof.goal || proof.target || 'goal';
  const via = proof.via || 'prove';
  const explanation = proof.explanation || getAnswerFromBindings(result.bindings) || 'No explanation.';
  const confidence = typeof proof.confidence === 'number'
    ? proof.confidence
    : (typeof result?.score === 'number' ? result.score : null);
  const confText = typeof confidence === 'number' ? ` (confidence=${confidence.toFixed(2)})` : '';
  return `Explanation for ${goal}. Proof: ${explanation} (via ${via})${confText}`;
}

/**
 * Format a prove result into natural language
 * @param {Object} proof - Prove result from session.prove()
 * @returns {string} Natural language text
 */
export function formatProveResult(proof) {
  return textGenerator.elaborate(proof).fullProof ||
         textGenerator.elaborate(proof).text;
}

/**
 * Format standard bindings result
 */
function formatBindingsResult(result) {
  const texts = [];

  for (const [varName, binding] of result.bindings) {
    const answer = binding?.answer || binding?.value || binding;
    if (answer && typeof answer === 'string') {
      texts.push(`${varName} = ${answer}`);
    }
  }

  return texts.length > 0 ? texts.join(', ') : 'No bindings';
}

/**
 * Get answer value from bindings Map
 */
function getAnswerFromBindings(bindings) {
  if (!bindings) return null;

  if (bindings instanceof Map) {
    for (const [k, v] of bindings) {
      if (v?.answer) return v.answer;
      if (typeof v === 'string') return v;
    }
  }

  return null;
}

/**
 * Format a list of items naturally: "A, B, and C" or "A and B"
 */
function formatList(items) {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  const last = items[items.length - 1];
  const rest = items.slice(0, -1);
  return `${rest.join(', ')}, and ${last}`;
}

/**
 * Main format function for Session integration
 * @param {Object} result - Result from query() or prove()
 * @param {string} type - 'query' or 'prove'
 * @returns {string} Natural language text
 */
export function format(result, type = 'query') {
  if (type === 'prove') {
    return formatProveResult(result);
  }
  return formatQueryResult(result, type);
}

export default { format, formatQueryResult, formatProveResult };
