# AGISystem2 - Functional Specification (FS)

**Document Version:** 2.0
**Status:** Draft
**Classification:** GAMP Category 5 - Custom Application
**Date:** 2024-12-15

---

## 1. Document Purpose

This Functional Specification (FS) defines the detailed functional requirements for AGISystem2. Requirements are numbered using the format **FS-XX** for traceability to the URS and DS documents.

---

## 2. System Architecture Overview

```
+------------------------------------------------------------------+
|                        AGISystem2 Engine                          |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------+  +-------------+  +---------------------------+ |
|  |   Parser    |  |  Executor   |  |      Query Engine         | |
|  |  (DSL->AST) |  | (AST->Vecs) |  |   (holes->answers)        | |
|  +------+------+  +------+------+  +-----------+---------------+ |
|         |                |                      |                 |
|  +------+----------------+----------------------+--------------+  |
|  |                    Runtime Layer                             | |
|  |  Session | Scope | TheoryRegistry | KnowledgeBase            | |
|  +-----------------------------+--------------------------------+  |
|                                |                                  |
|  +-----------------------------+--------------------------------+  |
|  |                    HDC Facade (src/hdc/facade.mjs)            | |
|  |  bind | bundle | similarity | createFromName | topKSimilar   | |
|  +-----------------------------+--------------------------------+  |
|                                |                                  |
|  +-----------------------------+--------------------------------+  |
|  |                 HDC Strategy: exact (DEFAULT)                 | |
|  |  ExactVector | sparse terms | structural bind/unbind | union bundle | |
|  +---------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

**Note:** The HDC layer uses a strategy pattern. The `exact` strategy is the default. Alternative strategies can be selected via `SYS2_HDC_STRATEGY` environment variable.

---

## 3. Functional Requirements

### 3.1 Core HDC Operations

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-01** | The system SHALL implement Bind operation as bitwise XOR on vectors | URS-01 | Unit Test |
| **FS-02** | The system SHALL implement Bundle operation as bitwise majority vote | URS-01 | Unit Test |
| **FS-03** | The system SHALL implement Similarity as normalized Hamming distance | URS-05 | Unit Test |
| **FS-04** | The system SHALL support configurable geometry; for `dense-binary` the geometry is the bit-length and MUST be divisible by 32 | URS-22 | Unit Test |
| **FS-05** | The system SHALL provide position vectors Pos1 through Pos20 for argument ordering | URS-12 | Unit Test |
| **FS-06** | The system SHALL initialize vectors deterministically using ASCII stamping | URS-01 | Unit Test |
| **FS-07** | The system SHALL support vector extension (smaller to larger geometry) via cloning | URS-07 | Unit Test |

### 3.1.1 HDC Strategy Management

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-91** | The system SHALL provide a facade module (`src/hdc/facade.mjs`) as single entry point for all HDC operations | URS-42 | Integration Test |
| **FS-92** | The system SHALL support strategy selection via `SYS2_HDC_STRATEGY` environment variable | URS-44 | Unit Test |
| **FS-93** | The system SHALL default to `exact` strategy when no strategy is specified | URS-43 | Unit Test |
| **FS-94** | The system SHALL provide strategy registration via `registerStrategy(id, strategy)` | URS-42 | Unit Test |
| **FS-95** | The system SHALL provide strategy enumeration via `listStrategies()` | URS-42 | Unit Test |
| **FS-96** | The system SHALL provide `validateStrategy(strategy, geometry)` for contract validation | URS-46 | Unit Test |
| **FS-97** | The system SHALL provide `benchmarkStrategy(strategyId, geometry, options)` for performance testing | URS-45 | Unit Test |
| **FS-98** | The system SHALL provide `compareStrategies(strategyIds, geometry, options)` for multi-strategy comparison | URS-45 | Unit Test |

### 3.2 DSL Parser

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-08** | The lexer SHALL tokenize DSL input into: AT, REFERENCE (`$name`), HOLE (`?name`), COLON, COMMA, IDENTIFIER, STRING, NUMBER, LPAREN/RPAREN, LBRACKET/RBRACKET, LBRACE/RBRACE, NEWLINE | URS-11 | Unit Test |
| **FS-09** | The parser SHALL recognize keywords: theory, import, rule, graph, macro, begin, end, return | URS-11 | Unit Test |
| **FS-10** | The parser SHALL parse statements in the form `[ @dest ] operator arg1 arg2 ...` (destination is optional) | URS-12 | Unit Test |
| **FS-11** | The parser SHALL support variable references with `$varName` syntax | URS-11 | Unit Test |
| **FS-12** | The parser SHALL support query holes with `?holeName` syntax | URS-13 | Unit Test |
| **FS-13** | The parser SHALL support export syntax `@varName:exportName` | URS-11 | Unit Test |
| **FS-14** | The parser SHALL support multi-line macro definitions with indentation | URS-11 | Unit Test |
| **FS-15** | The parser SHALL report errors with line and column numbers | URS-39 | Unit Test |
| **FS-16** | The parser SHALL ignore comments starting with `#` | URS-11 | Unit Test |

