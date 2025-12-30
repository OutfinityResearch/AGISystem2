import { Session } from '../../src/runtime/session.mjs';
import { REASONING_PRIORITY } from '../../src/core/constants.mjs';
import { DEFAULT_GEOMETRY, DEFAULT_STRATEGY } from './constants.mjs';

export function createSession(sessionConfig = {}) {
  const session = new Session({
    hdcStrategy: DEFAULT_STRATEGY,
    geometry: DEFAULT_GEOMETRY,
    reasoningPriority: REASONING_PRIORITY.SYMBOLIC,
    reasoningProfile: 'theoryDriven',
    closedWorldAssumption: true,
    rejectContradictions: false,
    ...sessionConfig
  });

  const coreLoaded = session.loadCore({ includeIndex: true });
  if (coreLoaded.success !== true) {
    const msg = coreLoaded.errors?.map(e => `${e.file}: ${e.errors?.join('; ')}`).join(' | ') || 'unknown error';
    throw new Error(`loadCore failed: ${msg}`);
  }

  return session;
}

export function validateQuestionDsl(questionDsl) {
  if (!questionDsl || !questionDsl.trim()) return { valid: false, reason: 'empty_question_dsl' };

  const rawLines = questionDsl.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const commentLines = rawLines.filter(l => l.startsWith('//'));
  const lines = rawLines.filter(l => !l.startsWith('//'));

  if (lines.length === 0) return { valid: false, reason: 'no_statements' };

  let goalLogic = null;
  let declaredOperators = [];
  let action = null;
  for (const c of commentLines) {
    const m = c.match(/goal_logic\s*:\s*(And|Or)/i);
    if (m) {
      goalLogic = m[1];
      break;
    }
  }
  for (const c of commentLines) {
    const m = c.match(/declare_ops\s*:\s*(.+)$/i);
    if (!m) continue;
    declaredOperators = m[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    break;
  }
  for (const c of commentLines) {
    const m = c.match(/action\s*:\s*(prove|query)/i);
    if (m) {
      action = m[1].toLowerCase();
      break;
    }
  }

  const normalizeGoalLine = (line) => {
    const m = line.match(/^@(goal|g)(?::goal)?\s+(.+)$/i);
    if (!m) return line;
    return String(m[2] || '').trim();
  };

  if (lines.length === 1) {
    const inferred = action || (lines[0].includes('?') ? 'query' : 'prove');
    return { valid: true, goals: [normalizeGoalLine(lines[0])], goalLogic: goalLogic || 'Single', declaredOperators, action: inferred };
  }

  const allGoalLines = lines.every(l => l.startsWith('@goal') || l.startsWith('@g'));
  if (!allGoalLines) return { valid: false, reason: 'multi_statement_no_goal' };

  const inferred = action || (lines.some(l => l.includes('?')) ? 'query' : 'prove');
  return { valid: true, goals: lines.map(normalizeGoalLine), goalLogic: goalLogic || 'And', declaredOperators, action: inferred };
}
