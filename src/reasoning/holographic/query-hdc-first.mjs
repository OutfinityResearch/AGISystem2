/**
 * AGISystem2 - Holographic Query Engine (HDC-First)
 * @module reasoning/holographic/query-hdc-first
 *
 * Thin interface layer; heavy logic is split into:
 * - `query-hdc-first.classify.mjs`
 * - `query-hdc-first.execute.mjs`
 */

import { getHolographicThresholds, getThresholds } from '../../core/constants.mjs';
import { debug_trace } from '../../utils/debug.js';
import { initHdcFirstEngines, executeHdcFirstQuery } from './query-hdc-first.execute.mjs';

function dbg(category, ...args) {
  debug_trace(`[HoloQuery:${category}]`, ...args);
}

export class HolographicQueryEngine {
  constructor(session) {
    this.session = session;

    initHdcFirstEngines(this);

    const strategy = session?.hdcStrategy || 'dense-binary';
    this.config = getHolographicThresholds(strategy);
    this.thresholds = getThresholds(strategy);

    this._vocabCache = null;
    this._vocabCacheAtomCount = -1;
    this._ruleOpsCache = null;
    this._ruleOpsCacheN = -1;

    dbg('INIT', `Strategy: ${strategy}, MinSim: ${this.config.UNBIND_MIN_SIMILARITY}`);
  }

  trackOp(name, delta = 1) {
    const n = Number(delta || 0);
    if (!Number.isFinite(n) || n === 0) return;
    if (!this.session?.reasoningStats?.operations) return;
    this.session.reasoningStats.operations[name] = (this.session.reasoningStats.operations[name] || 0) + n;
  }

  execute(statement, options = {}) {
    return executeHdcFirstQuery(this, statement, options);
  }
}

export default HolographicQueryEngine;

