/**
 * Multi-Source Reasoning Dataset Loader
 *
 * Downloads and caches multiple reasoning datasets from HuggingFace:
 * - FOLIO (First-Order Logic)
 * - LogiQA (Civil Service Exam)
 * - LogicNLI (Natural Language Inference)
 * - ProntoQA (Proof chains)
 * - RuleTaker (via logi_glue if available)
 * - CLUTRR (Relational reasoning)
 * - ReClor (Reading comprehension)
 * - And more from logi_glue
 */

import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const AUTO_DISCOVERY_DIR = join(THIS_DIR, '..', '..');

const DEFAULT_CACHE_DIR = join(AUTO_DISCOVERY_DIR, 'cache', 'logiglue');
const LEGACY_CACHE_DIR = '/tmp/logiglue';

export const CACHE_DIR = process.env.LOGIGLUE_CACHE_DIR || DEFAULT_CACHE_DIR;
const HF_API_URL = 'https://datasets-server.huggingface.co/rows';

// Dataset sources with their HuggingFace paths and configurations
export const DATASET_SOURCES = {
  // Primary combined dataset (has most subsets)
  'logi_glue': {
    hfDataset: 'logicreasoning/logi_glue',
    subsets: {
      'folio': { config: 'folio', split: 'test', approxSize: 1210 },
      'logiqa': { config: 'logiQA', split: 'test', approxSize: 1000 },
      'logiqa2': { config: 'logiQA_2.0', split: 'test', approxSize: 3240 },
      'logicnli': { config: 'logicNLI', split: 'test', approxSize: 3000 },
      'prontoqa': { config: 'prontoqa', split: 'test', approxSize: 200 },
      'reclor': { config: 'reclor', split: 'test', approxSize: 500 },
      'clutrr': { config: 'cluttr', split: 'test', approxSize: 3000 },
      'rulebert': { config: 'rulebert', split: 'test', approxSize: 5000 },
      'babi15': { config: 'babi_task_15', split: 'test', approxSize: 5000 },
      'babi16': { config: 'babi_task_16', split: 'test', approxSize: 5000 },
      'abduction': { config: 'abduction_animal', split: 'test', approxSize: 5000 }
    }
  },

  // Standalone FOLIO with FOL annotations (richer than logi_glue version)
  'folio_full': {
    hfDataset: 'tasksource/folio',
    subsets: {
      'folio_fol': { config: 'default', split: 'train', approxSize: 1000 }
    }
  },

  // RuleTaker (already integrated separately, but can use from here too)
  'ruletaker': {
    hfDataset: 'tasksource/ruletaker',
    subsets: {
      'ruletaker': { config: 'default', split: 'test', approxSize: 5000 }
    }
  }
};

