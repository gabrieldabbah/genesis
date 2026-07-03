# {{PROJECT_NAME}} — System Prerequisites

> The **non-AI, system-level tools** this project needs on the machine *before* development can begin —
> container engines, database/queue engines, language runtimes (at the right **versions**), build tools, a
> browser for E2E. These are distinct from AI tooling (Claude Code, skills) and from project **dependencies**
> (installed by `{{INSTALL_CMD}}` and governed by [`MAINTENANCE.md`](./MAINTENANCE.md)) — they are the
> *substrate the package manager and the test gate assume already exists.*
>
> **The rule (A4, A14, A2):** genesis must **DETECT** what is already installed, **PROMPT the human EARLY**
> — before any code is written — for anything **required-but-missing**, and **NOT** prompt for what is already
> present. Some of these (a container engine, a DB engine) must be in place before *any* development or before
> the hermetic Docker infra in [`TESTING.md`](./TESTING.md) can run; discovering that at build time is a
> preventable stall. Detect once, gate once, record the result here.

---

## 1. Required vs. recommended *(fill at stack-choice — Phase 4)*

The stack is chosen in genesis Phase 4; the moment it is, fill this table from the architecture and record the
**detected** state. **Required** blocks development (a 🚧 gate); **recommended** is offered, not forced.

| Tool | Why it's needed | Min version | Tier | Detected? |
|---|---|---|:---:|:---:|
| **Container engine** (Docker / Podman) | hermetic test infra, local services ([`TESTING.md`](./TESTING.md) §4) | `{{DOCKER_MIN}}` | required-if-infra | `{{DOCKER_PRESENT}}` |
| **Docker Compose** | brings the test/dev services up together | `{{COMPOSE_MIN}}` | required-if-infra | `{{COMPOSE_PRESENT}}` |
| **Language runtime** | builds and runs the project | `{{RUNTIME_VERSION}}` | **required** | `{{RUNTIME_PRESENT}}` |
| **Package / build tool** | installs deps, builds artifacts (`{{INSTALL_CMD}}`) | `{{BUILD_TOOL_MIN}}` | **required** | `{{BUILD_TOOL_PRESENT}}` |
| **Database engine** (local, if not containerized) | persistence, migrations | `{{DB_MIN}}` | required-if-not-dockerized | `{{DB_PRESENT}}` |
| **Browser** (Chromium/Firefox) | end-to-end tests | `{{BROWSER_MIN}}` | required-if-e2e | `{{BROWSER_PRESENT}}` |
| **`git`** | version control, the commit/PR ritual | any maintained | **required** | `{{GIT_PRESENT}}` |

> Keep the **predicate** ("a container engine is present and ≥ the min version"), adapt the **tools** to the
> stack. Prefer a **containerized** dependency over a host install where possible — it keeps the machine clean
> and the run reproducible (A10); then the DB/queue engine is *not* a host prerequisite, only the container
> engine is. If the project has **no** external dependency and no E2E, only the runtime, build tool, and `git`
> are required, and this doc says so explicitly.

## 2. Detection — rtk-friendly, read-only *(A2 — observe, don't assume)*

Detect by **observing the machine**, never by trusting a checklist. These probes are read-only, side-effect
free, and avoid `find -not`/`-exec` (a command proxy rejects them). Run them at the **start of Phase 1** and
again right after the stack is chosen (Phase 4), then write the results into §1's *Detected?* column.

```bash
# Presence: command -v exits non-zero (and prints nothing) when the tool is absent.
command -v docker  >/dev/null 2>&1 && echo "docker: present"  || echo "docker: MISSING"
command -v git     >/dev/null 2>&1 && echo "git: present"     || echo "git: MISSING"
command -v node    >/dev/null 2>&1 && echo "node: present"    || echo "node: MISSING"
# Compose is now a docker subcommand on modern installs; probe both shapes:
docker compose version >/dev/null 2>&1 && echo "compose: present" || echo "compose: MISSING"

# Version (and thus min-version satisfaction): read the real output, don't guess.
node --version            # e.g. v20.11.0  — compare to {{RUNTIME_VERSION}}
docker --version          # e.g. Docker version 26.x
{{BUILD_TOOL}} --version  # e.g. pnpm 9.x / cargo 1.78 / uv 0.x — adapt to the stack

# Is the engine actually RUNNING, not merely installed? (a stopped daemon fails at build time)
docker info >/dev/null 2>&1 && echo "docker daemon: up" || echo "docker daemon: DOWN (start it)"

# Browser for E2E — locations vary by OS; probe the command names the test runner expects:
command -v chromium >/dev/null 2>&1 || command -v google-chrome >/dev/null 2>&1 \
  && echo "browser: present" || echo "browser: MISSING (test runner may fetch its own)"
```

