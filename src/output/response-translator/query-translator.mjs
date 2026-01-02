import { getThresholds } from '../../core/constants.mjs';
import { BaseTranslator } from './shared.mjs';
import { SolveResultFormatter } from './solve-result-formatter.mjs';
import { META_OPERATORS, RELIABLE_METHODS, RESERVED_SYMBOLS } from './constants.mjs';

function ensureTrailingPeriod(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

function normalizeSentence(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .toLowerCase();
}

export class QueryTranslator extends BaseTranslator {
  constructor(session) {
    super(session);
    this.solveFormatter = new SolveResultFormatter(session);
  }

  isForbiddenAnswer(answer) {
    const a = String(answer || '').trim();
    if (!a) return true;
    if (RESERVED_SYMBOLS.has(a)) return true;
    if (a.startsWith('@')) return true;
    if (a.startsWith('__')) return true;
    if (a.includes('__HOLE') || a.includes('HOLE_') || a.includes('__Relation') || a.includes('__Pair')) return true;
    if (/^Pos\\d+$/.test(a) || /^__Pos\\d+__$/.test(a) || /^__POS_\\d+__$/.test(a)) return true;
    const kbFacts = Array.isArray(this.session?.kbFacts) ? this.session.kbFacts : [];
    const isRelationSymbol = kbFacts.some(f =>
      f?.metadata?.operator === 'isA' &&
      f?.metadata?.args?.[0] === a &&
      (f?.metadata?.args?.[1] === '__Relation' || f?.metadata?.args?.[1] === '__Pair')
    );
    if (isRelationSymbol) return true;
    return false;
  }

  translate({ reasoningResult, queryDsl }) {
    if (!reasoningResult) return 'No results';

    if (reasoningResult.solveResult?.type === 'solve') {
      return this.solveFormatter.formatSolveResult(reasoningResult.solveResult);
    }

    if (this.hasMetaResults(reasoningResult)) {
      return this.session.formatResult(reasoningResult, 'query');
    }

    if (this.hasBindings(reasoningResult)) {
      const text = this.describeBindings(reasoningResult, queryDsl);
      return text || 'No results';
    }

    return 'No results';
  }

  hasMetaResults(result) {
    const allResults = result.allResults || [];
    return allResults.some(r => META_OPERATORS.includes(r.method));
  }

  hasBindings(result) {
    if (result.bindings instanceof Map) {
      return result.bindings.size > 0;
    }
    if (typeof result.bindings === 'object' && result.bindings !== null) {
      return Object.keys(result.bindings).length > 0;
    }
    return false;
  }

  describeBindings(result, queryDsl = '') {
    const queryLine = this.extractQueryLine(queryDsl);
    const parts = queryLine.split(/\s+/).filter(p => !p.startsWith('@') && p.length > 0);
    const op = parts[0];

	    const allResults = result.allResults || [];
	    const directMatches = this.filterByMethod(allResults, r => RELIABLE_METHODS.has(r.method));
	    const hdcMatches = this.filterHdcMatches(allResults, op);

	    const prioritized = this.mergeResults(directMatches, hdcMatches, parts);
	    const resultsToProcess = prioritized.length > 0
	      ? prioritized
	      : (result.bindings?.size > 0 ? [{ bindings: result.bindings, score: 1, method: 'direct' }] : []);

    const answers = [];
    const proofs = [];
    const seenAnswers = new Set();
    for (const entry of resultsToProcess) {
      const { answer, proof } = this.buildTextAndProofFromBinding(entry, parts);
      if (!answer || seenAnswers.has(answer)) continue;
      seenAnswers.add(answer);
      answers.push(answer);
      const proofText = (proof && proof.length > 0)
        ? proof.map(p => p.replace(/\.+$/, '').trim()).filter(Boolean).join('. ')
        : '';
      proofs.push(proofText);
    }

    if (answers.length === 0 && op === 'can' && parts[2]) {
      return this.deriveModalCapability(parts);
    }

    if (answers.length === 0) return 'No results';

    const segments = [];
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const proofText = proofs[i] || '';
      if (proofText) {
        segments.push(`${ensureTrailingPeriod(answer)} Proof: ${ensureTrailingPeriod(proofText)}`);
      } else {
        segments.push(ensureTrailingPeriod(answer));
      }
    }
    return segments.join(' ').trim();
  }

  extractQueryLine(queryDsl = '') {
    if (!queryDsl) return '';
    const lines = queryDsl.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return lines.find(l => l.includes('?')) || lines[lines.length - 1];
  }

  filterByMethod(results, predicate) {
    return results.filter(r => {
      if (!r.bindings) return false;
      const hasBindings = r.bindings instanceof Map
        ? r.bindings.size > 0
        : Object.keys(r.bindings).length > 0;
      return hasBindings && predicate(r);
    });
  }

  filterHdcMatches(results) {
    const strategy = this.session.hdcStrategy || 'exact';
    const thresholds = getThresholds(strategy);
    const hdcThreshold = thresholds.HDC_MATCH;

    return results.filter(r => {
      if (!r.bindings) return false;
      const method = String(r.method || '');
      if (!method.startsWith('hdc')) return false;
      const hasBindings = r.bindings instanceof Map
        ? r.bindings.size > 0
        : Object.keys(r.bindings).length > 0;
      if (!hasBindings) return false;
      if ((r.score || 0) < hdcThreshold) return false;
      if (r.bindings instanceof Map) {
        for (const [, v] of r.bindings) {
          if (this.isForbiddenAnswer(v?.answer)) return false;
        }
      }
      return true;
    });
  }

  mergeResults(primary, secondary, parts) {
    const combined = [];
    const seenKeys = new Set();
    const holeNames = [...new Set(parts.filter(p => p.startsWith('?')).map(p => p.substring(1)))];

    const addEntry = (entry) => {
      if (!entry?.bindings) return;
      const key = this.getBindingKey(entry.bindings, holeNames);
      if (!key) return;
      if (seenKeys.has(key)) return;
      if (this.bindingHasForbiddenAnswers(entry.bindings, holeNames)) return;
      seenKeys.add(key);
      combined.push(entry);
    };

    primary.forEach(addEntry);
    secondary.forEach(addEntry);
    return combined;
  }

  getAnswer(bindings, holeName) {
    if (!holeName || !bindings) return null;
    if (bindings instanceof Map) {
      return bindings.get(holeName)?.answer;
    }
    return bindings?.[holeName]?.answer;
  }

  getBindingKey(bindings, holeNames) {
    if (!bindings) return null;
    if (!Array.isArray(holeNames) || holeNames.length === 0) return '__NOHOLES__';
    const answers = holeNames.map(hole => this.getAnswer(bindings, hole));
    if (answers.some(a => a === undefined || a === null || String(a).trim() === '')) return null;
    return JSON.stringify(answers.map(a => String(a)));
  }

  bindingHasForbiddenAnswers(bindings, holeNames) {
    if (!bindings) return true;
    if (!Array.isArray(holeNames) || holeNames.length === 0) return false;
    for (const holeName of holeNames) {
      const answer = this.getAnswer(bindings, holeName);
      if (this.isForbiddenAnswer(answer)) return true;
    }
    return false;
  }

  normalizeProofSteps(proofSteps) {
    if (!proofSteps) return [];
    const raw = Array.isArray(proofSteps) ? proofSteps : [proofSteps];
    const out = [];
    for (const step of raw) {
      if (typeof step !== 'string') continue;
      const s = step.trim();
      if (!s) continue;
      // Keep already-human proof traces (e.g., planning verification) as-is.
      if (
        /^Loaded plan\b/i.test(s) ||
        /^Start:/i.test(s) ||
        /^Step\s+\d+:/i.test(s) ||
        /^Goals?\s+satisfied\b/i.test(s) ||
        /^Goals?\s+not\s+satisfied\b/i.test(s) ||
        /^Missing:/i.test(s)
      ) {
        out.push(s.replace(/[.!?]+$/, ''));
        continue;
      }
      if (/^applied\s+rule:/i.test(s) || /\b@\w+\b/.test(s)) {
        out.push(s.replace(/[.!?]+$/, ''));
        continue;
      }
      const parts = s.split(/\s+/).filter(Boolean);
      const op = parts[0];
      if (op === 'Applied' || op === 'Search' || op === 'Searched' || op === 'Found') {
        out.push(s.replace(/[.!?]+$/, ''));
        continue;
      }
      if (parts.length >= 3 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(op)) {
        const args = parts.slice(1);
        const generated = this.session.generateText(op, args).replace(/[.!?]+$/, '');
        out.push(generated || s);
      } else {
        out.push(s);
      }
    }
    return out;
  }

  shouldUpgradeProofSteps(proofSteps) {
    const raw = Array.isArray(proofSteps) ? proofSteps : [proofSteps];
    if (raw.some(s => typeof s === 'string' && /\b@\w+\b/.test(s))) return true;
    if (raw.some(s => typeof s === 'string' && /\bApplied\s+rule:\s*Implies\b/i.test(s))) return true;
    const steps = this.normalizeProofSteps(proofSteps);
    if (steps.length === 0) return true;
    // If we already have an explicit CSP/constraint satisfaction explanation, don't "upgrade" it
    // into a generic prove() proof (which would drop the constraint context).
    const looksLikeConstraintExplanation = steps.some(s =>
      typeof s === 'string' &&
      (/\ballDifferent\b/i.test(s) ||
        /\bnoConflict\b/i.test(s) ||
        /\bconflictsWith\b/i.test(s) ||
        /\bconflicts\b/i.test(s) ||
        /\bconstraint\b/i.test(s) ||
        /\bcsp\b/i.test(s))
    );
    if (looksLikeConstraintExplanation && steps.some(s => typeof s === 'string' && /\bsatisfied\b/i.test(s))) {
      return false;
    }
    if (steps.length <= 2) return true;
    if (steps.some(s => /\bApplied rule:\s*Implies\b/i.test(s))) return true;
    if (!steps.some(s => /\bcondition satisfied\b/i.test(s)) && steps.some(s => /\bApplied rule:\b/i.test(s))) return true;

    // Query engine often returns only the raw chain edges (no verification / no "Therefore"),
    // which reads like an incomplete proof. Upgrade by calling prove() so we get a full chain
    // summary and an explicit derived conclusion.
	    const looksLikeChain =
	      steps.length >= 2 &&
	      steps.some(s =>
	        /\bis a\b/i.test(s) ||
	        /\bis in\b/i.test(s) ||
	        /\bimplies\b/i.test(s) ||
	        /\bcauses\b/i.test(s) ||
	        /\bbefore\b/i.test(s) ||
	        /\blocated in\b/i.test(s) ||
	        /\bsubsetof\b/i.test(s) ||
	        /\belementof\b/i.test(s) ||
	        /\bpartof\b/i.test(s)
	      );
    const hasConclusion = steps.some(s => /\btherefore\b/i.test(s) || /\bverified\b/i.test(s));
    if (looksLikeChain && !hasConclusion) return true;

    return false;
  }

	  buildTextAndProofFromBinding(entry, parts) {
	    const bindings = entry?.bindings;
	    const entryMethod = String(entry?.method || '');
	    const entryIsHdc = entryMethod.startsWith('hdc');
	    const op = parts[0];
	    const args = parts.slice(1).map(arg => {
	      if (!arg.startsWith('?')) return arg;
	      const holeName = arg.substring(1);
      const ans = bindings instanceof Map ? bindings.get(holeName)?.answer : bindings?.[holeName]?.answer;
      return ans || arg;
    });

    if (args.some(a => typeof a === 'string' && a.startsWith('?'))) {
      return { answer: null, proof: [] };
    }
    if (op === 'plan' || op === 'planStep' || op === 'planAction') {
      const idx = args[1];
      if (idx !== undefined && idx !== null && !/^[0-9]+$/.test(String(idx))) {
        return { answer: null, proof: [] };
      }
    }
    for (const holeToken of parts.slice(1).filter(p => p.startsWith('?'))) {
      const holeName = holeToken.substring(1);
      const ans = bindings instanceof Map ? bindings.get(holeName)?.answer : bindings?.[holeName]?.answer;
      if (this.isForbiddenAnswer(ans)) return { answer: null, proof: [] };
    }

	    const generatedText = this.session.generateText(op, args).replace(/[.!?]+$/, '');
    const holeNames = parts.slice(1).filter(p => p.startsWith('?')).map(p => p.substring(1));
    const collectedSteps = [];
    for (const holeName of holeNames) {
      const bindingData = bindings instanceof Map ? bindings.get(holeName) : bindings?.[holeName];
      const steps = bindingData?.steps;
      if (Array.isArray(steps)) collectedSteps.push(...steps);
      else if (typeof steps === 'string') collectedSteps.push(steps);
    }
    const dedupedSteps = [];
    const seenStepStrings = new Set();
    for (const step of collectedSteps) {
      if (typeof step !== 'string') continue;
      const key = step.trim();
      if (!key) continue;
      if (seenStepStrings.has(key)) continue;
      seenStepStrings.add(key);
      dedupedSteps.push(step);
    }
    const proofSteps = dedupedSteps.length > 0 ? dedupedSteps : entry?.steps;

	    if (proofSteps && proofSteps.length > 0) {
	      const normalized = this.normalizeProofSteps(proofSteps);
	      if (normalized.length === 1 && normalizeSentence(normalized[0]) === normalizeSentence(generatedText)) {
	        const planProof = this.buildPlanMetaProof(op, args);
	        if (planProof) return { answer: generatedText, proof: planProof };
	      }
	      if (this.shouldUpgradeProofSteps(proofSteps)) {
	        const proveProof = this.generateProofFromProve(op, args);
	        if (proveProof) {
	          const proofArray = proveProof.split('. ').filter(s => s.length > 0);
	          return { answer: generatedText, proof: proofArray };
	        }
	        if (entryIsHdc) return { answer: null, proof: [] };
	      }
	      const filtered = normalized.length > 1
	        ? normalized.filter(s => normalizeSentence(s) !== normalizeSentence(generatedText))
	        : normalized;
	      return { answer: generatedText, proof: filtered };
	    }

    const planProof = this.buildPlanMetaProof(op, args);
    if (planProof) return { answer: generatedText, proof: planProof };

	    const proveProof = this.generateProofFromProve(op, args);
	    if (proveProof) {
	      const proofArray = proveProof.split('. ').filter(s => s.length > 0);
	      return { answer: generatedText, proof: proofArray };
	    }
	    if (entryIsHdc) return { answer: null, proof: [] };

	    return { answer: generatedText, proof: [] };
	  }

  buildPlanMetaProof(op, args) {
    if (!['plan', 'planStep', 'planAction'].includes(op)) return null;
    const kbFacts = Array.isArray(this.session?.kbFacts) ? this.session.kbFacts : [];
    const planName = args[0];
    if (!planName) return null;

    const samePlan = (operator) => kbFacts
      .filter(f => f?.metadata?.operator === operator && f?.metadata?.args?.[0] === planName)
      .map(f => f.metadata.args);

    if (op === 'plan') {
      const steps = samePlan('planStep');
      if (steps.length === 0) return null;
      const byIndex = new Map();
      for (const [, idx, action] of steps) {
        const n = Number.parseInt(String(idx), 10);
        if (!Number.isFinite(n)) continue;
        if (!byIndex.has(n)) byIndex.set(n, action);
      }
      const indices = [...byIndex.keys()].sort((a, b) => a - b);
      if (indices.length === 0) return null;
      const preview = indices.slice(0, 5).map(n => `Step ${n}: ${byIndex.get(n)}`).join(', ');
      return [
        `Found ${indices.length} plan steps for ${planName}`,
        `Examples: ${preview}`
      ];
    }

    if (op === 'planStep') {
      const [_, idx, action] = args;
      if (idx === undefined || action === undefined) return null;
      const hasFact = samePlan('planStep').some(([, i, a]) => String(i) === String(idx) && String(a) === String(action));
      if (!hasFact) return null;
      return [`Fact in KB: Step ${idx} of plan ${planName} is ${action}`];
    }

    if (op === 'planAction') {
      const [_, idx, tool, input, output] = args;
      if (idx === undefined || tool === undefined || input === undefined || output === undefined) return null;
      const hasFact = samePlan('planAction').some(([, i, t, inp, out]) =>
        String(i) === String(idx) && String(t) === String(tool) && String(inp) === String(input) && String(out) === String(output)
      );
      if (!hasFact) return null;
      return [`Fact in KB: Step ${idx} of plan ${planName} uses ${tool} with ${input} and ${output}`];
    }

    return null;
  }

  generateProofFromProve(op, args) {
    try {
      const goal = ['@goal:goal', op, ...args].join(' ');
      const proofResult = this.session.prove(goal);
      if (!proofResult?.valid) return null;
      const described = this.session.describeResult({ action: 'prove', reasoningResult: proofResult, queryDsl: goal }) || '';
      const proofMatch = String(described).match(/Proof:\s*(.+)/);
      return proofMatch ? proofMatch[1].trim() : null;
    } catch {
      return null;
    }
  }

  deriveModalCapability(parts, reasoningResult) {
    const op = parts[0];
    const target = parts[2];
    const candidates = new Set();
    for (const fact of this.session.kbFacts || []) {
      const meta = fact.metadata;
      if (meta?.operator !== 'has') continue;
      const holder = meta.args?.[0];
      const value = meta.args?.[1];
      if (!holder || !value) continue;
      if (this.valueReachesTarget(value, target)) {
        candidates.add(holder);
      }
    }
    if (candidates.size === 0) {
      return 'No results';
    }
    const fallbackTexts = [...candidates].map(holder =>
      this.session.generateText(op, [holder, target]).replace(/[.!?]+$/, '')
    );
    return this.ensureProofPresence(fallbackTexts, reasoningResult);
  }

  valueReachesTarget(value, target) {
    const queue = [value];
    const visited = new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      if (current === target) return true;
      for (const fact of this.session.kbFacts || []) {
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === current) {
          queue.push(meta.args[1]);
        }
      }
    }
    return false;
  }

  ensureProofPresence(texts, reasoningResult = {}) {
    const unique = [...new Set(texts)];
    if (unique.some(text => text.includes('Proof:'))) {
      return unique.join('. ') + '.';
    }

    const proof = this.buildProofTrace(reasoningResult);
    if (proof) {
      return unique.map(text => `${text}. Proof: ${proof}`).join(' ');
    }
    return unique.join('. ') + '.';
  }

  buildProofTrace(result = {}) {
    const steps = [];
    const collect = (bindings) => {
      if (!bindings) return;
      if (bindings instanceof Map) {
        for (const [, value] of bindings) {
          if (value?.steps && value.steps.length > 0) {
            steps.push(...value.steps);
          }
        }
      } else if (typeof bindings === 'object') {
        for (const value of Object.values(bindings)) {
          if (value?.steps && value.steps.length > 0) {
            steps.push(...value.steps);
          }
        }
      }
    };

    collect(result.bindings);
    for (const entry of result.allResults || []) {
      collect(entry.bindings);
    }
    return steps.length > 0 ? steps.join('. ') : null;
  }
}
