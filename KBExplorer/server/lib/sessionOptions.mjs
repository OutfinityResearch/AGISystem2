const ALLOWED_HDC_STRATEGIES = new Set([
  'dense-binary',
  'exact',
  'sparse-polynomial',
  'metric-affine',
  'metric-affine-elastic'
]);

const ALLOWED_REASONING_PRIORITIES = new Set([
  'symbolicPriority',
  'holographicPriority'
]);

export function sanitizeSessionOptions(sessionOptions) {
  if (!sessionOptions || typeof sessionOptions !== 'object') return {};
  const out = {};

  if (typeof sessionOptions.hdcStrategy === 'string' && ALLOWED_HDC_STRATEGIES.has(sessionOptions.hdcStrategy)) {
    out.hdcStrategy = sessionOptions.hdcStrategy;
  }
  if (typeof sessionOptions.reasoningPriority === 'string' && ALLOWED_REASONING_PRIORITIES.has(sessionOptions.reasoningPriority)) {
    out.reasoningPriority = sessionOptions.reasoningPriority;
  }
  if (typeof sessionOptions.urcMaterializeFacts === 'boolean') {
    out.urcMaterializeFacts = sessionOptions.urcMaterializeFacts;
  }

  // Keep the rest server-owned for now (geometry, strict modes, etc.).
  return out;
}
