# Module: `src/reasoning/holographic/prove-hdc-first.mjs`

**Purpose:** HDC-first proof engine used under `reasoningPriority: 'holographicPriority'`.

It performs backward chaining with HDC retrieval for candidate facts/rules, and symbolic validation to ensure correctness and to produce proof objects/traces.

## Integration

- constructed via `createProofEngine(session)` (`src/reasoning/index.mjs`)
- uses the same HDC-first building blocks as holographic query (UNBIND + decode + validate)
- records proof stats into `session.reasoningStats` (including `hdcEquivalentOps` / `hdcUsefulOps`).

## Strategy hooks

If provided by the active strategy, the engine may use:

- `strategy.decodeUnboundCandidates(...)` for hole/domain extraction

This matters for EXACT and other non-XOR strategies.

## Related specs

- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`
- `docs/specs/DS/DS05-Basic-Reasoning-Engine.md`

