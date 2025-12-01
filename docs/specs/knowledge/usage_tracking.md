# Design Spec: Usage Tracking and Prioritization

ID: DS(/knowledge/usage_tracking)

Status: DRAFT v1.1

## Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| Per-concept usage metrics | ✅ ACTIVE | `ConceptStore._usageMetrics` |
| Priority calculation | ✅ ACTIVE | `ConceptStore.getUsageStats()` |
| GET_USAGE command | ✅ ACTIVE | `DSLCommandsMemory.cmdGetUsage()` |
| BOOST command | ✅ ACTIVE | `DSLCommandsMemory.cmdBoost()` |
| FORGET command | ✅ ACTIVE | `DSLCommandsMemory.cmdForget()` |
| PROTECT/UNPROTECT | ✅ ACTIVE | `DSLCommandsMemory.cmdProtect()` |
| Retrieval ordering by priority | ⚠️ PLANNED | See section 5.1 |
| HYPOTHESIZE ranking by priority | ⚠️ PLANNED | See section 5.3 |
| ABDUCT ranking by priority | ⚠️ PLANNED | For abductive reasoning |

## 1. Overview

This document specifies the usage tracking system that monitors how often concepts, facts, and relations are used. This data enables:

1. **Prioritization**: Frequently used concepts appear first in search results
2. **Forgetting**: Unused concepts can be removed to manage memory
3. **Learning**: The system learns which knowledge is valuable
4. **Hypothesis Ranking**: In abductive reasoning, higher-priority concepts make more likely explanations

### 1.1 Design Principles

- **Automatic**: Usage tracking happens transparently during normal operations
- **Lightweight**: Minimal overhead on query/assertion performance
- **Deterministic**: Same sequence of operations = same usage counts
- **Configurable**: Thresholds and behaviors are configurable per profile

### 1.2 Related Documents

- DS(/knowledge/forgetting) - Forgetting mechanisms
- DS(/knowledge/concept_store.js) - Concept storage
- DS(/theory/Sys2DSL_commands) - Commands that affect usage
- DS(/reason/abductive) - Abductive reasoning (uses priority for ranking)

---

## 2. Usage Metrics

### 2.1 Per-Concept Metrics

Each concept tracks:

```javascript
{
  // Core counters
  usageCount: number,        // Total usage (sum of below)
  assertCount: number,       // Times used in ASSERT (as subject or object)
  queryCount: number,        // Times used in ASK, FACTS_MATCHING
  inferenceCount: number,    // Times involved in reasoning chains

  // Temporal data
  createdAt: timestamp,      // When concept was first created
  lastUsedAt: timestamp,     // Most recent usage

  // Derived metrics (computed on demand)
  recency: number,           // Normalized recency score (0-1)
  frequency: number,         // Normalized frequency score (0-1)
  priority: number           // Combined score for ranking
}
```

### 2.2 Per-Relation Metrics

Each relation tracks:

```javascript
{
  usageCount: number,        // Total times used in facts
  factCount: number,         // Number of facts using this relation
  lastUsedAt: timestamp,
  createdAt: timestamp       // For custom relations
}
```

### 2.3 Per-Fact Metrics

Each fact tracks:

```javascript
{
  usageCount: number,        // Times this specific fact was accessed
  queryCount: number,        // Times returned in query results
  inferenceCount: number,    // Times used in reasoning chains
  createdAt: timestamp,
  lastUsedAt: timestamp
}
```

---

## 3. Tracking Rules

### 3.1 When Counters Increment

| Operation | Subject | Object | Relation | Fact |
|-----------|---------|--------|----------|------|
| ASSERT | +1 assertCount | +1 assertCount | +1 usageCount | created |
| RETRACT | - | - | - | deleted |
| ASK | +1 queryCount | +1 queryCount | +1 usageCount | - |
| FACTS_MATCHING | +1 per match | +1 per match | +1 per match | +1 per match |
| BIND_CONCEPT | +1 queryCount | - | - | - |
| HYPOTHESIZE | +1 inferenceCount | +1 inferenceCount | +1 usageCount | - |
| PROVE | +1 inferenceCount | +1 inferenceCount | +1 usageCount | +1 per used |
| ABDUCT | +1 inferenceCount | - | +1 usageCount | - |

### 3.2 Timestamp Updates

`lastUsedAt` is updated on ANY access:
- Query (ASK, FACTS_MATCHING)
- Assertion (ASSERT)
- Binding (BIND_CONCEPT, BIND_RELATION)
- Reasoning (PROVE, HYPOTHESIZE, ABDUCT)

