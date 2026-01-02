import { ComponentKB } from '../reasoning/component-kb.mjs';
import { FactIndex } from './fact-index.mjs';
import { ensureFactKind } from './fact-kind.mjs';

function cloneReasoningStats(stats) {
  if (!stats) return {};
  return {
    ...stats,
    proofLengths: Array.isArray(stats.proofLengths) ? [...stats.proofLengths] : [],
    methods: { ...(stats.methods || {}) },
    operations: { ...(stats.operations || {}) }
  };
}

function rebuildComponentKB(session, facts) {
  const componentKB = new ComponentKB(session);
  for (const fact of facts || []) {
    componentKB.addFact(fact);
    const meta = fact?.metadata;
    if (meta?.operator === 'synonym' && meta?.args?.length === 2) {
      componentKB.addSynonym(meta.args[0], meta.args[1]);
    }
    if (meta?.operator === 'canonical' && meta?.args?.length === 2) {
      componentKB.addCanonical(meta.args[0], meta.args[1]);
    }
    if (meta?.operator === 'alias' && meta?.args?.length === 2) {
      componentKB.addCanonical(meta.args[0], meta.args[1]);
    }
  }
  session.componentKB = componentKB;
}

function rebuildFactIndex(session, facts) {
  const all = new FactIndex();
  const truth = new FactIndex();
  const theory = new FactIndex();
  session.truthFacts = [];
  session.theoryFacts = [];

  for (const fact of facts || []) {
    all.addFact(fact);
    const kind = ensureFactKind(fact);
    if (kind === 'theory') {
      theory.addFact(fact);
      session.theoryFacts.push(fact);
    } else {
      truth.addFact(fact);
      session.truthFacts.push(fact);
    }
  }

  session.factIndex = all;
  session.truthFactIndex = truth;
  session.theoryFactIndex = theory;
}

export function beginTransaction(session) {
  return {
    scopeBindings: new Map(session.scope?.bindings || []),
    scopeParent: session.scope?.parent || null,
    vocabularyAtoms: new Map(session.vocabulary?.atoms || []),
    vocabularyReverse: new Map(session.vocabulary?.reverse || []),
    kbFacts: (session.kbFacts || []).slice(),
    nextFactId: session.nextFactId,
    kb: session.kb,
    kbBundleVersion: session._kbBundleVersion,
    kbBundleCache: session._kbBundleCache,
    kbBundleCacheVersion: session._kbBundleCacheVersion,
    rules: (session.rules || []).slice(),
    operators: new Map(session.operators || []),
    declaredOperators: new Set(session.declaredOperators || []),
    warnings: (session.warnings || []).slice(),
    referenceTexts: new Map(session.referenceTexts || []),
    referenceMetadata: new Map(session.referenceMetadata || []),
    graphs: new Map(session.graphs || []),
    graphAliases: new Map(session.graphAliases || []),
    theories: new Map(session.theories || []),
    executorLoadedTheories: new Set(session.executor?.loadedTheories || []),
    reasoningStats: cloneReasoningStats(session.reasoningStats),
    semanticIndex: session.semanticIndex?.clone?.() || null,
    canonicalRewriteIndex: session.canonicalRewriteIndex?.clone?.() || null
  };
}

export function rollbackTransaction(session, snapshot) {
  if (!snapshot || !session) return;

  if (session.scope) {
    session.scope.bindings = new Map(snapshot.scopeBindings);
    session.scope.parent = snapshot.scopeParent;
  }

  if (session.vocabulary) {
    session.vocabulary.atoms = new Map(snapshot.vocabularyAtoms);
    session.vocabulary.reverse = new Map(snapshot.vocabularyReverse);
  }

  session.kbFacts = snapshot.kbFacts.slice();
  session.nextFactId = snapshot.nextFactId;
  session.kb = snapshot.kb;
  session._kbBundleVersion = snapshot.kbBundleVersion;
  session._kbBundleCache = snapshot.kbBundleCache;
  session._kbBundleCacheVersion = snapshot.kbBundleCacheVersion;

  session.rules = snapshot.rules.slice();
  session.operators = new Map(snapshot.operators);
  session.declaredOperators = new Set(snapshot.declaredOperators);
  session.warnings = snapshot.warnings.slice();
  session.referenceTexts = new Map(snapshot.referenceTexts);
  session.referenceMetadata = new Map(snapshot.referenceMetadata);
  session.graphs = new Map(snapshot.graphs);
  session.graphAliases = new Map(snapshot.graphAliases);
  session.theories = new Map(snapshot.theories);

  if (session.executor) {
    session.executor.loadedTheories = new Set(snapshot.executorLoadedTheories);
  }

  session.reasoningStats = cloneReasoningStats(snapshot.reasoningStats);
  if (snapshot.semanticIndex && session.semanticIndex?.clone) {
    session.semanticIndex = snapshot.semanticIndex.clone();
  }
  if (snapshot.canonicalRewriteIndex && session.canonicalRewriteIndex?.clone) {
    session.canonicalRewriteIndex = snapshot.canonicalRewriteIndex.clone();
  }

  rebuildComponentKB(session, session.kbFacts);
  rebuildFactIndex(session, session.kbFacts);
}

export default {
  beginTransaction,
  rollbackTransaction
};
