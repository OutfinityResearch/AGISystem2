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
evalSuite/
├── run.js                           # Main runner script
├── lib/
│   ├── runner.mjs                   # Suite execution engine
│   ├── reporter.mjs                 # Terminal reporter with colors
│   └── loader.mjs                   # Suite/case loader
│
├── suite01_basic_facts/
│   └── cases.mjs                    # Conversation steps
│
├── suite02_family_relations/
│   └── cases.mjs
│
├── suite03_rule_reasoning/
│   └── cases.mjs
│
├── suite04_taxonomies/
│   └── cases.mjs
│
├── suite05_negation_logic/
│   └── cases.mjs
│
└── suite06_contradictions/
    └── cases.mjs                    # Contradiction detection tests
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
| `action` | string | Yes | `learn`, `query`, `prove`, `explain` |
| `input_nl` | string | Yes | Natural language input (fact to learn, question to ask) |
| `input_dsl` | string | Yes | Equivalent DSL (reference for all actions) |
| `expected_nl` | string (learn/prove), string[] (query) | Yes | Expected natural language response |
| `proof_nl` | string (prove), string[] (query) | Conditional | Required for `query` and `prove`; omit for `learn` |

**Note**: Step ordering is determined by array index - no explicit `step` field needed.

**Proof Requirements**:
- `expected_nl` MUST contain only the answer text (no "Proof:" or "Search:" sections).
- For `prove`, `proof_nl` MUST describe the full reasoning chain or failure trace.
- For `query`, `proof_nl` MUST be an array with one entry per answer, each entry containing the full reasoning chain that yields that answer (including all transitive links and rule applications).
- For `query`, the number of answers in `expected_nl` MUST match the length of `proof_nl`.
- For `query`, `expected_nl` MUST be an array with one answer per entry.

**Validation**: Both `expected_nl` and `proof_nl` are checked. `expected_nl` validates answers; `proof_nl` validates reasoning chains.

### 14.4.3 Action Types

| Action | Description | Session Method | Input Fields | Output |
|--------|-------------|----------------|--------------|--------|
| `learn` | Add facts/rules to KB | `session.learn()` | `input_nl`, `input_dsl` | facts count, warnings, or REJECTION |
| `query` | Query KB with holes | `session.query()` | `input_nl`, `input_dsl` | bindings, confidence |
| `prove` | Prove a goal (no holes!) | `session.prove()` | `input_nl`, `input_dsl` | valid, proof steps |
| `explain` | Explain a result | `session.explain()` | `input_nl`, `input_dsl` | detailed explanation |

**Note on prove vs query:**
- `query` uses hole patterns (e.g., `@q isA Rex ?what`) to extract unknown values
- `prove` uses complete facts (e.g., `@goal isA Rex Dog`) to verify truth - no holes allowed

---

## 14.5 Contradiction Detection and Rejection

The system maintains logical consistency by detecting and rejecting contradictory facts.

### 14.5.1 How Contradictions Work

When a `learn` action encounters a fact that contradicts existing knowledge, it **REJECTS** the new fact and returns an explanation:

```javascript
// Previously learned: "whale is NOT a fish"
{
  action: 'learn',
  input_nl: 'A whale is a mammal. A whale is not a fish.',
  input_dsl: `
    @w1 isA Whale Mammal
    @negw isA Whale Fish
    @w2 Not $negw
  `,
  expected_nl: 'Learned 1 positive and 1 negative classification fact'
},

// Now trying to learn: "whale is a fish" → REJECTION
{
  action: 'learn',
  input_nl: 'A whale is a fish.',
  input_dsl: '@contra isA Whale Fish',
  expected_nl: 'REJECTED: Cannot learn "whale is a fish" because it contradicts existing knowledge that "whale is NOT a fish"'
}
```

### 14.5.2 Types of Contradictions

| Type | Description | Example |
|------|-------------|---------|
| **Direct negation** | Fact directly contradicts explicit Not | `Not (isA Whale Fish)` + trying to learn `isA Whale Fish` |
| **Category exclusion** | Entity is X and X≠Y | Cat is not Dog + Fluffy is Cat → cannot be Dog |
| **Property conflict** | Mutually exclusive states | Door is closed + Door is NOT open → cannot be open |

### 14.5.3 Rejection Response Format

```javascript
{
  success: false,
  rejected: true,
  contradiction: {
    attempted: 'isA Whale Fish',
    existing: 'Not (isA Whale Fish)',
    reason: 'Direct negation'
  },
  nl_response: 'REJECTED: Cannot learn "whale is a fish" because it contradicts existing knowledge that "whale is NOT a fish"'
}
```

### 14.5.4 Example Suite: Contradiction Detection

