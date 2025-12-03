/**
 * Physics Compute Plugin
 *
 * Handles physical computations including:
 * - Unit conversions (temperature, length, mass, time, etc.)
 * - Physical calculations (density, speed, force, energy)
 * - Dimensional analysis
 *
 * Relations handled:
 * - CONVERTS_TO: Unit conversion (e.g., celsius_100 CONVERTS_TO fahrenheit_212)
 * - HAS_TEMPERATURE, HAS_MASS, HAS_LENGTH, HAS_VOLUME: Property access
 * - DENSITY_OF: Computes density = mass / volume
 * - SPEED_OF: Computes speed = distance / time
 * - FORCE_OF: F = m * a
 * - ENERGY_OF: Various energy calculations
 *
 * DS: DS(/plugins/physics.js)
 */

class PhysicsPlugin {
  constructor() {
    this.name = 'physics';
    this.relations = [
      'CONVERTS_TO',
      'HAS_TEMPERATURE',
      'HAS_MASS',
      'HAS_LENGTH',
      'HAS_VOLUME',
      'HAS_DENSITY',
      'HAS_SPEED',
      'HAS_FORCE',
      'HAS_ENERGY',
      'DENSITY_OF',
      'SPEED_OF',
      'FORCE_OF',
      'ENERGY_OF'
    ];

    // Unit conversion tables
    this._temperatureUnits = {
      celsius: { toKelvin: (c) => c + 273.15, fromKelvin: (k) => k - 273.15 },
      fahrenheit: { toKelvin: (f) => (f - 32) * 5/9 + 273.15, fromKelvin: (k) => (k - 273.15) * 9/5 + 32 },
      kelvin: { toKelvin: (k) => k, fromKelvin: (k) => k }
    };

    this._lengthUnits = {
      meter: 1,
      meters: 1,
      m: 1,
      kilometer: 1000,
      km: 1000,
      centimeter: 0.01,
      cm: 0.01,
      millimeter: 0.001,
      mm: 0.001,
      mile: 1609.34,
      foot: 0.3048,
      feet: 0.3048,
      inch: 0.0254,
      yard: 0.9144
    };

    this._massUnits = {
      kilogram: 1,
      kg: 1,
      gram: 0.001,
      g: 0.001,
      milligram: 0.000001,
      mg: 0.000001,
      pound: 0.453592,
      lb: 0.453592,
      ounce: 0.0283495,
      oz: 0.0283495,
      ton: 1000,
      tonne: 1000
    };

    this._timeUnits = {
      second: 1,
      seconds: 1,
      s: 1,
      minute: 60,
      minutes: 60,
      min: 60,
      hour: 3600,
      hours: 3600,
      h: 3600,
      day: 86400,
      days: 86400,
      week: 604800,
      year: 31536000
    };

    this._volumeUnits = {
      liter: 0.001,
      liters: 0.001,
      l: 0.001,
      milliliter: 0.000001,
      ml: 0.000001,
      cubic_meter: 1,
      m3: 1,
      gallon: 0.00378541,
      cup: 0.000236588
    };
  }

  /**
   * Evaluate a physics relation between two concepts
   *
   * @param {string} relation - The relation to evaluate
   * @param {Object} subject - Subject concept
   * @param {Object} object - Object concept
   * @returns {Object} Result with truth/value and confidence
   */
  evaluate(relation, subject, object) {
    switch (relation) {
      case 'CONVERTS_TO':
        return this._evaluateConversion(subject, object);

      case 'HAS_TEMPERATURE':
      case 'HAS_MASS':
      case 'HAS_LENGTH':
      case 'HAS_VOLUME':
      case 'HAS_DENSITY':
      case 'HAS_SPEED':
      case 'HAS_FORCE':
      case 'HAS_ENERGY':
        return this._evaluateHasProperty(relation, subject, object);

      case 'DENSITY_OF':
        return this._evaluateDensity(subject, object);

      case 'SPEED_OF':
        return this._evaluateSpeed(subject, object);

      case 'FORCE_OF':
        return this._evaluateForce(subject, object);

      case 'ENERGY_OF':
        return this._evaluateEnergy(subject, object);

      default:
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown physics relation: ${relation}`
        };
    }
  }

  /**
   * Parse a value with unit from a concept label
   * Formats: "celsius_100", "100_kg", "100kg", "100", etc.
   */
  _parseValueWithUnit(input) {
    if (input === null || input === undefined) {
      return null;
    }

    let label = typeof input === 'string' ? input : (input.label || input.raw || String(input.value));
    label = label.toLowerCase();

    // Try "unit_value" format: celsius_100, meter_5
    const unitValueMatch = label.match(/^([a-z_]+)_(-?\d+\.?\d*)$/);
    if (unitValueMatch) {
      return { unit: unitValueMatch[1], value: parseFloat(unitValueMatch[2]) };
    }

    // Try "value_unit" format: 100_celsius, 5_meters
    const valueUnitMatch = label.match(/^(-?\d+\.?\d*)_([a-z_]+)$/);
    if (valueUnitMatch) {
      return { value: parseFloat(valueUnitMatch[1]), unit: valueUnitMatch[2] };
    }

    // Try "valueunit" format: 100kg, 5m
    const compactMatch = label.match(/^(-?\d+\.?\d*)([a-z]+)$/);
    if (compactMatch) {
      return { value: parseFloat(compactMatch[1]), unit: compactMatch[2] };
    }

    // Pure number
    const numMatch = label.match(/^(-?\d+\.?\d*)$/);
    if (numMatch) {
      return { value: parseFloat(numMatch[1]), unit: null };
    }

    // Pure unit (letters only) - used for target unit in conversions
    const unitOnlyMatch = label.match(/^([a-z_]+)$/);
    if (unitOnlyMatch) {
      return { value: null, unit: unitOnlyMatch[1] };
    }

    return null;
  }

  /**
   * Evaluate unit conversion (e.g., celsius_100 CONVERTS_TO fahrenheit_?)
   */
  _evaluateConversion(subject, object) {
    const from = this._parseValueWithUnit(subject);
    const to = this._parseValueWithUnit(object);

    if (!from) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot parse source value: ${JSON.stringify(subject)}`
      };
    }

