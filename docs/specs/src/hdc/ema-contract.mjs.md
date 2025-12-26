# Module: src/hdc/ema-contract.mjs

**Document Version:** 1.0  
**Status:** Proposed  
**Traces To:** DS23-Elastic-Metric-Affine-HDC  

---

## 1. Purpose

Defines the strategy contract and validator for **Elastic Metric-Affine (EMA)**.

EMA is compatible with Metric-Affine’s algebra (XOR bind + normalized L₁ similarity) but has bundle-specific representation properties (chunked bundle, bounded depth) and optional elastic geometry support.

---

## 2. Exports

| Export | Description |
|--------|-------------|
| `EMA_CONTRACT` | Contract properties for EMA strategy |
| `validateEMAStrategy(strategy, geometry?)` | Validates EMA strategy invariants and baseline expectations |
| `runEMAValidation(strategy, geometry?)` | Convenience wrapper returning a summarized report |

---

## 3. EMA_CONTRACT

```js
export const EMA_CONTRACT = {
  // Bind properties (XOR)
  BIND_SELF_INVERSE: true,
  BIND_ASSOCIATIVE: true,
  BIND_COMMUTATIVE: true,

  // Similarity properties (normalized L1)
  SIMILARITY_REFLEXIVE: true,
  SIMILARITY_SYMMETRIC: true,
  SIMILARITY_RANGE: [0, 1],
  RANDOM_BASELINE_SIMILARITY: { expected: 0.665, tolerance: 0.05 },

  // Bundle expectations
  BUNDLE_RETRIEVABLE: true,

  // EMA-specific
  GEOMETRY_ELASTIC: true,
  BUNDLE_CHUNKED: true,
  BUNDLE_BOUNDED_DEPTH: true
};
```

---

## 4. Validation Notes

`validateEMAStrategy()` should include:

- Factory presence checks (`createZero`, `createRandom`, `createFromName`, `deserialize`)
- XOR self-inverse test: `bind(bind(a,b),b) == a` exactly
- Similarity reflexive / symmetric / range checks
- Random baseline sampling: average similarity near ~0.665
- Bundle retrievability sanity check (small `n`, similarity above baseline)
- Optional: chunked-bundle sanity checks (e.g. bundle output can be unbound and compared consistently)

The validator should not assume dense-binary baseline (~0.5).

---

*End of Module Specification*

