# Design Spec: src/reason/reasoner.js

ID: DS(/reason/reasoner.js)

Class `Reasoner`
- **Role**: Execute geometric reasoning flows: assemble runtime concepts via `TheoryStack`, evaluate membership/adversarial bounds, support reasoning modes (deductive, abductive, analogical) and produce graded answers with provenance. Delegates computable relations (math, physics, logic) to external plugins.
- **Pattern**: Service orchestrator. SOLID: single responsibility for reasoning; delegates parsing/encoding/retrieval elsewhere; delegates formal computation to plugins.
- **Key Collaborators**: `TheoryStack`, `ConceptStore`, `MathEngine`, `BoundedDiamond`, `Retriever`, `Config`, `PluginRegistry`, `MathPlugin`, `DimensionRegistry`.

## Public API
- `constructor(deps)` (includes `config` to access limits such as `maxReasonerIterations`).
- `answer(queryVector, conceptId, {contextStack, mask})`: return `{result, band, provenance}`.
- `composeConcept(conceptId, stack)`: helper to build runtime diamond (non-mutating).
- `adversarialCheck(vec, diamond, maskOverride)`: sceptic/optimist threshold evaluation.
- `analogical(sourceA, sourceB, targetC, options)`: delta translation → candidate diamond via retrieval.
- `abductive(observationVector, relationName, options)`: geometric abduction with inverse permute + priority-weighted ranking.
- `deduceIsA(subject, object, contextStack)`: transitive IS_A chain with confidence decay.
- `abductCause(observation, contextStack, options)`: fact-based abduction from CAUSES/CAUSED_BY relations.
- `factExists(subject, relation, object, contextStack)`: direct fact lookup with symmetric/inverse inference and plugin delegation.
- `deduceWithInheritance(subject, relation, object, contextStack)`: property inheritance via IS_A chain.
- `deduceTransitive(subject, relation, object, contextStack)`: generic transitive reasoning for configurable relations.

## Pseudocode (comments)
```js
class Reasoner {
  constructor({stack, store, math, retriever, config, permuter, dimRegistry}) { /* save deps */ }

  composeConcept(conceptId, stack) {
    // base = store.getConcept(id).diamonds[0]
    // if stack has compose method, return stack.compose(base)
    // if stack is array of layers, apply each sequentially
    // return composed diamond
  }

  adversarialCheck(vec, diamond, maskOverride) {
    // dist = math.distanceMaskedL1(vec, diamond, maskOverride)
    // scepticRadius = radius * 0.8
    // optimistRadius = radius * 1.2
    // if dist <= scepticRadius -> TRUE_CERTAIN
    // else if dist <= optimistRadius -> PLAUSIBLE
    // else FALSE
    // return {truth, band, distance, scepticRadius, optimistRadius}
  }

  answer(queryVec, conceptId, opts) {
    // diamond = composeConcept(conceptId, opts.contextStack)
    // check = adversarialCheck(queryVec, diamond, opts.mask)
    // return {result: check.truth, band: check.band, provenance: {...}}
  }

  analogical(aVec, bVec, cVec, options) {
    // delta = bVec - aVec (clamped to [-127, 127])
    // predicted = cVec + delta (saturated)
    // candidates = retriever.nearest(predicted, {k: options.k || 1})
    // bandInfo = adversarialCheck(predicted, best.diamond)
    // return {concept, distance, band, predicted}
  }

  abductive(observationVector, relationName, options) {
    // table = permuter.get(relationName)
    // hypVector = math.inversePermute(observationVector, table)
    // candidates = retriever.nearest(hypVector, {k: k*2})
    //
    // Rank by combined score:
    // geometricScore = 1 - (distance / maxDistance)
    // priorityScore = store.getUsageStats(label)?.priority || 0.5
    // combinedScore = geometricScore * 0.7 + priorityScore * 0.3
    //
    // return {concept, distance, band, hypotheses: rankedTop}
  }

  deduceIsA(subject, object, contextStack) {
    // facts = _getFacts(contextStack)
    // Check DISJOINT_WITH -> return FALSE
    // BFS/DFS through IS_A chain
    // confidence = 0.95^depth
    // return {truth, confidence, method, depth}
  }

  abductCause(observation, contextStack, options) {
    // facts = _getFacts(contextStack)
    // Find CAUSES/CAUSED_BY facts linking to observation
    // BFS for transitive causes if options.transitive
    // Rank by priority score - depth penalty
    // return {hypothesis, band, hypotheses: [...]}
  }

  factExists(subject, relation, object, contextStack) {
    // Check direct fact
    // If computable relation, delegate to pluginRegistry
    // Check explicit negation (NOT_R)
    // Check symmetric relation
    // Check inverse relation via dimRegistry.getRelationProperties
    // return {truth, confidence, method}
  }

  deduceWithInheritance(subject, relation, object, contextStack) {
    // First check factExists for direct/negated
    // Traverse IS_A chain to find inherited properties
    // confidence = 0.95^depth
    // return {truth, confidence, method, inheritedFrom, depth}
  }

  deduceTransitive(subject, relation, object, contextStack) {
    // Check explicit negation
    // BFS/DFS through relation chain
    // confidence = 0.95^depth
    // return {truth, confidence, method, depth}
  }
}
```

## Compute Plugin Integration

The Reasoner integrates with external compute plugins for formal operations that are better handled by deterministic code rather than semantic reasoning.

### Plugin Delegation Flow (in `factExists`)
```js
factExists(subject, relation, object, contextStack) {
  // 1. Check for direct fact first (even for computable relations)
  if (directFactExists) return { truth: 'TRUE_CERTAIN', method: 'direct' };

  // 2. If computable relation, delegate to plugin
  if (pluginRegistry.isComputable(relation)) {
    const subjectValue = pluginRegistry.extractNumericValue(subject, store);
    const objectValue = pluginRegistry.extractNumericValue(object, store);
    if (subjectValue || objectValue) {
      return pluginRegistry.evaluate(relation, subjectValue, objectValue);
      // Returns: { truth, confidence, method: 'computed', plugin: 'math' }
    }
  }

  // 3. Fall through to semantic reasoning
  return { truth: 'UNKNOWN', method: 'no_evidence' };
}
```

### Supported Computable Relations
| Relation | Plugin | Operation |
|----------|--------|-----------|
| LESS_THAN, GREATER_THAN | math | Numeric comparison |
| EQUALS_VALUE | math | Equality with epsilon |
| PLUS, MINUS, TIMES, DIVIDED_BY | math | Arithmetic |
| HAS_VALUE | math | Value extraction |
| CONVERTS_TO, HAS_UNIT | physics | Unit conversion |

### Key Design Principles
- **Facts first**: Direct facts always take precedence over computation
- **Uniform result**: Plugins return same structure as semantic reasoning
- **Graceful fallback**: If value extraction fails, fall through to semantic path
- **Plugin registration**: At construction, Reasoner creates PluginRegistry and registers MathPlugin

## Notes/Constraints
- Deterministic outputs; record active stack and thresholds.
- Keep core flows geometric; text I/O handled elsewhere.
- Avoid storing state in Reasoner; rely on injected dependencies.
- Long-running traversals must respect `maxReasonerIterations` from `Config`. When the limit is exceeded, Reasoner should stop and return a timeout-like outcome (for example `UNKNOWN_TIMEOUT`) rather than blocking indefinitely; this applies to graph expansions (e.g., transitive `IS_A` chains) and any future search-based methods.
- Compute plugins are stateless; they receive inputs and return results without side effects.***
