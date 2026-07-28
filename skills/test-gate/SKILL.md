---
name: test-gate
description: 'Run the full verification battery and block on red before any commit/PR. Use before committing, before claiming a task done, or when the user says "run the tests", "is it green?", "verify before commit", or mentions "/test-gate". Discovers the commands from CLAUDE.md and docs/TESTING.md, brings up hermetic Docker infra if a compose file exists, runs lint → typecheck → unit → property → contract → integration (→ e2e) fail-fast, reads the real output, and refuses to proceed on any failure. Reports what it ran and what it printed; never prints secrets from env or logs.'
license: MIT
allowed-tools: Bash, Read
---

# Test Gate — verify before commit, block on red

## Overview

Run the project's full Tier-B battery, **read the real output**, and
**stop the moment anything is red** — never commit a red tree, never claim "passing" you did not watch pass.
The strategy this enforces is the project's `docs/TESTING.md`. **Invocation is the
authorization** — run end-to-end without a confirm prompt.

This is the project's concrete runner, built from its own commands and infra. Closing ritual:
`test-gate` green, then commit, then `/generate-pr`.

## Arguments & modes

- `$1` = `full` (default) — the **Tier-B** PR-gated battery (what blocks a commit/merge).
- `$1` = `fast` — **Tier-A** local loop (unit + property + lint), skips Docker/integration for a tight
  feedback cycle. *`fast` green is not sufficient to commit — run `full` before committing.*

## Step 0 — Discover the commands (deterministic — never guess them)

Read the source of truth; do not invent commands:

```bash
sed -n '/## Commands/,/^## /p' CLAUDE.md         # the canonical command list
cat docs/TESTING.md                              # tiers, kinds, the Docker infra block, the gate order
ls docker-compose*.y*ml 2>/dev/null              # is there hermetic infra to bring up?
```

Map what you find to the gate stages and set a shell var per stage from the **real** discovered command —
`$LINT`, `$TYPECHECK`, `$TEST` (the Tier-B suite), `$E2E`, and `$MIGRATE` / `$SEED` for infra. If a stage
has no command in this project, leave its var empty, skip it, and **say so** in the report (an honest "no
e2e configured" — never a silent pass). **Never read or print `.env` or secrets**: to check a needed
var, test presence only (`[ -n "$VAR" ] && echo set`).

## Step 1 — Bring up hermetic infra (only if a compose file exists)

```bash
COMPOSE=$(ls docker-compose.test.y*ml docker-compose.y*ml 2>/dev/null | head -1)
if [ -n "$COMPOSE" ]; then
  docker compose -f "$COMPOSE" up -d --wait        # wait for healthchecks; don't race startup
  trap 'docker compose -f "$COMPOSE" down -v' EXIT # ALWAYS tear down + drop volumes, even on failure
  [ -n "$MIGRATE" ] && eval "$MIGRATE"; [ -n "$SEED" ] && eval "$SEED"   # deterministic schema + fixtures
fi
```

Infra is **ephemeral, seeded, isolated** — never point integration tests at a shared or staging database. If
Docker is unavailable, run unit+property, and **report integration as not-run** (do not pretend it passed).

## Step 2 — Run the battery, fail-fast, reading every output

Order (a red stage **stops** the rest — fix the earliest failure first):

```
lint  →  typecheck  →  unit  →  property  →  contract/schema  →  integration  →  e2e (if wired)
```

Run each present stage with the discovered command; capture and **read** its output and exit code:

```bash
run () { [ -z "$2" ] && { echo "── $1: skipped (no command) ──"; return; }; echo "── $1 ──"; eval "$2"; rc=$?; echo "exit=$rc"; [ $rc -eq 0 ] || { echo "RED at: $1"; exit $rc; }; }
run lint        "$LINT"
run typecheck   "$TYPECHECK"
run tests       "$TEST"          # unit + property + contract + integration per TESTING.md Tier B
run e2e         "$E2E"           # only if configured
```

- **Property tests** are what makes the suite total rather than partial — they generate empty, boundary,
  malformed and adversarial inputs. If the suite has none for a function with a stateable law, flag it as a gap.
- **Generative paths** (if any): confirm the critic/fallback path is exercised (e.g. `FORCE_DEGRADE=1`) —
  ground, generate, verify, degrade — with the fallback actually run.

## Step 3 — Report the verdict (honest, evidence-based)

- **All green:** report each stage with its real result (`exit=0`), state Tier-B is green, and that it is
  safe to commit. Only now may a `todo` item's `→ verify:` be marked passed.
- **Any red:** report the **earliest** failing stage with its real output — the failing assertion, the error —
  and stop there. Do not continue the battery and do not commit. Fix the earliest failure first; a later stage
  failing because an earlier one did is noise, not a second problem.
- **Skipped stages:** name them explicitly (`integration: skipped — no Docker`) — a skipped check is never a
  passed check.

## Hard rules (stop if you catch yourself doing these)

- Claiming "tests pass" / "it's green" without having run the command and read `exit=0`. → run it; read it.
- Committing, or telling the user to commit, on a red or partially-run gate. → block.
- Reading, `cat`-ing, echoing, or pasting `.env` or any secret or log value. → presence-test only.
- Pointing integration tests at a real/shared database instead of ephemeral Docker infra. → compose up/down.
- Leaving infra running after a failure. → the `trap … down -v` tears it down on every exit.
- Marking a `todo` item verified off a `fast` run. → only a green **`full`** Tier-B run justifies it.
