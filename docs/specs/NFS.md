# AGISystem2 - Non-Functional Specification (NFS)

**Document Version:** 2.0
**Status:** Draft
**Classification:** GAMP Category 5 - Custom Application
**Date:** 2024-12-15

---

## 1. Document Purpose

This Non-Functional Specification (NFS) defines the quality attributes, constraints, and operational requirements for AGISystem2. Requirements are numbered using the format **NFS-XX** for traceability.

---

## 2. Performance Requirements

### 2.1 Response Time

| ID | Requirement | Target | Measurement | Traces To |
|----|-------------|--------|-------------|-----------|
| **NFS-01** | Simple query (1 hole, <100 facts) response time | < 50ms | P95 latency | URS-21 |
| **NFS-02** | Complex query (2-3 holes, <100 facts) response time | < 200ms | P95 latency | URS-21 |
| **NFS-03** | Proof generation (depth < 5) response time | < 500ms | P95 latency | URS-21 |
| **NFS-04** | Theory loading response time | < 1000ms | P95 latency | URS-21 |
| **NFS-05** | DSL parsing response time (per 100 statements) | < 100ms | P95 latency | URS-21 |
| **NFS-06** | Vector binding operation response time | < 1ms | Average | URS-21 |
| **NFS-07** | Bundle operation response time (100 vectors) | < 10ms | Average | URS-21 |
| **NFS-08** | Similarity calculation response time | < 0.5ms | Average | URS-21 |

### 2.2 Throughput

| ID | Requirement | Target | Measurement | Traces To |
|----|-------------|--------|-------------|-----------|
| **NFS-09** | Minimum queries per second (single thread) | > 100 qps | Benchmark | URS-21 |
| **NFS-10** | Minimum learn operations per second | > 500 ops | Benchmark | URS-21 |
| **NFS-11** | Minimum bindings per second | > 10,000 ops | Benchmark | URS-21 |

### 2.3 Capacity

**Note:** Capacity limits apply to **HDC-Priority mode** (dense-binary strategy) only. In **Symbolic-Priority mode** (sparse-polynomial, metric-affine), KB capacity is effectively unlimited. See DS01 Section 1.10.

| ID | Requirement | Target | Measurement | Traces To |
|----|-------------|--------|-------------|-----------|
| **NFS-12** | Maximum facts per KB with good accuracy (dense-binary) | 200 facts | Similarity > 0.55 | URS-22 |
| **NFS-13** | Maximum facts per KB with usable accuracy (dense-binary) | 500 facts | Similarity > 0.52 | URS-22 |
| **NFS-14** | Maximum vocabulary size | 10,000 atoms | Memory bounded | URS-22 |
| **NFS-15** | Maximum concurrent sessions | 100 sessions | Memory bounded | URS-22 |
| **NFS-16** | Maximum theory nesting depth | 10 levels | Design limit | URS-07 |
| **NFS-17** | Maximum macro nesting depth | 20 levels | Stack limit | URS-11 |
| **NFS-18** | Maximum proof search depth | 10 levels | Configurable | URS-04 |

### 2.4 HDC Strategy Benchmarking

| ID | Requirement | Target | Measurement | Traces To |
|----|-------------|--------|-------------|-----------|
| **NFS-95** | Benchmark infrastructure SHALL measure all core HDC operations | Required | API coverage | URS-45 |
| **NFS-96** | Benchmark SHALL report ops/second for each operation | Required | Output format | URS-45 |
| **NFS-97** | Benchmark SHALL support configurable iteration count | Required | Parameter | URS-45 |
| **NFS-98** | Strategy comparison SHALL report side-by-side metrics | Required | Output format | URS-45 |
| **NFS-99** | Benchmark results SHALL include memory per vector calculation | Required | Output format | URS-45 |

**Benchmark Operations:**
- `createRandom` - Vector creation with random data
- `createFromName` - Deterministic vector creation
- `bind` - Association operation
- `similarity` - Comparison operation
- `bundle` - Superposition operation
- `clone` - Deep copy operation

---

## 3. Reliability Requirements

### 3.1 Determinism

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-19** | Query result determinism | 100% identical | Repeated execution | URS-01 |
| **NFS-20** | Proof result determinism | 100% identical | Repeated execution | URS-01 |
| **NFS-21** | Vector initialization determinism | 100% identical | Cross-platform | URS-01 |
| **NFS-22** | Theory loading determinism | 100% identical | Repeated loads | URS-01 |