// Unified format adapters for each source type
const FORMAT_ADAPTERS = {
  'folio': (row) => {
    // FOLIO in logi_glue has context with "premises: ... conclusion: ..." format
    const ctx = row.context || '';
    const premisesMatch = ctx.match(/premises:\s*(.+?)\s*conclusion:/is);
    const conclusionMatch = ctx.match(/conclusion:\s*(.+)$/is);
    const premises = premisesMatch ? premisesMatch[1].trim() : ctx;
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : row.question || '';

    return {
      source: 'folio',
      context: premises,
      question: conclusion,
      label: normalizeLabel(row.answer_text || row.label),
      choices: row.choices || [],
      category: 'first_order_logic',
      metadata: { story_id: row.story_id, fol: row['premises-FOL'] }
    };
  },

  'folio_fol': (row) => ({
    source: 'folio_fol',
    context: row.premises || '',
    question: row.conclusion || '',
    label: normalizeLabel(row.label),
    choices: [],
    category: 'first_order_logic',
    metadata: {
      story_id: row.story_id,
      premises_fol: row['premises-FOL'],
      conclusion_fol: row['conclusion-FOL']
    }
  }),

  'logiqa': (row) => ({
    source: 'logiqa',
    context: row.context || '',
    question: row.question || '',
    // LogiQA is multi-choice - use answer_choice to determine if first choice (usually "entailment")
    label: row.answer_choice === 0 ? 'entailment' : 'not_entailment',
    choices: row.choices || [],
    answerIndex: row.answer_choice,
    category: 'multi_choice_reasoning',
    metadata: { originalAnswer: row.answer_text }
  }),

  'logiqa2': (row) => ({
    source: 'logiqa2',
    context: row.premise || row.context || '',
    question: row.hypothesis || row.question || '',
    label: normalizeLabel(row.output || row.answer_text),
    choices: row.choices || [],
    category: 'nli_complex',
    metadata: {}
  }),

  'logicnli': (row) => ({
    source: 'logicnli',
    context: row.context || row.premise || '',
    question: row.question || row.hypothesis || '',
    label: normalizeLabel(row.answer_text || row.label),
    choices: row.choices || [],
    category: 'natural_language_inference',
    metadata: { question_type: row.question_type }
  }),

  'prontoqa': (row) => {
    // ProntoQA has input field with "Context: ... Question: ..." format
    const input = row.input || '';
    const contextMatch = input.match(/Context:\s*(.+?)\s*Question:/is);
    const questionMatch = input.match(/Question:\s*(.+?)\s*(?:Is the Question|Options:|$)/is);
    const context = contextMatch ? contextMatch[1].trim() : row.context || '';
    const question = questionMatch ? questionMatch[1].trim() : row.question || '';

    return {
      source: 'prontoqa',
      context,
      question,
      label: normalizeLabel(row.answer_text),
      choices: row.choices || [],
      category: 'proof_chains',
      metadata: { proof: row.proof, cots: row.ground_truth_cots }
    };
  },

  'reclor': (row) => ({
    source: 'reclor',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.answer_text),
    choices: row.choices || [],
    answerIndex: row.answer_choice,
    category: 'reading_comprehension',
    metadata: {}
  }),

  'clutrr': (row) => ({
    source: 'clutrr',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.answer_text),
    choices: row.choices || [],
    category: 'relational_reasoning',
    metadata: {}
  }),

  'rulebert': (row) => ({
    source: 'rulebert',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.answer_text),
    choices: row.choices || [],
    category: 'soft_rules',
    metadata: {}
  }),

  'babi15': (row) => ({
    source: 'babi15',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.answer_text),
    choices: row.choices || [],
    category: 'basic_deduction',
    metadata: {}
  }),

  'babi16': (row) => ({
    source: 'babi16',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.answer_text),
    choices: row.choices || [],
    category: 'basic_induction',
    metadata: {}
  }),

  'abduction': (row) => ({
    source: 'abduction',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.answer_text),
    choices: row.choices || [],
    category: 'abductive_reasoning',
    metadata: {}
  }),

  'ruletaker': (row) => ({
    source: 'ruletaker',
    context: row.context || '',
    question: row.question || '',
    label: normalizeLabel(row.label),
    choices: [],
    category: 'rule_based',
    metadata: { config: row.config, depth: extractDepth(row.config) }
  })
};

// Default adapter for unknown formats
const DEFAULT_ADAPTER = (row, source) => ({
  source,
  context: row.context || row.premise || row.premises || '',
  question: row.question || row.hypothesis || row.conclusion || '',
  label: normalizeLabel(row.answer_text || row.label || row.output),
  choices: row.choices || [],
  category: 'unknown',
  metadata: { raw: row }
});

/**
 * Normalize label to: 'entailment', 'not_entailment', 'uncertain'
 */
function normalizeLabel(label) {
  if (!label) return 'unknown';
  const l = String(label).toLowerCase().trim();

  // Entailment variants
  if (l === 'true' || l === 'entailment' || l === 'yes' || l === '1' || l === 'correct') {
    return 'entailment';
  }

  // Not entailment variants
  if (l === 'false' || l === 'not_entailment' || l === 'contradiction' || l === 'no' || l === '0' || l === 'incorrect') {
    return 'not_entailment';
  }

  // Uncertain
  if (l === 'uncertain' || l === 'neutral' || l === 'unknown' || l === 'neither') {
    return 'uncertain';
  }

  // Multi-choice answer - keep as-is
  return label;
}

/**
 * Extract depth from RuleTaker config
 */
