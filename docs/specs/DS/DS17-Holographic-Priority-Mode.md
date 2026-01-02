# AGISystem2 - System Specifications

# Chapter 17: Holographic Priority Mode

**Document Version:** 1.0
**Author:** Sînică Alboaie
**Status:** Experimental

> **Note:** Holographic Priority Mode is an experimental feature for research and large-scale optimization scenarios. The default `symbolicPriority` mode prioritizes exact symbolic reasoning and is recommended for production use. See DS01 Section 1.10 for the dual reasoning architecture.

---

## 17.1 Overview

AGISystem2 supports two reasoning modes that determine how HDC and symbolic reasoning interact:

| Mode | Description | Use Case |
|------|-------------|----------|
| `symbolicPriority` | Symbolic reasoning first, HDC for storage/indexing | Default, exact-first reasoning |
| `holographicPriority` | HDC operations first, symbolic validation | Research, heuristic-first with validation |

**Key insight:** In `holographicPriority`, the HDC substrate becomes the primary reasoning mechanism, with symbolic logic serving as validation. This inverts the traditional hierarchy.

```
symbolicPriority (Current):
  Query → Symbolic Reasoning → HDC Storage → Metadata = Authoritative

holographicPriority (New):
  Query → HDC Unbind → Candidates → Symbolic Validation → Validated Results
```

---

## 17.2 Configuration

### 17.2.1 Environment Variable

```bash
# Reasoning priority (default: symbolicPriority)
REASONING_PRIORITY=symbolicPriority    # Current behavior
REASONING_PRIORITY=holographicPriority # HDC-first mode
```

### 17.2.2 Combined Configurations

`REASONING_PRIORITY` controls the **engine policy** (symbolic-first vs HDC-first), while `SYS2_HDC_STRATEGY` controls the **vector substrate** (exact vs approximate, geometry semantics, similarity metric, and performance profile).

In practice:
- `symbolicPriority` treats symbolic results as authoritative, using HDC primarily for storage/indexing/candidate generation.
- `holographicPriority` uses HDC to propose candidates and always validates results symbolically (with configurable fallback).

### 17.2.3 Constants Definition

```javascript
// In src/core/constants.mjs

export const REASONING_PRIORITY = {
  SYMBOLIC: 'symbolicPriority',
  HOLOGRAPHIC: 'holographicPriority'
};

export function getReasoningPriority() {
  return process.env.REASONING_PRIORITY || REASONING_PRIORITY.SYMBOLIC;
}

// Holographic mode thresholds are strategy-defined and loaded from per-strategy modules.
// See getHolographicThresholds(strategy) in src/core/constants.mjs.
```

---

## 17.3 Architecture: Parallel Modules

**Design principle:** No mixing with existing code. Holographic mode is implemented as parallel modules.

```
src/reasoning/
├── index.mjs                    # Dispatcher (routes to correct impl)
├── query.mjs                    # Symbolic query (UNCHANGED)
├── prove.mjs                    # Symbolic prove (UNCHANGED)
├── csp/solver.mjs               # Symbolic CSP (UNCHANGED)
│
└── holographic/                 # NEW: HDC-first implementations
    ├── index.mjs                # Module exports
    ├── query-hdc-first.mjs      # HDC unbind → symbolic validation
    ├── prove-hdc-first.mjs      # HDC similarity → symbolic validation
    └── csp-hdc-heuristic.mjs    # Constraint satisfaction vectors
```

### 17.3.1 Dispatcher Pattern

```javascript
// src/reasoning/index.mjs

import { getReasoningPriority, REASONING_PRIORITY } from '../core/constants.mjs';
import { QueryEngine } from './query.mjs';
import { ProofEngine } from './prove.mjs';
import { HolographicQueryEngine } from './holographic/query-hdc-first.mjs';
import { HolographicProofEngine } from './holographic/prove-hdc-first.mjs';

export function createQueryEngine(session) {
  const priority = getReasoningPriority();
  if (priority === REASONING_PRIORITY.HOLOGRAPHIC) {
    return new HolographicQueryEngine(session);
  }
  return new QueryEngine(session);
}

export function createProofEngine(session) {
  const priority = getReasoningPriority();
  if (priority === REASONING_PRIORITY.HOLOGRAPHIC) {
    return new HolographicProofEngine(session);
  }
  return new ProofEngine(session);
}
```

---

## 17.4 HDC-First Query

### 17.4.1 Algorithm

