import { addChatItem } from './chat.js';

function safeSelectValue(selectEl, preferredValue, fallbackValue) {
  const v = String(preferredValue || '');
  if (v && Array.from(selectEl.options || []).some(o => o.value === v)) return v;
  return fallbackValue;
}

export function loadConfig({ $, state }) {
  const defaultStrategy = 'exact';
  const defaultReasoning = 'symbolicPriority';
  const defaultUrcMaterializeFacts = false;
  const storedStrategy = localStorage.getItem('kbexplorer.hdcStrategy');
  const storedReasoning = localStorage.getItem('kbexplorer.reasoningPriority');
  const storedUrcMaterializeFacts = localStorage.getItem('kbexplorer.urcMaterializeFacts');
  const storedPacks = localStorage.getItem('kbexplorer.packs');

  const strategyEl = $('strategySelect');
  const reasoningEl = $('reasoningSelect');
  const urcEl = $('urcMaterializeFactsToggle');

  state.config.hdcStrategy = safeSelectValue(strategyEl, storedStrategy, defaultStrategy);
  state.config.reasoningPriority = safeSelectValue(reasoningEl, storedReasoning, defaultReasoning);
  state.config.urcMaterializeFacts = (() => {
    if (storedUrcMaterializeFacts === null || storedUrcMaterializeFacts === undefined) return defaultUrcMaterializeFacts;
    const s = String(storedUrcMaterializeFacts).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return defaultUrcMaterializeFacts;
  })();
  state.config.packs = (() => {
    if (!storedPacks) return null;
    try {
      const parsed = JSON.parse(storedPacks);
      if (!Array.isArray(parsed)) return null;
      const cleaned = parsed.map(p => String(p || '').trim()).filter(Boolean);
      return cleaned.length > 0 ? cleaned : null;
    } catch {
      return null;
    }
  })();

  strategyEl.value = state.config.hdcStrategy;
  reasoningEl.value = state.config.reasoningPriority;
  if (urcEl) urcEl.checked = !!state.config.urcMaterializeFacts;
}

export function saveConfig({ state }) {
  localStorage.setItem('kbexplorer.hdcStrategy', state.config.hdcStrategy);
  localStorage.setItem('kbexplorer.reasoningPriority', state.config.reasoningPriority);
  localStorage.setItem('kbexplorer.urcMaterializeFacts', state.config.urcMaterializeFacts ? '1' : '0');
  if (Array.isArray(state.config.packs) && state.config.packs.length > 0) {
    localStorage.setItem('kbexplorer.packs', JSON.stringify(state.config.packs));
  } else {
    localStorage.removeItem('kbexplorer.packs');
  }
}

export function currentSessionOptions({ $ }) {
  return {
    hdcStrategy: $('strategySelect').value,
    reasoningPriority: $('reasoningSelect').value,
    urcMaterializeFacts: !!$('urcMaterializeFactsToggle')?.checked
  };
}

export function wireConfig(ctx, { onRestartSession }) {
  const { $, state } = ctx;

  async function applyChange(next) {
    const prev = { ...state.config };
    const changed =
      (prev.hdcStrategy !== next.hdcStrategy) ||
      (prev.reasoningPriority !== next.reasoningPriority) ||
      (!!prev.urcMaterializeFacts !== !!next.urcMaterializeFacts);
    if (!changed) return;

    const ok = window.confirm(
      'Changing strategy/settings will reset the current session (KB and chat will be cleared). Continue?'
    );
    if (!ok) {
      $('strategySelect').value = prev.hdcStrategy;
      $('reasoningSelect').value = prev.reasoningPriority;
      $('urcMaterializeFactsToggle').checked = !!prev.urcMaterializeFacts;
      return;
    }

    state.config = { ...next };
    saveConfig({ state });
    await onRestartSession();
    addChatItem({
      $,
      who: 'system',
      text: `Session restarted with hdcStrategy=${next.hdcStrategy}, reasoningPriority=${next.reasoningPriority}, urcMaterializeFacts=${next.urcMaterializeFacts ? 'on' : 'off'}.`
    });
  }

  $('strategySelect').addEventListener('change', async () => applyChange(currentSessionOptions({ $ })));
  $('reasoningSelect').addEventListener('change', async () => applyChange(currentSessionOptions({ $ })));
  $('urcMaterializeFactsToggle').addEventListener('change', async () => applyChange(currentSessionOptions({ $ })));
}
