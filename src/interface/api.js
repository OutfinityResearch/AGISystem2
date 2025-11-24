const fs = require('fs');
const path = require('path');
const Config = require('../support/config');
const AuditLog = require('../support/audit_log');
const StorageAdapter = require('../support/storage');
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

class EngineAPI {
  constructor(rawConfig) {
    this.config = new Config().load(rawConfig || {});
    this.audit = new AuditLog(this.config.get('storageRoot'));
    this.storage = new StorageAdapter({ config: this.config, audit: this.audit });
    this.vspace = new VectorSpace(this.config);
    this.conceptStore = new ConceptStore(this.config.get('dimensions'));
    this.theoryStack = new TheoryStack(this.config.get('dimensions'));
    this.permuter = new RelationPermuter(this.config);
    this.permuter.bootstrapDefaults();
    this.parser = new NLParser(this.config.get('recursionHorizon'));
    this.translator = new TranslatorBridge();
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
  }

  ingest(text) {
    const canonical = this.translator.normalise(text);
    const ast = this.parser.parseSentence(canonical);
    if (ast.kind !== 'assertion') {
      throw new Error('ingest expects an assertion');
    }
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

  ask(question) {
    const canonical = this.translator.normalise(question);
    const ast = this.parser.parseSentence(canonical);
    if (ast.kind !== 'question') {
      throw new Error('ask expects a question');
    }
    let result;
    if (ast.relation === 'IS_A') {
      result = this.reasoner.deduceIsA(ast.subject, ast.object);
    } else {
      result = this.reasoner.factExists(ast.subject, ast.relation, ast.object);
    }
    let geom = null;
    try {
      if (this.encoder && typeof this.encoder.encodeNode === 'function') {
        const queryVector = this.encoder.encodeNode(ast, 0);
        const conceptId = ast.relation === 'IS_A' ? ast.object : ast.subject;
        geom = this.reasoner.answer(queryVector, conceptId);
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
      band: merged.band
    });
    return merged;
  }

  getAgenticSession() {
    const api = this;
    return {
      ingest(sentence) {
        return api.ingest(sentence);
      },
      ask(question) {
        return api.ask(question);
      },
      abduct(observation, relation) {
        return api.abduct(observation, relation);
      }
    };
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

  abduct(observation, relation) {
    const result = this.reasoner.abductCause(observation);
    this.audit.write({
      kind: 'abduct',
      observation,
      relation,
      hypothesis: result.hypothesis,
      band: result.band
    });
    return result;
  }

  counterfactualAsk(question, extraFactLines) {
    const canonical = this.translator.normalise(question);
    const ast = this.parser.parseSentence(canonical);
    if (ast.kind !== 'question') {
      throw new Error('counterfactualAsk expects a question');
    }
    const facts = [];
    for (const line of extraFactLines) {
      const canonicalFact = this.translator.normalise(line);
      const astFact = this.parser.parseSentence(canonicalFact);
      if (astFact.kind !== 'assertion') {
        throw new Error(`Counterfactual fact must be an assertion: '${line}'`);
      }
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

  checkProcedureCompliance(procedureId, extraFactLines = []) {
    const contextFacts = [];
    for (const line of extraFactLines) {
      const canonical = this.translator.normalise(line);
      const ast = this.parser.parseSentence(canonical);
      if (ast.kind !== 'assertion') {
        throw new Error(`Compliance fact must be an assertion: '${line}'`);
      }
      contextFacts.push({
        subject: ast.subject,
        relation: ast.relation,
        object: ast.object
      });
    }
    const script = this._loadMacroLines('health_procedure');
    const env = this.dsl.runScript(script, {
      initialEnv: { procId: procedureId },
      contextFacts
    });
    const resultObj = env.result || env.compliance || env.decision || { truth: 'FALSE' };
    const result = { truth: resultObj.truth || 'FALSE' };
    this.audit.write({
      kind: 'checkProcedureCompliance',
      procedureId,
      extraFactsCount: contextFacts.length,
      truth: result.truth
    });
    return result;
  }

  checkExport(actionId, regulations, extraFactLines = []) {
    const contextFacts = [];
    for (const line of extraFactLines) {
      const canonical = this.translator.normalise(line);
      const ast = this.parser.parseSentence(canonical);
      if (ast.kind !== 'assertion') {
        throw new Error(`Export fact must be an assertion: '${line}'`);
      }
      contextFacts.push({
        subject: ast.subject,
        relation: ast.relation,
        object: ast.object
      });
    }
    const script = this._loadMacroLines('export_action');
    const env = this.dsl.runScript(script, {
      initialEnv: { actionId, regs: regulations },
      contextFacts
    });
    const resultObj = env.result || env.decision || { truth: 'FALSE' };
    const result = { truth: resultObj.truth || 'FALSE' };
    this.audit.write({
      kind: 'checkExport',
      actionId,
      regulations,
      extraFactsCount: contextFacts.length,
      truth: result.truth
    });
    return result;
  }

  checkMagicInCity(actorId, cityId, extraFactLines = []) {
    const contextFacts = [];
    for (const line of extraFactLines) {
      const canonical = this.translator.normalise(line);
      const ast = this.parser.parseSentence(canonical);
      if (ast.kind !== 'assertion') {
        throw new Error(`Magic fact must be an assertion: '${line}'`);
      }
      contextFacts.push({
        subject: ast.subject,
        relation: ast.relation,
        object: ast.object
      });
    }
    const script = this._loadMacroLines('narrative_magic');
    const env = this.dsl.runScript(script, {
      initialEnv: { actorId, cityId },
      contextFacts
    });
    const resultObj = env.result || env.decision || { truth: 'FALSE' };
    const result = { truth: resultObj.truth || 'FALSE' };
    this.audit.write({
      kind: 'checkMagicInCity',
      actorId,
      cityId,
      extraFactsCount: contextFacts.length,
      truth: result.truth
    });
    return result;
  }

  _loadMacroLines(name) {
    if (this._macroCache && this._macroCache[name]) {
      return this._macroCache[name];
    }

    const candidates = [];

    // User-level override: <storageRoot>/../macros/<name>.dsl
    try {
      const storageRoot = this.config.get('storageRoot');
      if (storageRoot && typeof storageRoot === 'string') {
        const userBase = path.resolve(storageRoot, '..', 'macros');
        candidates.push(path.join(userBase, `${name}.dsl`));
      }
    } catch {
      // If config is not loaded for some reason, skip user-level macro path.
    }

    // Built-in macros shipped with the engine.
    const builtinBase = path.join(__dirname, '..', '..', 'data', 'init', 'macros');
    candidates.push(path.join(builtinBase, `${name}.dsl`));

    let filePath = null;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      throw new Error(
        `Macro file not found for '${name}'. Tried: ${candidates.join(', ')}`
      );
    }

    const lines = fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
    this._macroCache[name] = lines;
    return lines;
  }
}

module.exports = EngineAPI;