### 3.2 Accuracy

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-23** | Single-hole query accuracy (100 facts) | > 95% | Benchmark suite | URS-05 |
| **NFS-24** | Two-hole query accuracy (100 facts) | > 85% | Benchmark suite | URS-05 |
| **NFS-25** | Confidence score correlation with correctness | > 0.8 | Statistical analysis | URS-05 |
| **NFS-26** | Contradiction detection rate | > 99% | Test suite | URS-03 |

### 3.3 Availability

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-27** | System availability (operational hours) | 99.9% | Monitoring | URS-28 |
| **NFS-28** | Graceful degradation under load | Required | Stress test | URS-23 |
| **NFS-29** | Recovery from transient errors | Automatic | Fault injection | URS-23 |

---

## 4. Memory and Resource Requirements

### 4.1 Memory Usage

| ID | Requirement | Target | Measurement | Traces To |
|----|-------------|--------|-------------|-----------|
| **NFS-30** | Memory per vector (32K geometry) | 4 KB | Direct calculation | URS-22 |
| **NFS-31** | Memory per session (empty) | < 1 MB | Profiling | URS-22 |
| **NFS-32** | Memory per session (100 facts, 1000 atoms) | < 10 MB | Profiling | URS-22 |
| **NFS-33** | Memory per loaded theory | < 5 MB | Profiling | URS-07 |
| **NFS-34** | Memory growth per additional fact | O(geo) | Analysis | URS-22 |

### 4.2 Resource Cleanup

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-35** | Session memory release on close() | 100% | Memory profiling | URS-15 |
| **NFS-36** | No memory leaks in long-running sessions | Required | Stress test (24h) | URS-23 |
| **NFS-37** | Garbage collection friendly | Required | GC analysis | URS-28 |

---

## 5. Scalability Requirements

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-38** | Linear scaling of binding operations with geometry | O(geo) | Benchmark | URS-22 |
| **NFS-39** | Linear scaling of vocabulary scan | O(vocab) | Benchmark | URS-22 |
| **NFS-40** | Sub-linear scaling with theory caching | Required | Benchmark | URS-07 |
| **NFS-41** | Support for geometry upgrade (16K -> 32K -> 64K) | Required | Integration test | URS-22 |

---

## 6. Security Requirements

### 6.1 Input Validation

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-42** | DSL input sanitization | All inputs | Security review | URS-36 |
| **NFS-43** | Protection against injection attacks | Required | Penetration test | URS-36 |
| **NFS-44** | Maximum input length enforcement | 1 MB | Unit test | URS-36 |
| **NFS-45** | Maximum identifier length | 256 chars | Unit test | URS-36 |

### 6.2 Data Protection

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-46** | No plaintext secrets in vectors | Required | Code review | URS-34 |
| **NFS-47** | Audit log protection | Required | Security review | URS-30 |
| **NFS-48** | Theory file integrity verification | Optional | Checksum | URS-09 |

### 6.3 Access Control

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-49** | Session isolation | Required | Integration test | URS-35 |
| **NFS-50** | Theory access control hooks | Optional | API review | URS-35 |

---

## 7. Maintainability Requirements

### 7.1 Code Quality

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-51** | Code coverage by unit tests | > 80% | Coverage report | URS-37 |
| **NFS-52** | Code coverage by integration tests | > 60% | Coverage report | URS-37 |
| **NFS-53** | Cyclomatic complexity (per function) | < 15 | Static analysis | URS-37 |
| **NFS-54** | Documentation coverage | > 90% | JSDoc analysis | URS-37 |

### 7.2 Modularity

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-55** | Module coupling (dependencies per module) | < 5 | Dependency analysis | URS-37 |
| **NFS-56** | Single responsibility per module | Required | Code review | URS-37 |
| **NFS-57** | Clear API boundaries between layers | Required | Architecture review | URS-37 |

### 7.3 Extensibility

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-58** | Plugin mechanism for custom operations | Optional | API review | URS-26 |
| **NFS-59** | Custom theory loaders | Optional | API review | URS-26 |
| **NFS-60** | Custom phrasing templates | Required | API review | URS-14 |

### 7.4 Code Style and Module System

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-92** | ES Modules with .mjs extension | Required | All source files use .mjs | URS-37 |
| **NFS-93** | Async/await for asynchronous operations | Required | No callback-based async | URS-37 |
| **NFS-94** | Module documentation files | Required | Each .mjs has matching .mjs.md | URS-37 |

### 7.5 Documentation Convention

Each source module `src/<folder>/<module>.mjs` must have a corresponding specification file `src/<folder>/<module>.mjs.md` containing:

1. **Purpose** - One-line description
2. **Exports** - List of exported functions/classes
3. **API Signatures** - Function signatures with types
4. **Algorithm Pseudocode** - For complex functions
5. **Dependencies** - Required imports
6. **Test Cases** - Expected test scenarios

