import { readEnvBoolean } from '../utils/env.js';

export const REASONING_PROFILE = {
  THEORY_DRIVEN: 'theoryDriven'
};

function normalizeProfile(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  const low = v.toLowerCase();
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

  return REASONING_PROFILE.THEORY_DRIVEN;
}

export function computeFeatureToggles({ profile, options = {} } = {}) {
  const isTheoryDriven = profile === REASONING_PROFILE.THEORY_DRIVEN;

  const envCanonical = readEnvBoolean('SYS2_CANONICAL');
  const envProofValidate = readEnvBoolean('SYS2_PROOF_VALIDATE');
  const envCwa = readEnvBoolean('SYS2_CWA');
  const envL0Builtins = readEnvBoolean('SYS2_L0_BUILTINS');
  const envStrict = readEnvBoolean('SYS2_STRICT');
  const envSemanticFallbacks = readEnvBoolean('SYS2_SEMANTIC_FALLBACKS');
  const envEnforceCanonical = readEnvBoolean('SYS2_ENFORCE_CANONICAL');
  const envEnforceDeclarations = readEnvBoolean('SYS2_ENFORCE_DECLARATIONS');

  const canonicalizationEnabled =
    options.canonicalizationEnabled ??
    envCanonical ??
    isTheoryDriven;

  const proofValidationEnabled =
    options.proofValidationEnabled ??
    envProofValidate ??
    isTheoryDriven;

  // Strict mode is the default: it enables deterministic semantics and encourages theory completeness.
  // `SYS2_STRICT=0` (or `strictMode:false`) is the explicit escape hatch for refactor validation.
  const strictMode =
    options.strictMode ??
    envStrict ??
    true;

  // When enabled, the SemanticIndex may backfill missing theory declarations with legacy defaults.
  // This is only intended for incremental refactors and A/B validation.
  const allowSemanticFallbacks =
    options.allowSemanticFallbacks ??
    envSemanticFallbacks ??
    false;

  // DS19: enforce canonical surface DSL (reject non-canonical assertions) in strict mode by default.
  // Escape hatch: `SYS2_ENFORCE_CANONICAL=0` or `enforceCanonical:false`.
  const enforceCanonical =
    options.enforceCanonical ??
    envEnforceCanonical ??
    strictMode;

  // Strict operator declarations: operators used in persisted facts and rule bodies must be declared
  // via theory headers (`@op:op __Relation` / `@op graph` / `@op macro`), or be builtins.
  // Escape hatch: `SYS2_ENFORCE_DECLARATIONS=0` or `enforceDeclarations:false`.
  const enforceDeclarations =
    options.enforceDeclarations ??
    envEnforceDeclarations ??
    strictMode;

  return {
    canonicalizationEnabled,
    proofValidationEnabled,
    strictMode,
    allowSemanticFallbacks,
    enforceCanonical,
    enforceDeclarations,
    // L0 builtins are required for strict Core theory semantics (___NewVector, ___Bind, ___GetType, etc.).
    l0BuiltinsEnabled: options.l0BuiltinsEnabled ?? envL0Builtins ?? strictMode,
    closedWorldAssumption: options.closedWorldAssumption ?? envCwa ?? false,
    useSemanticIndex: isTheoryDriven,
    useTheoryConstraints: isTheoryDriven,
    useTheoryReserved: isTheoryDriven
  };
}
