# Design Spec: src/reason/contradiction_detector.js

ID: DS(/reason/contradiction_detector.js)

Status: IMPLEMENTED v1.0

## 1. Purpose

Detect logical contradictions in the knowledge base. **Currently implemented:**
- **Disjointness violations**: X IS_A A and X IS_A B where A DISJOINT_WITH B (including default pairs)
- **Functional constraint violations**: X REL Y and X REL Z where REL is functional
- **Taxonomic inconsistencies**: Cycles in IS_A hierarchy, inherited disjointness
- **Cardinality violations**: More instances than allowed by constraints

**Not yet implemented (marked as TODO):**
- Direct negations (A and NOT A)
- Temporal inconsistencies

---

## 2. Contradiction Types

### 2.1 Type 1: Direct Negation
```
Fact: Dog IS_A mammal
Fact: Dog NOT_IS_A mammal
→ CONTRADICTION
```

### 2.2 Type 2: Disjointness Violation
```
Fact: Cat DISJOINT_WITH Dog
Fact: Fluffy IS_A Cat
Fact: Fluffy IS_A Dog
→ CONTRADICTION (Fluffy cannot be both Cat and Dog)
```

### 2.3 Type 3: Taxonomic Inconsistency
```
Fact: mammal DISJOINT_WITH reptile
Fact: Platypus IS_A mammal
Fact: Platypus IS_A reptile
→ CONTRADICTION (via inherited disjointness)
```

### 2.4 Type 4: Functional Relation Violation
```
Relation: BORN_IN is functional (each entity has exactly one birthplace)
Fact: Alice BORN_IN Paris
Fact: Alice BORN_IN London
→ CONTRADICTION (unless Paris = London)
```

### 2.5 Type 5: Inverse Consistency
```
Relation: PARENT_OF inverse of CHILD_OF
Fact: Alice PARENT_OF Bob
Fact: Bob PARENT_OF Alice
→ CONTRADICTION (circular parenthood)
```

### 2.6 Type 6: Temporal Contradiction (TODO - Not Implemented)
```
Fact: Alice LOCATED_IN Paris [time=T1]
Fact: Alice LOCATED_IN Tokyo [time=T1]
→ CONTRADICTION (same time, exclusive locations)
```
**Note**: Temporal contradiction detection is not yet implemented in the current codebase.

### 2.7 Type 7: Cardinality Violation
```
Constraint: Person HAS_MAX_PARENTS 2
Fact: Bob PARENT_OF Alice
Fact: Carol PARENT_OF Alice
Fact: Dave PARENT_OF Alice
→ CONTRADICTION (3 parents > max 2)
```

---

## 3. API Interface

### 3.1 ContradictionDetector Class

```javascript
class ContradictionDetector {
  constructor({ store, reasoner, config }) {
    this.store = store;
    this.reasoner = reasoner;
    this.config = config;
    this.functionalRelations = new Set(['BORN_IN', 'BIOLOGICAL_MOTHER', 'BIOLOGICAL_FATHER']);
    this.cardinalityConstraints = new Map(); // "subject|relation" → { min, max }
    this.defaultDisjointPairs = [...]; // Pre-defined biological/categorical disjoint pairs
  }

  // Main entry point: check all facts for contradictions
  detectAll(facts, options = {}) → ContradictionReport
  // options: { checkDisjointness, checkFunctional, checkTaxonomic, checkCardinality }
  // Note: checkTemporal not yet implemented

  // Check if adding a new fact would cause contradiction
  wouldContradict(newFact, existingFacts) → ContradictionResult

  // Check specific contradiction types
  checkDisjointness(facts) → Contradiction[]  // Includes default pairs + explicit DISJOINT_WITH
  checkFunctional(facts) → Contradiction[]
  checkTaxonomic(facts) → Contradiction[]     // Cycles + inherited disjointness
  checkCardinality(facts) → Contradiction[]

  // Register constraints
  registerFunctionalRelation(relationName)
  registerCardinalityConstraint(subjectType, relation, min, max)
}
```

### 3.2 Default Disjoint Pairs

The implementation includes pre-defined disjoint pairs for common categories:
- Biological: mammal/fish, mammal/bird, mammal/reptile, bird/fish, etc.
- Animals: cat/dog, cat/bird, dog/fish, etc.
- Categories: animal/plant, living/dead, true/false

