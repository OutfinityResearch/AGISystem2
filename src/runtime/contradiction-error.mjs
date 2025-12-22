export class ContradictionError extends Error {
  constructor(message, contradiction = null) {
    super(`Contradiction rejected: ${message}`);
    this.name = 'ContradictionError';
    this.contradiction = contradiction;
  }
}

export default ContradictionError;

