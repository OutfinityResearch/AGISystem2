const Config = require('../support/config');
const AuditLog = require('../support/audit_log');
const StorageAdapter = require('../support/storage');
const ConceptStore = require('../knowledge/concept_store');
const TheoryStack = require('../knowledge/theory_stack');
const NLParser = require('../ingest/parser');
const TranslatorBridge = require('./translator_bridge');
const Reasoner = require('../reason/reasoner');

class EngineAPI {
  constructor(rawConfig) {
    this.config = new Config().load(rawConfig || {});
    this.audit = new AuditLog(this.config.get('storageRoot'));
    this.storage = new StorageAdapter({ config: this.config, audit: this.audit });
    this.conceptStore = new ConceptStore(this.config.get('dimensions'));
    this.theoryStack = new TheoryStack(this.config.get('dimensions'));
    this.parser = new NLParser(this.config.get('recursionHorizon'));
    this.translator = new TranslatorBridge();
    this.reasoner = new Reasoner(this.conceptStore);
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
    this.audit.write({ kind: 'ingest', sentence: canonical });
  }

  ask(question) {
    const canonical = this.translator.normalise(question);
    const ast = this.parser.parseSentence(canonical);
    if (ast.kind !== 'question') {
      throw new Error('ask expects a question');
    }
    const result = this.reasoner.deduceIsA(ast.subject, ast.object);
    this.audit.write({
      kind: 'ask',
      subject: ast.subject,
      relation: ast.relation,
      object: ast.object,
      truth: result.truth
    });
    return result;
  }

  getAgenticSession() {
    const api = this;
    return {
      ingest(sentence) {
        return api.ingest(sentence);
      },
      ask(question) {
        return api.ask(question);
      }
    };
  }
}

module.exports = EngineAPI;

