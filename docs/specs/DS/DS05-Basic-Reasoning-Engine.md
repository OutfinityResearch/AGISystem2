# AGISystem2 - System Specifications

# Chapter 5: Reasoning Engine

**Document Version:** 2.0  
**Author:** Sînică Alboaie  
**Status:** Draft Specification

---

## 5.1 The Master Equation

All reasoning in AGISystem2 reduces to one equation:

```
Answer = Knowledge ⊕ Query⁻¹
```

Where:
- `Knowledge` = bundled facts in KB
- `Query⁻¹` = inverse of partial query (in XOR, inverse = same operation)
- `Answer` = vector similar to what we're looking for

**Why this works:**

If we stored `fact = Verb ⊕ (Pos1 ⊕ A) ⊕ (Pos2 ⊕ B)` and query for `?x` in `Verb ⊕ ?x ⊕ B`:

```
partial = Verb ⊕ (Pos2 ⊕ B)
answer = fact ⊕ partial
       = (Verb ⊕ (Pos1 ⊕ A) ⊕ (Pos2 ⊕ B)) ⊕ (Verb ⊕ (Pos2 ⊕ B))
       = (Pos1 ⊕ A) ⊕ (Verb ⊕ Verb) ⊕ ((Pos2 ⊕ B) ⊕ (Pos2 ⊕ B))
       = (Pos1 ⊕ A) ⊕ 0 ⊕ 0
       = Pos1 ⊕ A

# Then extract A:
A = answer ⊕ Pos1
```

The known parts cancel out, leaving the unknown (tagged with its position).

> ### ⚠️ CRITICAL LIMITATION: Argument Order Ambiguity
>
> **Important clarification:** While the Master Equation correctly isolates the component `(PosN ⊕ ArgN)`, it does NOT guarantee argument order.
>
> **What the equation does:**
> - Correctly cancels out known parts using XOR self-inverse property
> - Isolates the unknown argument tagged with its position vector
> - Returns a vector similar to the target argument
>
> **What it does NOT do:**
> - Inherently encode the sequence 1→2→3 in the vector structure
> - Guarantee order when decoding multiple arguments simultaneously
>
> **Why reasoning still works:**
> - The algebra correctly distinguishes `loves(John, Mary)` from `loves(Mary, John)` because `Pos1⊕John` ≠ `Pos1⊕Mary`
> - Query results are matched via similarity search, which finds the correct atoms
> - However, converting results to human-readable form requires semantic context
>
> **Resolution:**
> - The Phrasing Engine (DS11) uses role-annotated templates to impose logical order
> - Templates like `{Pos1:Subject} {Verb} {Pos2:Object}` ensure correct presentation
> - Reasoning is sound; presentation is handled by the Phrasing layer

---

## 5.2 Query Execution Pipeline

When `session.query("@answer Verb ?x B")` is called:

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: PARSE                                               │
│   Input: "@answer Verb ?x B"                                │
│   Output: AST {dest: "answer", op: "Verb", args: [?x, B]}   │
│   Holes identified: [?x]                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: RESOLVE KNOWN ARGUMENTS                             │
│   Verb → vector (from theory)                               │
│   B → vector (from theory)                                  │
│   ?x → marked as hole (position 1)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: BUILD PARTIAL VECTOR                                │
│   partial = Verb ⊕ (Pos2 ⊕ B)                               │
│   (skip hole positions in binding)                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: UNBIND FROM KNOWLEDGE BASE                          │
│   candidate = KB ⊕ partial                                  │
│   This "subtracts" known parts, leaving unknown             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: SIMILARITY SEARCH                                   │
│   For each literal L in vocabulary:                         │
│       score = similarity(candidate, L)                      │
│   Rank by score descending                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: RETURN RESULT                                       │
│   Best match becomes binding for ?x                         │
│   Return Result {vector, bindings, success}                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5.3 Similarity Measurement

**Hamming Similarity** for binary vectors:

```
similarity(A, B) = 1 - (hammingDistance(A, B) / dimension)
```

| Hamming Distance | Similarity | Interpretation |
|------------------|------------|----------------|
| 0 | 1.0 | Identical |
| d/4 | 0.75 | Very similar |
| d/2 | 0.5 | Random/unrelated |
| 3d/4 | 0.25 | Very different |

**Threshold for acceptance:** Typically > 0.6 for valid match.

