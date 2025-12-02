# Specification: Base Search Theory

ID: DS(/theory/base/search.sys2dsl)

Source: `@data/init/theories/base/search.sys2dsl`

Status: v3.0

## Purpose

Defines **search strategies and exploration control** for reasoning in conceptual space. This includes depth-first, breadth-first, best-first search, beam search, and backtracking control.

## Design Rationale

### Reasoning = Search

All reasoning in AGISystem2 is fundamentally **search through conceptual space**:

```
Start Point ──────► Intermediate Points ──────► Goal Point
    │                      │
    └── alternatives ──────┘
         (backtracking)
```

Without search control:
- Infinite loops possible
- Resource exhaustion
- No way to find "best" vs "first" answer

### Geometric Search

Unlike traditional symbolic search, our search is **geometric**:
- Distance = L1 (diamond) distance in conceptual space
- Plausibility = inverse distance + confidence
- Alternatives = points reachable via relations
- Goal = target point or region (diamond)

## Search Primitives (Hardcoded)

These are implemented in the engine, not DSL:

### Choice Point Management

| Primitive | Operation |
|-----------|-----------|
| `CHOICE_POINT` | Mark state for potential backtracking |
| `ALTERNATIVES` | Get all possible next steps |
| `COMMIT_CHOICE` | Make choice permanent |
| `ABANDON_CHOICE` | Undo and restore state |

### Backtracking

| Primitive | Operation |
|-----------|-----------|
| `BACKTRACK` | Return to last choice, try next |
| `BACKTRACK_TO` | Return to specific choice point |
| `FAIL` | Mark path failed, trigger backtrack |
| `CUT` | Commit, prune all alternatives |

### Depth/Breadth Control

| Primitive | Operation |
|-----------|-----------|
| `DEPTH_CHECK` | Is depth within limit? |
| `BREADTH_CHECK` | Are alternatives within limit? |
| `CURRENT_DEPTH` | Get current depth |
| `CURRENT_BREADTH` | Get alternatives count |

### Plausibility

| Primitive | Operation |
|-----------|-----------|
| `DISTANCE_TO_GOAL` | L1 distance to goal |
| `DIAMOND_INTERSECT` | Diamond intersection volume |
| `DIAMOND_OVERLAP` | Do diamonds overlap? |

## Search Strategies

### SEARCH_DEPTH_FIRST

Classic DFS with depth limit and backtracking:

```sys2dsl
@SEARCH_DEPTH_FIRST BEGIN
  @depth_ok max_search_depth DEPTH_CHECK any;
  @_ $depth_ok FAIL_IF_FALSE depth_exceeded;
  @cp subject CHOICE_POINT any;
  @alts subject ALTERNATIVES object;
  @ranked $alts RANK_PATHS any;
  @next $ranked FIRST any;
  @result $next SEARCH_DEPTH_FIRST object;
  @found $result REACHED_GOAL object;
  @_ $found CUT_IF_TRUE any;
  @return $result;
END
```

**Properties**:
- Memory efficient (O(depth))
- May miss shorter paths
- Good for "find any solution"

**Use when**: You need any solution quickly.

### SEARCH_BREADTH_FIRST

Level-by-level exploration:

```sys2dsl
@SEARCH_BREADTH_FIRST BEGIN
  @breadth_ok max_search_breadth BREADTH_CHECK any;
  @level subject ALTERNATIVES object;
  @pruned $level TAKE max_search_breadth;
  @results $pruned EXPLORE_LEVEL object;
  @found $results FILTER reached_goal;
  @has_found $found NONEMPTY any;
  @_ $has_found CUT_IF_TRUE any;
  @next_level $results FLATTEN any;
  @return $next_level SEARCH_BREADTH_FIRST object;
END
```

**Properties**:
- Finds shortest path
- Memory intensive (O(breadth^depth))
- Complete (will find if exists)

**Use when**: You need optimal (shortest) solution.

### SEARCH_BEST_FIRST

Always expand most promising node:

```sys2dsl
@SEARCH_BEST_FIRST BEGIN
  @alts subject ALTERNATIVES object;
  @ranked $alts RANK_PATHS any;
  @best $ranked FIRST any;
  @at_goal $best REACHED_GOAL object;
  @_ $at_goal CUT_IF_TRUE any;
  @result $best SEARCH_BEST_FIRST object;
  @return $result;
END
```

**Properties**:
- Uses geometric plausibility heuristic
- Often finds good solutions fast
- Not guaranteed optimal

**Use when**: You want good solution quickly, optimality not critical.

### SEARCH_BEAM

Keep only top-k alternatives:

```sys2dsl
@SEARCH_BEAM BEGIN
  @alts subject ALTERNATIVES object;
  @ranked $alts RANK_PATHS any;
  @beam $ranked TAKE beam_width;
  @explored $beam EXPLORE_ALL object;
  @merged $explored MERGE_RESULTS any;
  @found $merged FILTER reached_goal;
  @has_found $found NONEMPTY any;
  @_ $has_found CUT_IF_TRUE any;
  @return $merged SEARCH_BEAM object;
END
```

**Properties**:
- Bounded memory (O(beam_width × depth))
- Good balance of quality and resources
- May miss solutions outside beam

**Use when**: Memory is limited, need reasonable quality.

