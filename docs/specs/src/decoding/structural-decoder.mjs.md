# Module Plan: src/decoding/structural-decoder.js

**Document Version:** 1.0
**Status:** Specification
**Traces To:** FS-57, FS-58, FS-59, FS-85

---

## 1. Purpose

Decodes hypervectors back into structured representations (operator + arguments). Enables generation of human-readable explanations from reasoning results.

---

## 2. Responsibilities

- Extract operator from vector via similarity search
- Extract arguments by unbinding and position removal
- Handle nested/compound structures recursively
- Calculate confidence scores for decoded elements
- Return structured JSON representation

---

## 3. Public API

```javascript
class StructuralDecoder {
  constructor(session: Session, options?: DecoderOptions)

  decode(vector: Vector): DecodeResult
}

interface DecoderOptions {
  maxNesting?: number;       // Default: 3
  operatorThreshold?: number; // Default: 0.5
  argThreshold?: number;      // Default: 0.5
}

interface DecodeResult {
  success: boolean;
  structure: DecodedStructure | null;
  confidence: number;
  reason?: string;
}

interface DecodedStructure {
  operator: string;
  operatorConfidence: number;
  arguments: Argument[];
  confidence: number;
  type: 'fact' | 'rule' | 'query';
  nested?: DecodedStructure[];
  raw: Vector;
}

interface Argument {
  position: number;
  value: string;
  role?: string;
  confidence: number;
  type?: string;
  alternatives: Array<{ value: string; confidence: number }>;
}
```

---

## 4. Internal Design

### 4.1 Decode Algorithm

```javascript
decode(vector) {
  // Step 1: Find operator
  const operatorCandidates = [];
  for (const [name, opVec] of this.session.operators) {
    const sim = similarity(vector, opVec);
    if (sim > this.options.operatorThreshold) {
      operatorCandidates.push({ name, similarity: sim });
    }
  }

  if (operatorCandidates.length === 0) {
    return { success: false, reason: 'No operator found' };
  }

  operatorCandidates.sort((a, b) => b.similarity - a.similarity);
  const operator = operatorCandidates[0];

  // Step 2: Unbind operator
  const opVector = this.session.vocabulary.get(operator.name);
  const remainder = bind(vector, opVector);

  // Step 3: Extract arguments at each position
  const arguments = [];
  for (let pos = 1; pos <= 20; pos++) {
    const posUnbound = removePosition(pos, remainder);
    const matches = topKSimilar(posUnbound, this.session.vocabulary, 3);

    if (matches[0].similarity > this.options.argThreshold) {
      // Check if argument is itself compound
      const argVector = this.session.vocabulary.get(matches[0].name);
      const isCompound = this.mightBeCompound(posUnbound, argVector);

      if (isCompound && this.currentDepth < this.options.maxNesting) {
        this.currentDepth++;
        const nested = this.decode(posUnbound);
        this.currentDepth--;

        if (nested.success) {
          arguments.push({
            position: pos,
            value: null,
            nested: nested.structure,
            confidence: nested.confidence,
            alternatives: []
          });
          continue;
        }
      }

      arguments.push({
        position: pos,
        value: matches[0].name,
        confidence: matches[0].similarity,
        alternatives: matches.slice(1).map(m => ({
          value: m.name,
          confidence: m.similarity
        }))
      });
    }
  }

  // Step 4: Calculate overall confidence
  const argConfidences = arguments.map(a => a.confidence);
  const avgArgConf = argConfidences.length > 0
    ? argConfidences.reduce((a, b) => a + b) / argConfidences.length
    : 0;

  const confidence = (operator.similarity + avgArgConf) / 2;

  return {
    success: true,
    structure: {
      operator: operator.name,
      operatorConfidence: operator.similarity,
      arguments,
      confidence,
      type: this.inferType(operator.name),
      raw: vector
    },
    confidence
  };
}
```

### 4.2 Compound Detection

```javascript
mightBeCompound(extracted, directMatch) {
  // If similarity to best atom match is low,
  // but vector has high density, might be compound
  const directSim = similarity(extracted, directMatch);
  const density = extracted.density();

  // Compound structures typically have density ~0.5
  // and low similarity to any single atom
  return directSim < 0.65 && density > 0.45 && density < 0.55;
}
```

### 4.3 Type Inference

```javascript
inferType(operatorName) {
  if (operatorName === 'Implies' || operatorName.endsWith('Rule')) {
    return 'rule';
  }
  if (this.session.hasHoles) {
    return 'query';
  }
  return 'fact';
}
```

---

## 5. Dependencies

- `../core/operations.js` - bind, similarity, topKSimilar
- `../core/position.js` - removePosition

---

## 6. Test Cases

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| DEC-01 | Simple fact | operator + 2 args |
| DEC-02 | Three argument fact | operator + 3 args |
| DEC-03 | Rule structure | type=rule, premises |
| DEC-04 | Nested structure | Recursive decoding |
| DEC-05 | Unknown vector | success=false |
| DEC-06 | Low confidence | Confidence < 0.6 |
| DEC-07 | Alternatives present | alternatives array |

---

## 7. Performance Requirements

| Operation | Target | Measurement |
|-----------|--------|-------------|
| decode (simple) | < 10ms | Benchmark |
| decode (nested) | < 50ms | Benchmark |
| decode (3 levels) | < 100ms | Benchmark |

---

*End of Module Plan*
