import { addChatItem } from './chat.js';
import { saveConfig } from './config.js';

function normalizePackList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    const name = String(raw || '').trim();
    if (!name) continue;
    if (out.includes(name)) continue;
    out.push(name);
  }
  return out;
}

function sameList(a, b) {
  const ax = normalizePackList(a);
  const bx = normalizePackList(b);
  if (ax.length !== bx.length) return false;
  for (let i = 0; i < ax.length; i++) {
    if (ax[i] !== bx[i]) return false;
  }
  return true;
}

function renderPackList({ $, availablePacks, selectedPacks, filterText }) {
  const listEl = $('packsList');
  listEl.innerHTML = '';

  const q = String(filterText || '').trim().toLowerCase();
  const selected = new Set(selectedPacks || []);
  const packs = (availablePacks || []).filter((p) => !q || String(p).toLowerCase().includes(q));

  for (const name of packs) {
    const row = document.createElement('label');
    row.className = 'packRow';
    row.innerHTML = `
      <input type="checkbox" class="packRow__check" />
      <span class="packRow__name"></span>
    `;
    const chk = row.querySelector('input');
    chk.checked = selected.has(name);
    chk.dataset.pack = name;
    row.querySelector('.packRow__name').textContent = name;
    listEl.appendChild(row);
  }

  $('packsCount').textContent = `${packs.length} shown`;
}

function readSelectedFromDialog({ $ }) {
  const out = [];
  const inputs = Array.from(document.querySelectorAll('#packsList input[type="checkbox"]'));
  for (const el of inputs) {
    const name = String(el.dataset.pack || '').trim();
    if (!name) continue;
    if (el.checked) out.push(name);
  }
  return out;
}

export function setPackUi({ $, state }, { loadedPacks = null }) {
  const packs = Array.isArray(loadedPacks) ? loadedPacks : state.config.packs;
  const count = Array.isArray(packs) ? packs.length : 0;
  $('packsBtn').textContent = count ? `Packs (${count})…` : 'Packs…';
}

export function wirePacks(ctx, { onRestartSession }) {
  const { $, api, state } = ctx;

  const dialog = $('packsDialog');

  async function openDialog() {
    const res = await api('/api/packs');
    state.config._availablePacks = res.availablePacks || [];
    state.config._defaultPacks = res.defaultPacks || [];

    // If packs are not set yet, adopt server defaults so the UI is explicit.
    if (!Array.isArray(state.config.packs) || state.config.packs.length === 0) {
      state.config.packs = normalizePackList(state.config._defaultPacks);
      saveConfig({ state });
    }

    $('packsSearch').value = '';
    renderPackList({
      $,
      availablePacks: state.config._availablePacks,
      selectedPacks: state.config.packs,
      filterText: ''
    });

    dialog.showModal();
  }

  $('packsBtn').addEventListener('click', async () => {
    try {
      await openDialog();
    } catch (e) {
      addChatItem({ $, who: 'system', text: e?.message || String(e), isError: true });
    }
  });

  $('packsSearch').addEventListener('input', () => {
    renderPackList({
      $,
      availablePacks: state.config._availablePacks || [],
      selectedPacks: state.config.packs || [],
      filterText: $('packsSearch').value || ''
    });
  });

  $('packsDefaultsBtn').addEventListener('click', () => {
    const defaults = normalizePackList(state.config._defaultPacks || []);
    renderPackList({
      $,
      availablePacks: state.config._availablePacks || [],
      selectedPacks: defaults,
      filterText: $('packsSearch').value || ''
    });
  });

  $('packsAllBtn').addEventListener('click', () => {
    renderPackList({
      $,
      availablePacks: state.config._availablePacks || [],
      selectedPacks: state.config._availablePacks || [],
      filterText: $('packsSearch').value || ''
    });
  });

  $('packsNoneBtn').addEventListener('click', () => {
    renderPackList({
      $,
      availablePacks: state.config._availablePacks || [],
      selectedPacks: [],
      filterText: $('packsSearch').value || ''
    });
  });

  $('packsCancelBtn').addEventListener('click', () => dialog.close());

  $('packsApplyBtn').addEventListener('click', async () => {
    const selected = readSelectedFromDialog({ $ });
    selected.sort((a, b) => a.localeCompare(b));
    const current = normalizePackList(state.config.packs || []).sort((a, b) => a.localeCompare(b));

    if (sameList(selected, current)) {
      dialog.close();
      return;
    }

    const ok = window.confirm(
      'Changing loaded packs will restart the current session (KB and chat will be cleared). Continue?'
    );
    if (!ok) return;

    state.config.packs = selected.length ? selected : null;
    saveConfig({ state });
    dialog.close();

    await onRestartSession();
    addChatItem({
      $,
      who: 'system',
      text: `Session restarted with packs: ${selected.length ? selected.join(', ') : '(server defaults)'}.`
    });
  });
}

