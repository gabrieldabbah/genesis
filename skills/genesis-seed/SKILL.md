---
name: genesis-seed
description: "Manage reusable genesis seeds and one-time machine setup. Use when the user says \"/genesis-seed\", \"save this as a seed\", \"save my setup\", \"list seeds\", \"edit the seed\", or \"set up my machine for genesis\". Writes/loads named, AI-authored configuration seeds (so the user never hand-writes config) and performs the once-per-machine bootstrap (optional rtk detection, global plugin install guidance, ccusage check for usage-guard)."
license: MIT
allowed-tools: Read, Write, Edit, Bash, Glob
argument-hint: "[save <name>] | [list] | [show <name>] | [machine-setup]"
---

# Genesis Seed — reusable configs (AI-authored) + machine setup

Two jobs: (1) manage **seeds** so a setup can be reused without anyone hand-writing files; (2) do the
**once-per-machine** bootstrap. English-first: the user talks, you write the files.

## Seeds

A seed is a named markdown file **you** author from a conversation — never the user. Layout: a readable
English summary, then one fenced ```yaml header for the values a machine must parse (archetype, stack,
integrations, sandbox scope, domains, autonomy, providers, constitution choice, usage threshold + max
iterations). Canonical shape: [`../../seeds/oss-default.md`](../../seeds/oss-default.md).

- **`save <name>`** — capture the current/just-discussed configuration into a seed.
  - Shareable seed → `seeds/<name>.md` (committed). Private/machine-specific → `seeds/private/<name>.md` or
    `~/.claude/genesis/seeds/<name>.md` (untracked — keep personal paths, keys-by-name, full constitution here,
    never in a committed file).
  - If a seed with that name exists, write a new dated copy; don't silently overwrite.
- **`list`** — show available seeds (public + private) with their one-line summaries.
- **`show <name>`** — print the English summary (never print secret values).
- Reuse happens in the main flow: `/genesis use <name>` loads a seed and asks only the deltas.

Keep several seeds = "different genesis versions" (a SaaS seed, a CLI seed, a per-client seed).

## Machine setup (once per computer)

Run when the user asks, or when `/genesis` detects a fresh machine. Detect and report; only change what the
user approves. Steps:

1. **Claude Code** — confirm `claude --version`; confirm the genesis plugin is installed (`/plugin` list).
   If not, show the install commands from the README (you do not auto-install plugins).
2. **rtk (optional, token savings)** — `rtk --version`. If present, genesis commands benefit automatically
   via the global hook; if absent, say it's optional and genesis falls back to raw commands. Never hard-depend on it.
3. **ccusage (for usage-guard auto-resume)** — check `npx ccusage --version`; if the user wants auto-resume,
   point them to install `usage-guard`'s launchd job (see [`../usage-guard/SKILL.md`](../usage-guard/SKILL.md)).
4. **gh (for the PR flow)** — `gh auth status`; if not logged in, tell the user (you don't authenticate for them).

Report a short summary of what's present, what's optional, and the one or two human steps remaining. Never
read or print secrets during detection (use `rtk env` if you must inspect env — it masks sensitive values).
