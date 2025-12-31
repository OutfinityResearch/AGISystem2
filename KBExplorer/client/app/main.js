import { $, must } from './dom.js';
import { createState } from './state.js';
import { createApi } from './api.js';

import { wireTabs, setMainTab, setDocsTab } from './ui/tabs.js';
import { loadConfig, currentSessionOptions, wireConfig } from './ui/config.js';
import { wireChat, addChatItem } from './ui/chat.js';
import { wireLoad, setLoadUi } from './ui/load.js';
import { setKbFactsStat } from './ui/stats.js';

import { buildTree, renderDetails, renderTree, selectedNode } from './kb/tree.js';
import { openSelectedDefinition } from './kb/actions.js';

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export async function bootstrap() {
  // Validate critical DOM nodes early.
  must('sessionLabel');
  must('kbFactsStat');
  must('tabChat');
  must('tabKB');
  must('tabDocs');
  must('panelChat');
  must('panelKB');
  must('panelDocs');
  must('sendBtn');
  must('textInput');
  must('loadBtn');
  must('theoryFile');
  must('cancelLoadBtn');

  const state = createState();
  const { api } = createApi({ state });
  const ctx = { $, state, api };

  function updateSessionLabel() {
    $('sessionLabel').textContent = `session: ${state.sessionId || '(none)'}`;
  }

  async function ensureSession() {
    const res = await api('/api/session/new', { method: 'POST', body: { sessionOptions: currentSessionOptions(ctx) } });
    state.sessionId = res.sessionId;
    updateSessionLabel();
  }

  async function resetSession() {
    await api('/api/session/reset', { method: 'POST', body: { sessionOptions: currentSessionOptions(ctx) } });
    updateSessionLabel();
  }

  async function refreshFacts() {
    const params = new URLSearchParams();
    const q = String(state.kb.q || '').trim();
    if (q) params.set('q', q);
    params.set('offset', String(state.kb.offset));
    params.set('limit', String(state.kb.limit));
    params.set('namedOnly', state.kb.namedOnly ? '1' : '0');
    params.set('namedFirst', '1');

    const res = await api(`/api/kb/facts?${params.toString()}`);
    state.kb.total = res.total ?? 0;
    state.kb.offset = res.offset ?? 0;
    state.kb.limit = res.limit ?? state.kb.limit;
    state.kb.facts = res.facts || [];
    setKbFactsStat(ctx, res.kbFactCount);

    const kbCount = typeof res.kbFactCount === 'number' ? res.kbFactCount : null;
    $('factCount').textContent = kbCount === null
      ? `${state.kb.total} total`
      : `${state.kb.total} total (KB=${kbCount})`;

    const start = state.kb.total ? (state.kb.offset + 1) : 0;
    const end = state.kb.offset + state.kb.facts.length;
    $('factsPageLabel').textContent = state.kb.total ? `${start}-${end} of ${state.kb.total}` : '0';
    $('factsPrevBtn').disabled = state.kb.offset <= 0;
    $('factsNextBtn').disabled = (state.kb.offset + state.kb.limit) >= state.kb.total;

    buildTree({ state });
    renderTree(ctx);
    renderDetails(ctx, selectedNode({ state }));
  }

  // Wire core UI.
  wireTabs(ctx);
  loadConfig(ctx);
  setMainTab(ctx, 'chat');
  setDocsTab(ctx, 'dsl');
  setLoadUi({ $, state }, { loading: false });

  // Header controls
  $('newSessionBtn').addEventListener('click', async () => {
    await ensureSession();
    $('chat').innerHTML = '';
    state.kb.offset = 0;
    state.kb.pinnedFactIds = [];
    state.kb.selectedNodeId = null;
    await refreshFacts();
    addChatItem({ $, who: 'system', text: 'New session created.' });
  });
  $('resetSessionBtn').addEventListener('click', async () => {
    await resetSession();
    $('chat').innerHTML = '';
    state.kb.offset = 0;
    state.kb.pinnedFactIds = [];
    state.kb.selectedNodeId = null;
    await refreshFacts();
    addChatItem({ $, who: 'system', text: 'Session reset.' });
  });

  wireConfig(ctx, {
    onRestartSession: async () => {
      await ensureSession();
      $('chat').innerHTML = '';
      state.kb.offset = 0;
      state.kb.pinnedFactIds = [];
      state.kb.selectedNodeId = null;
      await refreshFacts();
    }
  });

  // KB controls
  $('namedOnlyToggle').checked = !!state.kb.namedOnly;
  $('namedOnlyToggle').addEventListener('change', async () => {
    state.kb.namedOnly = !!$('namedOnlyToggle').checked;
    state.kb.offset = 0;
    state.kb.pinnedFactIds = [];
    state.kb.selectedNodeId = null;
    await refreshFacts();
  });

  $('factFilter').addEventListener('input', debounce(async () => {
    state.kb.q = $('factFilter').value || '';
    state.kb.offset = 0;
    await refreshFacts();
  }, 250));

  $('refreshFactsBtn').addEventListener('click', refreshFacts);
  $('factsPrevBtn').addEventListener('click', async () => {
    state.kb.offset = Math.max(0, state.kb.offset - state.kb.limit);
    await refreshFacts();
  });
  $('factsNextBtn').addEventListener('click', async () => {
    state.kb.offset = state.kb.offset + state.kb.limit;
    await refreshFacts();
  });

  $('openDefinitionBtn').addEventListener('click', () => openSelectedDefinition(ctx));

  // Chat + Load
  wireChat(ctx, { refreshFacts });
  wireLoad(ctx, { refreshFacts });

  // Initial session
  await ensureSession();
  await refreshFacts();
  addChatItem({
    $,
    who: 'system',
    text: 'Ready. Tip: Enter sends; Ctrl+Enter inserts a newline. Use “learn” to add facts, then “query” or “prove”.'
  });
}