### SEARCH_ITERATIVE_DEEPENING

Combines DFS memory with BFS completeness:

```sys2dsl
@SEARCH_ITERATIVE_DEEPENING BEGIN
  @d current_depth_limit READ_CONTROL any;
  @result subject SEARCH_WITH_DEPTH $d object;
  @found $result REACHED_GOAL object;
  @_ $found CUT_IF_TRUE any;
  @deeper $d PLUS 1;
  @max max_search_depth READ_CONTROL any;
  @exceeded $deeper GREATER_THAN $max;
  @_ $exceeded FAIL_IF_TRUE max_depth_exceeded;
  @_ $deeper CONTROLS current_depth_limit;
  @return subject SEARCH_ITERATIVE_DEEPENING object;
END
```

**Properties**:
- O(depth) memory
- Finds shortest path
- Slight overhead from re-exploration

**Use when**: You need optimal solution with limited memory.

## Plausibility Calculation

### Formula

```
plausibility(path) =
    0.3 × (1 - distance_to_goal / max_distance)
  + 0.1 × (1 - path_length / max_depth)
  + 0.3 × min(step_confidences)
  + 0.1 × (1 - assumptions_count / max_assumptions)
  + 0.2 × coherence_with_existing
```

### Coherence

How well does the path fit existing knowledge?

```sys2dsl
@COHERENCE BEGIN
  @existing any FACTS any;
  @path_facts subject FACTS any;
  @overlaps $existing DIAMOND_OVERLAP $path_facts;
  @conflicts $existing CHECK_CONTRADICTION $path_facts;
  @score $overlaps MINUS $conflicts;
  @return $score NORMALIZE any;
END
```

## Control Points

| Control | Default | Description |
|---------|---------|-------------|
| `max_search_depth` | 10 | Maximum depth before fail |
| `max_search_breadth` | 50 | Max alternatives per level |
| `beam_width` | 5 | Beam search width |
| `goal_threshold` | 5 | Distance considered "reached" |
| `max_solutions` | 1 | Solutions to collect |
| `current_depth_limit` | 1 | For iterative deepening |

### Setting Controls

```sys2dsl
@_ depth_deep CONTROLS max_search_depth
@_ breadth_wide CONTROLS max_search_breadth
@_ beam_narrow CONTROLS beam_width
```

## Usage Patterns

### Simple Inference

```sys2dsl
@result Start SEARCH_BEST_FIRST Goal
```

### Exhaustive Search

```sys2dsl
@_ depth_deep CONTROLS max_search_depth
@_ exhaustive CONTROLS search_strategy
@all_paths Start SEARCH_FIND_ALL Goal
```

### Quick Check

```sys2dsl
@_ depth_shallow CONTROLS max_search_depth
@_ timeout_fast CONTROLS timeout_ms
@quick Start SEARCH_DEPTH_FIRST Goal
```

### Proof Construction

```sys2dsl
@_ depth_default CONTROLS max_search_depth
@proof Premise SEARCH_DEPTH_FIRST Conclusion
@trace $proof READ_DIM path
```

## Integration with Reasoning

### INFER Uses Search

```sys2dsl
@INFER BEGIN
  @goal object INSPECT any;
  @start subject INSPECT any;
  @result $start SEARCH_BEST_FIRST $goal;
  @return $result;
END
```

### PROVE Uses Exhaustive Search

```sys2dsl
@PROVE BEGIN
  @_ depth_deep CONTROLS max_search_depth;
  @path subject SEARCH_DEPTH_FIRST object;
  @complete $path VERIFY_COMPLETE any;
  @return $path PROJECT_DIM proof $complete;
END
```

### ABDUCT Uses Reverse Search

```sys2dsl
@ABDUCT BEGIN
  @effect subject INSPECT any;
  @causes $effect SEARCH_REVERSE any;
  @ranked $causes RANK_PATHS any;
  @return $ranked;
END
```

## Failure Handling

### Graceful Degradation

When no complete path found:

```json
{
  "kind": "search_result",
  "found": false,
  "closest_point": "<nearest to goal>",
  "distance_remaining": 42,
  "paths_tried": 150,
  "reason": "max_depth_exceeded"
}
```

### Partial Results

```sys2dsl
@partial Start PARTIAL_RESULT Goal
# Returns closest point even if goal not reached
```

## Performance Notes

### Memoization

Visited states are cached to avoid re-exploration.

### Pruning

- Alpha-beta pruning for paths worse than current best
- Symmetry breaking for equivalent paths
- Geometric bounds pruning

### Complexity

| Strategy | Time | Space |
|----------|------|-------|
| DFS | O(b^d) | O(d) |
| BFS | O(b^d) | O(b^d) |
| Best-First | O(b^d) | O(b^d) |
| Beam | O(b×k×d) | O(k×d) |
| Iterative | O(b^d) | O(d) |

Where b=branching, d=depth, k=beam width.

## See Also

- [search_exploration.md](../../core/search_exploration.md) - Full search spec
- [primitives.sys2dsl.md](./primitives.sys2dsl.md) - Search primitives
- [reasoning.sys2dsl.md](./reasoning.sys2dsl.md) - Uses search
- [control.sys2dsl.md](./control.sys2dsl.md) - Search limits
