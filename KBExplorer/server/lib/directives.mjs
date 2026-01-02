import { translateNL2DSL } from '../../../src/index.mjs';

import { firstDslStatementLine } from './dsl.mjs';

function firstDslStatementLineSafe(dsl) {
  const line = firstDslStatementLine(dsl);
  return line || '';
}

function isLikelyDsl(goalText) {
  if (/^[A-Za-z_][A-Za-z0-9_'-]*\s+/.test(goalText) && !/[.?!]$/.test(goalText)) return true;
  return false;
}

export function tryTranslateKbExplorerDirective(text, { mode }) {
  if (mode !== 'learn') return null;
  const raw = String(text || '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Planning directive (NL-ish):
  // "Solve planning: goal: Alice is at the park. maxDepth: 3. as: plan"
  if (lower.startsWith('solve planning') || lower.startsWith('plan:') || lower.startsWith('solve plan')) {
    const maxDepthMatch = raw.match(/\bmax\s*depth\s*[:=]?\s*(\d+)\b/i) || raw.match(/\bmaxDepth\s*[:=]?\s*(\d+)\b/i);
    const maxDepth = maxDepthMatch ? Number(maxDepthMatch[1]) : 4;

    const asMatch = raw.match(/\bas\s*[:=]?\s*([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const planName = asMatch ? asMatch[1] : 'plan';

    const goalMatch =
      raw.match(/\bgoal\s*[:=]\s*(.+?)(?:\.\s*|;\s*|$)/i) ||
      raw.match(/\bgoal\s+is\s+(.+?)(?:\.\s*|;\s*|$)/i);
    if (!goalMatch) return null;

    const goalText = String(goalMatch[1] || '').trim();
    if (!goalText) return null;

    // Allow either DSL ("at Alice Park") or NL ("Alice is in the kitchen.").
    let goalDsl = goalText;
    if (!isLikelyDsl(goalText)) {
      const tr = translateNL2DSL(goalText, { source: 'generic', isQuestion: false });
      if (!tr?.success) return null;
      goalDsl = firstDslStatementLineSafe(tr.dsl);
    }

    const dsl = [
      `@goal ${goalDsl}`,
      `@${planName} solve planning [`,
      `  (goal goal),`,
      `  (maxDepth ${Number.isFinite(maxDepth) ? maxDepth : 4})`,
      `]`
    ].join('\n');

    return {
      dsl,
      translation: {
        success: true,
        type: 'kbexplorer_directive',
        directive: 'solve_planning',
        errors: [],
        warnings: []
      }
    };
  }

  // CSP directive (NL-ish):
  // - "Solve csp: variables from Guest, domain from Table, noConflict conflictsWith, as seating"
  // - legacy alias: "Solve wedding seating: ..." (kept for backward compatibility)
  if (
    lower.startsWith('solve csp') ||
    lower.startsWith('solve weddingseating') ||
    lower.startsWith('solve wedding seating')
  ) {
    const variablesMatch =
      raw.match(/\bvariables\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i) ||
      raw.match(/\bguests\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const domainMatch =
      raw.match(/\bdomain\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i) ||
      raw.match(/\btables\s+from\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const conflictMatch =
      raw.match(/\bno\\s*conflict\\s+([A-Za-z_][A-Za-z0-9_]*)\b/i) ||
      raw.match(/\bconflict\\s*relation\\s*[:=]?\\s*([A-Za-z_][A-Za-z0-9_]*)\b/i);
    const asMatch = raw.match(/\bas\\s*[:=]?\\s*([A-Za-z_][A-Za-z0-9_]*)\b/i);

    const relName = asMatch ? asMatch[1] : 'seating';
    const variables = variablesMatch ? variablesMatch[1] : null;
    const domain = domainMatch ? domainMatch[1] : null;
    const conflict = conflictMatch ? conflictMatch[1] : 'conflictsWith';

    if (!variables || !domain) return null;

    const dsl = `@${relName} solve csp [ (variablesFrom ${variables}), (domainFrom ${domain}), (noConflict ${conflict}) ]`;
    return {
      dsl,
      translation: {
        success: true,
        type: 'kbexplorer_directive',
        directive: 'solve_csp',
        errors: [],
        warnings: []
      }
    };
  }

  return null;
}