These are checked automatically without requiring explicit DISJOINT_WITH facts.

### 3.3 Data Structures

```javascript
// Contradiction result
{
  type: 'DISJOINT_VIOLATION' | 'FUNCTIONAL_VIOLATION' | 'TAXONOMIC_CYCLE' | 'INHERITED_DISJOINT' | 'CARDINALITY_MIN_VIOLATION' | 'CARDINALITY_MAX_VIOLATION',
  severity: 'ERROR' | 'WARNING',
  entity?: string,              // For DISJOINT_VIOLATION
  types?: [typeA, typeB],       // For DISJOINT_VIOLATION
  subject?: string,             // For FUNCTIONAL_VIOLATION
  relation?: string,            // For FUNCTIONAL/CARDINALITY
  values?: string[],            // For FUNCTIONAL_VIOLATION
  cycle?: string[],             // For TAXONOMIC_CYCLE
  facts: [fact1, fact2, ...],   // The conflicting facts
  explanation: string,          // Human-readable explanation
  resolution: string[]          // Suggested resolutions
}

// Full report
{
  consistent: boolean,
  contradictions: Contradiction[],
  checkedFacts: number,
  timestamp: ISO8601
}
```

---

## 4. Sys2DSL Commands

### 4.1 CHECK_CONTRADICTION
```sys2dsl
# Check entire knowledge base
@result CHECK_CONTRADICTION

# Check specific facts
@result CHECK_CONTRADICTION $factList

# Check if new fact would contradict
@wouldConflict CHECK_WOULD_CONTRADICT Dog IS_A reptile
```

### 4.2 REGISTER_FUNCTIONAL
```sys2dsl
# Mark relation as functional (single-valued)
@_ REGISTER_FUNCTIONAL BORN_IN
@_ REGISTER_FUNCTIONAL BIOLOGICAL_MOTHER
```

### 4.3 REGISTER_CARDINALITY
```sys2dsl
# Set cardinality constraints
@_ REGISTER_CARDINALITY Person PARENT_OF min=0 max=*
@_ REGISTER_CARDINALITY Person HAS_BIOLOGICAL_PARENT min=2 max=2
```

### 4.4 FIND_CONFLICTS
```sys2dsl
# Find all facts conflicting with a given fact
@conflicts FIND_CONFLICTS Alice LOCATED_IN Paris
```

---

## 5. Algorithm: Disjointness Check

```javascript
checkDisjointness(facts) {
  const contradictions = [];
  const disjointPairs = this._getDisjointPairs(facts);
  const isAFacts = facts.filter(f => f.relation === 'IS_A');

  // Build type assignments: entity → Set<types>
  const typeAssignments = new Map();
  for (const fact of isAFacts) {
    if (!typeAssignments.has(fact.subject)) {
      typeAssignments.set(fact.subject, new Set());
    }
    typeAssignments.get(fact.subject).add(fact.object);

    // Add inherited types (transitive closure)
    const inherited = this._getAncestors(fact.object, facts);
    for (const t of inherited) {
      typeAssignments.get(fact.subject).add(t);
    }
  }

  // Check each entity against disjoint pairs
  for (const [entity, types] of typeAssignments) {
    for (const [typeA, typeB] of disjointPairs) {
      if (types.has(typeA) && types.has(typeB)) {
        contradictions.push({
          type: 'DISJOINT_VIOLATION',
          severity: 'ERROR',
          facts: this._findCausingFacts(entity, typeA, typeB, facts),
          explanation: `${entity} cannot be both ${typeA} and ${typeB} (they are disjoint)`,
          resolution: [`Retract "${entity} IS_A ${typeA}"`, `Retract "${entity} IS_A ${typeB}"`]
        });
      }
    }
  }

  return contradictions;
}
```

---

## 6. Algorithm: Functional Relation Check