    if (!from.unit) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Source must have a unit for conversion'
      };
    }

    // Temperature conversion
    if (this._temperatureUnits[from.unit]) {
      const targetUnit = to?.unit || 'kelvin';
      if (!this._temperatureUnits[targetUnit]) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown temperature unit: ${targetUnit}`
        };
      }

      const kelvin = this._temperatureUnits[from.unit].toKelvin(from.value);
      const converted = this._temperatureUnits[targetUnit].fromKelvin(kelvin);

      // If target has a numeric value, check if conversion matches
      if (typeof to?.value === 'number') {
        const epsilon = 0.01;
        const matches = Math.abs(converted - to.value) < epsilon;
        return {
          truth: matches ? 'TRUE_CERTAIN' : 'FALSE',
          confidence: 1.0,
          value: converted,
          computed: `${from.value} ${from.unit} = ${converted.toFixed(2)} ${targetUnit}`,
          result: matches
        };
      }

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: converted,
        unit: targetUnit,
        computed: `${from.value} ${from.unit} = ${converted.toFixed(2)} ${targetUnit}`
      };
    }

    // Length conversion
    if (this._lengthUnits[from.unit]) {
      const targetUnit = to?.unit || 'meter';
      if (!this._lengthUnits[targetUnit]) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown length unit: ${targetUnit}`
        };
      }

      const meters = from.value * this._lengthUnits[from.unit];
      const converted = meters / this._lengthUnits[targetUnit];

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: converted,
        unit: targetUnit,
        computed: `${from.value} ${from.unit} = ${converted.toFixed(4)} ${targetUnit}`
      };
    }

    // Mass conversion
    if (this._massUnits[from.unit]) {
      const targetUnit = to?.unit || 'kilogram';
      if (!this._massUnits[targetUnit]) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown mass unit: ${targetUnit}`
        };
      }

      const kg = from.value * this._massUnits[from.unit];
      const converted = kg / this._massUnits[targetUnit];

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: converted,
        unit: targetUnit,
        computed: `${from.value} ${from.unit} = ${converted.toFixed(4)} ${targetUnit}`
      };
    }

    // Time conversion
    if (this._timeUnits[from.unit]) {
      const targetUnit = to?.unit || 'second';
      if (!this._timeUnits[targetUnit]) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown time unit: ${targetUnit}`
        };
      }

      const seconds = from.value * this._timeUnits[from.unit];
      const converted = seconds / this._timeUnits[targetUnit];

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: converted,
        unit: targetUnit,
        computed: `${from.value} ${from.unit} = ${converted.toFixed(4)} ${targetUnit}`
      };
    }

    // Volume conversion
    if (this._volumeUnits[from.unit]) {
      const targetUnit = to?.unit || 'liter';
      if (!this._volumeUnits[targetUnit]) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown volume unit: ${targetUnit}`
        };
      }

      const m3 = from.value * this._volumeUnits[from.unit];
      const converted = m3 / this._volumeUnits[targetUnit];

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: converted,
        unit: targetUnit,
        computed: `${from.value} ${from.unit} = ${converted.toFixed(4)} ${targetUnit}`
      };
    }

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      reason: `Unknown unit type: ${from.unit}`
    };
  }

  /**
   * Evaluate HAS_* property relations
   */
  _evaluateHasProperty(relation, subject, object) {
    const parsed = this._parseValueWithUnit(object);

    if (!parsed) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot parse value: ${JSON.stringify(object)}`
      };
    }

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: parsed.value,
      unit: parsed.unit,
      property: relation.replace('HAS_', '').toLowerCase()
    };
  }

  /**
   * Calculate density from mass and volume
   * Object should contain { mass, volume } or facts with these properties
   */
  _evaluateDensity(subject, object) {
    // Object can be { mass: { value, unit }, volume: { value, unit } }
    if (typeof object === 'object' && object.mass && object.volume) {
      const mass = this._parseValueWithUnit(object.mass);
      const volume = this._parseValueWithUnit(object.volume);

      if (!mass || !volume) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: 'Cannot parse mass or volume'
        };
      }

      // Convert to SI units (kg, m³)
      const massKg = mass.unit && this._massUnits[mass.unit]
        ? mass.value * this._massUnits[mass.unit]
        : mass.value;
      const volumeM3 = volume.unit && this._volumeUnits[volume.unit]
        ? volume.value * this._volumeUnits[volume.unit]
        : volume.value;

      if (volumeM3 === 0) {
        return {
          truth: 'FALSE',
          confidence: 1.0,
          reason: 'Division by zero: volume cannot be zero',
          error: 'DIVISION_BY_ZERO'
        };
      }

      const density = massKg / volumeM3;

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: density,
        unit: 'kg/m³',
        computed: `density = ${massKg} kg / ${volumeM3} m³ = ${density.toFixed(2)} kg/m³`
      };
    }

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      reason: 'DENSITY_OF requires { mass, volume } object'
    };
  }

  /**
   * Calculate speed from distance and time
   */
  _evaluateSpeed(subject, object) {
    if (typeof object === 'object' && object.distance && object.time) {
      const distance = this._parseValueWithUnit(object.distance);
      const time = this._parseValueWithUnit(object.time);

      if (!distance || !time) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: 'Cannot parse distance or time'
        };
      }

      // Convert to SI units (m, s)
      const distanceM = distance.unit && this._lengthUnits[distance.unit]
        ? distance.value * this._lengthUnits[distance.unit]
        : distance.value;
      const timeS = time.unit && this._timeUnits[time.unit]
        ? time.value * this._timeUnits[time.unit]
        : time.value;

      if (timeS === 0) {
        return {
          truth: 'FALSE',
          confidence: 1.0,
          reason: 'Division by zero: time cannot be zero',
          error: 'DIVISION_BY_ZERO'
        };
      }

      const speed = distanceM / timeS;

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: speed,
        unit: 'm/s',
        computed: `speed = ${distanceM} m / ${timeS} s = ${speed.toFixed(2)} m/s`
      };
    }

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      reason: 'SPEED_OF requires { distance, time } object'
    };
  }

  /**
   * Calculate force (F = m * a)
   */
  _evaluateForce(subject, object) {
    if (typeof object === 'object' && object.mass && object.acceleration) {
      const mass = this._parseValueWithUnit(object.mass);
      const accel = this._parseValueWithUnit(object.acceleration);

      if (!mass || !accel) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: 'Cannot parse mass or acceleration'
        };
      }

      const massKg = mass.unit && this._massUnits[mass.unit]
        ? mass.value * this._massUnits[mass.unit]
        : mass.value;
      const accelMS2 = accel.value; // Assume m/s²

      const force = massKg * accelMS2;

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: force,
        unit: 'N',
        computed: `F = ${massKg} kg × ${accelMS2} m/s² = ${force.toFixed(2)} N`
      };
    }

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      reason: 'FORCE_OF requires { mass, acceleration } object'
    };
  }

  /**
   * Calculate energy (kinetic: E = 0.5 * m * v²)
   */
  _evaluateEnergy(subject, object) {
    if (typeof object === 'object' && object.mass && object.velocity) {
      const mass = this._parseValueWithUnit(object.mass);
      const velocity = this._parseValueWithUnit(object.velocity);

      if (!mass || !velocity) {
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: 'Cannot parse mass or velocity'
        };
      }

      const massKg = mass.unit && this._massUnits[mass.unit]
        ? mass.value * this._massUnits[mass.unit]
        : mass.value;
      const velocityMS = velocity.value; // Assume m/s

      const energy = 0.5 * massKg * velocityMS * velocityMS;

      return {
        truth: 'TRUE_CERTAIN',
        confidence: 1.0,
        value: energy,
        unit: 'J',
        computed: `E = 0.5 × ${massKg} kg × (${velocityMS} m/s)² = ${energy.toFixed(2)} J`
      };
    }

    return {
      truth: 'UNKNOWN',
      confidence: 0,
      reason: 'ENERGY_OF requires { mass, velocity } object for kinetic energy'
    };
  }

  /**
   * Check if a computation can be performed
   */
  canCompute(relation, subject, object) {
    if (relation === 'CONVERTS_TO') {
      const from = this._parseValueWithUnit(subject);
      return from !== null && from.unit !== null;
    }

    if (relation.startsWith('HAS_')) {
      return this._parseValueWithUnit(object) !== null;
    }

    return true;
  }
}

module.exports = PhysicsPlugin;