Notes that keep detection honest:

- **Presence ≠ readiness.** `docker` on `PATH` but the daemon down still blocks the test gate — probe
  `docker info`, not just `command -v`. Likewise a runtime that exists but is **too old** is *missing* for our
  purposes: compare `--version` output against the `{{...}}_MIN` and treat a shortfall as required-but-missing.
- **Some runners self-provision.** A few E2E tools download their own browser; if so, the browser is *not* a
  host prerequisite — record that here rather than prompting for it.
- **Read the real string.** Parse the actual `--version` output (A2); never assume a version from the presence
  of a binary or from memory.

## 3. The early gate — prompt once, before development *(A4, A22)*

This is the point of the doc. After detection, partition the tools and act:

1. **Present and sufficient** → say nothing, do not prompt. Asking the human to install what they already have
   is friction that erodes trust (A20).
2. **Required and missing (or too old, or installed-but-not-running)** → **🚧 GATE.** Stop and prompt the
   human *now*, before any build work, with: the exact tool, why this project needs it, the min version, and
   the install pointer. Genesis writes config and code, but **does not install system-level engines or sudo
   anything** — surface the command (e.g. the official Docker install page, the runtime's version manager) for
   the operator to run, then re-detect to confirm before clearing the gate.
3. **Recommended but missing** → offer it as a non-blocking note; proceed without it.

Do this in **Phase 1** for stack-agnostic basics (`git`, a container engine if the archetype clearly needs
one) and again immediately after **Phase 4** once the runtime, build tool, DB, and E2E needs are known — so the
human is interrupted **at most twice, early**, never mid-build. A missing required engine discovered while the
overlord is looping is a stall this gate exists to prevent.

```text
🚧 GATE — system prerequisite missing
  Required: Docker (≥ {{DOCKER_MIN}}) — hermetic test infra + local {{DB}}
  Detected: MISSING
  Action:   install Docker Desktop / Engine, then start it, then I'll re-detect.
  (I don't install system engines or run sudo — this one's yours.)
```

## 4. Recorded state *(fill after detection — this is the evidence)*

The audited result of §2, so the next run (and any reviewer) sees what the machine actually has — every shown
fact has a source: the command that produced it (A15, A2). Update on every fresh detection.

| Tool | Required? | Detected version | Status | Resolved how |
|---|:---:|---|---|---|
| `{{TOOL}}` | yes/no | `{{DETECTED_VERSION}}` | present / **missing** / too-old / not-running | operator-installed `{{DATE}}` · containerized · n/a |

> **🔒 Secrets:** detection probes **tool presence and versions only** — never read, print, or `cat` `.env`,
> credential files, or any key. To note that an engine needs an env var, reference the **name** only
> (e.g. "`{{DB_URL_VAR}}` must be set"), never the value. See `AGENTS.md` §6.

---

> Fill the placeholders at stack-choice (Phase 4): `{{DOCKER_MIN}}`, `{{COMPOSE_MIN}}`, `{{RUNTIME_VERSION}}`,
> `{{BUILD_TOOL}}`/`{{BUILD_TOOL_MIN}}`, `{{DB_MIN}}`, `{{BROWSER_MIN}}`, and the `*_PRESENT` / `*_DETECTED`
> cells from real detection output. Then `grep -rn "{{" .` over this file must be empty. If a row is genuinely
> n/a for this project (no DB, no E2E), keep the row and mark it **n/a** with one word of why — an honest n/a
> is a recorded decision, a deleted row is a silent gap.
