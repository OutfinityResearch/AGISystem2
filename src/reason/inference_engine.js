/**
 * InferenceEngine - Complete logical inference capabilities
 *
 * Supports:
 * - Direct fact lookup
 * - Transitive closure with proof chains
 * - Symmetric inference
 * - Inverse relation inference
 * - Composition rules (user-defined)
 * - Default reasoning (non-monotonic)
 * - Property inheritance
 */

const DimensionRegistry = require('../core/dimension_registry');

class InferenceEngine {
  constructor(deps = {}) {
    this.store = deps.store || null;
    this.reasoner = deps.reasoner || null;
    this.detector = deps.detector || null; // ContradictionDetector
    this.config = deps.config || null;
    this.dimRegistry = deps.dimensionRegistry || DimensionRegistry.getShared();

    // Custom rules: { name, head, body }
    this.rules = [];

    // Default reasoning rules
    this.defaults = [];

    // Relation properties cache - populated from DimensionRegistry
    this.relationProperties = new Map();

    // Initialize relation properties from registry
    this._initRelationProperties();
  }

  _initRelationProperties() {
    // Load relation properties from DimensionRegistry (single source of truth)
    const relationNames = this.dimRegistry.getRelationPropertyNames();
    for (const name of relationNames) {
      const props = this.dimRegistry.getRelationProperties(name);
      this.relationProperties.set(name, props);
    }
  }

  /**
   * Main inference entry point
   */
  infer(subject, relation, object, facts, options = {}) {
    const maxDepth = options.maxDepth || (this.config && this.config.get('recursionHorizon')) || 10;
    const methods = options.methods || [
      'direct', 'transitive', 'symmetric', 'inverse', 'composition', 'inheritance', 'default'
    ];

    // Try each inference method in order
    for (const method of methods) {
      let result;
      switch (method) {
        case 'direct':
          result = this.inferDirect(subject, relation, object, facts);
          break;
        case 'transitive':
          result = this.inferTransitive(subject, relation, object, facts, maxDepth);
          break;
        case 'symmetric':
          result = this.inferSymmetric(subject, relation, object, facts);
          break;
        case 'inverse':
          result = this.inferInverse(subject, relation, object, facts);
          break;
        case 'composition':
          result = this.inferComposition(subject, relation, object, facts, maxDepth);
          break;
        case 'inheritance':
          result = this.inferInheritance(subject, relation, object, facts, maxDepth);
          break;
        case 'default':
          result = this.inferDefault(subject, relation, object, facts);
          break;
        default:
          continue;
      }

      if (result.truth === 'TRUE_CERTAIN' || result.truth === 'TRUE_DEFAULT') {
        return result;
      }
    }

    return { truth: 'UNKNOWN', method: 'exhausted', confidence: 0 };
  }

