# Specification: Search and Exploration Primitives

ID: DS(/core/search_exploration)

Status: v3.0

## Purpose

Defines the **geometric primitives and control mechanisms** for exploring the solution space during reasoning. This includes backtracking, breadth/depth limits, plausibility ranking, and choice point management.

## Design Rationale

### Why Dedicated Search Primitives?

Reasoning in conceptual space is fundamentally a **search problem**:
- Multiple paths may lead to a conclusion
- Some paths are more plausible than others
- Resources (time, memory) are limited
- We need to backtrack when paths fail

Without explicit search control:
- Reasoning could explore forever
- Implausible paths waste resources
- No way to find "best" answer vs "first" answer

### Search as Geometric Navigation

In v3.0, search is **geometric navigation** through conceptual space:

```
┌─────────────────────────────────────────────────────────────────┐
│              SOLUTION SPACE AS GEOMETRIC SPACE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Start ─────┬────────────────────────────────────► Goal         │
│             │                                                   │
│             ├──► Path A (plausibility: 0.9) ──► ✓               │
│             │         │                                         │
│             │         └──► A.1 (0.7) ──► dead end               │
│             │                                                   │
│             ├──► Path B (plausibility: 0.3) ──► pruned          │
│             │                                                   │
│             └──► Path C (plausibility: 0.6) ──► ✓               │
│                                                                 │
│  Plausibility = geometric distance to goal in conceptual space  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Search Primitives (Hardcoded)

These are geometric primitives that MUST be hardcoded because they control the reasoning engine itself.

### Category 1: Choice Point Management

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive        │  Signature                │  Operation      │
│  ─────────────────│───────────────────────────│───────────────  │
│  CHOICE_POINT     │  state → ChoicePoint      │  Mark branch    │
│  ALTERNATIVES     │  point → [Point]          │  Get options    │
│  COMMIT_CHOICE    │  ChoicePoint → void       │  Make permanent │
│  ABANDON_CHOICE   │  ChoicePoint → void       │  Undo choice    │
└─────────────────────────────────────────────────────────────────┘
```

**CHOICE_POINT**: Marks current state as a branching point for potential backtracking.

```sys2dsl
@cp current_state CHOICE_POINT any
# Creates: {
#   kind: "choice_point",
#   state_snapshot: [...],
#   alternatives: [...],
#   depth: 3,
#   created_at: timestamp
# }
```

**ALTERNATIVES**: Returns all possible next steps from a point, ordered by plausibility.

```sys2dsl
@options Current ALTERNATIVES any
# Returns list of possible paths, ranked by geometric plausibility
```

### Category 2: Backtracking Control

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive        │  Signature                │  Operation      │
│  ─────────────────│───────────────────────────│───────────────  │
│  BACKTRACK        │  void → ChoicePoint       │  Return to last │
│  BACKTRACK_TO     │  ChoicePoint → void       │  Return to spec │
│  FAIL             │  reason → void            │  Mark path fail │
│  CUT              │  void → void              │  Prune altern.  │
└─────────────────────────────────────────────────────────────────┘
```

**BACKTRACK**: Return to most recent uncommitted choice point and try next alternative.

```sys2dsl
@prev any BACKTRACK any
# Restores state to last choice point
# Selects next untried alternative
# Returns the choice point or EXHAUSTED if none left
```

**FAIL**: Mark current path as failed, trigger backtracking.

```sys2dsl
@_ "dead end" FAIL any
# Records failure reason
# Triggers automatic BACKTRACK
```

**CUT**: Commit to current path, prune all alternatives (like Prolog's cut).

```sys2dsl
@_ any CUT any
# Removes all pending alternatives from current choice point
# Prevents backtracking past this point
```

### Category 3: Depth/Breadth Limits

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive        │  Signature                │  Operation      │
│  ─────────────────│───────────────────────────│───────────────  │
│  DEPTH_CHECK      │  limit → bool             │  Check depth    │
│  BREADTH_CHECK    │  limit → bool             │  Check breadth  │
│  CURRENT_DEPTH    │  void → number            │  Get depth      │
│  CURRENT_BREADTH  │  void → number            │  Get breadth    │
└─────────────────────────────────────────────────────────────────┘
```

**DEPTH_CHECK**: Returns TRUE if current depth is within limit.

```sys2dsl
@ok depth_limit DEPTH_CHECK any
# Returns TRUE if current_depth <= depth_limit
# Returns FALSE and triggers FAIL if exceeded
```

**BREADTH_CHECK**: Returns TRUE if alternatives at current level are within limit.

```sys2dsl
@ok breadth_limit BREADTH_CHECK any
# Returns TRUE if alternatives_count <= breadth_limit
# Prunes excess alternatives if exceeded
```

### Category 4: Plausibility Measurement

