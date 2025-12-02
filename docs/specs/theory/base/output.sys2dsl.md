# Specification: Base Output Theory

ID: DS(/theory/base/output.sys2dsl)

Source: `@data/init/theories/base/output.sys2dsl`

Status: v3.0

## Purpose

Defines **output formatting and export operations** as verbs. These transform internal point representations into human-readable or machine-parseable formats.

## Design Rationale

### Points Need Presentation

Internal representation is geometric:
```json
{
  "id": "Dog_v3",
  "center": [127, 45, 89, ...],
  "diamond": {"radii": [5, 10, 3, ...]},
  "kind": "fact"
}
```

Users need:
- Natural language: "Dog is definitely an animal"
- JSON: `{"subject": "Dog", "relation": "IS_A", "object": "animal", "truth": "TRUE_CERTAIN"}`
- Proofs: Step-by-step reasoning chains

### Format as Dimension

Output format is stored as a dimension:
```sys2dsl
@result subject PROJECT_DIM format json
```

This allows format to propagate through operations.

## Output Operations

### Category 1: Natural Language

#### TO_NATURAL - Convert to natural language

```sys2dsl
@TO_NATURAL BEGIN
  @info subject INSPECT any;
  @kind $info READ_DIM kind;
  @label $info READ_DIM label;
  @return $info PROJECT_DIM natural_text $label;
END
```

**Semantics**: Generate human-readable text from point.

**Examples**:
```sys2dsl
@text Dog_is_animal TO_NATURAL any
# Returns: "Dog is an animal (certain)"

@text Query_result TO_NATURAL any
# Returns: "The query returned TRUE with high confidence"
```

#### EXPLAIN - Generate explanation

```sys2dsl
@EXPLAIN BEGIN
  @info subject INSPECT any;
  @proof $info READ_DIM proof_trace;
  @natural $proof TO_NATURAL any;
  @return $natural PROJECT_DIM explanation positive;
END
```

**Semantics**: Convert proof trace to explanation text.

**Example**:
```
"Socrates is mortal because:
 1. Socrates is a human (asserted)
 2. All humans are mortal (rule)
 3. Therefore, Socrates is mortal (conclusion)"
```

#### DESCRIBE - Describe a concept

```sys2dsl
@DESCRIBE BEGIN
  @parents subject IS_A any;
  @children any IS_A subject;
  @properties subject HAS any;
  @desc $parents NEW_COMPOSITE $children;
  @full $desc NEW_COMPOSITE $properties;
  @return $full TO_NATURAL any;
END
```

**Output**:
```
"Dog:
  - Is a: mammal, pet, animal
  - Has: fur, four legs, tail
  - Examples: Fido, Rex, Grivei"
```

#### SUMMARIZE - Summarize fact list

```sys2dsl
@SUMMARIZE BEGIN
  @count subject COUNT any;
  @first subject FIRST any;
  @last subject LAST any;
  @summary $first NEW_COMPOSITE $count;
  @return $summary PROJECT_DIM summarized positive;
END
```

**Output**: "Found 42 facts about mammals, including..."

### Category 2: Structured Output

#### TO_JSON - Convert to JSON

```sys2dsl
@TO_JSON BEGIN
  @info subject INSPECT any;
  @return $info PROJECT_DIM format json;
END
```

**Output**:
```json
{
  "subject": "Dog",
  "relation": "IS_A",
  "object": "animal",
  "truth": "TRUE_CERTAIN",
  "confidence": 1.0,
  "source": "base_ontology"
}
```

#### TO_TRIPLE - Convert to S-V-O triple

```sys2dsl
@TO_TRIPLE BEGIN
  @s subject READ_DIM subject;
  @v subject READ_DIM verb;
  @o subject READ_DIM object;
  @return subject PROJECT_DIM triple_format positive;
END
```

**Output**: `["Dog", "IS_A", "animal"]`

#### TO_GRAPH - Convert to graph format

```sys2dsl
@TO_GRAPH BEGIN
  @nodes subject FACTS any;
  @edges $nodes READ_DIM relations;
  @return $edges PROJECT_DIM graph_format positive;
END
```

**Output** (for visualization):
```json
{
  "nodes": [
    {"id": "Dog", "kind": "concept"},
    {"id": "animal", "kind": "concept"}
  ],
  "edges": [
    {"source": "Dog", "target": "animal", "relation": "IS_A"}
  ]
}
```

### Category 3: Formatting Options

#### FORMAT - Apply template

```sys2dsl
@FORMAT BEGIN
  @template object INSPECT any;
  @data subject INSPECT any;
  @formatted $data PROJECT_DIM template $template;
  @return $formatted TO_NATURAL any;
END
```

**Usage**:
```sys2dsl
@template "The {subject} is {relation} {object}"
@result fact FORMAT $template
# "The Dog is a kind of animal"
```

#### INDENT - Add indentation

