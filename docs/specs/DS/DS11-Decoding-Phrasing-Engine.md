# AGISystem2 - System Specifications

# Chapter 13: Decoding and Phrasing Engine

**Document Version:** 1.0  
**Status:** Draft Specification  
**Audience:** Developers, NLP Engineers  
**Focus:** Vector → Structure → Natural Language

---

## 13.1 Purpose: From Algebra to Explanation

The Reasoning Engine (Chapter 5) produces vector results which encode semantic content. However, vectors are not human-readable. The **Decoding and Phrasing Engine** transforms these vectors into coherent natural language, fulfilling the promise of transparent, explainable AI.

```
TRANSFORMATION PIPELINE:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  HDC Vector │ ──► │  Structural │ ──► │  Phrasing   │ ──► │  Natural    │
│  (Answer)   │     │  Decoding   │     │  Engine     │     │  Language   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     32K bits          JSON AST          Templates          "Alice sold
                                         + Slots            the car to Bob"
```

### 13.1.1 Stage Summary

| Stage | Input | Output | Mechanism |
|-------|-------|--------|-----------|
| 1. Query | DSL with holes | Answer vector | Reasoning (Ch.5) |
| 2. Decode | Answer vector | DecodedStructure (JSON) | Similarity search |
| 3. Phrase | DecodedStructure | Natural language string | Template filling |
| 4. Elaborate | Base string | Fluent narrative | LLM refinement (optional) |

---

## 13.2 Module Map

```
src/decoding/
├── structural-decoder.js   # Vector → JSON structure
├── phrasing-registry.js    # Template storage and lookup
├── template-parser.js      # Parse {Pos1:Role} slots
├── text-generator.js       # Slot filling, string assembly
├── elaborator.js           # LLM integration for fluent output
└── theories/
    └── Phrasing.sys2       # Core phrase templates
```

### 13.2.1 The Phrasing Engine's Critical Role in Order Resolution

> ### 🔑 THE SAVIOR COMPONENT: Phrasing Engine and Argument Order
>
> **Background:** Due to XOR commutativity (see DS01 §1.2.1 and DS05 §5.1), the algebraic binding operation produces vectors where argument order is NOT inherently preserved:
>
> ```
> (Pos1 ⊕ A) ⊕ (Pos2 ⊕ B) = (Pos2 ⊕ B) ⊕ (Pos1 ⊕ A)
> ```
>
> **The Problem:** Position vectors act as **unique tags** identifying WHAT occupies WHICH position, but they do NOT encode the sequence 1→2→3 algebraically.
>
> **The Solution:** The Phrasing Engine RE-IMPOSES logical order at presentation time through **role-annotated templates**.
>
> **How It Works:**
> 1. **Structural Decoder** extracts arguments and their position tags (Pos1, Pos2, etc.)
> 2. **Template Lookup** retrieves a template with explicit slot positions: `"{Pos1:Seller} sold {Pos3:Item} to {Pos2:Buyer}"`
> 3. **Text Generator** fills slots IN THE ORDER SPECIFIED BY THE TEMPLATE, not by algebraic order
>
> **Key Insight:** The output order is guaranteed by the **template definition**, NOT by the vector's internal structure.
>
> ```
> TEMPLATE: "{Pos1:Seller} sold {Pos3:Item} to {Pos2:Buyer}"
>
> INPUT (from decode):
>   arguments = [
>     { position: 1, value: "Alice" },
>     { position: 2, value: "Bob" },
>     { position: 3, value: "Book" }
>   ]
>
> OUTPUT: "Alice sold Book to Bob"
> (Order enforced by template, regardless of decoding order)
> ```
>
> **Why This Works:**
> - Position tags (`Pos1`, `Pos2`) are correctly extracted during decoding
> - The template explicitly maps positions to presentation slots
> - Semantic roles (`Seller`, `Buyer`, `Item`) document the intended meaning
> - The final string follows the template's structure, not the vector's algebra
>
> **This makes the Phrasing Engine the authoritative component for determining argument order in human-readable output.**

---

## 13.3 Structural Decoding

### 13.3.1 Purpose

Convert an HDC vector back into a human-interpretable structure.

