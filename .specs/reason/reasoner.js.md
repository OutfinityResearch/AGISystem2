# Design Spec: src/reason/reasoner.js

Class `Reasoner`
- **Role**: Execute reasoning flows: assemble runtime concepts via `TheoryStack`, evaluate membership/adversarial bounds, support geometric reasoning modes (deductive, abductive, analogical, counterfactual, temporal) and produce graded answers with provenance.
- **Pattern**: Service orchestrator. SOLID: single responsibility for reasoning; delegates parsing/encoding/retrieval elsewhere.
- **Key Collaborators**: `TheoryStack`, `ConceptStore`, `MathEngine`, `BoundedDiamond`, `BiasController`, `ValidationEngine`, `TemporalMemory`, `Retriever`, `Config`.

## Public API
- `constructor(deps)`
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
    // return retriever.nearest(hyp)
  }

  counterfactual(conceptId, tempLayer) {
    // clone stack, push tempLayer, run answer
  }

  temporalRecall(state, steps) {
    // return temporal.rewind(state, steps)
  }
}
```

## Notes/Constraints
- Deterministic outputs; record active stack and thresholds.
- Keep core flows geometric; text I/O handled elsewhere.
- Avoid storing state in Reasoner; rely on injected dependencies.***
