import { REASONING_PRIORITY } from '../core/constants.mjs';
import { readEnvBoolean } from '../utils/env.js';

export const REASONING_PROFILE = {
  LEGACY: 'legacy',
  THEORY_DRIVEN: 'theoryDriven'
};

function normalizeProfile(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const low = v.toLowerCase();
  if (low === 'legacy') return REASONING_PROFILE.LEGACY;
  if (low === 'theorydriven' || low === 'theory-driven' || low === 'theory') {
    return REASONING_PROFILE.THEORY_DRIVEN;
  }
  return null;
}

export function computeReasoningProfile({ reasoningPriority, optionsProfile } = {}) {
  const envProfile = normalizeProfile(process.env.SYS2_PROFILE || process.env.REASONING_PROFILE);
  const optProfile = normalizeProfile(optionsProfile);
  if (optProfile) return optProfile;
  if (envProfile) return envProfile;

  if (reasoningPriority === REASONING_PRIORITY.HOLOGRAPHIC) {
    return REASONING_PROFILE.THEORY_DRIVEN;
  }
  return REASONING_PROFILE.LEGACY;
}

export function computeFeatureToggles({ profile, options = {} } = {}) {
  const isTheoryDriven = profile === REASONING_PROFILE.THEORY_DRIVEN;

  const envCanonical = readEnvBoolean('SYS2_CANONICAL');
  const envProofValidate = readEnvBoolean('SYS2_PROOF_VALIDATE');

  const canonicalizationEnabled =
    options.canonicalizationEnabled ??
    envCanonical ??
    isTheoryDriven;

  const proofValidationEnabled =
    options.proofValidationEnabled ??
    envProofValidate ??
    isTheoryDriven;

  return {
    canonicalizationEnabled,
    proofValidationEnabled,
    useSemanticIndex: isTheoryDriven,
    useTheoryConstraints: isTheoryDriven,
    useTheoryReserved: isTheoryDriven
  };
}

