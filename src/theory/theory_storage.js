/**
 * DS(/theory/theory_storage.js) - Pluggable Theory Storage
 *
 * Provides a pluggable storage interface for theories.
 * Default implementation uses file system.
 * Can be replaced with database, cloud storage, etc.
 *
 * Usage:
 *   // Use default file storage
 *   const storage = new TheoryStorage();
 *
 *   // Use custom storage adapter
 *   const storage = new TheoryStorage({
 *     adapter: new MyCustomAdapter()
 *   });
 *
 * @module theory/theory_storage
 */

const fs = require('fs');
const path = require('path');

/**
 * File-based storage adapter (default)
 */
class FileStorageAdapter {
  /**
   * @param {Object} options
   * @param {string} [options.theoriesDir] - Directory for theory files
   */
  constructor(options = {}) {
    const projectRoot = path.resolve(__dirname, '..', '..');
    this.theoriesDir = options.theoriesDir ||
      path.join(projectRoot, 'data', 'theories');

    // Ensure directory exists
    if (!fs.existsSync(this.theoriesDir)) {
      fs.mkdirSync(this.theoriesDir, { recursive: true });
    }
  }

  /**
   * List available theories
   * @returns {string[]} Theory IDs
   */
  list() {
    try {
      const files = fs.readdirSync(this.theoriesDir);
      return files
        .filter(f => f.endsWith('.sys2dsl') || f.endsWith('.theory.json'))
        .map(f => f.replace(/\.(sys2dsl|theory\.json)$/, ''));
    } catch (e) {
      return [];
    }
  }

  /**
   * Check if theory exists
   * @param {string} theoryId
   * @returns {boolean}
   */
  exists(theoryId) {
    const dslPath = path.join(this.theoriesDir, `${theoryId}.sys2dsl`);
    const jsonPath = path.join(this.theoriesDir, `${theoryId}.theory.json`);
    return fs.existsSync(dslPath) || fs.existsSync(jsonPath);
  }

  /**
   * Load theory content
   * @param {string} theoryId
   * @returns {{content: string, format: string, metadata: Object}|null}
   */
  load(theoryId) {
    // Try DSL format first
    const dslPath = path.join(this.theoriesDir, `${theoryId}.sys2dsl`);
    if (fs.existsSync(dslPath)) {
      const content = fs.readFileSync(dslPath, 'utf8');
      const metadata = this._extractMetadata(content);
      return { content, format: 'dsl', metadata };
    }

    // Try JSON format
    const jsonPath = path.join(this.theoriesDir, `${theoryId}.theory.json`);
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(raw);
      return {
        content: data.facts || [],
        format: 'json',
        metadata: data.metadata || {}
      };
    }

    return null;
  }

  /**
   * Save theory content
   * @param {string} theoryId
   * @param {Object} data
   * @param {string|Array} data.content - DSL text or facts array
   * @param {string} [data.format='dsl'] - 'dsl' or 'json'
   * @param {Object} [data.metadata] - Theory metadata
   * @returns {boolean}
   */
  save(theoryId, data) {
    try {
      const format = data.format || 'dsl';

      if (format === 'dsl') {
        const filePath = path.join(this.theoriesDir, `${theoryId}.sys2dsl`);
        let content = data.content;

        // Add metadata header if provided
        if (data.metadata) {
          const header = this._buildMetadataHeader(data.metadata);
          content = header + '\n' + content;
        }

        fs.writeFileSync(filePath, content);
      } else {
        const filePath = path.join(this.theoriesDir, `${theoryId}.theory.json`);
        const jsonData = {
          id: theoryId,
          metadata: data.metadata || {},
          facts: Array.isArray(data.content) ? data.content : [],
          savedAt: new Date().toISOString()
        };
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      }

      return true;
    } catch (e) {
      console.error(`TheoryStorage: Failed to save ${theoryId}: ${e.message}`);
      return false;
    }
  }

  /**
   * Delete a theory
   * @param {string} theoryId
   * @returns {boolean}
   */
  delete(theoryId) {
    let deleted = false;

    const dslPath = path.join(this.theoriesDir, `${theoryId}.sys2dsl`);
    if (fs.existsSync(dslPath)) {
      fs.unlinkSync(dslPath);
      deleted = true;
    }

    const jsonPath = path.join(this.theoriesDir, `${theoryId}.theory.json`);
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
      deleted = true;
    }

    return deleted;
  }

  /**
   * Extract metadata from DSL header comments
   * @private
   */
  _extractMetadata(content) {
    const metadata = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Stop at first non-comment, non-empty line
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        break;
      }

      // Parse # @key: value format
      const match = trimmed.match(/^#\s*@(\w+):\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2].trim();
      }
    }

    return metadata;
  }

  /**
   * Build metadata header for DSL file
   * @private
   */
  _buildMetadataHeader(metadata) {
    const lines = ['# ============================================================================='];

    if (metadata.name) {
      lines.push(`# ${metadata.name}`);
    }

    lines.push('# =============================================================================');

    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'name') {
        lines.push(`# @${key}: ${value}`);
      }
    }

    lines.push('# =============================================================================');
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * In-memory storage adapter (for testing)
 */
