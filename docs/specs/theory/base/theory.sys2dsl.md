# Specification: Base Theory Layer Management

ID: DS(/theory/base/theory.sys2dsl)

Source: `@data/init/theories/base/theory.sys2dsl`

Status: v3.0

## Purpose

Defines **theory layer management operations** as verbs. Theory layers implement working memory and hypothetical reasoning through copy-on-write conceptual space overlays.

## Design Rationale

### Theories as Layers

The conceptual space is organized in layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Hypothetical "what if X?"                             │
│           (temporary, will be popped)                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Current Session                                       │
│           (user's working facts)                                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Loaded Theory "medical_domain"                        │
│           (domain knowledge)                                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 0: Base Ontology + Axiology                              │
│           (core knowledge, protected)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Copy-on-Write Semantics

Layers don't copy all data - they only store differences:

```
Base: Dog.existence = +127
Session: (no change - inherits from Base)
Hypothetical: Dog.existence = -127 (override)
```

Benefits:
- Memory efficient (only store deltas)
- Fast push/pop (no copying)
- Clean rollback (just discard overlay)

### Theory vs Session

- **Theory**: Named, persistent, can be saved/loaded
- **Session**: Temporary, single conversation, auto-cleared

## Layer Operations

### Category 1: Layer Stack

#### PUSH - Create new layer

```sys2dsl
@PUSH BEGIN
  @layer_id subject INSPECT any;
  @new_layer $layer_id NEW_COMPOSITE session;
  @_ $new_layer PROJECT_DIM layer_type hypothetical;
  @return $new_layer PROJECT_DIM active positive;
END
```

**Semantics**: Create overlay layer, make it active.

**Usage**:
```sys2dsl
@_ hypothetical PUSH any      # Named layer
@_ any PUSH any               # Anonymous layer
```

#### POP - Remove top layer

```sys2dsl
@POP BEGIN
  @top current_layer INSPECT any;
  @parent $top READ_DIM parent_layer;
  @_ $top PROJECT_DIM active zero;
  @return $parent PROJECT_DIM active positive;
END
```

**Semantics**: Discard top layer, revert to parent.

**All changes in popped layer are lost.**

#### COMMIT - Merge into parent

```sys2dsl
@COMMIT BEGIN
  @top current_layer INSPECT any;
  @parent $top READ_DIM parent_layer;
  @merged $top ATTRACT $parent;
  @_ $top PROJECT_DIM active zero;
  @return $merged PROJECT_DIM active positive;
END
```

**Semantics**: Apply changes to parent, then pop.

**Difference from POP**: Changes are preserved.

#### DISCARD - Alias for POP

```sys2dsl
@DISCARD BEGIN
  @return any POP any;
END
```

### Category 2: Persistence

#### SAVE - Save theory to storage

```sys2dsl
@SAVE BEGIN
  @current current_layer INSPECT any;
  @_ $current PROJECT_DIM saved_name subject;
  @return subject PROJECT_DIM saved positive;
END
```

**Semantics**: Persist current layer with name.

**Usage**:
```sys2dsl
@_ medical_knowledge SAVE any
# Saved as "medical_knowledge.sys2dsl"
```

#### LOAD - Load theory from storage

```sys2dsl
@LOAD BEGIN
  @stored subject INSPECT any;
  @_ $stored PUSH any;
  @return $stored PROJECT_DIM loaded positive;
END
```

**Semantics**: Load named theory as new layer.

**Usage**:
```sys2dsl
@_ medical_knowledge LOAD any
# Now have access to medical facts
```

#### DELETE - Delete saved theory

```sys2dsl
@DELETE BEGIN
  @return subject PROJECT_DIM existence zero;
END
```

#### MERGE - Merge external theory

```sys2dsl
@MERGE BEGIN
  @external subject INSPECT any;
  @current current_layer INSPECT any;
  @merged $external ATTRACT $current;
  @return $merged PROJECT_DIM merged positive;
END
```

**Semantics**: Add external theory's facts to current layer.

**Difference from LOAD**: Doesn't create new layer.

### Category 3: Theory Queries

#### THEORIES - Get all saved theories

```sys2dsl
@THEORIES BEGIN
  @return any WITH_RELATION saved_theory;
END
```

**Returns**: List of theory names.

#### INFO - Get theory metadata

```sys2dsl
@INFO BEGIN
  @info subject INSPECT any;
  @facts subject FACTS any;
  @count $facts COUNT any;
  @return $info PROJECT_DIM fact_count $count;
END
```

**Returns**:
```json
{
  "name": "medical_knowledge",
  "fact_count": 1523,
  "created": "2024-01-15",
  "dependencies": ["base_ontology"]
}
```

#### CURRENT_THEORY - Get active layer

```sys2dsl
@CURRENT_THEORY BEGIN
  @return current_layer INSPECT any;
END
```

#### LAYER_DEPTH - Get stack depth

```sys2dsl
@LAYER_DEPTH BEGIN
  @return current_layer READ_DIM depth;
END
```

### Category 4: Session Management

#### RESET_SESSION - Clear all temporary layers

```sys2dsl
@RESET_SESSION BEGIN
  @depth current_layer READ_DIM depth;
  @_ any POP_ALL any;
  @return session PROJECT_DIM reset positive;
END
```

**Semantics**: Pop all layers back to base.

#### NEW_SESSION - Start fresh

```sys2dsl
@NEW_SESSION BEGIN
  @_ any RESET_SESSION any;
  @_ session PUSH any;
  @return session PROJECT_DIM new positive;
END
```

#### CHECKPOINT - Save state for rollback

```sys2dsl
@CHECKPOINT BEGIN
  @state current_layer INSPECT any;
  @_ $state SNAPSHOT any;
  @return subject PROJECT_DIM checkpoint $state;
END
```

#### RESTORE - Rollback to checkpoint

```sys2dsl
@RESTORE BEGIN
  @checkpoint subject READ_DIM checkpoint;
  @return $checkpoint LOAD any;
END
```

### Category 5: Layer Properties

#### SET_READONLY - Make immutable

```sys2dsl
@SET_READONLY BEGIN
  @return subject PROJECT_DIM readonly positive;
END
```

**Semantics**: Prevent modifications to layer.

#### SET_WRITABLE - Make mutable

```sys2dsl
@SET_WRITABLE BEGIN
  @return subject PROJECT_DIM readonly zero;
END
```

#### IS_READONLY - Check status

```sys2dsl
@IS_READONLY BEGIN
  @ro subject READ_DIM readonly;
  @return $ro GREATER_THAN zero;
END
```

#### TAG - Add metadata

```sys2dsl
@TAG BEGIN
  @tags subject READ_DIM tags;
  @new_tags $tags NEW_COMPOSITE object;
  @return subject PROJECT_DIM tags $new_tags;
END
```

## Theory Layer Architecture

### Layer Stack Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER STACK                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  current_layer ──► Layer {                                      │
│                      id: "hyp_001"                              │
│                      depth: 3                                   │
│                      parent: "session_001"                      │
│                      delta: { /* changed points */ }            │
│                      readonly: false                            │
│                    }                                            │
│                         │                                       │
│                         ▼                                       │
│                    Layer {                                      │
│                      id: "session_001"                          │
│                      depth: 2                                   │
│                      parent: "medical_001"                      │
│                      delta: { ... }                             │
│                    }                                            │
│                         │                                       │
│                         ▼                                       │
│                    Layer {                                      │
│                      id: "medical_001"                          │
│                      depth: 1                                   │
│                      parent: "base"                             │
│                      delta: { ... }                             │
│                      readonly: true                             │
│                    }                                            │
│                         │                                       │
│                         ▼                                       │
│                    Layer {                                      │
│                      id: "base"                                 │
│                      depth: 0                                   │
│                      parent: null                               │
│                      delta: { /* all base facts */ }            │
│                      readonly: true                             │
│                    }                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Lookup Algorithm

