import { escapeHtml } from '../../dom.js';

function formatSourceLine(source) {
  if (!source || typeof source !== 'object') return '';
  const file = source.file ? String(source.file) : '';
  const line = Number.isFinite(source.line) ? Number(source.line) : null;
  const column = Number.isFinite(source.column) ? Number(source.column) : null;
  const comment = source.comment ? String(source.comment).trim() : '';

  const loc = file
    ? `${file}${line ? `:${line}${column ? `:${column}` : ''}` : ''}`
    : (line ? `${line}${column ? `:${column}` : ''}` : '');

  if (!loc && !comment) return '';
  if (!comment) return loc;
  if (!loc) return `# ${comment}`;
  return `${loc}  # ${comment}`;
}

function resolveNodeSource(node) {
  if (!node) return null;
  if (node.kind === 'FACT') return node?.data?.source || null;
  if (node.kind === 'GRAPH') return node?.data?.source || null;
  if (node.kind === 'ATOM' || node.kind === 'VERB') {
    return node?.data?.definition?.source || node?.data?.source || null;
  }
  if (node.kind === 'BIND') return null;
  if (node.kind === 'SCOPE') return node?.data?.source || null;
  if (node.kind === 'KB_BUNDLE') return null;
  return node?.data?.source || null;
}

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
    return `Pos${Number(pos)} ⊗ ${String(arg)}`;
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

  // Special case: ___NewVector is a generator, not a semantic binding
  if (op === '___NewVector') {
    return `NewVector(${args.map(a => String(a)).join(', ')})`;
  }

  if (args.length === 0) return String(op);

  // Encoding path: Op BIND ( (Pos1 BIND Arg1) BUNDLE (Pos2 BIND Arg2) ... )
  // Replace mathematical symbols (⊗, ⊕) with explicit function names for clarity.
  const taggedArgs = args.map((a, i) => `(Pos${i + 1} BIND ${String(a)})`);
  const bundleContent = taggedArgs.join(' BUNDLE ');

  // If multiple args, they are bundled first
  if (args.length > 1) {
    return `${String(op)} BIND ( ${bundleContent} )`;
  }

  // Single arg case: Op BIND (Pos1 BIND Arg1)
  return `${String(op)} BIND ${bundleContent}`;
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
    return `Pos${Number(pos)} ⊗ ${String(arg)}`;
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
  const loaded = Array.isArray(vv.values) ? vv.values.length : 0;
  const total = Number.isFinite(vv.total) ? Number(vv.total) : loaded;
  const header = [
    `items=${String(total)}`,
    `offset=${String(vv.offset ?? 0)}`,
    `limit=${String(vv.limit ?? loaded)}`,
    (vv.truncated ? 'truncated=true' : 'truncated=false')
  ].join(' ');
  if (node.kind === 'KB_BUNDLE') {
    const suffix = loaded && total && loaded < total ? `\n… (loaded ${loaded}/${total})` : (total ? `\n(loaded ${loaded}/${total})` : '');
    return `${header}\n${JSON.stringify(vv.values, null, 2)}${suffix}`;
  }
  const suffix = vv.truncated ? `\n… (truncated, total=${vv.total})` : '';
  return `${header}\n${JSON.stringify(vv.values, null, 2)}${suffix}`;
}

export function renderDetails(ctx, node) {
  const { $, state, api } = ctx;
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

  const defnText = String(buildDefinitionText({ state }, node) || '').trim();
  const formalText = String(buildFormalDefinitionText({ state }, node) || '').trim();
  const vecText = String(buildVectorText({ state }, node) || '').trim();
  const sourceText = String(formatSourceLine(resolveNodeSource(node)) || '').trim();

  const blocks = [];
  if (defnText) {
    blocks.push(`<div class="details__equation"><div class="details__sectionTitle">Definition</div><pre>${escapeHtml(defnText)}</pre></div>`);
  }
  if (formalText) {
    blocks.push(`<div class="details__equation"><div class="details__sectionTitle">Encoding</div><pre>${escapeHtml(formalText)}</pre></div>`);
  }

  const isKbBundleVectorTruncated = node.kind === 'KB_BUNDLE' && !!node?.data?.vectorValue?.truncated;
  if (vecText) {
    const vecControls = isKbBundleVectorTruncated
      ? `<div class="details__controls"><button class="btn btn--sm" id="kbVectorLoadMore">Load more</button></div>`
      : '';
    blocks.push(`<div class="details__equation"><div class="details__sectionTitle">Vector</div><pre>${escapeHtml(vecText)}</pre>${vecControls}</div>`);
  }
  if (sourceText) {
    blocks.push(`<div class="details__equation"><div class="details__sectionTitle">Source</div><pre>${escapeHtml(sourceText)}</pre></div>`);
  }

  blocks.push(`<div class="details__json"><div class="details__sectionTitle">Raw</div><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></div>`);
  detailsEl.innerHTML = blocks.join('');

  const loadMoreBtn = detailsEl.querySelector('#kbVectorLoadMore');
  if (loadMoreBtn && typeof api === 'function') {
    loadMoreBtn.addEventListener('click', async () => {
      const vv = node?.data?.vectorValue || null;
      if (!vv?.values || !vv.truncated) return;
      const loaded = Array.isArray(vv.values) ? vv.values.length : 0;
      const offset = Number.isFinite(vv.offset) ? Number(vv.offset) : 0;
      const limit = Number.isFinite(vv.limit) ? Number(vv.limit) : 256;
      const nextOffset = offset + loaded;

      loadMoreBtn.disabled = true;
      const prevText = loadMoreBtn.textContent;
      loadMoreBtn.textContent = 'Loading...';
      try {
        const res = await api(`/api/kb/bundle?offset=${encodeURIComponent(String(nextOffset))}&limit=${encodeURIComponent(String(limit))}`);
        const page = res?.kbVector || null;
        if (!page?.values) return;

        if (!node.data.vectorValue) node.data.vectorValue = page;
        else if (page.offset === nextOffset) {
          node.data.vectorValue.values = [...(node.data.vectorValue.values || []), ...(page.values || [])];
          node.data.vectorValue.total = page.total ?? node.data.vectorValue.total;
          node.data.vectorValue.offset = offset;
          node.data.vectorValue.limit = limit;
          const total = Number.isFinite(node.data.vectorValue.total) ? Number(node.data.vectorValue.total) : node.data.vectorValue.values.length;
          node.data.vectorValue.truncated = node.data.vectorValue.values.length < total;
        } else {
          node.data.vectorValue = page;
        }
      } finally {
        loadMoreBtn.textContent = prevText;
        loadMoreBtn.disabled = false;
        renderDetails(ctx, node);
      }
    });
  }
}