```
INPUT:  Vector encoding "loves(John, Mary)"
OUTPUT: {
  operator: "loves",
  arguments: [
    { position: 1, value: "John", confidence: 0.85 },
    { position: 2, value: "Mary", confidence: 0.82 }
  ],
  confidence: 0.83
}
```

### 13.3.2 Decoding Algorithm

```
DECODE(vector):
  result = {
    operator: null,
    arguments: [],
    confidence: 0,
    raw: vector
  }
  
  # Step 1: Find operator (highest similarity to known operators)
  operatorCandidates = []
  FOR op IN vocabulary.operators:
    sim = similarity(vector, op.vector)
    IF sim > OPERATOR_THRESHOLD (0.5):
      operatorCandidates.push({ name: op.name, similarity: sim })
  
  IF operatorCandidates.empty:
    RETURN { success: false, reason: "No operator found" }
  
  operatorCandidates.sort(BY similarity DESC)
  result.operator = operatorCandidates[0].name
  opSim = operatorCandidates[0].similarity
  
  # Step 2: Unbind operator to get remainder
  opVector = vocabulary.get(result.operator)
  remainder = bind(vector, opVector)  # XOR removes operator
  
  # Step 3: Extract arguments at each position
  FOR pos = 1 TO MAX_POSITIONS:
    # Remove position marker
    posUnbound = bind(remainder, getPosition(pos))
    
    # Find best match in vocabulary
    argCandidates = topKSimilar(posUnbound, vocabulary, k=3)
    
    IF argCandidates[0].similarity > ARG_THRESHOLD (0.5):
      result.arguments.push({
        position: pos,
        value: argCandidates[0].name,
        confidence: argCandidates[0].similarity,
        alternatives: argCandidates.slice(1)
      })
  
  # Step 4: Calculate overall confidence
  IF result.arguments.length > 0:
    argConfidences = result.arguments.map(a => a.confidence)
    result.confidence = (opSim + average(argConfidences)) / 2
  ELSE:
    result.confidence = opSim
  
  RETURN { success: true, structure: result }
```

### 13.3.3 DecodedStructure Format

```
DecodedStructure:
├── operator: string              # Main verb/relation
├── operatorConfidence: number    # How sure we are
├── arguments: Argument[]         # Ordered arguments
├── confidence: number            # Overall confidence
├── type: string                  # "fact" | "rule" | "query"
├── nested: DecodedStructure[]    # For compound structures
└── raw: Vector                   # Original vector (for verification)

Argument:
├── position: number              # 1, 2, 3, ...
├── value: string                 # Decoded name
├── role: string?                 # Semantic role (if known)
├── confidence: number            # Match confidence
├── type: string?                 # __Person, __Object, etc.
└── alternatives: Alternative[]   # Other possible values
```

### 13.3.4 Handling Complex Structures

```
COMPOUND STRUCTURES:

Rule: Implies(And(A, B), C)
Decoded:
{
  operator: "Implies",
  arguments: [
    { position: 1, value: <nested>, nested: {
        operator: "And",
        arguments: [
          { position: 1, value: "A" },
          { position: 2, value: "B" }
        ]
      }
    },
    { position: 2, value: "C" }
  ]
}

DETECTION:
IF argument similarity to known atoms < ATOM_THRESHOLD
AND argument similarity to known operators > OPERATOR_THRESHOLD:
  # This argument is itself a compound structure
  recursively decode
```

---

## 13.4 Phrasing Registry

### 13.4.1 Purpose

Store grammatical templates for converting structures to natural language.

### 13.4.2 Template Storage

```
PHRASING REGISTRY:

templates: Map<string, TemplateSet>
├── "loves" → {
│     summary: "{Pos1} loves {Pos2}",
│     elaborate: "{Pos1:Subject} has romantic feelings for {Pos2:Object}",
│     question: "Who loves {Pos2}?" / "Who does {Pos1} love?"
│   }
├── "sells" → {
│     summary: "{Pos1} sold {Pos3} to {Pos2}",
│     elaborate: "{Pos1:Seller} completed a sale of {Pos3:Item} to {Pos2:Buyer}",
│     question: "What did {Pos1} sell to {Pos2}?"
│   }
└── ...

theoryTemplates: Map<string, Map<string, TemplateSet>>
├── "Commerce" → { "sells" → { ... commerce-specific templates } }
├── "Physics" → { "measure" → { ... physics-specific templates } }
└── ...
```

