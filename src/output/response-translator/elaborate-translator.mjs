import { BaseTranslator } from './shared.mjs';

export class ElaborateTranslator extends BaseTranslator {
  translate({ reasoningResult }) {
    const elaboration = this.session.elaborate(reasoningResult);
    return elaboration.text || elaboration.fullProof || 'No output';
  }
}

