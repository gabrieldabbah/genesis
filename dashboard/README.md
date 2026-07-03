# Genesis Dashboard (optional)

A local **PWA** that lets you set up and watch a genesis build *outside* Claude Code — see what stage it's in,
what it's doing now, what's done, and connect services (Stripe, a database, …) with a button while the AI
writes the code. Aimed at less-advanced users; if you're happy in the terminal you don't need it.

It is **dependency-free** (Node's built-ins only) and runs on `127.0.0.1` — nothing is exposed to the network.

## Run it

```bash
node "$CLAUDE_PLUGIN_ROOT/dashboard/server.mjs"      # from your project folder
# or just ask Claude: "open the genesis dashboard"  (the genesis-dashboard skill launches it)
```

It prints a `http://127.0.0.1:<port>/?token=…` URL. Open it (or "Install app" for the PWA). The token gates the
local API so other processes can't drive it.

## How it talks to genesis (the bridge)

Two files in your project's `.scratch/` are the entire contract — no sockets into Claude Code, no coupling:

| File | Direction | Purpose |
|---|---|---|
| `.scratch/dashboard-state.json` | genesis → dashboard | the live state the dashboard renders (phase, stages, TODO, activity, integrations, usage, paused) |
| `.scratch/dashboard-inbox.jsonl` | dashboard → genesis | one JSON intent per line; genesis reads & acts on these (connect a service, start/pause, answer a question) |

- **Live updates:** the server watches `dashboard-state.json` and pushes changes to the page over SSE, so the
  view is real-time without polling.
- **Connect buttons:** "Connect Stripe" → the dashboard asks for the key in a local field → the server writes it
  to `.env` (git-ignored, never logged) → it appends a `{type:"connect-integration","id":"stripe"}` intent →
  genesis wires the code from the integration registry.
- **Secrets stay local:** the server binds to localhost, masks values, and only ever writes them into `.env`.

See [`state.example.json`](state.example.json) for the schema and
[`../skills/genesis/reference.md`](../skills/genesis/reference.md) §Dashboard for how genesis emits/consumes it.

## Files

- `server.mjs` — the localhost server (static host + `/api/state`, `/api/events` SSE, `/api/intent`, `/api/env`).
- `public/` — the PWA (`index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`).