### 13.4.3 Template DSL

New DSL construct for registering phrase templates within theories:

```
SYNTAX:
@_ PhraseTemplate <operator> <templateType> <templateString>

TEMPLATE TYPES:
├── summary     # Concise, factual
├── elaborate   # Fluent, narrative
├── question    # Question form
├── negation    # Negative form
└── passive     # Passive voice

EXAMPLES:

# In Commerce theory
@_ PhraseTemplate sells summary "{Pos1} sold {Pos3} to {Pos2}"
@_ PhraseTemplate sells elaborate "{Pos1:Seller} transferred ownership of {Pos3:Item} to {Pos2:Buyer}"
@_ PhraseTemplate sells question "What did {Pos1} sell to {Pos2}?"
@_ PhraseTemplate sells passive "{Pos3} was sold by {Pos1} to {Pos2}"

# In Core theory
@_ PhraseTemplate hasProperty summary "{Pos1} has property {Pos2}"
@_ PhraseTemplate isA summary "{Pos1} is a {Pos2}"
@_ PhraseTemplate Implies summary "If {Pos1}, then {Pos2}"
```

### 13.4.4 Slot Syntax

```
SLOT FORMAT: {PosN:Role}

Components:
├── PosN: Position number (Pos1, Pos2, etc.)
└── Role: Optional semantic role hint (Agent, Patient, Theme, etc.)

EXAMPLES:
├── {Pos1}          # Just position 1
├── {Pos1:Agent}    # Position 1, labeled as Agent
├── {Pos2:Recipient}# Position 2, labeled as Recipient
└── {Pos3:Item}     # Position 3, labeled as Item

ROLE USAGE:
├── Improves readability of templates
├── Enables role-based question word selection
├── Documents argument semantics
└── Does NOT affect slot filling (position is primary)
```

---

## 13.5 Text Generator

### 13.5.1 Slot Filling Algorithm

```
GENERATE_TEXT(structure, templateType):
  # Step 1: Get template
  template = getTemplate(structure.operator, templateType)
  
  IF NOT template:
    # Fallback: Generate generic phrasing
    RETURN generateGenericPhrase(structure)
  
  # Step 2: Parse slots from template
  slots = parseSlots(template)  # [{pos: 1, role: "Agent"}, ...]
  
  # Step 3: Fill slots
  result = template
  FOR slot IN slots:
    value = findArgumentByPosition(structure, slot.pos)
    
    IF value:
      # Replace slot with value
      replacement = formatValue(value, slot.role)
      result = result.replace(slotPattern(slot), replacement)
    ELSE IF slot.isHole:
      # This was a query hole - use question word
      questionWord = selectQuestionWord(slot.role)
      result = result.replace(slotPattern(slot), questionWord)
    ELSE:
      # Missing argument - use placeholder
      result = result.replace(slotPattern(slot), "[unknown]")
  
  # Step 4: Post-process
  result = capitalizeFirst(result)
  result = fixArticles(result)  # a/an correction
  
  RETURN result

PARSE_SLOTS(template):
  # Extract all {PosN:Role} patterns
  pattern = /\{Pos(\d+)(?::(\w+))?\}/g
  slots = []
  
  FOR match IN template.matchAll(pattern):
    slots.push({
      full: match[0],
      pos: parseInt(match[1]),
      role: match[2] || null
    })
  
  RETURN slots
```

### 13.5.2 Question Word Selection

```
SELECT_QUESTION_WORD(role, type):
  # Based on semantic role or type, choose appropriate question word
  
  ROLE-BASED:
  ├── Agent, Subject → "who"
  ├── Patient, Object, Theme → "what"
  ├── Location, Place → "where"
  ├── Time, Temporal → "when"
  ├── Reason, Cause → "why"
  ├── Manner, Method → "how"
  ├── Recipient, Beneficiary → "to whom"
  └── Instrument → "with what"
  
  TYPE-BASED (fallback):
  ├── __Person → "who"
  ├── __Location → "where"
  ├── __Time → "when"
  ├── __Event → "what"
  └── DEFAULT → "what"
```