### 3.3 Inheritance

When a fact `A IS_A B` is queried:
- Both A and B get queryCount incremented
- The relation IS_A gets usageCount incremented
- If transitive chain is followed (A IS_A B IS_A C), all get incremented

---

## 4. Priority Calculation

### 4.1 Priority Formula (Current Implementation)

The **active implementation** in `ConceptStore.getUsageStats()` uses:

```javascript
// Actual implementation in concept_store.js:301-320
priority = (recency * 0.4) + (frequency * 0.6)

where:
  recency = Math.max(0, 1 - (recencyDays / 30))   // Decays over 30 days
  frequency = Math.min(1, Math.log10(usageCount + 1) / 3)  // Log scale, max ~1000 uses
```

### 4.2 Planned Extended Formula

Future versions may extend to include importance:

```javascript
priority = (α * frequency) + (β * recency) + (γ * importance)

where:
  frequency = normalize(usageCount, maxUsageCount)
  recency = 1 - (daysSinceLastUse / maxDaysTracked)
  importance = baseImportance + inferenceCount * inferenceWeight

  α = 0.4  // frequency weight
  β = 0.3  // recency weight
  γ = 0.3  // importance weight
```

### 4.3 Normalization

```javascript
normalize(value, max) = Math.min(1.0, value / max)

// maxUsageCount is the highest usageCount in the store
// This makes frequency relative to the most-used concept
```

### 4.4 Configuration

```javascript
// In config profile:
{
  usageTracking: {
    enabled: true,
    frequencyWeight: 0.4,      // α
    recencyWeight: 0.3,        // β
    importanceWeight: 0.3,     // γ
    maxDaysTracked: 365,       // for recency calculation
    inferenceWeight: 2.0,      // bonus for inference usage
    minUsageForPriority: 1     // ignore concepts with usage below this
  }
}
```

---

## 5. Impact on Operations

### 5.1 Retrieval Ordering (⚠️ PLANNED)

**Status**: Not yet integrated. Currently `Retriever.nearest()` uses only geometric distance.

When integrated, `Retriever.nearest()` should find multiple candidates and combine scores:

```javascript
// Current: sorted by geometric distance only
candidates.sort((a, b) => a.distance - b.distance)

// Planned: combined score with usage priority
candidates.sort((a, b) => {
  const scoreA = (1 - a.distance) * 0.7 + a.priority * 0.3
  const scoreB = (1 - b.distance) * 0.7 + b.priority * 0.3
  return scoreB - scoreA
})
```

### 5.2 FACTS_MATCHING Results (⚠️ PLANNED)

Results should be ordered by:
1. Pattern match relevance
2. Usage priority (higher first)
3. Recency (more recent first)

### 5.3 HYPOTHESIZE/ABDUCT Ranking (⚠️ PLANNED - Key Use Case)

**This is the primary purpose of usage priority in reasoning.**

In abductive reasoning (finding explanations for observations), hypotheses should be ranked by:
1. Geometric plausibility (does the hypothesis geometrically explain the observation?)
2. **Usage priority** (frequently used concepts are more likely explanations)
3. Recency (recently discussed concepts are more contextually relevant)

Example: When explaining "John has fever":
- If "Flu" has priority=0.8 (frequently discussed in medical context)
- And "Malaria" has priority=0.3 (rarely mentioned)
- Both are plausible causes, but "Flu" ranks higher as more likely hypothesis

**Integration point**: `Reasoner.abduct()` should call `conceptStore.getUsageStats()` to weight candidates.

---

## 6. Storage

### 6.1 In-Memory Structure

```javascript
// ConceptStore extension
class ConceptStore {
  // Existing...
  concepts: Map<string, BoundedDiamond[]>

  // New: usage metadata
  usageStats: Map<string, UsageStats>
}

interface UsageStats {
  usageCount: number
  assertCount: number
  queryCount: number
  inferenceCount: number
  createdAt: number      // Unix timestamp
  lastUsedAt: number     // Unix timestamp
}
```

### 6.2 Persistence Format

Extended binary format for concepts:

```
[Magic: 4 bytes] [Version: 2 bytes] [Flags: 2 bytes]
[ConceptCount: 4 bytes]

Per concept:
  [LabelLength: 2 bytes] [Label: variable]
  [UsageCount: 4 bytes]
  [AssertCount: 4 bytes]
  [QueryCount: 4 bytes]
  [InferenceCount: 4 bytes]
  [CreatedAt: 8 bytes]
  [LastUsedAt: 8 bytes]
  [DiamondCount: 2 bytes]
  Per diamond:
    [Min: dims bytes] [Max: dims bytes] [Center: dims bytes]
    [Radius: 1 byte] [RelevanceMask: dims/8 bytes]
```