**Implementation:**
```javascript
function similarity(a, b) {
    let same = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] ^ b[i];
        same += 64 - popcount(diff);
    }
    return same / (a.length * 64);
}
```

**Noise Considerations:**

As the KB grows, noise increases because Bundle superimposes all facts. Expected similarity degradation:

| KB Size | Expected Noise | Typical Match Quality |
|---------|----------------|----------------------|
| 10 facts | Low | > 0.85 |
| 50 facts | Moderate | 0.70 - 0.85 |
| 100 facts | Significant | 0.60 - 0.75 |
| 200+ facts | High | May need resonator |

---

## 5.4 Multiple Holes: Constraint Solving

When query has multiple holes, we solve them iteratively:

**Query:** `@answer sell ?seller ?buyer Car ?price`

**Strategy: Sequential Resolution**

```
1. Build partial: sell ⊕ (Pos3 ⊕ Car)
2. Unbind from KB → noisy candidate containing Pos1⊕seller, Pos2⊕buyer, Pos4⊕price
3. For each hole, unbind its position vector:
   - seller = candidate ⊕ Pos1
   - buyer = candidate ⊕ Pos2
   - price = candidate ⊕ Pos4
4. Similarity search for each to clean up noise
5. Return best matches
```

**Error Accumulation Warning:** Each unbinding step adds noise. With 3+ holes, results may degrade significantly. Consider:
- Providing more known arguments to reduce holes
- Using resonator network for complex queries

**Alternative: Resonator Network** (for complex cases)

When simple unbinding produces too much noise:

```
1. Initialize guesses for all holes randomly
2. Iterate:
   a. Fix all holes except one
   b. Solve for that hole using similarity search
   c. Update guess with best match
   d. Repeat for next hole
3. Until convergence or max iterations (typically 5-10)
```

The resonator network exploits the constraint that all holes must be consistent with the same underlying fact.

---

## 5.5 Rules as Facts

Rules are not special syntax. They are ordinary facts using logical connectives from Core.

**Core defines these atoms:**
```
@Implies __Relation      # if-then
@And __Relation          # conjunction
@Or __Relation           # disjunction
@Not __Relation          # negation
@ForAll __Relation       # universal quantification
```

**Expressing rules:**

| Rule in Logic | In Sys2DSL |
|---------------|------------|
| Human(x) → Mortal(x) | `@r1 Implies Human Mortal` |
| Human(x) ∧ Adult(x) → CanVote(x) | `@cond And Human Adult` then `@r2 Implies $cond CanVote` |
| Bird(x) ∧ ¬Penguin(x) → CanFly(x) | `@notPeng Not Penguin` then `@cond And Bird $notPeng` then `@r3 Implies $cond CanFly` |

**Example - building a rule:**
```
# "If something is Human, then it is Mortal"
@r1 Implies Human Mortal

# "If something is Human AND Adult, then it CanVote"
@cond And Human Adult
@r2 Implies $cond CanVote

# "If Parent(x,y) AND Parent(y,z) then Grandparent(x,z)"
@chain And Parent Parent      # simplification: represents chained relation
@r3 Implies $chain Grandparent
```

---

## 5.6 Forward Reasoning (Deduction)

Given facts, derive new facts using rules. Also called **forward chaining** or **modus ponens**.

**Setup:**
```
# Facts
@f1 Human Socrates
@f2 Human Plato

# Rule
@r1 Implies Human Mortal
```

**Forward process:**
```
1. Find all rules in KB (vectors with Implies as operator)
2. For each rule @r Implies $antecedent $consequent:
   a. Query: find all ?x where $antecedent ?x
   b. For each match, assert $consequent ?x
3. Repeat until no new facts (fixed point)
```

**Engine execution:**
```
# Find rule: r1 = Implies Human Mortal
# Extract: antecedent=Human, consequent=Mortal

# Query: @q Human ?x
# Results: ?x = Socrates, ?x = Plato

# Derive:
@derived1 Mortal Socrates
@derived2 Mortal Plato
```

---

## 5.7 Backward Chaining (Goal-Directed Proof)

Given a goal, search for rules and facts that can prove it.

> **Terminology Note:** This is **backward chaining**, NOT abduction. 
> - **Backward chaining** = "Can I prove X?" → Find rules that conclude X, recursively prove their premises
> - **Abduction** = "X happened. Why?" → Find the best explanation among possible causes
> 
> For abduction (inference to best explanation), see Chapter 6.2.

