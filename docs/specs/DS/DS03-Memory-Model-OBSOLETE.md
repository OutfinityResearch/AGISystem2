# AGISystem2 - System Specifications

# Chapter 3: Theories and Memory Model (Obsolete)

**Document Version:** 3.0  
**Status:** Exploratory (historical; not implemented as written)

> **Note (runtime reality):** The current runtime supports session-local KB storage and reloading theories from text, but does not implement the disk “cold storage” format described later in this document. Several details here (e.g., fixed `uint64[]` geometry assumptions, and the “Core not auto-loaded” session lifecycle) are also outdated relative to the current multi-strategy HDC runtime. Keep this DS as a research/historical reference until a dedicated persistence milestone is prioritized.

---

## 3.1 What Is a Theory?

A **Theory** creates two things:
1. A **vector** — semantic identity of the theory
2. A **namespace** — atoms and graphs it contains

| Component | Description |
|-----------|-------------|
| Vector | Can be compared, bundled, used as argument |
| Namespace | Atoms and graphs, activated via Load |
| Geometry | Vector dimensionality (16384 / 32768 / 65536) |
| Init | How new atoms get vectors |

**Syntax:** `@Name theory <geometry> <init>`

```
@Physics theory 32768 deterministic
    @Mass __Atom
    @Force __Atom
    @Velocity __Atom
end
```

After definition, `$Physics` is a vector representing the theory itself.

---

## 3.2 Theories as Vectors

Since theories are vectors, all HDC operations apply:

| Operation | Example | Purpose |
|-----------|---------|---------|
| Similarity | `@s ___Similarity $Economics $Physics` | How related? |
| Bundle | `@sciences __Bundle $Physics $Chemistry $Biology` | Group theories |
| Role binding | `@r __Role Domain $Economics` | Theory as role filler |
| Meta-facts | `@f Covers $Economics Trade` | Facts about theories |
| Query | `@t ?theory Covers Trade` | Which theory covers Trade? |

**Dynamic theory selection:**
```
@FindBestTheory graph topic
    @candidates __Bundle $Economics $Physics $Law
    @best ___MostSimilar $topic $candidates
    return $best
end

@relevant FindBestTheory Money
@_ Load $relevant
```

---

## 3.3 The Core Theory

`Core` is special:
- **Always loaded**
- **Cannot be unloaded**
- Defines all L0/L1/L2 operations
- Defines theory management verbs

| Level | What Core Defines |
|-------|-------------------|
| L0 (`___`) | `___Bind`, `___Bundle`, `___Similarity`, `___NewVector`, `___MostSimilar`, `___Extend` |
| L1 (`__`) | `__Atom`, `__Role`, `__Pair`, `__Event`, `__Bundle` |
| L2 (`_`) | `_ptrans`, `_atrans`, `_mtrans`, `_propel`, `_grasp`, `_ingest`, `_expel`, `_mbuild`, `_attend`, `_speak` |
| Roles | `Agent`, `Theme`, `Source`, `Goal`, `Recipient`, `Content`, `Instrument`, `Direction` |
| Meta | `Load`, `Unload`, `Export`, `Import` |

---

## 3.4 Theory Management Verbs

Defined in Core, used like any other verb:

| Verb | Syntax | Effect |
|------|--------|--------|
| `Load` | `@_ Load $Theory` | Activate namespace for resolution |
| `Unload` | `@_ Unload $Theory` | Deactivate namespace |
| `Export` | `@_ Export $var` | Save var to active theory |
| `Import` | `@v Import $Theory name` | Get specific atom from theory |

**Examples:**
```
@_ Load $Economics           # Activate Economics namespace
@tx sell Alice Bob Car 100   # 'sell' found in Economics

@bankVec Import $Finance Bank   # Get Bank from Finance without loading

@_ Export $myNewFact         # Save to current active theory
@_ Unload $Economics         # Deactivate
```

**Inside graphs:**
```
@AnalyzeTrade graph item
    @_ Load $Economics
    @result Query $item
    @_ Unload $Economics
    return $result
end
```

---

## 3.5 Theory Stacking

Multiple theories can be loaded, forming a stack. Resolution: most recent first.

```
@_ Load $Geography      # Bank = riverbank
@_ Load $Finance        # Bank = financial institution (shadows)

@x Bank                 # Resolves to Finance.Bank

@_ Unload $Finance      # Now Geography is top
@y Bank                 # Resolves to Geography.Bank
```

**Stack behavior:**

