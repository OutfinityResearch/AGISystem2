import { addChatItem } from './chat.js';

export function loadConfig({ $, state }) {
  state.config.hdcStrategy = localStorage.getItem('kbexplorer.hdcStrategy') || 'dense-binary';
  state.config.reasoningPriority = localStorage.getItem('kbexplorer.reasoningPriority') || 'symbolicPriority';
  $('strategySelect').value = state.config.hdcStrategy;
  $('reasoningSelect').value = state.config.reasoningPriority;
}

export function saveConfig({ state }) {
  localStorage.setItem('kbexplorer.hdcStrategy', state.config.hdcStrategy);
  localStorage.setItem('kbexplorer.reasoningPriority', state.config.reasoningPriority);
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

