---
name: genesis-dashboard
description: "Launch the optional local PWA dashboard for a genesis build, so a less-technical user can set up and watch everything outside Claude Code. Use when the user says \"/genesis-dashboard\", \"open the dashboard\", \"show me a UI\", \"I want buttons\", or wants to monitor/configure a genesis run visually. Starts a dependency-free localhost server that renders live state (stage, TODO, activity, usage) and lets the user connect integrations with a button. Optional — the terminal flow works without it."
license: MIT
allowed-tools: Bash, Read, Write
argument-hint: "[open] | [stop]"
---

# Genesis Dashboard — launch & bridge

The dashboard is **optional** and aimed at less-technical users. It runs locally and talks to genesis through
two files (no coupling into Claude Code). Details: [`../../dashboard/README.md`](../../dashboard/README.md).

## Launch

1. Ensure Node is available (`node --version`). Start the server **in the project directory** (background it):
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.mjs"
   ```
   It prints `http://127.0.0.1:<port>/?token=…`. Give the user that URL (and tell them they can "Install app"
   for the PWA). Bound to localhost, token-gated.
2. Tell the user the dashboard is read/act: it shows live progress and offers Connect buttons; the terminal
   session keeps running genesis.

## Your side of the bridge (keep this contract)

While a genesis run is active, **maintain `.scratch/dashboard-state.json`** so the dashboard has something to
show, and **consume `.scratch/dashboard-inbox.jsonl`** so buttons do something:

- **Emit state** after every meaningful step (phase change, item built/tested, integration status change, pause):
  write the whole object per [`../../dashboard/state.example.json`](../../dashboard/state.example.json)
  (project, phases[], activity, todo[], integrations[], usage, acceptance, needsHuman). The server pushes it
  to the page over SSE automatically — you just write the file.
- **Consume intents** at phase boundaries and between TODO items: read new lines from the inbox and act:
  - `{type:"connect-integration", id}` — the key(s) were already written to `.env` by the dashboard; wire the
    integration from `integrations/registry/<id>.yaml` (domains, code, security, verify task) and set its
    `integrations[].status` to `connected` in the state.
  - `{type:"pause"}` / `{type:"resume"}` — set `paused` and have the overlord stop starting new work / continue.
  - `{type:"answer", text}` — treat as the user's reply to the current `needsHuman` question; clear `needsHuman`.
- **Never** read or print `.env` values; the dashboard wrote them with mode 0600. You only reference key names.

## Stop

`/genesis-dashboard stop` — kill the server process (find it by port or the `server.mjs` command). The genesis
run is unaffected; the dashboard is purely a window onto it.
