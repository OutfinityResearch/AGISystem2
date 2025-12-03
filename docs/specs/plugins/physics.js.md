# Design Spec: src/plugins/physics.js

ID: DS(/plugins/physics.js)

Class `PhysicsPlugin`
- **Role**: Compute plugin that handles physical computations including unit conversions (temperature, length, mass, time, volume) and physical calculations (density, speed, force, energy).
- **Pattern**: Strategy. SOLID: single responsibility for physics computation; stateless evaluation.
- **Key Collaborators**: `PluginRegistry` (registration), concept labels with units.

## Public API

- `name`: String identifier `'physics'`
- `relations`: Array of handled relations
- `evaluate(relation, subject, object)`: Compute result for given relation
- `canCompute(relation, subject, object)`: Check if values can be extracted for computation

## Supported Relations

| Relation | Description | Example |
|----------|-------------|---------|
| `CONVERTS_TO` | Unit conversion | `celsius_100 CONVERTS_TO fahrenheit` → { value: 212 } |
| `HAS_TEMPERATURE` | Temperature property | `water HAS_TEMPERATURE celsius_100` |
| `HAS_MASS` | Mass property | `object HAS_MASS kg_5` |
| `HAS_LENGTH` | Length property | `road HAS_LENGTH km_100` |
| `HAS_VOLUME` | Volume property | `tank HAS_VOLUME liter_1000` |
| `HAS_DENSITY` | Density property | `material HAS_DENSITY 2.5` |
| `HAS_SPEED` | Speed property | `car HAS_SPEED 100` |
| `HAS_FORCE` | Force property | `impact HAS_FORCE newton_500` |
| `HAS_ENERGY` | Energy property | `system HAS_ENERGY joule_1000` |
| `DENSITY_OF` | Calculate density = mass/volume | `? DENSITY_OF { mass: kg_1000, volume: liter_1000 }` |
| `SPEED_OF` | Calculate speed = distance/time | `? SPEED_OF { distance: km_100, time: hour_2 }` |
| `FORCE_OF` | Calculate force = mass * acceleration | `? FORCE_OF { mass: kg_10, acceleration: 9.8 }` |
| `ENERGY_OF` | Calculate kinetic energy = 0.5 * m * v² | `? ENERGY_OF { mass: kg_1, velocity: 10 }` |

## Unit Conversion Tables

### Temperature
| Unit | To Kelvin | From Kelvin |
|------|-----------|-------------|
| celsius | K = C + 273.15 | C = K - 273.15 |
| fahrenheit | K = (F - 32) × 5/9 + 273.15 | F = (K - 273.15) × 9/5 + 32 |
| kelvin | K = K | K = K |

### Length (to meters)
| Unit | Factor |
|------|--------|
| meter, m | 1 |
| kilometer, km | 1000 |
| centimeter, cm | 0.01 |
| millimeter, mm | 0.001 |
| mile | 1609.34 |
| foot, feet | 0.3048 |
| inch | 0.0254 |
| yard | 0.9144 |

### Mass (to kilograms)
| Unit | Factor |
|------|--------|
| kilogram, kg | 1 |
| gram, g | 0.001 |
| milligram, mg | 0.000001 |
| pound, lb | 0.453592 |
| ounce, oz | 0.0283495 |
| ton, tonne | 1000 |

### Time (to seconds)
| Unit | Factor |
|------|--------|
| second, s | 1 |
| minute, min | 60 |
| hour, h | 3600 |
| day | 86400 |
| week | 604800 |
| year | 31536000 |

### Volume (to cubic meters)
| Unit | Factor |
|------|--------|
| liter, l | 0.001 |
| milliliter, ml | 0.000001 |
| cubic_meter, m3 | 1 |
| gallon | 0.00378541 |
| cup | 0.000236588 |

## Value Parsing Formats

| Pattern | Example | Result |
|---------|---------|--------|
| unit_value | `celsius_100` | { unit: 'celsius', value: 100 } |
| value_unit | `100_celsius` | { value: 100, unit: 'celsius' } |
| valueunit | `100kg` | { value: 100, unit: 'kg' } |
| unit only | `fahrenheit` | { value: null, unit: 'fahrenheit' } |
| number only | `42` | { value: 42, unit: null } |

## Pseudocode

```js
class PhysicsPlugin {
  constructor() {
    this.name = 'physics';
    this.relations = [
      'CONVERTS_TO', 'HAS_TEMPERATURE', 'HAS_MASS', 'HAS_LENGTH',
      'HAS_VOLUME', 'HAS_DENSITY', 'HAS_SPEED', 'HAS_FORCE', 'HAS_ENERGY',
      'DENSITY_OF', 'SPEED_OF', 'FORCE_OF', 'ENERGY_OF'
    ];
    // Initialize unit conversion tables...
  }

  evaluate(relation, subject, object) {
    switch (relation) {
      case 'CONVERTS_TO':
        return this._evaluateConversion(subject, object);
      case 'DENSITY_OF':
        return this._evaluateDensity(subject, object);
      case 'SPEED_OF':
        return this._evaluateSpeed(subject, object);
      // ... other cases
    }
  }

  _parseValueWithUnit(input) {
    // Parse various formats: "celsius_100", "100_kg", "100kg", "fahrenheit", "42"
    // Returns { value: number|null, unit: string|null }
  }

  _evaluateConversion(subject, object) {
    const from = this._parseValueWithUnit(subject);
    const to = this._parseValueWithUnit(object);
    // Convert via SI base units (Kelvin for temp, meters for length, etc.)
    // Return { truth, confidence, value, unit, computed }
  }
}
```

## Physical Calculation Examples

### Density
```
DENSITY_OF with { mass: 'kg_1000', volume: 'liter_1000' }
→ 1000 kg / 1 m³ = 1000 kg/m³
```

### Speed
```
SPEED_OF with { distance: 'km_100', time: 'hour_2' }
→ 100000 m / 7200 s = 13.89 m/s
```

### Force (F = ma)
```
FORCE_OF with { mass: 'kg_10', acceleration: 9.8 }
→ 10 kg × 9.8 m/s² = 98 N
```

### Kinetic Energy (E = ½mv²)
```
ENERGY_OF with { mass: 'kg_1', velocity: 10 }
→ 0.5 × 1 kg × (10 m/s)² = 50 J
```

## Notes/Constraints
- All computations convert to SI base units before calculation.
- Temperature uses Kelvin as intermediate for all conversions.
- Division by zero (e.g., zero volume for density) returns FALSE with error.
- Unknown units return UNKNOWN rather than throwing.
- Unit parsing is case-insensitive.
