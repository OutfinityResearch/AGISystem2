# AGISystem2 - System Specifications

# Chapter 14: Evaluation Suite Framework

**Document Version:** 2.0
**Status:** Draft Specification
**Focus:** Automated Evaluation and Benchmark Suite

---

## 14.1 Purpose

This specification defines an **Evaluation Suite Framework** that provides systematic evaluation of AGISystem2 capabilities through **simulated conversations**.

**Key Principle: One Suite = One Session (Conversation)**

A suite represents a coherent conversation/session where facts are learned progressively and then queried/proven. This mirrors real-world usage patterns where knowledge accumulates over time.

---

## 14.2 Core Concepts

### 14.2.1 Suite as Conversation

Each suite simulates a conversation with the system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUITE = CONVERSATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Learn base knowledge                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ "Dogs are mammals. Cats are mammals. Rex is a dog."     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  Step 2: Query the knowledge                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ "What is Rex?" → "Rex is a dog"                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  Step 3: Prove derived facts                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ "Is Rex a mammal?" → "Yes, because Rex is a dog and     │    │
│  │                       dogs are mammals"                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  Step 4: Learn more, query again...                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2.2 Session Persistence

- **Single Session per Suite**: All steps in a suite share the same `Session` instance
- **Knowledge Accumulates**: Facts learned in step N are available in step N+1
- **No Isolation Between Steps**: This is intentional - tests real usage patterns

### 14.2.3 Dual Input Testing

Each learning step should have **both** `input_nl` and `input_dsl`:
- `input_nl`: Tests NL→DSL transformation
- `input_dsl`: Provides reference DSL for comparison/fallback

### 14.2.4 DSL Persistence Rules

**Critical**: Not all DSL statements are stored in the knowledge base (KB).

| Syntax | Scope | KB | Use Case |
|--------|-------|---|---------|
| `operator arg1 arg2` | No | Yes | Simple facts (anonymous) |
| `@var:name operator arg1 arg2` | Yes | Yes | Named facts for reasoning |
| `@var operator arg1 arg2` | Yes | No | **Temporary** - for building complex expressions |

**Example - Negation:**
```dsl
love John Mary                    # → KB (anonymous fact)
@neg love John Alice              # → scope only (temporary)
@f1:negJohnAlice Not $neg         # → KB (the negation itself)
```

After this, KB contains:
1. `love John Mary` (anonymous)
2. `Not (love John Alice)` named `negJohnAlice`

**Important**: `prove love John Alice` returns **false** because the positive fact is NOT in KB.

```javascript
{
  action: 'learn',
  input_nl: 'John loves Mary. John does not love Alice.',
  input_dsl: `
    love John Mary
    @neg love John Alice
    @n1:negJohnAlice Not $neg
  `,
  expected_nl: 'Learned 2 facts'
}
```

---

## 14.3 Directory Structure

```
evals/
├── runFastEval.mjs                  # Main runner script (npm run eval)
└── fastEval/
    ├── healthCheck.js              # Suite health checker
    ├── lib/
    │   ├── runner.mjs              # Suite execution engine
    │   ├── reporter.mjs            # Terminal reporter with colors
    │   └── loader.mjs              # Suite/case loader
│
    ├── suite01_foundations/
    │   └── cases.mjs
    ├── suite05_negation/
    │   └── cases.mjs
    ├── suite21_goat_cabbage_plus/
    │   └── cases.mjs
    ├── suite23_tool_planning/
    │   └── cases.mjs
    └── suite24_contradictions/
        └── cases.mjs
```

---

## 14.4 Suite Definition Format

### 14.4.1 Suite Structure (cases.mjs)

