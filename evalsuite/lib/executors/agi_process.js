/**
 * AGIProcess - Spawn and manage AGISystem2 subprocess
 *
 * Launches AGI as a child process and communicates via stdio.
 * Used for FULL mode testing with LLM integration.
 *
 * @module evalsuite/lib/executors/agi_process
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const DEFAULT_TIMEOUT = 120000; // 2 minutes

/**
 * AGIProcess class
 * Manages AGISystem2 subprocess lifecycle
 */
class AGIProcess {
  /**
   * Create process manager
   * @param {Object} options - Process options
   * @param {number} [options.timeout] - Command timeout in ms
   * @param {boolean} [options.verbose] - Enable verbose logging
   * @param {string} [options.script] - Path to AGI script
   */
  constructor(options = {}) {
    this.options = options;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.process = null;
    this.rl = null;
    this.pendingResolve = null;
    this.responseBuffer = '';
    this.scriptPath = options.script || this._findScript();
  }

  /**
   * Find AGI script path
   * @private
   */
  _findScript() {
    const basePath = path.resolve(__dirname, '../../../..');
    return path.join(basePath, 'bin', 'AGISystem2.sh');
  }

  /**
   * Start AGI subprocess
   */
  async start() {
    return new Promise((resolve, reject) => {
      // Spawn AGI process
      this.process = spawn('bash', [this.scriptPath, '--chat'], {
        cwd: path.dirname(this.scriptPath),
        env: { ...process.env, FORCE_COLOR: '0' }
      });

      // Setup readline for stdout
      this.rl = readline.createInterface({
        input: this.process.stdout,
        terminal: false
      });

      // Handle output lines
      this.rl.on('line', (line) => {
        this.responseBuffer += line + '\n';

        // Check for response completion markers
        if (this._isResponseComplete(line)) {
          if (this.pendingResolve) {
            const response = this.responseBuffer.trim();
            this.responseBuffer = '';
            this.pendingResolve(response);
            this.pendingResolve = null;
          }
        }
      });

      // Handle stderr
      this.process.stderr.on('data', (data) => {
        if (this.options.verbose) {
          console.error(`AGI stderr: ${data}`);
        }
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        if (this.pendingResolve) {
          this.pendingResolve(this.responseBuffer.trim());
          this.pendingResolve = null;
        }
      });

      // Handle process error
      this.process.on('error', (err) => {
        reject(err);
      });

      // Wait for initial prompt
      setTimeout(() => {
        this.responseBuffer = '';
        resolve();
      }, 2000); // Give AGI time to initialize
    });
  }

  /**
   * Check if response is complete
   * @private
   */
  _isResponseComplete(line) {
    // Look for various completion markers
    const completionMarkers = [
      /^> ?$/,           // Empty prompt
      /^AGI> ?$/,        // AGI prompt
      /^\[.+\]$/,        // Status indicator
      /^Result:/,        // Result marker
      /^Error:/          // Error marker
    ];

    for (const marker of completionMarkers) {
      if (marker.test(line.trim())) {
        return true;
      }
    }

    // Also complete on JSON object end
    if (line.trim() === '}' || line.trim() === ']') {
      return true;
    }

    return false;
  }

  /**
   * Send input to AGI and get response
   * @param {string} input - Input text
   * @param {string} [queryId] - Optional query identifier
   * @returns {Promise<string>} Response text
   */
  async send(input, queryId = null) {
    if (!this.process) {
      throw new Error('AGI process not started');
    }

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve(this.responseBuffer.trim() || '[TIMEOUT]');
          this.pendingResolve = null;
        }
      }, this.timeout);

      // Store resolve function
      this.pendingResolve = (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      };

      // Send input
      this.process.stdin.write(input + '\n');
    });
  }

  /**
   * Stop AGI subprocess
   */
  async stop() {
    if (this.process) {
      // Try graceful shutdown
      try {
        this.process.stdin.write('exit\n');
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        // Ignore errors during shutdown
      }

      // Force kill if still running
      if (!this.process.killed) {
        this.process.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }

      this.process = null;
    }

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

module.exports = AGIProcess;