**Setup:**
```
# Facts
@f1 Human Socrates

# Rule  
@r1 Implies Human Mortal
```

**Query:** `@q Mortal Socrates` — Is Socrates mortal?

**Backward chaining process:**
```
1. Search KB directly for "Mortal Socrates" → not found
2. Find rules with consequent ≈ Mortal
3. Found: r1 = Implies Human Mortal
4. New subgoal: prove "Human Socrates"
5. Search KB for "Human Socrates" → found (f1)
6. Chain complete: Socrates is Mortal via r1
```

**Proof trace:**
```
Goal: Mortal Socrates
  ↓ rule r1: Implies Human Mortal
  Subgoal: Human Socrates
    ↓ found: f1
  QED
```

**When to use:**
- Verifying if a statement is provable
- Finding derivation paths
- Answering yes/no questions with explanation

---

## 5.8 Rule Chaining

Complex reasoning chains multiple rules.

**Setup:**
```
# Facts
@f1 Parent Alice Bob
@f2 Parent Bob Charlie

# Rules
@r1 Implies Parent Ancestor
@cond And Parent Parent
@r2 Implies $cond Grandparent
```

**Query:** `@q Grandparent Alice ?who`

**Process:**
```
1. Goal: Grandparent Alice ?who
2. Find rule with consequent ≈ Grandparent: r2
3. r2 needs: And Parent Parent
4. Find: Parent Alice ?mid → Bob
5. Find: Parent Bob ?who → Charlie
6. Chain complete: Grandparent Alice Charlie
```

**Chain depth limits:** Default max depth = 5. Deeper chains accumulate noise and reduce confidence.

---

## 5.9 Rule Representation in Vectors

Rules are vectors like everything else:

```
@r1 Implies Human Mortal
# r1 = Implies ⊕ (Pos1 ⊕ Human) ⊕ (Pos2 ⊕ Mortal)
```

**Extracting rule components:**
```
# Get antecedent (position 1)
@temp1 ___Bind $r1 Implies              # Remove Implies operator
@temp2 ___Bind $temp1 (Pos2 ⊕ Mortal)   # Remove consequent
@ante ___Bind $temp2 Pos1               # Remove position marker
# ante ≈ Human

# Get consequent (position 2)
@temp1 ___Bind $r1 Implies
@temp2 ___Bind $temp1 (Pos1 ⊕ Human)
@cons ___Bind $temp2 Pos2
# cons ≈ Mortal
```

**Querying rules:**
```
# Find all rules about Mortal
@q Implies ?antecedent Mortal

# Find all rules where Human is antecedent
@q Implies Human ?consequent
```

---

## 5.10 Proof Generation

`prove()` records every reasoning step.

**Proof structure:**
```javascript
Proof {
    query: string,
    result: Result,
    valid: boolean,
    confidence: number,
    steps: ProofStep[]
}

ProofStep {
    id: number,
    operation: string,
    inputs: any,
    output: any,
    similarity?: number,
    detail: string
}
```

**Example proof for `@q Mortal Socrates`:**

| Step | Operation | Detail |
|------|-----------|--------|
| 1 | search_direct | Search KB for "Mortal Socrates" |
| 2 | not_found | Direct match not found (similarity: 0.52) |
| 3 | find_rules | Search rules with consequent ≈ Mortal |
| 4 | found_rule | r1: Implies Human Mortal (similarity: 0.94) |
| 5 | extract | Antecedent = Human |
| 6 | subgoal | New goal: Human Socrates |
| 7 | search_direct | Search KB for "Human Socrates" |
| 8 | found | Matched f1 (similarity: 0.98) |
| 9 | apply_rule | Apply r1: Human → Mortal |
| 10 | conclude | VALID: Mortal Socrates (confidence: 0.92) |

**Confidence calculation:** `min(0.94, 0.98) = 0.94`, adjusted for chain length → `0.92`

---

## 5.11 Analogy

"A is to B as C is to ?"

```
# King is to Queen as Man is to ?
@rel ___Bind King Queen           # rel = King ⊕ Queen (the relationship)
@answer ___Bind Man $rel          # apply relationship to Man
@result ___MostSimilar $answer $vocabulary
# Result: Woman
```