```javascript
export const name = 'Suite Name';
export const description = 'What this conversation tests';

// Core theories required for this suite
export const theories = ['05-logic.sys2', '09-roles.sys2'];

// Conversation steps - executed IN ORDER on same session
export const steps = [
  // Learn base facts
  {
    action: 'learn',
    input_nl: 'Dogs are mammals. Cats are mammals. Birds are animals.',
    input_dsl: `
      @f1 isA Dog Mammal
      @f2 isA Cat Mammal
      @f3 isA Bird Animal
    `,
    expected_nl: 'Learned 3 taxonomy facts'
  },

  // Learn specific instances
  {
    action: 'learn',
    input_nl: 'Rex is a dog. Whiskers is a cat. Tweety is a bird.',
    input_dsl: `
      @f4 isA Rex Dog
      @f5 isA Whiskers Cat
      @f6 isA Tweety Bird
    `,
    expected_nl: 'Learned 3 instance facts'
  },

  // Query - what is Rex?
  {
    action: 'query',
    input_nl: 'What is Rex?',
    input_dsl: '@q isA Rex ?what',
    expected_nl: ['Rex is a dog.'],
    proof_nl: ['isA Rex Dog']
  },

  // Prove - is Rex a mammal?
  {
    action: 'prove',
    input_nl: 'Is Rex a mammal?',
    input_dsl: '@goal isA Rex Mammal',
    expected_nl: 'True: Rex is a mammal.',
    proof_nl: 'Rex isA Dog. Dog isA Mammal.'
  },

  // Learn a rule
  {
    action: 'learn',
    input_nl: 'All mammals are warm-blooded.',
    input_dsl: `
      @cond isA ?x Mammal
      @conc hasProperty ?x WarmBlooded
      @r1 Implies $cond $conc
    `,
    expected_nl: 'Learned 1 rule: mammals are warm-blooded'
  },

  // Prove derived property
  {
    action: 'prove',
    input_nl: 'Is Rex warm-blooded?',
    input_dsl: '@goal hasProperty Rex WarmBlooded',
    expected_nl: 'True: Rex has WarmBlooded.',
    proof_nl: 'Rex isA Dog. Dog isA Mammal. Mammal hasProperty WarmBlooded. Applied rule: Implies $cond $conc.'
  }
];

export default { name, description, theories, steps };
```

### 14.4.2 Step Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | `learn`, `query`, `prove` (`explain` is reserved; not executed by the runner; no `session.explain()` yet) |
| `input_nl` | string | Yes | Natural language input (fact to learn, question to ask) |
| `input_dsl` | string | Yes | Equivalent DSL (reference for all actions) |
| `expected_nl` | string (learn/prove), string[] (query) | Yes | Expected natural language response |
| `proof_nl` | string (prove), string[] (query) | Conditional | Required for `query` and `prove`; omit for `learn` |
| `alternative_proof_nl` | string (prove), string[] (query) | Optional | Alternate proof chain(s) accepted by runner (must match `proof_nl` shape) |

**Note**: Step ordering is determined by array index - no explicit `step` field needed.

**Proof Requirements**:
- `expected_nl` MUST contain only the answer text (no "Proof:" or "Search:" sections).
- For `prove`, `proof_nl` MUST describe the full reasoning chain or failure trace.
- For `prove`, `alternative_proof_nl` MAY be provided as a fully valid alternative chain.
- For `query`, `proof_nl` MUST be an array with one entry per answer, each entry containing the full reasoning chain that yields that answer (including all transitive links and rule applications).
- For `query`, the number of answers in `expected_nl` MUST match the length of `proof_nl`.
- For `query`, `expected_nl` MUST be an array with one answer per entry.
- For `query`, `alternative_proof_nl` (if present) MUST mirror `proof_nl` length and structure.

**Validation**: `expected_nl` validates answers; `proof_nl` validates reasoning chains. If `alternative_proof_nl` is present, runner accepts either proof set as valid.

### 14.4.3 Action Types

| Action | Description | Session Method | Input Fields | Output |
|--------|-------------|----------------|--------------|--------|
| `learn` | Add facts/rules to KB | `session.learn()` | `input_nl`, `input_dsl` | facts count, warnings, or REJECTION |
| `query` | Query KB with holes | `session.query()` | `input_nl`, `input_dsl` | bindings, confidence |
| `prove` | Prove a goal (no holes!) | `session.prove()` | `input_nl`, `input_dsl` | valid, proof steps |
 
**Note:** `explain` is reserved for future use; the current runner does not execute it and the Session API does not expose `explain`.

**Note on prove vs query:**
- `query` uses hole patterns (e.g., `@q isA Rex ?what`) to extract unknown values
- `prove` uses complete facts (e.g., `@goal isA Rex Dog`) to verify truth - no holes allowed

