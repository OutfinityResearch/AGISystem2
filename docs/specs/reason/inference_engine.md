# Design Spec: Complete Inference Engine

ID: DS(/reason/inference_engine)

Status: DRAFT v1.0

## 1. Purpose

Provide complete logical inference capabilities:
- **Deduction**: Derive conclusions from premises (A→B, A ⊢ B)
- **Transitive Closure**: Follow chains of relations
- **Inverse Relations**: If A REL B, derive B INVERSE_REL A
- **Default Reasoning**: Handle typical/exceptional cases
- **Rule Application**: Apply user-defined inference rules

---

## 2. Inference Types

### 2.1 Direct Fact Lookup
```
Query: Dog IS_A mammal?
Facts: [Dog IS_A mammal]
Result: TRUE_CERTAIN (direct match)
```

### 2.2 Transitive Inference
```
Query: Dog IS_A animal?
Facts: [Dog IS_A mammal, mammal IS_A animal]
Result: TRUE_CERTAIN (via chain: Dog → mammal → animal)
```

### 2.3 Symmetric Inference
```
Query: Bob SIBLING_OF Alice?
Facts: [Alice SIBLING_OF Bob]
Relation: SIBLING_OF is symmetric
Result: TRUE_CERTAIN (symmetric closure)
```

### 2.4 Inverse Inference
```
Query: Bob CHILD_OF Alice?
Facts: [Alice PARENT_OF Bob]
Relation: CHILD_OF inverse of PARENT_OF
Result: TRUE_CERTAIN (inverse relation)
```

### 2.5 Composition Inference
```
Rule: X GRANDPARENT_OF Z ← X PARENT_OF Y, Y PARENT_OF Z
Facts: [Alice PARENT_OF Bob, Bob PARENT_OF Charlie]
Query: Alice GRANDPARENT_OF Charlie?
Result: TRUE_CERTAIN (rule application)
```

### 2.6 Default Reasoning (Non-monotonic)
```
Default: Birds typically fly
Fact: Tweety IS_A bird
Fact: Penguin IS_A bird
Fact: Penguin EXCEPTION_TO fly
Fact: Pete IS_A Penguin

Query: Tweety CAN fly? → TRUE (default applies)
Query: Pete CAN fly? → FALSE (exception blocks default)
```

### 2.7 Inheritance Inference
```
Fact: mammal HAS_PROPERTY warm_blooded
Fact: Dog IS_A mammal
Query: Dog HAS_PROPERTY warm_blooded?
Result: TRUE_CERTAIN (property inheritance)
```

### 2.8 Argument Type Inference
```
Facts: [X R Y, Y IS_A T]
Query: X R T?
Result: TRUE_CERTAIN (argument type inference)

Reasoning: If X has relation R with Y, and Y is of type T,
then X has relation R with something of type T.
```

This inference pattern is fundamental for semantic reasoning:
- It generalizes specific instances to their types
- Works with any relation, not just IS_A
- Enables questions about categories when only instances are known

**Formal definition:**
```
∀X,Y,T,R: (X R Y) ∧ (Y IS_A T) → X R_some T
```

Where `R_some` means "R with some instance of".

---

## 3. API Interface

### 3.1 InferenceEngine Class

```javascript
class InferenceEngine {
  constructor({ store, reasoner, detector, config }) {
    this.store = store;
    this.reasoner = reasoner;
    this.detector = detector; // ContradictionDetector
    this.config = config;
    this.rules = [];          // Custom inference rules
    this.defaults = [];       // Default reasoning rules
  }

  // Main inference entry point
  infer(subject, relation, object, options = {}) → InferenceResult

  // Specific inference methods
  inferDirect(subject, relation, object, facts) → InferenceResult
  inferTransitive(subject, relation, object, facts) → InferenceResult
  inferSymmetric(subject, relation, object, facts) → InferenceResult
  inferInverse(subject, relation, object, facts) → InferenceResult
  inferComposition(subject, relation, object, facts) → InferenceResult
  inferDefault(subject, relation, object, facts) → InferenceResult
  inferInheritance(subject, relation, object, facts) → InferenceResult
  inferArgumentType(subject, relation, objectType, facts) → InferenceResult

  // Build proof chain
  prove(subject, relation, object, facts) → ProofChain

  // Find all conclusions from a fact set
  forwardChain(facts, maxIterations) → Fact[]

  // Register custom rules
  registerRule(rule: InferenceRule)
  registerDefault(defaultRule: DefaultRule)
}
```

