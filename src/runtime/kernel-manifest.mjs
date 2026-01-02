import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function defaultCoreDir() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '../../config/Packs/Kernel');
}

export function getKernelRootDir() {
  return defaultCoreDir();
}

export function parseCoreIndexLoads(indexContent) {
  const loads = [];
  const seen = new Set();
  const lines = String(indexContent || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@_')) continue;
    // Syntax used in Core manifests: @_ Load "./00-types.sys2"
    const m = trimmed.match(/^@_\s+Load\s+(['"])(.+?)\1\s*$/);
    if (!m) continue;
    let p = m[2] || '';
    p = p.replace(/^\.\//, '').trim();
    if (!p.endsWith('.sys2')) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    loads.push(p);
  }
  return loads;
}

export function getKernelManifestEntries({ coreDir = defaultCoreDir() } = {}) {
  const indexPath = join(coreDir, 'index.sys2');
  if (!existsSync(indexPath)) return [];
  const content = readFileSync(indexPath, 'utf8');
  return parseCoreIndexLoads(content);
}

export function resolveKernelFilePath(relativeFile, { coreDir = defaultCoreDir() } = {}) {
  if (!relativeFile || typeof relativeFile !== 'string') return null;

  const direct = join(coreDir, relativeFile);
  if (existsSync(direct)) return direct;

  // Support resolving by manifest entry name as a convenience.
  const entries = getKernelManifestEntries({ coreDir });
  const wanted = String(relativeFile);
  const match = entries.find((e) => e === wanted || e.endsWith(`/${wanted}`) || e.endsWith(`\\${wanted}`));
  if (!match) return null;
  const resolved = join(coreDir, match);
  if (existsSync(resolved)) return resolved;
  return null;
}

export function readKernelFile(relativeFile, { coreDir = defaultCoreDir() } = {}) {
  const p = resolveKernelFilePath(relativeFile, { coreDir });
  if (!p) return null;
  return readFileSync(p, 'utf8');
}
