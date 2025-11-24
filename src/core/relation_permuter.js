const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class RelationPermuter {
  constructor(dimensions, seed) {
    this.dimensions = dimensions;
    this.seed = seed;
    this._tables = new Map();
    this._inverseTables = new Map();
  }

  bootstrapDefaults(relationsPath) {
    const fullPath = relationsPath || path.join(process.cwd(), 'data', 'init', 'relations.json');
    const raw = fs.readFileSync(fullPath, 'utf8');
    const spec = JSON.parse(raw);
    const relations = spec.relations || [];
    for (const rel of relations) {
      const name = rel.name;
      const inverse = rel.inverse;
      if (rel.symmetric) {
        const table = this._buildPermutation(name);
        this._tables.set(name, table);
        this._inverseTables.set(name, this._buildInverse(table));
        if (inverse && inverse === name) {
          continue;
        }
      }
      if (inverse && !this._tables.has(name) && !this._tables.has(inverse)) {
        const forward = this._buildPermutation(name);
        const backward = this._buildPermutation(inverse);
        this._tables.set(name, forward);
        this._tables.set(inverse, backward);
        this._inverseTables.set(name, this._buildInverse(forward));
        this._inverseTables.set(inverse, this._buildInverse(backward));
      } else if (!this._tables.has(name)) {
        const table = this._buildPermutation(name);
        this._tables.set(name, table);
        this._inverseTables.set(name, this._buildInverse(table));
      }
    }
  }

  getPermutation(name) {
    const table = this._tables.get(name);
    if (!table) {
      throw new Error(`No permutation registered for relation '${name}'`);
    }
    return table;
  }

  getInversePermutation(name) {
    const table = this._inverseTables.get(name);
    if (!table) {
      throw new Error(`No inverse permutation registered for relation '${name}'`);
    }
    return table;
  }

  _buildPermutation(name) {
    const dims = this.dimensions;
    const indices = new Array(dims);
    for (let i = 0; i < dims; i += 1) {
      indices[i] = i;
    }
    const hash = crypto.createHash('sha256');
    hash.update(String(this.seed));
    hash.update(':');
    hash.update(name);
    const digest = hash.digest();
    let position = 0;
    for (let i = dims - 1; i > 0; i -= 1) {
      const byte = digest[position % digest.length];
      position += 1;
      const j = byte % (i + 1);
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    return indices;
  }

  _buildInverse(table) {
    const dims = table.length;
    const inverse = new Array(dims);
    for (let i = 0; i < dims; i += 1) {
      const target = table[i];
      inverse[target] = i;
    }
    return inverse;
  }
}

module.exports = RelationPermuter;

