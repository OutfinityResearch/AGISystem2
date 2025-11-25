class NLParser {
  constructor(recursionHorizon) {
    this.recursionHorizon = recursionHorizon || 3;
  }

  parseSentence(sentence) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      throw new Error('Empty sentence');
    }
    if (trimmed.endsWith('?')) {
      return this._parseQuestion(trimmed);
    }
    return this._parseAssertion(trimmed);
  }

  /**
   * Explicitly parse text as a question, regardless of trailing '?'.
   * Used by EngineAPI.ask and Sys2DSL ASK so that the semantics come
   * from the call site, not just from punctuation.
   */
  parseQuestion(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Empty question');
    }
    return this._parseQuestion(trimmed);
  }

  /**
   * Explicitly parse text as an assertion.
   */
  parseAssertion(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Empty assertion');
    }
    return this._parseAssertion(trimmed);
  }

  _parseAssertion(text) {
    const parts = text.split(/\s+/);
    if (parts.length < 3) {
      throw new Error(`Cannot parse assertion '${text}'`);
    }
    const subject = parts[0];
    const relation = parts[1];
    const object = parts.slice(2).join(' ');
    return {
      kind: 'assertion',
      subject,
      relation,
      object
    };
  }

  _parseQuestion(text) {
    const withoutQuestionMark = text.replace(/\?+$/, '').trim();
    let matches = withoutQuestionMark.match(/^Is\s+(.+)\s+an?\s+(.+)$/i) ||
      withoutQuestionMark.match(/^Is\s+(.+)\s+(.+)$/i);
    if (matches) {
      const subject = matches[1];
      const object = matches[2];
      return {
        kind: 'question',
        subject,
        relation: 'IS_A',
        object
      };
    }
    // Canonical triple form: Subject REL Object?
    matches = withoutQuestionMark.match(/^([A-Za-z0-9_]+)\s+([A-Z_]+)\s+(.+)$/);
    if (matches) {
      const subject = matches[1];
      const relation = matches[2];
      const object = matches[3];
      return {
        kind: 'question',
        subject,
        relation,
        object
      };
    }
    throw new Error(`Cannot parse question '${text}'`);
  }
}

module.exports = NLParser;