### 13.5.3 Generic Phrase Generation

```
GENERATE_GENERIC_PHRASE(structure):
  # When no template exists, create basic phrasing
  
  op = structure.operator
  args = structure.arguments.map(a => a.value)
  
  IF args.length == 0:
    RETURN op
  
  IF args.length == 1:
    RETURN args[0] + " " + op
  
  IF args.length == 2:
    RETURN args[0] + " " + op + " " + args[1]
  
  IF args.length == 3:
    # Assume: subject verb object indirect-object
    RETURN args[0] + " " + op + " " + args[2] + " to " + args[1]
  
  # Fallback: list all
  RETURN op + "(" + args.join(", ") + ")"
```

---

## 13.6 API Methods: summarize() and elaborate()

### 13.6.1 summarize(vector)

Produces concise, accurate, verifiable output.

```
SUMMARIZE(vector):
  # Step 1: Decode vector to structure
  decoded = decode(vector)
  IF NOT decoded.success:
    RETURN { success: false, error: decoded.reason }
  
  # Step 2: Generate text using summary template
  text = generateText(decoded.structure, "summary")
  
  RETURN {
    success: true,
    text: text,
    confidence: decoded.structure.confidence,
    structure: decoded.structure  # For verification
  }
```

### 13.6.2 elaborate(vector)

Produces fluent, narrative output with optional LLM refinement.

```
ELABORATE(vector, options = {}):
  # Step 1: Decode vector to structure
  decoded = decode(vector)
  IF NOT decoded.success:
    RETURN { success: false, error: decoded.reason }
  
  # Step 2: Generate base text using elaborate template
  baseText = generateText(decoded.structure, "elaborate")
  
  # Step 3: Optionally refine with LLM
  IF options.useLLM AND llmAvailable():
    refinedText = llmRefine(baseText, decoded.structure)
    RETURN {
      success: true,
      text: refinedText,
      baseText: baseText,  # Original for comparison
      confidence: decoded.structure.confidence,
      llmRefined: true
    }
  
  RETURN {
    success: true,
    text: baseText,
    confidence: decoded.structure.confidence,
    llmRefined: false
  }
```

---

## 13.7 LLM Integration (L3 Glue Layer)

### 13.7.1 Purpose

Improve linguistic fluency without altering factual content.

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Refinement                           │
│                                                             │
│   Base Text (from template):                                │
│   "Alice transferred ownership of car to Bob"               │
│                          │                                  │
│                          ▼                                  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  LLM Prompt:                                         │  │
│   │  "Rewrite into fluent English. Do NOT change        │  │
│   │   facts, names, or relationships:                    │  │
│   │   [Base Text]"                                       │  │
│   └─────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│   Refined Text:                                            │
│   "Alice completed the sale, transferring the car to Bob." │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 13.7.2 Refinement Algorithm

```
LLM_REFINE(baseText, structure):
  # Extract entities that MUST be preserved
  requiredEntities = [structure.operator]
  FOR arg IN structure.arguments:
    requiredEntities.push(arg.value)
  
  # Build prompt
  prompt = buildRefinementPrompt(baseText, requiredEntities)
  
  # Call LLM
  refinedText = llm.complete(prompt)
  
  # Validate: All entities must still be present
  FOR entity IN requiredEntities:
    IF entity NOT IN refinedText (case-insensitive):
      # LLM dropped an entity - reject refinement
      LOG_WARNING("LLM dropped entity: " + entity)
      RETURN baseText  # Fall back to original
  
  RETURN refinedText

BUILD_REFINEMENT_PROMPT(baseText, entities):
  RETURN """
  Rewrite the following statement into fluent, natural English.
  
  CRITICAL RULES:
  - Do NOT add, remove, or change any facts
  - Do NOT change any names or entities
  - Do NOT add information not present in the original
  - MUST include all of these: """ + entities.join(", ") + """
  
  Original: """ + baseText + """
  
  Rewritten:
  """
```

### 13.7.3 Trust Constraint

