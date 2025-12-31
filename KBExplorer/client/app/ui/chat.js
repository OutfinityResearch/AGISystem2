import { setKbFactsStat } from './stats.js';

export function addChatItem({ $, who, text, dsl = null, meta = null, isError = false }) {
  const el = document.createElement('div');
  el.className = 'chat__item';
  el.innerHTML = `
    <div class="chat__who">${who}${isError ? ' (error)' : ''}${meta ? ` • <span class="muted">${meta}</span>` : ''}</div>
    <div class="chat__text"></div>
  `;
  el.querySelector('.chat__text').textContent = text;

  if (dsl) {
    const pre = document.createElement('div');
    pre.className = 'chat__dsl';
    pre.textContent = dsl;
    el.appendChild(pre);
  }

  $('chat').appendChild(el);
  $('chat').scrollTop = $('chat').scrollHeight;
}

export function wireChat(ctx, { refreshExplorer }) {
  const { $, api, state } = ctx;

  async function sendCommand() {
    const mode = $('modeSelect').value;
    const inputMode = $('inputModeSelect').value;
    const text = $('textInput').value;
    if (!text.trim()) return;

    addChatItem({ $, who: 'user', text, meta: `${mode} • ${inputMode.toUpperCase()}` });
    $('textInput').value = '';

    try {
      const res = await api('/api/command', { method: 'POST', body: { mode, inputMode, text } });
      if (!res.ok) {
        const errs = res.errors || res.translation?.errors || [];
        const msg = errs.length ? JSON.stringify(errs, null, 2) : (res.error || 'Command failed');
        addChatItem({ $, who: 'system', text: msg, meta: 'translation', isError: true });
        return;
      }

      const dsl = res.dsl && inputMode === 'nl' ? res.dsl : null;
      const rendered = (() => {
        const t = String(res.rendered || '').trim();
        if (t === 'No results' && dsl) return 'No results (translated DSL shown below).';
        return t || '(no rendered output)';
      })();
      addChatItem({
        $,
        who: 'system',
        text: rendered,
        dsl,
        meta: `facts=${res.dump?.factCount ?? '?'}`
      });
      setKbFactsStat({ $, state }, res.dump?.factCount);
      if (refreshExplorer) await refreshExplorer();
    } catch (e) {
      addChatItem({ $, who: 'system', text: e?.message || String(e), isError: true });
    }
  }

  $('sendBtn').addEventListener('click', sendCommand);

  $('textInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;

    // Enter sends. Ctrl/Cmd+Enter inserts newline (multi-line).
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const ta = $('textInput');
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(end);
      ta.value = `${before}\n${after}`;
      const pos = start + 1;
      ta.selectionStart = pos;
      ta.selectionEnd = pos;
      return;
    }

    e.preventDefault();
    sendCommand();
  });
}
