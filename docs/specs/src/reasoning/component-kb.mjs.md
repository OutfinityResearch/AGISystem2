# Module: `src/reasoning/component-kb.mjs`

**Purpose:** Maintain a session-local “component index” over facts to accelerate matching and fuzzy retrieval.

Instead of scanning `session.kbFacts` for every query/proof step, ComponentKB keeps secondary indexes such as:

- by operator
- by argument positions (arg0/arg1/arg2…)
- synonyms / canonical representatives (when declared)

This improves both symbolic and holographic engines by reducing candidate sets.

## Integration points

- `Session` owns `session.componentKB` and updates it in `session.addToKB(...)`.
- Query and proof engines use ComponentKB to find candidates quickly, then validate/match.

## Key behaviors

- `addFact(fact)`: indexes a fact’s metadata (`operator`, `args`) and stores references.
- synonym/canonical support: when special facts are observed (e.g., `synonym`, `canonical`, `alias`), ComponentKB updates its mapping tables.

## Metrics

When engines use ComponentKB, the caller should still count:

- KB scan equivalents (index hits are not “free”; they replace a full scan)
- similarity checks when used for fuzzy matching

## Related specs

- `docs/specs/DS/DS05-Basic-Reasoning-Engine.md`
- `docs/specs/DS/DS19-Semantic-Unification.md`
- `docs/specs/DS/DS17-Holographic-Priority-Mode.md`