See `suite06_contradictions/cases.mjs` for comprehensive examples including:
- Direct negation contradictions
- State contradictions (alive/dead, open/closed)
- Location contradictions
- Relationship contradictions
- Category exclusion (cats are not dogs)

---

## 14.6 Expected Output Format

### 14.5.1 Learn Response

```javascript
{
  success: true,
  facts: 3,
  rules: 1,
  warnings: [],
  nl_response: 'Learned 3 facts and 1 rule'
}
```

### 14.5.2 Query Response

```javascript
{
  success: true,
  bindings: {
    what: { answer: 'Dog', confidence: 0.87, alternatives: ['Mammal'] }
  },
  nl_response: 'Rex is a dog'
}
```

### 14.5.3 Prove Response

```javascript
{
  valid: true,
  confidence: 0.92,
  proof_steps: [
    { fact: 'isA Rex Dog', source: 'KB' },
    { fact: 'isA Dog Mammal', source: 'KB' },
    { rule: 'Implies (isA ?x Dog) (isA ?x Mammal)', applied: true },
    { conclusion: 'isA Rex Mammal', derived: true }
  ],
  nl_response: 'Yes. Rex is a dog. Dogs are mammals. Therefore Rex is a mammal.'
}
```

### 14.5.4 Explain Response

```javascript
{
  success: true,
  explanation: {
    goal: 'isA Rex Mammal',
    reasoning: [
      'Starting from the goal: Rex is a Mammal',
      'Found fact: Rex is a Dog (direct KB match)',
      'Found fact: Dog is a Mammal (direct KB match)',
      'Applied transitivity: if Rex is Dog and Dog is Mammal, then Rex is Mammal',
      'Conclusion: Rex is indeed a Mammal with confidence 0.92'
    ]
  },
  nl_response: 'Rex is a mammal because Rex is a dog, and dogs are mammals.'
}
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
    case 'explain':
      return await executeExplain(step, session);
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

  // Generate NL response
  const nl_response = generateLearnResponse(learnResult);

  return {
    step: step.step,
    action: 'learn',
    nl_transform: nl_transform_success ? 'PASS' : 'SKIP',
    reasoning: learnResult.success ? 'PASS' : 'FAIL',
    nl_output: matchesExpected(nl_response, step.expected_nl) ? 'PASS' : 'FAIL',
    actual_nl: nl_response
  };
}
```

---

## 14.7 Example Suite: Animal Taxonomy

Complete example of a conversation about animal classification:

```javascript
// suite01_animal_taxonomy/cases.mjs

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

  // Explain reasoning
  {
    action: 'explain',
    input_nl: 'Explain why Rex is an animal',
    input_dsl: '@goal isA Rex Animal',
    expected_nl: 'Rex is an animal because: Rex is a dog (direct fact), dogs are mammals (taxonomy), and mammals are animals (taxonomy). This forms a chain: Rex → Dog → Mammal → Animal.'
  }
];

export default { name, description, theories, steps };
```

---

## 14.8 Terminal Output

```
═══════════════════════════════════════════════════════════════════
                    AGISystem2 Evaluation Suite
═══════════════════════════════════════════════════════════════════

▶ Animal Taxonomy (10 steps)
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
   10   explain  ○ SKIP    ✓ PASS     ✗ FAIL     Explain Rex is animal

  Summary: 7/10 passed (70%)
  ├── NL→DSL:    3/3  (100%)
  ├── Reasoning: 10/10 (100%)
  └── NL Output: 7/10 (70%)

═══════════════════════════════════════════════════════════════════
                         FINAL SUMMARY
═══════════════════════════════════════════════════════════════════

Suite                         NL→DSL   Reason   Output   Overall
─────────────────────────────────────────────────────────────────
Animal Taxonomy               100%     100%     70%      ████████░░ 80%
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
- **explain**: `success === true`

### 14.9.3 NL Output Phase

Fuzzy comparison between actual output and `expected_nl` (plus proof checks when `proof_nl` is present):
- Ignore case
- Ignore punctuation variations
- Allow partial matches for long explanations
- Key concepts must be present

---

## 14.10 Adding New Suites

1. Create directory: `evalSuite/suiteNN_name/`
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
| **URS-18** | Elaborate/Explain | explain action |

---

## 14.12 Permanent Guidelines for Suite Development

These guidelines are **permanent** and must be followed when working with the evaluation suite.

### 14.12.1 Code Separation Principle

**CRITICAL**: All NL translation code must be in the `session` module, NOT in the evaluation suite runner.

```
CORRECT:
  evalSuite/lib/runner.mjs → calls session.generateNL(result)
  src/runtime/session.mjs   → implements NL translation from internal representations

WRONG:
  evalSuite/lib/runner.mjs → contains NL translation logic directly
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