### 3.2 Data Structures

```javascript
// Inference result
{
  truth: 'TRUE_CERTAIN' | 'TRUE_DEFAULT' | 'PLAUSIBLE' | 'FALSE' | 'UNKNOWN',
  method: 'direct' | 'transitive' | 'symmetric' | 'inverse' | 'composition' | 'default' | 'inheritance' | 'argument_type_inference',
  confidence: 0.0 - 1.0,
  proof: ProofChain,       // How we got here
  assumptions: string[]     // For default reasoning
}

// Proof chain
{
  goal: { subject, relation, object },
  steps: [
    { fact: {...}, justification: 'direct' | 'rule:...' },
    ...
  ],
  valid: boolean
}

// Inference rule
{
  name: string,
  head: { subject: '?x', relation: 'REL', object: '?z' },
  body: [
    { subject: '?x', relation: 'REL1', object: '?y' },
    { subject: '?y', relation: 'REL2', object: '?z' }
  ]
}

// Default rule
{
  name: string,
  typical: { type: 'bird', property: 'can_fly', value: true },
  exceptions: ['Penguin', 'Ostrich', 'Kiwi']
}
```

---

## 4. Sys2DSL Commands

### 4.1 INFER
```sys2dsl
# Infer with all methods
@result INFER Dog IS_A animal

# Infer with specific method
@result INFER Dog IS_A animal method=transitive

# Get full proof
@proof INFER Dog IS_A animal proof=true
```

### 4.2 FORWARD_CHAIN
```sys2dsl
# Derive all possible conclusions
@conclusions FORWARD_CHAIN maxIterations=100

# Forward chain from specific facts
@conclusions FORWARD_CHAIN $newFacts
```

### 4.3 DEFINE_RULE
```sys2dsl
# Define composition rule
@rule DEFINE_RULE GRANDPARENT_OF
  @body ?x PARENT_OF ?y
  @body ?y PARENT_OF ?z
  @head ?x GRANDPARENT_OF ?z

# Define inheritance rule
@rule DEFINE_RULE INHERITS_PROPERTY
  @body ?x IS_A ?type
  @body ?type HAS_PROPERTY ?prop
  @head ?x HAS_PROPERTY ?prop
```

### 4.4 DEFINE_DEFAULT
```sys2dsl
# Define default with exceptions
@default DEFINE_DEFAULT
  @typical bird CAN fly
  @exceptions Penguin Ostrich Kiwi
```

### 4.5 WHY
```sys2dsl
# Explain why something is true/false
@explanation WHY Dog IS_A animal
# Returns proof chain in human-readable form
```

---

## 5. Algorithm: Complete Inference

```javascript
infer(subject, relation, object, options = {}) {
  const facts = this._getFacts(options.contextStack);
  const maxDepth = options.maxDepth || this.config.get('recursionHorizon');
  const methods = options.methods || ['direct', 'transitive', 'symmetric', 'inverse', 'composition', 'inheritance', 'default'];

  // Try each inference method in order
  for (const method of methods) {
    let result;
    switch (method) {
      case 'direct':
        result = this.inferDirect(subject, relation, object, facts);
        break;
      case 'transitive':
        result = this.inferTransitive(subject, relation, object, facts, maxDepth);
        break;
      case 'symmetric':
        result = this.inferSymmetric(subject, relation, object, facts);
        break;
      case 'inverse':
        result = this.inferInverse(subject, relation, object, facts);
        break;
      case 'composition':
        result = this.inferComposition(subject, relation, object, facts, maxDepth);
        break;
      case 'inheritance':
        result = this.inferInheritance(subject, relation, object, facts, maxDepth);
        break;
      case 'default':
        result = this.inferDefault(subject, relation, object, facts);
        break;
    }

    if (result.truth === 'TRUE_CERTAIN' || result.truth === 'TRUE_DEFAULT') {
      return result;
    }
  }

  return { truth: 'UNKNOWN', method: 'exhausted', confidence: 0 };
}
```

