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

const DimensionRegistry = require('../core/dimension_registry');

// =========================================================================
// FS-SR-03: Relation properties from DimensionRegistry (not hardcoded)
// =========================================================================

// IS_A variants map to base IS_A relation with different existence levels
// When querying with IS_A, all variants are searched and best existence is returned
const IS_A_VARIANTS = new Set([
  'IS_A',
  'IS_A_CERTAIN',
  'IS_A_PROVEN',
  'IS_A_POSSIBLE',
  'IS_A_UNPROVEN'
]);

// Map IS_A variants to their existence levels
const IS_A_EXISTENCE_MAP = {
  'IS_A': null,         // Uses fact's _existence field
  'IS_A_CERTAIN': 127,  // CERTAIN
  'IS_A_PROVEN': 64,    // DEMONSTRATED
  'IS_A_POSSIBLE': 0,   // POSSIBLE
  'IS_A_UNPROVEN': -64  // UNPROVEN
};

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

    // FS-SR-03: Use DimensionRegistry for relation properties
    this.dimRegistry = DimensionRegistry.getShared();

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
    // FS-02 Integration: Pass shared theoryStack for unified layering
    this.dsl = new TheoryDSLEngine({
      api: this,
      conceptStore: this.conceptStore,
      config: this.config,
      theoryStack: this.theoryStack
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

  /**
   * Ingest a fact into the knowledge base
   *
   * For IS_A variants, the appropriate existence level is automatically applied:
   * - IS_A_CERTAIN: existence=127
   * - IS_A_PROVEN: existence=64
   * - IS_A_POSSIBLE: existence=0
   * - IS_A_UNPROVEN: existence=-64
   *
   * @param {string} text - Natural language assertion
   * @param {Object} [options] - Options
   * @param {number} [options.existence] - Override existence level (-127 to 127)
   */
  ingest(text, options = {}) {
    const canonical = this.translator.normalise(text);
    const ast = this.parser.parseAssertion(canonical);
    this.conceptStore.ensureConcept(ast.subject);
    this.conceptStore.ensureConcept(ast.object);

    // Determine existence level
    let existence;
    if (options.existence !== undefined) {
      // Explicit existence override
      existence = options.existence;
    } else if (IS_A_EXISTENCE_MAP[ast.relation] !== null && IS_A_EXISTENCE_MAP[ast.relation] !== undefined) {
      // IS_A variant with defined existence level
      existence = IS_A_EXISTENCE_MAP[ast.relation];
    } else {
      // Default to CERTAIN for theory facts
      existence = this.conceptStore.EXISTENCE ? this.conceptStore.EXISTENCE.CERTAIN : 127;
    }

    this.conceptStore.addFact({
      subject: ast.subject,
      relation: ast.relation,
      object: ast.object
    }, { existence });

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
    this.audit.write({ kind: 'ingest', sentence: canonical, existence });
  }

  // =========================================================================
  // DSL-ONLY API (FS-19: DSL-in → DSL-out, no NL processing)
  // These methods bypass TranslatorBridge for deterministic, LLM-independent operation
  // =========================================================================

  /**
   * Ingest a fact directly from DSL (no NL processing)
   * Implements FS-19: Reasoning Engine Layer (DSL-in → DSL-out)
   *
   * @param {Object} triple - Pre-parsed triple {subject, relation, object}
   * @param {Object} [options] - Options
   * @param {number} [options.existence] - Existence level (-127 to 127)
   * @returns {Object} Result with factId and status
   */
  ingestDSL(triple, options = {}) {
    if (!triple || !triple.subject || !triple.relation || !triple.object) {
      throw new Error('ingestDSL requires {subject, relation, object}');
    }

    this.conceptStore.ensureConcept(triple.subject);
    this.conceptStore.ensureConcept(triple.object);

    // Determine existence level
    let existence;
    if (options.existence !== undefined) {
      existence = options.existence;
    } else if (IS_A_EXISTENCE_MAP[triple.relation] !== null && IS_A_EXISTENCE_MAP[triple.relation] !== undefined) {
      existence = IS_A_EXISTENCE_MAP[triple.relation];
    } else {
      existence = this.conceptStore.EXISTENCE ? this.conceptStore.EXISTENCE.CERTAIN : 127;
    }

    const factId = this.conceptStore.addFact({
      subject: triple.subject,
      relation: triple.relation,
      object: triple.object
    }, { existence });

    // Encode into vector space
    try {
      this.encoder.ingestFact(triple, triple.subject);
    } catch (e) {
      if (this.audit) {
        this.audit.write({ kind: 'ingestDSLEncodingError', message: e.message });
      }
    }

    this.audit.write({
      kind: 'ingestDSL',
      triple,
      existence,
      factId
    });

    return { ok: true, factId, existence };
  }

  /**
   * Query directly from DSL (no NL processing)
   * Implements FS-19: Reasoning Engine Layer (DSL-in → DSL-out)
   *
   * @param {Object} triple - Pre-parsed triple {subject, relation, object}
   * @param {Object} [options] - Options
   * @param {Object} [options.mask] - Dimension mask
   * @param {boolean} [options.withExistence] - Include existence level in result
   * @returns {Object} Query result with truth, confidence, provenance
   */
  askDSL(triple, options = {}) {
    if (!triple || !triple.subject || !triple.relation || !triple.object) {
      throw new Error('askDSL requires {subject, relation, object}');
    }

    const { subject, relation, object } = triple;
    let result;

    // Get facts for inference
    const facts = this.conceptStore.getFacts();

    // First, try InferenceEngine if it has registered rules or defaults
    const inferenceEngine = this.dsl && this.dsl.inferenceEngine;
    if (inferenceEngine && (inferenceEngine.rules.length > 0 || inferenceEngine.defaults.length > 0)) {
      const inferResult = inferenceEngine.infer(subject, relation, object, facts);
      if (inferResult.truth === 'TRUE_CERTAIN' || inferResult.truth === 'TRUE_DEFAULT' || inferResult.truth === 'FALSE') {
        result = inferResult;
      }
    }

    // If InferenceEngine didn't resolve, fall back to basic reasoning
    if (!result || result.truth === 'UNKNOWN') {
      if (IS_A_VARIANTS.has(relation)) {
        const minExistence = IS_A_EXISTENCE_MAP[relation] !== null
          ? IS_A_EXISTENCE_MAP[relation]
          : undefined;

        result = this.reasoner.deduceIsAWithExistence(subject, object, { minExistence });

        if (result.existence !== undefined && !options.withExistence) {
          result = { ...result, depth: result.depth, method: result.method };
        }
      } else if (this.dimRegistry.isTransitive(relation)) {
        // FS-SR-03: Use DimensionRegistry for transitive check
        result = this.reasoner.deduceTransitive(subject, relation, object);
      } else if (this.dimRegistry.isInheritable(relation)) {
        // FS-SR-03: Use DimensionRegistry for inheritable check
        result = this.reasoner.deduceWithInheritance(subject, relation, object);
      } else {
        result = this.reasoner.factExists(subject, relation, object);
      }
    }

    // Geometric reasoning
    let geom = null;
    try {
      if (this.encoder && typeof this.encoder.encodeNode === 'function') {
        const queryVector = this.encoder.encodeNode(triple, 0);
        const conceptId = relation === 'IS_A' ? object : subject;
        const mask = options.mask || null;
        geom = this.reasoner.answer(queryVector, conceptId, { mask });
      }
    } catch (e) {
      if (this.audit) {
        this.audit.write({ kind: 'askDSLGeometryError', message: e.message });
      }
    }

    // Merge provenances - preserve reasoning metrics (stepsExecuted, trace, etc.)
    // while adding geometric information
    const mergedProvenance = geom
      ? {
          ...result.provenance,            // Keep reasoning metrics (stepsExecuted, trace, nodesVisited, etc.)
          ...geom.provenance,              // Add geometric info (distance, band info)
          stepsExecuted: result.provenance?.stepsExecuted,  // Ensure not overwritten
          trace: result.provenance?.trace,
          nodesVisited: result.provenance?.nodesVisited,
          edgesExplored: result.provenance?.edgesExplored,
          chainLength: result.provenance?.chainLength
        }
      : result.provenance;

    const merged = geom
      ? { ...result, band: geom.band, provenance: mergedProvenance }
      : result;

    this.audit.write({
      kind: 'askDSL',
      triple,
      truth: merged.truth,
      confidence: merged.confidence,
      existence: merged.existence,
      method: merged.method,
      band: merged.band
    });

    return merged;
  }

  // =========================================================================
  // NL-AWARE API (FS-20: Optional NL↔DSL Translation Layer)
  // These methods use TranslatorBridge for natural language processing
  // =========================================================================

  ask(question, options = {}) {
    const canonical = this.translator.normalise(question);
    const ast = this.parser.parseQuestion(canonical);
    let result;

    // Get facts for inference
    const facts = this.conceptStore.getFacts();

    // First, try InferenceEngine if it has registered rules or defaults
    // This handles composition rules and default reasoning
    const inferenceEngine = this.dsl && this.dsl.inferenceEngine;
    if (inferenceEngine && (inferenceEngine.rules.length > 0 || inferenceEngine.defaults.length > 0)) {
      const inferResult = inferenceEngine.infer(ast.subject, ast.relation, ast.object, facts);
      if (inferResult.truth === 'TRUE_CERTAIN' || inferResult.truth === 'TRUE_DEFAULT' || inferResult.truth === 'FALSE') {
        result = inferResult;
      }
    }

    // If InferenceEngine didn't resolve, fall back to basic reasoning
    if (!result || result.truth === 'UNKNOWN') {
      if (IS_A_VARIANTS.has(ast.relation)) {
        // IS_A umbrella: search all IS_A variants and return best existence
        // For specific variants (IS_A_PROVEN etc), filter by their minimum existence
        const minExistence = IS_A_EXISTENCE_MAP[ast.relation] !== null
          ? IS_A_EXISTENCE_MAP[ast.relation]
          : undefined;

        result = this.reasoner.deduceIsAWithExistence(ast.subject, ast.object, {
          minExistence
        });

        // Backward compatibility: convert existence-aware result to legacy format if needed
        if (result.existence !== undefined && !options.withExistence) {
          // Keep result as-is but add legacy fields
          result = {
            ...result,
            depth: result.depth,
            method: result.method
          };
        }
      } else if (this.dimRegistry.isTransitive(ast.relation)) {
        // FS-SR-03: Use DimensionRegistry for transitive check
        result = this.reasoner.deduceTransitive(ast.subject, ast.relation, ast.object);
      } else if (this.dimRegistry.isInheritable(ast.relation)) {
        // FS-SR-03: Use DimensionRegistry for inheritable check
        result = this.reasoner.deduceWithInheritance(ast.subject, ast.relation, ast.object);
      } else {
        result = this.reasoner.factExists(ast.subject, ast.relation, ast.object);
      }
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
    // Merge provenances - preserve reasoning metrics while adding geometric info
    const mergedProvenanceAsk = geom
      ? {
          ...result.provenance,
          ...geom.provenance,
          stepsExecuted: result.provenance?.stepsExecuted,
          trace: result.provenance?.trace,
          nodesVisited: result.provenance?.nodesVisited,
          edgesExplored: result.provenance?.edgesExplored,
          chainLength: result.provenance?.chainLength
        }
      : result.provenance;
    const merged = geom
      ? { ...result, band: geom.band, provenance: mergedProvenanceAsk }
      : result;
    this.audit.write({
      kind: 'ask',
      subject: ast.subject,
      relation: ast.relation,
      object: ast.object,
      truth: merged.truth,
      confidence: merged.confidence,
      existence: merged.existence,
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