### 3.3 Theory Management

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-17** | The system SHALL parse theory definitions with syntax `@name theory geometry initMode ... end` | URS-06 | Unit Test |
| **FS-18** | The system SHALL support deterministic and random initialization modes for theories | URS-06 | Unit Test |
| **FS-19** | The system SHALL maintain a registry of loaded theories | URS-07 | Integration Test |
| **FS-20** | The system SHALL resolve theory references with `$TheoryName` syntax | URS-07 | Unit Test |
| **FS-21** | Core pack auto-load SHALL be enabled by default for normal runs, and configurable via `SYS2_AUTO_LOAD_CORE` / `Session({ autoLoadCore })` | URS-06 | Unit Test |
| **FS-22** | The system SHALL export atoms and macros with specified names | URS-06 | Unit Test |
| **FS-23** | The system SHALL validate theory geometry and initialization mode | URS-10 | Unit Test |
| **FS-24** | The system SHALL support loading theories from file paths | URS-09 | Integration Test |

### 3.4 Session Management

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-25** | The system SHALL create sessions with configurable geometry | URS-15 | Unit Test |
| **FS-26** | The session SHALL maintain scope for session-local variables | URS-15 | Unit Test |
| **FS-27** | The session SHALL maintain a knowledge base as a bundled vector | URS-06 | Unit Test |
| **FS-28** | The session SHALL maintain vocabulary of all known atoms | URS-06 | Unit Test |
| **FS-29** | The session SHALL provide `learn(dsl)` method to add facts and definitions | URS-15 | Integration Test |
| **FS-30** | The session SHALL provide `query(dsl)` method to retrieve information | URS-15 | Integration Test |
| **FS-31** | The session SHALL provide `prove(goal)` method for proof construction | URS-15 | Integration Test |
| **FS-32** | The session SHALL provide `dump()` method for state inspection | URS-40 | Unit Test |
| **FS-33** | The session SHALL provide `close()` method to release resources | URS-15 | Unit Test |

### 3.5 Executor

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-34** | The executor SHALL resolve identifiers from vocabulary | URS-11 | Unit Test |
| **FS-35** | The executor SHALL resolve references from scope hierarchy | URS-11 | Unit Test |
| **FS-36** | The executor SHALL auto-create atoms for unknown identifiers | URS-11 | Unit Test |
| **FS-37** | The executor SHALL compute bindings as `Op XOR (Pos1 XOR Arg1) XOR (Pos2 XOR Arg2) ...` | URS-12 | Unit Test |
| **FS-38** | The executor SHALL execute macros with parameter binding | URS-11 | Integration Test |
| **FS-39** | The executor SHALL add facts to KB via bundling | URS-06 | Unit Test |
| **FS-40** | The executor SHALL maintain scope hierarchy: Global -> Theory -> Session -> Macro | URS-11 | Unit Test |

### 3.6 Query Engine

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-41** | The query engine SHALL identify holes (?name) in query statements | URS-13 | Unit Test |
| **FS-42** | The query engine SHALL build partial vectors excluding holes | URS-13 | Unit Test |
| **FS-43** | The query engine SHALL unbind partial from KB to extract candidates | URS-13 | Unit Test |
| **FS-44** | The query engine SHALL remove position markers from candidates | URS-13 | Unit Test |
| **FS-45** | The query engine SHALL find top-K similar atoms in vocabulary | URS-13 | Unit Test |
| **FS-46** | The query engine SHALL calculate confidence from similarity scores | URS-05 | Unit Test |
| **FS-47** | The query engine SHALL support queries with 1-3 holes | URS-13 | Unit Test |
| **FS-48** | The query engine SHALL return alternatives when ambiguity exists | URS-19 | Unit Test |