```
THE TRUST CONSTRAINT:

The LLM's role is STRICTLY STYLISTIC:
├── ✓ May: Improve grammar and flow
├── ✓ May: Add articles, conjunctions, prepositions
├── ✓ May: Reorder for better readability
├── ✗ Must NOT: Add new facts
├── ✗ Must NOT: Remove any entities
├── ✗ Must NOT: Change relationships
├── ✗ Must NOT: Introduce speculation or inference

VALIDATION:
├── All original entities must appear in output
├── No new proper nouns should appear
├── Sentence count should be similar (±1)
└── If validation fails → use base text
```

---

## 13.8 Theory Context and Resolution

### 13.8.1 Template Resolution Order

```
TEMPLATE RESOLUTION (follows Theory stacking):

Session has theories: [Core, Commerce, LocalStore]
Query about "sells" operator

Resolution order:
1. LocalStore::sells template   ← Check first (most specific)
2. Commerce::sells template     ← Check second
3. Core::sells template         ← Check third
4. Generic fallback             ← If no template found

RULE: Most-recently-loaded theory wins
```

### 13.8.2 Namespaced Templates

```
EXPLICIT NAMESPACE:

# Different domains may phrase same operator differently

@Physics theory
  @_ PhraseTemplate measure summary "{Pos1:Instrument} measured {Pos2:Quantity} as {Pos3:Value}"

@Cooking theory
  @_ PhraseTemplate measure summary "Measure {Pos3:Amount} of {Pos2:Ingredient} using {Pos1:Tool}"

USAGE:
# In Physics context
"thermometer measured temperature as 25°C"

# In Cooking context  
"Measure 2 cups of flour using measuring cup"
```

---

## 13.9 Phrasing Theory (Core Templates)

```
@Phrasing theory 32768 deterministic

    # ============ TEMPLATE STORAGE TYPE ============
    
    @PhraseTemplate:PhraseTemplate __Relation
    @TemplateType:TemplateType __Category
    @SummaryTemplate:summary __TemplateType
    @ElaborateTemplate:elaborate __TemplateType
    @QuestionTemplate:question __TemplateType
    
    # ============ CORE TEMPLATES ============
    
    # Identity and typing
    @_ PhraseTemplate isA summary "{Pos1} is a {Pos2}"
    @_ PhraseTemplate isA elaborate "{Pos1:Subject} is classified as a {Pos2:Type}"
    
    @_ PhraseTemplate hasProperty summary "{Pos1} has property {Pos2}"
    @_ PhraseTemplate hasProperty elaborate "{Pos1:Subject} possesses the property of being {Pos2:Property}"
    
    @_ PhraseTemplate hasState summary "{Pos1} is {Pos2}"
    @_ PhraseTemplate hasState elaborate "{Pos1:Subject} is currently in the state of {Pos2:State}"
    
    # Logical connectives
    @_ PhraseTemplate Implies summary "If {Pos1}, then {Pos2}"
    @_ PhraseTemplate Implies elaborate "When {Pos1:Condition} holds, it follows that {Pos2:Consequence}"
    
    @_ PhraseTemplate And summary "{Pos1} and {Pos2}"
    @_ PhraseTemplate Or summary "{Pos1} or {Pos2}"
    @_ PhraseTemplate Not summary "not {Pos1}"
    
    # Temporal
    @_ PhraseTemplate Before summary "{Pos1} happened before {Pos2}"
    @_ PhraseTemplate After summary "{Pos1} happened after {Pos2}"
    @_ PhraseTemplate During summary "{Pos1} occurred during {Pos2}"
    @_ PhraseTemplate Causes summary "{Pos1} causes {Pos2}"
    
    # Roles (for event descriptions)
    @_ PhraseTemplate Agent summary "{Pos2} is the agent of {Pos1}"
    @_ PhraseTemplate Theme summary "{Pos2} is affected by {Pos1}"
    @_ PhraseTemplate Goal summary "{Pos2} is the goal of {Pos1}"

end
```

---

## 13.10 Complete Example

### 13.10.1 Input

```
# Facts in KB
@f1 sells Alice Book Bob
@f2 sells Carol Computer David

# Query
@q sells ?who Book Bob
```

