# `src/hdc/context.mjs`

## Purpose

Defines the **session-local HDC context** used by the runtime (IoC). This module is the boundary between:

- the **strategy registry** (`src/hdc/strategies/index.mjs`) which returns *base* strategy objects, and
- the **Session universe** which may require a *fresh per-session strategy instance*.

Some strategies are stateless and can be shared. Others (notably **EXACT**) require per-session state (allocator/dictionary).

## Key idea: `createInstance()` (optional)

If a strategy exports:

```js
createInstance({ strategyId, geometry, session })
```

then `createHDCContext()` MUST call it and use the returned instance for all HDC ops in that session.

This prevents process-global leakage when multiple Sessions are created sequentially (evaluation runners) or concurrently (server mode).

## Exports

- `createHDCContext({ strategyId, geometry, session? })`

Returns an object with:

- `strategyId`, `geometry`, `strategy` (the chosen instance)
- factory methods: `createZero`, `createRandom`, `createFromName`, `deserialize`
- ops: `bind`, `bindAll`, `bundle`, `unbind`, `similarity`, `distance`, `topKSimilar`
- utils: `clone`, `equals`, `serialize`, `serializeKB`, `deserializeKB`

## Attached strategy instance tagging

Vectors returned by context methods may be tagged with a non-enumerable property:

- `__sys2StrategyInstance`

This lets the facade dispatch subsequent ops through the correct per-session instance when vectors are passed around.

## Runtime integration

- `Session` constructs `session.hdc = createHDCContext({ ..., session })`.
- `Vocabulary.getOrCreate()` prefers `session.hdc.createFromName()` over process-global facade calls so stateful strategies remain session-local.

## Related specs

- `docs/specs/DS/DS26-Session-Universe.md`
- `docs/specs/DS/DS25-Exact-Sparse-Bitset-Polynomial-HDC.md`

