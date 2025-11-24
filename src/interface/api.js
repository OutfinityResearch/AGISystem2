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
    this.reasoner.config = this.config;
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
    let result;
    if (ast.relation === 'IS_A') {
      result = this.reasoner.deduceIsA(ast.subject, ast.object);
    } else {
      result = this.reasoner.factExists(ast.subject, ast.relation, ast.object);
    }
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
      },
      abduct(observation, relation) {
        if (relation !== 'CAUSES') {
          throw new Error('Only CAUSES abduction is supported in this MVP');
        }
        return api.abduct(observation, relation);
      }
    };
  }

  abduct(observation, relation) {
    if (relation !== 'CAUSES') {
      throw new Error('Only CAUSES abduction is supported in this MVP');
    }
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
    const facts = [];
    for (const line of extraFactLines) {
      const canonical = this.translator.normalise(line);
      const ast = this.parser.parseSentence(canonical);
      if (ast.kind !== 'assertion') {
        throw new Error(`Compliance fact must be an assertion: '${line}'`);
      }
      facts.push({
        subject: ast.subject,
        relation: ast.relation,
        object: ast.object
      });
    }
    const contextStack = facts.length > 0 ? [{ facts }] : null;
    const result = this.reasoner.checkProcedureCompliance(procedureId, contextStack);
    this.audit.write({
      kind: 'checkProcedureCompliance',
      procedureId,
      extraFactsCount: facts.length,
      truth: result.truth
    });
    return result;
  }

  checkExport(actionId, regulations, extraFactLines = []) {
    const facts = [];
    for (const line of extraFactLines) {
      const canonical = this.translator.normalise(line);
      const ast = this.parser.parseSentence(canonical);
      if (ast.kind !== 'assertion') {
        throw new Error(`Export fact must be an assertion: '${line}'`);
      }
      facts.push({
        subject: ast.subject,
        relation: ast.relation,
        object: ast.object
      });
    }
    const contextStack = facts.length > 0 ? [{ facts }] : null;
    const result = this.reasoner.checkExportAction(actionId, regulations, contextStack);
    this.audit.write({
      kind: 'checkExport',
      actionId,
      regulations,
      extraFactsCount: facts.length,
      truth: result.truth
    });
    return result;
  }

  checkMagicInCity(actorId, cityId, extraFactLines = []) {
    const facts = [];
    for (const line of extraFactLines) {
      const canonical = this.translator.normalise(line);
      const ast = this.parser.parseSentence(canonical);
      if (ast.kind !== 'assertion') {
        throw new Error(`Magic fact must be an assertion: '${line}'`);
      }
      facts.push({
        subject: ast.subject,
        relation: ast.relation,
        object: ast.object
      });
    }
    const contextStack = facts.length > 0 ? [{ facts }] : null;
    const result = this.reasoner.magicAllowed(actorId, cityId, contextStack);
    this.audit.write({
      kind: 'checkMagicInCity',
      actorId,
      cityId,
      extraFactsCount: facts.length,
      truth: result.truth
    });
    return result;
  }
}

module.exports = EngineAPI;