### 3.7 Proof Engine

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-49** | The proof engine SHALL implement backward chaining from goal | URS-04 | Integration Test |
| **FS-50** | The proof engine SHALL match goals against rule conclusions | URS-04 | Unit Test |
| **FS-51** | The proof engine SHALL recursively prove rule premises | URS-04 | Integration Test |
| **FS-52** | The proof engine SHALL detect cycles in proof search | URS-03 | Unit Test |
| **FS-53** | The proof engine SHALL enforce maximum proof depth limit | URS-23 | Unit Test |
| **FS-54** | The proof engine SHALL build proof tree with all steps | URS-20 | Integration Test |
| **FS-55** | The proof engine SHALL calculate combined confidence from premises | URS-05 | Unit Test |
| **FS-56** | The proof engine SHALL support direct KB lookup as base case | URS-04 | Unit Test |

### 3.8 Decoding and Phrasing

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-57** | The decoder SHALL extract operator from vector by similarity search | URS-14 | Unit Test |
| **FS-58** | The decoder SHALL extract arguments by unbinding and position removal | URS-14 | Unit Test |
| **FS-59** | The decoder SHALL handle nested/compound structures recursively | URS-14 | Unit Test |
| **FS-60** | The phrasing engine SHALL store templates in format `{PosN:Role}` | URS-14 | Unit Test |
| **FS-61** | The phrasing engine SHALL fill slots with decoded values | URS-14 | Unit Test |
| **FS-62** | The phrasing engine SHALL select question words based on roles | URS-14 | Unit Test |
| **FS-63** | The system SHALL provide `summarize(vector)` for concise output | URS-17 | Integration Test |
| **FS-64** | The system SHALL provide `elaborate(proof)` for detailed output | URS-18 | Integration Test |
| **FS-65** | Reserved: LLM-backed fluency is not implemented in the current runtime | URS-25 | N/A |

### 3.9 Core Theory Content

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-66** | Core theory SHALL define category atoms: __Atom, __Relation, __Property, __State, __Entity, __Event, __Action | URS-06 | Unit Test |
| **FS-67** | Core theory SHALL define position vectors: Pos1 through Pos20 | URS-12 | Unit Test |
| **FS-68** | Core theory SHALL define logical operators: Implies, And, Or, Not, ForAll, Exists | URS-04 | Unit Test |
| **FS-69** | Core theory SHALL define foundational relations: isA, hasProperty, hasState | URS-06 | Unit Test |
| **FS-70** | Core theory SHALL define temporal relations: Before, After, During, Causes | URS-04 | Unit Test |
| **FS-71** | Core theory SHALL define semantic roles: Agent, Theme, Goal, Source | URS-14 | Unit Test |
| **FS-72** | Core theory SHALL define modal concepts: Possible, Necessary, Permitted | URS-04 | Unit Test |

### 3.10 Error Handling

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-73** | The system SHALL surface errors either as thrown Exceptions (e.g., parse/validation) or as `{success:false, errors:[...strings]}` results | URS-39 | Unit Test |
| **FS-74** | Parse errors SHALL include line/column information when available (e.g., `ParseError`) | URS-39 | Unit Test |
| **FS-75** | Runtime errors SHALL include a human-readable message, and MAY include additional context fields | URS-39 | Unit Test |
| **FS-76** | Query/prove failures SHALL include a human-readable `reason` string when returning a non-throwing result | URS-39 | Unit Test |
| **FS-77** | Capacity errors SHALL include current count and maximum limit | URS-24 | Unit Test |
| **FS-78** | The system SHALL recover from single statement errors | URS-23 | Integration Test |

### 3.11 Debug Utilities

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-79** | The system SHALL provide `dump()` to snapshot session state (geometry, counts, vocabulary size, scope bindings) | URS-40 | Unit Test |
| **FS-80** | The system SHALL provide `similarity(a, b)` for direct vector comparison | URS-40 | Unit Test |
| **FS-81** | The system SHALL provide `decode(vector)` for structure extraction | URS-40 | Unit Test |
| **FS-82** | The system SHALL provide `summarize(vector)` for best-effort natural-language decoding | URS-40 | Unit Test |
| **FS-83** | Reserved: theory/fact enumeration APIs are not exposed in the current runtime | URS-40 | N/A |
| **FS-84** | Reserved: macro/atom listing APIs are not exposed in the current runtime | URS-40 | N/A |
| **FS-85** | Reserved: `inspect(name)` is not exposed; use `dump/decode/summarize` instead | URS-40 | N/A |

