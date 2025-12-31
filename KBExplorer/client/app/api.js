export function createApi({ state }) {
  async function api(path, { method = 'GET', body = null, signal = null } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (state.sessionId) headers['x-session-id'] = state.sessionId;

    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    if (json?.sessionId && json.sessionId !== state.sessionId) {
      state.sessionId = json.sessionId;
    }
    return json;
  }

  return { api };
}