---

## 14.5 Contradiction Detection and Rejection

The system can maintain **theory-driven** consistency by detecting and rejecting *hard contradictions* during `learn`.

Key points:
- Contradictions are defined by **constraints loaded from theories** (Core/domain) and surfaced via `SemanticIndex`.
- `learn` is **transactional**: if any statement is rejected, the session state remains unchanged.
- `Not(...)` is a first-class fact used for **blocking inference / exceptions**; it is **not** a rejection trigger by itself.

### 14.5.1 How Contradictions Work

When a `learn` action encounters a fact that contradicts existing knowledge, it **REJECTS** the new fact and returns an explanation:

```javascript
// Previously learned: Door is Open
{
  action: 'learn',
  input_nl: 'Setup: Door is Open.',
  input_dsl: 'hasState Door Open',
  expected_nl: 'Learned 1 facts'
},

// Now trying to learn: Door is Closed → REJECTION (mutuallyExclusive constraint from Core)
{
  action: 'learn',
  input_nl: 'Door is Closed.',
  input_dsl: `
    locatedIn Door Kitchen
    hasState Door Closed
  `,
  expect_success: false,
  assert_state_unchanged: true,
  expected_nl: 'Warning: contradiction - Door is both Closed and Open'
}
```

### 14.5.2 Types of Contradictions

| Type | Description | Example |
|------|-------------|---------|
| **mutuallyExclusive** | Same subject cannot have two exclusive values | `hasState Door Open` + learn `hasState Door Closed` |
| **contradictsSameArgs** | Two operators cannot both hold for the same args | `before A B` + learn `after A B` |
| **Derived (transitive)** | Contradiction against a relation derivable from a transitive chain | `before Start Middle` + `before Middle End` ⇒ derived `before Start End`, then learn `after Start End` |
| **Derived (inherited)** | Contradiction against a property inherited through an `isA` chain | `isA Tea Beverage`, `isA Beverage Liquid`, `hasProperty Liquid Cold`, then learn `hasProperty Tea Hot` |

### 14.5.3 Rejection Response Format

```javascript
{
  success: false,
  errors: ['Contradiction rejected: ...'],
  warnings: ['contradiction: ...']
}
```

Current runtime surfaces contradictions via `errors`/`warnings`. NL output is generated via `session.describeResult(...)`.

### 14.5.4 Example Suite: Contradiction Detection

See `evals/fastEval/suite24_contradictions/cases.mjs` for comprehensive examples including:
- `mutuallyExclusive` and `contradictsSameArgs` rejections
- Indirect contradictions (transitive chaining, inherited properties)
- Canonicalization effects (`alias`, `synonym`) on contradiction detection
- Transactional rollback (`assert_state_unchanged: true`)

Negation semantics (`Not` as exception/blocker) are tested separately in `evals/fastEval/suite05_negation/cases.mjs`.

---

## 14.6 Expected Output Format

DSL→NL output is produced by `session.describeResult(...)` (via `ResponseTranslator`).
The translator returns a **string**. Proof text, when present, is appended as `" Proof: ..."`.

### 14.6.1 Learn Output

Reasoning result (from `session.learn`):
```javascript
{
  success: true,
  facts: 3,
  errors: [],
  warnings: []
}
```

NL output (string):
```
Learned 3 facts
```

### 14.6.2 Query Output

Reasoning result (from `session.query`) includes bindings; NL output is a string:
```
Rex is a dog. Proof: isA Rex Dog.
```

### 14.6.3 Prove Output

Reasoning result (from `session.prove`) includes proof steps; NL output is a string:
```
True: Rex is a mammal. Proof: isA Rex Dog. isA Dog Mammal.
```

---

## 14.6 Runner Implementation

### 14.6.1 Suite Execution Flow

