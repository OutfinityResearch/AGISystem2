/**
 * RuleTaker Dataset Loader
 *
 * Downloads and caches the RuleTaker dataset from HuggingFace.
 * Uses the HuggingFace datasets API to fetch data in JSON format.
 */

import fs from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = '/tmp/ruletaker';
const HF_API_URL = 'https://datasets-server.huggingface.co/rows';
const DATASET_NAME = 'tasksource/ruletaker';

// Max rows per API request (smaller to avoid rate limits)
const ROWS_PER_REQUEST = 100;
const RETRY_DELAYS = [1000, 2000, 5000, 10000]; // Exponential backoff delays
const REQUEST_DELAY = 100; // Delay between requests in ms

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get cache file path for a split
 */
function getCachePath(split) {
  return join(CACHE_DIR, `${split}.jsonl`);
}

/**
 * Check if cache is fresh (less than maxAgeHours old)
 */
function isCacheFresh(cachePath, maxAgeHours = 24 * 7) {
  if (!fs.existsSync(cachePath)) return false;

  const stats = fs.statSync(cachePath);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours < maxAgeHours;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch rows from HuggingFace API with retry logic
 */
async function fetchRows(split, offset, length) {
  const url = new URL(HF_API_URL);
  url.searchParams.set('dataset', DATASET_NAME);
  url.searchParams.set('config', 'default');
  url.searchParams.set('split', split);
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('length', length.toString());

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(url.toString());

      if (response.status === 429) {
        // Rate limited - wait and retry
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
 * Get total number of rows in a split
 */
async function getSplitSize(split) {
  const url = new URL('https://datasets-server.huggingface.co/size');
  url.searchParams.set('dataset', DATASET_NAME);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const splitInfo = data.size.splits.find(s => s.split === split);

  if (!splitInfo) {
    throw new Error(`Split '${split}' not found in dataset`);
  }

  return splitInfo.num_rows;
}

/**
 * Download entire split and cache as JSONL
 */
async function downloadSplit(split, progressCallback) {
  ensureCacheDir();

  const cachePath = getCachePath(split);
  const totalRows = await getSplitSize(split);

  if (progressCallback) {
    progressCallback({ phase: 'start', total: totalRows, split });
  }

  const writeStream = fs.createWriteStream(cachePath);
  let downloaded = 0;

  while (downloaded < totalRows) {
    const batchSize = Math.min(ROWS_PER_REQUEST, totalRows - downloaded);
    const rows = await fetchRows(split, downloaded, batchSize);

    for (const row of rows) {
      writeStream.write(JSON.stringify(row) + '\n');
    }

    downloaded += rows.length;

    if (progressCallback) {
      progressCallback({ phase: 'progress', downloaded, total: totalRows, split });
    }

    // Small delay between requests to avoid rate limiting
    if (downloaded < totalRows) {
      await sleep(REQUEST_DELAY);
    }
  }

  writeStream.end();

  // Wait for write to complete
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  if (progressCallback) {
    progressCallback({ phase: 'done', total: totalRows, split });
  }

  return cachePath;
}

/**
 * Ensure dataset is available (download if needed)
 */
export async function ensureDataset(split = 'test', options = {}) {
  const { forceDownload = false, progressCallback } = options;

  ensureCacheDir();
  const cachePath = getCachePath(split);

  if (!forceDownload && isCacheFresh(cachePath)) {
    return cachePath;
  }

  return await downloadSplit(split, progressCallback);
}

/**
 * Load examples - use cache if available, otherwise fetch from API
 */
export async function loadExamples(split = 'test', options = {}) {
  const { limit, depthFilter, randomSeed = 42, forceDownload = false, progressCallback } = options;

  ensureCacheDir();
  const cachePath = getCachePath(split);

  // Check if we have a fresh cache - use it directly without any API calls
  if (!forceDownload && isCacheFresh(cachePath)) {
    // Read from cache (fast path - no network)
    const content = fs.readFileSync(cachePath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    let examples = lines.map(line => JSON.parse(line));

    // Filter by depth if requested
    if (depthFilter !== undefined) {
      examples = examples.filter(ex => extractDepth(ex.config) === depthFilter);
    }

    // Sample if limit specified
    if (limit && limit < examples.length) {
      examples = sampleArray(examples, limit, randomSeed);
    }

    return examples;
  }

  // No cache available - for small samples, fetch directly from API
  // This avoids downloading the full dataset just for a quick test
  if (limit && limit <= 1000 && !forceDownload) {
    return await loadExamplesDirectly(split, { limit, depthFilter, randomSeed, progressCallback });
  }

  // For larger requests or when cache is stale, download full dataset
  const downloadedPath = await ensureDataset(split, { forceDownload, progressCallback });

  // Read all lines
  const content = fs.readFileSync(downloadedPath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  let examples = lines.map(line => JSON.parse(line));

  // Filter by depth if requested
  if (depthFilter !== undefined) {
    examples = examples.filter(ex => extractDepth(ex.config) === depthFilter);
  }

  // Sample if limit specified
  if (limit && limit < examples.length) {
    examples = sampleArray(examples, limit, randomSeed);
  }

  return examples;
}

/**
 * Load examples directly from API (for small samples)
 */
async function loadExamplesDirectly(split, options) {
  const { limit, depthFilter, randomSeed = 42, progressCallback } = options;

  const targetCount = limit || 100;

  // Get total size for random sampling
  const totalRows = await getSplitSize(split);

  if (progressCallback) {
    progressCallback({ phase: 'start', total: targetCount, split });
  }

  const examples = [];
  const seenOffsets = new Set();

  // Generate random offsets for sampling
  let state = randomSeed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  // Fetch examples until we have enough
  let attempts = 0;
  const maxAttempts = targetCount * 3; // Allow some failures

  while (examples.length < targetCount && attempts < maxAttempts) {
    attempts++;

    // Pick a random offset
    const offset = Math.floor(random() * totalRows);

    // Skip if we've seen this offset
    if (seenOffsets.has(offset)) continue;
    seenOffsets.add(offset);

    try {
      // Fetch a small batch starting from this offset
      const batchSize = Math.min(10, targetCount - examples.length);
      const rows = await fetchRows(split, offset, batchSize);

      for (const row of rows) {
        if (examples.length >= targetCount) break;

        // Filter by depth if needed
        if (depthFilter !== undefined && extractDepth(row.config) !== depthFilter) {
          continue;
        }

        examples.push(row);
      }

      if (progressCallback) {
        progressCallback({ phase: 'progress', downloaded: examples.length, total: targetCount, split });
      }

      // Small delay to avoid rate limiting
      await sleep(REQUEST_DELAY);
    } catch (err) {
      // Skip failed fetches, will try different offset
      continue;
    }
  }

  if (progressCallback) {
    progressCallback({ phase: 'done', total: examples.length, split });
  }

  return examples;
}

/**
 * Extract proof depth from config field
 * Input: "depth-3" -> 3
 */
export function extractDepth(config) {
  if (!config) return 0;
  const match = config.match(/depth-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Seeded random sampling
 */
function sampleArray(arr, n, seed) {
  // Simple seeded random using LCG
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  // Fisher-Yates shuffle (partial)
  const result = [...arr];
  for (let i = 0; i < Math.min(n, result.length); i++) {
    const j = i + Math.floor(random() * (result.length - i));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, n);
}

/**
 * Get available splits
 */
export function getAvailableSplits() {
  return ['train', 'dev', 'test'];
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  ensureCacheDir();

  const status = {};
  for (const split of getAvailableSplits()) {
    const cachePath = getCachePath(split);
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      status[split] = {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        fresh: isCacheFresh(cachePath)
      };
    } else {
      status[split] = { exists: false };
    }
  }

  return status;
}
