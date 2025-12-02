# Design Spec: Forgetting Mechanisms

ID: DS(/knowledge/forgetting)

Status: DRAFT v1.0

## 1. Overview

The forgetting system enables controlled removal of unused or low-priority knowledge from the system. This is essential for:

1. **Memory Management**: Prevent unbounded growth of concept store
2. **Relevance**: Keep active knowledge focused on useful concepts
3. **Performance**: Faster retrieval with smaller, more relevant dataset
4. **Cognitive Realism**: Mimic human memory decay patterns

### 1.1 Design Principles

- **Explicit Control**: Forgetting only happens via explicit command or scheduled cleanup
- **Reversible**: Forgotten concepts can be re-learned (not permanently deleted from audit)
- **Threshold-Based**: Clear, configurable thresholds determine what gets forgotten
- **Safe Defaults**: Conservative defaults prevent accidental data loss

### 1.2 Related Documents

- DS(/knowledge/usage_tracking) - Usage data that drives forgetting decisions
- DS(/knowledge/concept_store.js) - Where concepts are stored
- DS(/support/audit_log.js) - Audit trail of forgotten items

---

## 2. Forgetting Criteria

### 2.1 Usage-Based Forgetting

Forget concepts where `usageCount < threshold`:

```sys2dsl
@forgotten FORGET threshold=5
# Removes all concepts with usageCount < 5
```

### 2.2 Time-Based Forgetting

Forget concepts not used within a time period:

```sys2dsl
@forgotten FORGET older_than=30d
# Removes concepts where (now - lastUsedAt) > 30 days
```

### 2.3 Combined Criteria

Both conditions must be met:

```sys2dsl
@forgotten FORGET threshold=10 older_than=7d
# Removes concepts with usageCount < 10 AND not used in 7 days
```

### 2.4 Explicit Forgetting

Remove specific concept:

```sys2dsl
@forgotten FORGET concept=obsolete_term
# Removes the specific concept "obsolete_term"
```

---

## 3. Protection Mechanisms

### 3.1 Protected Concepts

Some concepts cannot be forgotten:

```javascript
// Protected categories:
const PROTECTED = {
  coreRelations: true,      // IS_A, CAUSES, HAS_PROPERTY, etc.
  baseTheoryConcepts: true, // Concepts from loaded base theories
  recentlyCreated: true,    // Concepts created in last N hours
  manuallyBoosted: true,    // Concepts with BOOST applied
  inActiveTheory: true      // Concepts referenced in current working theory
}
```

### 3.2 Minimum Retention

Configuration can specify minimum concepts to retain:

```javascript
{
  forgetting: {
    minConceptCount: 1000,  // Never go below this many concepts
    protectedLabels: ['water', 'human', 'time'],  // Never forget these
    protectionPeriod: 24 * 60 * 60 * 1000  // 24 hours after creation
  }
}
```

### 3.3 Dry Run Mode

Preview what would be forgotten:

```sys2dsl
@preview FORGET threshold=5 dry_run=true

# Returns list of concepts that WOULD be forgotten
# Does not actually delete anything
```

---

## 4. Forgetting Process

### 4.1 Selection Phase

1. Query all concepts from ConceptStore
2. Filter by criteria (threshold, age, etc.)
3. Exclude protected concepts
4. Sort by priority (lowest first)
5. If count > limit, truncate to limit

### 4.2 Validation Phase

1. Check if any concept is referenced by protected facts
2. Check if removal would break consistency
3. Generate dependency report

### 4.3 Execution Phase

1. Log each concept to be forgotten to AuditLog
2. Remove from ConceptStore
3. Remove associated facts
4. Update LSH indices
5. Return summary

### 4.4 Audit Trail

Every forgotten concept is logged:

```javascript
{
  type: 'CONCEPT_FORGOTTEN',
  timestamp: number,
  conceptId: string,
  label: string,
  reason: 'threshold' | 'age' | 'explicit' | 'scheduled',
  usageCount: number,
  lastUsedAt: number,
  factCount: number,  // facts also removed

  // For potential recovery
  snapshot: {
    diamonds: [...],
    relations: [...],
    facts: [...]
  }
}
```

---

## 5. Recovery

### 5.1 From Audit Log

Forgotten concepts can be recovered from audit:

```sys2dsl
@recovered RECOVER concept=forgotten_term
# Searches audit log, restores if found
```

### 5.2 Re-Learning

More common: concept is re-created through new assertions:

```sys2dsl
# "rare_element" was forgotten
# User asserts it again:
@_ Rare_Element IS_A element

# Concept is re-created fresh
# Previous usage history is NOT restored
```

