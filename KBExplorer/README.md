# KBExplorer (AGISystem2)

Local, zero-dependency HTTP + HTML UI for interacting with an in-memory `Session`.

## Run

From the repo root:

```bash
node KBExplorer/server/index.mjs
```

Or:

```bash
npm run runserver
```

Then open:

- `http://127.0.0.1:3311/`

## Restart prompt

When started in a TTY, the server shows a prompt:

- type `y` and press Enter to restart the HTTP server (drops in-memory sessions).

## Environment

- `KBEXPLORER_PORT` or `PORT`: server port (default `3311`)
- `HOST`: bind host (default `127.0.0.1`)
- `KBEXPLORER_ALLOW_FILE_OPS=1`: allow DSL `Load`/`Unload` (disabled by default)

## Notes

- The UI reads `.sys2` files in the browser and sends their text to the server (no multipart upload required).
- Each page load creates a new server session universe; session IDs are not persisted across refresh/new tabs.
- The selected `hdcStrategy` and `reasoningPriority` are saved in `localStorage` and re-applied on the next load.