---

## 6. Algorithm: Transitive Closure with Proof

```javascript
inferTransitive(subject, relation, object, facts, maxDepth = 10) {
  const relProps = this._getRelationProperties(relation);
  if (!relProps.transitive) {
    return { truth: 'UNKNOWN', method: 'transitive', reason: 'not_transitive' };
  }

  const visited = new Set();
  const queue = [{ node: subject, path: [] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift();

    if (path.length > maxDepth) continue;
    if (visited.has(node)) continue;
    visited.add(node);

    // Find all outgoing edges for this relation
    const edges = facts.filter(f => f.subject === node && f.relation === relation);

    for (const edge of edges) {
      const newPath = [...path, { from: node, to: edge.object, fact: edge }];

      if (edge.object === object) {
        // Found it!
        return {
          truth: 'TRUE_CERTAIN',
          method: 'transitive',
          confidence: Math.pow(0.95, newPath.length), // Slight decay per step
          proof: {
            goal: { subject, relation, object },
            steps: newPath,
            valid: true
          }
        };
      }

      queue.push({ node: edge.object, path: newPath });
    }
  }

  return { truth: 'UNKNOWN', method: 'transitive', reason: 'no_path' };
}
```

---

## 7. Algorithm: Composition Rules

```javascript
inferComposition(subject, relation, object, facts, maxDepth) {
  // Find rules that produce this relation
  const applicableRules = this.rules.filter(r => r.head.relation === relation);

  for (const rule of applicableRules) {
    // Try to unify rule head with query
    const headBindings = this._unify(rule.head, { subject, relation, object });
    if (!headBindings) continue;

    // Try to satisfy rule body
    const bodyResult = this._satisfyBody(rule.body, headBindings, facts, maxDepth);
    if (bodyResult.satisfied) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'composition',
        rule: rule.name,
        confidence: 0.9,
        proof: {
          goal: { subject, relation, object },
          steps: bodyResult.steps,
          rule: rule.name,
          valid: true
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'composition', reason: 'no_rule_matched' };
}

_satisfyBody(bodyPatterns, bindings, facts, maxDepth) {
  if (bodyPatterns.length === 0) {
    return { satisfied: true, steps: [] };
  }

  const [first, ...rest] = bodyPatterns;
  const instantiated = this._instantiate(first, bindings);

  // If fully instantiated, check directly
  if (!this._hasVariables(instantiated)) {
    const result = this.inferDirect(instantiated.subject, instantiated.relation, instantiated.object, facts);
    if (result.truth === 'TRUE_CERTAIN') {
      const restResult = this._satisfyBody(rest, bindings, facts, maxDepth);
      if (restResult.satisfied) {
        return {
          satisfied: true,
          steps: [{ pattern: first, match: instantiated }, ...restResult.steps]
        };
      }
    }
    return { satisfied: false };
  }

  // Find all matching facts and try each binding
  const matches = this._findMatches(instantiated, facts);
  for (const match of matches) {
    const newBindings = { ...bindings, ...this._extractBindings(first, match) };
    const restResult = this._satisfyBody(rest, newBindings, facts, maxDepth - 1);
    if (restResult.satisfied) {
      return {
        satisfied: true,
        steps: [{ pattern: first, match }, ...restResult.steps]
      };
    }
  }

  return { satisfied: false };
}
```

---

## 8. Algorithm: Default Reasoning