### 5.3 Limitations

- Recovery only possible within audit retention period
- Restored concepts start with usageCount = 1
- Facts must be re-asserted manually

---

## 6. Scheduled Forgetting

### 6.1 Automatic Cleanup

Configuration can enable periodic cleanup:

```javascript
{
  forgetting: {
    scheduled: {
      enabled: true,
      interval: '24h',        // Run every 24 hours
      threshold: 3,           // Forget if usageCount < 3
      olderThan: '30d',       // AND not used in 30 days
      maxPerRun: 100,         // Limit per cleanup run
      dryRunFirst: true       // Log what would happen before doing it
    }
  }
}
```

### 6.2 Triggers

Cleanup can also be triggered by:
- Memory pressure (concept count exceeds limit)
- Session end (optional)
- Explicit command

### 6.3 Notifications

When scheduled forgetting runs:

```javascript
{
  type: 'SCHEDULED_FORGET_COMPLETE',
  timestamp: number,
  conceptsForgotten: number,
  factsForgotten: number,
  durationMs: number,
  nextScheduled: timestamp
}
```

---

## 7. Decay Models

### 7.1 Simple Threshold

Default model: binary decision based on usageCount:

```javascript
shouldForget(concept) {
  return concept.usageCount < threshold
}
```

### 7.2 Exponential Decay (Optional)

More sophisticated model mimicking memory decay:

```javascript
// Effective usage decays over time
effectiveUsage(concept) {
  const daysSinceUse = (now - concept.lastUsedAt) / MS_PER_DAY
  const decayFactor = Math.exp(-daysSinceUse / halfLifeDays)
  return concept.usageCount * decayFactor
}

shouldForget(concept) {
  return effectiveUsage(concept) < threshold
}
```

### 7.3 Configuration

```javascript
{
  forgetting: {
    decayModel: 'simple' | 'exponential',

    // For exponential decay:
    halfLifeDays: 30,  // Usage halves every 30 days

    // For simple:
    // Just uses threshold directly
  }
}
```

---

## 8. Impact on System

### 8.1 Consistency

When a concept is forgotten:
- All facts involving it are also removed
- References in other facts become dangling (cleaned up)
- Theory layers referencing it are updated

### 8.2 Active Sessions

If a concept is forgotten while a session is using it:
- Session continues with cached data
- Next query may return UNKNOWN
- No errors, but results may change

### 8.3 Theories

Forgetting does NOT affect:
- Saved theory files (Sys2DSL text)
- Base theories
- Theory definitions

It only affects:
- Runtime concept store
- Working theory overlay
- LSH indices

---

## 9. Sys2DSL Commands

### 9.1 FORGET

```sys2dsl
# By threshold
@result FORGET threshold=5

# By age
@result FORGET older_than=30d

# Combined
@result FORGET threshold=10 older_than=7d

# Specific concept
@result FORGET concept=obsolete_term

# Dry run
@result FORGET threshold=5 dry_run=true

# With limit
@result FORGET threshold=5 limit=100
```

**Returns:**

```javascript
{
  ok: boolean,
  dryRun: boolean,
  criteria: {
    threshold: number,
    olderThan: string,
    concept: string
  },
  forgotten: [
    {
      label: string,
      usageCount: number,
      lastUsedAt: timestamp,
      factsRemoved: number
    },
    ...
  ],
  count: number,
  protected: number,  // concepts that matched but were protected
  errors: [...]
}
```

### 9.2 FORGET_PREVIEW

Alias for dry run:

```sys2dsl
@preview FORGET_PREVIEW threshold=5
# Same as FORGET threshold=5 dry_run=true
```

### 9.3 PROTECT

Mark concept as protected:

```sys2dsl
@result PROTECT water
# Concept "water" cannot be forgotten until unprotected
```

### 9.4 UNPROTECT

Remove protection:

```sys2dsl
@result UNPROTECT water
# Concept "water" can now be forgotten
```

### 9.5 LIST_PROTECTED

List all protected concepts:

```sys2dsl
@protected LIST_PROTECTED
# Returns list of protected concept labels
```

---

## 10. Configuration

### 10.1 Full Configuration Schema

