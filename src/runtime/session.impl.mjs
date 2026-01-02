/**
 * AGISystem2 - Session (implementation)
 * @module runtime/session.impl
 *
 * Heavy method bodies are kept here so `session.mjs` stays a small interface layer.
 */

import { bundle, getDefaultGeometry } from '../core/operations.mjs';
import { getProperties, getStrategy } from '../hdc/facade.mjs';
import { createHDCContext } from '../hdc/context.mjs';
import { MAX_POSITIONS } from '../core/constants.mjs';
import { Scope } from './scope.mjs';
import { Vocabulary } from './vocabulary.mjs';
import { Executor } from './executor.mjs';
import { AbductionEngine } from '../reasoning/abduction.mjs';
import { InductionEngine } from '../reasoning/induction.mjs';
import { createQueryEngine, getReasoningPriority } from '../reasoning/index.mjs';
import { textGenerator } from '../output/text-generator.mjs';
import { format as resultFormatterFormat } from '../output/result-formatter.mjs';
import { ResponseTranslator } from '../output/response-translator.mjs';
import { findAll } from '../reasoning/find-all.mjs';
import { ComponentKB } from '../reasoning/component-kb.mjs';
import { debug_trace, isDebugEnabled } from '../utils/debug.js';
import { readEnvBoolean } from '../utils/env.js';
import { DEFAULT_SEMANTIC_INDEX, FALLBACK_SEMANTIC_INDEX } from './semantic-index.mjs';
import { SemanticIndex } from './semantic-index.mjs';
import { canonicalizeMetadata } from './canonicalize.mjs';
import { FactIndex } from './fact-index.mjs';
import { ContradictionError } from './contradiction-error.mjs';
import { computeFeatureToggles, computeReasoningProfile } from './reasoning-profile.mjs';
import { TypeRegistry } from './type-registry.mjs';
import { CanonicalRewriteIndex } from './canonical-rewrite-index.mjs';
import { initRuntimeReservedAtoms } from './runtime-reserved-atoms.mjs';
import { classifyFactKind, ensureFactKind } from './fact-kind.mjs';
import { checkContradiction as checkContradictionImpl } from './session-contradictions.mjs';
import { loadCore as loadCoreImpl } from './session-core-load.mjs';
import { learn as learnImpl } from './session-learn.mjs';
import { query as queryImpl } from './session-query.mjs';
import { prove as proveImpl } from './session-prove.mjs';
import { checkDSL as checkDSLImpl } from './session-check-dsl.mjs';
import { dslToNl as dslToNlImpl } from './dsl-to-nl.mjs';
import { beginTransaction, rollbackTransaction } from './session-transaction.mjs';
import { materializePolicyView as materializePolicyViewImpl } from './policy-view.mjs';
import { recordNlTranslationProvenance as recordNlTranslationProvenanceImpl } from './provenance-log.mjs';
import { registerArtifact as registerArtifactImpl, registerEvidence as registerEvidenceImpl, initUrcStores } from './urc-store.mjs';
import { compileToSMTLIB2 } from '../compilation/smtlib2.mjs';
import { classifyDslFragment } from './fragment-classifier.mjs';
import { buildPlan } from './orchestrator.mjs';
import { executeNL as executeNLImpl } from './nl-exec.mjs';

function dbg(category, ...args) {
  debug_trace(`[Session:${category}]`, ...args);
}