### 13.10.2 Processing Pipeline

```
STEP 1: Query Execution
├── Result vector: sells ⊕ (Pos1 ⊕ Alice) ⊕ (Pos2 ⊕ Bob) ⊕ (Pos3 ⊕ Book)
└── Confidence: 0.78

STEP 2: Structural Decoding
├── Operator: "sells" (confidence: 0.82)
├── Arguments:
│   ├── Pos1: "Alice" (confidence: 0.85)
│   ├── Pos2: "Bob" (confidence: 0.79)
│   └── Pos3: "Book" (confidence: 0.81)
└── Overall confidence: 0.82

STEP 3: Template Lookup
├── Operator: "sells"
├── Template type: "summary"
└── Template: "{Pos1} sold {Pos3} to {Pos2}"

STEP 4: Slot Filling
├── {Pos1} → "Alice"
├── {Pos3} → "Book"
├── {Pos2} → "Bob"
└── Result: "Alice sold Book to Bob"

STEP 5: Post-processing
└── Final: "Alice sold Book to Bob."
```

### 13.10.3 Output

```
summarize(queryResult):
{
  success: true,
  text: "Alice sold Book to Bob.",
  confidence: 0.82,
  structure: { ... }
}

elaborate(queryResult, { useLLM: true }):
{
  success: true,
  text: "Alice completed the sale of a book to Bob.",
  baseText: "Alice transferred ownership of Book to Bob.",
  confidence: 0.82,
  llmRefined: true
}
```

---

## 13.11 Limitations

### 13.11.1 Decoding Limitations

```
DECODING CHALLENGES:

1. Ambiguous vectors
   ├── Low confidence on operator
   ├── Multiple close alternatives
   └── Mitigation: Return alternatives, let user disambiguate

2. Unknown operators
   ├── Operator not in vocabulary
   └── Mitigation: Generic fallback phrasing

3. Noise in bundled KBs
   ├── Large KB → noisy decoding
   └── Mitigation: Confidence thresholds, verification

4. Nested structures
   ├── Deep nesting hard to decode
   └── Mitigation: Depth limit (MAX_NESTING = 3)
```

### 13.11.2 Phrasing Limitations

```
PHRASING CHALLENGES:

1. Missing templates
   ├── No template for operator
   └── Mitigation: Generic phrase generation

2. Complex argument types
   ├── Arguments that are themselves structures
   └── Mitigation: Recursive phrasing, but may be verbose

3. Grammatical edge cases
   ├── Irregular verbs, plurals, etc.
   └── Mitigation: Exception tables, LLM refinement

4. Multi-language support
   ├── Currently English-only
   └── Future: Language-specific template sets
```

### 13.11.3 LLM Limitations

```
LLM CHALLENGES:

1. Entity dropping
   ├── LLM may omit entities
   └── Mitigation: Validation check, fallback to base

2. Hallucination
   ├── LLM may add facts
   └── Mitigation: Entity count validation

3. Latency
   ├── LLM calls are slow (~500ms-2s)
   └── Mitigation: Optional, async, caching

4. Availability
   ├── LLM may be unavailable
   └── Mitigation: Graceful fallback to template output
```

---

## 13.12 Summary

| Component | Input | Output | Purpose |
|-----------|-------|--------|---------|
| Structural Decoder | Vector | JSON structure | Extract operator + arguments |
| Phrasing Registry | - | Templates | Store grammatical patterns |
| Text Generator | Structure + Template | String | Fill slots, assemble text |
| LLM Refinement | Base string | Fluent string | Improve readability |

**Key Design Decisions:**
1. Two-phase: Decode structure first, then phrase
2. Template-based phrasing for accuracy and verifiability
3. LLM is optional stylistic layer, not semantic
4. Theory-scoped templates for domain-specific language
5. Confidence scores throughout pipeline

**API:**
- `summarize(vector)` → Concise, accurate text (template only)
- `elaborate(vector)` → Fluent narrative (template + optional LLM)

**Trust Guarantee:**
The output text faithfully represents the decoded vector. The LLM may only improve style, never content.

---

*End of Chapter 13 - Decoding and Phrasing Engine*