```javascript
{
  forgetting: {
    // Enable/disable forgetting entirely
    enabled: true,

    // Decay model
    decayModel: 'simple',  // 'simple' | 'exponential'
    halfLifeDays: 30,      // For exponential model

    // Scheduled cleanup
    scheduled: {
      enabled: false,
      interval: '24h',
      threshold: 3,
      olderThan: '30d',
      maxPerRun: 100,
      dryRunFirst: true
    },

    // Protection
    minConceptCount: 1000,
    protectionPeriod: 86400000,  // 24h in ms
    protectedLabels: [],

    // Safety
    requireConfirmation: true,  // For explicit FORGET commands
    maxPerCommand: 1000,        // Limit per single FORGET

    // Audit
    keepAuditDays: 90,          // Keep forgotten snapshots for recovery
    logLevel: 'info'            // 'debug' | 'info' | 'warn'
  }
}
```

### 10.2 Profile Presets

**Conservative (default):**
```javascript
{
  forgetting: {
    enabled: true,
    scheduled: { enabled: false },
    requireConfirmation: true,
    minConceptCount: 5000
  }
}
```

**Aggressive:**
```javascript
{
  forgetting: {
    enabled: true,
    decayModel: 'exponential',
    halfLifeDays: 7,
    scheduled: {
      enabled: true,
      interval: '1h',
      threshold: 5,
      olderThan: '7d'
    },
    minConceptCount: 1000
  }
}
```

**Disabled:**
```javascript
{
  forgetting: {
    enabled: false
  }
}
```

---

## 11. Examples

### 11.1 Manual Cleanup

```sys2dsl
# Check what would be forgotten
@preview FORGET threshold=3 dry_run=true

# Review the list...
# If acceptable, execute:
@result FORGET threshold=3
```

### 11.2 Protecting Important Concepts

```sys2dsl
# Mark core domain concepts as protected
@p1 PROTECT customer
@p2 PROTECT order
@p3 PROTECT product

# These will never be auto-forgotten
@protected LIST_PROTECTED
```

### 11.3 Age-Based Cleanup

```sys2dsl
# Remove concepts not used in 90 days
@old FORGET older_than=90d

# But only if they have low usage too
@oldAndUnused FORGET older_than=90d threshold=10
```

### 11.4 Recovery After Mistake

```sys2dsl
# Oops, forgot something important
@recovered important_term RECOVER any

# If not in audit, re-create it:
@f1 Important_Term IS_A category
@boost important_term BOOST 1000
@protect important_term PROTECT any
```

---

## 12. Implementation Notes

### 12.1 Transaction Safety

Forgetting is transactional:
- Either all selected concepts are forgotten, or none
- Rollback on error
- Audit log written after success

### 12.2 Index Updates

After forgetting:
- LSH tables are rebuilt for affected buckets
- Concept ID mappings are updated
- Fact indices are updated

### 12.3 Performance

For large cleanup operations:
- Process in batches
- Yield to allow other operations
- Background thread if available

### 12.4 Testing

Test mode configuration:
```javascript
{
  forgetting: {
    enabled: true,
    scheduled: { enabled: false },
    requireConfirmation: false,  // For automated tests
    keepAuditDays: 1
  }
}
```

---

## 13. Security Considerations

### 13.1 Authorization

Forgetting operations should be restricted:
- Only admin sessions can use FORGET
- Regular sessions can only FORGET from their working theory
- Scheduled forgetting requires explicit configuration

### 13.2 Audit Compliance

For compliance-sensitive deployments:
- Forgetting can be logged to external audit
- Snapshots retained for required period
- Recovery possible within retention window

### 13.3 Confirmation

Interactive confirmation for large operations:
```sys2dsl
@result FORGET threshold=1 limit=10000

# If requireConfirmation=true and count > threshold:
# Returns: { needsConfirmation: true, count: 8500, ... }

# User must confirm:
@confirmed FORGET threshold=1 limit=10000 confirmed=true
```

---

## 14. Metrics and Monitoring

### 14.1 Forgetting Statistics

```sys2dsl
@stats FORGET_STATS

# Returns:
# {
#   totalForgotten: 15420,
#   lastRun: timestamp,
#   lastCount: 23,
#   scheduledRuns: 145,
#   manualRuns: 12,
#   recoveries: 3,
#   currentConceptCount: 48250,
#   protectedCount: 150
# }
```

### 14.2 Alerts

Configuration for monitoring:
```javascript
{
  forgetting: {
    alerts: {
      onLargeForget: 1000,     // Alert if > 1000 forgotten at once
      onProtectedAttempt: true, // Alert if protected concept targeted
      onRecovery: true          // Alert on any recovery
    }
  }
}
```

---

## 15. Related Documents

- DS(/knowledge/usage_tracking) - Usage metrics
- DS(/knowledge/concept_store.js) - Storage implementation
- DS(/support/config.js) - Configuration
- DS(/support/audit_log.js) - Audit logging
- DS(/theory/Sys2DSL_commands) - Command reference