**Why this works:**

The binding `King ⊕ Queen` encodes the relationship between these concepts (gender transformation within royalty). Applying this same transformation to `Man` produces a vector similar to `Woman`.

**Common analogy patterns:**
- Gender: King:Queen :: Man:Woman
- Geography: France:Paris :: Germany:Berlin
- Tense: walk:walked :: run:ran
- Scale: big:bigger :: small:smaller

---

## 5.12 Knowledge Base Operations

**Adding fact:**
```
KB_new = ___Bundle(KB_old, new_fact)
```

**Querying:**
```
candidates = KB ⊕ partial_query
```

**Multiple matches:**

The result is superposition; correct answer has highest similarity. When multiple facts match, all contribute to the candidate vector, but the true match dominates.

**Capacity warning:** Bundle capacity is ~100-200 items at 32K geometry. Beyond this, the KB saturates and query quality degrades significantly.

---

## 5.13 Confidence and Uncertainty

| Source | Impact |
|--------|--------|
| Similarity score | Direct match quality |
| KB noise | More facts = more noise |
| Chain length | More steps = lower confidence |
| Rule confidence | Some rules more certain than others |

**Propagation:**
```
chain_confidence = min(step_confidences) × decay^(chain_length - 1)
```

Where `decay` is typically 0.95-0.98.

**Confidence interpretation:**

| Confidence | Meaning |
|------------|---------|
| > 0.90 | High confidence, likely correct |
| 0.75 - 0.90 | Moderate, probably correct |
| 0.60 - 0.75 | Low, may need verification |
| < 0.60 | Very low, likely noise |

---

## 5.14 Reasoning Examples

**Example 1: Direct query**
```
@f1 loves John Mary
@q loves ?who Mary
# Result: ?who = John (confidence: 0.98)
```

**Example 2: Rule-based (backward chaining)**
```
@f1 Human Socrates
@r1 Implies Human Mortal
@q Mortal Socrates
# Process: rule r1 + fact f1 → valid
# Result: true (confidence: 0.96)
```

**Example 3: Chained rules**
```
@f1 Parent Alice Bob
@f2 Parent Bob Charlie
@cond And Parent Parent
@r1 Implies $cond Grandparent
@q Grandparent Alice ?who
# Result: ?who = Charlie (confidence: 0.89)
```

**Example 4: Analogy**
```
@rel ___Bind France Paris
@answer ___Bind Germany $rel
@city ___MostSimilar $answer vocabulary
# Result: Berlin (similarity: 0.78)
```

---

## 5.15 Comparison: Reasoning Types

| Type | Question | Direction | Chapter |
|------|----------|-----------|---------|
| **Direct Query** | "What is X?" | KB → Answer | 5.2 |
| **Forward Chaining** | "What follows from X?" | Facts → New Facts | 5.6 |
| **Backward Chaining** | "Can I prove X?" | Goal → Supporting Facts | 5.7 |
| **Analogy** | "A:B :: C:?" | Pattern Transfer | 5.11 |
| **Abduction** | "Why did X happen?" | Observation → Explanation | 6.2 |
| **Induction** | "What's the rule?" | Examples → Generalization | 6.3 |

---

## 5.16 Dual Reasoning Modes

The reasoning engine operates in two distinct modes based on the active HDC strategy (see DS01 Section 1.10).

### 5.16.1 HDC-Priority Mode (dense-binary)

When using `dense-binary` strategy, the reasoning engine uses the **Master Equation** as its primary mechanism:

```
Query Resolution:
┌─────────────────────────────────────────────────────────────┐
│ 1. Build partial vector (exclude holes)                     │
│ 2. candidate = KB ⊕ partial                                 │
│ 3. Unbind position vector: answer = candidate ⊕ PosN        │
│ 4. Similarity search in vocabulary                          │
│ 5. Return best match with confidence                        │
└─────────────────────────────────────────────────────────────┘

Proof Resolution:
┌─────────────────────────────────────────────────────────────┐
│ 1. Search KB directly (similarity > 0.6)                    │
│ 2. If not found, search rules by consequent similarity      │
│ 3. Extract antecedent, recurse for subgoals                 │
│ 4. Combine confidences with decay                           │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Graceful degradation under noise
- Works with bundled KB (facts superimposed)
- Supports analogical reasoning
- Limited by bundle capacity (~100-200 facts)

### 5.16.2 Symbolic-Priority Mode (sparse-polynomial, metric-affine)

When using `sparse-polynomial` or `metric-affine` strategies, HDC is **just a structural representation**. Reasoning is purely symbolic:

```
Query Resolution (Symbolic KB):
┌─────────────────────────────────────────────────────────────┐
│ 1. Parse query to extract operator, args, holes             │
│ 2. Scan kbFacts array for exact operator match              │
│ 3. Match known args against fact metadata                   │
│ 4. Extract answer from matching fact's metadata             │
│ 5. NO unbinding, NO similarity search                       │
└─────────────────────────────────────────────────────────────┘