  /**
   * Direct fact lookup
   */
  inferDirect(subject, relation, object, facts) {
    const norm = (s) => String(s).toLowerCase().trim();
    const sNorm = norm(subject);
    const oNorm = norm(object);

    const found = facts.find((f) =>
      norm(f.subject) === sNorm
      && f.relation === relation
      && norm(f.object) === oNorm
    );

    if (found) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'direct',
        confidence: 1.0,
        proof: {
          goal: { subject, relation, object },
          steps: [{ fact: found, justification: 'direct_match' }],
          valid: true
        }
      };
    }

    return { truth: 'UNKNOWN', method: 'direct' };
  }

  /**
   * Transitive inference with proof chain
   */
  inferTransitive(subject, relation, object, facts, maxDepth = 10) {
    const props = this.relationProperties.get(relation) || {};
    if (!props.transitive) {
      return { truth: 'UNKNOWN', method: 'transitive', reason: 'not_transitive' };
    }

    const norm = (s) => String(s).toLowerCase().trim();
    const target = norm(object);
    const visited = new Set();
    const queue = [{ node: norm(subject), path: [] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift();

      if (path.length > maxDepth) continue;
      if (visited.has(node)) continue;
      visited.add(node);

      // Find all outgoing edges for this relation
      const edges = facts.filter((f) =>
        norm(f.subject) === node && f.relation === relation
      );

      for (const edge of edges) {
        const edgeTarget = norm(edge.object);
        const newPath = [...path, { from: node, to: edgeTarget, fact: edge }];

        if (edgeTarget === target) {
          return {
            truth: 'TRUE_CERTAIN',
            method: 'transitive',
            confidence: Math.pow(0.95, newPath.length),
            proof: {
              goal: { subject, relation, object },
              steps: newPath,
              valid: true
            }
          };
        }

        queue.push({ node: edgeTarget, path: newPath });
      }
    }

    return { truth: 'UNKNOWN', method: 'transitive', reason: 'no_path' };
  }

  /**
   * Symmetric inference
   */
  inferSymmetric(subject, relation, object, facts) {
    const props = this.relationProperties.get(relation) || {};
    if (!props.symmetric) {
      return { truth: 'UNKNOWN', method: 'symmetric', reason: 'not_symmetric' };
    }

    // Check reverse direction
    const norm = (s) => String(s).toLowerCase().trim();
    const found = facts.find((f) =>
      norm(f.subject) === norm(object)
      && f.relation === relation
      && norm(f.object) === norm(subject)
    );

    if (found) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'symmetric',
        confidence: 1.0,
        proof: {
          goal: { subject, relation, object },
          steps: [
            { fact: found, justification: 'symmetric_match' },
            { rule: `${relation} is symmetric`, justification: 'symmetry' }
          ],
          valid: true
        }
      };
    }

    return { truth: 'UNKNOWN', method: 'symmetric' };
  }

  /**
   * Inverse relation inference
   */
  inferInverse(subject, relation, object, facts) {
    const props = this.relationProperties.get(relation) || {};
    if (!props.inverse) {
      return { truth: 'UNKNOWN', method: 'inverse', reason: 'no_inverse' };
    }

    const inverseRel = props.inverse;
    const norm = (s) => String(s).toLowerCase().trim();

    // If we want to know A REL B, check B INVERSE_REL A
    const found = facts.find((f) =>
      norm(f.subject) === norm(object)
      && f.relation === inverseRel
      && norm(f.object) === norm(subject)
    );

    if (found) {
      return {
        truth: 'TRUE_CERTAIN',
        method: 'inverse',
        confidence: 1.0,
        inverseRelation: inverseRel,
        proof: {
          goal: { subject, relation, object },
          steps: [
            { fact: found, justification: 'inverse_match' },
            { rule: `${relation} inverse of ${inverseRel}`, justification: 'inverse_relation' }
          ],
          valid: true
        }
      };
    }

    return { truth: 'UNKNOWN', method: 'inverse' };
  }

  /**
   * Composition rule inference
   */
  inferComposition(subject, relation, object, facts, maxDepth) {
    // Find rules that produce this relation
    const applicableRules = this.rules.filter((r) => r.head.relation === relation);

    for (const rule of applicableRules) {
      // Try to unify rule head with query
      const headBindings = this._unify(rule.head, { subject, relation, object });
      if (!headBindings) continue;

      // Try to satisfy rule body
      const bodyResult = this._satisfyBody(rule.body, headBindings, facts, maxDepth);
      if (bodyResult.satisfied) {
        return {
          truth: 'TRUE_CERTAIN',
          method: 'composition',
          rule: rule.name,
          confidence: 0.9,
          proof: {
            goal: { subject, relation, object },
            steps: bodyResult.steps,
            rule: rule.name,
            valid: true
          }
        };
      }
    }

    return { truth: 'UNKNOWN', method: 'composition', reason: 'no_rule_matched' };
  }

  /**
   * Default (non-monotonic) reasoning
   */
  inferDefault(subject, relation, object, facts) {
    for (const defaultRule of this.defaults) {
      if (defaultRule.property !== relation) continue;
      if (defaultRule.value !== object) continue;

      // Check if subject is of the typical type
      const isType = this.infer(subject, 'IS_A', defaultRule.typicalType, facts, {
        methods: ['direct', 'transitive']
      });
      if (isType.truth !== 'TRUE_CERTAIN') continue;

      // Check for exceptions
      const exception = this._isException(subject, defaultRule.exceptions, facts);
      if (exception) {
        return {
          truth: 'FALSE',
          method: 'default',
          reason: 'exception_applies',
          exception,
          proof: {
            goal: { subject, relation, object },
            steps: [{ exception, justification: 'blocked_by_exception' }],
            defeasible: true
          }
        };
      }

      // Default applies
      return {
        truth: 'TRUE_DEFAULT',
        method: 'default',
        confidence: 0.8,
        assumptions: [`${subject} is a typical ${defaultRule.typicalType}`],
        proof: {
          goal: { subject, relation, object },
          steps: [
            { rule: defaultRule.name, justification: 'default_rule' },
            { assumption: `${subject} IS_A ${defaultRule.typicalType}`, justification: 'type_check' }
          ],
          defeasible: true
        }
      };
    }

    return { truth: 'UNKNOWN', method: 'default' };
  }

  /**
   * Property inheritance inference
   */
  inferInheritance(subject, relation, object, facts, maxDepth) {
    // Only for HAS_PROPERTY-like relations
    const inheritableRelations = ['HAS_PROPERTY', 'CAN', 'HAS_ABILITY'];
    if (!inheritableRelations.includes(relation)) {
      return { truth: 'UNKNOWN', method: 'inheritance', reason: 'not_inheritable' };
    }

    // Find all types of subject
    const types = this._getAllTypes(subject, facts, maxDepth);

    // Check if any type has the property
    const norm = (s) => String(s).toLowerCase().trim();
    for (const type of types) {
      const hasProp = facts.find((f) =>
        norm(f.subject) === norm(type)
        && f.relation === relation
        && norm(f.object) === norm(object)
      );
      if (hasProp) {
        return {
          truth: 'TRUE_CERTAIN',
          method: 'inheritance',
          confidence: 0.95,
          inheritedFrom: type,
          proof: {
            goal: { subject, relation, object },
            steps: [
              { fact: `${subject} IS_A ${type}`, justification: 'type_membership' },
              { fact: hasProp, justification: 'property_of_type' }
            ],
            valid: true
          }
        };
      }
    }

    return { truth: 'UNKNOWN', method: 'inheritance' };
  }

  /**
   * Build complete proof chain
   */
  prove(subject, relation, object, facts, options = {}) {
    const result = this.infer(subject, relation, object, facts, options);
    return result.proof || null;
  }

  /**
   * Forward chaining: derive all possible conclusions
   */
  forwardChain(facts, maxIterations = 100) {
    const derived = [...facts];
    const newFactKeys = new Set();

    // Index existing facts
    for (const f of facts) {
      newFactKeys.add(`${f.subject}|${f.relation}|${f.object}`);
    }

    let iteration = 0;
    while (iteration < maxIterations) {
      iteration++;
      let foundNew = false;

      // Apply composition rules
      for (const rule of this.rules) {
        const conclusions = this._applyRule(rule, derived);
        for (const conclusion of conclusions) {
          const key = `${conclusion.subject}|${conclusion.relation}|${conclusion.object}`;
          if (!newFactKeys.has(key)) {
            newFactKeys.add(key);
            derived.push(conclusion);
            foundNew = true;
          }
        }
      }

      // Expand transitive relations
      for (const [rel, props] of this.relationProperties) {
        if (props.transitive) {
          const newFacts = this._expandTransitiveOnce(rel, derived);
          for (const fact of newFacts) {
            const key = `${fact.subject}|${fact.relation}|${fact.object}`;
            if (!newFactKeys.has(key)) {
              newFactKeys.add(key);
              derived.push(fact);
              foundNew = true;
            }
          }
        }
      }

      // Expand symmetric relations
      for (const [rel, props] of this.relationProperties) {
        if (props.symmetric) {
          const newFacts = this._expandSymmetric(rel, derived);
          for (const fact of newFacts) {
            const key = `${fact.subject}|${fact.relation}|${fact.object}`;
            if (!newFactKeys.has(key)) {
              newFactKeys.add(key);
              derived.push(fact);
              foundNew = true;
            }
          }
        }
      }

      if (!foundNew) break;
    }

    return derived.slice(facts.length); // Return only new facts
  }

  /**
   * Register a composition rule
   */
  registerRule(rule) {
    this.rules.push(rule);
  }

  /**
   * Register a default reasoning rule
   */
  registerDefault(defaultRule) {
    this.defaults.push(defaultRule);
  }

  /**
   * Set relation properties
   */
  setRelationProperties(relation, properties) {
    const existing = this.relationProperties.get(relation) || {};
    this.relationProperties.set(relation, { ...existing, ...properties });
  }

  // ========================================================================
  // Private helpers
  // ========================================================================

  _unify(pattern, query) {
    const bindings = {};

    // Handle variables (start with ?)
    if (pattern.subject.startsWith('?')) {
      bindings[pattern.subject] = query.subject;
    } else if (pattern.subject !== query.subject) {
      return null;
    }

    if (pattern.object.startsWith('?')) {
      bindings[pattern.object] = query.object;
    } else if (pattern.object !== query.object) {
      return null;
    }

    return bindings;
  }

  _satisfyBody(bodyPatterns, bindings, facts, maxDepth) {
    if (bodyPatterns.length === 0) {
      return { satisfied: true, steps: [] };
    }

    const [first, ...rest] = bodyPatterns;
    const instantiated = this._instantiate(first, bindings);

    // If fully instantiated, check directly
    if (!this._hasVariables(instantiated)) {
      const result = this.inferDirect(
        instantiated.subject,
        instantiated.relation,
        instantiated.object,
        facts
      );
      if (result.truth === 'TRUE_CERTAIN') {
        const restResult = this._satisfyBody(rest, bindings, facts, maxDepth);
        if (restResult.satisfied) {
          return {
            satisfied: true,
            steps: [{ pattern: first, match: instantiated }, ...restResult.steps]
          };
        }
      }
      return { satisfied: false };
    }

    // Find all matching facts and try each binding
    const matches = this._findMatches(instantiated, facts);
    for (const match of matches) {
      const newBindings = { ...bindings, ...this._extractBindings(first, match) };
      const restResult = this._satisfyBody(rest, newBindings, facts, maxDepth - 1);
      if (restResult.satisfied) {
        return {
          satisfied: true,
          steps: [{ pattern: first, match }, ...restResult.steps]
        };
      }
    }

    return { satisfied: false };
  }

  _instantiate(pattern, bindings) {
    return {
      subject: bindings[pattern.subject] || pattern.subject,
      relation: pattern.relation,
      object: bindings[pattern.object] || pattern.object
    };
  }

  _hasVariables(pattern) {
    return pattern.subject.startsWith('?') || pattern.object.startsWith('?');
  }

  _findMatches(pattern, facts) {
    return facts.filter((f) => {
      if (f.relation !== pattern.relation) return false;
      if (!pattern.subject.startsWith('?') && f.subject !== pattern.subject) return false;
      if (!pattern.object.startsWith('?') && f.object !== pattern.object) return false;
      return true;
    });
  }

  _extractBindings(pattern, fact) {
    const bindings = {};
    if (pattern.subject.startsWith('?')) {
      bindings[pattern.subject] = fact.subject;
    }
    if (pattern.object.startsWith('?')) {
      bindings[pattern.object] = fact.object;
    }
    return bindings;
  }

  _isException(subject, exceptions, facts) {
    for (const exc of exceptions) {
      const result = this.infer(subject, 'IS_A', exc, facts, {
        methods: ['direct', 'transitive']
      });
      if (result.truth === 'TRUE_CERTAIN') {
        return exc;
      }
    }
    return null;
  }

  _getAllTypes(subject, facts, maxDepth) {
    const types = new Set();
    const queue = [subject];
    const norm = (s) => String(s).toLowerCase().trim();
    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      const current = queue.shift();
      const directTypes = facts
        .filter((f) => norm(f.subject) === norm(current) && f.relation === 'IS_A')
        .map((f) => f.object);

      for (const t of directTypes) {
        if (!types.has(t)) {
          types.add(t);
          queue.push(t);
        }
      }
      depth++;
    }

    return types;
  }

  _applyRule(rule, facts) {
    const conclusions = [];

    // Find all possible bindings for first body pattern
    const firstPattern = rule.body[0];
    const firstMatches = this._findMatches(firstPattern, facts);

    for (const firstMatch of firstMatches) {
      const bindings = this._extractBindings(firstPattern, firstMatch);

      // Try to satisfy rest of body
      const restResult = this._satisfyBody(rule.body.slice(1), bindings, facts, 5);
      if (restResult.satisfied) {
        // Generate conclusion
        const conclusion = this._instantiate(rule.head, bindings);
        if (!this._hasVariables(conclusion)) {
          conclusions.push({
            ...conclusion,
            derivedBy: rule.name
          });
        }
      }
    }

    return conclusions;
  }

  _expandTransitiveOnce(relation, facts) {
    const newFacts = [];
    const relFacts = facts.filter((f) => f.relation === relation);

    for (const f1 of relFacts) {
      for (const f2 of relFacts) {
        if (f1.object === f2.subject && f1.subject !== f2.object) {
          newFacts.push({
            subject: f1.subject,
            relation,
            object: f2.object,
            derivedBy: 'transitive_closure'
          });
        }
      }
    }

    return newFacts;
  }

  _expandSymmetric(relation, facts) {
    const newFacts = [];
    const relFacts = facts.filter((f) => f.relation === relation);

    for (const f of relFacts) {
      // Check if reverse already exists
      const hasReverse = relFacts.some(
        (r) => r.subject === f.object && r.object === f.subject
      );
      if (!hasReverse) {
        newFacts.push({
          subject: f.object,
          relation,
          object: f.subject,
          derivedBy: 'symmetric_closure'
        });
      }
    }

    return newFacts;
  }
}

module.exports = InferenceEngine;
