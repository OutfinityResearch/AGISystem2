import { createKBExplorerServer } from './server.mjs';
import readline from 'node:readline';

const port = Number(process.env.PORT || process.env.KBEXPLORER_PORT || 3311);
const host = process.env.HOST || '127.0.0.1';

let current = null;

async function startServer() {
  current = createKBExplorerServer();
  const { server } = current;

  server.on('error', (err) => {
    console.error(`KBExplorer server error: ${err?.message || String(err)}`);
    process.exitCode = 1;
  });

  await new Promise((resolve) => server.listen(port, host, resolve));

  // English output required by repo instructions.
  console.log(`KBExplorer running at http://${host}:${port}/`);
  console.log(`Set KBEXPLORER_ALLOW_FILE_OPS=0 to disable DSL Load/Unload.`);
}

async function stopServer() {
  if (!current) return;
  try {
    await current.close();
  } finally {
    current = null;
  }
}

async function restartServer() {
  console.log('Restart requested. Restarting server...');
  await stopServer();
  await startServer();
  console.log('Restart complete.');
}

await startServer();

if (process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt('restart (type "y" + Enter to restart)> ');
  rl.prompt();

  rl.on('line', async (line) => {
    const v = String(line || '').trim().toLowerCase();
    if (v === 'y') {
      try {
        await restartServer();
      } catch (e) {
        console.error(`Restart failed: ${e?.message || String(e)}`);
      }
    }
    rl.prompt();
  });
}