class MemoryStorageAdapter {
  constructor() {
    this.theories = new Map();
  }

  list() {
    return Array.from(this.theories.keys());
  }

  exists(theoryId) {
    return this.theories.has(theoryId);
  }

  load(theoryId) {
    return this.theories.get(theoryId) || null;
  }

  save(theoryId, data) {
    this.theories.set(theoryId, {
      content: data.content,
      format: data.format || 'dsl',
      metadata: data.metadata || {}
    });
    return true;
  }

  delete(theoryId) {
    return this.theories.delete(theoryId);
  }

  clear() {
    this.theories.clear();
  }
}

/**
 * Main TheoryStorage class - facade over adapters
 */
class TheoryStorage {
  /**
   * @param {Object} options
   * @param {Object} [options.adapter] - Storage adapter instance
   * @param {string} [options.theoriesDir] - For file adapter
   */
  constructor(options = {}) {
    if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      this.adapter = new FileStorageAdapter({
        theoriesDir: options.theoriesDir
      });
    }
  }

  /**
   * List available theories
   * @returns {string[]}
   */
  listTheories() {
    return this.adapter.list();
  }

  /**
   * Check if theory exists
   * @param {string} theoryId
   * @returns {boolean}
   */
  theoryExists(theoryId) {
    return this.adapter.exists(theoryId);
  }

  /**
   * Load theory content and metadata
   * @param {string} theoryId
   * @returns {{content: string|Array, format: string, metadata: Object}|null}
   */
  loadTheory(theoryId) {
    return this.adapter.load(theoryId);
  }

  /**
   * Load theory as DSL lines (for execution)
   * @param {string} theoryId
   * @returns {string[]|null}
   */
  loadTheoryLines(theoryId) {
    const data = this.adapter.load(theoryId);
    if (!data) return null;

    if (data.format === 'dsl') {
      return data.content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
    }

    // Convert JSON facts to DSL lines
    if (Array.isArray(data.content)) {
      return data.content.map((f, i) =>
        `@f${String(i + 1).padStart(3, '0')} ASSERT ${f.subject} ${f.relation} ${f.object}`
      );
    }

    return null;
  }

  /**
   * Save theory
   * @param {string} theoryId
   * @param {string|string[]} content - DSL text or lines
   * @param {Object} [metadata] - Theory metadata
   * @returns {boolean}
   */
  saveTheory(theoryId, content, metadata = {}) {
    const contentStr = Array.isArray(content) ? content.join('\n') : content;
    return this.adapter.save(theoryId, {
      content: contentStr,
      format: 'dsl',
      metadata
    });
  }

  /**
   * Save theory as structured facts
   * @param {string} theoryId
   * @param {Array} facts - Array of {subject, relation, object}
   * @param {Object} [metadata]
   * @returns {boolean}
   */
  saveTheoryFacts(theoryId, facts, metadata = {}) {
    return this.adapter.save(theoryId, {
      content: facts,
      format: 'json',
      metadata
    });
  }

  /**
   * Delete a theory
   * @param {string} theoryId
   * @returns {boolean}
   */
  deleteTheory(theoryId) {
    return this.adapter.delete(theoryId);
  }
}

// Export classes
TheoryStorage.FileStorageAdapter = FileStorageAdapter;
TheoryStorage.MemoryStorageAdapter = MemoryStorageAdapter;

module.exports = TheoryStorage;
