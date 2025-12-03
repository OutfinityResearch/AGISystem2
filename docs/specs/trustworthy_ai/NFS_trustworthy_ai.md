# NFS-TAI: Non-Functional Specification - Trustworthy AI

**Document ID**: NFS-TAI-001
**Version**: 1.0
**Date**: 2025-12-03
**Status**: Draft
**Related**: URS-TAI, DS-EXI, DS-HOOK, FS-OWS

---

## 1. Overview

### 1.1 Purpose

This document specifies the non-functional requirements for the Trustworthy AI capabilities in AGISystem2. These requirements ensure the system is:

- Performant
- Auditable
- Secure
- Maintainable
- Testable

---

## 2. Performance Requirements

### 2.1 Existence Operations

| Operation | Requirement | Measurement |
|-----------|-------------|-------------|
| Get fact existence | O(1) | Direct hash lookup |
| Get best existence fact | O(1) | First element of sorted index |
| Filter by existence level | O(log n) | Binary search on sorted index |
| Add fact with existence | O(log n) | Insert into sorted index |

### 2.2 Query Operations

| Operation | Requirement | Measurement |
|-----------|-------------|-------------|
| Direct query | < 1ms | Single hash lookup |
| Transitive query (depth d) | < d * 5ms | BFS traversal |
| Impossibility check | < 10ms | DISJOINT_WITH lookup |
| Full explanation | < 50ms | Chain construction |

### 2.3 Hook Operations

| Operation | Requirement | Measurement |
|-----------|-------------|-------------|
| Hook registration | O(n log n) | Insert + sort by priority |
| Hook lookup | O(1) | Map lookup by event type |
| Hook execution | < 10ms per hook | Macro execution |
| Total hook overhead | < 20ms per event | All hooks for event |

### 2.4 Memory Usage

| Component | Requirement |
|-----------|-------------|
| Existence index | < 2x fact count overhead |
| Provenance data | < 200 bytes per fact |
| Hook registry | < 1KB per hook |
| Execution context | < 10KB per hook execution |

---

## 3. Auditability Requirements

### 3.1 Logging

| Event | Logged Data | Retention |
|-------|-------------|-----------|
| Fact creation | factId, triple, existence, source, timestamp | Permanent |
| Existence change | factId, old, new, reason, timestamp | Permanent |
| Hook execution | hookName, event, input, output, duration | 30 days |
| Query execution | query, result, duration, explain | 7 days |
| Mode change | old, new, timestamp, user | Permanent |

### 3.2 Audit Trail

All state changes must be traceable:

```javascript
{
  timestamp: 1701619200000,
  actor: "system" | "user" | "hook:hookName",
  action: "CREATE" | "UPDATE" | "DELETE",
  target: { type: "fact", id: 123 },
  before: { existence: -64 },
  after: { existence: 64 },
  reason: "demonstrated via IS_A_TRANSITIVITY"
}
```

### 3.3 Provenance Requirements

Every fact MUST have:
- Source file or "runtime"
- Creation timestamp
- Last modification timestamp
- Derivation chain (if derived)
- Applied rule (if derived)

---

## 4. Security Requirements

### 4.1 Hook Isolation

| Requirement | Description |
|-------------|-------------|
| No recursion | Hooks cannot trigger other hooks |
| Write blocking | Hooks cannot directly modify index |
| Effect buffering | State changes applied after hook exits |
| Timeout | Hooks timeout after 10 seconds |
| Error containment | Hook errors don't crash system |

### 4.2 Mode Protection

| Requirement | Description |
|-------------|-------------|
| Mode validation | Only valid modes accepted |
| Mode logging | All mode changes logged |
| Default safe | Default mode is LEARNING (trusted) |

### 4.3 Existence Protection

| Requirement | Description |
|-------------|-------------|
| No downgrade via assertion | Assertions cannot lower existence |
| Explicit downgrade only | Only RETRACT, FORGET, SET_EXISTENCE can lower |
| IMPOSSIBLE is final | Cannot upgrade from IMPOSSIBLE |

---

## 5. Reliability Requirements

### 5.1 Consistency

| Requirement | Description |
|-------------|-------------|
| Index consistency | Existence index always matches fact data |
| Transactional updates | Fact + index updated atomically |
| Hook atomicity | All hook effects applied or none |

### 5.2 Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid existence value | Reject with error |
| Hook timeout | Log, disable hook, continue |
| Hook error | Log, optionally disable, continue |
| Index corruption | Auto-rebuild from facts |

### 5.3 Recovery

