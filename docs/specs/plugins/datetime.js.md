# Design Spec: src/plugins/datetime.js

ID: DS(/plugins/datetime.js)

Class `DatetimePlugin`
- **Role**: Compute plugin that handles temporal operations and date/time computations including comparisons, duration calculations, and date arithmetic.
- **Pattern**: Strategy. SOLID: single responsibility for temporal computation; stateless evaluation.
- **Key Collaborators**: `PluginRegistry` (registration), date/time strings and intervals.

## Public API

- `name`: String identifier `'datetime'`
- `relations`: Array of handled relations
- `evaluate(relation, subject, object)`: Compute result for given relation
- `canCompute(relation, subject, object)`: Check if dates can be parsed for computation

## Supported Relations

### Temporal Comparisons
| Relation | Description | Example |
|----------|-------------|---------|
| `BEFORE` | Subject occurs before object | `'2024-01-01' BEFORE '2024-12-31'` → TRUE |
| `AFTER` | Subject occurs after object | `'2024-12-31' AFTER '2024-01-01'` → TRUE |
| `SIMULTANEOUS_WITH` | Same time (within tolerance) | `'now' SIMULTANEOUS_WITH 'now'` → TRUE |
| `DURING` | Point occurs during interval | `'2024-06-15' DURING { start: '2024-01-01', end: '2024-12-31' }` → TRUE |

### Interval Operations
| Relation | Description | Example |
|----------|-------------|---------|
| `OVERLAPS_WITH` | Intervals share time | `interval1 OVERLAPS_WITH interval2` → TRUE/FALSE |
| `CONTAINS_TIME` | Interval contains point | `interval CONTAINS_TIME '2024-06-15'` → TRUE/FALSE |
| `STARTS_WITH` | Intervals share start | `interval1 STARTS_WITH interval2` → TRUE/FALSE |
| `ENDS_WITH` | Intervals share end | `interval1 ENDS_WITH interval2` → TRUE/FALSE |

### Duration Operations
| Relation | Description | Example |
|----------|-------------|---------|
| `DURATION_BETWEEN` | Calculate duration | `'2024-01-01' DURATION_BETWEEN '2024-12-31'` → "1y" |
| `AGE_OF` | Calculate age from birthdate | `'1990-05-15' AGE_OF '2024-05-15'` → 34 years |
| `ADD_DURATION` | Add duration to date | `'2024-01-01' ADD_DURATION '30_days'` → 2024-01-31 |
| `SUBTRACT_DURATION` | Subtract duration from date | `'2024-01-31' SUBTRACT_DURATION '30_days'` → 2024-01-01 |

### Date Components
| Relation | Description | Example |
|----------|-------------|---------|
| `DAY_OF_WEEK` | Get weekday | `'2024-01-01' DAY_OF_WEEK` → Monday |
| `MONTH_OF` | Get month | `'2024-06-15' MONTH_OF` → June |
| `YEAR_OF` | Get year | `'2024-06-15' YEAR_OF` → 2024 |

## Date/Time Parsing Formats

| Format | Example | Parsed As |
|--------|---------|-----------|
| ISO 8601 | `'2024-01-15T10:30:00Z'` | Full datetime |
| Date only | `'2024-01-15'` | Midnight of date |
| Year-month | `'2024-01'` | First of month |
| Year only | `'2024'` | January 1st of year |
| Relative | `'now'`, `'today'`, `'yesterday'`, `'tomorrow'` | Current/relative date |
| Labeled | `'year_2024'`, `'date_20240115'` | Parsed from label |

## Duration Parsing Formats

| Format | Example | Duration |
|--------|---------|----------|
| ISO 8601 | `'P1Y2M3D'` | 1 year, 2 months, 3 days |
| ISO 8601 | `'P1Y2M3DT4H5M6S'` | With time components |
| Value_unit | `'30_days'`, `'2_hours'` | Value with unit |
| Compact | `'30days'`, `'2h'` | Value with unit |

