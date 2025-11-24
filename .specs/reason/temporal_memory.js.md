# Design Spec: src/reason/temporal_memory.js

Class `TemporalMemory`
- **Role**: Encode time as rotations in conceptual space; maintain rotational working memory; support recall/rollback for temporal/causal reasoning.
- **Pattern**: Stateful buffer manager with pure rotations; SOLID: single responsibility for temporal encoding.
- **Key Collaborators**: `RelationPermuter` (tick permutation), `MathEngine` (rotate), `Config` (rotation seed), `Reasoner`.

## Public API
- `constructor({config, math, permuter})`
- `initState()`: allocate zeroed working memory vector.
- `advance(state, eventVector)`: rotate state by tick permutation then add event (clamped); returns new state.
- `rewind(state, steps)`: apply inverse rotation steps to recover past orientation; bounded by `config.maxTemporalRewindSteps`.
- `diff(stateA, stateB)`: compare states for change detection.

## Pseudocode (comments)
```js
class TemporalMemory {
  constructor({config, math, permuter}) {
    // rotationTable = permuter.register('time_tick', config.get('rotationSeed'))
    // inverseTable = permuter.inverse('time_tick')
  }

  initState() { /* return zero vector from VectorSpace */ }

  advance(state, event) {
    // rotated = math.rotate(temp, state, rotationTable)
    // math.addSaturated(rotated, rotated, event)
    // return rotated
  }

  rewind(state, steps) {
    // apply inverse rotation steps times; deterministic
  }

  diff(a, b) {
    // compute masked L1 or change summary for auditing
  }
}
```

## Notes/Constraints
- Keep rotations deterministic; use config seed.
- No logging inside core methods; caller handles provenance.
- Avoid unbounded history; caller snapshots if needed.
- Rewind operations must respect `maxTemporalRewindSteps` to prevent unbounded work for large `steps` values; callers that need deeper history should rely on checkpointing strategies rather than extremely large rewinds.***
