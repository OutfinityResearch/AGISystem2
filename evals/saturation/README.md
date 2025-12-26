# Saturation Eval

This folder contains DSL documents (one per “book”) that model a *hierarchical* construction:



- how quickly each HDC strategy “saturates” (signal collapses toward baseline),
- how well the book representation can still answer “idea queries” via unbinding,
- and the approximate runtime cost per strategy/geometry.

The runner simulates a “reverse-index narrowed” cleanup set by evaluating each query over a
fixed-size candidate pool (default 10):
- POS queries compare mostly within in-book ideas (reverse index hit).
- NEG queries compare against decoys only (reverse index miss).

Run (default uses small geometries for a fast sweep and prints per-book details):

```bash
node evals/runSaturationEval.mjs
```

Useful options:

```bash
node evals/runSaturationEval.mjs --full
node evals/runSaturationEval.mjs --huge
node evals/runSaturationEval.mjs --extra-huge
node evals/runSaturationEval.mjs --strategies=dense-binary,metric-affine,metric-affine-elastic
node evals/runSaturationEval.mjs --no-color
```

Notes:
- `--extra-huge` uses 32x and 64x the fast geometries (dense hits 8192/16384 bits).

Books:

- Place runnable books in `evals/saturation/books/` and name them `bookNN.sys2`.
- Start from `evals/saturation/example-book.sys2` as a template.

Each book file includes two marker lines used by the runner:

`# SAT_QUERY_POS op=Mentions book=BookXX key=... expect=...`

`# SAT_QUERY_NEG op=Mentions book=BookXX key=... expect=none`

Pass criteria (current):
- POS: expected idea is top-1 (margin is reported separately as a saturation signal)
- NEG: top1Sim < HDC_MATCH(strategy) (avoid confident hallucinations)