```
hdcFirstQuery(statement):
  1. Parse query → operator, knowns, holes
  2. Build partial query vector (skip holes)
  3. For each hole:
     a. unbind(KB_bundle, partial) → candidate vectors
     b. If the active HDC strategy supports decoding:
        topK = decodeUnboundCandidates(unboundVec, domain?, knowns?)
        Else:
        topK = findTopKSimilar(unboundVec, vocabulary, MAX_CANDIDATES)
     c. filter by MIN_SIMILARITY threshold
  4. For each candidate combination:
     a. Build complete statement
     b. Validate with symbolic prove()
     c. If valid → add to results
  5. If no validated results AND FALLBACK_TO_SYMBOLIC:
     a. Fall back to symbolic query
  6. Return results with method='hdc_validated' or 'symbolic_fallback'
```

### 17.4.2 Implementation

```javascript
// src/reasoning/holographic/query-hdc-first.mjs

export class HolographicQueryEngine {
  constructor(session) {
    this.session = session;
    this.symbolicEngine = new QueryEngine(session);
    this.config = getHolographicThresholds(session.hdcStrategy);
  }

  query(statement) {
    const { operator, knowns, holes } = this.parseQuery(statement);

    // Step 1: HDC unbind to find candidates
    const candidates = this.hdcUnbindCandidates(operator, knowns, holes);

    // Step 2: Validate with symbolic
    const validatedResults = [];
    for (const candidate of candidates) {
      const fullStatement = this.buildStatement(operator, knowns, candidate.bindings);
      const validation = this.session.prove(fullStatement);

      if (validation.valid) {
        validatedResults.push({
          bindings: candidate.bindings,
          score: candidate.hdcScore,
          method: 'hdc_validated',
          validationConfidence: validation.confidence
        });
      }
    }

    // Step 3: Fallback if needed
    if (validatedResults.length === 0 && this.config.FALLBACK_TO_SYMBOLIC) {
      this.session.reasoningStats.symbolicFallbacks++;
      return this.symbolicEngine.query(statement);
    }

    return {
      success: validatedResults.length > 0,
      allResults: validatedResults,
      method: 'holographic_priority'
    };
  }

  hdcUnbindCandidates(operator, knowns, holes) {
    // Build partial query vector
    let queryVec = this.session.getVector(operator);
    for (const known of knowns) {
      queryVec = bind(queryVec, withPosition(known.position, known.vector));
    }

    const candidates = [];
    const kbBundle = this.session.getKBBundle();

    // For each hole, extract candidates via unbind
    for (const hole of holes) {
      const unboundVec = unbind(kbBundle, queryVec);
      const strategy = this.session?.hdc?.strategy || null;
      const topK = typeof strategy?.decodeUnboundCandidates === 'function'
        ? strategy.decodeUnboundCandidates(unboundVec, {
            session: this.session,
            operatorName: operator.name,
            holeIndex: hole.position
          })
        : this.session.topKSimilar(
            unboundVec,
            this.session.vocabulary,
            this.config.UNBIND_MAX_CANDIDATES
          );

      for (const match of topK) {
        if (match.similarity >= this.config.UNBIND_MIN_SIMILARITY) {
          candidates.push({
            hole: hole.name,
            value: match.name,
            hdcScore: match.similarity
          });
          this.session.reasoningStats.hdcUnbindSuccesses++;
        }
      }
      this.session.reasoningStats.hdcUnbindAttempts++;
    }

    return this.combineCandidates(candidates, holes);
  }
}
```

---

## 17.5 HDC-First Prove

### 17.5.1 Algorithm

```
hdcFirstProve(goal):
  1. Build goal vector
  2. Compute similarity(goalVec, KB_bundle)
  3. If similarity > threshold:
     a. Attempt symbolic proof for validation
     b. If valid → return {valid: true, method: 'hdc_validated'}
  4. If HDC fails or validation fails:
     a. Fall back to full symbolic prove
  5. Return result with provenance
```

### 17.5.2 Implementation

