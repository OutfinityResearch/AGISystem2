/**
 * DateTime Compute Plugin
 *
 * Handles temporal operations and date/time computations:
 * - Temporal comparisons: BEFORE, AFTER, DURING, SIMULTANEOUS
 * - Duration calculations: DURATION_BETWEEN, AGE_OF
 * - Date arithmetic: ADD_DURATION, SUBTRACT_DURATION
 * - Temporal intervals: OVERLAPS, CONTAINS_TIME, STARTS_WITH, ENDS_WITH
 *
 * Supports various date/time formats:
 * - ISO 8601: "2024-01-15T10:30:00Z"
 * - Date only: "2024-01-15"
 * - Year only: "2024"
 * - Relative: "now", "today", "yesterday"
 * - Named: "monday", "january"
 * - Duration: "P1Y2M3D" (ISO 8601 duration), "3_days", "2_hours"
 *
 * DS: DS(/plugins/datetime.js)
 */

class DatetimePlugin {
  constructor() {
    this.name = 'datetime';
    this.relations = [
      'BEFORE',
      'AFTER',
      'DURING',
      'SIMULTANEOUS_WITH',
      'OVERLAPS_WITH',
      'CONTAINS_TIME',
      'STARTS_WITH',
      'ENDS_WITH',
      'DURATION_BETWEEN',
      'AGE_OF',
      'ADD_DURATION',
      'SUBTRACT_DURATION',
      'DAY_OF_WEEK',
      'MONTH_OF',
      'YEAR_OF'
    ];

    // Named day mappings
    this._dayNames = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    };

    // Named month mappings
    this._monthNames = {
      january: 0, february: 1, march: 2, april: 3,
      may: 4, june: 5, july: 6, august: 7,
      september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6,
      aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    // Duration unit mappings (to milliseconds)
    this._durationUnits = {
      millisecond: 1,
      milliseconds: 1,
      ms: 1,
      second: 1000,
      seconds: 1000,
      s: 1000,
      minute: 60000,
      minutes: 60000,
      min: 60000,
      hour: 3600000,
      hours: 3600000,
      h: 3600000,
      day: 86400000,
      days: 86400000,
      d: 86400000,
      week: 604800000,
      weeks: 604800000,
      w: 604800000,
      month: 2592000000, // 30 days approximation
      months: 2592000000,
      year: 31536000000, // 365 days
      years: 31536000000,
      y: 31536000000
    };
  }

  /**
   * Evaluate a datetime relation between two concepts
   *
   * @param {string} relation - The relation to evaluate
   * @param {Object} subject - Subject concept (time/date/duration)
   * @param {Object} object - Object concept (time/date/duration)
   * @returns {Object} Result with truth/value and confidence
   */
  evaluate(relation, subject, object) {
    switch (relation) {
      case 'BEFORE':
        return this._evaluateBefore(subject, object);

      case 'AFTER':
        return this._evaluateAfter(subject, object);

      case 'DURING':
        return this._evaluateDuring(subject, object);

      case 'SIMULTANEOUS_WITH':
        return this._evaluateSimultaneous(subject, object);

      case 'OVERLAPS_WITH':
        return this._evaluateOverlaps(subject, object);

      case 'CONTAINS_TIME':
        return this._evaluateContains(subject, object);

      case 'STARTS_WITH':
        return this._evaluateStartsWith(subject, object);

      case 'ENDS_WITH':
        return this._evaluateEndsWith(subject, object);

      case 'DURATION_BETWEEN':
        return this._evaluateDurationBetween(subject, object);

      case 'AGE_OF':
        return this._evaluateAge(subject, object);

      case 'ADD_DURATION':
        return this._evaluateAddDuration(subject, object);

      case 'SUBTRACT_DURATION':
        return this._evaluateSubtractDuration(subject, object);

      case 'DAY_OF_WEEK':
        return this._evaluateDayOfWeek(subject);

      case 'MONTH_OF':
        return this._evaluateMonthOf(subject);

      case 'YEAR_OF':
        return this._evaluateYearOf(subject);

      default:
        return {
          truth: 'UNKNOWN',
          confidence: 0,
          reason: `Unknown datetime relation: ${relation}`
        };
    }
  }

