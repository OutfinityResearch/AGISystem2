import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKernelManifestEntries, getKernelRootDir, parseCoreIndexLoads } from './kernel-manifest.mjs';

const OPERATOR_DECL_RE =
  /^@([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?\s+(graph|macro|__Relation|__TransitiveRelation|__SymmetricRelation|__ReflexiveRelation|__InheritableProperty)\b/;

const GRAPH_HEADER_RE = /^@([A-Za-z0-9_]+)(?::([A-Za-z0-9_]+))?\s+(graph|macro)\b(.*)$/;

function collectCoreOperators() {
  const operators = new Set();
  const kernelDir = getKernelRootDir();
  if (!existsSync(kernelDir)) return operators;

  const manifest = getKernelManifestEntries({ coreDir: kernelDir });
  const files = manifest.length
    ? manifest.map(f => join(kernelDir, f))
    : readdirSync(kernelDir)
      .filter(f => f.endsWith('.sys2') && !f.endsWith('.errors') && f !== 'index.sys2')
      .map(f => join(kernelDir, f));

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(OPERATOR_DECL_RE);
      if (!match) continue;
      const [, name, persist] = match;
      if (name) operators.add(name);
      if (persist) operators.add(persist);
    }
  }

  return operators;
}

export const CORE_OPERATOR_CATALOG = collectCoreOperators();

function collectPackFilePaths(packDir) {
  if (!existsSync(packDir)) return [];
  const indexPath = join(packDir, 'index.sys2');
  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, 'utf8');
    const entries = parseCoreIndexLoads(content);
    if (entries.length > 0) return entries.map(e => join(packDir, e));
  }
  return readdirSync(packDir)
    .filter(f => f.endsWith('.sys2') && !f.endsWith('.errors') && f !== 'index.sys2')
    .map(f => join(packDir, f));
}

function collectDefaultTheoryFilePaths() {
  const kernelDir = getKernelRootDir();
  if (!existsSync(kernelDir)) return [];

  const files = [];
  const seen = new Set();

  const coreManifest = getKernelManifestEntries({ coreDir: kernelDir });
  const coreFiles = coreManifest.length
    ? coreManifest.map(f => join(kernelDir, f))
    : readdirSync(kernelDir)
      .filter(f => f.endsWith('.sys2') && !f.endsWith('.errors') && f !== 'index.sys2')
      .map(f => join(kernelDir, f));

  for (const p of coreFiles) {
    if (!seen.has(p)) {
      seen.add(p);
      files.push(p);
    }
  }

  // Translator convenience: include opt-in eval/test vocabulary when present.
  const testsAndEvalsDir = join(kernelDir, '..', 'tests_and_evals');
  for (const p of collectPackFilePaths(testsAndEvalsDir)) {
    if (!seen.has(p)) {
      seen.add(p);
      files.push(p);
    }
  }

  return files;
}

function collectOperatorsFromFiles(files) {
  const operators = new Set();
  for (const filePath of files) {
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(OPERATOR_DECL_RE);
      if (!match) continue;
      const [, name, persist] = match;
      if (name) operators.add(name);
      if (persist) operators.add(persist);
    }
  }
  return operators;
}

export const DEFAULT_OPERATOR_CATALOG = collectOperatorsFromFiles(collectDefaultTheoryFilePaths());

function normalizeOperatorKind(kind) {
  if (!kind) return null;
  if (kind === 'graph' || kind === 'macro') return 'graph';
  if (kind === '__Relation') return 'relation';
  if (kind === '__TransitiveRelation') return 'relation';
  if (kind === '__SymmetricRelation') return 'relation';
  if (kind === '__ReflexiveRelation') return 'relation';
  if (kind === '__InheritableProperty') return 'relation';
  return null;
}

function collectCoreOperatorKinds() {
  const kinds = new Map(); // operator -> 'graph'|'relation'
  const kernelDir = getKernelRootDir();
  if (!existsSync(kernelDir)) return kinds;

  const manifest = getKernelManifestEntries({ coreDir: kernelDir });
  const files = manifest.length
    ? manifest.map(f => join(kernelDir, f))
    : readdirSync(kernelDir)
      .filter(f => f.endsWith('.sys2') && !f.endsWith('.errors') && f !== 'index.sys2')
      .map(f => join(kernelDir, f));

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(OPERATOR_DECL_RE);
      if (!match) continue;
      const [, name, persist, rawKind] = match;
      const kind = normalizeOperatorKind(rawKind);
      if (!kind) continue;

      // Prefer relation over graph if both appear (defensive).
      const setKind = (op) => {
        if (!op) return;
        const existing = kinds.get(op);
        if (!existing) kinds.set(op, kind);
        else if (existing !== kind && kind === 'relation') kinds.set(op, kind);
      };

      setKind(name);
      setKind(persist);
    }
  }

  return kinds;
}

export const CORE_OPERATOR_KIND = collectCoreOperatorKinds();

function collectOperatorKindsFromFiles(files) {
  const kinds = new Map();
  for (const filePath of files) {
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(OPERATOR_DECL_RE);
      if (!match) continue;
      const [, name, persist, rawKind] = match;
      const kind = normalizeOperatorKind(rawKind);
      if (!kind) continue;

      const setKind = (op) => {
        if (!op) return;
        const existing = kinds.get(op);
        if (!existing) kinds.set(op, kind);
        else if (existing !== kind && kind === 'relation') kinds.set(op, kind);
      };
      setKind(name);
      setKind(persist);
    }
  }
  return kinds;
}

export const DEFAULT_OPERATOR_KIND = collectOperatorKindsFromFiles(collectDefaultTheoryFilePaths());

function collectCoreGraphArities() {
  const arities = new Map();
  const kernelDir = getKernelRootDir();
  if (!existsSync(kernelDir)) return arities;

  const manifest = getKernelManifestEntries({ coreDir: kernelDir });
  const files = manifest.length
    ? manifest.map(f => join(kernelDir, f))
    : readdirSync(kernelDir)
      .filter(f => f.endsWith('.sys2') && !f.endsWith('.errors') && f !== 'index.sys2')
      .map(f => join(kernelDir, f));

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(GRAPH_HEADER_RE);
      if (!match) continue;
      const [, name, persist, , rest] = match;
      const invokable = persist || name;
      const params = String(rest || '').trim().split(/\s+/).filter(Boolean);
      if (params.length === 0) continue;
      arities.set(invokable, params.length);
    }
  }

  return arities;
}

export const CORE_GRAPH_ARITY = collectCoreGraphArities();

function collectGraphAritiesFromFiles(files) {
  const arities = new Map();
  for (const filePath of files) {
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(GRAPH_HEADER_RE);
      if (!match) continue;
      const [, name, persist, , rest] = match;
      const invokable = persist || name;
      const params = String(rest || '').trim().split(/\s+/).filter(Boolean);
      if (params.length === 0) continue;
      arities.set(invokable, params.length);
    }
  }
  return arities;
}

export const DEFAULT_GRAPH_ARITY = collectGraphAritiesFromFiles(collectDefaultTheoryFilePaths());