```javascript
// src/reasoning/holographic/prove-hdc-first.mjs

export class HolographicProofEngine {
  constructor(session) {
    this.session = session;
    this.symbolicEngine = new ProofEngine(session);
    this.config = getHolographicThresholds(session.hdcStrategy);
  }

  prove(goal) {
    const goalVec = this.session.executor.buildStatementVector(goal);
    const kbSimilarity = similarity(goalVec, this.session.getKBBundle());

    // HDC similarity check
    if (kbSimilarity > this.config.UNBIND_MIN_SIMILARITY) {
      this.session.reasoningStats.hdcValidationAttempts++;

      // Validate with symbolic
      const symbolicProof = this.symbolicEngine.prove(goal);

      if (symbolicProof.valid) {
        this.session.reasoningStats.hdcValidationSuccesses++;
        return {
          valid: true,
          method: 'hdc_validated',
          hdcSimilarity: kbSimilarity,
          symbolicConfidence: symbolicProof.confidence,
          confidence: Math.min(kbSimilarity, symbolicProof.confidence),
          steps: symbolicProof.steps
        };
      }
    }

    // Fallback to symbolic
    if (this.config.FALLBACK_TO_SYMBOLIC) {
      this.session.reasoningStats.symbolicFallbacks++;
      const result = this.symbolicEngine.prove(goal);
      result.method = 'symbolic_fallback';
      return result;
    }

    return { valid: false, method: 'hdc_failed' };
  }
}
```

---

## 17.6 CSP with Constraint Satisfaction Vectors

**Key innovation:** Use HDC to encode constraint satisfaction as vectors, enabling heuristic domain ordering.

### 17.6.1 Constraint Satisfaction Vector (Option B)

For constraint `conflictsWith Alice Bob` (must be at different tables):

```javascript
// Build "satisfaction vector" representing valid states

buildConstraintSatisfaction(constraint, session) {
  const { type, args } = constraint;

  if (type === 'noConflict') {
    const [entity1, entity2] = args;
    const tables = session.findAllOfType('Table');

    // Bundle of valid assignments: entities at DIFFERENT tables
    const validAssignments = [];
    for (let i = 0; i < tables.length; i++) {
      for (let j = 0; j < tables.length; j++) {
        if (i !== j) {  // Different tables = valid
          validAssignments.push(
            bundle([
              bind(session.getVector(entity1),
                   withPosition(1, session.getVector(tables[i]))),
              bind(session.getVector(entity2),
                   withPosition(1, session.getVector(tables[j])))
            ])
          );
        }
      }
    }
    // Superposition of all valid states
    return bundle(validAssignments);
  }

  // Other constraint types...
  return null;
}
```

### 17.6.2 HDC Domain Ordering

```javascript
// Score how well a candidate value satisfies active constraints

scoreCandidate(variable, value, constraints, session) {
  let totalScore = 0;
  const activeConstraints = constraints.filter(c => c.involves(variable));

  for (const constraint of activeConstraints) {
    const satisfactionVec = buildConstraintSatisfaction(constraint, session);
    const assignmentVec = bind(
      session.getVector(variable),
      withPosition(1, session.getVector(value))
    );
    totalScore += similarity(assignmentVec, satisfactionVec);
  }

  return totalScore / Math.max(1, activeConstraints.length);
}

// Order domain by HDC heuristic score
orderDomainByHDC(variable, domain, constraints, session) {
  const scored = domain.map(value => ({
    value,
    score: scoreCandidate(variable, value, constraints, session)
  }));

  scored.sort((a, b) => b.score - a.score);
  session.reasoningStats.cspHeuristicOrderings++;

  return scored.map(s => s.value);
}
```

### 17.6.3 Integration with CSP Solver

```javascript
// src/reasoning/holographic/csp-hdc-heuristic.mjs

export class HolographicCSPSolver {
  constructor(session) {
    this.session = session;
    this.symbolicSolver = new CSPSolver(session);
    this.config = getHolographicThresholds(session.hdcStrategy);
  }

  solve(problem) {
    // Build constraint satisfaction vectors
    const satisfactionVecs = new Map();
    for (const constraint of problem.constraints) {
      satisfactionVecs.set(
        constraint.id,
        buildConstraintSatisfaction(constraint, this.session)
      );
    }

    // Modified backtracking with HDC ordering
    return this.backtrackWithHDC(
      problem.variables,
      problem.domains,
      problem.constraints,
      satisfactionVecs,
      new Map()  // assignments
    );
  }

  backtrackWithHDC(variables, domains, constraints, satisfactionVecs, assignments) {
    if (assignments.size === variables.length) {
      return { success: true, solution: Object.fromEntries(assignments) };
    }

    // Select unassigned variable (MRV heuristic)
    const variable = this.selectVariable(variables, domains, assignments);

    // ORDER DOMAIN BY HDC HEURISTIC (key difference from symbolic)
    const orderedDomain = orderDomainByHDC(
      variable,
      domains.get(variable),
      constraints,
      this.session
    );

    for (const value of orderedDomain) {
      if (this.isConsistent(variable, value, assignments, constraints)) {
        assignments.set(variable, value);

        const result = this.backtrackWithHDC(
          variables, domains, constraints, satisfactionVecs, assignments
        );

        if (result.success) return result;
        assignments.delete(variable);
      }
    }

    return { success: false };
  }
}
```

