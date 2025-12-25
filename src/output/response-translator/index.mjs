import { LearnTranslator } from './learn-translator.mjs';
import { ListSolutionsTranslator } from './list-solutions-translator.mjs';
import { ProveTranslator } from './prove-translator.mjs';
import { ElaborateTranslator } from './elaborate-translator.mjs';
import { QueryTranslator } from './query-translator.mjs';

export class ResponseTranslator {
  constructor(session) {
    this.session = session;
    this.translators = new Map([
      ['learn', new LearnTranslator(session)],
      ['listSolutions', new ListSolutionsTranslator(session)],
      ['prove', new ProveTranslator(session)],
      ['elaborate', new ElaborateTranslator(session)],
      ['query', new QueryTranslator(session)]
    ]);
    this.defaultTranslator = new QueryTranslator(session);
  }

  translate({ action = 'query', reasoningResult, queryDsl }) {
    const translator = this.translators.get(action) || this.defaultTranslator;
    const result = translator.translate({ action, reasoningResult, queryDsl });
    if (typeof result === 'string') return result;
    if (result && typeof result === 'object') {
      const text = typeof result.text === 'string' ? result.text.trim() : '';
      const proofText = typeof result.proofText === 'string' ? result.proofText.trim() : '';
      if (text && proofText) return `${text} Proof: ${proofText}`;
      if (text) return text;
    }
    return String(result ?? '');
  }
}

export default ResponseTranslator;

