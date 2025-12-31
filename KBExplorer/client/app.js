import { bootstrap } from './app/main.js';

bootstrap().catch((error) => {
  const msg = error?.message || String(error);
  const fallback = `KBExplorer failed to start: ${msg}`;
  try {
    const chat = document.getElementById('chat');
    if (chat) chat.textContent = fallback;
    else document.body.textContent = fallback;
  } catch {
    // ignore
  }
  // Also log to console for debugging.
  // eslint-disable-next-line no-console
  console.error(error);
});

