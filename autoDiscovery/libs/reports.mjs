import fs from 'node:fs';
import { join } from 'node:path';

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
}

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function textLen(s) {
  return String(s || '').trim().length;
}

function caseSizeScore(obj) {
  if (!obj) return Number.POSITIVE_INFINITY;
  const ctx =
    obj?.input?.context_nl ??
    obj?.example?.context ??
    obj?.translation?.context_nl ??
    '';
  const q =
    obj?.input?.question_nl ??
    obj?.example?.question ??
    obj?.translation?.question_nl ??
    '';
  return textLen(ctx) + textLen(q);
}

function getCaseNl(obj) {
  const context =
    obj?.input?.context_nl ??
    obj?.example?.context ??
    obj?.translated?.original?.context ??
    obj?.translation?.context_nl ??
    '';
  const question =
    obj?.input?.question_nl ??
    obj?.example?.question ??
    obj?.translated?.original?.question ??
    obj?.translation?.question_nl ??
    '';
  const label =
    obj?.dataset?.label ??
    obj?.input?.label ??
    obj?.example?.label ??
    null;
  return { context, question, label };
}

function getCaseDsl(obj) {
  const contextDsl = obj?.translation?.contextDsl ?? obj?.contextDsl ?? obj?.translated?.contextDsl ?? '';
  const questionDsl = obj?.translation?.questionDsl ?? obj?.questionDsl ?? obj?.translated?.questionDsl ?? '';
  return { contextDsl, questionDsl };
}

function getFailureSummary(obj) {
  const reason =
    obj?.failure?.reason ??
    obj?.reason ??
    obj?.execution?.proveResult?.reason ??
    obj?.execution?.proveResult?.error ??
    null;
  const details =
    obj?.failure?.details ??
    obj?.details ??
    null;
  return { reason, details };
}

export function capFolderCases(dir, { maxCases = 10 } = {}) {
  const files = listJsonFiles(dir);
  if (files.length <= maxCases) return { kept: files.length, deleted: 0 };

  const ranked = files
    .map(f => ({ f, obj: readJsonSafe(f) }))
    .map(x => ({ f: x.f, obj: x.obj, score: caseSizeScore(x.obj) }))
    .sort((a, b) => (a.score - b.score) || a.f.localeCompare(b.f));

  const keep = new Set(ranked.slice(0, maxCases).map(x => x.f));
  let deleted = 0;
  for (const f of files) {
    if (keep.has(f)) continue;
    try {
      fs.rmSync(f, { force: true });
      deleted++;
    } catch {
      // ignore
    }
  }
  return { kept: Math.min(maxCases, files.length - deleted), deleted };
}

export function refreshFolderReport(dir, { id, title, description, maxCases = 10 } = {}) {
  capFolderCases(dir, { maxCases });

  const files = listJsonFiles(dir).sort();
  if (files.length === 0) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    return { cases: 0 };
  }

  let shortest = null;
  for (const f of files) {
    const obj = readJsonSafe(f);
    if (!obj) continue;
    const score = caseSizeScore(obj);
    if (!shortest || score < shortest.score) shortest = { f, obj, score };
  }

  const lines = [
    `# ${id}: ${title || id}`,
    '',
    '## Description',
    description || '',
    '',
    `## Size Cap`,
    `- maxCases: ${maxCases}`,
    `- currentCases: ${files.length}`,
    ''
  ];

  if (shortest?.obj) {
    const nl = getCaseNl(shortest.obj);
    const dsl = getCaseDsl(shortest.obj);
    const fail = getFailureSummary(shortest.obj);

    lines.push(
      '## Shortest Example',
      '',
      `- **JSON:** \`${shortest.f.split('/').pop()}\``,
      '',
      '### Natural Language',
      '```',
      `Context: ${nl.context || '(empty)'}`,
      `Question: ${nl.question || '(empty)'}`,
      `Label: ${nl.label ?? '(none)'}`,
      '```',
      '',
      '### DSL',
      '```',
      (dsl.contextDsl || '(empty)'),
      '',
      (dsl.questionDsl || '(empty)'),
      '```',
      ''
    );

    if (fail.reason || fail.details) {
      lines.push(
        '### Failure',
        '```',
        `Reason: ${fail.reason || '(none)'}`,
        `Details: ${fail.details || '(none)'}`,
        '```',
        ''
      );
    }
  }

  lines.push('## All Cases', '');
  for (const f of files) {
    const caseId = f.split('/').pop()?.replace(/\\.json$/, '') || f;
    lines.push(`- ${caseId}.json`);
  }
  lines.push('');

  fs.writeFileSync(join(dir, 'report.md'), lines.join('\n'));
  return { cases: files.length };
}
