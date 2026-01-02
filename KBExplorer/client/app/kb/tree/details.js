import { escapeHtml } from '../../dom.js';

function formatStatementLine(op, args) {
  if (!op) return '';
  if (!Array.isArray(args)) return String(op);
  if (op === '___NewVector') {
    return `${op} ${args.map(a => JSON.stringify(String(a))).join(' ')}`.trim();
  }
  return `${op} ${args.map(a => String(a)).join(' ')}`.trim();
}

function formatStatementWithAt(name, statementDsl) {
  const line = String(statementDsl || '').trim();
  if (!line) return '';
  const n = name ? String(name).trim() : '';
  if (!n) return line;
  return `@:${n} ${line}`.trim();
}

function buildDefinitionText(_ctx, node) {
  if (!node) return '';

  if (node.kind === 'GRAPH') {
    return node?.data?.graphDsl ? String(node.data.graphDsl) : '';
  }

  if (node.kind === 'URC_ARTIFACT') {
    const a = node?.data?.artifact || null;
    if (a?.text) {
      const header = [
        `Artifact ${String(a.id || '')}`.trim(),
        `format=${String(a.format || '')}`,
        `hash=${String(a.hash || '')}`
      ].filter(Boolean).join('\n');
      const materialized = Array.isArray(a.materializedFactLines) && a.materializedFactLines.length > 0
        ? `\n\nDerived facts (DSL):\n${a.materializedFactLines.map(l => String(l)).join('\n')}`
        : '';
      const text = String(a.text);
      const limit = 20000;
      if (text.length <= limit) return `${header}\n\n${text}${materialized}`.trim();
      return `${header}\n\n${text.slice(0, limit)}\n\n… (truncated, totalChars=${text.length})${materialized}`.trim();
    }
    const s = node?.data?.summary || null;
    if (s?.id) return `Artifact ${String(s.id)}\nformat=${String(s.format || '')}\nhash=${String(s.hash || '')}\nbytes=${String(s.byteLength ?? '')}`;
    return '';
  }

  if (node.kind === 'URC_EVIDENCE') {
    const e = node?.data?.evidence || node?.data?.summary || null;
    if (!e) return '';
    const lines = [
      `Evidence ${String(e.id || '')}`.trim(),
      `kind=${String(e.kind || '')}`,
      `status=${String(e.status || '')}`,
      `method=${String(e.method || '')}`,
      `tool=${String(e.tool || '')}`,
      `supports=${String(e.supports || '')}`,
      `artifactId=${String(e.artifactId || '')}`,
      `scope=${String(e.scope || '')}`
    ];
    const base = lines.filter(Boolean).join('\n');
    const materialized = Array.isArray(e.materializedFactLines) && e.materializedFactLines.length > 0
      ? `\n\nDerived facts (DSL):\n${e.materializedFactLines.map(l => String(l)).join('\n')}`
      : '';
    return `${base}${materialized}`.trim();
  }

  if (node.kind === 'URC_PROVENANCE') {
    const p = node?.data?.entry || node?.data?.summary || null;
    if (!p) return '';
    const nl = String(p.nlText || '').trim();
    const dsl = String(p.dslText || '').trim();
    const decision = p.decision ? JSON.stringify(p.decision, null, 2) : '';
    const derived = Array.isArray(p.materializedFactLines) && p.materializedFactLines.length > 0
      ? '\n\nDerived facts (DSL):\n' + p.materializedFactLines.map(l => String(l)).join('\n')
      : '';
    const lines = [
      `Provenance ${String(p.id || '')}`.trim(),
      `kind=${String(p.kind || '')}`.trim(),
      p.srcNl ? `srcNl=${String(p.srcNl)}` : '',
      p.srcDsl ? `srcDsl=${String(p.srcDsl)}` : '',
      '',
      'NL:',
      nl || '(none)',
      '',
      'DSL:',
      dsl || '(none)',
      decision ? '\nDecision:\n' + decision : '',
      derived
    ];
    return lines.filter(l => l !== null).join('\n');
  }

  if (node.kind === 'URC_POLICY_VIEW') {
    const view = node?.data?.policyView || null;
    if (!view) return '';
    const policy = view.policy || null;
    const newerWins = (view.newerWins ?? policy?.newerWins);

    const formatMap = (title, obj) => {
      const entries = Object.entries(obj || {}).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      if (entries.length === 0) return `${title}:\n  (none)`;
      return `${title}:\n` + entries.map(([k, v]) => `  - ${String(k)} => ${String(v)}`).join('\n');
    };

    const currentCount = Array.isArray(view.currentFactIds) ? view.currentFactIds.length : 0;
    const supersedesCount = Array.isArray(view.supersedes) ? view.supersedes.length : 0;
    const negatesCount = Array.isArray(view.negates) ? view.negates.length : 0;
    const warnings = Array.isArray(view.warnings) ? view.warnings : [];

    const lines = [
      'Policy view',
      '',
      `policyId=${String(policy?.policyId || '') || '(none)'}`,
      `newerWins=${newerWins === true ? 'true' : (newerWins === false ? 'false' : '(unset)')}`,
      '',
      formatMap('Evidence rank', policy?.evidenceRank),
      '',
      formatMap('Role rank', policy?.roleRank),
      '',
      formatMap('Source rank', policy?.sourceRank),
      '',
      'View stats:',
      `  - currentFacts=${currentCount}`,
      `  - supersedesEdges=${supersedesCount}`,
      `  - negatesEdges=${negatesCount}`,
      `  - warnings=${warnings.length}`,
      '',
      ...(warnings.length ? ['Warnings:', ...warnings.map(w => `  - ${String(w)}`), ''] : []),
    ];

    const materialized = Array.isArray(view.materializedFactLines) && view.materializedFactLines.length > 0
      ? ['Derived facts (DSL):', ...view.materializedFactLines.map(l => `  ${String(l)}`)]
      : ['Derived facts (DSL):', '  (none)'];

    return [...lines, ...materialized].join('\n').trim();
  }

  if (node.kind === 'KB_BUNDLE') {
    return 'KB bundle (superposition of all facts in this session).';
  }

  if (node.kind === 'CATEGORY') {
    return '';
  }

  if (node.kind === 'ACTION') {
    return '';
  }

  if (node.kind === 'ATOM' || node.kind === 'VERB') {
    const def = node?.data?.definition || null;
    if (def?.statementDsl) return formatStatementWithAt(def?.fact?.name || null, def.statementDsl);
    const meta = def?.metadata || null;
    if (meta?.operator) return formatStatementWithAt(def?.fact?.name || null, formatStatementLine(meta.operator, meta.args));
    const graphDsl = node?.data?.graphDsl;
    return graphDsl ? String(graphDsl) : '';
  }

  if (node.kind === 'BIND') {
    const pos = node?.data?.position ?? null;
    const arg = node?.data?.arg ?? null;
    if (!Number.isFinite(Number(pos)) || !arg) return '';
    return `Pos${Number(pos)} ⊕ ${String(arg)}`;
  }

  if (node.kind === 'SCOPE') {
    const name = node?.data?.name || node.label;
    return name ? `@${String(name)}` : '';
  }

  if (node.kind !== 'FACT') return '';
  if (!node.loaded) return '';
  if (node?.data?.statementDsl) {
    const name = node?.data?.fact?.name || node?.data?.summary?.name || null;
    return formatStatementWithAt(name, node.data.statementDsl);
  }
  const meta = node?.data?.metadata || null;
  if (!meta?.operator) return '';
  const name = node?.data?.fact?.name || node?.data?.summary?.name || null;
  return formatStatementWithAt(name, formatStatementLine(meta.operator, meta.args));
}

