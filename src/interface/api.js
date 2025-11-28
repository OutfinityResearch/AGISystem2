const fs = require('fs');
const path = require('path');
const VectorSpace = require('../core/vector_space');
const MathEngine = require('../core/math_engine');
const RelationPermuter = require('../core/relation_permuter');
const ConceptStore = require('../knowledge/concept_store');
const TheoryStack = require('../knowledge/theory_stack');
const TheoryLayer = require('../knowledge/theory_layer');
const NLParser = require('../ingest/parser');
const TranslatorBridge = require('./translator_bridge');
const Reasoner = require('../reason/reasoner');
const TheoryDSLEngine = require('../theory/dsl_engine');
const ClusterManager = require('../ingest/clustering');
const Encoder = require('../ingest/encoder');
const BiasController = require('../reason/bias_control');
const Retriever = require('../reason/retrieval');
const TemporalMemory = require('../reason/temporal_memory');
const ValidationEngine = require('../reason/validation');

// Relations that support transitive reasoning (chaining)
// e.g., friction CAUSES heat, heat CAUSES expansion → friction CAUSES expansion
const TRANSITIVE_RELATIONS = new Set([
  'IS_A',
  'LOCATED_IN',
  'PART_OF',
  'HAS_PART',
  'CONTAINS',
  'SUBSET_OF',
  'MEMBER_OF',
  'CAUSES',      // friction → heat → expansion
  'BEFORE',      // WW1 → WW2 → Cold War
  'AFTER',       // testing → development (inverse of BEFORE)
  'LEADS_TO'     // similar to CAUSES
]);

// Relations that support inheritance via IS_A chains
// e.g., Tesla IS_A car, car HAS wheel → Tesla HAS wheel
const INHERITABLE_RELATIONS = new Set([
  'HAS',
  'HELPS',
  'CAN',
  'PROVIDES',
  'REQUIRES',
  'DESIGNS',
  'PRODUCES'
]);

class EngineAPI {
  constructor(deps) {
    const {
      config,
      audit,
      storage,
      translator,
      baseTheoryFile
    } = deps;
    this.config = config;
    this.audit = audit;
    this.storage = storage;
    this.vspace = new VectorSpace(this.config);
    this.conceptStore = new ConceptStore(this.config.get('dimensions'));
    this.theoryStack = new TheoryStack(this.config.get('dimensions'));
    this.permuter = new RelationPermuter(this.config);
    this.permuter.bootstrapDefaults();
    this.parser = new NLParser(this.config.get('recursionHorizon'));
    this.translator = translator || new TranslatorBridge();
    this.cluster = new ClusterManager({
      config: this.config,
      math: MathEngine,
      vspace: this.vspace
    });
    this.encoder = new Encoder({
      config: this.config,
      vspace: this.vspace,
      math: MathEngine,
      permuter: this.permuter,
      store: this.conceptStore,
      cluster: this.cluster
    });
    this.bias = new BiasController({ config: this.config, audit: this.audit });
    this.retriever = new Retriever({
      config: this.config,
      math: MathEngine,
      store: this.conceptStore
    });
    this.temporal = new TemporalMemory({
      config: this.config,
      math: MathEngine,
      permuter: this.permuter,
      vspace: this.vspace
    });
    this.validation = new ValidationEngine({
      stack: this.theoryStack,
      store: this.conceptStore,
      math: MathEngine,
      bias: this.bias,
      config: this.config,
      audit: this.audit
    });
    this.reasoner = new Reasoner({
      store: this.conceptStore,
      stack: this.theoryStack,
      math: MathEngine,
      bias: this.bias,
      retriever: this.retriever,
      temporal: this.temporal,
      permuter: this.permuter,
      config: this.config
    });
    this.dsl = new TheoryDSLEngine({
      api: this,
      conceptStore: this.conceptStore,
      config: this.config
    });
    this._macroCache = {};

    if (baseTheoryFile && this.storage && typeof this.storage.loadTheoryText === 'function') {
      const text = this.storage.loadTheoryText(baseTheoryFile);
      if (text) {
        // Seed theory stack via DSL if needed; for now we treat it as a script that may configure layers.
        this.dsl.runScript(
          text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#')),
          { initialEnv: {} }
        );
      }
    }
  }

  ingest(text) {
    const canonical = this.translator.normalise(text);
    const ast = this.parser.parseAssertion(canonical);
    this.conceptStore.ensureConcept(ast.subject);
    this.conceptStore.ensureConcept(ast.object);
    this.conceptStore.addFact({
      subject: ast.subject,
      relation: ast.relation,
      object: ast.object
    });
    try {
      this.encoder.ingestFact(ast, ast.subject);
    } catch (e) {
      if (this.audit) {
        this.audit.write({
          kind: 'ingestEncodingError',
          message: e.message
        });
      }
    }
    this.audit.write({ kind: 'ingest', sentence: canonical });
  }