```javascript
inferDefault(subject, relation, object, facts) {
  // Find applicable default rules
  for (const defaultRule of this.defaults) {
    if (defaultRule.typical.property !== relation) continue;

    // Check if subject is of the typical type
    const isType = this.infer(subject, 'IS_A', defaultRule.typical.type, { methods: ['direct', 'transitive'] });
    if (isType.truth !== 'TRUE_CERTAIN') continue;

    // Check for exceptions
    const isException = this._isException(subject, defaultRule.exceptions, facts);
    if (isException) {
      return {
        truth: 'FALSE',
        method: 'default',
        reason: 'exception_applies',
        exception: isException
      };
    }

    // Default applies
    if (defaultRule.typical.value === true && object === defaultRule.typical.property) {
      return {
        truth: 'TRUE_DEFAULT',
        method: 'default',
        confidence: 0.8,
        assumptions: [`${subject} is a typical ${defaultRule.typical.type}`],
        proof: {
          goal: { subject, relation, object },
          steps: [{ type: 'default', rule: defaultRule.name }],
          defeasible: true
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'default' };
}

_isException(subject, exceptions, facts) {
  for (const exc of exceptions) {
    const result = this.infer(subject, 'IS_A', exc, { methods: ['direct', 'transitive'] });
    if (result.truth === 'TRUE_CERTAIN') {
      return exc;
    }
  }
  return null;
}
```

---

## 9. Algorithm: Property Inheritance

```javascript
inferInheritance(subject, relation, object, facts, maxDepth) {
  // Only for HAS_PROPERTY-like relations
  if (relation !== 'HAS_PROPERTY' && !this._isPropertyRelation(relation)) {
    return { truth: 'UNKNOWN', method: 'inheritance', reason: 'not_inheritable' };
  }

  // Find all types of subject
  const types = this._getAllTypes(subject, facts, maxDepth);

  // Check if any type has the property
  for (const type of types) {
    const hasProp = facts.find(f =>
      f.subject === type && f.relation === relation && f.object === object
    );
    if (hasProp) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'inheritance',
        confidence: 0.95,
        inheritedFrom: type,
        proof: {
          goal: { subject, relation, object },
          steps: [
            { fact: `${subject} IS_A ${type}`, justification: 'type_membership' },
            { fact: hasProp, justification: 'property_of_type' }
          ],
          valid: true
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'inheritance' };
}

_getAllTypes(subject, facts, maxDepth) {
  const types = new Set();
  const queue = [subject];
  let depth = 0;

  while (queue.length > 0 && depth < maxDepth) {
    const current = queue.shift();
    const directTypes = facts
      .filter(f => f.subject === current && f.relation === 'IS_A')
      .map(f => f.object);

    for (const t of directTypes) {
      if (!types.has(t)) {
        types.add(t);
        queue.push(t);
      }
    }
    depth++;
  }

  return types;
}
```

---

## 10. Forward Chaining

```javascript
forwardChain(facts, maxIterations = 100) {
  const derived = [...facts];
  const newFacts = new Set();
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    let foundNew = false;

    // Apply all rules
    for (const rule of this.rules) {
      const newConclusions = this._applyRule(rule, derived);
      for (const conclusion of newConclusions) {
        const key = `${conclusion.subject}|${conclusion.relation}|${conclusion.object}`;
        if (!newFacts.has(key)) {
          newFacts.add(key);
          derived.push(conclusion);
          foundNew = true;
        }
      }
    }

    // Apply transitive closure for transitive relations
    const transitiveNew = this._expandTransitive(derived);
    for (const fact of transitiveNew) {
      const key = `${fact.subject}|${fact.relation}|${fact.object}`;
      if (!newFacts.has(key)) {
        newFacts.add(key);
        derived.push(fact);
        foundNew = true;
      }
    }

    // Apply inverse relations
    const inverseNew = this._expandInverse(derived);
    for (const fact of inverseNew) {
      const key = `${fact.subject}|${fact.relation}|${fact.object}`;
      if (!newFacts.has(key)) {
        newFacts.add(key);
        derived.push(fact);
        foundNew = true;
      }
    }

    if (!foundNew) break;
  }

  return derived.slice(facts.length); // Return only new facts
}
```

---

## 11. Test Cases

### 11.1 Transitive IS_A
```sys2dsl
@f1 ASSERT Dog IS_A mammal
@f2 ASSERT mammal IS_A animal
@f3 ASSERT animal IS_A living_thing
@result INFER Dog IS_A living_thing
# Expected: { truth: 'TRUE_CERTAIN', method: 'transitive', proof: {...} }
```