| Scenario | Recovery |
|----------|----------|
| Crash during fact add | Fact not persisted (safe) |
| Crash during hook | Hook effects not applied (safe) |
| Index out of sync | Rebuild index on startup |

---

## 6. Maintainability Requirements

### 6.1 Code Structure

| Requirement | Description |
|-------------|-------------|
| Single responsibility | Each module handles one concern |
| Existence in ConceptStore | All existence logic in one place |
| Hooks in HookRegistry | All hook logic in one place |
| Clear interfaces | Documented public APIs |

### 6.2 Configuration

| Parameter | Default | Configurable |
|-----------|---------|--------------|
| Default mode | learning | Yes |
| Hook timeout | 10000ms | Yes |
| Max hook priority | 1000 | No |
| Existence range | [-127, 127] | No |
| Derived cap | 64 | No |

### 6.3 Extensibility

| Extension Point | Mechanism |
|-----------------|-----------|
| New existence levels | Add to EXISTENCE constants |
| New events | Add to EVENT_TYPES |
| New meta-relations | Register in MetaRelationRegistry |
| Custom hooks | Define macro + HOOK relation |

---

## 7. Testability Requirements

### 7.1 Unit Test Coverage

| Module | Minimum Coverage |
|--------|------------------|
| Existence operations | 90% |
| Mode handling | 95% |
| Hook registration | 90% |
| Hook execution | 85% |
| Query logic | 90% |

### 7.2 Integration Test Coverage

| Feature | Tests Required |
|---------|----------------|
| Learning mode flow | 5+ tests |
| Reasoning mode flow | 5+ tests |
| Hook triggering | 10+ tests |
| Existence propagation | 5+ tests |
| Impossibility detection | 5+ tests |

### 7.3 Test Fixtures

Required test theories:
- `test_existence.sys2dsl` - Existence level tests
- `test_hooks.sys2dsl` - Hook behavior tests
- `test_modes.sys2dsl` - Mode transition tests
- `test_contradictions.sys2dsl` - DISJOINT_WITH tests

---

## 8. Compatibility Requirements

### 8.1 Backward Compatibility

| Requirement | Description |
|-------------|-------------|
| Default existence | Facts without existence → CERTAIN (127) |
| Existing DSL | All v3 DSL works unchanged |
| Existing API | All current API methods work |
| Existing theories | Load without modification |

### 8.2 Forward Compatibility

| Requirement | Description |
|-------------|-------------|
| Unknown existence values | Accept any value in [-127, 127] |
| Unknown events | Log warning, don't crash |
| Unknown meta-relations | Log warning, no effect |

---

## 9. Documentation Requirements

### 9.1 Required Documentation

| Document | Content |
|----------|---------|
| URS | User requirements |
| DS | Design specification per feature |
| FS | Functional specification |
| NFS | This document |
| API docs | JSDoc for all public methods |
| Theory guide | How to write hooks in DSL |

### 9.2 Code Documentation

| Requirement | Description |
|-------------|-------------|
| Public API | JSDoc with examples |
| Complex logic | Inline comments |
| Constants | Purpose documented |
| Algorithms | Complexity noted |

---

## 10. Compliance Requirements

### 10.1 Trustworthy AI Principles

| Principle | Implementation |
|-----------|----------------|
| Explainability | Provenance tracking, chain explanation |
| Verifiability | Existence levels, proof tracking |
| Alignment | Axiological constraints, forbidden zones |
| Controllability | Hooks, modes, meta-relations |
| Auditability | Complete logging, audit trail |

### 10.2 GAMP Alignment

| GAMP Concept | Implementation |
|--------------|----------------|
| URS | URS-TAI document |
| DS | DS-EXI, DS-HOOK documents |
| FS | FS-OWS document |
| Test specs | Test cases in each document |
| Traceability | Requirement IDs throughout |

---

## 11. Metrics

### 11.1 Performance Metrics

```javascript
{
  queryLatency: { p50: 1, p99: 10, unit: 'ms' },
  hookExecutionTime: { p50: 5, p99: 20, unit: 'ms' },
  existenceLookupTime: { p50: 0.1, p99: 1, unit: 'ms' },
  memoryPerFact: { avg: 300, max: 500, unit: 'bytes' }
}
```

### 11.2 Quality Metrics

```javascript
{
  testCoverage: { min: 85, target: 90, unit: '%' },
  documentedAPIs: { min: 95, target: 100, unit: '%' },
  hookedEvents: { min: 100, target: 100, unit: '%' },
  auditedOperations: { min: 100, target: 100, unit: '%' }
}
```

---

## 12. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-03 | Initial draft |
