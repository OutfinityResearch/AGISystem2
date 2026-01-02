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
    // KBExplorer is a research tool: allow DSL Load/Unload at HTTP layer by default.
    // Make this test hermetic even if the environment sets KBEXPLORER_ALLOW_FILE_OPS=0.
    const created = createKBExplorerServer({ allowFileOps: true, sessionOptions: { geometry: 1024 } });
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

  test('allows Load/Unload by default', async (t) => {
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
    // KBExplorer allows Load/Unload by default (research tool). This should not be blocked at HTTP layer.
    assert.equal(ingestRes.status, 200);
    assert.equal(ingestRes.json.ok, true);
    assert.equal(ingestRes.json.learn.success, false);
  });

  test('blocks Load/Unload when disabled', async (t) => {
    if (listenError) {
      t.skip(`Socket listen is not permitted in this environment (${listenError.code || 'ERR'}).`);
      return;
    }

    const created = createKBExplorerServer({ allowFileOps: false, sessionOptions: { geometry: 1024 } });
    const s = created.server;

    let base = null;
    let err = null;
    await new Promise((resolve) => {
      s.once('error', (e) => { err = e; resolve(); });
      s.listen(0, '127.0.0.1', resolve);
    });
    if (err) {
      t.skip(`Socket listen is not permitted in this environment (${err.code || 'ERR'}).`);
      return;
    }
    try {
      const addr = s.address();
      base = `http://127.0.0.1:${addr.port}`;
      const c = makeClient(base);

      const newRes = await c.json('/api/session/new', {
        method: 'POST',
        body: { sessionOptions: { hdcStrategy: 'dense-binary', reasoningPriority: 'symbolicPriority' } }
      });
      const sessionId = newRes.json.sessionId;

      const ingestRes = await c.json('/api/theory/ingest', {
        method: 'POST',
        sessionId,
        body: { filename: 'blocked.sys2', text: '@_ Load \"./x.sys2\"' }
      });

      assert.equal(ingestRes.status, 400);
      assert.equal(ingestRes.json.ok, false);
      assert.ok(String(ingestRes.json.error || '').toLowerCase().includes('load/unload'));
    } finally {
      await new Promise(resolve => s.close(resolve));
    }
  });

  test('exposes URC audit endpoints (provenance, evidence, artifacts)', async (t) => {
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

    // NL command should be translated and recorded as provenance.
    const nlRes = await c.json('/api/command', {
      method: 'POST',
      sessionId,
      body: { mode: 'learn', inputMode: 'nl', text: 'Anne is a Dog.' }
    });
    assert.equal(nlRes.status, 200, JSON.stringify(nlRes.json));
    assert.equal(nlRes.json.ok, true);

    const provList = await c.json('/api/urc/provenance', { sessionId });
    assert.equal(provList.status, 200);
    assert.equal(provList.json.ok, true);
    assert.ok(provList.json.count >= 1);

    // URC query should record evidence.
    const qRes = await c.json('/api/command', {
      method: 'POST',
      sessionId,
      body: { mode: 'query', inputMode: 'dsl', text: 'isA Anne ?t' }
    });
    assert.equal(qRes.status, 200, JSON.stringify(qRes.json));

    const evList = await c.json('/api/urc/evidence', { sessionId });
    assert.equal(evList.status, 200);
    assert.equal(evList.json.ok, true);
    assert.ok(evList.json.count >= 1);

    // A solve block should produce a JSON artifact.
    const solveDsl = [
      'isA Alice Guest',
      'isA Bob Guest',
      'isA T1 Table',
      'isA T2 Table',
      'conflictsWith Alice Bob',
      'conflictsWith Bob Alice',
      '@seat solve csp',
      '  variables from Guest',
      '  domain from Table',
      '  noConflict conflictsWith',
      'end'
    ].join('\n');
    const solveRes = await c.json('/api/command', {
      method: 'POST',
      sessionId,
      body: { mode: 'learn', inputMode: 'dsl', text: solveDsl }
    });
    assert.equal(solveRes.status, 200, JSON.stringify(solveRes.json));

    const artList = await c.json('/api/urc/artifacts', { sessionId });
    assert.equal(artList.status, 200);
    assert.equal(artList.json.ok, true);
    assert.ok(artList.json.count >= 1);

    const statsRes = await c.json('/api/session/stats', { sessionId });
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.json.ok, true);
    assert.ok(Number.isFinite(statsRes.json.urcArtifactCount));
    assert.ok(Number.isFinite(statsRes.json.urcEvidenceCount));
    assert.ok(Number.isFinite(statsRes.json.urcProvenanceCount));
    assert.ok(statsRes.json.urcArtifactCount >= artList.json.count);
  });
});