Proof Resolution (Symbolic Chains):
┌─────────────────────────────────────────────────────────────┐
│ 1. Direct KB lookup (exact match on operator + args)        │
│ 2. Transitive reasoning (isA chains, inheritable props)     │
│ 3. Rule matching (structural unification)                   │
│ 4. CSP backtracking (for complex constraints)               │
│ 5. Property inheritance (isA Child Parent → prop propagation)│
└─────────────────────────────────────────────────────────────┘
```

**Why Master Equation fails:**
- Sparse-polynomial: Jaccard similarity after XOR doesn't isolate components
- Metric-affine: L₁ distance baseline (0.67) makes unbinding unreliable
- Both achieve 100% accuracy via symbolic paths anyway

**Characteristics:**
- Unlimited KB capacity (no bundle saturation)
- Perfect accuracy on symbolic queries
- No noise accumulation
- Faster for logical inference

### 5.16.3 Fallback Behavior

The engine automatically uses the appropriate mode:

```javascript
// In ProofEngine.prove()
if (strategy === 'dense-binary') {
  // Try HDC similarity matching first
  const hdcResult = this.tryHDCLookup(goal);
  if (hdcResult.valid) return hdcResult;
}

// Always try symbolic paths (works for all strategies)
const symbolicResult = this.trySymbolicChain(goal);
if (symbolicResult.valid) return symbolicResult;

// For symbolic-priority strategies, try CSP if needed
if (strategy !== 'dense-binary') {
  return this.tryCSPBacktracking(goal);
}
```

### 5.16.4 Mode Comparison

| Aspect | HDC-Priority | Symbolic-Priority |
|--------|-------------|-------------------|
| Master Equation | ✓ Primary mechanism | ✗ Not used |
| KB Scanning | Via similarity | Via metadata match |
| Transitive Chains | Similarity-guided | Graph traversal |
| Property Inheritance | Both | Both |
| Rule Application | Similarity-based | Unification-based |
| CSP Backtracking | Minimal | Full support |
| KB Capacity | ~200 facts | Unlimited |
| Accuracy | Graceful degradation | 100% or fail |

---

## 5.17 Summary

| Concept | Description |
|---------|-------------|
| Master equation | `Answer = KB ⊕ Query⁻¹` (HDC-Priority only) |
| Rules | Ordinary facts: `@r Implies Antecedent Consequent` |
| Compound conditions | Build with And, Or, Not as intermediate variables |
| Forward chaining | Facts + rules → derive new facts (deduction) |
| Backward chaining | Goal → find supporting rules → prove subgoals |
| Proof | Recorded chain of reasoning steps with confidence |
| Analogy | Relation transfer via binding (HDC-Priority only) |
| Confidence | Propagates through chain, decreases with depth |
| **Dual modes** | HDC-Priority (dense) vs Symbolic-Priority (sparse) |

**Key insight:** Rules are not special. `Implies`, `And`, `Or`, `Not` are just vectors in Core. The engine recognizes patterns and chains them.

**Limitations (HDC-Priority):**
- KB capacity ~100-200 facts before saturation
- Deep chains (>5 steps) accumulate significant noise
- Multiple holes degrade accuracy
- **Argument Order Loss:** Due to XOR commutativity (see 5.1), the vector structure does not inherently encode argument sequence. Position vectors act as tags, not sequence markers. Decoding relies on similarity matching and semantic context. The Phrasing Engine (DS11) is responsible for re-imposing logical order at presentation time using role-annotated templates.

**Limitations (Symbolic-Priority):**
- No analogical reasoning capability
- No fuzzy matching (exact match only)
- Requires explicit rules (no implicit similarity)

---

*End of Chapter 5*