| State | Stack (top→bottom) | `Bank` resolves to |
|-------|-------------------|-------------------|
| Initial | `[Core]` | not found |
| Load Geography | `[Geography, Core]` | Geography.Bank |
| Load Finance | `[Finance, Geography, Core]` | Finance.Bank |
| Unload Finance | `[Geography, Core]` | Geography.Bank |

**Note:** Core is always at bottom, cannot be unloaded.

---

## 3.6 Vector Geometry

Each theory declares dimensionality:

| Tier | Bits | Bytes | Bundle Capacity* | Use Case |
|------|------|-------|-----------------|----------|
| Small | 16,384 | 2 KB | ~50-100 items | Simple domains |
| Standard | 32,768 | 4 KB | ~100-200 items | General |
| Large | 65,536 | 8 KB | ~200-400 items | Complex |

*\*Bundle capacity applies to **HDC-Priority mode** (dense-binary strategy) only. In **Symbolic-Priority mode** (sparse-polynomial, metric-affine), KB capacity is effectively unlimited since facts are stored with metadata and not bundled. See DS01 Section 1.10 for details on dual reasoning modes.*

**Cross-theory operations:** Vectors auto-extend to largest geometry.

| Scenario | A (2KB) | B (4KB) | Operation |
|----------|---------|---------|-----------|
| Query A only | native | — | 2KB |
| Query A+B | extended | native | 4KB |
| Store in A | truncated | — | 2KB (lossy) |

---

## 3.7 Initialization Strategies

| Strategy | Method | When to Use |
|----------|--------|-------------|
| `random` | Cryptographic RNG | Learning, exploration |
| `deterministic` | Hash(theory_id + name) | Debugging, reproducibility |

```
@Experimental theory 32768 random       # Different each run
@Production theory 32768 deterministic  # Reproducible
```

---

## 3.8 Hot Memory (RAM)

Vectors currently in use. Optimized for speed.

| Aspect | Specification |
|--------|---------------|
| Format | Dense binary `uint64[]` |
| Geometry | Native per-theory |
| Operations | XOR, popcount — constant time per geometry |

**Memory layout:**
```
Theory {
    vector: Uint64Array      # Theory's own identity vector
    name: string
    geometry: number
    atoms: Map<string, Uint64Array>
    graphs: Map<string, GraphDefinition>
}

Session {
    variables: Map<string, Uint64Array>
    theoryStack: Theory[]    # Core always at bottom
}
```

---

## 3.9 Cold Storage (Disk)

Persistent storage. Optimized for space.

| Aspect | Specification |
|--------|---------------|
| Format | Sparse + Roaring Bitmap |
| Threshold | Top 2% bits |
| Compression | ~15-20x |

**File structure:**
```
theory_economics/
├── manifest.json      # {name, geometry, init, vector}
├── atoms.bin          # Roaring-compressed
├── atoms_index.json   # {name → offset}
└── graphs.json        # Graph definitions
```

**Note:** The theory's own vector is stored in manifest.

---

## 3.10 Vector Extension

When smaller vector meets larger:

```javascript
function extend(vector, fromGeo, toGeo, seed) {
    if (fromGeo >= toGeo) return vector;
    
    const extended = new Uint64Array(toGeo / 64);
    extended.set(vector);
    
    const rng = PRNG(hash(seed + fromGeo + toGeo));
    for (let i = fromGeo/64; i < toGeo/64; i++) {
        extended[i] = vector[i % (fromGeo/64)] ^ rng.nextUint64();
    }
    return extended;
}
```

Properties: deterministic, preserves similarity.

---

## 3.11 Session Lifecycle

```
1. Session starts
   → Empty variable space
   → Core not auto-loaded (call `session.loadCore()`)

2. Load theories
   @_ Load $Economics
   @_ Load $Physics

3. Work
   @fact sell Alice Bob Car 100
   @query buy ?who Book ?seller ?price

4. Optionally export
   @_ Export $fact

5. Unload (optional)
   @_ Unload $Physics

6. Session ends
   → Variables discarded
   → Theories remain on disk
```

---

## 3.12 Summary

| Concept | Description |
|---------|-------------|
| Theory = Vector + Namespace | Identity that can be manipulated + content that can be loaded |
| Load/Unload/Export/Import | Normal verbs in Core, follow standard syntax |
| Core | Not auto-loaded by default; load via `session.loadCore()` |
| Stacking | Multiple theories, most-recent-first resolution |
| `@_` | Discard destination for Load/Export |
| Geometry | 16K/32K/64K bits, auto-extend across theories |
| Hot/Cold | Dense RAM for speed, sparse disk for storage |

**Key insight:** Theories are first-class vectors. You can compare them, bundle them, query about them, and pass them to graphs dynamically.

---

*End of Chapter 3*