### 11.2 Composition Rule
```sys2dsl
@rule DEFINE_RULE UNCLE_OF
  @body ?x SIBLING_OF ?y
  @body ?y PARENT_OF ?z
  @head ?x UNCLE_OF ?z

@f1 ASSERT Bob SIBLING_OF Alice
@f2 ASSERT Alice PARENT_OF Charlie
@result INFER Bob UNCLE_OF Charlie
# Expected: { truth: 'TRUE_CERTAIN', method: 'composition', rule: 'UNCLE_OF' }
```

### 11.3 Default Reasoning
```sys2dsl
@default DEFINE_DEFAULT
  @typical bird CAN fly
  @exceptions Penguin Ostrich

@f1 ASSERT Tweety IS_A bird
@f2 ASSERT Pete IS_A Penguin
@f3 ASSERT Penguin IS_A bird

@q1 INFER Tweety CAN fly
# Expected: { truth: 'TRUE_DEFAULT' }

@q2 INFER Pete CAN fly
# Expected: { truth: 'FALSE', reason: 'exception_applies' }
```

### 11.4 Property Inheritance
```sys2dsl
@f1 ASSERT mammal HAS_PROPERTY warm_blooded
@f2 ASSERT Dog IS_A mammal
@result INFER Dog HAS_PROPERTY warm_blooded
# Expected: { truth: 'TRUE_CERTAIN', method: 'inheritance', inheritedFrom: 'mammal' }
```

### 11.5 Argument Type Inference
```sys2dsl
# Basic argument type inference
@f1 ASSERT X R Y
@f2 ASSERT Y IS_A T
@result INFER X R T
# Expected: { truth: 'TRUE_CERTAIN', method: 'argument_type_inference' }

# With transitive type chain
@f1 ASSERT X R Y
@f2 ASSERT Y IS_A T1
@f3 ASSERT T1 IS_A T2
@result INFER X R T2
# Expected: { truth: 'TRUE_CERTAIN', method: 'argument_type_inference' }
# Proof: X R Y, Y IS_A T1, T1 IS_A T2 → Y IS_A T2 → X R T2
```

---

## 12. Algorithm: Argument Type Inference

```javascript
inferArgumentType(subject, relation, objectType, facts) {
  const subjectLower = subject.toLowerCase();
  const relationUpper = relation.toUpperCase();
  const objectTypeLower = objectType.toLowerCase();

  // Find all facts where subject has this relation with something
  const relatedFacts = facts.filter(f =>
    f.subject.toLowerCase() === subjectLower &&
    f.relation.toUpperCase() === relationUpper
  );

  // For each related object, check if it IS_A objectType (directly or transitively)
  for (const fact of relatedFacts) {
    const relatedObject = fact.object;
    const objectTypes = this._getAllTypes(relatedObject, facts);

    // Direct match: the related object IS the type we're asking about
    if (relatedObject.toLowerCase() === objectTypeLower) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'direct_type_match',
        confidence: 1,
        proof: {
          steps: [
            { fact: `${subject} ${relation} ${relatedObject}`, justification: 'direct_fact' },
            { conclusion: `Therefore ${subject} ${relation} ${objectType}` }
          ]
        }
      };
    }

    // Type inference: the related object is an instance of objectType
    if (objectTypes.includes(objectTypeLower)) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'argument_type_inference',
        confidence: 0.95,
        proof: {
          steps: [
            { fact: `${subject} ${relation} ${relatedObject}`, justification: 'direct_fact' },
            { fact: `${relatedObject} IS_A ${objectType}`, justification: 'type_membership' },
            { conclusion: `Therefore ${subject} ${relation} something that is ${objectType}` }
          ]
        }
      };
    }
  }

  return { truth: 'UNKNOWN', method: 'argument_type_inference', reason: 'no_type_match' };
}
```

---

## 13. Performance Optimizations

- **Memoization**: Cache inference results for repeated queries
- **Indexing**: Maintain indexes by relation type for fast rule matching
- **Pruning**: Stop early when confidence is above threshold
- **Lazy evaluation**: Don't compute full transitive closure unless needed
- **Stratification**: Order rules to avoid unnecessary recomputation

---

## 13. Related Documents

- DS(/reason/contradiction_detection) - Contradiction checking
- DS(/reason/reasoner.js) - Base reasoner
- DS(/theory/dsl_engine.js) - DSL integration
- DS(/theory/Sys2DSL_commands) - Command reference
