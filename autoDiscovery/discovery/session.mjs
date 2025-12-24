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

  const coreLoaded = session.loadCore({ includeIndex: false });
  if (coreLoaded.success !== true) {
    const msg = coreLoaded.errors?.map(e => `${e.file}: ${e.errors?.join('; ')}`).join(' | ') || 'unknown error';
    throw new Error(`loadCore failed: ${msg}`);
  }

  return session;
}

export function validateQuestionDsl(questionDsl) {
  if (!questionDsl || !questionDsl.trim()) return { valid: false, reason: 'empty_question_dsl' };

  const lines = questionDsl.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
  if (lines.length === 0) return { valid: false, reason: 'no_statements' };
  if (lines.length === 1) return { valid: true };

  const firstLine = lines[0].trim();
  if (firstLine.startsWith('@goal ') || firstLine.startsWith('@goal:')) return { valid: true };

  const hasGoalElsewhere = lines.slice(1).some(l => l.trim().startsWith('@goal'));
  if (hasGoalElsewhere) return { valid: false, reason: 'goal_not_first_statement' };

  return { valid: false, reason: 'multi_statement_no_goal' };
}