Example structure:
```
src/
├── core/
│   ├── vector.mjs           # Implementation
│   ├── vector.mjs.md        # Specification
│   ├── operations.mjs
│   ├── operations.mjs.md
│   └── ...
```

---

## 8. Usability Requirements

### 8.1 Developer Experience

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-61** | TypeScript type definitions | Complete | Compilation | URS-15 |
| **NFS-62** | API documentation completeness | 100% | Review | URS-37 |
| **NFS-63** | Example code coverage | All major features | Review | URS-38 |
| **NFS-64** | Error message clarity | User can understand cause | User testing | URS-39 |
| **NFS-65** | Error message actionability | User can fix issue | User testing | URS-39 |

### 8.2 Learning Curve

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-66** | Time to first working query | < 30 minutes | User testing | URS-37 |
| **NFS-67** | Time to understand DSL basics | < 2 hours | User testing | URS-37 |
| **NFS-68** | Time to create custom theory | < 4 hours | User testing | URS-38 |

---

## 9. Compatibility Requirements

### 9.1 Runtime Environments

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-69** | Node.js 18+ support | Required | CI/CD | URS-28 |
| **NFS-70** | Node.js 20+ support | Required | CI/CD | URS-28 |
| **NFS-71** | Browser support (modern) | Optional | CI/CD | URS-29 |
| **NFS-72** | ESM and CommonJS support | Required | Build test | URS-28 |

### 9.2 Interoperability

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-73** | JSON export of KB state | Required | Unit test | URS-27 |
| **NFS-74** | JSON export of proof traces | Required | Unit test | URS-27 |
| **NFS-75** | DSL script export | Required | Unit test | URS-16 |
| **NFS-76** | LLM API integration (OpenAI compatible) | Optional | Integration test | URS-25 |

---

## 10. Operational Requirements

### 10.1 Monitoring

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-77** | Query latency metrics | Required | Instrumentation | URS-30 |
| **NFS-78** | KB size metrics | Required | Instrumentation | URS-24 |
| **NFS-79** | Error rate metrics | Required | Instrumentation | URS-30 |
| **NFS-80** | Memory usage metrics | Required | Instrumentation | URS-30 |

### 10.2 Logging

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-81** | Configurable log levels | Required | Configuration test | URS-30 |
| **NFS-82** | Structured logging (JSON) | Required | Unit test | URS-30 |
| **NFS-83** | Correlation IDs for tracing | Required | Integration test | URS-30 |
| **NFS-84** | Log rotation support | Required | Configuration test | URS-30 |

### 10.3 Configuration

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-85** | Environment variable configuration | Required | Configuration test | URS-28 |
| **NFS-86** | Programmatic configuration | Required | API test | URS-15 |
| **NFS-87** | Configuration validation on startup | Required | Unit test | URS-39 |

---

## 11. Compliance Requirements

| ID | Requirement | Target | Verification | Traces To |
|----|-------------|--------|--------------|-----------|
| **NFS-88** | Audit trail immutability | Required | Security review | URS-30 |
| **NFS-89** | Audit trail completeness | 100% operations | Integration test | URS-30 |
| **NFS-90** | GDPR-compatible data handling hooks | Optional | API review | URS-31 |
| **NFS-91** | Timestamp precision | Milliseconds | Unit test | URS-30 |

---

## 12. Constraints Summary

| Category | Constraint | Value |
|----------|------------|-------|
| Technology | Language | JavaScript/TypeScript |
| Technology | Runtime | Node.js 18+ |
| Technology | Module System | ES Modules (.mjs) |
| License | Type | GNU AGPL v3 |
| Architecture | HDC Strategy | Pluggable (default: dense-binary) |
| Architecture | Reasoning Modes | HDC-Priority, Symbolic-Priority |
| Architecture | Operations | Bind (XOR), Bundle (Majority) |
| Architecture | Default Geometry | 32,768 bits |
| Architecture | Position Vectors | 20 (Pos1-Pos20) |
| Capacity | KB Optimal Limit (dense-binary) | 200 facts |
| Capacity | KB Hard Limit (dense-binary) | ~500 facts |
| Capacity | KB Limit (sparse/metric-affine) | Unlimited* |
| Performance | Query Target | < 100ms |
| Memory | Per Vector (32K) | 4 KB |
| Configuration | Strategy Env Var | `SYS2_HDC_STRATEGY` |

---

## 13. Traceability Matrix