---

## 17.7 Statistics Tracking

### 17.7.1 Extended Stats

```javascript
// In Session constructor
this.reasoningStats = {
  // Existing stats...

  // NEW: Holographic mode stats
  hdcUnbindAttempts: 0,        // Total unbind operations
  hdcUnbindSuccesses: 0,       // Candidates found above threshold
  hdcValidationAttempts: 0,    // HDC results sent for validation
  hdcValidationSuccesses: 0,   // HDC results that passed validation
  hdcEquivalentOps: 0,         // HDC result set == symbolic result set (when fallback runs)
  symbolicFallbacks: 0,        // Times we fell back to symbolic
  cspHeuristicOrderings: 0     // CSP domains ordered by HDC
};
```

**Note on interpretation:**
- `hdcValidationSuccesses` answers “did HDC produce at least one valid candidate?”
- `hdcEquivalentOps` answers “did HDC produce the same set of answers as symbolic for this query?”
- The *final* returned method may still be symbolic (by priority/proof richness) even if `hdcEquivalentOps` holds.

### 17.7.2 Metrics Computation

```javascript
// HDC effectiveness rate
const hdcEffectiveness = stats.hdcValidationSuccesses /
                         Math.max(1, stats.hdcValidationAttempts);

// Fallback rate (lower = better HDC)
const fallbackRate = stats.symbolicFallbacks /
                     Math.max(1, stats.hdcUnbindAttempts + stats.hdcValidationAttempts);

// CSP heuristic usage
const cspHeuristicUsage = stats.cspHeuristicOrderings;
```

---

## 17.8 EvalSuite Integration

### 17.8.1 Multi-Configuration Runner (Example)

```javascript
// evals/runFastEval.mjs

const CONFIGURATIONS = [
  { strategy: 'exact', priority: 'symbolicPriority' },
  { strategy: 'exact', priority: 'holographicPriority' },
  { strategy: 'dense-binary', priority: 'symbolicPriority' },
  { strategy: 'dense-binary', priority: 'holographicPriority' }
];

async function runAllConfigurations() {
  const results = [];

  for (const config of CONFIGURATIONS) {
    process.env.SYS2_HDC_STRATEGY = config.strategy;
    process.env.REASONING_PRIORITY = config.priority;

    const suiteResults = await runAllSuites();
    results.push({
      config,
      ...suiteResults
    });
  }

  return results;
}
```

### 17.8.2 Output Format (Example)

```
┌─────────────────────┬────────────────────────────┬────────────────────────────┐
│                     │      symbolicPriority      │    holographicPriority     │
│ Suite               ├──────────────┬─────────────┼──────────────┬─────────────┤
│                     │ dense-binary │ sparse-poly │ dense-binary │ sparse-poly │
├─────────────────────┼──────────────┼─────────────┼──────────────┼─────────────┤
│ #01 Foundations     │  PASS 18ms   │  PASS 6ms   │  PASS 22ms   │  PASS 8ms   │
│ #02 Hierarchies     │  PASS 8ms    │  PASS 4ms   │  PASS 10ms   │  PASS 5ms   │
│ #03 Rules           │  PASS 13ms   │  PASS 8ms   │  PASS 15ms   │  PASS 9ms   │
│ ...                 │              │             │              │             │
├─────────────────────┼──────────────┼─────────────┼──────────────┼─────────────┤
│ TOTAL               │  PASS 108ms  │  PASS 78ms  │  PASS 95ms   │  PASS 72ms  │
└─────────────────────┴──────────────┴─────────────┴──────────────┴─────────────┘

Holographic Stats (dense-binary):
  Validations passed: 85 / 100
  Symbolic fallbacks: 15 / 100
  CSP Heuristic Uses: 12
```

---

## 17.9 Test Suite: Holographic Priority

### 17.9.1 Suite Definition