```javascript
checkFunctional(facts) {
  const contradictions = [];

  for (const relation of this.functionalRelations) {
    // Group facts by subject
    const bySubject = new Map();
    for (const fact of facts) {
      if (fact.relation === relation) {
        if (!bySubject.has(fact.subject)) {
          bySubject.set(fact.subject, []);
        }
        bySubject.get(fact.subject).push(fact);
      }
    }

    // Check for multiple values
    for (const [subject, relFacts] of bySubject) {
      if (relFacts.length > 1) {
        const objects = relFacts.map(f => f.object);
        // Check if objects are equivalent
        if (!this._areEquivalent(objects, facts)) {
          contradictions.push({
            type: 'FUNCTIONAL_VIOLATION',
            severity: 'ERROR',
            facts: relFacts,
            explanation: `${subject} has multiple ${relation} values: ${objects.join(', ')}`,
            resolution: objects.map(o => `Retract "${subject} ${relation} ${o}"`)
          });
        }
      }
    }
  }

  return contradictions;
}
```

---

## 7. Algorithm: Taxonomic Consistency

```javascript
checkTaxonomic(facts) {
  const contradictions = [];

  // Check for cycles in IS_A hierarchy
  const cycles = this._findCycles(facts, 'IS_A');
  for (const cycle of cycles) {
    contradictions.push({
      type: 'TAXONOMIC_CYCLE',
      severity: 'ERROR',
      facts: this._cycleToFacts(cycle, facts),
      explanation: `Circular taxonomy: ${cycle.join(' → ')}`,
      resolution: ['Break the cycle by retracting one IS_A relation']
    });
  }

  // Check inherited disjointness
  // If A DISJOINT_WITH B and C IS_A A, then C DISJOINT_WITH B
  const disjointPairs = this._getDisjointPairs(facts);
  for (const [typeA, typeB] of disjointPairs) {
    const descendantsA = this._getDescendants(typeA, facts);
    const descendantsB = this._getDescendants(typeB, facts);

    // Check for overlap
    for (const descA of descendantsA) {
      if (descendantsB.has(descA)) {
        contradictions.push({
          type: 'INHERITED_DISJOINT',
          severity: 'ERROR',
          explanation: `${descA} inherits from both ${typeA} and ${typeB} which are disjoint`
        });
      }
    }
  }

  return contradictions;
}
```

---

## 8. Integration with VALIDATE Command

Update `_cmdValidate` in dsl_engine.js:

```javascript
_cmdValidate(argTokens, env, facts) {
  const detector = new ContradictionDetector({
    store: this.conceptStore,
    reasoner: this._reasoner,
    config: this.config
  });

  const report = detector.detectAll(facts, {
    checkDisjointness: true,
    checkFunctional: true,
    checkTaxonomic: true,
    checkTemporal: true,
    checkCardinality: true
  });

  return {
    consistent: report.consistent,
    contradictions: report.contradictions,
    factCount: facts.length,
    timestamp: new Date().toISOString()
  };
}
```

---

## 9. Test Cases

### 9.1 Disjointness
```sys2dsl
@f1 Cat DISJOINT_WITH Dog
@f2 Fluffy IS_A Cat
@f3 Fluffy IS_A Dog
@result any CHECK_CONTRADICTION any
# Expected: { consistent: false, contradictions: [DISJOINT_VIOLATION] }
```

### 9.2 Functional
```sys2dsl
@_ BORN_IN REGISTER_FUNCTIONAL any
@f1 Alice BORN_IN Paris
@f2 Alice BORN_IN London
@result any CHECK_CONTRADICTION any
# Expected: { consistent: false, contradictions: [FUNCTIONAL_VIOLATION] }
```

### 9.3 Would Contradict
```sys2dsl
@f1 Cat DISJOINT_WITH Dog
@f2 Fluffy IS_A Cat
@test Fluffy CHECK_WOULD_CONTRADICT Dog
# Expected: { wouldContradict: true, reason: 'DISJOINT_VIOLATION' }
```

---

## 10. Performance Considerations

- **Indexing**: Maintain indexes by subject, relation, object for O(1) lookups
- **Incremental**: On new fact, only check relevant contradictions
- **Caching**: Cache transitive closure of IS_A hierarchy
- **Limits**: Configurable max depth for inheritance checks

---

## 11. Related Documents

- DS(/reason/inference_engine) - Deductive inference
- DS(/reason/validation.js) - Geometric consistency
- DS(/theory/dsl_engine.js) - VALIDATE command
- DS(/knowledge/concept_store.js) - Fact storage