```
┌─────────────────────────────────────────────────────────────────┐
│  Primitive        │  Signature                │  Operation      │
│  ─────────────────│───────────────────────────│───────────────  │
│  PLAUSIBILITY     │  path → number            │  Score path     │
│  DISTANCE_TO_GOAL │  point × goal → number    │  Geometric dist │
│  RANK_PATHS       │  [path] → [path]          │  Order by plaus │
│  BEST_FIRST       │  [path] → path            │  Select best    │
└─────────────────────────────────────────────────────────────────┘
```

**PLAUSIBILITY**: Computes plausibility score for a reasoning path.

```sys2dsl
@score Current_path PLAUSIBILITY any
# Returns: number in [0, 1]
# Based on:
#   - Geometric distance traveled
#   - Confidence of each step
#   - Number of assumptions made
#   - Consistency with existing knowledge
```

**DISTANCE_TO_GOAL**: Measures geometric distance in conceptual space.

```sys2dsl
@dist Current DISTANCE_TO_GOAL Goal
# Returns L1 distance (diamond metric) between points
# Lower = more plausible path
```

**RANK_PATHS**: Orders paths by plausibility, highest first.

```sys2dsl
@ranked Alternatives RANK_PATHS any
# Returns alternatives sorted by PLAUSIBILITY score
```

**BEST_FIRST**: Selects most plausible path.

```sys2dsl
@best Alternatives BEST_FIRST any
# Returns single best alternative
# Used for greedy search
```

---

## Search Strategies (Verbs in Base Theory)

These are defined using the primitives above.

### SEARCH_DEPTH_FIRST

Classic depth-first search with backtracking:

```sys2dsl
@SEARCH_DEPTH_FIRST BEGIN
  @depth_ok depth_limit DEPTH_CHECK any;
  @_ $depth_ok FAIL_IF_FALSE "depth exceeded";
  @cp current CHOICE_POINT any;
  @alts current ALTERNATIVES any;
  @next $alts BEST_FIRST any;
  @result $next EXPLORE any;
  @_ $result BACKTRACK_IF_FAIL any;
  @return $result;
END
```

### SEARCH_BREADTH_FIRST

Level-by-level exploration:

```sys2dsl
@SEARCH_BREADTH_FIRST BEGIN
  @breadth_ok breadth_limit BREADTH_CHECK any;
  @level current ALTERNATIVES any;
  @pruned $level LIMIT_TO breadth_limit;
  @results $pruned EXPLORE_ALL any;
  @best $results BEST_FIRST any;
  @return $best;
END
```

### SEARCH_ITERATIVE_DEEPENING

Combines benefits of both:

```sys2dsl
@SEARCH_ITERATIVE_DEEPENING BEGIN
  @d NUMERIC_VALUE 1;
  @result any SEARCH_WITH_DEPTH $d;
  @found $result EXISTS any;
  @_ $found CUT any;
  @deeper $d PLUS 1;
  @_ $deeper CONTROLS current_depth_limit;
  @return subject SEARCH_ITERATIVE_DEEPENING object;
END
```

### SEARCH_BEST_FIRST

Always expand most promising node:

```sys2dsl
@SEARCH_BEST_FIRST BEGIN
  @frontier current ALTERNATIVES any;
  @ranked $frontier RANK_PATHS any;
  @best $ranked FIRST any;
  @result $best EXPLORE any;
  @done $result REACHED_GOAL any;
  @_ $done CUT any;
  @return subject SEARCH_BEST_FIRST object;
END
```

### SEARCH_BEAM

Keep only top-k alternatives at each level:

```sys2dsl
@SEARCH_BEAM BEGIN
  @alts current ALTERNATIVES any;
  @ranked $alts RANK_PATHS any;
  @beam $ranked TAKE beam_width;
  @results $beam EXPLORE_ALL any;
  @return $results MERGE_RESULTS any;
END
```

---

## Control Points for Search

These control points tune search behavior:

```sys2dsl
# Depth limit (default: 10)
@_ depth_default CONTROLS max_search_depth

# Breadth limit per level (default: 50)
@_ breadth_default CONTROLS max_search_breadth

# Beam width for beam search (default: 5)
@_ beam_default CONTROLS beam_width

# Maximum solutions to find (default: 1)
@_ one CONTROLS max_solutions

# Plausibility threshold (default: 0.1)
@_ threshold_low CONTROLS min_plausibility

# Strategy (default: best_first)
@_ best_first CONTROLS search_strategy
```

---

## Plausibility Calculation

### Geometric Plausibility

Plausibility is computed geometrically:

```
┌─────────────────────────────────────────────────────────────────┐
│              PLAUSIBILITY FORMULA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  plausibility(path) =                                           │
│                                                                 │
│    w₁ × (1 - distance_to_goal / max_distance)                   │
│  + w₂ × (1 - path_length / max_depth)                           │
│  + w₃ × min(step_confidences)                                   │
│  + w₄ × (1 - assumptions_count / max_assumptions)               │
│  + w₅ × coherence_with_existing                                 │
│                                                                 │
│  where:                                                         │
│    w₁ = 0.3  (distance weight)                                  │
│    w₂ = 0.1  (length penalty)                                   │
│    w₃ = 0.3  (confidence weight)                                │
│    w₄ = 0.1  (assumption penalty)                               │
│    w₅ = 0.2  (coherence bonus)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Coherence Check

Coherence measures how well a path fits existing knowledge:

```sys2dsl
@COHERENCE BEGIN
  @existing subject FACTS any;
  @overlaps $existing DIAMOND_OVERLAP path;
  @conflicts $existing CHECK_CONTRADICTION path;
  @score $overlaps MINUS $conflicts;
  @return $score NORMALIZE any;
END
```

---

## Search State Structure

The search state is itself a point:

```
SearchState {
  kind: "search_state"

  # Current position
  current_point: Point
  goal_point: Point

  # Path so far
  path: [Step]
  path_length: number

  # Choice points stack
  choice_points: [ChoicePoint]
  current_depth: number

  # Statistics
  nodes_explored: number
  backtracks_count: number

  # Best solution found (if any)
  best_solution: Path | null
  best_plausibility: number
}
```

---

## Integration with Reasoning

### INFER Uses Search

The INFER verb uses search internally:

```sys2dsl
@INFER BEGIN
  @goal object INSPECT any;
  @start subject INSPECT any;
  @strategy inference_strategy READ_CONTROL any;
  @result $start SEARCH_WITH $strategy $goal;
  @return $result PROJECT_DIM inferred positive;
END
```

### PROVE Uses Exhaustive Search

PROVE requires finding a complete path:

```sys2dsl
@PROVE BEGIN
  @_ exhaustive CONTROLS search_strategy;
  @_ depth_deep CONTROLS max_search_depth;
  @path subject SEARCH_DEPTH_FIRST object;
  @complete $path VERIFY_COMPLETE any;
  @return $path PROJECT_DIM proof $complete;
END
```

### ABDUCT Uses Reverse Search

Abduction searches backward from effect to cause:

```sys2dsl
@ABDUCT BEGIN
  @effect subject INSPECT any;
  @causes $effect SEARCH_REVERSE any;
  @ranked $causes RANK_PATHS any;
  @return $ranked PROJECT_DIM hypotheses positive;
END
```

---

## Failure Handling

### Graceful Degradation

When search fails completely:

```sys2dsl
@result subject SEARCH_BEST_FIRST object
# If no path found:
# Returns: {
#   kind: "search_result",
#   found: false,
#   closest_point: <nearest to goal>,
#   distance_remaining: 42,
#   paths_tried: 150,
#   reason: "max_depth_exceeded"
# }
```

### Partial Results

Even failed searches return useful information:

```sys2dsl
@partial subject SEARCH_WITH_PARTIAL object
# Returns best partial path even if goal not reached
# Useful for "how close can we get?"
```

---

## Performance Considerations

### Memoization

Already-explored states are cached:

```javascript
const memoized = new Map();

function explore(state) {
  const key = state.hash();
  if (memoized.has(key)) {
    return memoized.get(key);
  }
  const result = doExplore(state);
  memoized.set(key, result);
  return result;
}
```

### Pruning Heuristics

Aggressive pruning for efficiency:

1. **Alpha-Beta**: Skip paths worse than current best
2. **Symmetry Breaking**: Don't explore equivalent paths
3. **Subsumption**: Skip paths subsumed by better ones
4. **Geometric Bounds**: Skip paths outside goal's diamond

---

## Base Theory File

Create `search.sys2dsl` for search verbs:

```sys2dsl
# =============================================================================
# BASE SEARCH - Search and Exploration Verbs
# =============================================================================

# Strategy verbs
@SEARCH_DEPTH_FIRST BEGIN ... END
@SEARCH_BREADTH_FIRST BEGIN ... END
@SEARCH_BEST_FIRST BEGIN ... END
@SEARCH_BEAM BEGIN ... END
@SEARCH_ITERATIVE_DEEPENING BEGIN ... END

# Helper verbs
@EXPLORE BEGIN ... END
@EXPLORE_ALL BEGIN ... END
@REACHED_GOAL BEGIN ... END
@FAIL_IF_FALSE BEGIN ... END
@BACKTRACK_IF_FAIL BEGIN ... END

# Plausibility verbs
@COHERENCE BEGIN ... END
@RANK_BY_PLAUSIBILITY BEGIN ... END

# Default controls
@_ depth_default CONTROLS max_search_depth
@_ breadth_default CONTROLS max_search_breadth
@_ best_first CONTROLS search_strategy
```

---

## See Also

- [primitives.sys2dsl.md](../theory/base/primitives.sys2dsl.md) - Core primitives
- [reasoning.sys2dsl.md](../theory/base/reasoning.sys2dsl.md) - Uses search
- [control.sys2dsl.md](../theory/base/control.sys2dsl.md) - Search limits
- [Sys2DSL-spec.md](../Sys2DSL-spec.md) - Overall semantics
