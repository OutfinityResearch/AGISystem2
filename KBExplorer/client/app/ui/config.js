import { addChatItem } from './chat.js';

function safeSelectValue(selectEl, preferredValue, fallbackValue) {
  const v = String(preferredValue || '');
  if (v && Array.from(selectEl.options || []).some(o => o.value === v)) return v;
  return fallbackValue;
}

export function loadConfig({ $, state }) {
  const defaultStrategy = 'exact';
  const defaultReasoning = 'symbolicPriority';
  const storedStrategy = localStorage.getItem('kbexplorer.hdcStrategy');
  const storedReasoning = localStorage.getItem('kbexplorer.reasoningPriority');
  const storedPacks = localStorage.getItem('kbexplorer.packs');

  const strategyEl = $('strategySelect');
  const reasoningEl = $('reasoningSelect');

  state.config.hdcStrategy = safeSelectValue(strategyEl, storedStrategy, defaultStrategy);
  state.config.reasoningPriority = safeSelectValue(reasoningEl, storedReasoning, defaultReasoning);
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
}

export function saveConfig({ state }) {
  localStorage.setItem('kbexplorer.hdcStrategy', state.config.hdcStrategy);
  localStorage.setItem('kbexplorer.reasoningPriority', state.config.reasoningPriority);
  if (Array.isArray(state.config.packs) && state.config.packs.length > 0) {
    localStorage.setItem('kbexplorer.packs', JSON.stringify(state.config.packs));
  } else {
    localStorage.removeItem('kbexplorer.packs');
  }
}

export function currentSessionOptions({ $ }) {
  return {
    hdcStrategy: $('strategySelect').value,
    reasoningPriority: $('reasoningSelect').value
  };
}

export function wireConfig(ctx, { onRestartSession }) {
  const { $, state } = ctx;

  async function applyChange(next) {
    const prev = { ...state.config };
    const changed = (prev.hdcStrategy !== next.hdcStrategy) || (prev.reasoningPriority !== next.reasoningPriority);
    if (!changed) return;

    const ok = window.confirm(
      'Changing HDC strategy or reasoning mode will reset the current session (KB and chat will be cleared). Continue?'
    );
    if (!ok) {
      $('strategySelect').value = prev.hdcStrategy;
      $('reasoningSelect').value = prev.reasoningPriority;
      return;
    }

    state.config = { ...next };
    saveConfig({ state });
    await onRestartSession();
    addChatItem({
      $,
      who: 'system',
      text: `Session restarted with hdcStrategy=${next.hdcStrategy}, reasoningPriority=${next.reasoningPriority}.`
    });
  }

  $('strategySelect').addEventListener('change', async () => applyChange(currentSessionOptions({ $ })));
  $('reasoningSelect').addEventListener('change', async () => applyChange(currentSessionOptions({ $ })));
}