function formatFormalFromMeta(meta) {
  const op = meta?.operator ?? null;
  const args = Array.isArray(meta?.args) ? meta.args : [];
  if (!op) return '';
  if (args.length === 0) return String(op);
  const taggedArgs = args.map((a, i) => `(Pos${i + 1} ⊕ ${String(a)})`);
  return [String(op), ...taggedArgs].join(' ⊕ ');
}

function buildFormalDefinitionText(_ctx, node) {
  if (!node) return '';

  if (node.kind === 'URC_ARTIFACT' || node.kind === 'URC_EVIDENCE' || node.kind === 'URC_PROVENANCE' || node.kind === 'URC_POLICY_VIEW') {
    return '';
  }

  if (node.kind === 'BIND') {
    const pos = node?.data?.position ?? null;
    const arg = node?.data?.arg ?? null;
    if (!Number.isFinite(Number(pos)) || !arg) return '';
    return `Pos${Number(pos)} ⊕ ${String(arg)}`;
  }

  if (node.kind === 'ATOM' || node.kind === 'VERB') {
    const meta = node?.data?.definition?.metadata || null;
    if (meta) return formatFormalFromMeta(meta);
    return '';
  }

  if (node.kind !== 'FACT') return '';
  if (!node.loaded) return '';
  return formatFormalFromMeta(node?.data?.metadata || null);
}

function buildVectorText(_ctx, node) {
  if (!node) return '';

  if (node.kind === 'URC_ARTIFACT' || node.kind === 'URC_EVIDENCE' || node.kind === 'URC_PROVENANCE' || node.kind === 'URC_POLICY_VIEW') {
    return '';
  }

  // Show exactly one vector: the selected node's own vector representation.
  let vv = null;
  if (node.kind === 'FACT') vv = node?.data?.factVectorValue || null;
  else if (node.kind === 'BIND') vv = node?.data?.positionedVectorValue || null;
  else if (node.kind === 'GRAPH') vv = node?.data?.vectorValue || null;
  else if (node.kind === 'KB_BUNDLE') vv = node?.data?.vectorValue || null;
  else if (node.kind === 'SCOPE') vv = node?.data?.vectorValue || null;
  else vv = node?.data?.vectorValue || null;

  if (!vv?.values) return '';
  const suffix = vv.truncated ? `\n… (truncated, total=${vv.total})` : '';
  return `${JSON.stringify(vv.values, null, 2)}${suffix}`;
}

export function renderDetails({ $, state }, node) {
  const detailsEl = $('kbDetails');
  if (!node) {
    detailsEl.innerHTML = '<span class="muted">Select a node to see details.</span>';
    return;
  }

  const payload = {
    id: node.id,
    kind: node.kind,
    label: node.label,
    expanded: !!node.expanded,
    loaded: !!node.loaded,
    loading: !!node.loading,
    data: node.data || {}
  };

  const defn = buildDefinitionText({ state }, node) || '(none)';
  const formal = buildFormalDefinitionText({ state }, node) || '(none)';
  const vec = buildVectorText({ state }, node) || '(none)';

  const defBlock = `<div class="details__equation"><div class="details__sectionTitle">Definition</div><pre>${escapeHtml(defn)}</pre></div>`;
  const formalBlock = `<div class="details__equation"><div class="details__sectionTitle">Encoding</div><pre>${escapeHtml(formal)}</pre></div>`;
  const vecBlock = `<div class="details__equation"><div class="details__sectionTitle">Vector</div><pre>${escapeHtml(vec)}</pre></div>`;

  detailsEl.innerHTML =
    `${defBlock}${formalBlock}${vecBlock}` +
    `<div class="details__json"><div class="details__sectionTitle">Raw</div><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></div>`;
}
