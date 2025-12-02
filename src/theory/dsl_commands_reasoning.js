/**
 * DS(/theory/dsl_commands_reasoning.js) - Reasoning DSL Commands v3.0
 *
 * Implements Sys2DSL v3.0 commands for logical reasoning and validation.
 *
 * v3.0 Syntax: @variable Subject VERB Object (exactly 4 tokens)
 * - Subject is passed as first argument
 * - Object is passed as second argument
 *
 * Commands:
 * - VALIDATE: Check theory consistency
 *   v3: @result scope VALIDATE any
 *
 * - PROVE: Attempt to prove statement (subject=query_var, object=any)
 *   v3: @result query_var PROVE any (where query_var is from @q Subject REL Object)
 *
 * - HYPOTHESIZE: Generate hypotheses based on patterns
 *   v3: @hyps pattern HYPOTHESIZE any
 *
 * - ABDUCT: Find causes for observation (subject=observation, object=any)
 *   v3: @causes observation ABDUCT any
 *
 * - ANALOGICAL: Analogical reasoning (subject=A_B pair, object=C)
 *   v3: @result A_B ANALOGICAL C
 *
 * - CHECK_CONTRADICTION: Detect contradictions
 *   v3: @result concept CHECK_CONTRADICTION any
 *
 * - WOULD_CONTRADICT: Check if concept would contradict
 *   v3: @result concept WOULD_CONTRADICT other_concept
 *
 * See also: DS(/reason/contradiction_detector), DS(/theory/dsl_commands_inference)
 * See also: DS(/knowledge/usage_tracking) - Priority weighting for hypothesis ranking
 *
 * @module theory/dsl_commands_reasoning
 */

class DSLCommandsReasoning {
  constructor({ conceptStore, contradictionDetector, inferenceEngine, parser, coreCommands, reasoner }) {
    this.conceptStore = conceptStore;
    this.contradictionDetector = contradictionDetector;
    this.inferenceEngine = inferenceEngine;
    this.parser = parser;
    this.coreCommands = coreCommands;
    this.reasoner = reasoner;
  }

  // =========================================================================
  // Validation Commands
  // =========================================================================