export function constructSession(session, options = {}) {
  session.hdcStrategy = options.hdcStrategy || process.env.SYS2_HDC_STRATEGY || 'exact';
  // Strategy-specific options (kept session-local to preserve IoC/session isolation).
  session.exactUnbindMode = (options.exactUnbindMode || process.env.SYS2_EXACT_UNBIND_MODE || 'A');
  // DS25 ceilings (URC alignment): keep very generous defaults so this only triggers when explicitly enabled.
  // These are runtime configuration values; they are not persisted as KB facts by default.
  session.exactCeilings = {
    monomBitLimit: 1000,
    polyTermLimit: 200000,
    ...(options.exactCeilings && typeof options.exactCeilings === 'object' ? options.exactCeilings : {})
  };
  session.reasoningPriority = options.reasoningPriority || getReasoningPriority();
  session.reasoningProfile = computeReasoningProfile({
    reasoningPriority: session.reasoningPriority,
    optionsProfile: options.reasoningProfile
  });
  session.features = computeFeatureToggles({ profile: session.reasoningProfile, options });
  session.canonicalizationEnabled = session.features.canonicalizationEnabled;
  session.proofValidationEnabled = session.features.proofValidationEnabled;
  session.l0BuiltinsEnabled = session.features.l0BuiltinsEnabled;
  session.strictMode = session.features.strictMode;
  session.allowSemanticFallbacks = session.features.allowSemanticFallbacks;
  session.enforceCanonical = session.features.enforceCanonical;
  session.enforceDeclarations = session.features.enforceDeclarations;
  session.closedWorldAssumption = session.features.closedWorldAssumption;
  session.useSemanticIndex = session.features.useSemanticIndex;
  session.useTheoryConstraints = session.features.useTheoryConstraints;
  session.useTheoryReserved = session.features.useTheoryReserved;

  // Validate HDC strategy (must exist); strategy selection is session-local.
  getStrategy(session.hdcStrategy);
  const strategyDefaultGeometry = getProperties(session.hdcStrategy)?.defaultGeometry;
  const hasEnvGeometry = typeof process.env.SYS2_GEOMETRY === 'string' && process.env.SYS2_GEOMETRY.trim() !== '';
  session.geometry = options.geometry || (hasEnvGeometry ? getDefaultGeometry() : (strategyDefaultGeometry || getDefaultGeometry()));

  session.hdc = createHDCContext({ strategyId: session.hdcStrategy, geometry: session.geometry, session });
  session.scope = new Scope();
  session.vocabulary = new Vocabulary(session.geometry, session.hdcStrategy, session.hdc);
  session.executor = new Executor(session);
  session.queryEngine = createQueryEngine(session);
  session.proofEngine = null;
  session.abductionEngine = new AbductionEngine(session);
  session.inductionEngine = new InductionEngine(session);
  session.rules = [];
  session.kb = null;
  session.kbFacts = [];
  session.truthFacts = [];
  session.theoryFacts = [];
  session.nextFactId = 1;
  session._kbBundleVersion = 0;
  session._kbBundleCache = null;
  session._kbBundleCacheVersion = -1;
  session.componentKB = new ComponentKB(session);  // Component-indexed KB for fuzzy matching
  session.factIndex = new FactIndex();             // Exact-match fact index for hot paths
  session.truthFactIndex = new FactIndex();        // Exact-match index for truth facts
  session.theoryFactIndex = new FactIndex();       // Exact-match index for theory/schema facts
  session.theories = new Map();
  session.operators = new Map();
  session.declaredOperators = new Set();
  session.warnings = [];
  session.referenceTexts = new Map(); // Maps reference names to fact strings
  session.referenceMetadata = new Map(); // Maps reference names to structured metadata {operator, args}
  session.graphs = new Map();       // HDC point relationship graphs
  session.graphAliases = new Map(); // Aliases for graphs (persistName -> name)
  session.responseTranslator = new ResponseTranslator(session);
  // Strict by default: only use fallback defaults when explicitly requested.
  // Clone to keep session-local semantics (and allow incremental theory-driven updates).
  session.semanticIndex = (session.allowSemanticFallbacks ? FALLBACK_SEMANTIC_INDEX : DEFAULT_SEMANTIC_INDEX).clone();
  // DS19: semantic-class canonical rewrites are theory-driven; fallback defaults exist only for refactor validation.
  session.canonicalRewriteIndex = session.allowSemanticFallbacks
    ? CanonicalRewriteIndex.withCoreDefaults()
    : new CanonicalRewriteIndex();
  session.typeRegistry = new TypeRegistry(session);
  session.rejectContradictions = options.rejectContradictions ?? true;

  // Session-local reserved atoms.
  session.runtimeReserved = initRuntimeReservedAtoms(session);

  // URC direction: policy/current-view is a derived surface (tooling/debug), not an authoritative store.
  session.policyView = {
    newerWins: true,
    lastComputedAt: null,
    currentFactIds: new Set(),
    supersedes: [],
    negates: [],
    warnings: [],
    policy: null,
    materializedFactLines: [],
    _materializedAtKbVersion: null
  };

  session.provenanceLog = [];
  session._provenanceSeq = 0;
  initUrcStores(session);

  // URC materialization is optional. By default we keep URC audit data in memory only
  // (artifacts/evidence/provenance log) to avoid performance regressions in evals/tools.
  session.urcMaterializeFacts = options.urcMaterializeFacts ?? false;

  // Reasoning statistics
  session.reasoningStats = {
    queries: 0,
    proofs: 0,
    kbScans: 0,
    similarityChecks: 0,
    ruleAttempts: 0,
    transitiveSteps: 0,
    maxProofDepth: 0,
    minProofDepth: Infinity,
    totalProofSteps: 0,
    totalReasoningSteps: 0,
    proofLengths: [],
    methods: {},
    operations: {},
    // HDC-specific stats
    hdcQueries: 0,
    hdcSuccesses: 0,
    hdcBindings: 0,
    hdcBindOps: 0,
    hdcBundleOps: 0,
    hdcUnbindOps: 0,
    topKSimilarCalls: 0,
    hdcUsefulOps: 0,
    hdcEquivalentOps: 0,
    hdcComparedOps: 0,
    // Holographic / HDC-first stats (populated by holographic engines)
    holographicQueries: 0,
    holographicQueryHdcSuccesses: 0,
    holographicProofs: 0,
    hdcUnbindAttempts: 0,
    hdcUnbindSuccesses: 0,
    hdcValidationAttempts: 0,
    hdcValidationSuccesses: 0,
    hdcProofSuccesses: 0,
    symbolicProofFallbacks: 0,
    // CSP stats
    holographicCSP: 0,
    cspBundleBuilt: 0,
    cspSymbolicFallback: 0,
    cspNodesExplored: 0,
    cspBacktracks: 0,
    cspPruned: 0,
    cspHdcPruned: 0
  };

  session.initOperators();

  // Core loading policy:
  // - Default ON for normal runs (keeps semantics theory-driven without runners).
  // - Default OFF under `node --test` unless explicitly enabled.
  const envAutoLoadCore = readEnvBoolean('SYS2_AUTO_LOAD_CORE');
  const runningUnderNodeTest =
    typeof process.env.NODE_TEST_CONTEXT === 'string' ||
    (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
    (Array.isArray(process.argv) && process.argv.includes('--test'));
  // URC direction: Runtime Core is code-only; semantic theory packs are explicit dependencies.
  // Default OFF unless the caller explicitly opts in.
  const defaultAutoLoadCore = false;
  session.autoLoadCore = options.autoLoadCore ?? envAutoLoadCore ?? defaultAutoLoadCore;
  session.corePath = options.corePath || './config/Packs/Kernel';
  session.coreIncludeIndex = options.coreIncludeIndex ?? true;
  if (session.autoLoadCore) {
    const report = session.loadCore({
      corePath: session.corePath,
      includeIndex: session.coreIncludeIndex,
      validate: true
    });
    if (!report?.success) {
      const summary = (report?.errors || [])
        .map(e => `${e.file}: ${(e.errors || []).join('; ')}`)
        .join(' | ');
      throw new Error(`Core load failed: ${summary || 'unknown error'}`);
    }
    if (report?.warnings?.length) {
      session.warnings.push(...report.warnings);
    }
  }

  dbg('INIT', `Strategy: ${session.hdcStrategy}, Priority: ${session.reasoningPriority}, Profile: ${session.reasoningProfile}`);

  // Ensure max positions are initialized in vocabulary (no-op for strategies that don't need it).
  session.vocabulary.ensurePositions?.(MAX_POSITIONS);
}

export function sessionLearn(session, dsl, options = {}) {
  const ast = (dsl && typeof dsl === 'object' && dsl.type === 'Program' && Array.isArray(dsl.statements))
    ? dsl
    : session.checkDSL(dsl, {
      mode: 'learn',
      allowHoles: true,
      allowNewOperators: false,
      sourceName: options?.sourceName || null
    });
  const snapshot = beginTransaction(session);
  try {
    const result = learnImpl(session, ast);
    if (!result.success) {
      rollbackTransaction(session, snapshot);
      result.facts = 0;
    }
    return result;
  } catch (error) {
    rollbackTransaction(session, snapshot);
    throw error;
  }
}

export function sessionLoadCore(session, options = {}) {
  if (session._coreLoaded && !options.force) {
    return { success: true, errors: [], warnings: session._coreWarnings || [] };
  }
  const report = loadCoreImpl(session, options);
  if (report?.success) {
    session._coreLoaded = true;
    session._coreWarnings = report?.warnings || [];
  }
  return report;
}

export function sessionLoadPack(session, packName, options = {}) {
  const name = String(packName || '').trim();
  if (!name) return { success: false, errors: ['Missing pack name'], warnings: [] };

  const packPath = options.packPath || `./config/Packs/${name}`;
  const includeIndex = options.includeIndex ?? true;
  const validate = options.validate ?? (name === 'Kernel' ? true : false);
  const throwOnValidationError = options.throwOnValidationError ?? false;

  session._packsLoaded ||= new Set();
  const key = `${name}@${packPath}`;
  if (session._packsLoaded.has(key) && !options.force) {
    return { success: true, errors: [], warnings: [] };
  }

  const report = loadCoreImpl(session, {
    corePath: packPath,
    includeIndex,
    validate,
    throwOnValidationError
  });

  if (report?.success) {
    session._packsLoaded.add(key);
  }
  return report;
}

export function sessionAddToKB(session, vector, name = null, metadata = null) {
  let meta = metadata;
  if (session.canonicalizationEnabled && meta) {
    meta = canonicalizeMetadata(session, meta);
  }

  if (isDebugEnabled()) {
    const op = meta?.operator || '?';
    const args = (meta?.args || []).join(' ');
    debug_trace(`[Session:addToKB]`, `Adding fact: ${op} ${args} | name=${name || '(anon)'}`);
  }

  const contradiction = session.checkContradiction(meta);
  if (contradiction) {
    const warningText = typeof contradiction === 'string'
      ? contradiction
      : (contradiction.message || String(contradiction));
    session.warnings.push(warningText);
    if (session.rejectContradictions) {
      throw new ContradictionError(warningText, typeof contradiction === 'string' ? null : contradiction);
    }
  }

  const fact = { id: session.nextFactId++, vector, name, metadata: meta };
  fact.kind = classifyFactKind(meta);
  session.kbFacts.push(fact);
  if (fact.kind === 'theory') session.theoryFacts.push(fact);
  else session.truthFacts.push(fact);
  session._kbBundleVersion++;

  // Exact-match index for fast contradiction checks / direct lookups
  session.factIndex?.addFact?.(fact);
  if (fact.kind === 'truth') session.truthFactIndex?.addFact?.(fact);
  if (fact.kind === 'theory') session.theoryFactIndex?.addFact?.(fact);

  // Index in component KB for fuzzy matching
  session.componentKB.addFact(fact);

  // DS19: allow theories to declare relation properties/constraints at runtime.
  session.semanticIndex?.observeFact?.(fact);
  session.canonicalRewriteIndex?.observeFact?.(fact);

  // Handle synonym declarations
  if (meta?.operator === 'synonym' && meta?.args?.length === 2) {
    session.componentKB.addSynonym(meta.args[0], meta.args[1]);
    dbg('SYNONYM', `Registered synonym: ${meta.args[0]} <-> ${meta.args[1]}`);
  }

  // Handle canonical representative declarations
  if (meta?.operator === 'canonical' && meta?.args?.length === 2) {
    session.componentKB.addCanonical(meta.args[0], meta.args[1]);
    dbg('CANONICAL', `Registered canonical: ${meta.args[0]} -> ${meta.args[1]}`);
  }

  // Syntactic sugar: alias A B behaves like canonical A B (directional).
  if (meta?.operator === 'alias' && meta?.args?.length === 2) {
    session.componentKB.addCanonical(meta.args[0], meta.args[1]);
    dbg('CANONICAL', `Registered alias: ${meta.args[0]} -> ${meta.args[1]}`);
  }

  // Deprecated: `session.kb` is a derived index (bundle) and should be treated as rebuildable.
  // Use `session.getKBBundle()` which provides caching over the authoritative `kbFacts` store.
  session.kb = null;
}

export function sessionGetKBBundle(session) {
  if (session._kbBundleCache && session._kbBundleCacheVersion === session._kbBundleVersion) {
    return session._kbBundleCache;
  }

  const vectors = (session.kbFacts || []).map(f => f.vector).filter(Boolean);
  if (vectors.length === 0) return null;

  session._kbBundleCache = bundle(vectors);
  session._kbBundleCacheVersion = session._kbBundleVersion;
  return session._kbBundleCache;
}

export function sessionCheckContradiction(session, metadata) {
  return checkContradictionImpl(session, metadata);
}

export function sessionQuery(session, dsl, options = {}) {
  dbg('QUERY', 'Starting:', dsl?.substring(0, 60));
  const ast = checkDSLImpl(session, dsl, { mode: 'query', allowHoles: true, sourceName: options?.sourceName || null });
  return queryImpl(session, ast, options);
}

export function sessionProve(session, dsl, options = {}) {
  dbg('PROVE', 'Starting:', dsl?.substring(0, 60));
  const ast = checkDSLImpl(session, dsl, { mode: 'prove', allowHoles: false, sourceName: options?.sourceName || null });
  return proveImpl(session, ast, options);
}

export function sessionQueryURC(session, dsl, options = {}) {
  const result = sessionQuery(session, dsl, options);
  try {
    const count = Array.isArray(result?.results) ? result.results.length : (result?.count ?? 0);
    const status = count > 0 ? 'Sat' : 'Unknown';
    const evidence = sessionRegisterEvidence(session, {
      kind: 'Model',
      method: 'ATP',
      status
    }, { materializeFacts: options.materializeFacts ?? false });
    return { ...result, urcEvidence: evidence };
  } catch {
    return result;
  }
}

export function sessionProveURC(session, dsl, options = {}) {
  const result = sessionProve(session, dsl, options);
  try {
    const valid = !!result?.valid;
    const status = valid ? 'Verified' : 'Falsified';
    const evidence = sessionRegisterEvidence(session, {
      kind: 'Derivation',
      method: 'ATP',
      status
    }, { materializeFacts: options.materializeFacts ?? false });
    return { ...result, urcEvidence: evidence };
  } catch {
    return result;
  }
}

export function sessionSolveURC(session, dsl, options = {}) {
  const materializeFacts = options.materializeFacts ?? false;
  const res = sessionLearn(session, dsl);
  const solve = res?.solveResult || null;
  if (!solve) return { ...res, urcEvidence: null, urcArtifact: null };

  // If the backend already emitted URC audit records (preferred), do not duplicate
  // them by stringifying large solve structures (which may include vectors).
  if (solve?.urc && typeof solve.urc === 'object') {
    return { ...res, urcEvidence: null, urcArtifact: null, urc: solve.urc };
  }

  // Otherwise, keep a conservative summary artifact (avoid embedding vectors).
  function stripVectors(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(stripVectors);
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'vector' || k === 'vectors') continue;
      out[k] = stripVectors(v);
    }
    return out;
  }

  const artifact = sessionRegisterArtifact(session, {
    format: 'JSON',
    text: JSON.stringify(stripVectors(solve), null, 2)
  }, { materializeFacts });

  const problemType = String(solve.problemType || '').toLowerCase();
  const method = problemType === 'planning' ? 'MC' : 'CP';
  const kind = solve.success ? 'Model' : 'UnsatCore';
  const status = solve.success ? 'Sat' : 'Unsat';

  const evidence = sessionRegisterEvidence(session, {
    kind,
    method,
    status,
    artifactId: artifact.id
  }, { materializeFacts });

  return { ...res, urcEvidence: evidence, urcArtifact: artifact };
}

