# Design Spec: src/reason/reasoner.js

ID: DS(/reason/reasoner.js)

Class `Reasoner`
- **Role**: Execute reasoning flows: assemble runtime concepts via `TheoryStack`, evaluate membership/adversarial bounds, support geometric reasoning modes (deductive, abductive, analogical, counterfactual, temporal) and produce graded answers with provenance. Delegates computable relations (math, physics, logic) to external plugins.
- **Pattern**: Service orchestrator. SOLID: single responsibility for reasoning; delegates parsing/encoding/retrieval elsewhere; delegates formal computation to plugins.
- **Key Collaborators**: `TheoryStack`, `ConceptStore`, `MathEngine`, `BoundedDiamond`, `BiasController`, `ValidationEngine`, `TemporalMemory`, `Retriever`, `Config`, `PluginRegistry`, `MathPlugin`.

## Public API
- `constructor(deps)` (includes `config` to access limits such as `maxReasonerIterations`).
- `answer(queryVector, conceptId, {contextStack, mode})`: return {result, band, provenance}.
- `composeConcept(conceptId, stack)`: helper to build runtime diamond (non-mutating).
- `adversarialCheck(vec, diamond)`: sceptic/optimist thresholds.
- `analogical(sourceA, sourceB, targetC)`: delta translation -> candidate diamond via retrieval.
- `abductive(observation, relationName)`: inverse permute + retrieval.
- `counterfactual(conceptId, tempLayer)`: run with temporary stack clone.
- `temporalRecall(memoryState, steps)`: inverse rotation via `TemporalMemory`.

## Pseudocode (comments)
```js
class Reasoner {
  constructor({stack, store, math, bias, retriever, temporal, config}) { /* save deps */ }

  composeConcept(conceptId, stack) {
    // base = store.getConcept(id).diamonds[?]; // select cluster via retrieval if needed
    // return stack.compose(base)
  }

  adversarialCheck(vec, diamond) {
    // dist = math.distanceMaskedL1(vec, diamond)
    // if dist <= radius*0.8 -> TRUE_CERTAIN
    // else if dist <= radius*1.2 -> PLAUSIBLE
    // else FALSE
  }

  answer(queryVec, conceptId, opts) {
    // runtime = composeConcept(conceptId, opts.contextStack || stack)
    // result = adversarialCheck(queryVec, runtime)
    // provenance: active layers, mask used, thresholds
    // return {result, provenance}
  }

  analogical(aVec, bVec, cVec) {
    // delta = bVec - aVec (clamped)
    // pred = cVec + delta (clamped)
    // return retriever.nearest(pred)
  }

  abductive(observation, relation) {
    // hyp = math.inversePermute(observation, permuter.inverse(relation))
    // candidates = retriever.nearest(hyp, {limit: 10})
    //
    // Rank by combined score (see DS:/knowledge/usage_tracking section 5.3):
    // for each candidate:
    //   usageStats = store.getUsageStats(candidate.label)
    //   geometricScore = 1 - (candidate.distance / maxDistance)
    //   priorityScore = usageStats?.priority || 0.5
    //   combinedScore = geometricScore * 0.7 + priorityScore * 0.3
    //
    // return candidates.sortBy(combinedScore, descending)
  }

  counterfactual(conceptId, tempLayer) {
    // clone stack, push tempLayer, run answer
  }

  temporalRecall(state, steps) {
    // return temporal.rewind(state, steps)
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