  /**
   * VALIDATE: Check consistency of current theory
   * v3.0 Syntax: @result scope VALIDATE any
   * - Subject (argTokens[0]) = scope to validate
   * - Object (argTokens[1]) = any (ignored)
   */
  cmdValidate(argTokens, env, facts) {
    // v3.0: Subject is scope, Object is any
    const scope = argTokens.length > 0 ? this.parser.expandString(argTokens[0], env) : 'all';
    const issues = [];

    for (const fact of facts) {
      if (fact.relation === 'LOCATED_IN') {
        const disjointFacts = facts.filter(
          (f) => f.relation === 'DISJOINT_WITH'
            && (f.subject === fact.object || f.object === fact.object)
        );
        for (const df of disjointFacts) {
          const otherZone = df.subject === fact.object ? df.object : df.subject;
          const conflicting = facts.filter(
            (f) => f.subject === fact.subject
              && f.relation === 'CASTS'
              && this._requiresZone(f.object, otherZone, facts)
          );
          if (conflicting.length > 0) {
            issues.push({
              type: 'DISJOINT_VIOLATION',
              subject: fact.subject,
              location: fact.object,
              conflictZone: otherZone,
              ability: conflicting[0].object
            });
          }
        }
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
      scope,
      factCount: facts.length
    };
  }

  _requiresZone(ability, zone, facts) {
    if (ability === 'Magic' && zone === 'MagicZone') return true;
    return false;
  }

  /**
   * PROVE: Attempt to prove a statement
   * v3.0 Syntax: @result Subject PROVE Object (implies IS_A relation)
   * Legacy Syntax: @result "Subject REL Object" PROVE any
   *
   * Alternative: @result $query_var PROVE any (if query_var is a fact/query result)
   *
   * Uses InferenceEngine if available (supports composition rules like GRANDPARENT_OF)
   */
  cmdProve(argTokens, env, facts) {
    const token0 = this.parser.expandString(argTokens[0] || '', env);
    const token1 = this.parser.expandString(argTokens[1] || '', env);

    let subject, relation, object;

    // Check if token0 resolved to a fact object from a variable
    if (typeof token0 === 'object' && token0.subject) {
      subject = token0.subject;
      relation = token0.relation;
      object = token0.object;
    } else if (argTokens.length === 2 && token1 && token1.toLowerCase() !== 'any') {
      // v3 format: Subject PROVE Object (IS_A implied)
      subject = token0;
      relation = 'IS_A';
      object = token1;
    } else {
      // Legacy format: "Subject REL Object" PROVE any
      const parts = String(token0).trim().split(/\s+/);
      if (parts.length >= 3) {
        subject = parts[0];
        relation = parts[1];
        object = parts.slice(2).join(' ');
      } else if (parts.length === 1 && token1 && token1.toLowerCase() !== 'any') {
        // Fallback: treat as v3 format
        subject = parts[0];
        relation = 'IS_A';
        object = token1;
      } else {
        throw new Error('PROVE expects: Subject PROVE Object (v3) or "Subject REL Object" format');
      }
    }

    // First, try InferenceEngine if available (handles composition rules)
    if (this.inferenceEngine) {
      const result = this.inferenceEngine.infer(subject, relation, object, facts, {
        maxDepth: 10
      });
      if (result.truth === 'TRUE_CERTAIN' || result.truth === 'TRUE_DEFAULT') {
        return {
          truth: result.truth,
          proven: true,
          method: result.method,
          proof: result.proof,
          confidence: result.confidence || 1.0
        };
      }
    }

    // Fallback to direct lookup
    const direct = facts.find(
      (f) => f.subject === subject && f.relation === relation && f.object === object
    );
    if (direct) {
      return { truth: 'TRUE_CERTAIN', proven: true, method: 'direct', confidence: 1.0 };
    }

    const props = this.coreCommands.getRelationProperties(relation);
    if (props.transitive) {
      const chain = this._findTransitiveChain(subject, relation, object, facts);
      if (chain) {
        return { truth: 'TRUE_CERTAIN', proven: true, method: 'transitive', chain, confidence: 0.9 };
      }
    }

    if (props.symmetric) {
      const reverse = facts.find(
        (f) => f.subject === object && f.relation === relation && f.object === subject
      );
      if (reverse) {
        return { truth: 'TRUE_CERTAIN', proven: true, method: 'symmetric', confidence: 1.0 };
      }
    }

    return { truth: 'UNKNOWN', proven: false, method: 'exhausted', confidence: 0 };
  }

  _findTransitiveChain(start, relation, end, facts, visited = new Set()) {
    if (visited.has(start)) return null;
    visited.add(start);

    const directLinks = facts.filter((f) => f.subject === start && f.relation === relation);
    for (const link of directLinks) {
      if (link.object === end) {
        return [start, end];
      }
      const subChain = this._findTransitiveChain(link.object, relation, end, facts, visited);
      if (subChain) {
        return [start, ...subChain];
      }
    }
    return null;
  }

  /**
   * HYPOTHESIZE: Generate hypotheses based on patterns
   * Syntax: @var HYPOTHESIZE Subject [Relation] [limit=N]
   */
  cmdHypothesize(argTokens, env, facts) {
    if (argTokens.length < 1) {
      throw new Error('HYPOTHESIZE expects at least a subject');
    }
    const subject = this.parser.expandString(argTokens[0], env);
    const relation = argTokens.length > 1 && !argTokens[1].startsWith('limit=')
      ? this.parser.expandString(argTokens[1], env)
      : null;
    let limit = 5;
    for (const arg of argTokens) {
      if (arg.startsWith('limit=')) {
        limit = parseInt(arg.split('=')[1], 10);
      }
    }

    const hypotheses = [];
    const types = facts.filter((f) => f.subject === subject && f.relation === 'IS_A');

    for (const typeFact of types) {
      const sameType = facts.filter(
        (f) => f.relation === 'IS_A' && f.object === typeFact.object && f.subject !== subject
      );
      for (const peer of sameType) {
        const peerFacts = facts.filter(
          (f) => f.subject === peer.subject && (!relation || f.relation === relation)
        );
        for (const pf of peerFacts) {
          const existing = facts.find(
            (f) => f.subject === subject && f.relation === pf.relation && f.object === pf.object
          );
          if (!existing) {
            hypotheses.push({
              subject,
              relation: pf.relation,
              object: pf.object,
              basis: `${peer.subject} (same ${typeFact.object})`,
              confidence: 0.6
            });
          }
        }
      }
    }

    const unique = [];
    const seen = new Set();
    for (const h of hypotheses) {
      const key = `${h.subject}:${h.relation}:${h.object}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(h);
      }
    }

    return {
      subject,
      hypotheses: unique.slice(0, limit),
      count: unique.length
    };
  }

  /**
   * ABDUCT: Abductive reasoning - find causes for an observation
   *
   * Given an observation (effect), finds candidate causes ranked by:
   * 1. Usage priority (frequently used concepts more likely to be relevant)
   * 2. Depth (direct causes rank higher than transitive)
   *
   * Syntax: @var ABDUCT observation [limit=N] [transitive] [noTransitive]
   *
   * Examples:
   *   @causes ABDUCT fever
   *   @causes ABDUCT "high blood pressure" limit=3 noTransitive
   *
   * Returns hypotheses sorted by combined score (priority - depth penalty)
   */
  cmdAbduct(argTokens, env, facts) {
    if (argTokens.length < 1) {
      throw new Error('ABDUCT expects an observation to explain');
    }

    const observation = this.parser.expandString(argTokens[0], env);
    let limit = 5;
    let transitive = true;
    let maxDepth = 3;

    // Parse options
    for (let i = 1; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);
      if (arg.startsWith('limit=')) {
        limit = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('maxDepth=')) {
        maxDepth = parseInt(arg.split('=')[1], 10);
      } else if (arg === 'noTransitive') {
        transitive = false;
      } else if (arg === 'transitive') {
        transitive = true;
      }
    }

    // Use Reasoner.abductCause if available
    if (this.reasoner && this.reasoner.abductCause) {
      const result = this.reasoner.abductCause(observation, null, {
        k: limit,
        transitive,
        maxDepth
      });
      return {
        observation,
        bestHypothesis: result.hypothesis,
        confidence: result.band,
        hypotheses: result.hypotheses,
        count: result.hypotheses.length,
        method: 'reasoner'
      };
    }

    // Fallback: simple fact-based search with priority ranking
    const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
    const targetNorm = norm(observation);
    const candidates = [];

    for (const fact of facts) {
      const subjectNorm = norm(fact.subject);
      const objectNorm = norm(fact.object);

      if (fact.relation === 'CAUSES' && objectNorm === targetNorm) {
        candidates.push({
          hypothesis: fact.subject,
          band: 'PLAUSIBLE',
          depth: 0,
          viaFact: fact
        });
      } else if (fact.relation === 'CAUSED_BY' && subjectNorm === targetNorm) {
        candidates.push({
          hypothesis: fact.object,
          band: 'PLAUSIBLE',
          depth: 0,
          viaFact: fact
        });
      }
    }

    // Add priority scores
    const rankedHypotheses = candidates.map(c => {
      let priorityScore = 0.5;
      if (this.conceptStore && this.conceptStore.getUsageStats) {
        const stats = this.conceptStore.getUsageStats(c.hypothesis);
        if (stats && stats.priority !== undefined) {
          priorityScore = stats.priority;
        }
      }
      return {
        ...c,
        priorityScore: Math.round(priorityScore * 100) / 100,
        combinedScore: Math.round(priorityScore * 100) / 100
      };
    });

    // Sort by priority
    rankedHypotheses.sort((a, b) => b.combinedScore - a.combinedScore);
    const topHypotheses = rankedHypotheses.slice(0, limit);

    return {
      observation,
      bestHypothesis: topHypotheses[0]?.hypothesis || null,
      confidence: topHypotheses[0]?.band || 'FALSE',
      hypotheses: topHypotheses,
      count: topHypotheses.length,
      method: 'fallback'
    };
  }

  /**
   * ANALOGICAL: Perform analogical reasoning
   * Syntax: @var ANALOGICAL A B C  (positional: A:B :: C:?)
   * Syntax: @var ANALOGICAL source_a=A source_b=B target_c=C
   */
  cmdAnalogical(argTokens, env) {
    let source_a, source_b, target_c;
    const params = {};

    // Check if using positional arguments (3 args without '=')
    const positionalArgs = argTokens.filter(t => !t.includes('='));
    if (positionalArgs.length >= 3) {
      source_a = this.parser.expandString(positionalArgs[0], env);
      source_b = this.parser.expandString(positionalArgs[1], env);
      target_c = this.parser.expandString(positionalArgs[2], env);
    } else {
      // Named parameters
      for (const token of argTokens) {
        const expanded = this.parser.expandString(token, env);
        if (expanded.includes('=')) {
          const [key, value] = expanded.split('=');
          params[key] = value;
        }
      }
      source_a = params.source_a;
      source_b = params.source_b;
      target_c = params.target_c;
    }

    if (!source_a || !source_b || !target_c) {
      throw new Error('ANALOGICAL requires 3 positional args (A B C) or source_a=A source_b=B target_c=C');
    }

    const conceptA = this.conceptStore.getConcept(source_a);
    const conceptB = this.conceptStore.getConcept(source_b);
    const conceptC = this.conceptStore.getConcept(target_c);

    if (!conceptA || !conceptB || !conceptC) {
      return { error: 'One or more concepts not found', source_a, source_b, target_c, params };
    }

    const centerA = conceptA.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);
    const centerB = conceptB.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);
    const centerC = conceptC.diamonds[0]?.center || new Int8Array(this.conceptStore.dimensions);

    const delta = new Int8Array(centerA.length);
    const targetD = new Int8Array(centerC.length);

    for (let i = 0; i < centerA.length; i++) {
      delta[i] = centerB[i] - centerA[i];
      targetD[i] = Math.max(-127, Math.min(127, centerC[i] + delta[i]));
    }

    let nearest = null;
    let nearestDist = Infinity;
    for (const label of this.conceptStore.listConcepts()) {
      if (label === source_a || label === source_b || label === target_c) continue;
      const concept = this.conceptStore.getConcept(label);
      if (!concept || !concept.diamonds[0]) continue;

      const center = concept.diamonds[0].center;
      let dist = 0;
      for (let i = 0; i < center.length; i++) {
        dist += Math.abs(center[i] - targetD[i]);
      }
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = label;
      }
    }

    const confidence = nearest ? Math.max(0, 1 - nearestDist / (centerA.length * 128)) : 0;
    return {
      truth: nearest ? 'TRUE_CERTAIN' : 'UNKNOWN',
      analogy: `${source_a} : ${source_b} :: ${target_c} : ${nearest || '?'}`,
      result: nearest,
      delta: Array.from(delta),
      confidence
    };
  }

  // =========================================================================
  // Contradiction Detection Commands
  // =========================================================================

  /**
   * CHECK_CONTRADICTION: Check knowledge base for contradictions
   * Syntax: @var CHECK_CONTRADICTION [scope]
   */
  cmdCheckContradiction(argTokens, env, facts) {
    const options = {};

    for (const arg of argTokens) {
      const expanded = this.parser.expandString(arg, env);
      if (expanded === 'disjointness') options.checkDisjointness = true;
      if (expanded === 'functional') options.checkFunctional = true;
      if (expanded === 'taxonomic') options.checkTaxonomic = true;
      if (expanded === 'cardinality') options.checkCardinality = true;
    }

    const report = this.contradictionDetector.detectAll(facts, options);

    return {
      consistent: report.consistent,
      contradictions: report.contradictions,
      summary: report.consistent
        ? 'No contradictions found.'
        : `Found ${report.contradictions.length} contradiction(s).`,
      factCount: report.checkedFacts
    };
  }

  /**
   * CHECK_WOULD_CONTRADICT: Check if a new fact would cause contradiction
   * Syntax: @var CHECK_WOULD_CONTRADICT Subject Relation Object
   */
  cmdCheckWouldContradict(argTokens, env, facts) {
    if (argTokens.length < 3) {
      throw new Error('CHECK_WOULD_CONTRADICT expects Subject Relation Object');
    }

    const subject = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    const object = this.parser.expandString(argTokens.slice(2).join(' '), env);

    const newFact = { subject, relation, object };
    const result = this.contradictionDetector.wouldContradict(newFact, facts);

    return {
      truth: result.wouldContradict ? 'TRUE_CERTAIN' : 'FALSE',
      wouldContradict: result.wouldContradict,
      reason: result.reason,
      contradictions: result.contradictions || [],
      proposedFact: newFact
    };
  }

  /**
   * REGISTER_FUNCTIONAL: Mark a relation as functional (single-valued)
   * Syntax: @var REGISTER_FUNCTIONAL RelationName
   */
  cmdRegisterFunctional(argTokens, env) {
    if (argTokens.length < 1) {
      throw new Error('REGISTER_FUNCTIONAL expects a relation name');
    }

    const relation = this.parser.expandString(argTokens[0], env);
    this.contradictionDetector.registerFunctionalRelation(relation);

    return { ok: true, relation, type: 'functional' };
  }

  /**
   * REGISTER_CARDINALITY: Set cardinality constraints
   * Syntax: @var REGISTER_CARDINALITY SubjectType Relation min=N max=M
   */
  cmdRegisterCardinality(argTokens, env) {
    if (argTokens.length < 2) {
      throw new Error('REGISTER_CARDINALITY expects SubjectType Relation [min=N] [max=M]');
    }

    const subjectType = this.parser.expandString(argTokens[0], env);
    const relation = this.parser.expandString(argTokens[1], env);
    let min;
    let max;

    for (let i = 2; i < argTokens.length; i++) {
      const arg = this.parser.expandString(argTokens[i], env);
      if (arg.startsWith('min=')) {
        min = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('max=')) {
        const val = arg.split('=')[1];
        max = val === '*' ? '*' : parseInt(val, 10);
      }
    }

    this.contradictionDetector.registerCardinalityConstraint(subjectType, relation, min, max);

    return { ok: true, subjectType, relation, min, max };
  }
}

module.exports = DSLCommandsReasoning;
