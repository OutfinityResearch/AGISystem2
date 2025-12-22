/**
 * AGISystem2 - Text Generator
 * @module output/text-generator
 *
 * Generates natural language text from DSL structures.
 */

/**
 * Text generator for converting DSL to natural language
 */
export class TextGenerator {
  constructor() {
    // Helper: select "a" or "an" based on word
    this.article = (word) => /^[aeiou]/i.test(word) ? 'an' : 'a';
  }

  /**
   * Generate natural language from operator and args
   * @param {string} operator - Operator name
   * @param {Array} args - Arguments (strings or objects with .value)
   * @returns {string} Natural language text
   */
  generate(operator, args) {
    // Handle both string args and object args with .value
    const argValues = args.map(a => typeof a === 'string' ? a : a?.value || a);

    // Common templates
    const templates = {
      // Relationships
      love: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}.` : `love(${a.join(', ')})`,
      loves: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}.` : `loves(${a.join(', ')})`,
      know: (a) => a.length >= 2 ? `${a[0]} knows ${a[1]}.` : `know(${a.join(', ')})`,
      help: (a) => a.length >= 2 ? `${a[0]} helps ${a[1]}.` : `help(${a.join(', ')})`,
      trust: (a) => a.length >= 2 ? `${a[0]} trusts ${a[1]}.` : `trust(${a.join(', ')})`,

      // Ownership and transactions
      has: (a) => a.length >= 2 ? `${a[0]} has ${this.article(a[1])} ${a[1].toLowerCase()}.` : `has(${a.join(', ')})`,
      give: (a) => a.length >= 3 ? `${a[0]} gave ${a[1]} ${this.article(a[2])} ${a[2].toLowerCase()}.` : `give(${a.join(', ')})`,
      sells: (a) => a.length >= 3 ? `${a[0]} sold ${a[2]} to ${a[1]}.` : `sells(${a.join(', ')})`,
      owns: (a) => a.length >= 2 ? `${a[0]} owns ${this.article(a[1])} ${a[1].toLowerCase()}.` : `owns(${a.join(', ')})`,

      // Classification
      isA: (a) => a.length >= 2 ? `${a[0]} is ${this.article(a[1])} ${a[1].toLowerCase()}.` : `isA(${a.join(', ')})`,

      // Properties
      hasProperty: (a) => a.length >= 2 ? `${a[0]} has ${a[1]}.` : `hasProperty(${a.join(', ')})`,

      // Location
      locatedIn: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}.` : `locatedIn(${a.join(', ')})`,
      livesIn: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}.` : `livesIn(${a.join(', ')})`,
      in: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}.` : `in(${a.join(', ')})`,

      // Family
      parent: (a) => a.length >= 2 ? `${a[0]} is a parent of ${a[1]}.` : `parent(${a.join(', ')})`,

      // Status
      hasStatus: (a) => a.length >= 2 ? `${a[0]} is ${a[1].toLowerCase()}.` : `hasStatus(${a.join(', ')})`,

      // Abilities
      can: (a) => a.length >= 2 ? `${a[0]} can ${a[1]}.` : `can(${a.join(', ')})`,
      cannot: (a) => a.length >= 2 ? `${a[0]} cannot ${a[1]}.` : `cannot(${a.join(', ')})`,

      // Obligations
      mustDo: (a) => a.length >= 2 ? `${a[0]} must ${a[1].toLowerCase()}.` : `mustDo(${a.join(', ')})`,

      // Temporal
      before: (a) => a.length >= 2 ? `${a[0]} is before ${a[1]}.` : `before(${a.join(', ')})`,
      after: (a) => a.length >= 2 ? `${a[0]} is after ${a[1]}.` : `after(${a.join(', ')})`,

      // Modal
      permitted: (a) => a.length >= 1 ? `${a[0]} is permitted.` : `permitted()`,
      forbidden: (a) => a.length >= 1 ? `${a[0]} is forbidden.` : `forbidden()`,
      necessary: (a) => a.length >= 1 ? `${a[0]} is necessary.` : `necessary()`,

      // Comparison
      greaterThan: (a) => a.length >= 2 ? `${a[0]} is greater than ${a[1]}.` : `greaterThan(${a.join(', ')})`,

      // Actions/Events
      completed: (a) => a.length >= 2 ? `${a[0]} completed ${a[1].toLowerCase()}.` : `completed(${a.join(', ')})`,
      submitted: (a) => a.length >= 2 ? `${a[0]} submitted ${a[1].toLowerCase()}.` : `submitted(${a.join(', ')})`,
      passed: (a) => a.length >= 2 ? `${a[0]} passed ${a[1].toLowerCase()}.` : `passed(${a.join(', ')})`,
      detected: (a) => a.length >= 2 ? `${a[1]} detected at ${a[0]}.` : `detected(${a.join(', ')})`,
      exists: (a) => a.length >= 2 ? `${a[0]} has ${a[1].toLowerCase()}.` : `exists(${a.join(', ')})`,

      // Symptoms
      hasSymptom: (a) => a.length >= 2 ? `${a[0]} has ${a[1].toLowerCase()}.` : `hasSymptom(${a.join(', ')})`,

      // Appeals
      appealsTo: (a) => a.length >= 2 ? `${a[0]} appeals to ${a[1]}.` : `appealsTo(${a.join(', ')})`,

      // Actions (past tense)
      did: (a) => {
        if (a.length >= 4) return `${a[0]} did ${a[1]} to ${a[3]}.`;
        if (a.length >= 3) return `${a[0]} did ${a[1]} ${a[2]}.`;
        if (a.length >= 2) return `${a[0]} did ${a[1]}.`;
        return `did(${a.join(', ')})`;
      },
      occurred: (a) => a.length >= 1 ? `${a[0]} occurred.` : `occurred()`,

      // State
      hasState: (a) => a.length >= 2 ? `${a[0]} is ${a[1]}.` : `hasState(${a.join(', ')})`,

      // Color
      hasColor: (a) => a.length >= 2 ? `${a[0]} has ${a[1]}.` : `hasColor(${a.join(', ')})`,

      // Size
      hasSize: (a) => a.length >= 2 ? `${a[0]} is ${a[1].toLowerCase()}.` : `hasSize(${a.join(', ')})`,

      // Causation
      causes: (a) => a.length >= 2 ? `${a[0]} causes ${a[1]}.` : `causes(${a.join(', ')})`,
      enables: (a) => a.length >= 2 ? `${a[0]} enables ${a[1]}.` : `enables(${a.join(', ')})`,
      prevents: (a) => a.length >= 2 ? `${a[0]} prevents ${a[1]}.` : `prevents(${a.join(', ')})`,
      indirectCause: (a) => a.length >= 2 ? `${a[0]} indirectly causes ${a[1]}.` : `indirectCause(${a.join(', ')})`,
      indirectlyCauses: (a) => a.length >= 2 ? `${a[0]} indirectly causes ${a[1]}.` : `indirectlyCauses(${a.join(', ')})`,
      wouldPrevent: (a) => a.length >= 2 ? `Preventing ${a[0]} would prevent ${a[1]}.` : `wouldPrevent(${a.join(', ')})`,

      // Compound property operators
      isGuilty: (a) => a.length >= 1 ? `${a[0]} is guilty.` : `isGuilty()`,
      isSuspect: (a) => a.length >= 1 ? `${a[0]} is suspect.` : `isSuspect()`,
      canPay: (a) => a.length >= 1 ? `${a[0]} can pay.` : `canPay()`,
      canPurchase: (a) => a.length >= 1 ? `${a[0]} can purchase.` : `canPurchase()`,
      isProtected: (a) => a.length >= 1 ? `${a[0]} is protected.` : `isProtected()`,
      canVote: (a) => a.length >= 1 ? `${a[0]} can vote.` : `canVote()`,

      // Eating
      eats: (a) => a.length >= 2 ? `${a[0]} eats ${a[1].toLowerCase()}.` : `eats(${a.join(', ')})`,

      // Alternatives
      alternative: (a) => a.length >= 2 ? `${a[0]} is an alternative to ${a[1]}.` : `alternative(${a.join(', ')})`,

      // Planning
      plan: (a) => a.length >= 2 ? `Plan ${a[0]} has ${a[1]} steps.` : `plan(${a.join(', ')})`,
      planStep: (a) => a.length >= 3 ? `Step ${a[1]} of plan ${a[0]} is ${a[2]}.` : `planStep(${a.join(', ')})`,

      // Event seating / Constraint satisfaction
      seatedAt: (a) => a.length >= 2 ? `${a[0]} is seated at ${a[1]}.` : `seatedAt(${a.join(', ')})`,
      conflictsWith: (a) => a.length >= 2 ? `${a[0]} conflicts with ${a[1]}.` : `conflictsWith(${a.join(', ')})`,
      tableConflict: (a) => a.length >= 3 ? `There is a conflict at ${a[0]} between ${a[1]} and ${a[2]}.` : `tableConflict(${a.join(', ')})`
    };

    if (templates[operator]) {
      return templates[operator](argValues);
    }

    // Generic template with verb conjugation for binary relations
    if (argValues.length === 0) {
      return `${operator}.`;
    }
    if (argValues.length === 1) {
      return `${argValues[0]} is ${operator}.`;
    }
    if (argValues.length === 2) {
      // Detect assignment/placement relations (common in solve blocks)
      // These should use "is at/in" pattern, not verb conjugation
      const assignmentPatterns = ['seating', 'arrangement', 'placement', 'assignment', 'position', 'location', 'slot'];
      const opLower = operator.toLowerCase();
      if (assignmentPatterns.some(p => opLower.includes(p)) || opLower.endsWith('ing')) {
        return `${argValues[0]} is at ${argValues[1]}.`;
      }
      return `${argValues[0]} ${this.thirdPerson(operator)} ${argValues[1]}.`;
    }

    return `${operator}(${argValues.join(', ')}).`;
  }

  /**
   * Add 's' for third person singular verbs
   */
  thirdPerson(verb) {
    // Modal verbs and temporal prepositions don't conjugate
    const noConjugate = [
      'can', 'cannot', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
      'before', 'after', 'during', 'until', 'since', 'while', 'between'
    ];
    if (noConjugate.includes(verb.toLowerCase())) {
      return verb;
    }
    // If verb contains camelCase, don't modify
    if (/[a-z][A-Z]/.test(verb)) {
      return verb;
    }
    // If verb already ends in 's', assume it's already third person
    if (verb.endsWith('s')) {
      return verb;
    }
    // Standard conjugation rules
    if (verb.endsWith('x') || verb.endsWith('ch') || verb.endsWith('sh') || verb.endsWith('o')) {
      return verb + 'es';
    }
    if (verb.endsWith('y') && !/[aeiou]y$/.test(verb)) {
      return verb.slice(0, -1) + 'ies';
    }
    return verb + 's';
  }

  /**
   * Elaborate a proof result into natural language
   * @param {Object} proof - Proof result
   * @returns {Object} Elaboration with text
   */
  elaborate(proof) {
    if (!proof.valid) {
      let goalText = proof.goal || proof.reason || 'statement';
      if (proof.goal) {
        const parts = proof.goal.trim().split(/\s+/).filter(p => !p.startsWith('@'));
        if (parts.length >= 2) {
          goalText = this.generate(parts[0], parts.slice(1)).replace(/\.$/, '');
        }
      }
      return { text: 'Cannot prove: ' + goalText };
    }

    // Extract the goal and convert to natural language
    const steps = proof.steps || [];
    let goalText = '';

    const goalString = proof.goal || (steps.length > 0 && steps[0].goal);
    if (goalString) {
      const parts = goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
      if (parts.length >= 1) {
        const operator = parts[0];
        const args = parts.slice(1);
        goalText = this.generate(operator, args);
        goalText = goalText.replace(/\.$/, '');
      }
    }

    // Build proof chain from step facts
    const proofSteps = [];
    for (const step of steps) {
      if (step.fact) {
        const factParts = step.fact.trim().split(/\s+/);
        if (factParts.length >= 2) {
          const stepOperator = factParts[0];
          const stepArgs = factParts.slice(1);
          const stepText = this.generate(stepOperator, stepArgs).replace(/\.$/, '');
          if (stepText && !proofSteps.includes(stepText)) {
            proofSteps.push(stepText);
          }
        }
      }
    }

    if (goalText && proofSteps.length > 0) {
      return {
        text: `True: ${goalText}`,
        proofChain: proofSteps,
        fullProof: `True: ${goalText}. Proof: ${proofSteps.join('. ')}.`
      };
    }

    if (goalText) {
      return { text: `True: ${goalText}` };
    }

    // Fallback to technical format
    const lines = [`Proof by ${proof.method}:`];
    for (const step of steps) {
      lines.push(`  - ${step.operation}: ${step.goal || step.fact || ''}`);
    }
    lines.push(`Confidence: ${(proof.confidence * 100).toFixed(1)}%`);
    return { text: lines.join('\n') };
  }
}

// Singleton instance
export const textGenerator = new TextGenerator();

export default TextGenerator;