export function sessionAbduce(session, dsl, options = {}) {
  dbg('ABDUCE', 'Starting:', dsl?.substring(0, 60));
  const ast = checkDSLImpl(session, dsl, { mode: 'abduce', allowHoles: false });
  try {
    if (ast.statements.length === 0) {
      return { success: false, reason: 'Empty observation' };
    }

    const result = session.abductionEngine.abduce(ast.statements[0], options);
    session.trackMethod('abduction');
    return result;
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export function sessionInduce(session, options = {}) {
  dbg('INDUCE', 'Analyzing KB patterns');
  try {
    const result = session.inductionEngine.induceRules(options);
    session.trackMethod('induction');
    return result;
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export function sessionLearnFrom(session, examples) {
  dbg('LEARN_FROM', `${examples.length} examples`);
  try {
    const result = session.inductionEngine.learnFrom(examples);
    session.trackMethod('learn_from_examples');
    return result;
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

export function sessionGenerateText(session, operator, args) {
  // Plan verification meta-operator: verifyPlan <planName> <true|false>
  if (operator === 'verifyPlan' && Array.isArray(args) && args.length === 2) {
    const [planName, okRaw] = args;
    const ok = String(okRaw ?? '').toLowerCase();
    if (ok === 'true' || ok === 'valid') return `Plan ${planName} is valid.`;
    if (ok === 'false' || ok === 'invalid') return `Plan ${planName} is invalid.`;
    return `Plan ${planName} verification result: ${okRaw}.`;
  }

  // DS19: helper for multi-variable extraction from CSP solutions.
  // cspTuple <relation> <entity1> <value1> <entity2> <value2> ...
  if (operator === 'cspTuple' && Array.isArray(args) && args.length >= 3) {
    const relation = args[0];
    if (typeof relation === 'string' && relation !== 'cspTuple') {
      const pairs = [];
      for (let i = 1; i + 1 < args.length; i += 2) {
        const entity = args[i];
        const value = args[i + 1];
        if (!entity || !value) continue;
        pairs.push([String(entity), String(value)]);
      }
      if (pairs.length > 0) {
        const rendered = pairs.map(([entity, value]) => {
          const text = session.generateText(relation, [entity, value]);
          return String(text || '').replace(/\.$/, '');
        });
        return `${rendered.join(', ')}.`;
      }
    }
  }

  // DS19: solve blocks define assignment relations; prefer "is at" phrasing for those.
  if (typeof operator === 'string' && Array.isArray(args) && args.length === 2) {
    if (session.semanticIndex?.isAssignmentRelation?.(operator)) {
      return `${args[0]} is at ${args[1]}.`;
    }
  }
  return textGenerator.generate(operator, args);
}

export function sessionElaborate(_session, proof) {
  return textGenerator.elaborate(proof);
}

export function sessionFormatResult(_session, result, type = 'query') {
  return resultFormatterFormat(result, type);
}

export function sessionDescribeResult(session, payload) {
  return session.responseTranslator.translate(payload);
}

export function sessionDescribeDsl(session, dsl, options = {}) {
  return dslToNlImpl(session, dsl, options);
}

export function sessionResolve(session, expr) {
  if (typeof expr === 'string') {
    return session.vocabulary.getOrCreate(expr);
  }
  return session.executor.resolveExpression(expr);
}

export function sessionDump(session) {
  return {
    geometry: session.geometry,
    factCount: session.kbFacts.length,
    ruleCount: session.rules.length,
    vocabularySize: session.vocabulary.size,
    scopeBindings: session.scope.localNames()
  };
}

export function sessionFindAll(session, pattern, options = {}) {
  dbg('FINDALL', 'Pattern:', pattern?.substring?.(0, 60) || pattern);
  const ast = checkDSLImpl(session, pattern, { mode: 'query', allowHoles: true });
  return findAll(session, ast.statements?.[0] || pattern, options);
}

export function sessionClose(session) {
  session.kb = null;
  session.kbFacts = [];
  session.truthFacts = [];
  session.theoryFacts = [];
  session.factIndex = new FactIndex();
  session.truthFactIndex = new FactIndex();
  session.theoryFactIndex = new FactIndex();
  session._relationEdgeCache = new Map();
  session._isAParentsByChildCache = null;
  session._kbBundleVersion++;
  session._kbBundleCache = null;
  session._kbBundleCacheVersion = -1;
  session.rules = [];
  session.scope.clear();
  session.policyView.lastComputedAt = null;
  session.policyView.currentFactIds = new Set();
  session.policyView.supersedes = [];
  session.policyView.negates = [];
  session.policyView.warnings = [];
  session.policyView.policy = null;
  session.policyView.materializedFactLines = [];
  session.policyView._materializedAtKbVersion = null;
}

export function sessionMaterializePolicyView(session, options = {}) {
  const view = materializePolicyViewImpl(session, {
    newerWins: options.newerWins ?? session.policyView.newerWins
  });
  session.policyView.lastComputedAt = Date.now();
  session.policyView.newerWins = view?.policy?.newerWins ?? session.policyView.newerWins;
  session.policyView.currentFactIds = view.currentFactIds;
  session.policyView.supersedes = view.supersedes;
  session.policyView.negates = view.negates;
  session.policyView.warnings = view.warnings;
  session.policyView.policy = view.policy || null;

  const materializeFacts = options.materializeFacts ?? session.urcMaterializeFacts ?? false;
  // DS73: truth vs index split is strict. "Materialized facts" are returned as derived DSL lines for audit/debug,
  // but are NOT injected into the KB truth store (kbFacts) to avoid semantic drift and feedback loops.
  const kbVersion = session._kbBundleVersion ?? 0;
  if (materializeFacts && session.policyView._materializedAtKbVersion !== kbVersion) {
    const lines = [];
    for (const { newFactId, oldFactId } of view.supersedes || []) {
      lines.push(`Supersedes Fact#${newFactId} Fact#${oldFactId}`);
    }
    for (const factId of view.currentFactIds || []) {
      lines.push(`Current Fact#${factId} True`);
    }
    session.policyView.materializedFactLines = lines;
    session.policyView._materializedAtKbVersion = kbVersion;
  } else if (!materializeFacts) {
    session.policyView.materializedFactLines = [];
    session.policyView._materializedAtKbVersion = null;
  }

  return {
    success: true,
    ...view,
    materializedFactLines: Array.isArray(session.policyView.materializedFactLines) ? session.policyView.materializedFactLines : [],
    materializedAtKbVersion: session.policyView._materializedAtKbVersion ?? null,
    lastComputedAt: session.policyView.lastComputedAt
  };
}

export function sessionRebuildIndices(session, options = {}) {
  const includeFactIndex = options.includeFactIndex ?? true;
  const includeFactPartitions = options.includeFactPartitions ?? true;
  const includeComponentKB = options.includeComponentKB ?? true;
  const includeSemanticIndex = options.includeSemanticIndex ?? true;
  const includeCanonicalRewriteIndex = options.includeCanonicalRewriteIndex ?? true;

  if (includeFactIndex) {
    session.factIndex = new FactIndex();
  }
  if (includeFactPartitions) {
    session.truthFacts = [];
    session.theoryFacts = [];
    session.truthFactIndex = new FactIndex();
    session.theoryFactIndex = new FactIndex();
  }
  if (includeComponentKB) {
    session.componentKB = new ComponentKB(session);
  }
  if (includeSemanticIndex) {
    session.semanticIndex = session.useSemanticIndex
      ? (session.allowSemanticFallbacks ? FALLBACK_SEMANTIC_INDEX.clone() : DEFAULT_SEMANTIC_INDEX.clone())
      : new SemanticIndex();
  }
  if (includeCanonicalRewriteIndex) {
    session.canonicalRewriteIndex = session.canonicalizationEnabled && session.allowSemanticFallbacks
      ? new CanonicalRewriteIndex(session)
      : new CanonicalRewriteIndex();
  }

  // Re-index all persisted facts.
  for (const fact of session.kbFacts || []) {
    if (includeFactPartitions) {
      const kind = ensureFactKind(fact);
      if (kind === 'theory') session.theoryFacts.push(fact);
      else session.truthFacts.push(fact);
      if (kind === 'theory') session.theoryFactIndex?.addFact?.(fact);
      else session.truthFactIndex?.addFact?.(fact);
    }
    if (includeFactIndex) session.factIndex?.addFact?.(fact);
    if (includeComponentKB) session.componentKB?.addFact?.(fact);
    if (includeSemanticIndex) session.semanticIndex?.observeFact?.(fact);
    if (includeCanonicalRewriteIndex) session.canonicalRewriteIndex?.observeFact?.(fact);
  }

  // Invalidate derived KB bundle cache.
  session._kbBundleCache = null;
  session._kbBundleCacheVersion = -1;
  return { success: true };
}

export function sessionRecordNlTranslationProvenance(session, payload, options = {}) {
  return recordNlTranslationProvenanceImpl(session, payload, options);
}

export function sessionExecuteNL(session, payload, options = {}) {
  return executeNLImpl(session, payload, options);
}

export function sessionRegisterArtifact(session, payload, options = {}) {
  return registerArtifactImpl(session, payload, options);
}

export function sessionRegisterEvidence(session, payload, options = {}) {
  return registerEvidenceImpl(session, payload, options);
}

export function sessionCompileToSMTLIB2(session, { dsl } = {}, options = {}) {
  const compiled = compileToSMTLIB2({ dsl });
  if (!compiled?.success) return compiled;

  const artifact = sessionRegisterArtifact(session, {
    format: 'SMTLIB2',
    text: compiled.text,
    hash: compiled.hash
  }, { materializeFacts: options.materializeFacts ?? false });

  return { success: true, artifact };
}

export function sessionClassifyFragment(session, { dsl } = {}) {
  try {
    const res = classifyDslFragment(String(dsl || ''));
    return { success: true, ...res, operators: Array.from(res.operators || []).sort((a, b) => a.localeCompare(b)) };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

export function sessionOrchestrate(session, { goalKind, dsl } = {}, options = {}) {
  const kind = String(goalKind || '').trim() || 'Find';
  const fragmentRes = sessionClassifyFragment(session, { dsl });
  if (!fragmentRes?.success) return fragmentRes;

  const materializeFacts = options.materializeFacts ?? false;

  function selectPreferredBackend() {
    const facts = session.kbFacts || [];
    for (let i = facts.length - 1; i >= 0; i--) {
      const meta = facts[i]?.metadata;
      if (!meta || meta.operator !== 'PreferBackend') continue;
      const args = Array.isArray(meta.args) ? meta.args : [];
      if (args.length < 3) continue;
      if (String(args[0]) !== kind) continue;
      if (String(args[1]) !== fragmentRes.fragment) continue;
      return String(args[2]);
    }
    return null;
  }

  function selectFallbackBackend(primary, seen = new Set()) {
    if (!primary) return null;
    const facts = session.kbFacts || [];
    for (let i = facts.length - 1; i >= 0; i--) {
      const meta = facts[i]?.metadata;
      if (!meta || meta.operator !== 'FallbackTo') continue;
      const args = Array.isArray(meta.args) ? meta.args : [];
      if (args.length < 2) continue;
      if (String(args[0]) !== primary) continue;
      const candidate = String(args[1]);
      if (!candidate) continue;
      if (seen.has(candidate)) continue;
      return candidate;
    }
    return null;
  }

  function computeFallbackChain(primary) {
    const start = String(primary || '').trim();
    if (!start) return [];
    const chain = [start];
    const seen = new Set(chain);
    while (true) {
      const next = selectFallbackBackend(chain[chain.length - 1], seen);
      if (!next) break;
      chain.push(next);
      seen.add(next);
    }
    return chain;
  }

  const preferredBackend = selectPreferredBackend();

  // Treat the input DSL as an artifact for auditability.
  const inputArtifact = sessionRegisterArtifact(session, {
    format: 'SYS2DSL',
    text: String(dsl || '')
  }, { materializeFacts });

  const plan = buildPlan({
    goalKind: kind,
    fragment: fragmentRes.fragment,
    steps: []
  });

  const goalId = `Goal_${Date.now()}`;

  // v0 routing policy:
  // - SMT fragments: compile to SMT-LIB2 artifact (no solver execution)
  // - CP / Planning fragments: execute solve blocks via learn adapter (internal backend)
  // - otherwise: return a plan with no steps (caller can choose internal backends)
  const defaultBackend =
    ((fragmentRes.fragment === 'Frag_SMT_LRA' || fragmentRes.fragment === 'Frag_SMT_LIA') ? 'Compile_SMTLIB2' : null) ||
    ((fragmentRes.fragment === 'Frag_CP') ? 'CP_Internal' : null) ||
    ((fragmentRes.fragment === 'Frag_TS') ? 'Planning_Internal' : null) ||
    'Internal';

  const requestedBackend = preferredBackend || defaultBackend;
  const fallbackChain = computeFallbackChain(requestedBackend);
  const candidates = fallbackChain.length > 0 ? fallbackChain : [requestedBackend];

  const builtins = new Set(['Compile_SMTLIB2', 'CP_Internal', 'Planning_Internal', 'Internal']);
  const selectedBackend = candidates.find(b => builtins.has(String(b))) || 'Internal';
  plan.preferredBackend = preferredBackend;
  plan.fallbackChain = candidates;
  plan.selectedBackend = selectedBackend;

  // Record the decision as provenance (audit surface).
  session._provenanceSeq = (session._provenanceSeq || 0) + 1;
  session.provenanceLog ||= [];
  session.provenanceLog.push({
    id: `Orchestrator_${goalId}_${session._provenanceSeq}`,
    kind: 'orchestrator',
    at: Date.now(),
    nlText: '',
    dslText: String(dsl || ''),
    decision: {
      goalKind: kind,
      fragment: fragmentRes.fragment,
      preferredBackend: preferredBackend || null,
      requestedBackend,
      candidates,
      selectedBackend
    },
    materialized: false
  });

  if (selectedBackend === 'Compile_SMTLIB2') {
    const compiled = sessionCompileToSMTLIB2(session, { dsl }, { materializeFacts: options.materializeFacts ?? false });
    if (!compiled?.success) return compiled;
    plan.steps.push({
      id: `Step_${Date.now()}`,
      backend: selectedBackend,
      status: 'Done',
      inputArtifactId: inputArtifact.id,
      artifactId: compiled.artifact.id,
      goalId
    });
    if (materializeFacts) {
      const stepId = plan.steps[0].id;
      plan.materializedFactLines = [
        `goalKind ${goalId} ${kind}`,
        `goalTarget ${goalId} ${inputArtifact.id}`,
        `planHasStep ${plan.id} ${stepId}`,
        `stepGoal ${stepId} ${goalId}`,
        `stepBackend ${stepId} Compile_SMTLIB2`,
        `stepInput ${stepId} ${inputArtifact.id}`,
        `stepOutput ${stepId} ${compiled.artifact.id}`,
        `compiledTo ${stepId} ${compiled.artifact.id}`,
        `stepStatus ${stepId} Done`,
        `FragmentTag ${goalId} ${fragmentRes.fragment}`
      ];
    } else {
      plan.materializedFactLines = [];
    }
    const planArtifact = sessionRegisterArtifact(session, {
      format: 'URC_PLAN_JSON_V0',
      text: JSON.stringify(plan, null, 2)
    }, { materializeFacts: false });
    plan.planArtifactId = planArtifact.id;
    return { success: true, plan, planArtifact, artifact: compiled.artifact };
  }

  if (selectedBackend === 'CP_Internal' || selectedBackend === 'Planning_Internal') {
    const solved = sessionSolveURC(session, dsl, { materializeFacts });
    const backend = selectedBackend;
    const status = solved?.success ? 'Done' : 'Failed';
    const step = {
      id: `Step_${Date.now()}`,
      backend,
      status,
      inputArtifactId: inputArtifact.id,
      goalId,
      outputArtifactId: solved?.urcArtifact?.id || null,
      evidenceId: solved?.urcEvidence?.id || null
    };
    plan.steps.push(step);

    if (materializeFacts) {
      plan.materializedFactLines = [
        `goalKind ${goalId} ${kind}`,
        `goalTarget ${goalId} ${inputArtifact.id}`,
        `planHasStep ${plan.id} ${step.id}`,
        `stepGoal ${step.id} ${goalId}`,
        `stepBackend ${step.id} ${backend}`,
        `stepInput ${step.id} ${inputArtifact.id}`,
        ...(step.outputArtifactId ? [`stepOutput ${step.id} ${step.outputArtifactId}`] : []),
        `stepStatus ${step.id} ${status}`,
        `FragmentTag ${goalId} ${fragmentRes.fragment}`
      ];
    } else {
      plan.materializedFactLines = [];
    }

    const planArtifact = sessionRegisterArtifact(session, {
      format: 'URC_PLAN_JSON_V0',
      text: JSON.stringify(plan, null, 2)
    }, { materializeFacts: false });
    plan.planArtifactId = planArtifact.id;
    return { success: true, plan, planArtifact, solve: solved };
  }

  plan.steps.push({
    id: `Step_${Date.now()}`,
    backend: selectedBackend,
    status: 'Planned',
    inputArtifactId: inputArtifact.id,
    goalId
  });
  if (materializeFacts) {
    const stepId = plan.steps[0].id;
    plan.materializedFactLines = [
      `goalKind ${goalId} ${kind}`,
      `goalTarget ${goalId} ${inputArtifact.id}`,
      `planHasStep ${plan.id} ${stepId}`,
      `stepGoal ${stepId} ${goalId}`,
      `stepBackend ${stepId} ${selectedBackend}`,
      `stepInput ${stepId} ${inputArtifact.id}`,
      `stepStatus ${stepId} Planned`,
      `FragmentTag ${goalId} ${fragmentRes.fragment}`
    ];
  } else {
    plan.materializedFactLines = [];
  }
  const planArtifact = sessionRegisterArtifact(session, {
    format: 'URC_PLAN_JSON_V0',
    text: JSON.stringify(plan, null, 2)
  }, { materializeFacts: false });
  plan.planArtifactId = planArtifact.id;
  return { success: true, plan, planArtifact };
}