function extractDepth(config) {
  if (!config) return 0;
  const match = config.match(/depth-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Rate limiting
const ROWS_PER_REQUEST = 100;
const RETRY_DELAYS = [1000, 2000, 5000, 10000];
const REQUEST_DELAY = 150;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureCacheDir() {
  if (fs.existsSync(CACHE_DIR)) return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCachePathPrimary(sourceKey, subsetKey) {
  return join(CACHE_DIR, `${sourceKey}_${subsetKey}.jsonl`);
}

function getCachePathLegacy(sourceKey, subsetKey) {
  return join(LEGACY_CACHE_DIR, `${sourceKey}_${subsetKey}.jsonl`);
}

function getCachePathForRead(sourceKey, subsetKey) {
  const primary = getCachePathPrimary(sourceKey, subsetKey);
  if (fs.existsSync(primary)) return primary;
  const legacy = getCachePathLegacy(sourceKey, subsetKey);
  if (fs.existsSync(legacy)) return legacy;
  return primary;
}

function isCacheFresh(cachePath, maxAgeHours = 24 * 7) {
  if (!fs.existsSync(cachePath)) return false;
  const stats = fs.statSync(cachePath);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  return ageHours < maxAgeHours;
}

/**
 * Fetch rows from HuggingFace API with retry logic
 */
async function fetchRows(dataset, config, split, offset, length) {
  const url = new URL(HF_API_URL);
  url.searchParams.set('dataset', dataset);
  url.searchParams.set('config', config);
  url.searchParams.set('split', split);
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('length', length.toString());

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(url.toString());

      if (response.status === 429) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.rows.map(r => r.row);
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError || new Error('Failed to fetch rows after retries');
}

/**
 * Get total rows in a split
 */
async function getSplitSize(dataset, config) {
  const url = new URL('https://datasets-server.huggingface.co/size');
  url.searchParams.set('dataset', dataset);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  const data = await response.json();

  // Try to find specific config
  if (data.size?.configs) {
    const configInfo = data.size.configs.find(c => c.config === config);
    if (configInfo?.num_rows) return configInfo.num_rows;
  }

  // Fallback to splits
  if (data.size?.splits) {
    const total = data.size.splits.reduce((sum, s) => sum + (s.num_rows || 0), 0);
    if (total > 0) return total;
  }

  return null;
}

/**
 * Download a specific subset
 */
async function downloadSubset(sourceKey, subsetKey, progressCallback) {
  ensureCacheDir();

  const sourceInfo = DATASET_SOURCES[sourceKey];
  const subsetInfo = sourceInfo.subsets[subsetKey];
  const cachePath = getCachePathPrimary(sourceKey, subsetKey);

  // Try to get actual size, fall back to approx
  let totalRows;
  try {
    totalRows = await getSplitSize(sourceInfo.hfDataset, subsetInfo.config);
  } catch (e) {
    totalRows = subsetInfo.approxSize;
  }

  if (!totalRows) totalRows = subsetInfo.approxSize || 1000;

  if (progressCallback) {
    progressCallback({ phase: 'start', source: subsetKey, total: totalRows });
  }

  const writeStream = fs.createWriteStream(cachePath);
  let downloaded = 0;
  let consecutiveErrors = 0;

  while (downloaded < totalRows && consecutiveErrors < 5) {
    try {
      const batchSize = Math.min(ROWS_PER_REQUEST, totalRows - downloaded);
      const rows = await fetchRows(
        sourceInfo.hfDataset,
        subsetInfo.config,
        subsetInfo.split,
        downloaded,
        batchSize
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        writeStream.write(JSON.stringify(row) + '\n');
      }

      downloaded += rows.length;
      consecutiveErrors = 0;

      if (progressCallback) {
        progressCallback({ phase: 'progress', source: subsetKey, downloaded, total: totalRows });
      }

      if (downloaded < totalRows) {
        await sleep(REQUEST_DELAY);
      }
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        console.warn(`Failed to download ${subsetKey} after multiple errors: ${err.message}`);
        break;
      }
      await sleep(RETRY_DELAYS[consecutiveErrors - 1] || 1000);
    }
  }

  writeStream.end();
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  if (progressCallback) {
    progressCallback({ phase: 'done', source: subsetKey, total: downloaded });
  }

  return { cachePath, count: downloaded };
}

/**
 * Load examples from a single subset
 */
async function loadSubset(sourceKey, subsetKey, options = {}) {
  const { forceDownload = false, progressCallback, offline = false } = options;

  ensureCacheDir();
  const cachePath = getCachePathForRead(sourceKey, subsetKey);

  // Offline mode: never attempt network; use cache if present (even if stale).
  if (offline === true) {
    if (!fs.existsSync(cachePath)) return [];
  }

  // Download if not cached (or stale)
  if (offline !== true && (forceDownload || !isCacheFresh(cachePath))) {
    await downloadSubset(sourceKey, subsetKey, progressCallback);
  }

  // Read and adapt
  if (!fs.existsSync(cachePath)) {
    return [];
  }

  const content = fs.readFileSync(cachePath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  const adapter = FORMAT_ADAPTERS[subsetKey] || ((row) => DEFAULT_ADAPTER(row, subsetKey));

  return lines.map(line => {
    try {
      const row = JSON.parse(line);
      return adapter(row);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Get list of all available subsets
 */
export function listAvailableSubsets() {
  const subsets = [];
  for (const [sourceKey, source] of Object.entries(DATASET_SOURCES)) {
    for (const [subsetKey, info] of Object.entries(source.subsets)) {
      subsets.push({
        key: subsetKey,
        sourceKey,
        config: info.config,
        approxSize: info.approxSize,
        category: FORMAT_ADAPTERS[subsetKey]
          ? FORMAT_ADAPTERS[subsetKey]({}).category
          : 'unknown'
      });
    }
  }
  return subsets;
}

/**
 * Load examples from multiple sources with random sampling
 *
 * @param options.uniform - If true, sample equally from each source
 */
export async function loadExamples(options = {}) {
  const {
    sources = null,  // null = all, or array of subset keys like ['folio', 'logiqa']
    limit = null,
    randomSeed = 42,
    forceDownload = false,
    offline = false,
    progressCallback = null,
    uniform = true  // Sample equally from each source
  } = options;

  // Determine which subsets to load
  let subsetsToLoad = [];

  if (sources === null) {
    // Load from all sources
    for (const [sourceKey, source] of Object.entries(DATASET_SOURCES)) {
      for (const subsetKey of Object.keys(source.subsets)) {
        subsetsToLoad.push({ sourceKey, subsetKey });
      }
    }
  } else {
    // Load specific sources
    for (const subsetKey of sources) {
      for (const [sourceKey, source] of Object.entries(DATASET_SOURCES)) {
        if (source.subsets[subsetKey]) {
          subsetsToLoad.push({ sourceKey, subsetKey });
          break;
        }
      }
    }
  }

  // Load all subsets
  const examplesBySource = {};
  const subsetCounts = {};
  let totalLoaded = 0;

  for (const { sourceKey, subsetKey } of subsetsToLoad) {
    if (progressCallback) {
      progressCallback({ phase: 'loading', source: subsetKey });
    }

    try {
      const examples = await loadSubset(sourceKey, subsetKey, {
        forceDownload,
        offline,
        progressCallback
      });

      examplesBySource[subsetKey] = examples;
      subsetCounts[subsetKey] = examples.length;
      totalLoaded += examples.length;
    } catch (err) {
      console.warn(`Failed to load ${subsetKey}: ${err.message}`);
      subsetCounts[subsetKey] = 0;
    }
  }

  const subsetsLoaded = Object.keys(subsetCounts).filter(k => subsetCounts[k] > 0);

  // If uniform sampling requested and limit specified
  let result;
  if (uniform && limit && subsetsLoaded.length > 1) {
    // Calculate how many to take from each source
    const perSource = Math.floor(limit / subsetsLoaded.length);
    const remainder = limit % subsetsLoaded.length;

    result = [];
    const sampledCounts = {};

    for (let i = 0; i < subsetsLoaded.length; i++) {
      const sourceKey = subsetsLoaded[i];
      const sourceExamples = examplesBySource[sourceKey] || [];

      // Take perSource + 1 for first 'remainder' sources
      const toTake = perSource + (i < remainder ? 1 : 0);
      const shuffled = seededShuffle(sourceExamples, randomSeed + i);
      const taken = shuffled.slice(0, Math.min(toTake, shuffled.length));

      sampledCounts[sourceKey] = taken.length;
      result.push(...taken);
    }

    // Final shuffle to mix sources
    result = seededShuffle(result, randomSeed);

    return {
      examples: result,
      totalLoaded,
      subsetCounts,
      sampledCounts,
      subsetsLoaded
    };
  } else {
    // Original behavior: shuffle all together
    const allExamples = [];
    for (const examples of Object.values(examplesBySource)) {
      allExamples.push(...examples);
    }

    const shuffled = seededShuffle(allExamples, randomSeed);
    result = limit ? shuffled.slice(0, limit) : shuffled;

    // Count samples per source
    const sampledCounts = {};
    for (const ex of result) {
      sampledCounts[ex.source] = (sampledCounts[ex.source] || 0) + 1;
    }

    return {
      examples: result,
      totalLoaded,
      subsetCounts,
      sampledCounts,
      subsetsLoaded
    };
  }
}

/**
 * Seeded shuffle using Fisher-Yates
 */
function seededShuffle(arr, seed) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Get cache status for all subsets
 */
export function getCacheStatus() {
  ensureCacheDir();

  const status = {};
  for (const [sourceKey, source] of Object.entries(DATASET_SOURCES)) {
    for (const subsetKey of Object.keys(source.subsets)) {
      const cachePath = getCachePath(sourceKey, subsetKey);
      if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const content = fs.readFileSync(cachePath, 'utf8');
        const lineCount = content.trim().split('\n').filter(Boolean).length;
        status[subsetKey] = {
          exists: true,
          size: stats.size,
          rows: lineCount,
          modified: stats.mtime,
          fresh: isCacheFresh(cachePath)
        };
      } else {
        status[subsetKey] = { exists: false };
      }
    }
  }

  return status;
}

/**
 * Clear cache
 */
export function clearCache() {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  }
}