### 6.3 Audit Log Integration

Usage changes are logged:

```javascript
// AuditLog entry for usage update
{
  type: 'USAGE_UPDATE',
  timestamp: number,
  conceptId: string,
  operation: 'ASSERT' | 'QUERY' | 'INFERENCE',
  previousCount: number,
  newCount: number
}
```

---

## 7. Sys2DSL Commands

### 7.1 GET_USAGE

```sys2dsl
@stats GET_USAGE water

# Returns:
# {
#   label: "water",
#   usageCount: 1547,
#   assertCount: 23,
#   queryCount: 1489,
#   inferenceCount: 35,
#   createdAt: "2024-01-15T10:30:00Z",
#   lastUsedAt: "2024-03-20T14:22:15Z",
#   priority: 0.87
# }
```

### 7.2 BOOST

Manually increase usage count:

```sys2dsl
@result BOOST water 100

# Adds 100 to usageCount
# Use for: marking concepts as important
```

### 7.3 RESET_USAGE

Reset usage counters (admin operation):

```sys2dsl
@result RESET_USAGE water
@result RESET_USAGE ALL    # Reset all - dangerous!
```

---

## 8. Configuration Profiles

### 8.1 Default Profile

```javascript
{
  usageTracking: {
    enabled: true,
    frequencyWeight: 0.4,
    recencyWeight: 0.3,
    importanceWeight: 0.3,
    maxDaysTracked: 365,
    inferenceWeight: 2.0
  }
}
```

### 8.2 High-Memory Profile (no forgetting)

```javascript
{
  usageTracking: {
    enabled: true,
    // ... same weights
    // Forgetting disabled in forgetting.md config
  }
}
```

### 8.3 Aggressive-Cleanup Profile

```javascript
{
  usageTracking: {
    enabled: true,
    frequencyWeight: 0.5,    // More emphasis on frequency
    recencyWeight: 0.4,      // More emphasis on recency
    importanceWeight: 0.1,   // Less on base importance
    maxDaysTracked: 30       // Shorter memory
  }
}
```

### 8.4 Test Profile (disabled)

```javascript
{
  usageTracking: {
    enabled: false    // For deterministic testing without usage effects
  }
}
```

---

## 9. Implementation Notes

### 9.1 Performance Considerations

- Counter updates are O(1) hash table operations
- Priority calculation is lazy (computed on demand, cached)
- Batch updates for bulk operations (e.g., loading a theory)
- Usage stats are persisted periodically, not on every operation

### 9.2 Determinism

Usage tracking affects ordering but NOT truth values:
- ASK returns same truth regardless of usage
- Only ranking/ordering changes
- For strict determinism in tests, disable usage tracking

### 9.3 Concurrency

- Counters use atomic increment operations
- Multiple sessions may increment the same concept
- Final count is sum of all increments (commutative)

---

## 10. Examples

### 10.1 Basic Usage Flow

```sys2dsl
# Initial state: water has usageCount = 0

@f1 ASSERT Water IS_A liquid
# water.assertCount = 1, water.usageCount = 1

@q1 ASK Water IS_A substance
# water.queryCount = 1, water.usageCount = 2

@q2 ASK Water CAUSES hydration
# water.queryCount = 2, water.usageCount = 3

@stats GET_USAGE water
# Returns: usageCount = 3, assertCount = 1, queryCount = 2
```

### 10.2 Priority Affecting Retrieval

```sys2dsl
# Two concepts at similar distance but different usage
# "water" has usageCount = 1000
# "h2o" has usageCount = 5

@results INSTANCES_OF liquid

# Results ordered:
# 1. Water (high usage, appears first)
# 2. h2o (low usage, appears later)
# Even if h2o is slightly closer geometrically
```

### 10.3 Inference Boosting

```sys2dsl
# "cause_of_fire" used in proving something
@proof PROVE fire REQUIRES oxygen

# During proof, "oxygen" used in inference chain
# oxygen.inferenceCount += 1
# This boosts oxygen's importance score
```

---

## 11. Related Documents

- DS(/knowledge/forgetting) - Using usage data for cleanup
- DS(/knowledge/concept_store.js) - Storage implementation
- DS(/support/config.js) - Configuration options
- DS(/support/storage.js) - Persistence format