```javascript
async function runSuite(suite) {
  // 1. Create SINGLE session for entire suite
  const session = new Session({ geometry: 4096 });

  // 2. Load Core theories
  await loadCoreTheories(session, suite.theories);

  // 3. Execute steps IN ORDER (same session!)
  const results = [];
  for (const step of suite.steps) {
    const result = await executeStep(step, session);
    results.push(result);

    // Stop on critical failure (optional)
    if (result.critical_failure) break;
  }

  // 4. Close session
  session.close();

  return results;
}

async function executeStep(step, session) {
  switch (step.action) {
    case 'learn':
      return await executeLearning(step, session);
    case 'query':
      return await executeQuery(step, session);
    case 'prove':
      return await executeProve(step, session);
    default:
      throw new Error(`Unsupported action: ${step.action}`);
  }
}
```

### 14.6.2 Learning Execution

```javascript
async function executeLearning(step, session) {
  // Try NL first
  let dsl = step.input_dsl;
  let nl_transform_success = false;

  if (step.input_nl) {
    const nlResult = transformer.transform(step.input_nl);
    if (nlResult.success) {
      dsl = nlResult.dsl;
      nl_transform_success = true;
    }
  }

  // Learn the DSL
  const learnResult = session.learn(dsl);

  return {
    step: step.step,
    action: 'learn',
    nl_transform: nl_transform_success ? 'PASS' : 'SKIP',
    reasoning: learnResult.success ? 'PASS' : 'FAIL',
    actual: learnResult
  };
}
```

---

## 14.7 Example Suite: Animal Taxonomy

Complete example of a conversation about animal classification:

```javascript
// Example: cases.mjs

export const name = 'Animal Taxonomy';
export const description = 'Learn and reason about animal classifications';

export const theories = ['00-types.sys2', '05-logic.sys2'];

export const steps = [
  // Learn base taxonomy
  {
    action: 'learn',
    input_nl: `
      Dogs are mammals. Cats are mammals.
      Mammals are animals. Birds are animals.
      Animals are living things.
    `,
    input_dsl: `
      @f1 isA Dog Mammal
      @f2 isA Cat Mammal
      @f3 isA Mammal Animal
      @f4 isA Bird Animal
      @f5 isA Animal LivingThing
    `,
    expected_nl: 'Learned 5 taxonomy facts'
  },

  // Learn instances
  {
    action: 'learn',
    input_nl: 'Rex is a dog. Whiskers is a cat. Tweety is a bird.',
    input_dsl: `
      @f6 isA Rex Dog
      @f7 isA Whiskers Cat
      @f8 isA Tweety Bird
    `,
    expected_nl: 'Learned 3 instance facts'
  },

  // Simple query
  {
    action: 'query',
    input_nl: 'What is Rex?',
    input_dsl: '@q isA Rex ?what',
    expected_nl: ['Rex is a dog.'],
    proof_nl: ['isA Rex Dog']
  },

  // Another query
  {
    action: 'query',
    input_nl: 'What is Whiskers?',
    input_dsl: '@q isA Whiskers ?what',
    expected_nl: ['Whiskers is a cat.'],
    proof_nl: ['isA Whiskers Cat']
  },

  // Prove direct fact
  {
    action: 'prove',
    input_nl: 'Is Rex a dog?',
    input_dsl: '@goal isA Rex Dog',
    expected_nl: 'True: Rex is a dog.',
    proof_nl: 'isA Rex Dog'
  },

  // Prove derived fact (1 step)
  {
    action: 'prove',
    input_nl: 'Is Rex a mammal?',
    input_dsl: '@goal isA Rex Mammal',
    expected_nl: 'True: Rex is a mammal.',
    proof_nl: 'isA Rex Dog. isA Dog Mammal.'
  },

  // Prove derived fact (2 steps)
  {
    action: 'prove',
    input_nl: 'Is Rex an animal?',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'True: Rex is an animal.',
    proof_nl: 'isA Rex Dog. isA Dog Mammal. isA Mammal Animal.'
  },

  // Learn properties
  {
    action: 'learn',
    input_nl: 'Rex is friendly. Rex is brown. Whiskers is lazy.',
    input_dsl: `
      @p1 hasProperty Rex friendly
      @p2 hasProperty Rex brown
      @p3 hasProperty Whiskers lazy
    `,
    expected_nl: 'Learned 3 property facts'
  },

  // Query property
  {
    action: 'query',
    input_nl: 'What property does Rex have?',
    input_dsl: '@q hasProperty Rex ?prop',
    expected_nl: ['Rex is friendly.', 'Rex is brown.'],
    proof_nl: ['hasProperty Rex friendly', 'hasProperty Rex brown']
  },

];

export default { name, description, theories, steps };
```