  /**
   * Parse a datetime from various input formats
   * @returns {Date|null}
   */
  _parseDateTime(input) {
    if (input === null || input === undefined) {
      return null;
    }

    // Already a Date
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }

    // Number (timestamp)
    if (typeof input === 'number') {
      return new Date(input);
    }

    // Object with value or label
    if (typeof input === 'object') {
      if (input.value) return this._parseDateTime(input.value);
      if (input.label) return this._parseDateTime(input.label);
      if (input.date) return this._parseDateTime(input.date);
      if (input.start) return this._parseDateTime(input.start);
    }

    // String parsing
    if (typeof input === 'string') {
      const normalized = input.trim().toLowerCase();

      // Relative dates
      if (normalized === 'now') return new Date();
      if (normalized === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (normalized === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      if (normalized === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      }

      // Try ISO format
      const isoDate = new Date(input);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Try "YYYY" format
      const yearMatch = input.match(/^(\d{4})$/);
      if (yearMatch) {
        return new Date(parseInt(yearMatch[1]), 0, 1);
      }

      // Try "YYYY-MM" format
      const yearMonthMatch = input.match(/^(\d{4})-(\d{1,2})$/);
      if (yearMonthMatch) {
        return new Date(parseInt(yearMonthMatch[1]), parseInt(yearMonthMatch[2]) - 1, 1);
      }

      // Try "year_YYYY" format
      const labelYearMatch = input.match(/year_(\d{4})/i);
      if (labelYearMatch) {
        return new Date(parseInt(labelYearMatch[1]), 0, 1);
      }

      // Try "date_YYYYMMDD" format
      const labelDateMatch = input.match(/date_(\d{4})(\d{2})(\d{2})/i);
      if (labelDateMatch) {
        return new Date(parseInt(labelDateMatch[1]), parseInt(labelDateMatch[2]) - 1, parseInt(labelDateMatch[3]));
      }
    }

    return null;
  }

  /**
   * Parse a duration from various input formats
   * @returns {number|null} Duration in milliseconds
   */
  _parseDuration(input) {
    if (input === null || input === undefined) {
      return null;
    }

    // Number (assume milliseconds)
    if (typeof input === 'number') {
      return input;
    }

    // Object with duration or value
    if (typeof input === 'object') {
      if (input.duration !== undefined) return this._parseDuration(input.duration);
      if (input.value !== undefined && input.unit) {
        return this._parseDurationValue(input.value, input.unit);
      }
    }

    // String parsing
    if (typeof input === 'string') {
      // ISO 8601 duration: P1Y2M3DT4H5M6S
      const isoMatch = input.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
      if (isoMatch) {
        const years = parseInt(isoMatch[1] || 0);
        const months = parseInt(isoMatch[2] || 0);
        const days = parseInt(isoMatch[3] || 0);
        const hours = parseInt(isoMatch[4] || 0);
        const minutes = parseInt(isoMatch[5] || 0);
        const seconds = parseInt(isoMatch[6] || 0);

        return (years * 31536000000) +
               (months * 2592000000) +
               (days * 86400000) +
               (hours * 3600000) +
               (minutes * 60000) +
               (seconds * 1000);
      }

      // "value_unit" format: 3_days, 2_hours
      const valueUnitMatch = input.match(/^(\d+\.?\d*)_([a-z]+)$/i);
      if (valueUnitMatch) {
        return this._parseDurationValue(parseFloat(valueUnitMatch[1]), valueUnitMatch[2].toLowerCase());
      }

      // "valueunit" format: 3days, 2h
      const compactMatch = input.match(/^(\d+\.?\d*)([a-z]+)$/i);
      if (compactMatch) {
        return this._parseDurationValue(parseFloat(compactMatch[1]), compactMatch[2].toLowerCase());
      }
    }

    return null;
  }

  /**
   * Convert a duration value and unit to milliseconds
   */
  _parseDurationValue(value, unit) {
    const multiplier = this._durationUnits[unit.toLowerCase()];
    if (multiplier === undefined) {
      return null;
    }
    return value * multiplier;
  }

  /**
   * Format a duration in milliseconds to human-readable string
   */
  _formatDuration(ms) {
    if (ms < 0) ms = -ms;

    const years = Math.floor(ms / 31536000000);
    ms %= 31536000000;
    const months = Math.floor(ms / 2592000000);
    ms %= 2592000000;
    const days = Math.floor(ms / 86400000);
    ms %= 86400000;
    const hours = Math.floor(ms / 3600000);
    ms %= 3600000;
    const minutes = Math.floor(ms / 60000);
    ms %= 60000;
    const seconds = Math.floor(ms / 1000);

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}mo`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
  }

  /**
   * Parse a time interval (start and end)
   * @returns {Object|null} { start: Date, end: Date }
   */
  _parseInterval(input) {
    if (typeof input === 'object' && input.start && input.end) {
      return {
        start: this._parseDateTime(input.start),
        end: this._parseDateTime(input.end)
      };
    }

    // Try "start/end" format (ISO 8601 interval)
    if (typeof input === 'string' && input.includes('/')) {
      const [startStr, endStr] = input.split('/');
      return {
        start: this._parseDateTime(startStr),
        end: this._parseDateTime(endStr)
      };
    }

    return null;
  }

  // =========================================================================
  // Temporal Comparison Operations
  // =========================================================================

  /**
   * BEFORE: subject occurs before object
   */
  _evaluateBefore(subject, object) {
    const a = this._parseDateTime(subject);
    const b = this._parseDateTime(object);

    if (!a || !b) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot parse dates: subject=${subject}, object=${object}`
      };
    }

    const before = a.getTime() < b.getTime();
    const diff = b.getTime() - a.getTime();

    return {
      truth: before ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      value: diff,
      result: before,
      computed: `${a.toISOString()} BEFORE ${b.toISOString()} = ${before}`,
      difference: this._formatDuration(diff)
    };
  }

  /**
   * AFTER: subject occurs after object
   */
  _evaluateAfter(subject, object) {
    const a = this._parseDateTime(subject);
    const b = this._parseDateTime(object);

    if (!a || !b) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot parse dates: subject=${subject}, object=${object}`
      };
    }

    const after = a.getTime() > b.getTime();
    const diff = a.getTime() - b.getTime();

    return {
      truth: after ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      value: diff,
      result: after,
      computed: `${a.toISOString()} AFTER ${b.toISOString()} = ${after}`,
      difference: this._formatDuration(diff)
    };
  }

  /**
   * DURING: subject occurs during object interval
   */
  _evaluateDuring(subject, object) {
    const point = this._parseDateTime(subject);
    const interval = this._parseInterval(object);

    if (!point) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot parse subject date: ${subject}`
      };
    }

    if (!interval || !interval.start || !interval.end) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: `Cannot parse interval from object: ${JSON.stringify(object)}`
      };
    }

    const during = point.getTime() >= interval.start.getTime() &&
                   point.getTime() <= interval.end.getTime();

    return {
      truth: during ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      result: during,
      computed: `${point.toISOString()} DURING [${interval.start.toISOString()}, ${interval.end.toISOString()}] = ${during}`
    };
  }

  /**
   * SIMULTANEOUS_WITH: same time (within tolerance)
   */
  _evaluateSimultaneous(subject, object) {
    const a = this._parseDateTime(subject);
    const b = this._parseDateTime(object);

    if (!a || !b) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse dates'
      };
    }

    const diff = Math.abs(a.getTime() - b.getTime());
    const tolerance = 1000; // 1 second tolerance
    const simultaneous = diff <= tolerance;

    return {
      truth: simultaneous ? 'TRUE_CERTAIN' : (diff < 60000 ? 'TRUE_LIKELY' : 'FALSE'),
      confidence: simultaneous ? 1.0 : Math.max(0, 1 - diff / 86400000),
      value: diff,
      result: simultaneous,
      computed: `SIMULTANEOUS(${a.toISOString()}, ${b.toISOString()}) = ${simultaneous} (diff=${this._formatDuration(diff)})`
    };
  }

  /**
   * OVERLAPS_WITH: two intervals overlap
   */
  _evaluateOverlaps(subject, object) {
    const a = this._parseInterval(subject);
    const b = this._parseInterval(object);

    if (!a || !b || !a.start || !a.end || !b.start || !b.end) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse intervals'
      };
    }

    const overlaps = a.start.getTime() <= b.end.getTime() &&
                     a.end.getTime() >= b.start.getTime();

    return {
      truth: overlaps ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      result: overlaps,
      computed: `OVERLAPS([${a.start.toISOString()}, ${a.end.toISOString()}], [${b.start.toISOString()}, ${b.end.toISOString()}]) = ${overlaps}`
    };
  }

  /**
   * CONTAINS_TIME: interval contains point
   */
  _evaluateContains(subject, object) {
    const interval = this._parseInterval(subject);
    const point = this._parseDateTime(object);

    if (!interval || !interval.start || !interval.end) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse interval'
      };
    }

    if (!point) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse point'
      };
    }

    const contains = point.getTime() >= interval.start.getTime() &&
                     point.getTime() <= interval.end.getTime();

    return {
      truth: contains ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      result: contains
    };
  }

  /**
   * STARTS_WITH: intervals share start time
   */
  _evaluateStartsWith(subject, object) {
    const a = this._parseInterval(subject) || { start: this._parseDateTime(subject) };
    const b = this._parseInterval(object) || { start: this._parseDateTime(object) };

    if (!a.start || !b.start) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse start times'
      };
    }

    const sameStart = a.start.getTime() === b.start.getTime();

    return {
      truth: sameStart ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      result: sameStart
    };
  }

  /**
   * ENDS_WITH: intervals share end time
   */
  _evaluateEndsWith(subject, object) {
    const a = this._parseInterval(subject) || { end: this._parseDateTime(subject) };
    const b = this._parseInterval(object) || { end: this._parseDateTime(object) };

    if (!a.end || !b.end) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse end times'
      };
    }

    const sameEnd = a.end.getTime() === b.end.getTime();

    return {
      truth: sameEnd ? 'TRUE_CERTAIN' : 'FALSE',
      confidence: 1.0,
      result: sameEnd
    };
  }

  // =========================================================================
  // Duration Operations
  // =========================================================================

  /**
   * DURATION_BETWEEN: calculate duration between two dates
   */
  _evaluateDurationBetween(subject, object) {
    const a = this._parseDateTime(subject);
    const b = this._parseDateTime(object);

    if (!a || !b) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse dates'
      };
    }

    const durationMs = b.getTime() - a.getTime();

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: durationMs,
      unit: 'milliseconds',
      formatted: this._formatDuration(durationMs),
      computed: `DURATION_BETWEEN(${a.toISOString()}, ${b.toISOString()}) = ${this._formatDuration(durationMs)}`
    };
  }

  /**
   * AGE_OF: calculate age from birth date to now (or reference date)
   */
  _evaluateAge(subject, object) {
    const birthDate = this._parseDateTime(subject);
    const referenceDate = object ? this._parseDateTime(object) : new Date();

    if (!birthDate) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse birth date'
      };
    }

    if (!referenceDate) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse reference date'
      };
    }

    const ageMs = referenceDate.getTime() - birthDate.getTime();
    const ageYears = ageMs / 31536000000;

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: Math.floor(ageYears),
      unit: 'years',
      precise: ageYears,
      computed: `AGE_OF(${birthDate.toISOString()}) = ${Math.floor(ageYears)} years`
    };
  }

  /**
   * ADD_DURATION: add duration to date
   */
  _evaluateAddDuration(subject, object) {
    const date = this._parseDateTime(subject);
    const duration = this._parseDuration(object);

    if (!date) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse date'
      };
    }

    if (duration === null) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse duration'
      };
    }

    const result = new Date(date.getTime() + duration);

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: result.getTime(),
      date: result.toISOString(),
      computed: `${date.toISOString()} + ${this._formatDuration(duration)} = ${result.toISOString()}`
    };
  }

  /**
   * SUBTRACT_DURATION: subtract duration from date
   */
  _evaluateSubtractDuration(subject, object) {
    const date = this._parseDateTime(subject);
    const duration = this._parseDuration(object);

    if (!date) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse date'
      };
    }

    if (duration === null) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse duration'
      };
    }

    const result = new Date(date.getTime() - duration);

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: result.getTime(),
      date: result.toISOString(),
      computed: `${date.toISOString()} - ${this._formatDuration(duration)} = ${result.toISOString()}`
    };
  }

  // =========================================================================
  // Date Component Extraction
  // =========================================================================

  /**
   * DAY_OF_WEEK: get day of week for a date
   */
  _evaluateDayOfWeek(subject) {
    const date = this._parseDateTime(subject);

    if (!date) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse date'
      };
    }

    const dayIndex = date.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: dayIndex,
      name: dayNames[dayIndex],
      computed: `DAY_OF_WEEK(${date.toISOString()}) = ${dayNames[dayIndex]} (${dayIndex})`
    };
  }

  /**
   * MONTH_OF: get month for a date
   */
  _evaluateMonthOf(subject) {
    const date = this._parseDateTime(subject);

    if (!date) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse date'
      };
    }

    const monthIndex = date.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: monthIndex + 1, // 1-indexed for human readability
      name: monthNames[monthIndex],
      computed: `MONTH_OF(${date.toISOString()}) = ${monthNames[monthIndex]} (${monthIndex + 1})`
    };
  }

  /**
   * YEAR_OF: get year for a date
   */
  _evaluateYearOf(subject) {
    const date = this._parseDateTime(subject);

    if (!date) {
      return {
        truth: 'UNKNOWN',
        confidence: 0,
        reason: 'Cannot parse date'
      };
    }

    return {
      truth: 'TRUE_CERTAIN',
      confidence: 1.0,
      value: date.getFullYear(),
      computed: `YEAR_OF(${date.toISOString()}) = ${date.getFullYear()}`
    };
  }

  /**
   * Check if a computation can be performed
   */
  canCompute(relation, subject, object) {
    // Temporal comparisons need two parseable dates
    if (['BEFORE', 'AFTER', 'SIMULTANEOUS_WITH', 'DURATION_BETWEEN'].includes(relation)) {
      return this._parseDateTime(subject) !== null && this._parseDateTime(object) !== null;
    }

    // Duration arithmetic needs date and duration
    if (['ADD_DURATION', 'SUBTRACT_DURATION'].includes(relation)) {
      return this._parseDateTime(subject) !== null && this._parseDuration(object) !== null;
    }

    // Interval operations need parseable intervals
    if (['DURING', 'OVERLAPS_WITH', 'CONTAINS_TIME'].includes(relation)) {
      return true; // Complex check handled in evaluate
    }

    // Single date operations
    if (['DAY_OF_WEEK', 'MONTH_OF', 'YEAR_OF', 'AGE_OF'].includes(relation)) {
      return this._parseDateTime(subject) !== null;
    }

    return true;
  }
}

module.exports = DatetimePlugin;