### 3.12 Audit and Tracing

| ID | Requirement | Traces To | Verification |
|----|-------------|-----------|--------------|
| **FS-86** | Reserved: learn/query/prove audit logging is not implemented in the current runtime | URS-30 | N/A |
| **FS-87** | Reserved: query audit logging is not implemented in the current runtime | URS-30 | N/A |
| **FS-88** | Reserved: prove audit logging is not implemented in the current runtime | URS-30 | N/A |
| **FS-89** | Reserved: replayable DSL export from proof traces is not implemented in the current runtime | URS-16 | N/A |
| **FS-90** | Reserved: audit log export is not implemented in the current runtime | URS-30 | N/A |

---

## 4. Use Cases

### UC-01: Learn Facts
**Actor:** Developer
**Precondition:** Session exists
**Main Flow:**
1. Developer calls `session.learn(dsl)`
2. System parses DSL into AST
3. System executes each statement
4. System stores results in scope and KB
5. System returns success status

### UC-02: Query Knowledge
**Actor:** Developer
**Precondition:** Session has facts
**Main Flow:**
1. Developer calls `session.query(dslWithHoles)`
2. System parses and identifies holes
3. System builds partial vector
4. System unbinds from KB
5. System finds best matches
6. System returns bindings with confidence

### UC-03: Prove Goal
**Actor:** Developer
**Precondition:** Session has facts and rules
**Main Flow:**
1. Developer calls `session.prove(goal)`
2. System attempts direct KB match
3. If no match, system finds applicable rules
4. System recursively proves premises
5. System builds proof tree
6. System returns validity and proof

### UC-04: Load Theory
**Actor:** Knowledge Engineer
**Precondition:** Theory file exists
**Main Flow:**
1. User calls `session.learn("@_ Load $TheoryName")`
2. System locates theory file
3. System parses theory definition
4. System registers atoms and macros
5. System imports exports to vocabulary

---

## 5. Data Dictionary

| Term | Definition |
|------|------------|
| Vector | 32768-bit binary array representing a concept |
| Atom | Named vector representing a primitive concept |
| Fact | Bound vector representing a relationship |
| Theory | Collection of atoms, macros, and rules |
| KB | Knowledge Base - bundled vector of all facts |
| Hole | Query variable marked with ? prefix |
| Binding | Association of hole name to answer value |
| Confidence | Similarity score indicating match quality (0.0-1.0) |

---

## 6. Traceability Matrix

| FS ID | URS IDs | DS Reference |
|-------|---------|--------------|
| FS-01 to FS-07 | URS-01, URS-05, URS-07, URS-12, URS-22 | DS09 |
| FS-08 to FS-16 | URS-11, URS-12, URS-13, URS-39 | DS02 |
| FS-17 to FS-24 | URS-06, URS-07, URS-09, URS-10 | DS03 |
| FS-25 to FS-33 | URS-06, URS-15, URS-40 | DS03 |
| FS-34 to FS-40 | URS-06, URS-11, URS-12 | DS10 |
| FS-41 to FS-48 | URS-05, URS-13, URS-19 | DS05 |
| FS-49 to FS-56 | URS-03, URS-04, URS-05, URS-20, URS-23 | DS05, DS06 |
| FS-57 to FS-65 | URS-14, URS-17, URS-18, URS-25 | DS11 |
| FS-66 to FS-72 | URS-04, URS-06, URS-12, URS-14 | DS07 |
| FS-73 to FS-78 | URS-23, URS-24, URS-39 | DS10 |
| FS-79 to FS-85 | URS-40 | DS10 |
| FS-86 to FS-90 | URS-16, URS-30 | DS08 |
| FS-91 to FS-98 | URS-42, URS-43, URS-44, URS-45, URS-46 | DS09 |

---

## 7. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Quality Assurance | | | |
| Product Owner | | | |

---

*End of Functional Specification*
