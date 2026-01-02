import { $, must } from './dom.js';
import { createState } from './state.js';
import { createApi } from './api.js';

import { wireTabs, setMainTab } from './ui/tabs.js';
import { loadConfig, currentSessionOptions, wireConfig } from './ui/config.js';
import { wirePacks, setPackUi } from './ui/packs.js';
import { wireChat, addChatItem } from './ui/chat.js';
import { wireLoad, setLoadUi } from './ui/load.js';
import { setKbFactsStat } from './ui/stats.js';

import { buildTree, renderDetails, renderTree, selectedNode } from './kb/tree.js';

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
  must('tabDsl');
  must('tabNl');
  must('panelChat');
  must('panelKB');
  must('panelDsl');
  must('panelNl');
  must('sendBtn');
  must('textInput');
  must('urcMaterializeFactsToggle');
  must('packsBtn');
  must('packsDialog');
  must('packsSearch');
  must('packsList');
  must('packsApplyBtn');
  must('packsCancelBtn');
  must('packsDefaultsBtn');
  must('packsAllBtn');
  must('packsNoneBtn');
  must('packsCount');
  must('loadBtn');
  must('theoryFile');
  must('cancelLoadBtn');
  must('complexOnlyToggle');

  const state = createState();
  const { api } = createApi({ state });
  const ctx = { $, state, api };

  function resetUrcUiState() {
    state.kb.urc.artifacts.offset = 0;
    state.kb.urc.artifacts.total = 0;
    state.kb.urc.artifacts.items = [];
    state.kb.urc.evidence.offset = 0;
    state.kb.urc.evidence.total = 0;
    state.kb.urc.evidence.items = [];
    state.kb.urc.provenance.offset = 0;
    state.kb.urc.provenance.total = 0;
    state.kb.urc.provenance.items = [];
    state.kb.urc.policyView = null;
  }

  function updateSessionLabel() {
    $('sessionLabel').textContent = `session: ${state.sessionId || '(none)'}`;
  }

  async function ensureSession() {
    const res = await api('/api/session/new', {
      method: 'POST',
      body: {
        sessionOptions: currentSessionOptions(ctx),
        packs: state.config.packs
      }
    });
    state.sessionId = res.sessionId;
    if (Array.isArray(res.loadedPacks) && res.loadedPacks.length > 0) {
      state.config.packs = res.loadedPacks;
    }
    setPackUi(ctx, { loadedPacks: res.loadedPacks || state.config.packs });
    updateSessionLabel();
  }

  async function resetSession() {
    const res = await api('/api/session/reset', {
      method: 'POST',
      body: {
        sessionOptions: currentSessionOptions(ctx),
        packs: state.config.packs
      }
    });
    if (Array.isArray(res.loadedPacks) && res.loadedPacks.length > 0) {
      state.config.packs = res.loadedPacks;
    }
    setPackUi(ctx, { loadedPacks: res.loadedPacks || state.config.packs });
    updateSessionLabel();
  }

  async function refreshSessionStats() {
    const params = new URLSearchParams();
    const q = String(state?.kb?.q || '').trim();
    if (q) params.set('q', q);
    params.set('complexOnly', state?.kb?.complexOnly ? '1' : '0');
    const res = await api(`/api/session/stats?${params.toString()}`);
    state.kb.kbFactCount = res.kbFactCount ?? state.kb.kbFactCount;
    state.kb.kbFactCountFiltered = res.kbFactCountFiltered ?? state.kb.kbFactCountFiltered;
    state.kb.kbBundleTerms = res.kbBundleTerms ?? state.kb.kbBundleTerms;
    state.kb.graphCount = res.graphCount ?? state.kb.graphCount;
    state.kb.graphCountFiltered = res.graphCountFiltered ?? state.kb.graphCountFiltered;
    state.kb.vocabCount = res.vocabCount ?? state.kb.vocabCount;
    state.kb.vocabCountFiltered = res.vocabCountFiltered ?? state.kb.vocabCountFiltered;
    state.kb.vocabLayerCounts = res.vocabLayerCounts ?? state.kb.vocabLayerCounts;
    state.kb.scopeCount = res.scopeCount ?? state.kb.scopeCount;
    state.kb.scopeCountFiltered = res.scopeCountFiltered ?? state.kb.scopeCountFiltered;
    state.kb.urcArtifactCount = res.urcArtifactCount ?? state.kb.urcArtifactCount;
    state.kb.urcEvidenceCount = res.urcEvidenceCount ?? state.kb.urcEvidenceCount;
    state.kb.urcProvenanceCount = res.urcProvenanceCount ?? state.kb.urcProvenanceCount;
    state.kb.urcArtifactCountFiltered = res.urcArtifactCountFiltered ?? state.kb.urcArtifactCountFiltered;
    state.kb.urcEvidenceCountFiltered = res.urcEvidenceCountFiltered ?? state.kb.urcEvidenceCountFiltered;
    state.kb.urcProvenanceCountFiltered = res.urcProvenanceCountFiltered ?? state.kb.urcProvenanceCountFiltered;
    setKbFactsStat(ctx, state.kb.kbFactCount);
    $('factCount').textContent =
      `KB=${state.kb.kbFactCount} • graphs=${state.kb.graphCount} • vocab=${state.kb.vocabCount} • scope=${state.kb.scopeCount}`;
  }

  async function refreshExplorer() {
    await refreshSessionStats();
    buildTree({ state });
    renderTree(ctx);
    renderDetails(ctx, selectedNode({ state }));
  }

  // Wire core UI.
  wireTabs(ctx);
  loadConfig(ctx);
  setMainTab(ctx, 'chat');
  setLoadUi({ $, state }, { loading: false });
  setPackUi(ctx, { loadedPacks: state.config.packs });

  // Header controls
  $('newSessionBtn').addEventListener('click', async () => {
    await ensureSession();
    $('chat').innerHTML = '';
    state.kb.kbOffset = 0;
    resetUrcUiState();
    state.kb.pinnedFactIds = [];
    state.kb.selectedNodeId = null;
    await refreshExplorer();
    addChatItem({ $, who: 'system', text: 'New session created.' });
  });
  $('resetSessionBtn').addEventListener('click', async () => {
    await resetSession();
    $('chat').innerHTML = '';
    state.kb.kbOffset = 0;
    resetUrcUiState();
    state.kb.pinnedFactIds = [];
    state.kb.selectedNodeId = null;
    await refreshExplorer();
    addChatItem({ $, who: 'system', text: 'Session reset.' });
  });

  wireConfig(ctx, {
    onRestartSession: async () => {
      await ensureSession();
      $('chat').innerHTML = '';
      state.kb.kbOffset = 0;
      resetUrcUiState();
      state.kb.pinnedFactIds = [];
      state.kb.selectedNodeId = null;
      await refreshExplorer();
    }
  });

  wirePacks(ctx, {
    onRestartSession: async () => {
      await ensureSession();
      $('chat').innerHTML = '';
      state.kb.kbOffset = 0;
      resetUrcUiState();
      state.kb.pinnedFactIds = [];
      state.kb.selectedNodeId = null;
      await refreshExplorer();
    }
  });

  // KB controls
  $('complexOnlyToggle').checked = !!state.kb.complexOnly;
  $('complexOnlyToggle').addEventListener('change', async () => {
    state.kb.complexOnly = !!$('complexOnlyToggle').checked;
    state.kb.kbOffset = 0;
    state.kb.kbTotal = 0;
    state.kb.pinnedFactIds = [];
    state.kb.selectedNodeId = null;
    await refreshExplorer();
  });

  $('factFilter').addEventListener('input', debounce(async () => {
    state.kb.q = $('factFilter').value || '';
    state.kb.kbOffset = 0;
    state.kb.kbTotal = 0;
    state.kb.graphOffset = 0;
    state.kb.scopeOffset = 0;
    for (const k of Object.keys(state.kb.vocab || {})) {
      state.kb.vocab[k].offset = 0;
    }
    state.kb.urc.artifacts.offset = 0;
    state.kb.urc.evidence.offset = 0;
    state.kb.urc.provenance.offset = 0;
    await refreshExplorer();
  }, 250));

  $('refreshFactsBtn').addEventListener('click', refreshExplorer);

  // Chat + Load
  wireChat(ctx, { refreshExplorer });
  wireLoad(ctx, { refreshExplorer });

  // Initial session
  await ensureSession();
  await refreshExplorer();
  addChatItem({
    $,
    who: 'system',
    text: 'Ready. Tip: Enter sends; Ctrl+Enter inserts a newline. NL parsing is English-oriented; use DSL for non-English input.'
  });
}
