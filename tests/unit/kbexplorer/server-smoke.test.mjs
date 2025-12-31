import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createKBExplorerServer } from '../../../KBExplorer/server/server.mjs';

function makeClient(baseUrl) {
  return {
    async json(path, { method = 'GET', body = null, sessionId = null } = {}) {
      const headers = { 'content-type': 'application/json' };
      if (sessionId) headers['x-session-id'] = sessionId;
      const res = await fetch(new URL(path, baseUrl), {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      const json = await res.json();
      return { status: res.status, json };
    }
  };
}

describe('KBExplorer server (smoke)', () => {
  let server;
  let baseUrl;
  let listenError = null;

  before(async () => {
    const created = createKBExplorerServer({ allowFileOps: false, sessionOptions: { geometry: 1024 } });
    server = created.server;
    await new Promise((resolve) => {
      server.once('error', (err) => {
        listenError = err;
        resolve();
      });
      server.listen(0, '127.0.0.1', resolve);
    });
    if (!listenError) {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  after(async () => {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
  });

  test('creates session, ingests theory, lists facts, returns tree', async (t) => {
    if (listenError) {
      t.skip(`Socket listen is not permitted in this environment (${listenError.code || 'ERR'}).`);
      return;
    }
    const c = makeClient(baseUrl);

    const newRes = await c.json('/api/session/new', {
      method: 'POST',
      body: { sessionOptions: { hdcStrategy: 'dense-binary', reasoningPriority: 'symbolicPriority' } }
    });
    assert.equal(newRes.status, 200);
    assert.equal(newRes.json.ok, true);
    assert.ok(newRes.json.sessionId);
    const sessionId = newRes.json.sessionId;

    const ingestRes = await c.json('/api/theory/ingest', {
      method: 'POST',
      sessionId,
      body: { filename: 't.sys2', text: 'isA Anne Dog\nisA Dog Animal' }
    });
    assert.equal(ingestRes.status, 200);
    assert.equal(ingestRes.json.ok, true);
    assert.ok(ingestRes.json.dump.factCount >= 2);

    const factsRes = await c.json('/api/kb/facts', { sessionId });
    assert.equal(factsRes.status, 200);
    assert.equal(factsRes.json.ok, true);
    assert.ok(Array.isArray(factsRes.json.facts));
    assert.ok(factsRes.json.facts.length >= 2);
    const firstId = factsRes.json.facts[0].factId;

    const bundleRes = await c.json(`/api/kb/facts/${firstId}/bundle`, { sessionId });
    assert.equal(bundleRes.status, 200);
    assert.equal(bundleRes.json.ok, true);
    assert.equal(bundleRes.json.fact.factId, firstId);
    assert.ok(Array.isArray(bundleRes.json.bundle.items));
  });

  test('lists graphs and fetches graph details', async (t) => {
    if (listenError) {
      t.skip(`Socket listen is not permitted in this environment (${listenError.code || 'ERR'}).`);
      return;
    }
    const c = makeClient(baseUrl);

    const newRes = await c.json('/api/session/new', {
      method: 'POST',
      body: { sessionOptions: { hdcStrategy: 'dense-binary', reasoningPriority: 'symbolicPriority' } }
    });
    const sessionId = newRes.json.sessionId;

    const listRes = await c.json('/api/graphs?limit=50', { sessionId });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.json.ok, true);
    assert.ok(Array.isArray(listRes.json.graphs));
    assert.ok(listRes.json.graphs.length > 0);

    // Core always defines at least some graphs (e.g., __Role).
    const name = listRes.json.graphs.find(g => g.name === '__Role')?.name || listRes.json.graphs[0].name;
    const detailRes = await c.json(`/api/graphs/${encodeURIComponent(name)}`, { sessionId });
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.json.ok, true);
    assert.equal(detailRes.json.name, name);
    assert.ok(String(detailRes.json.graphDsl || '').includes('graph'));
  });

  test('blocks Load/Unload by default', async (t) => {
    if (listenError) {
      t.skip(`Socket listen is not permitted in this environment (${listenError.code || 'ERR'}).`);
      return;
    }
    const c = makeClient(baseUrl);
    const newRes = await c.json('/api/session/new', {
      method: 'POST',
      body: { sessionOptions: { hdcStrategy: 'dense-binary', reasoningPriority: 'symbolicPriority' } }
    });
    const sessionId = newRes.json.sessionId;

    const ingestRes = await c.json('/api/theory/ingest', {
      method: 'POST',
      sessionId,
      body: { filename: 'bad.sys2', text: '@_ Load \"./x.sys2\"' }
    });
    assert.equal(ingestRes.status, 400);
    assert.equal(ingestRes.json.ok, false);
  });
});