### Duration Units
| Unit | Milliseconds |
|------|--------------|
| millisecond, ms | 1 |
| second, s | 1,000 |
| minute, min | 60,000 |
| hour, h | 3,600,000 |
| day, d | 86,400,000 |
| week, w | 604,800,000 |
| month | 2,592,000,000 (30 days approx) |
| year, y | 31,536,000,000 (365 days) |

## Interval Format

Intervals can be specified as:
- Object: `{ start: '2024-01-01', end: '2024-12-31' }`
- ISO 8601: `'2024-01-01/2024-12-31'`

## Pseudocode

```js
class DatetimePlugin {
  constructor() {
    this.name = 'datetime';
    this.relations = [
      'BEFORE', 'AFTER', 'DURING', 'SIMULTANEOUS_WITH',
      'OVERLAPS_WITH', 'CONTAINS_TIME', 'STARTS_WITH', 'ENDS_WITH',
      'DURATION_BETWEEN', 'AGE_OF', 'ADD_DURATION', 'SUBTRACT_DURATION',
      'DAY_OF_WEEK', 'MONTH_OF', 'YEAR_OF'
    ];
    // Initialize unit tables...
  }

  evaluate(relation, subject, object) {
    switch (relation) {
      case 'BEFORE':
        return this._evaluateBefore(subject, object);
      case 'DURATION_BETWEEN':
        return this._evaluateDurationBetween(subject, object);
      // ... other cases
    }
  }

  _parseDateTime(input) {
    // Parse various formats: ISO, relative ('now'), labeled ('year_2024')
    // Returns: Date object or null
  }

  _parseDuration(input) {
    // Parse ISO 8601 duration or value_unit format
    // Returns: milliseconds or null
  }

  _parseInterval(input) {
    // Parse { start, end } object or 'start/end' string
    // Returns: { start: Date, end: Date } or null
  }

  _formatDuration(ms) {
    // Format milliseconds as human-readable: "1y 2mo 3d 4h"
  }
}
```

## Examples

### Temporal Comparison
```js
datetime.evaluate('BEFORE', '2024-01-01', '2024-12-31');
// → { truth: 'TRUE_CERTAIN', result: true, difference: '1y' }
```

### Duration Calculation
```js
datetime.evaluate('DURATION_BETWEEN', '2024-01-01', '2024-12-31');
// → { truth: 'TRUE_CERTAIN', value: 31449600000, formatted: '1y' }
```

### Age Calculation
```js
datetime.evaluate('AGE_OF', '1990-05-15', '2024-05-15');
// → { truth: 'TRUE_CERTAIN', value: 34, unit: 'years' }
```

### Date Arithmetic
```js
datetime.evaluate('ADD_DURATION', '2024-01-01', '30_days');
// → { truth: 'TRUE_CERTAIN', date: '2024-01-31T00:00:00.000Z' }
```

### Day of Week
```js
datetime.evaluate('DAY_OF_WEEK', '2024-01-01');
// → { truth: 'TRUE_CERTAIN', value: 1, name: 'Monday' }
```

## Interval Operations

### DURING (point in interval)
```js
datetime.evaluate('DURING', '2024-06-15', { start: '2024-01-01', end: '2024-12-31' });
// → { truth: 'TRUE_CERTAIN', result: true }
```

### OVERLAPS_WITH (interval overlap)
```js
const a = { start: '2024-01-01', end: '2024-06-30' };
const b = { start: '2024-04-01', end: '2024-12-31' };
datetime.evaluate('OVERLAPS_WITH', a, b);
// → { truth: 'TRUE_CERTAIN', result: true }
```

## Notes/Constraints
- All date operations use JavaScript Date (UTC internally).
- Month approximation uses 30 days; year uses 365 days for duration calculations.
- `SIMULTANEOUS_WITH` uses 1 second tolerance for equality.
- Relative dates ('now', 'today') are evaluated at call time.
- Invalid date strings return UNKNOWN rather than throwing.
- Duration formatting prioritizes larger units (years before months before days).