When reading a point:
```
1. Check current layer's delta
2. If not found, check parent's delta
3. Repeat until base layer
4. If not in any layer, return UNKNOWN
```

### Write Algorithm

When writing a point:
```
1. If current layer is readonly, ERROR
2. Add/update point in current layer's delta
3. Parent layers unchanged (copy-on-write)
```

## Usage Patterns

### Hypothetical Reasoning

```sys2dsl
# What if cats could fly?
@_ hypothetical PUSH any
@_ Cat CAN fly
@consequences Cat INFER any
@_ any POP any
# Changes discarded, but we saw consequences
```

### Domain Loading

```sys2dsl
# Load medical domain for diagnosis
@_ medical_domain LOAD any
@diagnosis Patient INFER disease
@_ any POP any
# Medical knowledge no longer in scope
```

### Safe Experimentation

```sys2dsl
@_ experiment CHECKPOINT any
# Try various changes...
@_ experiment RESTORE any
# Back to checkpoint state
```

### Persistent Learning

```sys2dsl
# Learn from interaction
@_ New_fact IS_A knowledge
# At end of session
@_ learned_facts SAVE any
# Next session
@_ learned_facts LOAD any
```

## Implementation Notes

### Storage Format

Theories saved as `.sys2dsl` files:
```
# theory: medical_domain
# created: 2024-01-15
# depends: base_ontology

@_ Disease IS_A concept
@_ Symptom IS_A concept
@_ Fever IS_A Symptom
...
```

### Layer Merging

When committing/merging, conflicts resolved by:
1. Later writes win (most recent layer)
2. Higher confidence wins (if equal timing)
3. User prompted if ambiguous

### Memory Management

Orphaned layers (unreachable after POP) are garbage collected.

## See Also

- [memory.sys2dsl.md](./memory.sys2dsl.md) - Point-level memory management
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Uses layers for counterfactuals
- [control.sys2dsl.md](./control.sys2dsl.md) - Layer depth limits
