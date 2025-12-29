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
- Generated stress books: `node evals/saturation/gen-books.mjs` writes `book_10cap_100.sys2` and `book_10cap_1000.sys2`.

Each book file includes two marker lines used by the runner:

`# SAT_QUERY_POS op=Mentions book=BookXX key=... expect=...`

`# SAT_QUERY_NEG op=Mentions book=BookXX key=... expect=none`

Pass criteria (current):
- POS: expected is top-1 **and** top1Sim > 0 **and** top1Sim > top2Sim (avoid “PASS by tie/0.000”)
- NEG: top1Sim < HDC_MATCH(strategy) (avoid confident hallucinations)

## Why `ChapterNN_Seq` exists (and why the real Chapter is a `bundle`)

You’ll see patterns like:

```sys2
@Chapter58_Seq __Sequence [$B30_R0115, $B30_R0116]
@Chapter58:Chapter58 bundle [$B30_R0115, $B30_R0116]
```

They serve **different purposes**:

- `@Chapter58_Seq __Sequence [...]` is an *ordered* construction: `__Sequence` calls `___BundlePositioned`, which binds each item with a position marker (Pos1, Pos2, …) before bundling. This preserves order information, but it changes the vector algebra in a way that is *not* compatible with the simple “fact unbinding” pattern used by the saturation HDC decode.
- `@Chapter58:Chapter58 bundle [...]` is the *membership/content* construction: `bundle` is a plain superposition of the chapter’s idea-record vectors (orderless). This is what we treat as the “chapter content” inside the “book content”.

We keep the `_Seq` variables as “structural metadata” (order exists in a real chapter/book), while the `ChapterNN` / `Book` vectors remain pure superpositions so the holographic query can behave like a membership test.

## Book DSL explained (Book02, line-by-line)

File: `evals/saturation/books/book02.sys2`

Goal: model a small “book” as:
- ideas (each idea has a small “definition” in Core relations),
- `Mentions(book, key, idea)` facts (the index we will query),
- chapters as bundles of those mention-facts,
- the book as a bundle of chapters.

The runner then tests two *holographic* decodes (plus symbolic query validation).

### 1) Header + evaluation markers

```sys2
# Book02: Factor 2 vs Book01, 4 chapters x 2 ideas
```
Human note: Book02 is “2× complexity” (more chapters/ideas/facts) than Book01.

```sys2
# SAT_QUERY_POS op=Mentions book=Book02 key=Key_B02_C04_I02 expect=ActionSequencing
# SAT_QUERY_NEG op=Mentions book=Book02 key=Key_B02_Missing expect=none
```
These two comment lines are parsed by `evals/runSaturationEval.mjs` and define:
- POS query: “given (book, key) recover the idea”
- NEG query: same, but key is missing → should *not* hallucinate a confident idea

### 2) “Idea” macro (builds per-idea facts)

```sys2
@Idea:Idea graph idea concept trait
    isA $idea $concept
    hasProperty $idea $trait
    return $idea
end
```
This defines a reusable macro:
- calling `Idea X C T` will assert two KB facts: `isA(X,C)` and `hasProperty(X,T)`
- and returns the vector for `$idea` (mostly used just to force creation/assertion)

### 3) Declare `Mentions` as a relation (so it can be used as a fact)

```sys2
@Mentions:Mentions __Relation
```
In strict validation mode, operators must be declared. This says: `Mentions` is a normal relation, not a macro.

### 4) Chapter 01 (2 ideas)

```sys2
@_ Idea SensorCalibration Process Precise
```
Call the `Idea` macro to assert:
- `isA SensorCalibration Process`
- `hasProperty SensorCalibration Precise`
The destination `@_` is a throwaway scope binding; the important effect is the KB facts emitted by the macro body.

```sys2
@B02_R0001:Mentions_B02_R0001 Mentions Book02 Key_B02_C01_I01 SensorCalibration
```
This is the *index fact* we will query holographically and symbolically:
- operator: `Mentions`
- args: `Book02`, `Key_B02_C01_I01`, `SensorCalibration`
It’s stored in scope as `B02_R0001` and persisted (because it has a `:persistName`).

```sys2
@_ Idea NoiseGate Filter Selective
@B02_R0002:Mentions_B02_R0002 Mentions Book02 Key_B02_C01_I02 NoiseGate
```
Second idea + its `Mentions` record.

```sys2
@Chapter01_Seq __Sequence [$B02_R0001, $B02_R0002]
@Chapter01:Chapter01 bundle [$B02_R0001, $B02_R0002]
```
Two chapter representations:
- `Chapter01_Seq`: ordered (Pos1/Pos2 attached to items)
- `Chapter01`: pure membership superposition of the chapter’s records (used inside `Book`)

### 5) Chapters 02..04

The same pattern repeats:
- define idea via `@_ Idea ...`
- create `@B02_R000N:... Mentions Book02 Key... IdeaName`
- build `@ChapterNN_Seq __Sequence [...]` and `@ChapterNN:ChapterNN bundle [...]`

### 6) The book vector (what we test “holographically”)

```sys2
@Book_Seq __Sequence [$Chapter01, $Chapter02, $Chapter03, $Chapter04]
@Book:Book bundle [$Chapter01, $Chapter02, $Chapter03, $Chapter04]
```
Again two versions:
- `Book_Seq`: ordered chapters (kept for structure)
- `Book`: pure superposition of chapter contents — this is the “book content” vector used by the saturation eval.

## What queries the saturation runner runs (and how they map to the DSL)

For each book, the runner does **two independent checks**:

### A) Holographic decode: `(book, key) -> idea` (membership-by-key)

Given the Book vector and a query triple like:
- `Mentions Book02 Key_B02_C04_I02 ?idea`

It builds a partial vector from `(Mentions, Book02, Key_...)` and decodes the missing `idea` slot using:
- `answer = UNBIND(Book, partial)`
- `ideaVec = UNBIND(answer, Pos3)`
- then “cleanup” by ranking `ideaVec` against a small candidate set (mostly real in-book ideas for POS, decoys for NEG).

This is the “pure holographic” path (no symbolic KB scan), meant to measure saturation.

### B) Holographic membership test: `(book, idea) -> key` (idea ∈ book?)

To test “does idea exist in this book?”, we do the inverse slot:
- POS: `Mentions Book02 ?key ActionSequencing` should recover `Key_B02_C04_I02`
- NEG: `Mentions Book02 ?key BOOK02_MissingIdea` should not confidently recover any real key

Mechanically it is the same decode, but extracting Pos2 instead of Pos3.

### C) Query-engine validation

For both A and B we also run the symbolic query engine:
- POS must return the expected binding
- NEG must return no result

This is a correctness/ground-truth check independent of HDC similarity behavior.