```sys2dsl
@INDENT BEGIN
  @text subject TO_NATURAL any;
  @return $text PROJECT_DIM indent object;
END
```

**Usage**: `@indented $text INDENT 2` → "  text..."

#### TRUNCATE - Limit length

```sys2dsl
@TRUNCATE BEGIN
  @text subject TO_NATURAL any;
  @return $text PROJECT_DIM max_length object;
END
```

### Category 4: Proof Output

#### SHOW_PROOF - Display proof trace

```sys2dsl
@SHOW_PROOF BEGIN
  @trace subject READ_DIM proof_trace;
  @steps $trace FACTS any;
  @natural $steps TO_NATURAL any;
  @return $natural PROJECT_DIM proof_display positive;
END
```

**Output**:
```
Proof of: Socrates IS_A mortal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Socrates IS_A human       [ASSERTED]
Step 2: human IS_A mortal         [ASSERTED]
Step 3: Socrates IS_A mortal      [INFERRED by transitivity]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: TRUE_CERTAIN
```

#### SHOW_CHAIN - Display inference chain

```sys2dsl
@SHOW_CHAIN BEGIN
  @chain subject READ_DIM inference_chain;
  @return $chain TO_NATURAL any;
END
```

**Output**:
```
Fido → Dog → mammal → animal → living_thing
```

#### SHOW_WHY - Explain reasoning

```sys2dsl
@SHOW_WHY BEGIN
  @reason subject READ_DIM reason;
  @sources subject READ_DIM sources;
  @why $reason NEW_COMPOSITE $sources;
  @return $why TO_NATURAL any;
END
```

**Output**:
```
Why is "Dog IS_A animal" true?
- Direct assertion in base_ontology.sys2dsl line 59
- Confidence: 100% (TRUE_CERTAIN)
```

### Category 5: Export

#### EXPORT - Export to external format

```sys2dsl
@EXPORT BEGIN
  @data subject TO_JSON any;
  @return $data PROJECT_DIM exported object;
END
```

#### RENDER - Visual rendering

```sys2dsl
@RENDER BEGIN
  @graph subject TO_GRAPH any;
  @return $graph PROJECT_DIM rendered positive;
END
```

**Semantics**: Prepare for graph visualization (e.g., D3.js).

#### PRINT - Console output (side effect)

```sys2dsl
@PRINT BEGIN
  @text subject TO_NATURAL any;
  @return $text PROJECT_DIM printed positive;
END
```

### Category 6: Comparison

#### DIFF - Show differences

```sys2dsl
@DIFF BEGIN
  @s_info subject INSPECT any;
  @o_info object INSPECT any;
  @changes $s_info NEW_COMPOSITE $o_info;
  @return $changes PROJECT_DIM diff positive;
END
```

**Output**:
```
Comparing Dog_v2 to Dog_v3:
  + existence: 80 → 127
  + usage_count: 5 → 12
  - protected: true → false
```

#### COMPARE - Side by side

```sys2dsl
@COMPARE BEGIN
  @s_natural subject TO_NATURAL any;
  @o_natural object TO_NATURAL any;
  @comparison $s_natural NEW_COMPOSITE $o_natural;
  @return $comparison PROJECT_DIM comparison positive;
END
```

## Output Formats

### Natural Language Templates

Truth values map to phrases:
```
+127: "definitely", "certainly"
+80:  "by default", "typically"
+40:  "possibly", "might be"
0:    "unknown whether"
-40:  "unlikely to be"
-80:  "by default not"
-127: "definitely not"
```

### JSON Schema

Standard output format:
```json
{
  "result": {
    "subject": "string",
    "relation": "string",
    "object": "string",
    "truth": "TRUE_CERTAIN|TRUE_DEFAULT|...",
    "confidence": 0.0-1.0,
    "proof_trace": ["step1", "step2", ...],
    "metadata": {}
  }
}
```

### Graph Format

For visualization tools:
```json
{
  "nodes": [{"id": "...", "label": "...", "kind": "..."}],
  "edges": [{"source": "...", "target": "...", "relation": "..."}]
}
```

## Implementation Notes

### Lazy Formatting

Format conversion happens on demand:
```javascript
// Point stores raw data
point.format = 'internal';

// On TO_NATURAL
point.format = 'natural';
point.natural_text = generateNatural(point);
```

### Localization

Natural language can be localized:
```sys2dsl
@_ en_US CONTROLS output_locale
# "Dog is an animal"

@_ ro_RO CONTROLS output_locale
# "Dog este un animal"
```

### Performance

Large result sets are paginated:
```sys2dsl
@_ limit_default CONTROLS max_results
@results any IS_A animal
# Returns first 50, with continuation token
```

## See Also

- [query.sys2dsl.md](./query.sys2dsl.md) - Queries that produce results to format
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Proofs to explain
- [Sys2DSL-spec.md](../../Sys2DSL-spec.md) - Truth value mapping
