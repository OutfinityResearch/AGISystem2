#!/usr/bin/env node

/**
 * Build binary theory layer files from JSON descriptions.
 *
 * JSON schema (layer):
 * {
 *   "kind": "layer",
 *   "id": "Law_Minimal",
 *   "dimensions": 1024,
 *   "overrides": [
 *     { "dim": 256, "min": -127, "max": 0 },
 *     { "dim": 280, "min": 0, "max": 127 }
 *   ]
 * }
 *
 * Binary layout (per file):
 *   - 4 bytes magic: 'A','G','T','L'
 *   - 1 byte version: 1
 *   - 3 bytes reserved: 0
 *   - 4 bytes dimensions (uint32 LE)
 *   - 4 bytes idLength (uint32 LE)
 *   - idLength bytes UTF‑8 id string
 *   - maskBytes = ceil(dim / 8)
 *   - mask: maskBytes bytes (Uint8)
 *   - overrideMin: dim bytes (Int8)
 *   - overrideMax: dim bytes (Int8)
 *   - overrideRadius: 2 bytes (Int16 LE), currently 0
 *
 * This script is deterministic: the same JSON and dimensions always produce
 * the same binary output.
 */

const fs = require('fs');
const path = require('path');

function buildLayer(jsonPath, outPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const spec = JSON.parse(raw);

  if (spec.kind !== 'layer') {
    throw new Error(`Unsupported theory kind '${spec.kind}' in ${jsonPath}. Only 'layer' is supported.`);
  }

  const id = String(spec.id || '');
  const dims = spec.dimensions;
  if (!Number.isInteger(dims) || dims <= 0) {
    throw new Error(`Invalid dimensions in ${jsonPath}: ${dims}`);
  }

  const overrides = Array.isArray(spec.overrides) ? spec.overrides : [];
  const maskBytes = Math.ceil(dims / 8);
  const mask = Buffer.alloc(maskBytes, 0);
  const overrideMin = Buffer.alloc(dims, 0);
  const overrideMax = Buffer.alloc(dims, 0);

  for (const ov of overrides) {
    const dim = ov.dim;
    if (!Number.isInteger(dim) || dim < 0 || dim >= dims) {
      throw new Error(`Override dimension ${dim} out of range for ${dims} in ${jsonPath}`);
    }
    const min = ov.min;
    const max = ov.max;
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error(`Override for dim ${dim} in ${jsonPath} must have integer min/max`);
    }
    if (min < -127 || min > 127 || max < -127 || max > 127) {
      throw new Error(`Override for dim ${dim} in ${jsonPath} has min/max outside [-127,127]`);
    }
    // set mask bit
    const byteIndex = Math.floor(dim / 8);
    const bitIndex = dim % 8;
    mask[byteIndex] |= (1 << bitIndex);
    // set override vectors
    overrideMin.writeInt8(min, dim);
    overrideMax.writeInt8(max, dim);
  }

  const idBuf = Buffer.from(id, 'utf8');
  const headerSize = 4 + 1 + 3 + 4 + 4 + idBuf.length;
  const bodySize = maskBytes + dims + dims + 2;
  const totalSize = headerSize + bodySize;
  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // Magic 'AGTL'
  buf.write('AGTL', offset, 4, 'ascii');
  offset += 4;
  // version
  buf.writeUInt8(1, offset);
  offset += 1;
  // reserved
  buf.writeUInt8(0, offset++);
  buf.writeUInt8(0, offset++);
  buf.writeUInt8(0, offset++);
  // dimensions
  buf.writeUInt32LE(dims, offset);
  offset += 4;
  // id length + id bytes
  buf.writeUInt32LE(idBuf.length, offset);
  offset += 4;
  idBuf.copy(buf, offset);
  offset += idBuf.length;

  // mask
  mask.copy(buf, offset);
  offset += maskBytes;
  // overrideMin and overrideMax
  overrideMin.copy(buf, offset);
  offset += dims;
  overrideMax.copy(buf, offset);
  offset += dims;
  // overrideRadius (Int16 LE), currently 0
  buf.writeInt16LE(0, offset);
  offset += 2;

  if (offset !== totalSize) {
    throw new Error(`Internal size mismatch: wrote ${offset} bytes, expected ${totalSize}`);
  }

  fs.writeFileSync(outPath, buf);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/build_theories.js <theory.json> [more.json...]');
    process.exit(1);
  }

  for (const jsonPath of args) {
    const abs = path.resolve(jsonPath);
    const dir = path.dirname(abs);
    const base = path.basename(abs, path.extname(abs));
    const outPath = path.join(dir, `${base}.bin`);
    try {
      buildLayer(abs, outPath);
      console.log(`Built ${outPath} from ${jsonPath}`);
    } catch (err) {
      console.error(`Error building ${jsonPath}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  main();
}