---

## 14.8 Terminal Output

```
═══════════════════════════════════════════════════════════════════
                    AGISystem2 Evaluation Suite
═══════════════════════════════════════════════════════════════════

▶ Animal Taxonomy (9 steps)
  Core Theories: 00-types.sys2, 05-logic.sys2

  Step  Action   NL→DSL    Reasoning  NL Output  Description
  ────  ───────  ────────  ─────────  ─────────  ───────────────────
    1   learn    ✓ PASS    ✓ PASS     ✓ PASS     Learn base taxonomy
    2   learn    ✓ PASS    ✓ PASS     ✓ PASS     Learn instances
    3   query    ○ SKIP    ✓ PASS     ✓ PASS     What is Rex?
    4   query    ○ SKIP    ✓ PASS     ✓ PASS     What is Whiskers?
    5   prove    ○ SKIP    ✓ PASS     ✓ PASS     Is Rex a dog?
    6   prove    ○ SKIP    ✓ PASS     ✗ FAIL     Is Rex a mammal?
    7   prove    ○ SKIP    ✓ PASS     ✗ FAIL     Is Rex an animal?
    8   learn    ✓ PASS    ✓ PASS     ✓ PASS     Learn properties
    9   query    ○ SKIP    ✓ PASS     ✓ PASS     Query Rex property
  Summary: 7/9 passed (78%)
  ├── NL→DSL:    3/3  (100%)
  ├── Reasoning: 9/9 (100%)
  └── NL Output: 7/9 (78%)

═══════════════════════════════════════════════════════════════════
                         FINAL SUMMARY
═══════════════════════════════════════════════════════════════════

Suite                         NL→DSL   Reason   Output   Overall
─────────────────────────────────────────────────────────────────
Animal Taxonomy               100%     100%     78%      ████████░░ 78%
Family Relations              90%      80%      60%      ██████░░░░ 60%
Rule Reasoning                80%      70%      50%      ██████░░░░ 55%
...

TOTAL: 42/55 steps passed (76%)
Time: 3.2s
═══════════════════════════════════════════════════════════════════
```

---

## 14.9 Validation Rules

### 14.9.1 NL→DSL Phase (learn steps only)

- **PASS**: NLTransformer produces valid DSL
- **FAIL**: Transformation errors or empty output
- **SKIP**: No `input_nl` provided (using `input_dsl` directly)

### 14.9.2 Reasoning Phase

- **learn**: `success === true`
- **query**: `success === true` AND bindings match `expected_bindings`
- **prove**: `valid === expected_valid`

### 14.9.3 NL Output Phase

Fuzzy comparison between actual output and `expected_nl` (plus proof checks when `proof_nl` is present):
- Ignore case
- Ignore punctuation variations
- Allow partial matches for long explanations
- Key concepts must be present

---

## 14.10 Adding New Suites

1. Create directory: `evals/fastEval/suiteNN_name/`
2. Create `cases.mjs` with `name`, `description`, `theories`, `steps`
3. Design as a conversation - progressive learning then querying
4. Include both `input_nl` and `input_dsl` for learn steps
5. Write realistic `expected_nl` responses
6. Run: `npm run eval`

---

## 14.11 URS Traceability

| URS | Requirement | How Suite Tests It |
|-----|-------------|-------------------|
| **URS-01** | Deterministic reasoning | Same session, consistent results |
| **URS-04** | Backward chaining | prove action with chain |
| **URS-05** | Confidence scores | Query/prove return confidence |
| **URS-11** | DSL representation | input_dsl validation |
| **URS-14** | NL output | expected_nl matching |
| **URS-17** | Summarize | NL response generation |
| **URS-18** | Elaborate/Explain | Reserved (runner does not execute explain yet) |

---

## 14.12 Permanent Guidelines for Suite Development

These guidelines are **permanent** and must be followed when working with the evaluation suite.

### 14.12.1 Code Separation Principle

**CRITICAL**: All NL translation code must be in the `session` module, NOT in the evaluation suite runner.

