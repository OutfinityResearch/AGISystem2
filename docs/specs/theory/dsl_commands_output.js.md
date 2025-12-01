# Design Spec: src/theory/dsl_commands_output.js

ID: DS(/theory/dsl_commands_output.js)

Class `DSLCommandsOutput`
- **Role**: Implements Sys2DSL commands for result formatting and output: natural language conversion, JSON serialization, explanations, template formatting, and summarization.
- **Pattern**: Command handler collection; Stateless output transformers.
- **Key Collaborators**: `DSLParser`.

## Constructor Dependencies
```javascript
constructor({ parser })
```

## Commands Implemented

### TO_NATURAL
```sys2dsl
@text TO_NATURAL $result
```
Converts result to natural language.

**Handles:**
- Truth values → "Yes, this is definitely true." / "No, this is false." / etc.
- Proven results → "Yes, this can be proven via [method]."
- Hypotheses → List of suggestions with basis
- Analogies → "Analogy: A : B :: C : D"
- Consistency checks → "The knowledge base is consistent." / "Inconsistencies found: N"
- Explanations → Pass through explanation text

Returns: `{ text: string }`

**Truth Value Mappings:**
| Truth | Natural Language |
|-------|------------------|
| TRUE_CERTAIN | "Yes, this is definitely true." |
| FALSE | "No, this is false." |
| PLAUSIBLE | "This might be true, but I'm not certain." |
| CONFLICT | "There is a conflict in the available information." |

### TO_JSON
```sys2dsl
@json TO_JSON $result
@json TO_JSON $result pretty
```
Converts result to JSON string.
- `pretty` option adds indentation (2 spaces)
- Returns: `{ json: string }`

### EXPLAIN
```sys2dsl
@explanation EXPLAIN $result
```
Generates detailed explanation for a result.

**Handles:**
- Proof results (proven/not proven, method, chain)
- Validation issues (type, subject, location)
- Contradictions (type, details)
- Analogies (formula, confidence)
- Hypotheses (list with confidence)
- Forward chaining results (derived count)
- Proof steps (fact chain with justifications)

Returns: `{ explanation: string, result }`

### FORMAT
```sys2dsl
@text FORMAT "The answer for $subject is: $result"
```
Formats a template with variable substitution.
- Expands `$varName` references
- Returns: `{ text: string }`

### SUMMARIZE
```sys2dsl
@summary SUMMARIZE $factList
@summary SUMMARIZE $factList maxItems=10
```
Creates a summary of facts/results.

**Options:**
- `maxItems=N` - Maximum items to show (default: 5)

**Handles:**
- Arrays of facts → "Subject RELATION Object" per line
- Other arrays → JSON stringify each item
- Single values → JSON stringify

Returns:
```javascript
{
  summary: string,   // Formatted text
  total: number,     // Total items
  shown: number,     // Items in summary
  truncated: boolean // Whether output was truncated
}
```

## Usage Examples

### Human-Readable Output
```sys2dsl
@result ASK "Is Dog a mammal?"
@answer TO_NATURAL $result
# → { text: "Yes, this is definitely true." }
```

### JSON Export
```sys2dsl
@facts FACTS_MATCHING ? IS_A Animal
@json TO_JSON $facts pretty
# → { json: "[\n  {...},\n  {...}\n]" }
```

### Detailed Explanation
```sys2dsl
@proof PROVE Dog IS_A Animal proof=true
@explanation EXPLAIN $proof
# → {
#   explanation: "Attempted to prove statement using transitive method.\n
#                 Found transitive chain: Dog → mammal → Animal\n
#                 Proof succeeded.\n\nMethod: transitive\nConfidence: 90.3%",
#   result: {...}
# }
```

### Template Formatting
```sys2dsl
@subject LITERAL Dog
@type LITERAL mammal
@message FORMAT "The concept $subject belongs to category $type."
# → { text: "The concept Dog belongs to category mammal." }
```

### Fact Summary
```sys2dsl
@allFacts FACTS_MATCHING ? ? ?
@summary SUMMARIZE $allFacts maxItems=5
# → {
#   summary: "Dog IS_A mammal\nCat IS_A mammal\n...",
#   total: 150,
#   shown: 5,
#   truncated: true
# }
```

## Explanation Output Format

### For Proof Results
```
Attempted to prove statement using [method] method.
Found transitive chain: A → B → C (if applicable)
Proof succeeded/failed.

Method: [method]
Confidence: [N]%
```

### For Validation Issues
```
Validation found N issue(s).
- DISJOINT_VIOLATION: Entity at Location
- TAXONOMIC_CYCLE: ...
```

### For Contradictions
```
Found N contradiction(s):
- DISJOINT_VIOLATION: Entity (relation details)
- FUNCTIONAL_VIOLATION: ...
```

### For Hypotheses
```
Generated N hypothesis(es):
- Subject RELATION Object (confidence: N%)
- ...
```

## Notes/Constraints
- TO_NATURAL handles common result types; falls back to JSON for unknown types
- EXPLAIN provides more detail than TO_NATURAL
- FORMAT uses same variable expansion as other DSL commands
- SUMMARIZE truncates long lists to avoid overwhelming output
- All output commands are non-mutating - they only transform results
