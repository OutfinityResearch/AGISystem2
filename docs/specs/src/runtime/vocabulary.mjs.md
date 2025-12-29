# Module: `src/runtime/vocabulary.mjs`

**Purpose:** Session-local mapping between atom names and their hypervectors.

## Constructor

```js
new Vocabulary(geometry, strategyId?, hdc?)
```

- `geometry`: the session geometry (compat field; strategies may be elastic)
- `strategyId`: optional, used only for non-IoC fallback paths
- `hdc`: optional session-local HDC context (preferred; enables IoC)

## Core API

```js
getOrCreate(name)        // name -> vector (deterministic within the session context)
get(name)                // vector | undefined
has(name)                // boolean
reverseLookup(vec)       // best-effort hash -> name
names()                  // string[]
entries()                // iterator
size                     // number

serializeVocab()         // { geometry, atoms, strategyId }
static deserializeVocab(data)
```

## Algorithm (IoC-first)

```
getOrCreate(name):
  if atoms.has(name): return atoms.get(name)

  if hdc exists:
    vec = hdc.createFromName(name, geometry, 'default')
  else:
    vec = facade.createFromName(name, geometry, { strategyId })

  atoms.set(name, vec)
  reverse.set(hashVector(vec), name)
  return vec
```

## Hashing for reverse lookup

`reverseLookup()` uses a collision-resistant hash of the full vector payload:

- dense-binary: hash all `Uint32Array` words
- sparse-polynomial: hash the sorted BigInt exponents (stringified)
- fallback: hash the serialized form

This is required because reference/graph decoding relies on `reverseLookup()` stability; prefix-hashing causes collisions.

## Notes

- For stateful strategies (EXACT), correctness requires the **session-local HDC context** path (`hdc.createFromName`). A process-global strategy object must not own allocator state shared across Sessions.
- Serialization of the vocabulary exists, but AGISystem2 workflows may still reload theories from text and re-vectorize each run; persistent KB+dictionary workflows are handled separately.

## Related specs

- `docs/specs/DS/DS26-Session-Universe.md`
- `docs/specs/DS/DS09-Core-HDC-Implementation.md`

