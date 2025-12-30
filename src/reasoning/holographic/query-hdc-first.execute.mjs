/**
 * AGISystem2 - Holographic Query Engine (HDC-First) - Execution
 * @module reasoning/holographic/query-hdc-first.execute
 */

import { bind, unbind, similarity, topKSimilar } from '../../core/operations.mjs';
import { getPositionVector } from '../../core/position.mjs';
import { MAX_HOLES } from '../../core/constants.mjs';
import { sameBindings } from '../query-kb.mjs';
import { buildProofObject } from '../proof-schema.mjs';
import { validateProof } from '../proof-validator.mjs';
import { QueryEngine, METHOD_PRIORITY } from '../query.mjs';
import { ProofEngine } from '../prove.mjs';
import { isValidEntity } from '../query-hdc.mjs';
import { classifyQuery } from './query-hdc-first.classify.mjs';

export function initHdcFirstEngines(engine) {
  engine.symbolicEngine = new QueryEngine(engine.session);
  // Validation depth needs to cover long transitive chains (e.g., deep taxonomies).
  // Keep it bounded for performance, but avoid truncating correct answers.
  engine.validatorEngine = new ProofEngine(engine.session, { timeout: 500, maxDepth: 12 });
}

export function executeHdcFirstQuery(engine, statement, options = {}) {
  // Track holographic stats
  engine.session.reasoningStats.holographicQueries =
    (engine.session.reasoningStats.holographicQueries || 0) + 1;

  // Step 1: Parse query - identify holes and knowns
  const holes = [];
  const knowns = [];
  const operator = engine.session.resolve(statement.operator);
  const operatorName = statement.operator?.name || statement.operator?.value;

  for (let i = 0; i < statement.args.length; i++) {
    const arg = statement.args[i];
    if (arg.type === 'Hole') {
      holes.push({ index: i + 1, name: arg.name });
    } else {
      const name =
        typeof arg.name === 'string'
          ? arg.name
          : (arg.value !== undefined && arg.value !== null)
            ? String(arg.value)
            : typeof arg.toString === 'function'
              ? arg.toString()
              : null;
      knowns.push({
        index: i + 1,
        name,
        node: arg,
        vector: engine.session.resolve(arg)
      });
    }
  }

  // Direct match (no holes) - use symbolic
  if (holes.length === 0) {
    return engine.symbolicEngine.execute(statement, options);
  }

  const queryClass = classifyQuery(engine, operatorName, holes, knowns);
  engine.trackOp(`holo_query_class_${queryClass.kind}`, 1);
  if (queryClass.symbolicOnly) {
    engine.trackOp('holo_symbolic_only', 1);
    return engine.symbolicEngine.execute(statement, options);
  }

  // Safe fast-path: exact, complete retrieval for 1-hole fact queries using ComponentKB indices.
  // This bypasses both HDC similarity and symbolic proof search.
  if (queryClass.indexFastPathAllowed) {
    const fast = tryDirectIndexQuery(engine, operatorName, knowns, holes, options);
    if (fast) return fast;
  }

  // Too many holes - fail
  if (holes.length > MAX_HOLES) {
    return {
      success: false,
      reason: `Too many holes (max ${MAX_HOLES})`,
      bindings: new Map(),
      allResults: []
    };
  }

  // Step 2: HDC unbind to find candidates
  let candidates = [];
  if (queryClass.hdcUnbindAllowed) {
    engine.session.reasoningStats.hdcUnbindAttempts =
      (engine.session.reasoningStats.hdcUnbindAttempts || 0) + 1;

    candidates = hdcUnbindCandidates(engine, operator, operatorName, knowns, holes);

    if (candidates.length > 0) {
      engine.session.reasoningStats.hdcUnbindSuccesses =
        (engine.session.reasoningStats.hdcUnbindSuccesses || 0) + 1;
    }
  } else {
    engine.trackOp('holo_hdc_unbind_skipped', 1);
  }

  const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;

  // Step 3: Validate candidates with symbolic proof
  const validatedResults = [];
  const requireProofValidation = engine.config.VALIDATION_REQUIRED !== false;

  if (requireProofValidation) {
    for (const candidate of candidates) {
      engine.session.reasoningStats.hdcValidationAttempts =
        (engine.session.reasoningStats.hdcValidationAttempts || 0) + 1;

      engine.trackOp('holo_validation_proof_attempt', 1);
      const validation = validateCandidate(engine, operatorName, knowns, holes, candidate);

      if (validation.valid) {
        engine.session.reasoningStats.hdcValidationSuccesses =
          (engine.session.reasoningStats.hdcValidationSuccesses || 0) + 1;
        engine.trackOp('holo_validation_proof_ok', 1);

        // Build bindings map matching QueryEngine format
        const bindings = new Map();
        for (const [holeName, value] of Object.entries(candidate.bindings)) {
          bindings.set(holeName, {
            answer: value.name,
            similarity: value.similarity,
            method: 'hdc_validated',
            steps: validation.steps || []
          });
        }

        validatedResults.push({
          bindings,
          score: candidate.combinedScore,
          method: 'hdc_validated'
        });
      }

      if (maxResults !== null && validatedResults.length >= maxResults) {
        break;
      }
    }
  }

  if (validatedResults.length > 0) {
    engine.session.reasoningStats.holographicQueryHdcSuccesses =
      (engine.session.reasoningStats.holographicQueryHdcSuccesses || 0) + 1;
  }

  // Keep an HDC-only snapshot for equivalence analysis vs symbolic results.
  const hdcValidatedResults = validatedResults.slice();

  // Step 4: Merge/fallback to symbolic when needed.
  //
  // Policy (Decision D4 / holographicPriority):
  // - If HDC produced at least one validated result, treat the query as "answered" and skip the
  //   symbolic engine for performance.
  // - If HDC produced no validated results, fall back to symbolic for completeness/correctness.
  //
  // Note: This means holographicPriority query results are not guaranteed to be complete when HDC succeeds.
  const shouldSupplement = !!engine.config.FALLBACK_TO_SYMBOLIC && validatedResults.length === 0;

  if (shouldSupplement) {
    const symbolicResult = engine.symbolicEngine.execute(statement, options);

    // Metric: did HDC find a result set equivalent to the symbolic engine (for this query)?
    const bindingKey = (bindings) => {
      const holeNames = holes.map(h => h.name).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const values = [];
      for (const hn of holeNames) {
        const ans = bindings instanceof Map ? bindings.get(hn)?.answer : bindings?.[hn]?.answer;
        if (ans === undefined || ans === null || String(ans).trim() === '') return null;
        values.push(String(ans));
      }
      return JSON.stringify(values);
    };

    const toKeySet = (results) => {
      const set = new Set();
      for (const r of results || []) {
        const k = bindingKey(r?.bindings);
        if (k) set.add(k);
      }
      return set;
    };

	    const symSet = toKeySet(symbolicResult?.allResults || []);
	    const hdcSet = toKeySet(hdcValidatedResults);
	    if (symSet.size > 0) {
	      engine.session.reasoningStats.hdcComparedOps =
	        (engine.session.reasoningStats.hdcComparedOps || 0) + 1;
	      engine.trackOp('holo_hdc_compared', 1);
	    }

	    if (symSet.size > 0 && symSet.size === hdcSet.size) {
	      let same = true;
	      for (const k of symSet) {
	        if (!hdcSet.has(k)) {
	          same = false;
	          break;
        }
      }
      if (same) {
        engine.session.reasoningStats.hdcEquivalentOps =
          (engine.session.reasoningStats.hdcEquivalentOps || 0) + 1;
        engine.trackOp('holo_hdc_equivalent', 1);
      }
    }

    if (symbolicResult.allResults && symbolicResult.allResults.length > 0) {
      const hasSteps = (result) => {
        if (result?.bindings instanceof Map) {
          for (const [, value] of result.bindings) {
            if (value?.steps && value.steps.length > 0) return true;
          }
        } else if (result?.bindings && typeof result.bindings === 'object') {
          for (const value of Object.values(result.bindings)) {
            if (value?.steps && value.steps.length > 0) return true;
          }
        }
        return false;
      };

      // Add symbolic results that weren't found by HDC, or replace HDC duplicates
      for (const r of symbolicResult.allResults) {
        const existingIdx = validatedResults.findIndex(existing =>
          sameBindings(existing.bindings, r.bindings, holes)
        );
        if (existingIdx >= 0) {
          const existing = validatedResults[existingIdx];
          if ((existing.method || '').startsWith('hdc') || (!hasSteps(existing) && hasSteps(r))) {
            validatedResults[existingIdx] = r;
          }
        } else {
          r.method = r.method || 'symbolic_supplement';
          validatedResults.push(r);
        }
      }
    }
  } else {
    engine.trackOp('holo_skip_symbolic_supplement', 1);
  }

  // Match QueryEngine ordering + maxResults behavior.
  validatedResults.sort((a, b) => {
    const pa = METHOD_PRIORITY[a.method] || 0;
    const pb = METHOD_PRIORITY[b.method] || 0;
    if (pa !== pb) return pb - pa;
    return (b.score || 0) - (a.score || 0);
  });

  const finalResults = maxResults !== null ? validatedResults.slice(0, maxResults) : validatedResults;

  // Build final result matching QueryEngine interface
  const bindings = finalResults.length > 0 ? finalResults[0].bindings : new Map();
  const confidence = finalResults.length > 0 ? finalResults[0].score : 0;

  return {
    success: finalResults.length > 0,
    bindings,
    confidence,
    ambiguous: finalResults.length > 1,
    allResults: finalResults
  };
}