```
CORRECT:
  evals/fastEval/lib/runner.mjs → calls session.describeResult(result)
  src/runtime/session.mjs   → implements NL translation from internal representations

WRONG:
  evals/fastEval/lib/runner.mjs → contains NL translation logic directly
```

The evaluation suite runner should only:
1. Execute test cases using session methods
2. Compare actual NL output with expected NL
3. Report pass/fail status

### 14.12.2 Proof and Demonstration Requirements

**All `query` and `prove` actions MUST include demonstrations via `proof_nl`:**

```javascript
// WRONG - answer only (query)
expected_nl: ['Rex is a dog.']

// CORRECT - query with proof_nl
expected_nl: ['Rex is a dog.']
proof_nl: ['isA Rex Dog (direct KB match)']

// CORRECT - prove with full chain
expected_nl: 'True: Rex is a mammal.'
proof_nl: 'Rex isA Dog. Dog isA Mammal.'
```

Demonstrations must be:
- **Convincing**: Show the actual reasoning chain
- **Real**: Based on actual KB facts and inference steps
- **NL-friendly**: Human-readable, not internal format dumps

### 14.12.3 DSL Syntax Compliance

**ONLY use syntax defined in DS02-DSL-Syntax.md:**

| Allowed | Description |
|---------|-------------|
| `operator arg1 arg2` | Anonymous fact → KB |
| `@var operator arg1 arg2` | Named fact → scope only |
| `@var:name operator arg1 arg2` | Named + exported → scope + KB |
| `$var` | Variable reference |
| `?hole` | Query hole |
| `@Name graph p1 p2 ... end` | Graph definition |

**Do NOT invent new syntax** - all DSL must parse correctly with the existing parser.

### 14.12.4 Graph Usage Preference

**Favor graph syntax for realistic complexity:**

```javascript
// TRIVIAL - avoid
input_dsl: 'isA Dog Animal'

// REALISTIC - preferred
input_dsl: `
  @BuyTx:buy graph buyer item seller price
    @t1 _atrans $buyer $item $seller $buyer
    @t2 _atrans $buyer $price $buyer $seller
    @both __Bundle $t1 $t2
    return $both
  end
  @tx1 buy Alice Book Bob Fifty
`
```

Graphs represent real-world complex concepts that LLMs will translate to DSL.

### 14.12.5 Case Complexity Guidelines

**Do NOT simplify test cases.** Real-world instructions involve:
- Complex multi-step reasoning
- Deep transitive chains (5+ steps)
- Compound logical conditions
- Temporal and causal relationships

```javascript
// TOO SIMPLE - avoid
{ action: 'prove', input_dsl: '@goal isA Cat Animal' }

// REALISTIC - preferred
  {
  action: 'prove',
  input_nl: 'Is Rex a LivingThing? (Rex→Dog→Canine→Mammal→Vertebrate→Animal→LivingThing)',
  input_dsl: '@goal isA Rex LivingThing',
  expected_nl: 'True: Rex is a livingthing.',
  proof_nl: 'Rex isA Dog. Dog isA Canine. Canine isA Mammal. Mammal isA Vertebrate. Vertebrate isA Animal. Animal isA LivingThing.'
  }
```

### 14.12.6 Planning in Solve

When test cases require **planning** (e.g., goal-directed problem solving, CSP with ordering), consult before implementation to establish:

1. Whether planning algorithm needs to be added to reasoning engine
2. Which reasoning mode(s) should support planning (symbolic/holographic)
3. How planning results should be represented in NL

Planning use cases include:
- Multi-step goal achievement
- Constraint satisfaction with dependencies
- Action sequencing (e.g., river crossing puzzles)

### 14.12.7 Configuration Awareness

The suite runs against multiple configurations:
- **HDC Strategies**: dense-binary, sparse-polynomial, metric-affine
- **Reasoning Modes**: symbolicPriority, holographicPriority

Test cases should pass on ALL configurations. If a case fails on specific configurations, document why and whether it's expected.

### 14.12.8 Contradiction Handling

When spec vs code vs behavior disagree:
1. Document the contradiction in comments
2. Report to maintainer before making changes
3. Do NOT silently "fix" by changing expected values

---

*End of Chapter 14 - Evaluation Suite Framework*
