# Genesis — runbook & rationale (loaded on demand)

This is the detail behind [`SKILL.md`](SKILL.md). Read the section you need; you don't need all of it every time.

---

## Sandbox & permissions (Phase 1)

Generate `.claude/settings.json` with **two layers**, because they cover different tools:

- `sandbox.filesystem.denyRead` blocks **Bash subprocesses** from reading a path.
- `permissions.deny` with `Read(...)` blocks the **Read tool**. `denyRead` alone does **not** stop the Read
  tool — you must add both, or secrets stay readable.

Target shape (confirm exact key names on the user's build via `/sandbox` — see "Verify on build" below):

```jsonc
{
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": true,    // escape hatch ON: soft-fail to a prompt, never hard-fail a run
    "failIfUnavailable": false,
    "filesystem": {
      "allowWrite": ["<the scope the user chose: this project, or their dev parent>"],
      "denyRead":  ["~/.ssh","~/.aws","~/.gnupg","~/.config/gh","~/.netrc","~/.npmrc","~/.config/git"]
    },
    "network": {
      "allowedDomains": [
        "localhost","127.0.0.1",                                  // OUTBOUND loopback only (app→own API); NOT app exposure
        "github.com","*.githubusercontent.com","codeload.github.com",
        "registry.npmjs.org","nodejs.org","crates.io","static.crates.io","pypi.org","files.pythonhosted.org",
        "api.anthropic.com","docs.anthropic.com","code.claude.com"
        // + each chosen integration's domains (from its registry entry)
        // + the trusted doc sources recorded in docs/SOURCES.md
      ]
    },
    "excludedCommands": ["docker *","gh *"]   // installed tools / integration CLIs that fail under Seatbelt
  },
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)","Read(~/.aws/**)","Read(~/.gnupg/**)","Read(~/.config/gh/**)",
      "Read(~/.netrc)","Read(~/.npmrc)","Read(~/.config/git/**)",
      "Read(//**/.env)","Read(//**/.env.*)","Read(**/secrets/**)"
    ]
  }
}
```

### Network posture — don't over-restrict

Encapsulation has two independent halves, and the strong one is **not** the network:

- **Core protection (always on):** filesystem `allowWrite` scope + secret read-denial (both layers) + the
  commit/push/deploy human gate. This stops the real harms (writing outside the project, leaking secrets,
  shipping without approval) regardless of network policy.
- **Network restriction (optional, per project):** the DEV sandbox and the DEPLOYED app are different scopes —
  do not confuse them. Restricting the *dev* sandbox's outbound is almost never right:
  - **open** — omit `allowedDomains` (or use a permissive policy): outbound is unrestricted. **This is the
    default for the dev sandbox in EVERY archetype, including payments/health/PII.** During development there is
    no real PII yet, secrets are already protected by the filesystem layer, and a locked egress list only blocks
    research, package installs, and integration CLIs (supabase, gh, etc.) — it protects nothing. The filesystem +
    secret protections still fully apply, so open is still well-encapsulated.
  - **allow-list** — the explicit `allowedDomains` shown above. This is a **runtime egress policy for the
    DEPLOYED app**, not the dev sandbox: bake it into the app's own network config / infra and document it in
    `docs/DEPLOYMENT.md` as a deploy task. Only allow-list the *dev* sandbox in the rare case where the dev
    process itself handles real production PII (e.g. debugging against a live PII datastore) — never by default,
    and only if the user asks.
  - **hybrid** — allow-list plus a broad allowance; a middle ground only if a project explicitly wants some dev
    egress control without going full open.

  Pick by scope: **dev sandbox → open** (all archetypes); **deployed-app egress → allow-list for payments/health/
  PII**, applied in app config + `docs/DEPLOYMENT.md`, not the dev sandbox. A health or fintech archetype is
  **not** a reason to allow-list the dev sandbox — it just cripples research and CLIs while the real protection
  (filesystem + secrets) is already on. When **open**, still keep `localhost` working and the secret/filesystem
  layers strict. Browser/E2E runners (Playwright, etc.) may need the browser launch command in `excludedCommands`.

Rules:
- **Detect, don't hardcode.** `allowWrite` comes from the interview; `excludedCommands` from which CLIs are
  actually installed and which break under the sandbox; domains (if allow-listing) from the registries +
  chosen integrations. **Network posture governs OUTBOUND access only** (whether code may call out) — it is NOT
  a license to expose the app. Inbound exposure is a separate policy; see below.
- `gh`/`docker`/integration CLIs in `excludedCommands` run **unsandboxed** (so their TLS/sockets work) — this
  is an intentional, documented hole; keep the list minimal.

### Network exposure & port binding — dev/test NEVER expose

This is separate from outbound posture and is the rule that stops servers/ports being opened needlessly:

- **Do not expose anything to the network during development or testing. Do not auto-start servers.** There is
  no reason to bind a SaaS to a public interface or open a port while building or testing it.
- **When a server genuinely must run** (the human explicitly asks for a local preview, or an e2e test needs a
  live server): bind to **`127.0.0.1` (loopback) only — never `0.0.0.0`, `::`, or a LAN/public interface** — on
  an ephemeral/declared port, and **tear it down** afterward. Configure the framework/dev-server's host to
  loopback (e.g. `--host 127.0.0.1`, `HOST=127.0.0.1`); many frameworks default to all-interfaces, so set it.
- **Tests must not require a publicly-bound port.** Prefer **in-process / in-memory** HTTP testing (e.g.
  supertest-style, the app object without a real `listen` on a public iface). Hermetic infra (DB/queue) binds
  **loopback on non-default ports** and is torn down (see `docs/TESTING.md`).
- **No tunnels, no ngrok, no public exposure, no firewall/port changes.** Opening a public port happens **only
  at deploy** — a 🚧 human-gated step, documented in `docs/DEPLOYMENT.md`. Never during dev/test.
- `localhost`/`127.0.0.1` in `allowedDomains` is for **outbound loopback** (the app calling its own API, the
  optional build dashboard) — it is not a reason to expose the app inbound.

## Integrations (Phase 0 + Phase 1)

Each service is one file in `integrations/registry/*.yaml`. To wire a chosen integration, apply its fields:

| field | wire into |
|---|---|
| `domains` | append to `sandbox.network.allowedDomains` |
| `env_keys` | add **names** to `.env.example`; add their paths to the secret-deny lists |
| `cli` | if it breaks under the sandbox → `excludedCommands` + a "install X" line for the user |
| `docs_source` | add to `docs/SOURCES.md` as a Tier-1 trusted source |
| `worker` | copy `${CLAUDE_PLUGIN_ROOT}/agents/_library/<worker>.md` → the project's `.claude/agents/` so the overlord can dispatch it (Phase 4) |
| `security` | add these items to the `security-audit` / `secaudit` checklist |
| `verify` | seed an acceptance-criteria task in `docs/TODO.md` |

Add a new service by dropping a new YAML file — that is the open-source extension point. Never invent a key,
domain, or version; vet every dependency both-ends with the `sources` skill before adopting it (constitution A15).

## Usage-aware autonomy & auto-resume (Phase 6, the build loop)

See [`../usage-guard/SKILL.md`](../usage-guard/SKILL.md) for the mechanism. In short:

- **Governor (in-session):** between TODO items the overlord runs `usage-guard` to estimate consumption
  (via `npx ccusage blocks --json` → current 5-hour window tokens vs the plan cap). At **X%** (default 85,
  set in the seed) it **stops starting new items/subagents**, lets in-flight workers finish on the reserve
  headroom (so the hard cap can't kill them), checkpoints everything to `.scratch/`, and halts cleanly.
- **Resumer (external):** the launchd job from `usage-guard` waits for the reset, then relaunches headless to
  resume from `.scratch/resume.json`. Install is a one-time human step.

## Seeds (Phase 0.5) — reusable, AI-authored, English-first

A seed is a named markdown file the AI writes (never the user). Format: a readable English summary plus a
small fenced `yaml` header for the values a machine must parse. Save to `seeds/<name>.md` for shareable seeds,
or `~/.claude/genesis/seeds/<name>.md` (or `seeds/private/`) for private ones. See
[`../../seeds/oss-default.md`](../../seeds/oss-default.md) for the canonical shape. To reuse: `/genesis use <name>`
loads it and asks only the deltas. Keep several = "different genesis versions."

## Acceptance file — the Stop gate's contract

The overlord maintains `.scratch/acceptance.json`:

```json
{
  "criteria_met": false,
  "iteration": 3,
  "max_iterations": 50,
  "open": ["item-7: integration test red", "item-9: secaudit finding open"],
  "evidence": { "test-gate": "see .scratch/last-test-run.txt", "secaudit": "see .scratch/secaudit.md" }
}
```

The Stop hook blocks the run from ending while `criteria_met` is false (and `iteration < max_iterations`);
the overlord may only set it `true` after it has **observed** test-gate green + a clean security pass + review.
`max_iterations` (from the seed) is the runaway backstop — on reaching it, escalate to the user, do not loop.

## Idempotency & safety

- Re-running any phase **updates, never duplicates**. Before replacing a real file, copy it to `*.bak`.
- Never read or print `.env` or any secret. Never commit/push/deploy on your own — these are **deferred to the
  human handoff** (`docs/DEPLOYMENT.md`), not mid-run asks.
- Keep `AGENTS.md` under ~200 lines; put procedures in skills, path-scoped rules in `.claude/rules/`.

## Self-verify (Phase 1) — confirm by behavior, never make the user type `/sandbox`

After writing `.claude/settings.json`, prove the sandbox works by **testing its behavior** — the user does
nothing. This sidesteps any uncertainty about exact key names: if the behavior is right, the config is right.

1. **Out-of-scope write is blocked:** attempt to create a file just *above* the write-scope (e.g. a sibling of
   the project dir). It must fail/deny. Then clean up if anything was created.
2. **Secret read is blocked:** attempt to read a known-denied path (e.g. `~/.ssh/` or a fake `~/.ssh/genesis_probe`)
   with the Read tool. It must be denied by the `permissions.deny` rule (this is the layer `denyRead` alone
   wouldn't catch).
3. **Network posture is right:** if posture is *open*, confirm an outbound request works; if *allow-list*,
   confirm an allowed domain works and a non-listed one is blocked. Confirm outbound loopback (`127.0.0.1`)
   works for in-app calls — this is about *outbound* reachability, not exposing the app inbound.

If all three behave, say "sandbox verified" briefly and continue. **If any misbehaves**, a setting name differs
on this build — open `/sandbox` yourself (you, not the user) to read the correct key name, fix
`settings.json`, and re-run the checks. Only involve the user if you genuinely cannot resolve it.

Two other things are version-sensitive and self-correct on first use, no user action needed:
- **Plugin hooks / Stop JSON shape** — the hook is written to tolerate both forms and fail-open; if it doesn't
  block as expected, adjust it (it's a few lines).
- **`ccusage` field names** — `usage-guard` reads defensively and pauses conservatively if it can't parse.

Never claim something works that you have not observed working (constitution A2). Report what you verified.

## Dashboard (optional) — the bridge contract

The dashboard (`genesis-dashboard` skill) is a local PWA for less-technical users. It never reaches into Claude
Code; you and it exchange two files in `.scratch/`:

- **You write `.scratch/dashboard-state.json`** after every meaningful step — the whole object each time
  (schema: [`../../dashboard/state.example.json`](../../dashboard/state.example.json)): `project`, `phases[]`
  (each `{n,label,status: done|active|pending}`), `activity` (one line: what you're doing now), `todo[]`
  (`{id,title,build,test}` with `done|doing|todo`), `integrations[]` (`{id,label,category,status:
  connected|needs-key|...}`), `usage` (`{known,pct,threshold,windowResetsAt}` from usage-guard), `acceptance`,
  and `needsHuman` (a question string, or null). The server pushes changes to the page over SSE — you just write.
- **You read `.scratch/dashboard-inbox.jsonl`** at phase boundaries and between TODO items; each line is an
  intent: `connect-integration` (key already in `.env`; wire it from the registry, set status connected),
  `pause`/`resume` (set `paused`, stop/continue starting new work), `answer` (the user's reply to `needsHuman`).

Keep it cheap: only write state when something changed. If the dashboard isn't running, skip all of this — the
files simply go unread. Never read or print `.env` values (the server wrote keys with mode 0600).

## READMEs — mandatory, to depth 2

Every project must have a `README.md` at the **root**, in **every top-level folder**, and in **every
second-level folder** (root · folder-in-root · folder-in-folder). Each is a short "what lives here and why"
(the root one is the full project README). A folder without a README is not done — finishing a project with
bare folders is a defect. Write/refresh them as folders appear (the `docs-writer` specialist owns this), and
**audit before declaring done**:

```bash
# lists any folder (to depth 2) missing a README.md — output MUST be empty before "done".
# Avoids find's -not/-exec (some command proxies reject them); uses a portable loop + grep instead.
[ -f README.md ] || echo "MISSING: ./README.md"
find . -mindepth 1 -maxdepth 2 -type d \
  | grep -vE '/\.|/node_modules|/dist|/build|/target|/\.scratch' \
  | while read -r d; do [ -f "$d/README.md" ] || echo "MISSING: $d/README.md"; done
```

Seed a TODO item with this command as its `→ verify:` so the gate is explicit and checkable.