  ask(question, options = {}) {
    const canonical = this.translator.normalise(question);
    const ast = this.parser.parseQuestion(canonical);
    let result;
    if (ast.relation === 'IS_A') {
      result = this.reasoner.deduceIsA(ast.subject, ast.object);
    } else if (TRANSITIVE_RELATIONS.has(ast.relation)) {
      // Use transitive reasoning for relations like LOCATED_IN, PART_OF, etc.
      result = this.reasoner.deduceTransitive(ast.subject, ast.relation, ast.object);
    } else if (INHERITABLE_RELATIONS.has(ast.relation)) {
      // Use inheritance reasoning for relations like HAS, HELPS, etc.
      // e.g., if Tesla IS_A car and car HAS wheel, then Tesla HAS wheel
      result = this.reasoner.deduceWithInheritance(ast.subject, ast.relation, ast.object);
    } else {
      result = this.reasoner.factExists(ast.subject, ast.relation, ast.object);
    }
    let geom = null;
    try {
      if (this.encoder && typeof this.encoder.encodeNode === 'function') {
        const queryVector = this.encoder.encodeNode(ast, 0);
        const conceptId = ast.relation === 'IS_A' ? ast.object : ast.subject;
        const mask = options && options.mask ? options.mask : null;
        geom = this.reasoner.answer(queryVector, conceptId, { mask });
      }
    } catch (e) {
      if (this.audit) {
        this.audit.write({
          kind: 'askGeometryError',
          message: e.message
        });
      }
    }
    const merged = geom
      ? { ...result, band: geom.band, provenance: geom.provenance }
      : result;
    this.audit.write({
      kind: 'ask',
      subject: ast.subject,
      relation: ast.relation,
      object: ast.object,
      truth: merged.truth,
      confidence: merged.confidence,
      method: merged.method,
      band: merged.band
    });
    return merged;
  }

  setContext(layers) {
    this.theoryStack.clear();
    if (Array.isArray(layers)) {
      for (const layerConfig of layers) {
        this.pushTheory(layerConfig);
      }
    }
  }

  pushTheory(layerConfig) {
    const dims = this.config.get('dimensions');
    const layer = new TheoryLayer(layerConfig.id || layerConfig.name || 'layer', dims);
    this.theoryStack.push(layer);
    this.audit.write({
      kind: 'pushTheory',
      id: layer.id
    });
  }

  popTheory() {
    const active = this.theoryStack.getActiveLayers();
    if (active.length === 0) {
      return null;
    }
    const removed = active[active.length - 1];
    this.theoryStack.layers.pop();
    this.audit.write({
      kind: 'popTheory',
      id: removed.id
    });
    return removed;
  }

  listConcepts() {
    const labels = [];
    for (const [label] of this.conceptStore._concepts.entries()) {
      labels.push(label);
    }
    return labels;
  }

  inspectConcept(id) {
    const concept = this.conceptStore.getConcept(id);
    if (!concept) {
      return null;
    }
    return {
      label: concept.label,
      diamonds: concept.diamonds.map((d) => ({
        id: d.id,
        label: d.label,
        radius: d.l1Radius
      }))
    };
  }

  validate(spec) {
    if (!spec || !spec.type) {
      throw new Error('validate requires a spec with a type');
    }
    if (spec.type === 'consistency') {
      return this.validation.checkConsistency(spec.conceptId);
    }
    if (spec.type === 'inclusion') {
      return this.validation.proveInclusion(spec.point, spec.conceptId);
    }
    return this.validation.abstractQuery(spec);
  }

  /**
   * Abductive reasoning: find causes for an observation
   *
   * Returns multiple hypotheses ranked by usage priority.
   * Higher-priority (frequently used) concepts rank higher as they're
   * more likely to be relevant explanations.
   *
   * @param {string} observation - The effect to explain
   * @param {string} [relation] - Optional relation filter (CAUSES, CAUSED_BY)
   * @param {Object} [options] - Options
   * @param {number} [options.k=5] - Number of hypotheses to return
   * @param {boolean} [options.transitive=true] - Follow transitive causes
   * @returns {Object} Result with hypotheses array
   */
  abduct(observation, relation, options = {}) {
    const result = this.reasoner.abductCause(observation, null, options);
    this.audit.write({
      kind: 'abduct',
      observation,
      relation,
      hypothesis: result.hypothesis,
      band: result.band,
      hypothesesCount: result.hypotheses?.length || 0
    });
    return result;
  }

  counterfactualAsk(question, extraFactLines) {
    const canonical = this.translator.normalise(question);
    const ast = this.parser.parseQuestion(canonical);
    const facts = [];
    for (const line of extraFactLines) {
      const canonicalFact = this.translator.normalise(line);
      const astFact = this.parser.parseAssertion(canonicalFact);
      facts.push({
        subject: astFact.subject,
        relation: astFact.relation,
        object: astFact.object
      });
    }
    const contextStack = [{ facts }];
    let result;
    if (ast.relation === 'IS_A') {
      result = this.reasoner.deduceIsA(ast.subject, ast.object, contextStack);
    } else {
      result = this.reasoner.factExists(ast.subject, ast.relation, ast.object, contextStack);
    }
    this.audit.write({
      kind: 'counterfactualAsk',
      question: canonical,
      extraFactsCount: facts.length,
      truth: result.truth
    });
    return result;
  }

  // Domain-specific helpers (health/export/narrative) are intentionally omitted from the core EngineAPI
  // in the Sys2DSL design; they should be implemented as Sys2DSL programmes interpreted by System2Session.
}

module.exports = EngineAPI;