function tryDirectIndexQuery(engine, operatorName, knowns, holes, options = {}) {
  if (!operatorName) return null;
  if (!Array.isArray(holes) || holes.length !== 1) return null;
  const kb = engine.session?.componentKB;
  if (!kb || typeof kb.findByOperator !== 'function') return null;

  const hole = holes[0];
  if (!hole || typeof hole.index !== 'number' || typeof hole.name !== 'string') return null;

  const knownByPos = new Map();
  for (const k of knowns || []) {
    if (typeof k?.index === 'number' && typeof k?.name === 'string') knownByPos.set(k.index, k.name);
  }

  // Use the smallest index slice available (no synonym expansion).
  let facts;
  if (knownByPos.has(1) && typeof kb.findByArg0 === 'function') {
    engine.trackOp('holo_index_domain_arg0', 1);
    facts = kb.findByArg0(knownByPos.get(1), false).filter(f => f?.operator === operatorName);
  } else if (knownByPos.has(2) && typeof kb.findByArg1 === 'function') {
    engine.trackOp('holo_index_domain_arg1', 1);
    facts = kb.findByArg1(knownByPos.get(2), false).filter(f => f?.operator === operatorName);
  } else {
    engine.trackOp('holo_index_domain_operator', 1);
    facts = kb.findByOperator(operatorName, false);
  }

  if (!Array.isArray(facts) || facts.length === 0) return null;

  const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, options.maxResults) : null;
  const seen = new Set();
  const allResults = [];

  for (const fact of facts) {
    engine.session.reasoningStats.kbScans++;
    const args = Array.isArray(fact?.args) ? fact.args : Array.isArray(fact?.metadata?.args) ? fact.metadata.args : null;
    if (!args || args.length < hole.index) continue;

    let ok = true;
    for (const [pos, name] of knownByPos.entries()) {
      const idx = pos - 1;
      if (idx < 0 || idx >= args.length || args[idx] !== name) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    const value = args[hole.index - 1];
    if (typeof value !== 'string' || !value) continue;

    const key = `${hole.index}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const bindings = new Map();
    const stmt = `${operatorName} ${args.join(' ')}`;
    const steps = [];
    const metaProof = typeof fact?.metadata?.proof === 'string' ? fact.metadata.proof.trim() : '';
    if (metaProof) steps.push(metaProof);
    steps.push(stmt);

    bindings.set(hole.name, { answer: value, similarity: 0.95, method: 'direct', steps });
    allResults.push({ bindings, score: 0.95, method: 'direct', steps });

    if (maxResults !== null && allResults.length >= maxResults) break;
  }

  if (allResults.length === 0) return null;

  engine.trackOp('holo_index_fastpath_success', 1);
  return {
    success: true,
    bindings: allResults[0].bindings,
    confidence: allResults[0].score,
    ambiguous: allResults.length > 1,
    allResults
  };
}

function buildCandidateDomainFromKB(engine, operatorName, knowns, holeIndex) {
  const kb = engine.session?.componentKB;
  if (!kb || typeof kb.findByOperator !== 'function') return null;

  const knownByPos = new Map();
  for (const k of knowns || []) {
    if (typeof k?.index === 'number' && typeof k?.name === 'string') {
      knownByPos.set(k.index, k.name);
    }
  }

  // Choose the smallest indexed slice as the base (no synonym expansion; preserve QueryEngine semantics).
  let facts = null;
  if (knownByPos.has(1) && typeof kb.findByArg0 === 'function') {
    facts = kb.findByArg0(knownByPos.get(1), false).filter(f => f?.operator === operatorName);
  } else if (knownByPos.has(2) && typeof kb.findByArg1 === 'function') {
    facts = kb.findByArg1(knownByPos.get(2), false).filter(f => f?.operator === operatorName);
  } else {
    facts = kb.findByOperator(operatorName, false);
  }

  if (!Array.isArray(facts) || facts.length === 0) return null;

  const counts = new Map();
  for (const f of facts) {
    const args = Array.isArray(f?.args) ? f.args : Array.isArray(f?.metadata?.args) ? f.metadata.args : null;
    if (!args || args.length < holeIndex) continue;

    let ok = true;
    for (const k of knowns || []) {
      const idx = (k.index || 0) - 1;
      if (idx < 0) continue;
      if (args[idx] !== k.name) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    const name = args[holeIndex - 1];
    if (typeof name !== 'string' || !isValidEntity(name, engine.session)) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  if (counts.size === 0) return null;

  const out = Array.from(counts.entries())
    .map(([name, witnesses]) => ({ name, witnesses, source: 'kb' }))
    .sort((a, b) => (b.witnesses - a.witnesses) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  // Safety cap: avoid spending O(huge) similarity checks. Keep the most frequent candidates.
  const maxDomain = Math.max(200, (engine.config.UNBIND_MAX_CANDIDATES || 25) * 50);
  return out.length > maxDomain ? out.slice(0, maxDomain) : out;
}

function getVocabulary(engine) {
  const atomCount = engine.session?.vocabulary?.atoms?.size || 0;
  if (engine._vocabCache && engine._vocabCacheAtomCount === atomCount) return engine._vocabCache;

  const vocab = new Map();
  for (const [name, vec] of engine.session.vocabulary.entries()) {
    // Exclude internal placeholders, relation markers, and positional atoms.
    if (typeof name !== 'string') continue;
    if (!isValidEntity(name, engine.session)) continue;
    if (name.startsWith('__') || name.startsWith('@') || name.includes('__HOLE') || name.includes('__Relation')) continue;
    if (/^__Pos\\d+__$/.test(name)) continue;
    vocab.set(name, vec);
  }

  engine._vocabCache = vocab;
  engine._vocabCacheAtomCount = atomCount;
  return vocab;
}

function hdcUnbindCandidates(engine, operator, operatorName, knowns, holes) {
  // Build partial query vector (without holes)
  let queryPartial = operator;
  for (const known of knowns) {
    const posVec = getPositionVector(known.index, engine.session.geometry, engine.session.hdcStrategy, engine.session);
    queryPartial = bind(queryPartial, bind(posVec, known.vector));
  }

  // Get KB bundle for unbind
  const kbBundle = engine.session.getKBBundle?.();
  if (!kbBundle) return [];

  const holeCandidates = new Map();

  for (const hole of holes) {
    const posVec = getPositionVector(hole.index, engine.session.geometry, engine.session.hdcStrategy, engine.session);
    const unboundVec = unbind(unbind(kbBundle, queryPartial), posVec);

    const kbDomain = buildCandidateDomainFromKB(engine, operatorName, knowns, hole.index);
    let candidates = null;

    const strategy = engine.session?.hdc?.strategy || null;
    const canDecode = typeof strategy?.decodeUnboundCandidates === 'function';

    if (canDecode) {
      engine.trackOp('holo_domain_decode', 1);
      const domainNames = kbDomain && kbDomain.length > 0 ? kbDomain.map(d => d.name) : null;
      const knownNames = Array.isArray(knowns) ? knowns.map(k => k?.name).filter(Boolean) : [];
      candidates = strategy.decodeUnboundCandidates(unboundVec, {
        session: engine.session,
        operatorName,
        holeIndex: hole.index,
        maxCandidates: engine.config.UNBIND_MAX_CANDIDATES,
        domain: domainNames,
        knowns: knownNames,
        isValidEntity
      });
    } else if (kbDomain && kbDomain.length > 0) {
      engine.trackOp('holo_domain_kb', 1);
      const scored = [];
      for (const entry of kbDomain) {
        const vec = engine.session.resolve({ type: 'Identifier', name: entry.name });
        engine.session.reasoningStats.similarityChecks++;
        const sim = similarity(unboundVec, vec);
        scored.push({ name: entry.name, similarity: sim, witnesses: entry.witnesses || 0, source: 'kb' });
      }
      scored.sort((a, b) => (b.similarity - a.similarity) || (b.witnesses - a.witnesses) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      candidates = scored
        .filter(c => c.similarity >= (engine.config.UNBIND_MIN_SIMILARITY ?? 0))
        .slice(0, engine.config.UNBIND_MAX_CANDIDATES);
    } else {
      engine.trackOp('holo_domain_vocab', 1);
      const vocabulary = getVocabulary(engine);
      const rawTop = topKSimilar(
        unboundVec,
        vocabulary,
        engine.config.UNBIND_MAX_CANDIDATES * 3,
        engine.session
      );
      candidates = rawTop
        .filter(c => c.similarity >= (engine.config.UNBIND_MIN_SIMILARITY ?? 0))
        .slice(0, engine.config.UNBIND_MAX_CANDIDATES);
    }

    holeCandidates.set(hole.name, candidates || []);
  }

  return combineCandidates(holes, holeCandidates);
}

function combineCandidates(holes, holeCandidates) {
  if (holes.length === 0) return [];

  // For single hole, just map candidates
  if (holes.length === 1) {
    const holeName = holes[0].name;
    const candidates = holeCandidates.get(holeName) || [];
    return candidates.map(c => ({ bindings: { [holeName]: c }, combinedScore: c.similarity }));
  }

  // For multiple holes, compute cartesian product (limited)
  const result = [];
  const maxCombinations = 50; // Limit explosion

  const holeNames = holes.map(h => h.name);
  const candidateArrays = holeNames.map(n => holeCandidates.get(n) || []);

  const combine = (index, current, score) => {
    if (result.length >= maxCombinations) return;
    if (index === holeNames.length) {
      result.push({ bindings: { ...current }, combinedScore: score / holeNames.length });
      return;
    }
    const holeName = holeNames[index];
    const candidates = candidateArrays[index];
    for (const c of candidates.slice(0, 5)) {
      current[holeName] = c;
      combine(index + 1, current, score + c.similarity);
    }
  };

  combine(0, {}, 0);
  return result;
}

function validateCandidate(engine, operatorName, knowns, holes, candidate) {
  const args = [];
  const maxPos = Math.max(...knowns.map(k => k.index), ...holes.map(h => h.index));

  for (let i = 1; i <= maxPos; i++) {
    const known = knowns.find(k => k.index === i);
    if (known) {
      args.push(known.name);
    } else {
      const hole = holes.find(h => h.index === i);
      if (hole && candidate.bindings[hole.name]) {
        args.push(candidate.bindings[hole.name].name);
      } else {
        return false;
      }
    }
  }

  const statementStr = `${operatorName} ${args.join(' ')}`;

  try {
    // Fast path: exact fact exists in KB (no need for full proof search)
    if (hasDirectFact(engine, operatorName, args)) {
      return { valid: true, steps: [statementStr] };
    }

    // Use symbolic prove to validate
    const statement = parseStatement(operatorName, args);
    const result = engine.validatorEngine.prove(statement);
    if (!result.valid) return { valid: false };

    if (engine.session?.proofValidationEnabled) {
      const proofObject = buildProofObject({ session: engine.session, goalStatement: statement, result });
      const ok = validateProof(proofObject, engine.session);
      return ok ? { valid: true, steps: extractProofFacts(result.steps) } : { valid: false };
    }

    return { valid: true, steps: extractProofFacts(result.steps) };
  } catch (_e) {
    return { valid: false };
  }
}

function hasDirectFact(engine, operatorName, args) {
  if (!operatorName || !Array.isArray(args) || args.length === 0) return false;
  const componentKB = engine.session?.componentKB;
  if (!componentKB?.findByOperatorAndArg0) return false;
  const candidates = componentKB.findByOperatorAndArg0(operatorName, args[0]);
  for (const fact of candidates || []) {
    if (!fact || fact.operator !== operatorName) continue;
    if (!Array.isArray(fact.args) || fact.args.length !== args.length) continue;
    let ok = true;
    for (let i = 0; i < args.length; i++) {
      if (fact.args[i] !== args[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function parseStatement(operatorName, args) {
  return {
    type: 'Statement',
    operator: { type: 'Identifier', name: operatorName, value: operatorName },
    args: args.map(a => ({ type: 'Identifier', name: a, value: a })),
    toString: () => `${operatorName} ${args.join(' ')}`
  };
}

function extractProofFacts(steps = []) {
  const facts = [];
  for (const step of steps) {
    if (step?.fact && typeof step.fact === 'string') {
      facts.push(step.fact);
      continue;
    }
    if (step?.operation === 'and_satisfied' && typeof step.detail === 'string') {
      const parts = step.detail.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) facts.push(part);
    }
  }
  return facts;
}
