# Module Plan: src/reasoning/query.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-41 to FS-48

---

## 1. Purpose

Implements single-step query execution with holes (?variables). Finds answers by unbinding partial queries from the knowledge base and matching against vocabulary.

---

## 2. Responsibilities

- Identify holes in query statements
- Build partial vectors (excluding holes)
- Unbind partials from KB
- Extract and match candidates
- Calculate confidence scores
- Return bindings with alternatives

---

## 3. Public API

```javascript
class QueryEngine {
  constructor(session: Session)

  execute(statement: Statement): QueryResult
}

interface QueryResult {
  success: boolean;
  bindings: Map<string, Binding>;
  confidence: number;
  ambiguous: boolean;
  reason?: string;
}

interface Binding {
  answer: string;
  similarity: number;
  alternatives: Array<{ value: string; similarity: number }>;
}
```

---

## 4. Internal Design

### 4.1 Query Execution Algorithm

```javascript
execute(statement) {
  // Step 1: Resolve expressions, identify holes
  const holes = [];
  const knowns = [];
  const operator = this.session.resolve(statement.operator);

  for (let i = 0; i < statement.args.length; i++) {
    const arg = statement.args[i];
    if (arg.type === 'Hole') {
      holes.push({ index: i + 1, name: arg.name });
    } else {
      knowns.push({
        index: i + 1,
        vector: this.session.resolve(arg)
      });
    }
  }

  if (holes.length === 0) {
    return this.directMatch(operator, knowns);
  }

  if (holes.length > 3) {
    return { success: false, reason: "Too many holes (max 3)" };
  }

  // Step 2: Build partial vector
  let partial = operator;
  for (const known of knowns) {
    partial = bind(partial, withPosition(known.index, known.vector));
  }

  // Step 3: Unbind from KB
  const candidate = bind(this.session.kb, partial);

  // Step 4: Extract answers for each hole
  const bindings = new Map();

  for (const hole of holes) {
    const raw = removePosition(hole.index, candidate);
    const matches = topKSimilar(raw, this.session.vocabulary, 5);

    if (matches.length > 0 && matches[0].similarity > 0.5) {
      bindings.set(hole.name, {
        answer: matches[0].name,
        similarity: matches[0].similarity,
        alternatives: matches.slice(1, 4)
      });
    } else {
      bindings.set(hole.name, {
        answer: null,
        similarity: 0,
        alternatives: matches.slice(0, 3)
      });
    }
  }

  // Step 5: Calculate confidence
  const confidence = this.calculateConfidence(bindings, holes.length);
  const ambiguous = this.hasAmbiguity(bindings);

  return {
    success: this.allHolesFilled(bindings),
    bindings,
    confidence,
    ambiguous
  };
}
```

### 4.2 Confidence Calculation

```javascript
calculateConfidence(bindings, numHoles) {
  if (bindings.size === 0) return 0;

  let totalSim = 0;
  for (const binding of bindings.values()) {
    totalSim += binding.similarity;
  }
  const avgSim = totalSim / bindings.size;

  // Penalty for multiple holes
  const holePenalty = 1.0 - (numHoles - 1) * 0.1;

  // Penalty for ambiguity
  let ambiguityPenalty = 1.0;
  for (const binding of bindings.values()) {
    if (binding.alternatives.length > 0 &&
        binding.alternatives[0].similarity > binding.similarity - 0.05) {
      ambiguityPenalty *= 0.9;
    }
  }

  return avgSim * holePenalty * ambiguityPenalty;
}
```

### 4.3 Ambiguity Detection

```javascript
hasAmbiguity(bindings) {
  for (const binding of bindings.values()) {
    if (binding.alternatives.length > 0) {
      const gap = binding.similarity - binding.alternatives[0].similarity;
      if (gap < 0.1) return true;
    }
  }
  return false;
}
```

---

## 5. Dependencies

- `../core/operations.js` - bind, topKSimilar
- `../core/position.js` - withPosition, removePosition

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| QRY-01 | Single hole query | Correct binding |
| QRY-02 | Two holes query | Both bindings |
| QRY-03 | No match in KB | success=false |
| QRY-04 | Ambiguous result | ambiguous=true |
| QRY-05 | Confidence calculation | Correct score |
| QRY-06 | Too many holes | Error with reason |
| QRY-07 | Direct match (no holes) | Similarity check |

---

*End of Module Plan*
