function normalizeProofText(proofText) {
  if (Array.isArray(proofText)) return proofText.join('. ');
  if (typeof proofText === 'string') return proofText.trim();
  return null;
}

export function makeTranslation(text, proofText = null, extra = {}) {
  const normalizedText = (text ?? '').trim();
  let normalizedProof = normalizeProofText(proofText);
  if (typeof normalizedProof === 'string' && normalizedProof.length === 0) {
    normalizedProof = null;
  }
  return {
    text: normalizedText,
    proofText: normalizedProof ?? null,
    ...extra
  };
}

export class BaseTranslator {
  constructor(session) {
    this.session = session;
  }

  translate() {
    return 'No results';
  }
}

