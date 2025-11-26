# Suite: usage_tracking

ID: DS(/tests/usage_tracking/runSuite)

Scope: Tests usage tracking mechanisms from DS(/knowledge/usage_tracking) - counters, timestamps, and priority scoring.

Fixtures: Fresh session with configurable usage thresholds.

Profile: `auto_test`.

Steps/Assertions:

## Counter Increments

- Assert counter:
  - `@f ASSERT Dog IS_A animal` increments Dog's assertCount
  - Second assertion increments count again
  - Verify `usageCount >= assertCount`

- Query counter:
  - `@q ASK Dog IS_A animal` increments Dog's queryCount
  - Multiple queries increment proportionally
  - Verify queryCount reflects actual query count

- Inference counter:
  - When reasoning chain involves concept, inferenceCount increases
  - `Dog IS_A animal; animal IS_A living_thing` - querying Dog->living_thing increments Dog's inferenceCount

## Timestamp Tracking

- Creation timestamp:
  - New concept gets `createdAt` timestamp
  - Timestamp is stable (doesn't change on updates)

- Last used timestamp:
  - `lastUsedAt` updates on each usage
  - Query updates lastUsedAt
  - Assert updates lastUsedAt
  - Verify timestamp increases monotonically

## Priority Scoring

- Frequency score:
  - Frequently used concepts have higher `frequency` score
  - Score normalized to 0-1 range
  - Verify ranking reflects usage counts

- Recency score:
  - Recently used concepts have higher `recency` score
  - Score decays with time since last use
  - Verify recent concepts rank higher

- Combined priority:
  - `priority = f(frequency, recency)` combines both
  - Verify ordering for search results uses priority
  - High-use + recent concepts rank highest

## Sys2DSL Integration

- USAGE_STATS command:
  - `@stats USAGE_STATS concept=Dog` returns usage metrics
  - Verify all counters are present in response

- CONCEPTS_BY_USAGE command:
  - `@top CONCEPTS_BY_USAGE limit=10 order=frequency` returns top concepts
  - Verify ordering matches frequency scores

Sample Outputs:
- Usage stats: `{usageCount: 15, assertCount: 5, queryCount: 10, createdAt: "...", lastUsedAt: "..."}`
- Priority scores: `{frequency: 0.85, recency: 0.92, priority: 0.88}`
- Top concepts: ordered list by specified metric
