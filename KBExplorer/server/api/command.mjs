import { json, readJson } from '../lib/http.mjs';
import { containsFileOps } from '../lib/dsl.mjs';
import { sanitizeInputMode, sanitizeMode } from '../lib/modes.mjs';
import { tryTranslateKbExplorerDirective } from '../lib/directives.mjs';
import { tryRecordNlTranslationProvenance } from '../lib/nlProvenance.mjs';

export async function handleCommandApi(req, res, url, ctx) {
  if (req.method !== 'POST' || url.pathname !== '/api/command') return false;

  const found = ctx.store.requireUniverse(req, url) ?? ctx.store.getOrCreateUniverse(req, url);
  const { session } = found.universe;
  let payload;
  try {
    payload = await readJson(req);
  } catch (e) {
    json(res, 400, { ok: false, error: e?.message || 'Invalid JSON' });
    return true;
  }

  const mode = sanitizeMode(payload?.mode);
  const inputMode = sanitizeInputMode(payload?.inputMode);
  const textIn = String(payload?.text || '');
  if (!mode) {
    json(res, 400, { ok: false, error: 'Invalid mode' });
    return true;
  }
  if (!inputMode) {
    json(res, 400, { ok: false, error: 'Invalid inputMode' });
    return true;
  }
  if (!textIn.trim()) {
    json(res, 400, { ok: false, error: 'Empty input' });
    return true;
  }

  const urcFactsEnabled = Array.isArray(found.universe.loadedPacks) && found.universe.loadedPacks.includes('URC');
  const urcMaterializeFacts = urcFactsEnabled && session.urcMaterializeFacts === true;

  let dsl = textIn;
  let translation = null;
  let precomputedResult = null;
  if (inputMode === 'nl') {
    const directive = tryTranslateKbExplorerDirective(textIn, { mode });
    if (directive) {
      translation = directive.translation;
      dsl = directive.dsl;

      // URC direction: record NL→DSL provenance as facts when available.
      // Best-effort: if URC provenance relations are not loaded, ignore silently.
      tryRecordNlTranslationProvenance(session, { nlText: textIn, dslText: dsl, translation });
    } else {
      const nlRes = session.executeNL(
        { mode, text: textIn },
        {
          materializeFacts: urcMaterializeFacts,
          guardDsl: (dslText) => {
            if (!ctx.allowFileOps && containsFileOps(dslText)) {
              return { ok: false, status: 400, error: 'Load/Unload is disabled (KBEXPLORER_ALLOW_FILE_OPS=0)' };
            }
            return { ok: true };
          }
        }
      );

      translation = nlRes.translation ?? null;
      dsl = nlRes.dsl || '';

      if (!nlRes?.success) {
        if (nlRes?.blocked) {
          json(res, nlRes.status || 400, {
            ok: false,
            sessionId: found.sessionId,
            mode,
            inputMode,
            text: textIn,
            dsl,
            translation,
            error: nlRes.error || 'Blocked'
          });
          return true;
        }

        json(res, 200, {
          ok: false,
          mode,
          inputMode,
          text: textIn,
          dsl: '',
          translation: nlRes.translation || null,
          errors: nlRes?.errors || nlRes?.translation?.errors || [{ error: nlRes?.error || 'Translation failed' }]
        });
        return true;
      }

      precomputedResult = nlRes.result;
    }
  }

  if (!ctx.allowFileOps && containsFileOps(dsl)) {
    json(res, 400, { ok: false, error: 'Load/Unload is disabled (KBEXPLORER_ALLOW_FILE_OPS=0)' });
    return true;
  }

  try {
    let result = precomputedResult;
    if (!result) {
      if (mode === 'learn') {
        if (dsl.trim().match(/^@\\w+\\s+solve\\s+/)) {
          result = session.solveURC?.(dsl, { materializeFacts: urcMaterializeFacts }) ?? session.learn(dsl);
        } else {
          result = session.learn(dsl);
        }
      } else if (mode === 'query') {
        result = session.queryURC?.(dsl, { materializeFacts: urcMaterializeFacts }) ?? session.query(dsl);
      } else if (mode === 'prove') {
        result = session.proveURC?.(dsl, { materializeFacts: urcMaterializeFacts }) ?? session.prove(dsl);
      } else if (mode === 'abduce') {
        result = session.abduce(dsl);
      } else if (mode === 'findAll') {
        result = session.findAll(dsl);
      }
    }

    let rendered = '';
    if (mode === 'learn') {
      const facts = typeof result?.facts === 'number' ? result.facts : null;
      rendered = result?.success
        ? `Learned${facts === null ? '' : ` ${facts}`} fact${facts === 1 ? '' : 's'}.`
        : `Learn failed.`;
      if (result?.solveResult) {
        const sr = result.solveResult;
        if (sr.problemType && String(sr.problemType).toLowerCase() === 'planning') {
          rendered += ` Planning: ${sr.success ? 'success' : 'failed'}.`;
          if (Array.isArray(sr.plan)) rendered += ` Plan: ${sr.plan.join(' \u2192 ') || '(empty)'}.`;
          if (sr.error) rendered += ` Error: ${sr.error}`;
        } else {
          rendered += ` Solve: ${sr.success ? 'success' : 'failed'}.`;
          if (typeof sr.solutionCount === 'number') rendered += ` Solutions: ${sr.solutionCount}.`;
          if (sr.error) rendered += ` Error: ${sr.error}`;
        }
      }
      if (Array.isArray(result?.warnings) && result.warnings.length > 0) {
        rendered += ` Warnings: ${result.warnings.join(' | ')}`;
      }
      if (Array.isArray(result?.errors) && result.errors.length > 0 && !result.success) {
        rendered += ` Errors: ${result.errors.join(' | ')}`;
      }
    } else if (mode === 'prove') {
      const elaborated = session.elaborate(result);
      rendered = elaborated?.text || session.formatResult(result, 'prove');
    } else {
      rendered = session.formatResult(result, 'query');
    }

    found.universe.chat.push({
      at: Date.now(),
      mode,
      inputMode,
      text: textIn,
      dsl,
      ok: true
    });

    json(res, 200, {
      ok: true,
      sessionId: found.sessionId,
      mode,
      inputMode,
      text: textIn,
      dsl,
      translation,
      result,
      rendered,
      dump: session.dump()
    });
    return true;
  } catch (e) {
    json(res, 500, {
      ok: false,
      sessionId: found.sessionId,
      mode,
      inputMode,
      text: textIn,
      dsl,
      translation,
      error: e?.message || String(e)
    });
    return true;
  }
}
