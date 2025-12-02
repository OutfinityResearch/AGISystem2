# Design Spec: Ontology Introspection Commands

ID: DS(/theory/dsl_commands_ontology.js)

Status: DRAFT v1.0

## Overview

This module provides DSL commands for ontology introspection, enabling LLM-assisted ontology discovery by:
- Explaining what the system knows about concepts
- Identifying undefined concepts in proposed statements
- Providing type suggestions and questions to help populate the knowledge base

Implements **FS-15** (Ontology Discovery Commands).

## Dependencies

```javascript
// Direct dependencies
const conceptStore;       // FS-01: Concept storage for fact retrieval
const parser;             // DS(/theory/dsl_parser): Variable resolution
const dimRegistry;        // DS(/core/dimension_registry): Semantic axis info
```

## Class: DSLCommandsOntology

### Constructor

```javascript
constructor({ conceptStore, parser, dimRegistry })
```

| Parameter | Type | Description |
|-----------|------|-------------|
| conceptStore | Object | Concept store with `getFacts()` method |
| parser | DSLParser | Parser for variable expansion |
| dimRegistry | DimensionRegistry | Registry for semantic dimension info |

### Public Methods

#### cmdExplainConcept(argTokens, env) → Object

Explains what the system knows about a concept.

**Flow:**
1. Expand variables in argument using `parser.expandString()`
2. Normalize concept name (lowercase, alphanumeric)
3. Iterate all facts from conceptStore
4. Categorize facts where concept appears as subject or object
5. Extract IS_A types, properties (HAS/HAS_PROPERTY), other relations
6. Generate natural language summary

**Invariants:**
- Always returns valid structure even for unknown concepts
- `exists` field accurately reflects presence in any fact

**Example Response:**
```javascript
{
  concept: "Dog",
  normalized: "dog",
  exists: true,
  isUpperCase: true,
  asSubject: [{ subject: "Dog", relation: "IS_A", object: "Mammal" }],
  asObject: [{ subject: "Fido", relation: "IS_A", object: "Dog" }],
  types: ["Mammal", "Animal"],
  properties: [{ property: "four_legs", relation: "HAS_PROPERTY" }],
  relations: [{ relation: "CAUSES", target: "Barking" }],
  summary: "\"Dog\" is a Mammal and Animal; has properties: four_legs; appears in 5 fact(s)."
}
```

---

#### cmdMissing(argTokens, env) → Object

Analyzes text for undefined concepts.

**Flow:**
1. Expand variables in argument string
2. Extract potential concepts using:
   - Capitalized word pattern: `/\b([A-Z][a-zA-Z0-9_]*)\b/g`
   - Triple pattern extraction: subject RELATION object
3. Build set of known concepts from all facts
4. Filter out known relations (IS_A, CAUSES, etc.)
5. Classify each potential concept as defined or missing
6. Generate type suggestions using word morphology heuristics
7. Generate suggested questions for undefined concepts

**Concept Extraction Heuristics:**

| Pattern | Type Suggestion |
|---------|-----------------|
| Ends in -er/-or | Agent or Role |
| Ends in -tion/-ment/-ing | Process or Action |
| Ends in -ity/-ness | Property or Quality |
| Ends in -ism/-logy | Concept or Field |
| PascalCase | Entity or Instance |
| ALL_CAPS | Category or Type |

**Example Response:**
```javascript
{
  input: "Doctor TREATS Patient USING Medicine...",
  totalConcepts: 3,
  missingCount: 3,
  definedCount: 0,
  missing: [
    {
      name: "Doctor",
      context: "Doctor TREATS Patient",
      suggestedType: "Agent or Role (person/entity that performs action)",
      suggestedQuestions: [
        "What is Doctor? (IS_A relationship)",
        "What properties does Doctor have?",
        "What does Doctor relate to?",
        "Are there any constraints about Doctor?"
      ]
    }
  ],
  defined: [],
  suggestions: "Found 3 undefined concept(s)..."
}
```

---

#### cmdWhatIs(argTokens, env) → Object

Simple identity query returning natural language description.

**Flow:**
1. Expand and normalize concept name
2. Find IS_A and HAS/HAS_PROPERTY facts for concept
3. Construct natural language sentence

**Example Response:**
```javascript
{
  concept: "Dog",
  known: true,
  types: ["Mammal", "Animal"],
  properties: ["four_legs", "fur"],
  description: "\"Dog\" is a Mammal, Animal with four_legs, fur."
}
```

### Private Methods

#### _getFacts() → Array

Returns all facts from conceptStore, or empty array if unavailable.

#### _normalizeName(name) → String

Normalizes concept name for comparison:
- Lowercase conversion
- Replace non-alphanumeric with underscore

#### _extractConcepts(input) → Array

Extracts potential concept names from input text using regex patterns.

#### _getContext(text, index) → String

Extracts surrounding context (±20-30 chars) for a matched concept.

#### _countFacts(conceptNorm, facts) → Number

Counts facts involving the normalized concept.

#### _suggestType(conceptName) → String

Suggests likely concept type based on word morphology.

#### _suggestQuestions(conceptName) → Array

Generates questions to help define a concept.

#### _generateSummary(result) → String

Generates natural language summary from EXPLAIN_CONCEPT result.

#### _generateMissingSuggestions(missing) → String

Generates formatted suggestions for MISSING command output.

## Integration

### In DSL Engine

```javascript
// dsl_engine.js
case 'EXPLAIN_CONCEPT':
  return this.ontologyCommands.cmdExplainConcept(argTokens, env);
case 'MISSING':
  return this.ontologyCommands.cmdMissing(argTokens, env);
case 'WHAT_IS':
  return this.ontologyCommands.cmdWhatIs(argTokens, env);
```

### LLM Integration Pattern

These commands support a two-phase approach for LLM-driven ontology population:

```
Phase 1: Gap Analysis
  User asks: "Can a Doctor treat a Patient?"
  LLM runs: @gaps MISSING "Doctor TREATS Patient"
  Result: Doctor, Patient, TREATS are undefined

Phase 2: Ontology Population
  LLM generates:
    add Doctor IS_A Profession
    add Doctor HAS_PROPERTY medical_license
    add Patient IS_A Person
    add TREATS IS_A Relation

Phase 3: Query Execution
  LLM runs: @answer Doctor CAN_TREAT Patient
```

## Test Coverage

| Test | Description |
|------|-------------|
| explain_known_concept | EXPLAIN_CONCEPT returns correct facts for known concept |
| explain_unknown_concept | EXPLAIN_CONCEPT returns exists=false for unknown |
| missing_all_undefined | MISSING identifies all new concepts |
| missing_partial | MISSING correctly separates defined from undefined |
| missing_skips_relations | MISSING doesn't flag IS_A, CAUSES, etc. |
| whatis_known | WHAT_IS returns description for known concept |
| whatis_unknown | WHAT_IS returns "don't have information" message |
| type_suggestions | Type suggestions match morphology patterns |

## Performance Considerations

- **_getFacts()** is called per command; for large knowledge bases, consider caching
- **_extractConcepts()** uses multiple regex passes; O(n) where n = input length
- Normalization is O(1) per concept

## Future Enhancements

1. **DEFINE_MISSING**: Interactively define missing concepts
2. **SUGGEST_FACTS**: Suggest facts to add based on context
3. **SIMILAR_CONCEPTS**: Find concepts similar to a given one
4. **ONTOLOGY_GAPS**: Analyze entire theory for coverage gaps

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-28 | Initial specification |