```javascript
// evals/fastEval (suites live here)

export const name = 'Holographic Priority';
export const description = 'Tests for HDC-first reasoning with validation';

export const steps = [
  // === Test 1: HDC unbind finds correct answer ===
  {
    action: 'learn',
    input_dsl: `
      isA Fido Dog
      isA Dog Animal
      isA Rex Dog
      isA Cat Animal
    `,
    expected_nl: 'Learned 4 facts'
  },
  {
    action: 'query',
    input_nl: 'What is Fido?',
    input_dsl: '@q isA Fido ?type',
    expected_nl: ['Fido is a dog.'],
    proof_nl: ['isA Fido Dog']
    // HDC unbind should find Dog, validation confirms
  },

  // === Test 2: HDC candidate rejected by validation ===
  {
    action: 'learn',
    input_dsl: `
      @negFidoCat isA Fido Cat
      Not $negFidoCat
    `,
    expected_nl: 'Learned 2 facts'
  },
  {
    action: 'prove',
    input_nl: 'Is Fido a Cat?',
    input_dsl: '@goal isA Fido Cat',
    expected_nl: 'Cannot prove: Fido is a cat.',
    proof_nl: 'Not isA Fido Cat (direct negation fact)'
    // HDC might suggest Cat (similar), but validation rejects
  },

  // === Test 3: Transitive with HDC acceleration ===
  {
    action: 'learn',
    input_dsl: `
      isA Poodle Dog
      isA Dog Mammal
      isA Mammal Animal
      isA Animal LivingThing
      isA LivingThing Entity
    `,
    expected_nl: 'Learned 5 facts'
  },
  {
    action: 'prove',
    input_nl: 'Is Poodle an Entity?',
    input_dsl: '@goal isA Poodle Entity',
    expected_nl: 'True: Poodle is an entity.',
    proof_nl: 'isA Poodle Dog. isA Dog Mammal. isA Mammal Animal. isA Animal LivingThing. isA LivingThing Entity.'
    // HDC similarity should detect, symbolic validates chain
  },

  // === Test 4: CSP with HDC heuristic ===
  {
    action: 'learn',
    input_dsl: `
      isA Guest1 Guest
      isA Guest2 Guest
      isA Guest3 Guest
      isA Table1 Table
      isA Table2 Table
      conflictsWith Guest1 Guest2
      conflictsWith Guest2 Guest1
    `,
    expected_nl: 'Learned 7 facts'
  },
  // CSP solve benefits from HDC ordering for larger problems

  // === Test 5: Fallback to symbolic ===
  {
    action: 'prove',
    input_nl: 'Complex rule that HDC cannot shortcut',
    input_dsl: `@goal hasStatus ComplexEntity DerivedProperty`,
    expected_nl: 'Cannot prove: hasStatus ComplexEntity DerivedProperty.',
    proof_nl: 'No hasStatus ComplexEntity DerivedProperty fact; no rule derives hasStatus ?x DerivedProperty for ComplexEntity.'
    // HDC won't find match, fallback to symbolic proves inability
  }
];
```

---

## 17.10 Implementation Roadmap

| Step | File | Changes |
|------|------|---------|
| 1 | `src/core/constants.mjs` | Add REASONING_PRIORITY, HOLOGRAPHIC_THRESHOLDS |
| 2 | `src/reasoning/holographic/index.mjs` | Create module exports |
| 3 | `src/reasoning/holographic/query-hdc-first.mjs` | HDC unbind + validation |
| 4 | `src/reasoning/holographic/prove-hdc-first.mjs` | HDC similarity + validation |
| 5 | `src/reasoning/holographic/csp-hdc-heuristic.mjs` | Constraint satisfaction vectors |
| 6 | `src/reasoning/index.mjs` | Add dispatcher |
| 7 | `src/runtime/session.mjs` | Use dispatcher, track stats |
| 8 | `evals/runFastEval.mjs` | Run fast eval configurations |
| 9 | `evals/fastEval/lib/reporter.mjs` | Multi-column output |
| 10 | `evals/fastEval/*/cases.mjs` | Suites (per topic) |

---

## 17.11 Success Criteria

| Metric | symbolicPriority | holographicPriority |
|--------|------------------|---------------------|
| Correctness | Symbolic results | Must not emit unvalidated answers |
| Speed (small) | Baseline | ~Same |
| Speed (large) | Slow | Faster (HDC shortcuts) |
| CSP (large) | Exhaustive | Heuristic ordering |

---

## 17.12 Summary

| Component | symbolicPriority | holographicPriority |
|-----------|------------------|---------------------|
| Query | Symbolic → HDC storage | HDC unbind → Symbolic validate |
| Prove | Rule chains → HDC verify | HDC similarity → Symbolic validate |
| CSP | Exhaustive backtrack | HDC-ordered domain + backtrack |
| Authority | Metadata | HDC first, validated by metadata |
| Fallback | N/A | Symbolic (configurable) |

**Key insight:** `holographicPriority` treats the HDC substrate as a "fast approximation engine" that proposes answers, while symbolic reasoning serves as a "validation oracle" that ensures correctness.

---

*End of Chapter 17*