| NFS Category | NFS IDs | URS IDs |
|--------------|---------|---------|
| Performance - Response Time | NFS-01 to NFS-08 | URS-21 |
| Performance - Throughput | NFS-09 to NFS-11 | URS-21 |
| Performance - Capacity | NFS-12 to NFS-18 | URS-04, URS-07, URS-11, URS-22 |
| HDC Benchmarking | NFS-95 to NFS-99 | URS-45 |
| Reliability - Determinism | NFS-19 to NFS-22 | URS-01 |
| Reliability - Accuracy | NFS-23 to NFS-26 | URS-03, URS-05 |
| Reliability - Availability | NFS-27 to NFS-29 | URS-23, URS-28 |
| Memory | NFS-30 to NFS-37 | URS-07, URS-15, URS-22, URS-23, URS-28 |
| Scalability | NFS-38 to NFS-41 | URS-07, URS-22 |
| Security | NFS-42 to NFS-50 | URS-09, URS-30, URS-34, URS-35, URS-36 |
| Maintainability | NFS-51 to NFS-60 | URS-14, URS-26, URS-37 |
| Usability | NFS-61 to NFS-68 | URS-15, URS-37, URS-38, URS-39 |
| Compatibility | NFS-69 to NFS-76 | URS-16, URS-25, URS-27, URS-28, URS-29 |
| Operations | NFS-77 to NFS-87 | URS-15, URS-24, URS-28, URS-30, URS-39 |
| Compliance | NFS-88 to NFS-91 | URS-30, URS-31 |

---

## 14. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Quality Assurance | | | |
| Operations Lead | | | |

---

## 15. Design Specification Reference (DS Files)

**IMPORTANT FOR AI ASSISTANTS:** The detailed technical specifications are located in `docs/specs/DS/`. These files contain essential implementation details that MUST be consulted before making changes to the codebase.

### 15.1 DS File Index and When to Read

| File | Content | Read When |
|------|---------|-----------|
| **DS00-Vision.md** | Project vision and goals | Understanding overall purpose |
| **DS01-Theoretical-Foundation.md** | HDC theory basics | Implementing core vector operations |
| **DS02-DSL-Syntax.md** | **CRITICAL:** Complete DSL grammar | Writing/parsing ANY DSL code |
| **DS03-Architecture.md** | System architecture overview | Understanding module relationships |
| **DS03-Memory-Model.md** | Memory and KB model | Implementing session/KB operations |
| **DS05-Basic-Reasoning-Engine.md** | Query and prove algorithms | Implementing reasoning |
| **DS06-Advanced-Reasoning.md** | Advanced inference patterns | Implementing rule chains, defaults |
| **DS07-Core-Theory.md** | Core theory content and types | Understanding L0-L3 layers |
| **DS08-ThurstworthyAI-Patterns.md** | AI safety patterns | Implementing constraints |
| **DS09-Core-HDC-Implementation.md** | Vector operation details | Implementing bind/bundle/similarity |
| **DS10-Code-Plan.md** | Implementation roadmap | Planning work |
| **DS11-Decoding-Phrasing-Engine.md** | Vector decoding, NL generation | Implementing decode/summarize |
| **DS12-Test-Library.md** | Testing requirements | Writing tests |
| **DS13-BasicNLP.md** | NL→DSL transformation | Implementing NL parser |
| **DS14-EvalSuite.md** | **CRITICAL:** Evaluation suite format | Writing/fixing eval suites |

### 15.2 Critical DSL Syntax Rules (from DS02)

**Core syntax:**
```
@destination Operator arg1 arg2 arg3 ...
```

**Parenthesized compound expressions** are supported for inline nested graph calls:
```
@causal __Role Causes (__Pair $cause $effect)
```

This creates a **Compound** expression that evaluates the nested graph call first, then passes the result as an argument to the outer expression. See DS02 Section 2.2 for details.

**Persistence Rules:**
| Form | In Scope | In KB | Use Case |
|------|----------|-------|----------|
| `operator arg1 arg2` | No | Yes | Simple anonymous facts |
| `@var:name operator arg1 arg2` | Yes | Yes | Named persistent facts |
| `@var operator arg1 arg2` | Yes | **No** | Temporary (for references) |

**Building Negation (CORRECT):**
```dsl
love John Mary              # → KB (anonymous)
@neg love John Alice        # → scope only (NOT in KB!)
@f1:notJohnAlice Not $neg   # → KB (the negation)
```

### 15.3 EvalSuite Requirements (from DS14)

- **One Suite = One Session:** All steps share the same session
- **Knowledge Accumulates:** Facts from step N available in step N+1
- **Theories Load First:** Core theories loaded at session start
- **Use Both Forms:** Include `input_nl` AND `input_dsl` for learn steps
- **Minimize Learning Steps:** Most steps should be query/prove, not learn

---

*End of Non-Functional Specification*
