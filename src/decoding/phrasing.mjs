/**
 * AGISystem2 - Phrasing Templates
 * @module decoding/phrasing
 *
 * Converts structured representations to natural language.
 */

// Phrasing templates for common operators
const TEMPLATES = {
  // Basic relations
  loves: {
    pattern: '{Pos1} loves {Pos2}.',
    positions: [1, 2]
  },
  likes: {
    pattern: '{Pos1} likes {Pos2}.',
    positions: [1, 2]
  },
  hates: {
    pattern: '{Pos1} hates {Pos2}.',
    positions: [1, 2]
  },
  knows: {
    pattern: '{Pos1} knows {Pos2}.',
    positions: [1, 2]
  },

  // Family relations
  parent: {
    pattern: '{Pos1} is a parent of {Pos2}.',
    positions: [1, 2]
  },
  child: {
    pattern: '{Pos1} is a child of {Pos2}.',
    positions: [1, 2]
  },
  sibling: {
    pattern: '{Pos1} is a sibling of {Pos2}.',
    positions: [1, 2]
  },

  // Classification
  isA: {
    pattern: '{Pos1} is a {Pos2}.',
    positions: [1, 2]
  },
  hasProperty: {
    pattern: '{Pos1} has property {Pos2}.',
    positions: [1, 2]
  },
  belongsTo: {
    pattern: '{Pos1} belongs to {Pos2}.',
    positions: [1, 2]
  },

  // Commerce
  sells: {
    pattern: '{Pos1} sells {Pos2} to {Pos3}.',
    positions: [1, 2, 3]
  },
  buys: {
    pattern: '{Pos1} buys {Pos2} from {Pos3}.',
    positions: [1, 2, 3]
  },
  owns: {
    pattern: '{Pos1} owns {Pos2}.',
    positions: [1, 2]
  },

  // Comparison
  greaterThan: {
    pattern: '{Pos1} is greater than {Pos2}.',
    positions: [1, 2]
  },
  lessThan: {
    pattern: '{Pos1} is less than {Pos2}.',
    positions: [1, 2]
  },
  equals: {
    pattern: '{Pos1} equals {Pos2}.',
    positions: [1, 2]
  },

  // Logical operators
  Implies: {
    pattern: 'If {Pos1} then {Pos2}.',
    positions: [1, 2],
    type: 'rule'
  },
  And: {
    pattern: '{Pos1} and {Pos2}.',
    positions: [1, 2],
    type: 'compound'
  },
  Or: {
    pattern: '{Pos1} or {Pos2}.',
    positions: [1, 2],
    type: 'compound'
  },
  Not: {
    pattern: 'Not {Pos1}.',
    positions: [1],
    type: 'compound'
  }
};

export class PhrasingEngine {
  constructor() {
    this.templates = new Map(Object.entries(TEMPLATES));
    this.customTemplates = new Map();
  }

  /**
   * Register custom template
   * @param {string} operator - Operator name
   * @param {string} pattern - Template pattern with {Pos1}, {Pos2}, etc.
   */
  registerTemplate(operator, pattern) {
    // Extract position markers
    const positionMatches = pattern.match(/\{Pos(\d+)\}/g) || [];
    const positions = positionMatches.map(m => parseInt(m.match(/\d+/)[0]));

    this.customTemplates.set(operator, { pattern, positions });
  }

  /**
   * Get template for operator
   * @param {string} operator - Operator name
   * @returns {Object|null}
   */
  getTemplate(operator) {
    if (this.customTemplates.has(operator)) {
      return this.customTemplates.get(operator);
    }
    return this.templates.get(operator) || null;
  }

  /**
   * Generate text from decoded structure
   * @param {DecodedStructure} structure - Decoded structure
   * @returns {string}
   */
  generateText(structure) {
    const { operator, arguments: args } = structure;
    const template = this.getTemplate(operator);

    if (template) {
      return this.applyTemplate(template, args);
    }

    // Fallback: generic phrasing
    return this.genericPhrase(operator, args);
  }

  /**
   * Apply template with arguments
   */
  applyTemplate(template, args) {
    let text = template.pattern;

    // Create position to value map
    const posMap = new Map();
    for (const arg of args) {
      if (arg.nested) {
        // Recursively generate text for nested structures
        posMap.set(arg.position, this.generateText(arg.nested));
      } else {
        posMap.set(arg.position, arg.value);
      }
    }

    // Replace position markers
    for (const pos of template.positions) {
      const value = posMap.get(pos) || '?';
      text = text.replace(`{Pos${pos}}`, value);
    }

    return text;
  }

  /**
   * Generate generic phrase when no template exists
   */
  genericPhrase(operator, args) {
    const values = args
      .sort((a, b) => a.position - b.position)
      .map(a => a.nested ? this.generateText(a.nested) : a.value);

    if (values.length === 0) {
      return `${operator}.`;
    }
    if (values.length === 1) {
      return `${values[0]} is ${operator}.`;
    }
    if (values.length === 2) {
      return `${values[0]} ${operator} ${values[1]}.`;
    }

    // Multiple arguments
    const lastArg = values.pop();
    return `${operator}(${values.join(', ')}, ${lastArg}).`;
  }

  /**
   * List all available operators
   */
  listOperators() {
    const operators = [
      ...this.templates.keys(),
      ...this.customTemplates.keys()
    ];
    return [...new Set(operators)];
  }
}

export default PhrasingEngine;
