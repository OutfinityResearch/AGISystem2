import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUTO_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = join(AUTO_DIR, '..', '..');
export const CONFIG_ROOT = join(ROOT_DIR, 'config');

export const ANALYSED_FILE = join(ROOT_DIR, 'autoDiscovery', 'analised.md');
export const QUARANTINE_DIR = join(ROOT_DIR, 'autoDiscovery', 'quarantine');
export const BUG_CASES_DIR = join(ROOT_DIR, 'autoDiscovery', 'bugCases');
export const NLP_BUGS_DIR = join(ROOT_DIR, 'autoDiscovery', 'nlpBugs');

export const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

export const DEFAULT_WORKERS = 5;
export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_STRATEGY = 'dense-binary';
export const DEFAULT_GEOMETRY = 256;

export const CATEGORY = {
  PASSED: null,
  TRANSLATION: 'A',
  REASONING: 'B',
  UNKNOWN: 'U',
  UNSUPPORTED: 'S',
  NO_EXPECTATION: 'N',
  LEARN_FAILED: 'L',
  INVALID_GOAL: 'G'
};
