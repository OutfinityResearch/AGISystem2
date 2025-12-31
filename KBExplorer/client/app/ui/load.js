import { addChatItem } from './chat.js';
import { setKbFactsStat } from './stats.js';

export function setLoadUi({ $, state }, { loading }) {
  state.load.loading = !!loading;
  $('cancelLoadBtn').disabled = !loading;
  $('loadBtn').disabled = !!loading;
}

export function cancelLoad({ $, state }) {
  if (state.load.abortController) {
    try { state.load.abortController.abort(); } catch { /* ignore */ }
  }
  $('theoryFile').value = '';
}

export async function loadFiles(ctx, files, { refreshExplorer }) {
  const { $, state } = ctx;
  const list = Array.from(files || []);
  if (list.length === 0) return;

  if (state.load.abortController) {
    try { state.load.abortController.abort(); } catch { /* ignore */ }
  }
  state.load.abortController = new AbortController();
  const signal = state.load.abortController.signal;

  setLoadUi({ $, state }, { loading: true });
  addChatItem({ $, who: 'user', text: `Load: ${list.map(f => f.name).join(', ')}`, meta: 'learn' });

  try {
    for (let i = 0; i < list.length; i++) {
      if (signal.aborted) throw new Error('Load cancelled');
      const file = list[i];
      const text = await file.text();
      addChatItem({ $, who: 'system', text: `Loading ${i + 1}/${list.length}: ${file.name}`, meta: 'learn' });

      const headers = { 'content-type': 'application/json' };
      if (state.sessionId) headers['x-session-id'] = state.sessionId;
      const res = await fetch('/api/theory/ingest', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename: file.name, text }),
        signal
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `${res.status} ${res.statusText}`);
      if (json?.sessionId && json.sessionId !== state.sessionId) state.sessionId = json.sessionId;
      setKbFactsStat({ $, state }, json.dump?.factCount);
    }

    addChatItem({ $, who: 'system', text: 'Load complete.', meta: 'learn' });
    if (refreshExplorer) await refreshExplorer();
  } catch (e) {
    addChatItem({ $, who: 'system', text: e?.message || String(e), isError: true });
  } finally {
    state.load.abortController = null;
    setLoadUi({ $, state }, { loading: false });
    $('theoryFile').value = '';
  }
}

export function wireLoad(ctx, { refreshExplorer }) {
  const { $ } = ctx;
  $('loadBtn').addEventListener('click', () => $('theoryFile').click());
  $('cancelLoadBtn').addEventListener('click', () => cancelLoad(ctx));
  $('theoryFile').addEventListener('change', async () => loadFiles(ctx, $('theoryFile').files, { refreshExplorer }));
}
